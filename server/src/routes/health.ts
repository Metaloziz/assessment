import type { FastifyPluginAsync } from 'fastify'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async () => ({
    ok: true,
    service: 'assessment-server',
    ts: new Date().toISOString(),
  }))
}
