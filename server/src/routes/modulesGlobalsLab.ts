import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyPluginAsync } from 'fastify'

const LAB_DATA_DIR = path.dirname(
  fileURLToPath(new URL('../../lab-data/hello.txt', import.meta.url)),
)
const HELLO_FILE = path.join(LAB_DATA_DIR, 'hello.txt')

const SYNC_HOLD_MS = 320

function holdLoop(ms: number): void {
  const end = performance.now() + ms
  let x = 0
  while (performance.now() < end) {
    x = (x + 1) % 1_000_000_007
  }
  void x
}

export const modulesGlobalsLabRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/lab/modules/ping', async () => {
    const started = performance.now()
    return {
      ok: true,
      latencyMs: Math.round(performance.now() - started),
      at: Date.now(),
    }
  })

  app.get<{ Querystring: { mode?: string } }>(
    '/api/lab/modules/fs',
    async (req, reply) => {
      const mode = req.query.mode === 'sync' ? 'sync' : 'async'
      const started = performance.now()

      try {
        if (mode === 'sync') {
          const text = fs.readFileSync(HELLO_FILE, 'utf8')
          holdLoop(SYNC_HOLD_MS)
          const latencyMs = Math.round(performance.now() - started)
          return {
            ok: true,
            mode: 'sync',
            latencyMs,
            bytes: text.length,
            blockedLoop: true,
            preview: text.trim().slice(0, 40),
          }
        }

        const text = await fsPromises.readFile(HELLO_FILE, 'utf8')
        const latencyMs = Math.round(performance.now() - started)
        return {
          ok: true,
          mode: 'async',
          latencyMs,
          bytes: text.length,
          blockedLoop: false,
          preview: text.trim().slice(0, 40),
        }
      } catch (err) {
        const latencyMs = Math.round(performance.now() - started)
        const message = err instanceof Error ? err.message : String(err)
        return reply.status(500).send({
          ok: false,
          mode,
          latencyMs,
          error: message,
        })
      }
    },
  )

  app.get('/api/lab/modules/env', async () => {
    const portRaw = process.env.PORT
    const port = portRaw != null ? Number(portRaw) : null
    return {
      ok: true,
      port: Number.isFinite(port) ? port : null,
      portFallback: 3000,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      cwd: process.cwd(),
      pid: process.pid,
    }
  })

  /** ok — завершённый ответ; hang — handler без reply (клиент ждёт / abort). */
  app.get<{ Querystring: { mode?: string } }>(
    '/api/lab/modules/http',
    async (req, reply) => {
      const mode = req.query.mode === 'hang' ? 'hang' : 'ok'
      const started = performance.now()

      if (mode === 'hang') {
        await new Promise((resolve) => setTimeout(resolve, 12_000))
        return reply.status(504).send({
          ok: false,
          mode: 'hang',
          error: 'late reply — lab timeout',
        })
      }

      const latencyMs = Math.round(performance.now() - started)
      return reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .status(200)
        .send({
          ok: true,
          mode: 'ok',
          status: 200,
          body: 'ok',
          ended: true,
          latencyMs,
        })
    },
  )
}
