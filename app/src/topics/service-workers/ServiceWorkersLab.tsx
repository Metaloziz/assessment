import { JsLabShell } from '../../components/lab/JsLabShell'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import shell from '../../components/lab/JsLabShell.module.css'
import { SwProblemPanel, useLiveSwLab } from './LiveSwLab'

const TOPIC_ID = '65-service-workers'

const CODE_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'sw-fetch',
    label: 'app/public/sw-lab.js',
    executable: false,
    languageLabel: 'js',
    note: '`fetch` отдаёт кэш сразу и параллельно обновляет его из сети.',
    code: `self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (request.url !== WEATHER_URL) return

  event.respondWith(weatherWidget(request)) // ← весь контроль ответа здесь
})

async function weatherWidget(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(WEATHER_URL)

  if (forceOffline) {
    if (cached) return tag(cached, 'cache-offline') // ← offline, но снимок уже есть
    return jsonError(503, 'offline-empty', 'Нет сети и нет закэшированной погоды')
  }

  const networkPromise = fetch(request)
    .then(async (fresh) => {
      if (fresh.ok) await cache.put(WEATHER_URL, fresh.clone()) // ← обновили кэш
      return fresh
    })
    .catch(() => null)

  if (cached) {
    void networkPromise
    return tag(cached, 'cache-hit') // ← stale-while-revalidate
  }

  const fresh = await networkPromise
  if (fresh) return tag(fresh, 'network-first')
  return jsonError(503, 'network-fail', 'Сеть недоступна, кэша ещё нет')
}`,
  },
  {
    id: 'lab-run',
    label: 'app/src/topics/service-workers/LiveSwLab.tsx',
    executable: false,
    languageLabel: 'tsx',
    note: 'Кейс сам прогоняет шаги: включить `Service Worker`, прогреть кэш и показать контраст.',
    code: `const runCase = async () => {
  clear()
  setFinished(false)
  setBusy(true)

  try {
    const ready = await ensureControlled()
    if (!ready) return

    await setOfflineMode(false)
    await clearCache()

    if (caseId === 'warm') {
      await fetchWeather('первый запрос')
      await fetchWeather('повторный запрос') // ← ожидаем cache-hit
    } else {
      await fetchWeather('прогрев кэша')
      await setOfflineMode(true)
      await fetchWeather('offline с кэшем') // ← ожидаем cache-offline
    }

    setFinished(true)
  } finally {
    setBusy(false)
  }
}`,
  },
]

function SwCodePanel() {
  return (
    <div className={shell.codePane}>
      <InteractiveCodePanel
        topicId={TOPIC_ID}
        intro="Смотрите `register()`, `fetch`, `Cache Storage` и маркер `X-SW-Lab`, по которому стенд понимает: ответ пришёл из сети или из кэша."
        snippets={CODE_SNIPPETS}
      />
    </div>
  )
}

export function ServiceWorkersLab() {
  const lab = useLiveSwLab()

  return (
    <JsLabShell
      title="Погода без пустого офлайна"
      lead="Виджет погоды не должен каждый раз начинать с пустого экрана: `Service Worker` может отдать прошлый снимок сразу и пережить отключение сети."
      code={<SwCodePanel />}
      problem={<SwProblemPanel lab={lab} />}
    />
  )
}
