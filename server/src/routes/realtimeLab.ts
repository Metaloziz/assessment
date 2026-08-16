import websocket from '@fastify/websocket'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { env } from '../env.js'

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function sseCorsHeaders(origin: string | undefined): Record<string, string> {
  const allowed =
    origin && env.corsOrigins.includes(origin)
      ? origin
      : (env.corsOrigins[0] ?? 'http://localhost:5173')
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }
}

/**
 * Long-poll / SSE / WebSocket для лабы `252-network-long-polling-ws-sse`.
 */
export const realtimeLabRoutes: FastifyPluginAsync = async (app) => {
  await app.register(websocket)

  app.get<{ Querystring: { mode?: string } }>(
    '/api/lab/realtime/long-poll',
    async (req, reply) => {
      const mode = req.query.mode === 'timeout' ? 'timeout' : 'event'
      if (mode === 'timeout') {
        const heldMs = 1200
        await sleep(heldMs)
        return reply.send({
          ok: true,
          mode: 'timeout',
          events: [],
          reason: 'timeout',
          heldMs,
          ts: new Date().toISOString(),
        })
      }

      const heldMs = 700
      await sleep(heldMs)
      return reply.send({
        ok: true,
        mode: 'event',
        events: [{ id: 1, type: 'order', status: 'shipped' }],
        heldMs,
        ts: new Date().toISOString(),
      })
    },
  )

  app.get<{ Querystring: { mode?: string } }>(
    '/api/lab/realtime/sse',
    (req, reply) => {
      const mode = req.query.mode === 'drop' ? 'drop' : 'stream'
      const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined

      reply.hijack()
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        ...sseCorsHeaders(origin),
      })

      const writeEvent = (data: object, event?: string, id?: number) => {
        if (id != null) reply.raw.write(`id: ${id}\n`)
        if (event) reply.raw.write(`event: ${event}\n`)
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
      }

      if (mode === 'drop') {
        writeEvent({ ok: true, note: 'one-shot before close' }, 'ping', 1)
        setTimeout(() => {
          reply.raw.end()
        }, 180)
        return
      }

      let n = 0
      const tick = () => {
        n += 1
        writeEvent({ n, type: 'tick', at: Date.now() }, 'tick', n)
        if (n >= 3) {
          clearInterval(iv)
          writeEvent({ done: true }, 'done', n)
          reply.raw.end()
        }
      }
      const iv = setInterval(tick, 420)
      tick()
      req.raw.on('close', () => {
        clearInterval(iv)
      })
    },
  )

  app.get(
    '/api/lab/realtime/ws',
    { websocket: true },
    (socket, req: FastifyRequest<{ Querystring: { mode?: string } }>) => {
      const mode = req.query.mode === 'push' ? 'push' : 'echo'

      if (mode === 'push') {
        socket.send(JSON.stringify({ type: 'hello', note: 'server push' }))
        let n = 0
        const iv = setInterval(() => {
          if (socket.readyState !== socket.OPEN) return
          n += 1
          socket.send(JSON.stringify({ type: 'push', n, at: Date.now() }))
          if (n >= 2) {
            clearInterval(iv)
            socket.send(JSON.stringify({ type: 'done' }))
            socket.close()
          }
        }, 480)
        socket.on('close', () => {
          clearInterval(iv)
        })
        return
      }

      socket.send(JSON.stringify({ type: 'ready', note: 'send JSON to echo' }))
      socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
        const text = Buffer.isBuffer(raw)
          ? raw.toString('utf8')
          : Array.isArray(raw)
            ? Buffer.concat(raw).toString('utf8')
            : Buffer.from(raw).toString('utf8')
        let got: unknown = text
        try {
          got = JSON.parse(text) as unknown
        } catch {
          /* keep string */
        }
        socket.send(JSON.stringify({ type: 'echo', got, at: Date.now() }))
      })
    },
  )
}
