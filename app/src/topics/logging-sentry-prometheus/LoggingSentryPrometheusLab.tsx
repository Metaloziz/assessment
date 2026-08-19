import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { Sentry } from '../../sentry.client'

const TOPIC_ID = '146-logging-sentry-prometheus'

type Mode = 'exception' | 'handled' | 'message'

const LAB_EXCEPTION =
  "TypeError: Cannot read properties of undefined (reading 'id')"
const LAB_HANDLED = 'ApiError: GET /api/pay → 500 Internal Server Error'
const LAB_MESSAGE = 'Payment provider timeout after 30s'

function sentryLive(): boolean {
  return Boolean(import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN && Sentry.getClient())
}

export function LoggingSentryPrometheusLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('exception')
  const [hint, setHint] = useState<string | null>(null)

  const finish = (liveHint: string, devHint: string) => {
    const release = import.meta.env.VITE_APP_RELEASE ?? 'local'
    if (sentryLive()) {
      log('ok', `Отправлено в Sentry · release=${release}`)
      setHint(liveHint)
      return
    }
    log('warn', 'Sentry не активен (dev или нет VITE_SENTRY_DSN) — только локальный лог')
    setHint(devHint)
  }

  const run = () => {
    clear()

    if (mode === 'exception') {
      log('err', LAB_EXCEPTION)
      if (sentryLive()) {
        const err = new Error(LAB_EXCEPTION)
        err.name = 'TypeError'
        Sentry.captureException(err)
      }
      log('info', 'captureException · runtime / render-phase')
      finish(
        'Issue с stack trace — проект javascript-react на sentry.io',
        'На prod «Запустить» шлёт captureException — см. sentry.client.ts',
      )
      return
    }

    if (mode === 'handled') {
      log('err', LAB_HANDLED)
      log('info', 'try/catch на границе API — ошибка обработана, но reportable')
      if (sentryLive()) {
        const err = new Error(LAB_HANDLED)
        err.name = 'ApiError'
        Sentry.withScope((scope) => {
          scope.setTag('route', '/api/pay')
          scope.setExtra('status', 500)
          scope.setExtra('method', 'GET')
          Sentry.captureException(err)
        })
      }
      finish(
        'Issue с tags route + extra status — тот же release',
        'Handled API error — captureException + scope на prod',
      )
      return
    }

    log('err', LAB_MESSAGE)
    log('info', 'captureMessage · level=error (без stack, но issue в Sentry)')
    if (sentryLive()) {
      Sentry.captureMessage(LAB_MESSAGE, 'error')
    }
    finish(
      'Issue типа message — degradation / timeout без exception',
      'Operational message — captureMessage на prod',
    )
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Три реальных способа отправить сигнал в Sentry с prod: необработанное исключение, пойманная
        ошибка API с контекстом и operational message без stack.
      </p>
      <ol className={shell.steps}>
        <li>Выберите тип: Исключение, HTTP catch или Message.</li>
        <li>Нажмите «Запустить» — на prod уйдёт в Sentry, в dev только лог.</li>
        <li>Сверьте issue с примерами на вкладке «Код».</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'exception'}
          onClick={() => setMode('exception')}
        >
          Исключение
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'handled'}
          onClick={() => setMode('handled')}
        >
          HTTP catch
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'message'}
          onClick={() => setMode('message')}
        >
          Message
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
        <p className={shell.hint}>Выберите тип события.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Init приложения и три паттерна отправки в Sentry."
      snippets={[
        {
          id: 'sentry-client',
          label: 'sentry.client.ts',
          note: 'Реальный init: DSN из env, только prod.',
          executable: false,
          code: `import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
const release = import.meta.env.VITE_APP_RELEASE

if (import.meta.env.PROD && dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: release || undefined,
    tracesSampleRate: 0,
    beforeSend(event) {
      const headers = event.request?.headers
      if (headers) {
        delete headers.Authorization
        delete headers.authorization
      }
      return event
    },
  })
}

export { Sentry }`,
        },
        {
          id: 'handled-api',
          label: 'handled-api.ts',
          note: 'Поймали на границе fetch — всё равно captureException + tags/extra.',
          executable: false,
          code: `import * as Sentry from '@sentry/react';

async function loadPay() {
  try {
    const res = await fetch('/api/pay');
    if (!res.ok) throw new Error(\`GET /api/pay → \${res.status}\`);
    return res.json();
  } catch (e) {
    // ← handled, но reportable: контекст для on-call
    Sentry.withScope((scope) => {
      scope.setTag('route', '/api/pay');
      scope.setExtra('status', (e as Response)?.status ?? 500);
      Sentry.captureException(e);
    });
    throw e; // ← UI может показать fallback
  }
}`,
        },
        {
          id: 'capture-message',
          label: 'capture-message.ts',
          note: 'Degradation без exception: timeout, quota, business rule.',
          executable: false,
          code: `import * as Sentry from '@sentry/react';

function onProviderTimeout(ms: number) {
  // ← не Error, но issue в Sentry (level=error)
  Sentry.captureMessage(\`Payment provider timeout after \${ms}ms\`, 'error');
}

// Prometheus/Grafana — «сколько timeout»; Sentry message — «что случилось сейчас»`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Sentry · типы событий"
      lead="captureException (runtime / handled) и captureMessage — все три шлют issue на prod."
      problem={problem}
      code={code}
    />
  )
}
