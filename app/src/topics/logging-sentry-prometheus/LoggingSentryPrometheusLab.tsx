import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '146-logging-sentry-prometheus'

type Mode = 'sentry' | 'metrics' | 'alert'

export function LoggingSentryPrometheusLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('sentry')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()
    if (mode === 'sentry') {
      log('err', 'TypeError: Cannot read properties of undefined (reading "id")')
      log('ok', 'Sentry issue #1842 · release=sha-a1b2 · env=production')
      log('info', 'breadcrumbs: click Pay → POST /api/pay → exception')
      setHint('Sentry = ошибка + release — см. sentry.client.js')
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
        Ошибки и метрики отвечают на разные вопросы. Здесь — сценарии инцидента; init Sentry и
        счётчики — во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>Выберите Sentry, Metrics или Alert.</li>
        <li>
          Откройте «Код»: <code>sentry.client.js</code>, <code>metrics.js</code>.
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
          label: 'sentry.client.js',
          note: 'DSN из env; release + beforeSend; sample rate на проде.',
          executable: false,
          code: `import * as Sentry from '@sentry/browser';

// ═══════════════════════════════════════════
// SENTRY ← ошибки с контекстом и релизом
// ═══════════════════════════════════════════
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // ← не коммитить DSN в git как секрет? чаще ok public DSN
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION, // ← git sha / semver

  tracesSampleRate: 0.1, // ← sample на проде

  beforeSend(event) {
    // ═══════════════════════════════════════════
    // PII ← вырезать токены / email из extra
    // ═══════════════════════════════════════════
    if (event.extra) delete event.extra.password;
    return event;
  },
});

// source maps загружают в Sentry на CI → читаемый stack`,
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
