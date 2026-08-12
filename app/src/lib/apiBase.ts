/** Base URL for API. Empty in local dev → same origin + Vite `/api` proxy. */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
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
