import { JsLabShell } from '../../components/lab/JsLabShell'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import shell from '../../components/lab/JsLabShell.module.css'
import { SwProblemPanel, useLiveSwLab } from './LiveSwLab'

const TOPIC_ID = '65-service-workers'

const CODE_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'sw-lifecycle',
    label: 'register + sw-lab.js',
    executable: false,
    languageLabel: 'js',
    note: 'Страница регистрирует SW; дальше браузер вызывает `install` → `activate` → `fetch`.',
    code: `// main.js — страница ставит SW на guard
if ('serviceWorker' in navigator) {
  const reg = await navigator.serviceWorker.register('/sw-lab.js', {
    scope: '/', // ← какие URL перехватывает SW
  })
  await navigator.serviceWorker.ready // ← install + activate завершены
}

// sw-lab.js — фоновый скрипт
self.addEventListener('install', (event) => {
  self.skipWaiting() // ← новая версия не ждёт закрытия вкладок
  event.waitUntil(caches.open('assessment-sw-lab-v3'))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()) // ← SW начинает контролировать вкладку
})

self.addEventListener('fetch', (event) => {
  event.respondWith(/* кэш или сеть — см. следующий файл */)
})`,
  },
  {
    id: 'sw-fetch',
    label: 'app/public/sw-lab.js',
    executable: false,
    languageLabel: 'js',
    note: 'На `fetch` SW сам решает: отдать кэш, сходить в сеть или обновить снимок в фоне.',
    code: `self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (request.url !== WEATHER_URL) return

  event.respondWith(weatherWidget(request)) // ← страница ждёт этот Response
})

async function weatherWidget(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(WEATHER_URL)

  if (cached) {
    void fetch(request).then((fresh) => {
      if (fresh.ok) cache.put(WEATHER_URL, fresh.clone()) // ← фоновое обновление
    })
    return tag(cached, 'cache-hit') // ← ответ сразу из Cache Storage
  }

  const fresh = await fetch(request)
  if (fresh.ok) await cache.put(WEATHER_URL, fresh.clone())
  return tag(fresh, 'network-first') // ← первый раз только из сети
}`,
  },
]

function SwCodePanel() {
  return (
    <div className={shell.codePane}>
      <InteractiveCodePanel
        topicId={TOPIC_ID}
        intro="Сначала — как страница регистрирует `Service Worker` и как он проходит `install` / `activate`. Затем — перехват `fetch` и выбор между кэшем и сетью."
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
