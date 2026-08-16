import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db.js'
import { env } from '../env.js'

let schemaReady: Promise<void> | null = null

async function ensureLabSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS lab_users (
          id integer PRIMARY KEY,
          email text NOT NULL
        )
      `)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS lab_docs (
          id text PRIMARY KEY,
          doc jsonb NOT NULL
        )
      `)
      await db.execute(sql`
        INSERT INTO lab_users (id, email)
        VALUES (1, 'ada@example.com')
        ON CONFLICT (id) DO NOTHING
      `)
      await db.execute(sql`
        INSERT INTO lab_docs (id, doc)
        VALUES (
          '1',
          '{"_id":"1","email":"ada@example.com","role":"admin"}'::jsonb
        )
        ON CONFLICT (id) DO NOTHING
      `)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  await schemaReady
}

function dbHostFromUrl(databaseUrl: string): string | null {
  try {
    const u = new URL(databaseUrl)
    return u.hostname || null
  } catch {
    return null
  }
}

export const dbLabRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { id?: string } }>('/api/lab/db/sql-user', async (req, reply) => {
    const started = performance.now()
    try {
      await ensureLabSchema()
      const id = Number(req.query.id ?? '1')
      if (!Number.isFinite(id)) {
        return reply.status(400).send({ ok: false, error: 'id must be a number' })
      }
      const rows = await db.execute(sql`
        SELECT id, email FROM lab_users WHERE id = ${id}
      `)
      const latencyMs = Math.round(performance.now() - started)
      const row = rows[0] as { id?: number; email?: string } | undefined
      if (!row) {
        return reply.status(404).send({
          ok: false,
          store: 'sql',
          latencyMs,
          error: 'not found',
        })
      }
      return {
        ok: true,
        store: 'sql',
        latencyMs,
        user: { id: row.id, email: row.email },
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started)
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(503).send({
        ok: false,
        store: 'sql',
        latencyMs,
        error: message,
      })
    }
  })

  app.get<{ Querystring: { id?: string } }>('/api/lab/db/doc-user', async (req, reply) => {
    const started = performance.now()
    try {
      await ensureLabSchema()
      const id = String(req.query.id ?? '1')
      const rows = await db.execute(sql`
        SELECT doc FROM lab_docs WHERE id = ${id}
      `)
      const latencyMs = Math.round(performance.now() - started)
      const row = rows[0] as { doc?: unknown } | undefined
      if (!row?.doc) {
        return reply.status(404).send({
          ok: false,
          store: 'doc',
          latencyMs,
          error: 'not found',
        })
      }
      return {
        ok: true,
        store: 'doc',
        latencyMs,
        document: row.doc,
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started)
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(503).send({
        ok: false,
        store: 'doc',
        latencyMs,
        error: message,
      })
    }
  })

  app.get('/api/lab/db/async-query', async (_req, reply) => {
    const started = performance.now()
    try {
      await ensureLabSchema()
      const rows = await db.execute(sql`
        SELECT id, email FROM lab_users WHERE id = 1
      `)
      const latencyMs = Math.round(performance.now() - started)
      const row = rows[0] as { id?: number; email?: string } | undefined
      return {
        ok: true,
        mode: 'await',
        latencyMs,
        user: row ? { id: row.id, email: row.email } : null,
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started)
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(503).send({
        ok: false,
        mode: 'await',
        latencyMs,
        error: message,
      })
    }
  })

  app.get('/api/lab/db/config', async () => {
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || env.databaseUrl)
    return {
      ok: true,
      hasDatabaseUrl,
      dbHost: dbHostFromUrl(env.databaseUrl),
      nodeEnv: process.env.NODE_ENV ?? 'development',
      source: process.env.DATABASE_URL ? 'process.env' : 'fallback',
    }
  })
}
