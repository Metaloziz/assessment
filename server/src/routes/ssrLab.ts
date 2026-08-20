import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import type { FastifyPluginAsync } from 'fastify'

/** Same initial DOM as client HelloApp with useState(0). */
const HelloApp = () =>
  h(
    'div',
    { 'data-ssr-hello': '' },
    h('p', null, 'Hello World'),
    h('button', { type: 'button' }, 'Нажми'),
  )

export const ssrLabRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/ssr/hello', async () => {
    const html = renderToString(h(HelloApp))
    return {
      ok: true as const,
      html,
      ts: new Date().toISOString(),
    }
  })
}
