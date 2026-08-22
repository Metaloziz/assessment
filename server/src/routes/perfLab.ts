import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db.js'

const SLOW_DEFAULT_MS = 650
const HEAVY_CPU_MS = 120
const HEAVY_BUFFER_MB = 8

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function roundMb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10
}

function burnCpu(ms: number): number {
  const end = performance.now() + ms
  let x = 0
  while (performance.now() < end) {
    x = (x + 1) % 1_000_000_007
  }
  return x
}

function processResources(
  cpuBefore: NodeJS.CpuUsage,
  memBefore: NodeJS.MemoryUsage,
  memAfter: NodeJS.MemoryUsage,
) {
  const cpu = process.cpuUsage(cpuBefore)
  return {
    cpuMs: Math.round((cpu.user + cpu.system) / 1000),
    heapDeltaMb: roundMb(memAfter.heapUsed - memBefore.heapUsed),
    rssMb: roundMb(memAfter.rss),
  }
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

  /** Baseline handler + process CPU/RAM snapshot (Node process, not whole host). */
  app.get('/api/lab/perf/light', async () => {
    const started = performance.now()
    const memBefore = process.memoryUsage()
    const cpuBefore = process.cpuUsage()
    const latencyMs = Math.round(performance.now() - started)
    const memAfter = process.memoryUsage()
    return {
      ok: true,
      path: 'light',
      latencyMs,
      resources: processResources(cpuBefore, memBefore, memAfter),
      ts: new Date().toISOString(),
    }
  })

  /** CPU burn + heap allocation — shows process resource delta in JSON. */
  app.get('/api/lab/perf/heavy', async () => {
    const started = performance.now()
    const memBefore = process.memoryUsage()
    const cpuBefore = process.cpuUsage()
    const checksum = burnCpu(HEAVY_CPU_MS)
    const chunk = Buffer.alloc(HEAVY_BUFFER_MB * 1024 * 1024)
    chunk[0] = checksum & 0xff
    const latencyMs = Math.round(performance.now() - started)
    const memAfter = process.memoryUsage()
    return {
      ok: true,
      path: 'heavy',
      latencyMs,
      allocMb: HEAVY_BUFFER_MB,
      resources: processResources(cpuBefore, memBefore, memAfter),
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
