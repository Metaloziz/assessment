import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

/**
 * Учебные эндпоинты CORS.
 * Глобальный @fastify/cors уже выставляет ACAO для allow-list;
 * здесь часть маршрутов намеренно ломает / меняет политику для демо в лабе.
 */
export const corsLabRoutes: FastifyPluginAsync = async (app) => {
  const stripCors = (reply: FastifyReply) => {
    reply.removeHeader('Access-Control-Allow-Origin')
    reply.removeHeader('Access-Control-Allow-Credentials')
    reply.removeHeader('Access-Control-Allow-Methods')
    reply.removeHeader('Access-Control-Allow-Headers')
    reply.removeHeader('Access-Control-Expose-Headers')
  }

  app.addHook('onSend', async (req, reply, payload) => {
    const url = req.url.split('?')[0] ?? req.url

    if (url === '/api/cors/lab/no-acao' || url === '/api/cors/lab/no-acao/') {
      stripCors(reply)
      return payload
    }

    if (url === '/api/cors/lab/star' || url === '/api/cors/lab/star/') {
      stripCors(reply)
      // ← ловушка: * + credentials:include браузер запретит
      reply.header('Access-Control-Allow-Origin', '*')
      return payload
    }

    return payload
  })

  // OPTIONS для no-acao / star — тоже без «правильных» CORS (иначе preflight «спасёт» демо)
  app.options('/api/cors/lab/no-acao', async (_req, reply) => {
    stripCors(reply)
    return reply.status(204).send()
  })

  app.options('/api/cors/lab/star', async (_req, reply) => {
    stripCors(reply)
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
    return reply.status(204).send()
  })

  app.get('/api/cors/lab/simple', async (req: FastifyRequest) => ({
    ok: true,
    kind: 'simple',
    origin: req.headers.origin ?? null,
    note: 'simple GET — браузер читает ответ, если ACAO совпал с Origin',
    ts: new Date().toISOString(),
  }))

  app.post<{ Body: { item?: string } }>('/api/cors/lab/orders', async (req) => {
    const item = req.body?.item?.trim() || 'widget'
    return {
      ok: true,
      kind: 'preflight',
      id: 1,
      item,
      origin: req.headers.origin ?? null,
      note: 'POST + application/json → сначала OPTIONS (preflight)',
      ts: new Date().toISOString(),
    }
  })

  app.get('/api/cors/lab/star', async () => ({
    ok: true,
    kind: 'star',
    acao: '*',
    note: 'Allow-Origin: * несовместим с credentials: include',
    ts: new Date().toISOString(),
  }))

  app.get('/api/cors/lab/no-acao', async () => ({
    ok: true,
    kind: 'no-acao',
    note: 'HTTP 200 без Access-Control-Allow-Origin — JS в браузере не читает тело',
    ts: new Date().toISOString(),
  }))
}
