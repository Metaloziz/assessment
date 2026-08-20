import { randomBytes } from 'node:crypto'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

type Session = {
  balance: number
  csrf: string
  accessToken: string
}

const sessions = new Map<string, Session>()
const COOKIE = 'csrf_lab_sid'
const START_BALANCE = 1000
const TRANSFER_AMOUNT = 100

function parseCookieHeader(cookieHeader: string | undefined | null): Record<string, string> {
  if (!cookieHeader) return {}
  const out: Record<string, string> = {}
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return out
}

function sidFromReq(req: FastifyRequest): string | null {
  return parseCookieHeader(req.headers.cookie)[COOKIE] ?? null
}

function sessionFromReq(req: FastifyRequest): { sid: string; session: Session } | null {
  const sid = sidFromReq(req)
  if (!sid) return null
  const session = sessions.get(sid)
  if (!session) return null
  return { sid, session }
}

/** Cross-site SPA → API: cookie должна уезжать с credentials:include. */
function setSessionCookie(reply: FastifyReply, sid: string) {
  const cookie = [
    `${COOKIE}=${sid}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Max-Age=3600',
  ].join('; ')
  reply.header('Set-Cookie', cookie)
}

function clearSessionCookie(reply: FastifyReply) {
  reply.header(
    'Set-Cookie',
    `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`,
  )
}

function newSession(): { sid: string; session: Session } {
  const sid = randomBytes(16).toString('hex')
  const session: Session = {
    balance: START_BALANCE,
    csrf: randomBytes(24).toString('hex'),
    accessToken: randomBytes(24).toString('hex'),
  }
  sessions.set(sid, session)
  return { sid, session }
}

type TransferBody = { to?: string; amount?: number; _csrf?: string }

function parseAmount(body: TransferBody | undefined): number {
  const n = Number(body?.amount ?? TRANSFER_AMOUNT)
  if (!Number.isFinite(n) || n <= 0) return TRANSFER_AMOUNT
  return Math.min(Math.floor(n), 10_000)
}

export const csrfLabRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/csrf/lab/login', async (_req, reply) => {
    const { sid, session } = newSession()
    setSessionCookie(reply, sid)
    return {
      ok: true,
      kind: 'login',
      balance: session.balance,
      // access только в JSON — браузер сам в Cookie не положит
      accessToken: session.accessToken,
      note: 'session cookie HttpOnly; SameSite=None для cross-site fetch',
      ts: new Date().toISOString(),
    }
  })

  app.post('/api/csrf/lab/logout', async (req, reply) => {
    const sid = sidFromReq(req)
    if (sid) sessions.delete(sid)
    clearSessionCookie(reply)
    return { ok: true, kind: 'logout', ts: new Date().toISOString() }
  })

  app.get('/api/csrf/lab/me', async (req) => {
    const got = sessionFromReq(req)
    if (!got) {
      return {
        ok: false,
        kind: 'me',
        authenticated: false,
        balance: null,
        note: 'нет csrf_lab_sid — cookie не доехала или сессия протухла',
        ts: new Date().toISOString(),
      }
    }
    return {
      ok: true,
      kind: 'me',
      authenticated: true,
      balance: got.session.balance,
      ts: new Date().toISOString(),
    }
  })

  app.get('/api/csrf/lab/csrf', async (req, reply) => {
    const got = sessionFromReq(req)
    if (!got) {
      return reply.status(401).send({
        ok: false,
        kind: 'csrf',
        error: 'unauthorized',
        note: 'нужна session cookie',
      })
    }
    // ротация токена при выдаче — как типичный synchronizer
    got.session.csrf = randomBytes(24).toString('hex')
    return {
      ok: true,
      kind: 'csrf',
      csrf: got.session.csrf,
      note: 'секрет из сессии; evil.com его не знает (пока нет XSS)',
      ts: new Date().toISOString(),
    }
  })

  /** CSRF-уязвимый перевод: достаточно cookie-сессии. */
  app.post<{ Body: TransferBody }>('/api/csrf/lab/transfer-open', async (req, reply) => {
    const got = sessionFromReq(req)
    if (!got) {
      return reply.status(401).send({
        ok: false,
        kind: 'transfer-open',
        error: 'unauthorized',
        note: 'браузер не приложил session cookie',
      })
    }
    const amount = parseAmount(req.body)
    if (got.session.balance < amount) {
      return reply.status(400).send({
        ok: false,
        kind: 'transfer-open',
        error: 'insufficient',
        balance: got.session.balance,
      })
    }
    got.session.balance -= amount
    return {
      ok: true,
      kind: 'transfer-open',
      to: req.body?.to?.trim() || 'attacker',
      amount,
      balance: got.session.balance,
      note: 'мутация без CSRF-токена — классический риск cookie-сессии',
      ts: new Date().toISOString(),
    }
  })

  /** Защищённый перевод: cookie + _csrf. */
  app.post<{ Body: TransferBody }>('/api/csrf/lab/transfer', async (req, reply) => {
    const got = sessionFromReq(req)
    if (!got) {
      return reply.status(401).send({
        ok: false,
        kind: 'transfer',
        error: 'unauthorized',
      })
    }
    const token = req.body?._csrf ?? (req.headers['x-csrf-token'] as string | undefined)
    if (!token || token !== got.session.csrf) {
      return reply.status(403).send({
        ok: false,
        kind: 'transfer',
        error: 'csrf',
        balance: got.session.balance,
        note: 'токен не совпал или отсутствует — перевод отвергнут',
      })
    }
    const amount = parseAmount(req.body)
    if (got.session.balance < amount) {
      return reply.status(400).send({
        ok: false,
        kind: 'transfer',
        error: 'insufficient',
        balance: got.session.balance,
      })
    }
    got.session.balance -= amount
    // one-time-ish: новый секрет после успешной мутации
    got.session.csrf = randomBytes(24).toString('hex')
    return {
      ok: true,
      kind: 'transfer',
      to: req.body?.to?.trim() || 'friend',
      amount,
      balance: got.session.balance,
      note: 'synchronizer token совпал',
      ts: new Date().toISOString(),
    }
  })

  /** Auth через Bearer: cookie сама по себе не авторизует. */
  app.post<{ Body: TransferBody }>('/api/csrf/lab/transfer-bearer', async (req, reply) => {
    const auth = req.headers.authorization ?? ''
    const match = /^Bearer\s+(\S+)$/i.exec(auth)
    if (!match) {
      return reply.status(401).send({
        ok: false,
        kind: 'transfer-bearer',
        error: 'no_bearer',
        note: 'браузер сам Authorization не подставит с чужого сайта',
        cookiePresent: Boolean(sidFromReq(req)),
      })
    }
    const token = match[1]
    let session: Session | undefined
    for (const s of sessions.values()) {
      if (s.accessToken === token) {
        session = s
        break
      }
    }
    if (!session) {
      return reply.status(401).send({
        ok: false,
        kind: 'transfer-bearer',
        error: 'bad_token',
      })
    }
    const amount = parseAmount(req.body)
    if (session.balance < amount) {
      return reply.status(400).send({
        ok: false,
        kind: 'transfer-bearer',
        error: 'insufficient',
        balance: session.balance,
      })
    }
    session.balance -= amount
    return {
      ok: true,
      kind: 'transfer-bearer',
      amount,
      balance: session.balance,
      note: 'авторизация из header, не из auto-cookie',
      ts: new Date().toISOString(),
    }
  })
}
