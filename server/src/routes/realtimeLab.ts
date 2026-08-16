import websocket from '@fastify/websocket'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'
import { env } from '../env.js'

type EventPayload = Record<string, unknown>

type LongPollWaiter = {
  resolve: (payload: EventPayload | null) => void
  timer: ReturnType<typeof setTimeout> | null
  startedAt: number
}

type SseClient = {
  write: (data: object, event?: string, id?: number) => void
  end: () => void
}

type Room = {
  longPoll: Set<LongPollWaiter>
  sse: Set<SseClient>
  ws: Set<WebSocket>
  eventSeq: number
}

const rooms = new Map<string, Room>()

function getRoom(roomId: string): Room {
  let room = rooms.get(roomId)
  if (!room) {
    room = { longPoll: new Set(), sse: new Set(), ws: new Set(), eventSeq: 0 }
    rooms.set(roomId, room)
  }
  return room
}

function dropRoomIfEmpty(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return
  if (room.longPoll.size === 0 && room.sse.size === 0 && room.ws.size === 0) {
    rooms.delete(roomId)
  }
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

function publishToRoom(roomId: string, payload: EventPayload) {
  const room = getRoom(roomId)
  room.eventSeq += 1
  const id = room.eventSeq
  const envelope = { ...payload, id, at: Date.now() }

  let longPoll = 0
  let sse = 0
  let ws = 0

  for (const waiter of [...room.longPoll]) {
    if (waiter.timer) clearTimeout(waiter.timer)
    room.longPoll.delete(waiter)
    waiter.resolve(envelope)
    longPoll += 1
  }

  for (const client of room.sse) {
    client.write(envelope, 'event', id)
    sse += 1
  }

  const msg = JSON.stringify({ type: 'event', id, at: envelope.at, data: payload })
  for (const socket of room.ws) {
    if (socket.readyState === socket.OPEN) {
      socket.send(msg)
      ws += 1
    }
  }

  dropRoomIfEmpty(roomId)
  return { delivered: { longPoll, sse, ws }, id, envelope }
}

/**
 * Long-poll / SSE / WebSocket + publish hub для лабы `252-network-long-polling-ws-sse`.
 */
export const realtimeLabRoutes: FastifyPluginAsync = async (app) => {
  await app.register(websocket)

  app.post<{
    Body: { room?: string; payload?: EventPayload }
  }>('/api/lab/realtime/event', async (req, reply) => {
    const room = typeof req.body?.room === 'string' ? req.body.room.trim() : ''
    if (!room) {
      return reply.status(400).send({ ok: false, error: 'room_required' })
    }
    const payload =
      req.body?.payload && typeof req.body.payload === 'object' && !Array.isArray(req.body.payload)
        ? req.body.payload
        : { type: 'lab', note: 'manual event' }

    const result = publishToRoom(room, payload)
    return reply.send({
      ok: true,
      room,
      delivered: result.delivered,
      id: result.id,
      event: result.envelope,
      ts: new Date().toISOString(),
    })
  })

  app.get<{ Querystring: { mode?: string; room?: string } }>(
    '/api/lab/realtime/long-poll',
    async (req, reply) => {
      const mode = req.query.mode === 'timeout' ? 'timeout' : 'event'
      const roomId = typeof req.query.room === 'string' ? req.query.room.trim() : 'default'
      const room = getRoom(roomId)
      const startedAt = Date.now()

      if (mode === 'timeout') {
        const heldMs = 1200
        await new Promise<void>((resolve) => {
          setTimeout(resolve, heldMs)
        })
        return reply.send({
          ok: true,
          mode: 'timeout',
          events: [],
          reason: 'timeout',
          heldMs,
          room: roomId,
          ts: new Date().toISOString(),
        })
      }

      const event = await new Promise<EventPayload | null>((resolve) => {
        const waiter: LongPollWaiter = {
          resolve,
          timer: null,
          startedAt,
        }
        // safety: don't hang forever if client forgets to publish
        waiter.timer = setTimeout(() => {
          room.longPoll.delete(waiter)
          dropRoomIfEmpty(roomId)
          resolve(null)
        }, 60_000)

        room.longPoll.add(waiter)

        req.raw.on('close', () => {
          if (!room.longPoll.has(waiter)) return
          if (waiter.timer) clearTimeout(waiter.timer)
          room.longPoll.delete(waiter)
          dropRoomIfEmpty(roomId)
          resolve(null)
        })
      })

      const heldMs = Date.now() - startedAt
      if (!event) {
        return reply.send({
          ok: true,
          mode: 'event',
          events: [],
          reason: 'aborted_or_idle',
          heldMs,
          room: roomId,
          ts: new Date().toISOString(),
        })
      }

      return reply.send({
        ok: true,
        mode: 'event',
        events: [event],
        heldMs,
        room: roomId,
        ts: new Date().toISOString(),
      })
    },
  )

  app.get<{ Querystring: { mode?: string; room?: string } }>(
    '/api/lab/realtime/sse',
    (req, reply) => {
      const mode = req.query.mode === 'drop' ? 'drop' : 'stream'
      const roomId = typeof req.query.room === 'string' ? req.query.room.trim() : 'default'
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
        writeEvent({ ok: true, note: 'one-shot before close', room: roomId }, 'ping', 1)
        setTimeout(() => {
          reply.raw.end()
        }, 180)
        return
      }

      const room = getRoom(roomId)
      const client: SseClient = {
        write: writeEvent,
        end: () => {
          try {
            reply.raw.end()
          } catch {
            /* ignore */
          }
        },
      }
      room.sse.add(client)
      writeEvent({ ok: true, note: 'stream open', room: roomId }, 'hello', 0)

      req.raw.on('close', () => {
        room.sse.delete(client)
        dropRoomIfEmpty(roomId)
      })
    },
  )

  app.get(
    '/api/lab/realtime/ws',
    { websocket: true },
    (
      socket: WebSocket,
      req: FastifyRequest<{ Querystring: { mode?: string; room?: string } }>,
    ) => {
      const mode = req.query.mode === 'push' ? 'push' : 'echo'
      const roomId = typeof req.query.room === 'string' ? req.query.room.trim() : 'default'
      const room = getRoom(roomId)
      room.ws.add(socket)

      socket.send(
        JSON.stringify({
          type: 'ready',
          mode,
          room: roomId,
          note: mode === 'echo' ? 'send JSON to echo' : 'await POST /event for push',
        }),
      )

      if (mode === 'echo') {
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
      }

      socket.on('close', () => {
        room.ws.delete(socket)
        dropRoomIfEmpty(roomId)
      })
    },
  )
}
