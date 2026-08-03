import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabTabs } from '../../components/lab/LabTabs'
import { SwProblemPanel, SwSandboxPanel, useLiveSwLab } from './LiveSwLab'
import styles from './ServiceWorkersLab.module.css'

function SwCodePanel() {
  return (
    <LabCodePanel
      intro="Service Worker перехватывает fetch и решает, отдать кэш или сходить в сеть."
      snippets={[
        {
          label: 'Регистрация',
          code: `const reg = await navigator.serviceWorker.register('/sw.js', {
  scope: '/',
})
await navigator.serviceWorker.ready`,
        },
        {
          label: 'Перехват fetch (SWR)',
          code: `self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const cache = await caches.open('v1')
    const cached = await cache.match(event.request)
    const network = fetch(event.request).then((res) => {
      if (res.ok) cache.put(event.request, res.clone())
      return res
    })
    return cached || network
  })())
})`,
        },
      ]}
    />
  )
}

export function ServiceWorkersLab() {
  const lab = useLiveSwLab()

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Погода без пустого офлайна</h2>
        <p className={styles.lead}>
          SW кэширует прогноз Open-Meteo (Минск): снимок сразу, обновление в фоне, переживание
          offline.
        </p>
        <LabTabs
          problem={<SwProblemPanel lab={lab} />}
          sandbox={<SwSandboxPanel lab={lab} />}
          code={<SwCodePanel />}
        />
      </section>
    </div>
  )
}
