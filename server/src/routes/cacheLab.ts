import type { FastifyPluginAsync } from 'fastify'
import NodeCache from 'node-cache'
import { sql } from 'drizzle-orm'
import { db, fallBackToMemory, usingPostgres } from '../db.js'
import { labMemory } from '../labMemory.js'

type CacheItem = { id: number; title: string }

/** In-process cache-aside layer via node-cache (lab stand; not shared across instances). */
const itemCache = new NodeCache({ stdTTL: 60, useClones: false })

let schemaReady: Promise<void> | null = null

async function ensureCacheLabSchema() {
  if (!usingPostgres() || !db) return
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS lab_items (
          id integer PRIMARY KEY,
          title text NOT NULL
        )
      `)
      await db.execute(sql`
        INSERT INTO lab_items (id, title)
        VALUES (1, 'widget')
        ON CONFLICT (id) DO NOTHING
      `)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  await schemaReady
}

function cacheKey(id: number): string {
  return `item:${id}`
}

async function readItemFromStore(id: number): Promise<CacheItem | null> {
  if (!usingPostgres() || !db) {
    return labMemory.getItem(id)
  }
  await ensureCacheLabSchema()
  const rows = await db.execute(sql`
    SELECT id, title FROM lab_items WHERE id = ${id}
  `)
  const row = rows[0] as { id?: number; title?: string } | undefined
  if (!row?.id) return null
  return { id: Number(row.id), title: String(row.title) }
}

export const cacheLabRoutes: FastifyPluginAsync = async (app) => {
  app.delete<{ Querystring: { id?: string } }>(
    '/api/lab/cache/key',
    async (req, reply) => {
      const id = Number(req.query.id ?? '1')
      if (!Number.isFinite(id)) {
        return reply.status(400).send({ ok: false, error: 'id must be a number' })
      }
      const key = cacheKey(id)
      const had = itemCache.del(key) > 0
      return { ok: true, key, deleted: had }
    },
  )

  app.get<{ Querystring: { id?: string } }>(
    '/api/lab/cache/item',
    async (req, reply) => {
      const started = performance.now()
      try {
        const id = Number(req.query.id ?? '1')
        if (!Number.isFinite(id)) {
          return reply.status(400).send({ ok: false, error: 'id must be a number' })
        }
        const key = cacheKey(id)
        const cached = itemCache.get<CacheItem>(key)
        if (cached !== undefined) {
          const latencyMs = Math.round(performance.now() - started)
          return {
            ok: true,
            source: 'cache' as const,
            storage: usingPostgres() ? 'postgres' : 'memory',
            key,
            latencyMs,
            item: cached,
          }
        }

        let item: CacheItem | null
        try {
          item = await readItemFromStore(id)
        } catch (err) {
          fallBackToMemory(err)
          item = labMemory.getItem(id)
        }

        const latencyMs = Math.round(performance.now() - started)
        if (!item) {
          return reply.status(404).send({
            ok: false,
            source: 'db' as const,
            storage: usingPostgres() ? 'postgres' : 'memory',
            key,
            latencyMs,
            error: 'not found',
          })
        }
        itemCache.set(key, item)
        return {
          ok: true,
          source: 'db' as const,
          storage: usingPostgres() ? 'postgres' : 'memory',
          key,
          latencyMs,
          item,
        }
      } catch (err) {
        const latencyMs = Math.round(performance.now() - started)
        const message = err instanceof Error ? err.message : String(err)
        return reply.status(503).send({
          ok: false,
          latencyMs,
          error: message,
        })
      }
    },
  )

  app.put<{ Body: { id?: number; title?: string } }>(
    '/api/lab/cache/item',
    async (req, reply) => {
      const started = performance.now()
      try {
        const id = Number(req.body?.id ?? 1)
        const title = String(req.body?.title ?? '').trim()
        if (!Number.isFinite(id)) {
          return reply.status(400).send({ ok: false, error: 'id must be a number' })
        }
        if (!title) {
          return reply.status(400).send({ ok: false, error: 'title required' })
        }
        const key = cacheKey(id)

        if (!usingPostgres() || !db) {
          const item = labMemory.upsertItem(id, title)
          itemCache.del(key)
          const latencyMs = Math.round(performance.now() - started)
          return {
            ok: true,
            invalidated: true,
            storage: 'memory',
            key,
            latencyMs,
            item,
          }
        }

        try {
          await ensureCacheLabSchema()
          await db.execute(sql`
            INSERT INTO lab_items (id, title)
            VALUES (${id}, ${title})
            ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
          `)
        } catch (err) {
          fallBackToMemory(err)
          const item = labMemory.upsertItem(id, title)
          itemCache.del(key)
          const latencyMs = Math.round(performance.now() - started)
          return {
            ok: true,
            invalidated: true,
            storage: 'memory',
            key,
            latencyMs,
            item,
          }
        }

        itemCache.del(key)
        const latencyMs = Math.round(performance.now() - started)
        return {
          ok: true,
          invalidated: true,
          storage: 'postgres',
          key,
          latencyMs,
          item: { id, title },
        }
      } catch (err) {
        const latencyMs = Math.round(performance.now() - started)
        const message = err instanceof Error ? err.message : String(err)
        return reply.status(503).send({
          ok: false,
          latencyMs,
          error: message,
        })
      }
    },
  )
}
