import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db.js'

export const demoRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { message?: string } }>('/api/demo/echo', async (req) => {
    const message = req.query.message?.trim() || 'hello'
    return {
      ok: true,
      echo: message,
      ts: new Date().toISOString(),
    }
  })

  app.get('/api/demo/db-ping', async (_req, reply) => {
    const started = performance.now()
    try {
      const rows = await db.execute(sql`select 1 as n`)
      const latencyMs = Math.round(performance.now() - started)
      const first = rows[0] as { n?: number } | undefined
      return {
        ok: true,
        db: true,
        n: first?.n ?? 1,
        latencyMs,
        ts: new Date().toISOString(),
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started)
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(503).send({
        ok: false,
        db: false,
        latencyMs,
        error: message,
        ts: new Date().toISOString(),
      })
    }
  })
}
