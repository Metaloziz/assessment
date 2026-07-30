/* Lab SW: кэш погоды (Open-Meteo, Минск)
 * Решает: повторные запросы + офлайн-фолбэк для виджета погоды.
 */
const CACHE = 'assessment-sw-lab-v3'
const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=53.9006&longitude=27.559&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FMinsk'

/** @type {boolean} */
let forceOffline = false

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'SET_OFFLINE') {
    forceOffline = Boolean(data.value)
    event.source?.postMessage?.({ type: 'OFFLINE_OK', value: forceOffline })
  }

  if (data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE).then(async () => {
        await caches.open(CACHE)
        event.source?.postMessage?.({ type: 'CACHE_CLEARED' })
      }),
    )
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (request.url !== WEATHER_URL) return

  event.respondWith(weatherWidget(request))
})

/** @param {Response} response @param {string} via */
function tag(response, via) {
  const headers = new Headers(response.headers)
  headers.set('X-SW-Lab', via)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/** stale-while-revalidate + offline fallback для виджета погоды */
async function weatherWidget(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(WEATHER_URL)

  if (forceOffline) {
    if (cached) return tag(cached, 'cache-offline')
    return jsonError(503, 'offline-empty', 'Нет сети и нет закэшированной погоды')
  }

  const networkPromise = fetch(request)
    .then(async (fresh) => {
      if (fresh.ok) await cache.put(WEATHER_URL, fresh.clone())
      return fresh
    })
    .catch(() => null)

  // Есть кэш — отдаём сразу, сеть обновляет фон (SWR)
  if (cached) {
    void networkPromise
    return tag(cached, 'cache-hit')
  }

  const fresh = await networkPromise
  if (fresh) return tag(fresh, 'network-first')

  return jsonError(503, 'network-fail', 'Сеть недоступна, кэша ещё нет')
}

/** @param {number} status @param {string} via @param {string} message */
function jsonError(status, via, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-SW-Lab': via,
    },
  })
}
