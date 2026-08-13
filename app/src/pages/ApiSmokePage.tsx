import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LabButton } from '../components/lab/LabButton'
import { apiJson, apiUrl } from '../lib/apiBase'
import styles from './ApiSmokePage.module.css'

type Health = { ok: boolean; service: string; ts: string }
type Echo = { ok: boolean; echo: string; ts: string }
type DbPing = {
  ok: boolean
  db: boolean
  n?: number
  latencyMs: number
  error?: string
  ts: string
}

type LogLine = { id: number; kind: 'ok' | 'err' | 'info'; text: string }

let logSeq = 0

export function ApiSmokePage() {
  const [log, setLog] = useState<LogLine[]>([])
  const [busy, setBusy] = useState(false)

  const push = (kind: LogLine['kind'], text: string) => {
    setLog((prev) => [...prev, { id: ++logSeq, kind, text }].slice(-40))
  }

  const run = async (label: string, path: string) => {
    setBusy(true)
    push('info', `→ ${label} ${apiUrl(path)}`)
    const t0 = performance.now()
    try {
      const data = await apiJson<Health | Echo | DbPing>(path)
      const ms = Math.round(performance.now() - t0)
      push('ok', `← ${ms}ms ${JSON.stringify(data)}`)
    } catch (e) {
      const ms = Math.round(performance.now() - t0)
      const err = e as Error & { status?: number; body?: unknown }
      push(
        'err',
        `← ${ms}ms ${err.message}${err.body ? ` ${JSON.stringify(err.body)}` : ''}`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>dev</p>
        <h1 className={styles.title}>API smoke</h1>
        <p className={styles.lead}>
          Проверка треугольника: фронт → API → Postgres (обычно облачные API и БД). Не
          учебная лаба.
        </p>
        <Link className={styles.back} to="/">
          ← к темам
        </Link>
      </header>

      <div className={styles.actions}>
        <LabButton disabled={busy} onClick={() => void run('health', '/api/health')}>
          GET /api/health
        </LabButton>
        <LabButton
          disabled={busy}
          onClick={() => void run('echo', '/api/demo/echo?message=assessment')}
        >
          GET /api/demo/echo
        </LabButton>
        <LabButton
          variant="primary"
          disabled={busy}
          onClick={() => void run('db-ping', '/api/demo/db-ping')}
        >
          GET /api/demo/db-ping
        </LabButton>
      </div>

      <pre className={styles.log} aria-live="polite">
        {log.length === 0 ? (
          <span className={styles.muted}>Нажми кнопку — ответ появится здесь.</span>
        ) : (
          log.map((line) => (
            <div key={line.id} className={styles[line.kind]}>
              {line.text}
            </div>
          ))
        )}
      </pre>
    </div>
  )
}
