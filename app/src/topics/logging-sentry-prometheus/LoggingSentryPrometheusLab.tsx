import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { Sentry } from '../../sentry.client'

const TOPIC_ID = '146-logging-sentry-prometheus'

type Mode = 'sentry' | 'metrics' | 'alert'

const LAB_SENTRY_ERROR = "TypeError: Cannot read properties of undefined (reading 'id')"

export function LoggingSentryPrometheusLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('sentry')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()
    if (mode === 'sentry') {
      log('err', LAB_SENTRY_ERROR)
      const release = import.meta.env.VITE_APP_RELEASE ?? 'local'
      const sentryLive = Boolean(import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN && Sentry.getClient())

      if (sentryLive) {
        const err = new Error(LAB_SENTRY_ERROR)
        err.name = 'TypeError'
        Sentry.captureException(err)
        log('ok', `Отправлено в Sentry · release=${release}`)
        log('info', 'breadcrumbs: lab → Запустить → captureException')
        setHint('Проверьте Issues в проекте javascript-react на sentry.io')
      } else {
        log('ok', 'Sentry issue #1842 · release=sha-a1b2 · env=production (симуляция)')
        log('info', 'breadcrumbs: click Pay → POST /api/pay → exception')
        log('warn', 'Sentry не активен (dev или нет VITE_SENTRY_DSN) — только локальный лог')
        setHint('На prod с DSN «Запустить» шлёт реальное событие — см. sentry.client.ts')
      }
      return
    }
    if (mode === 'metrics') {
      log('info', 'http_requests_total{route="/pay",status="500"} +1')
      log('ok', 'rate(5xx[5m]) = 0.12 → Grafana panel')
      log('warn', 'label userId=… — высокая кардинальность, не делать')
      setHint('Prometheus = счётчики/latency — см. metrics.js')
      return
    }
    log('err', 'Alertmanager: ErrorRateHigh /pay')
    log('ok', 'открыть Sentry issues за тот же release')
    log('info', 'сначала метрика (сколько), потом issue (что)')
    setHint('алерты связывают Prometheus и Sentry')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Ошибки и метрики отвечают на разные вопросы. На prod «Sentry» + «Запустить» вызывает{' '}
        <code>Sentry.captureException</code>; в dev — только симуляция в логе.
      </p>
      <ol className={shell.steps}>
        <li>Выберите Sentry, Metrics или Alert.</li>
        <li>
          Откройте «Код»: <code>sentry.client.ts</code>, <code>metrics.js</code>.
        </li>
        <li>Сверьте лог с полями <code>release</code> / labels.</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'sentry'}
          onClick={() => setMode('sentry')}
        >
          Sentry
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'metrics'}
          onClick={() => setMode('metrics')}
        >
          Metrics
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'alert'}
          onClick={() => setMode('alert')}
        >
          Alert
        </LabButton>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
          }}
        >
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите сигнал.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Sentry.init с release; Prometheus Counter на границе HTTP."
      snippets={[
        {
          id: 'sentry-client',
          label: 'sentry.client.ts',
          note: 'Реальный init приложения: DSN из env, только prod.',
          executable: false,
          code: `import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
const release = import.meta.env.VITE_APP_RELEASE

if (import.meta.env.PROD && dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: release || undefined,
    tracesSampleRate: 0, // ← только errors на стенде
    beforeSend(event) {
      const headers = event.request?.headers
      if (headers) {
        delete headers.Authorization
        delete headers.authorization
        delete headers.Cookie
        delete headers.cookie
      }
      return event
    },
  })
}

export { Sentry }`,
        },
        {
          id: 'metrics',
          label: 'metrics.js',
          note: 'Счётчики с низкой кардинальностью labels; /metrics для scrape.',
          executable: false,
          code: `import client from 'prom-client';
import express from 'express';

// ═══════════════════════════════════════════
// PROMETHEUS ← метрики, не текст логов
// ═══════════════════════════════════════════
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests',
  // ← labels: низкая кардинальность (не userId!)
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const app = express();

app.post('/pay', async (req, res) => {
  try {
    await pay(req.body);
    httpRequests.inc({ method: 'POST', route: '/pay', status: '200' });
    res.sendStatus(200);
  } catch (e) {
    httpRequests.inc({ method: 'POST', route: '/pay', status: '500' }); // ← 5xx в Grafana
    Sentry.captureException(e); // ← параллельно issue
    res.sendStatus(500);
  }
});

// ═══════════════════════════════════════════
// SCRAPE ← Prometheus тянет этот endpoint
// ═══════════════════════════════════════════
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Sentry · Prometheus"
      lead="Сценарии ошибки и метрик; init и счётчики — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}
