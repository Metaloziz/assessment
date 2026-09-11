import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { db, fallBackToMemory, usingPostgres } from '../db.js'

export const demoRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { message?: string } }>('/api/demo/echo', async (req) => {
    const message = req.query.message?.trim() || 'hello'
    return {
      ok: true,
      echo: message,
      ts: new Date().toISOString(),
    }
  })

  app.get('/api/demo/db-ping', async () => {
    const started = performance.now()

    if (!usingPostgres() || !db) {
      const latencyMs = Math.round(performance.now() - started)
      return {
        ok: true,
        db: false,
        mode: 'memory',
        n: 1,
        latencyMs,
        ts: new Date().toISOString(),
      }
    }

    try {
      const rows = await db.execute(sql`select 1 as n`)
      const latencyMs = Math.round(performance.now() - started)
      const first = rows[0] as { n?: number } | undefined
      return {
        ok: true,
        db: true,
        mode: 'postgres',
        n: first?.n ?? 1,
        latencyMs,
        ts: new Date().toISOString(),
      }
    } catch (err) {
      fallBackToMemory(err)
      const latencyMs = Math.round(performance.now() - started)
      return {
        ok: true,
        db: false,
        mode: 'memory',
        n: 1,
        latencyMs,
        ts: new Date().toISOString(),
      }
    }
  })
}
