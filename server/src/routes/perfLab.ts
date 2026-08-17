import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db.js'

const SLOW_DEFAULT_MS = 650

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const perfLabRoutes: FastifyPluginAsync = async (app) => {
  /** In-memory handler — baseline latency for contrast labs. */
  app.get('/api/lab/perf/fast', async () => {
    const started = performance.now()
    const latencyMs = Math.round(performance.now() - started)
    return {
      ok: true,
      path: 'fast',
      latencyMs,
      ts: new Date().toISOString(),
    }
  })

  /** Artificial slow handler — models heavy logic without DB. */
  app.get<{ Querystring: { delay?: string } }>('/api/lab/perf/slow', async (req) => {
    const started = performance.now()
    const parsed = Number(req.query.delay ?? String(SLOW_DEFAULT_MS))
    const delayMs = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 50), 2000) : SLOW_DEFAULT_MS
    await sleep(delayMs)
    const latencyMs = Math.round(performance.now() - started)
    return {
      ok: true,
      path: 'slow',
      delayMs,
      latencyMs,
      ts: new Date().toISOString(),
    }
  })

  /** Real Postgres round-trip — DB time inside server latencyMs. */
  app.get('/api/lab/perf/db', async (_req, reply) => {
    const started = performance.now()
    try {
      const rows = await db.execute(sql`select 1 as n`)
      const latencyMs = Math.round(performance.now() - started)
      const first = rows[0] as { n?: number } | undefined
      return {
        ok: true,
        path: 'db',
        latencyMs,
        n: first?.n ?? 1,
        ts: new Date().toISOString(),
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started)
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(503).send({
        ok: false,
        path: 'db',
        latencyMs,
        error: message,
        ts: new Date().toISOString(),
      })
    }
  })
}
