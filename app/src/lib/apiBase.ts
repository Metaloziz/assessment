/** Render API — remote-first default for `npm run dev` when env is unset. */
const DEV_API_BASE_URL = 'https://assessment-api-fm0e.onrender.com'

/** Base URL for API. From `VITE_API_BASE_URL` (dev: `.env.development` → Render). Empty in prod → same origin. */
export function apiUrl(path: string): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  const base = (fromEnv || (import.meta.env.DEV ? DEV_API_BASE_URL : '')).replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

/** WebSocket URL for the same API base (`http`→`ws`, `https`→`wss`; relative → current host). */
export function apiWsUrl(path: string): string {
  const httpUrl = apiUrl(path)
  if (httpUrl.startsWith('https://')) return `wss://${httpUrl.slice('https://'.length)}`
  if (httpUrl.startsWith('http://')) return `ws://${httpUrl.slice('http://'.length)}`
  if (typeof window === 'undefined') return httpUrl
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const normalized = httpUrl.startsWith('/') ? httpUrl : `/${httpUrl}`
  return `${proto}//${window.location.host}${normalized}`
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text) as unknown
    } catch {
      body = text
    }
  }
  if (!res.ok) {
    const err = new Error(`API ${res.status} ${path}`)
    ;(err as Error & { status?: number; body?: unknown }).status = res.status
    ;(err as Error & { status?: number; body?: unknown }).body = body
    throw err
  }
  return body as T
}
