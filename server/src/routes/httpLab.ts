import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

type EchoBody = { note?: string }

/**
 * Учебные эндпоинты HTTP: живые метод / статус / заголовки для лабы
 * `250-network-http-https`.
 */
export const httpLabRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/http-lab/item', async (req: FastifyRequest, reply) => {
    reply.header('Cache-Control', 'private, max-age=60')
    reply.header('X-Lab-Protocol', 'http')
    return reply.status(200).send({
      ok: true,
      method: 'GET',
      status: 200,
      path: '/api/http-lab/item',
      accept: req.headers.accept ?? null,
      note: 'GET → 200 + Cache-Control',
      ts: new Date().toISOString(),
    })
  })

  app.post<{ Body: EchoBody }>('/api/http-lab/item', async (req, reply) => {
    const note = req.body?.note?.trim() || 'created'
    reply.header('Location', '/api/http-lab/item/1')
    reply.header('X-Lab-Protocol', 'http')
    return reply.status(201).send({
      ok: true,
      method: 'POST',
      status: 201,
      id: 1,
      note,
      path: '/api/http-lab/item',
      ts: new Date().toISOString(),
    })
  })

  app.get('/api/http-lab/missing', async (_req, reply) => {
    reply.header('X-Lab-Protocol', 'http')
    return reply.status(404).send({
      ok: false,
      method: 'GET',
      status: 404,
      path: '/api/http-lab/missing',
      error: 'not_found',
      note: 'ресурс не найден — класс 4xx',
      ts: new Date().toISOString(),
    })
  })
}
