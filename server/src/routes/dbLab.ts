import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { db, fallBackToMemory, usingPostgres } from '../db.js'
import { env } from '../env.js'
import { labMemory } from '../labMemory.js'

let schemaReady: Promise<void> | null = null

async function ensureLabSchema() {
  if (!usingPostgres() || !db) return
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

function memorySqlUser(id: number, started: number) {
  const user = labMemory.getUser(id)
  const latencyMs = Math.round(performance.now() - started)
  if (!user) {
    return {
      status: 404 as const,
      body: {
        ok: false as const,
        store: 'sql' as const,
        mode: 'memory' as const,
        latencyMs,
        error: 'not found',
      },
    }
  }
  return {
    status: 200 as const,
    body: {
      ok: true as const,
      store: 'sql' as const,
      mode: 'memory' as const,
      latencyMs,
      user,
    },
  }
}

export const dbLabRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { id?: string } }>('/api/lab/db/sql-user', async (req, reply) => {
    const started = performance.now()
    const id = Number(req.query.id ?? '1')
    if (!Number.isFinite(id)) {
      return reply.status(400).send({ ok: false, error: 'id must be a number' })
    }

    if (!usingPostgres() || !db) {
      const result = memorySqlUser(id, started)
      return reply.status(result.status).send(result.body)
    }

    try {
      await ensureLabSchema()
      const rows = await db.execute(sql`
        SELECT id, email FROM lab_users WHERE id = ${id}
      `)
      const latencyMs = Math.round(performance.now() - started)
      const row = rows[0] as { id?: number; email?: string } | undefined
      if (!row) {
        return reply.status(404).send({
          ok: false,
          store: 'sql',
          mode: 'postgres',
          latencyMs,
          error: 'not found',
        })
      }
      return {
        ok: true,
        store: 'sql',
        mode: 'postgres',
        latencyMs,
        user: { id: row.id, email: row.email },
      }
    } catch (err) {
      fallBackToMemory(err)
      const result = memorySqlUser(id, started)
      return reply.status(result.status).send(result.body)
    }
  })

  app.get<{ Querystring: { id?: string } }>('/api/lab/db/doc-user', async (req, reply) => {
    const started = performance.now()
    const id = String(req.query.id ?? '1')

    const fromMemory = () => {
      const document = labMemory.getDoc(id)
      const latencyMs = Math.round(performance.now() - started)
      if (!document) {
        return reply.status(404).send({
          ok: false,
          store: 'doc',
          mode: 'memory',
          latencyMs,
          error: 'not found',
        })
      }
      return {
        ok: true,
        store: 'doc',
        mode: 'memory',
        latencyMs,
        document,
      }
    }

    if (!usingPostgres() || !db) {
      return fromMemory()
    }

    try {
      await ensureLabSchema()
      const rows = await db.execute(sql`
        SELECT doc FROM lab_docs WHERE id = ${id}
      `)
      const latencyMs = Math.round(performance.now() - started)
      const row = rows[0] as { doc?: unknown } | undefined
      if (!row?.doc) {
        return reply.status(404).send({
          ok: false,
          store: 'doc',
          mode: 'postgres',
          latencyMs,
          error: 'not found',
        })
      }
      return {
        ok: true,
        store: 'doc',
        mode: 'postgres',
        latencyMs,
        document: row.doc,
      }
    } catch (err) {
      fallBackToMemory(err)
      return fromMemory()
    }
  })

  app.get('/api/lab/db/async-query', async (_req, reply) => {
    const started = performance.now()

    const fromMemory = () => {
      const user = labMemory.getUser(1)
      const latencyMs = Math.round(performance.now() - started)
      return {
        ok: true,
        mode: 'await',
        storage: 'memory',
        latencyMs,
        user,
      }
    }

    if (!usingPostgres() || !db) {
      return fromMemory()
    }

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
        storage: 'postgres',
        latencyMs,
        user: row ? { id: row.id, email: row.email } : null,
      }
    } catch (err) {
      fallBackToMemory(err)
      return fromMemory()
    }
  })

  app.get('/api/lab/db/config', async () => {
    const active = usingPostgres()
    return {
      ok: true,
      hasDatabaseUrl: Boolean(env.databaseUrl),
      storage: active ? 'postgres' : 'memory',
      dbHost: active && env.databaseUrl ? dbHostFromUrl(env.databaseUrl) : null,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      source: process.env.DATABASE_URL ? 'process.env' : 'none',
    }
  })
}
