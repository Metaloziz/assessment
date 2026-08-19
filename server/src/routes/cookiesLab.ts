import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

type CookieMap = Record<string, string>

function parseCookieHeader(cookieHeader: string | undefined | null): CookieMap {
  if (!cookieHeader) return {}
  const out: CookieMap = {}
  const parts = cookieHeader.split(';').map((p) => p.trim()).filter(Boolean)
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq)
    const value = part.slice(eq + 1)
    out[name] = value
  }
  return out
}

export const cookiesLabRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/cookies/lab/set-theme', async (req: FastifyRequest, reply) => {
    // theme НЕ HttpOnly — значение будет видно в document.cookie
    const cookie = 'theme=dark; Path=/; Max-Age=2592000; SameSite=Lax'
    reply.raw.setHeader('Set-Cookie', cookie)

    return {
      ok: true,
      kind: 'set-theme',
      setCookie: cookie,
      incomingCookieHeader: (req.headers.cookie ?? null) as string | null,
      ts: new Date().toISOString(),
    }
  })

  app.get('/api/cookies/lab/set-session', async (req: FastifyRequest, reply) => {
    // session доступен только серверу (HttpOnly) и должен уходить по HTTPS (Secure)
    const cookie = 'session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400'
    reply.raw.setHeader('Set-Cookie', cookie)

    return {
      ok: true,
      kind: 'set-session',
      setCookie: cookie,
      incomingCookieHeader: (req.headers.cookie ?? null) as string | null,
      ts: new Date().toISOString(),
    }
  })

  app.get('/api/cookies/lab/check', async (req: FastifyRequest) => {
    const received = parseCookieHeader(req.headers.cookie)
    return {
      ok: true,
      kind: 'check',
      cookieHeader: (req.headers.cookie ?? null) as string | null,
      received,
      ts: new Date().toISOString(),
    }
  })

  app.get('/api/cookies/lab/clear', async (req: FastifyRequest, reply) => {
    const themeClear = 'theme=; Path=/; Max-Age=0; SameSite=Lax'
    const sessionClear = 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'

    // Нужны два Set-Cookie заголовка, поэтому кладём массив.
    reply.raw.setHeader('Set-Cookie', [themeClear, sessionClear])

    return {
      ok: true,
      kind: 'clear',
      setCookie: [themeClear, sessionClear],
      incomingCookieHeader: (req.headers.cookie ?? null) as string | null,
      ts: new Date().toISOString(),
    }
  })
}

