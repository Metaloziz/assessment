import { Worker } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import type { FastifyPluginAsync } from 'fastify'

const WORKER_PATH = fileURLToPath(
  new URL('../workers/heavyJob.mjs', import.meta.url),
)

const DEFAULT_DURATION_MS = 350
const MAX_DURATION_MS = 800

function clampDuration(raw: unknown): number {
  const n = Number(raw ?? DEFAULT_DURATION_MS)
  if (!Number.isFinite(n)) return DEFAULT_DURATION_MS
  return Math.min(MAX_DURATION_MS, Math.max(80, Math.round(n)))
}

function burnMain(ms: number): number {
  const end = performance.now() + ms
  let x = 0
  while (performance.now() < end) {
    x = (x + 1) % 1_000_000_007
  }
  return x
}

function runInWorker(durationMs: number): Promise<{
  checksum: number
  elapsedMs: number
}> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, {
      workerData: { durationMs },
    })
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }
    worker.on('message', (msg: { ok?: boolean; checksum?: number; elapsedMs?: number }) => {
      finish(() => {
        void worker.terminate()
        resolve({
          checksum: Number(msg.checksum ?? 0),
          elapsedMs: Number(msg.elapsedMs ?? durationMs),
        })
      })
    })
    worker.on('error', (err) => {
      finish(() => reject(err))
    })
    worker.on('exit', (code) => {
      if (code !== 0) {
        finish(() => reject(new Error(`worker exited with code ${code}`)))
      }
    })
  })
}

export const workersLabRoutes: FastifyPluginAsync = async (app) => {
  /** Lightweight probe — shows whether the event loop is free. */
  app.get('/api/lab/workers/ping', async () => {
    const started = performance.now()
    return {
      ok: true,
      thread: 'main' as const,
      latencyMs: Math.round(performance.now() - started),
      at: Date.now(),
    }
  })

  /**
   * CPU-bound job: `main` blocks the event loop; `worker` runs in worker_threads.
   * Pair with concurrent GET /ping from the client to compare ping latency.
   */
  app.post<{
    Body: { mode?: string; durationMs?: number }
  }>('/api/lab/workers/job', async (req, reply) => {
    const mode = req.body?.mode === 'worker' ? 'worker' : 'main'
    const durationMs = clampDuration(req.body?.durationMs)
    const started = performance.now()

    try {
      if (mode === 'main') {
        const checksum = burnMain(durationMs)
        const latencyMs = Math.round(performance.now() - started)
        return {
          ok: true,
          mode: 'main' as const,
          durationMs,
          latencyMs,
          checksum,
          blockedMain: true,
        }
      }

      const { checksum, elapsedMs } = await runInWorker(durationMs)
      const latencyMs = Math.round(performance.now() - started)
      return {
        ok: true,
        mode: 'worker' as const,
        durationMs,
        latencyMs,
        workerElapsedMs: elapsedMs,
        checksum,
        blockedMain: false,
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started)
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(503).send({
        ok: false,
        mode,
        durationMs,
        latencyMs,
        error: message,
      })
    }
  })
}
