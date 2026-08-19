import websocket from '@fastify/websocket'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'

type Scenario = 'inspect' | 'auth' | 'idle'

type DebugPacket =
  | { type: 'subscribe'; room?: string }
  | { type: 'auth'; token?: string }
  | { type: 'ping' }
  | Record<string, unknown>

function parseScenario(value: string | undefined): Scenario {
  if (value === 'auth') return 'auth'
  if (value === 'idle') return 'idle'
  return 'inspect'
}

function safeSend(socket: WebSocket, payload: object) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload))
  }
}

function parsePacket(raw: Buffer | ArrayBuffer | Buffer[]): DebugPacket {
  const text = Buffer.isBuffer(raw)
    ? raw.toString('utf8')
    : Array.isArray(raw)
      ? Buffer.concat(raw).toString('utf8')
      : Buffer.from(raw).toString('utf8')

  try {
    return JSON.parse(text) as DebugPacket
  } catch {
    return { type: 'raw', text } as DebugPacket
  }
}

/**
 * Живой debug-роут для темы `267-devtools-websocket-debug`.
 * Даёт предсказуемые сценарии: нормальный обмен кадрами, auth close и idle timeout.
 */
export const wsDebugLabRoutes: FastifyPluginAsync = async (app) => {
  await app.register(websocket)

  app.get(
    '/api/lab/ws-debug',
    { websocket: true },
    (
      socket: WebSocket,
      req: FastifyRequest<{ Querystring: { scenario?: string } }>,
    ) => {
      const scenario = parseScenario(req.query.scenario)
      let idleTimer: ReturnType<typeof setTimeout> | null = null
      let closed = false

      const clearIdle = () => {
        if (idleTimer) {
          clearTimeout(idleTimer)
          idleTimer = null
        }
      }

      const closeSocket = (code: number, reason: string) => {
        if (closed) return
        closed = true
        clearIdle()
        try {
          socket.close(code, reason)
        } catch {
          /* ignore close race */
        }
      }

      const armIdleTimeout = () => {
        if (scenario !== 'idle' || closed) return
        clearIdle()
        idleTimer = setTimeout(() => {
          safeSend(socket, {
            type: 'server_notice',
            level: 'warn',
            note: 'idle timeout reached',
          })
          closeSocket(4408, 'idle_timeout')
        }, 1800)
      }

      safeSend(socket, {
        type: 'ready',
        scenario,
        note:
          scenario === 'inspect'
            ? 'send {"type":"subscribe"} to inspect frames'
            : scenario === 'auth'
              ? 'send {"type":"auth","token":"expired-demo"} to trigger close'
              : 'send {"type":"ping"} to keep the channel alive',
      })

      if (scenario === 'idle') {
        armIdleTimeout()
      }

      socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
        const packet = parsePacket(raw)

        if (scenario === 'inspect') {
          if (packet.type === 'subscribe') {
            safeSend(socket, {
              type: 'subscribed',
              room: typeof packet.room === 'string' ? packet.room : 'orders',
              traceId: 'dbg-sub-1',
            })
            safeSend(socket, {
              type: 'presence:update',
              users: [
                { id: 'u-17', name: 'Mila' },
                { id: 'u-24', name: 'Niko' },
              ],
              traceId: 'dbg-presence-1',
            })
            return
          }

          if (packet.type === 'ping') {
            safeSend(socket, { type: 'pong', at: Date.now() })
            return
          }

          safeSend(socket, { type: 'echo', got: packet, at: Date.now() })
          return
        }

        if (scenario === 'auth') {
          if (packet.type !== 'auth') {
            safeSend(socket, {
              type: 'auth_required',
              expected: 'send {"type":"auth","token":"expired-demo"}',
            })
            return
          }

          if (packet.token === 'demo-ok') {
            safeSend(socket, { type: 'auth_ok', userId: 'demo-user' })
            return
          }

          safeSend(socket, {
            type: 'auth_error',
            code: 'token_expired',
            retry: 'refresh_token',
          })
          closeSocket(4401, 'auth_expired')
          return
        }

        if (packet.type === 'ping') {
          armIdleTimeout()
          safeSend(socket, { type: 'pong', at: Date.now() })
          return
        }

        safeSend(socket, {
          type: 'heartbeat_required',
          expected: 'send {"type":"ping"} before timeout',
        })
      })

      socket.on('close', () => {
        closed = true
        clearIdle()
      })
    },
  )
}
