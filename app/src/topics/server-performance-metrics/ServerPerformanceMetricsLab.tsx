import { useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import { apiJson } from '../../lib/apiBase'
import styles from './ServerPerformanceMetricsLab.module.css'

const TOPIC_ID = '27-server-performance-metrics'
const BURST_COUNT = 8

type CaseId = 'contrast' | 'burst' | 'db'
type Phase = 'idle' | 'fetch' | 'done'

type PerfResponse = {
  ok: boolean
  path: string
  latencyMs?: number
  delayMs?: number
}

type Sample = {
  label: string
  clientMs: number
  serverMs: number
  path: string
  ok: boolean
}

type LiveResult = {
  samples: Sample[]
  rps: number | null
  p50: number
  p95: number
  errors: number
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'contrast', label: 'fast vs slow' },
  { id: 'burst', label: 'пачка · RPS' },
  { id: 'db', label: 'через БД' },
]

const PAIN = (
  <>
    Живые эндпоинты на Render: <code>latencyMs</code> с сервера и полный round-trip в браузере —
    видно, где растёт время ответа и как ведёт себя пачка запросов.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  contrast: (
    <>
      Подряд <code>GET /api/lab/perf/fast</code> и <code>/slow</code> — контраст server{' '}
      <code>latencyMs</code> без сетевого шума на глаз.
    </>
  ),
  burst: (
    <>
      {BURST_COUNT} параллельных <code>GET /fast</code> — считаем RPS и p95 client RTT за прогон.
    </>
  ),
  db: (
    <>
      <code>GET /api/lab/perf/db</code> — реальный <code>SELECT</code> в Postgres; server{' '}
      <code>latencyMs</code> включает round-trip к БД.
    </>
  ),
}

const CODE_INTRO =
  'Учебные роуты `/api/lab/perf/*`: замер `performance.now()` на сервере и JSON с `latencyMs`.'

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  contrast: [
    {
      id: 'perf-fast',
      label: 'routes/perfLab.ts · fast',
      note: 'Базовый handler без задержки — нижняя граница latency.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/perf/fast
const started = performance.now();
const latencyMs = Math.round(performance.now() - started);
return { ok: true, path: 'fast', latencyMs }; // ← server timing
`,
    },
    {
      id: 'perf-slow',
      label: 'routes/perfLab.ts · slow',
      note: 'Искусственная задержка — тяжёлая логика без БД.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/perf/slow?delay=650
await sleep(delayMs); // ← CPU/очередь не единственный источник latency
const latencyMs = Math.round(performance.now() - started);
return { ok: true, path: 'slow', delayMs, latencyMs };
`,
    },
  ],
  burst: [
    {
      id: 'perf-burst-client',
      label: 'lab · burst',
      note: 'Параллельные fetch — throughput и хвост p95.',
      executable: false,
      languageLabel: 'ts',
      code: `const started = performance.now();
const results = await Promise.all(
  Array.from({ length: 8 }, () => fetchPerf('/api/lab/perf/fast')),
);
const elapsedSec = (performance.now() - started) / 1000;
const rps = results.length / elapsedSec; // ← RPS за окно прогона
const p95 = percentile(results.map((s) => s.clientMs), 95);
`,
    },
    {
      id: 'prom-histogram',
      label: 'metrics.ts · histogram',
      note: 'В проде latency — гистограмма, не одно число.',
      executable: false,
      languageLabel: 'ts',
      code: `import client from 'prom-client';

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  labelNames: ['method', 'route', 'status'], // ← низкая кардинальность
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
});
// observe после ответа — p95 в Grafana
`,
    },
  ],
  db: [
    {
      id: 'perf-db',
      label: 'routes/perfLab.ts · db',
      note: 'Server latency включает запрос к Postgres.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/perf/db
const started = performance.now();
const rows = await db.execute(sql\`select 1 as n\`); // ← pool + query
const latencyMs = Math.round(performance.now() - started);
return { ok: true, path: 'db', latencyMs, n: rows[0]?.n };
`,
    },
    {
      id: 'db-ping-demo',
      label: 'routes/demo.ts · db-ping',
      note: 'Тот же паттерн замера в smoke-роуте.',
      executable: false,
      languageLabel: 'ts',
      code: `const started = performance.now();
const rows = await db.execute(sql\`select 1 as n\`);
const latencyMs = Math.round(performance.now() - started);
return { ok: true, db: true, latencyMs }; // ← latencyMs в JSON
`,
    },
  ],
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)] ?? 0
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

async function fetchPerf(path: string, label?: string): Promise<Sample> {
  const started = performance.now()
  try {
    const data = await apiJson<PerfResponse>(path)
    const clientMs = Math.round(performance.now() - started)
    return {
      label: label ?? data.path,
      clientMs,
      serverMs: data.latencyMs ?? 0,
      path,
      ok: data.ok,
    }
  } catch {
    const clientMs = Math.round(performance.now() - started)
    return { label: label ?? 'err', clientMs, serverMs: 0, path, ok: false }
  }
}

function buildResult(samples: Sample[], wallMs: number): LiveResult {
  const clientTimes = samples.map((s) => s.clientMs)
  return {
    samples,
    rps: wallMs > 0 ? Math.round((samples.length / wallMs) * 1000 * 10) / 10 : null,
    p50: percentile(clientTimes, 50),
    p95: percentile(clientTimes, 95),
    errors: samples.filter((s) => !s.ok).length,
  }
}

async function fetchLive(caseId: CaseId): Promise<LiveResult> {
  if (caseId === 'contrast') {
    const wallStart = performance.now()
    const fast = await fetchPerf('/api/lab/perf/fast', 'fast')
    const slow = await fetchPerf('/api/lab/perf/slow', 'slow')
    return buildResult([fast, slow], performance.now() - wallStart)
  }

  if (caseId === 'burst') {
    const wallStart = performance.now()
    const samples = await Promise.all(
      Array.from({ length: BURST_COUNT }, (_, i) =>
        fetchPerf('/api/lab/perf/fast', `#${i + 1}`),
      ),
    )
    return buildResult(samples, performance.now() - wallStart)
  }

  const wallStart = performance.now()
  const db = await fetchPerf('/api/lab/perf/db', 'db')
  return buildResult([db], performance.now() - wallStart)
}

function CaseSwitch({
  value,
  disabled,
  onChange,
}: {
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          disabled={disabled}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  live: LiveResult | null
  focusRef: React.RefObject<HTMLDivElement | null>
}

function PerfViz({ caseId, phase, live, focusRef }: VizProps) {
  const busy = phase === 'fetch'
  const done = phase === 'done' && live != null

  const browserState: LabNodeState = busy ? 'active' : done ? 'ok' : 'idle'
  const apiState: LabNodeState = busy ? 'active' : done && live.errors === 0 ? 'ok' : done ? 'err' : 'idle'
  const backendState: LabNodeState =
    caseId === 'db'
      ? busy
        ? 'active'
        : done
          ? live.errors === 0
            ? 'ok'
            : 'err'
          : 'idle'
      : caseId === 'contrast' && done
        ? 'ok'
        : busy
          ? 'active'
          : 'idle'

  const backendLabel = caseId === 'db' ? 'Postgres' : caseId === 'burst' ? `${BURST_COUNT}× handler` : 'handler'
  const backendSub =
    caseId === 'db'
      ? done
        ? `SELECT · ${live.samples[0]?.serverMs ?? '—'} ms`
        : 'select 1'
      : caseId === 'burst'
        ? done
          ? `parallel · p95 ${live.p95} ms`
          : 'parallel fast'
        : done
          ? `slow · ${live.samples[1]?.serverMs ?? '—'} ms`
          : 'fast → slow'

  const arrowCls = (active: boolean) =>
    `${styles.arrow}${active ? ` ${styles.arrowActive}` : ` ${styles.arrowIdle}`}`

  const lastServer = done ? live.samples[live.samples.length - 1]?.serverMs : null
  const lastClient = done ? live.samples[live.samples.length - 1]?.clientMs : null

  return (
    <LabVizPanel
      title="Живые метрики API"
      meta={
        !done
          ? busy
            ? 'fetch…'
            : 'ожидание'
          : `p50 ${live.p50} ms · p95 ${live.p95} ms${live.rps != null && caseId === 'burst' ? ` · ${live.rps} rps` : ''}`
      }
    >
      <div className={styles.flow}>
        <LabNode label="Browser" sub="fetch + RTT" state={browserState} />
        <span className={arrowCls(busy || done)} aria-hidden>
          →
        </span>
        <LabNode label="API" sub="/api/lab/perf/*" state={apiState} />
        <span className={arrowCls(busy || done)} aria-hidden>
          →
        </span>
        <LabNode label={backendLabel} sub={backendSub} state={backendState} />
      </div>

      <div ref={focusRef} className={styles.metrics}>
        <div
          className={`${styles.metricCard}${done ? ` ${styles.metricCardActive}` : ''}${done && (live.p95 ?? 0) > 400 ? ` ${styles.metricCardWarn}` : ''}`}
        >
          <span className={styles.metricLabel}>client p95</span>
          <span className={styles.metricValue}>{done ? `${live.p95} ms` : '—'}</span>
          <span className={styles.metricSub}>полный round-trip</span>
        </div>
        <div className={`${styles.metricCard}${done ? ` ${styles.metricCardActive}` : ''}`}>
          <span className={styles.metricLabel}>server last</span>
          <span className={styles.metricValue}>{done ? `${lastServer ?? '—'} ms` : '—'}</span>
          <span className={styles.metricSub}>из JSON latencyMs</span>
        </div>
        <div className={`${styles.metricCard}${done ? ` ${styles.metricCardActive}` : ''}`}>
          <span className={styles.metricLabel}>
            {caseId === 'burst' ? 'RPS' : 'client last'}
          </span>
          <span className={styles.metricValue}>
            {done
              ? caseId === 'burst'
                ? live.rps != null
                  ? `${live.rps}`
                  : '—'
                : `${lastClient ?? '—'} ms`
              : '—'}
          </span>
          <span className={styles.metricSub}>
            {caseId === 'burst' ? 'за окно прогона' : 'RTT последнего запроса'}
          </span>
        </div>
      </div>

      {done ? (
        <div className={styles.samples}>
          {live.samples.map((s, i) => (
            <span
              key={`${s.label}-${i}`}
              className={`${styles.sampleChip}${
                s.label === 'slow' || (s.serverMs > 200 && caseId !== 'burst')
                  ? ` ${styles.sampleChipSlow}`
                  : s.ok
                    ? ` ${styles.sampleChipOk}`
                    : ''
              }`}
            >
              {s.label} · srv {s.serverMs} · cli {s.clientMs}
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.samples}>
          {Array.from({ length: caseId === 'burst' ? BURST_COUNT : caseId === 'contrast' ? 2 : 1 }).map(
            (_, i) => (
              <span key={i} className={`${styles.sampleChip} ${styles.sampleChipDim}`}>
                —
              </span>
            ),
          )}
        </div>
      )}
    </LabVizPanel>
  )
}

export function ServerPerformanceMetricsLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('contrast')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState<LiveResult | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setLive(null)
    if (focusRef.current) gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const runLive = async () => {
    setPhase('fetch')
    try {
      const result = await fetchLive(caseId)
      setLive(result)
      setPhase('done')

      const hintByCase: Record<CaseId, string> = {
        contrast: `fast ${result.samples[0]?.serverMs ?? '—'} ms server vs slow ${result.samples[1]?.serverMs ?? '—'} ms — хвост виден в p95 ${result.p95} ms client`,
        burst: `${BURST_COUNT} запросов · ~${result.rps ?? '—'} RPS · p95 client ${result.p95} ms`,
        db: `Postgres в цепочке: server ${result.samples[0]?.serverMs ?? '—'} ms, client ${result.samples[0]?.clientMs ?? '—'} ms`,
      }

      if (result.errors > 0) {
        log('err', `${result.errors} ошибок · p95 ${result.p95} ms`)
      } else {
        log('ok', `p50 ${result.p50} ms · p95 ${result.p95} ms`)
        if (caseId === 'burst' && result.rps != null) {
          log('info', `~${result.rps} RPS за прогон`)
        }
      }
      setHint(hintByCase[caseId])

      if (focusRef.current && !reducedMotion()) {
        gsap.fromTo(
          focusRef.current,
          { scale: 0.96, opacity: 0.5 },
          { scale: 1, opacity: 1, duration: 0.55, ease: 'power2.inOut' },
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPhase('done')
      setLive({ samples: [], rps: null, p50: 0, p95: 0, errors: 1 })
      log('err', message)
      setHint('API недоступен — поднимите server или дождитесь деплоя Render')
    } finally {
      setBusy(false)
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    void runLive()
  }

  const reset = () => {
    setBusy(false)
    clear()
    setCaseId('contrast')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} disabled={busy} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <PerfViz caseId={caseId} phase={phase} live={live} focusRef={focusRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <CaseSwitch value={caseId} onChange={selectCase} />
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Метрики серверной производительности"
      lead="Живые `/api/lab/perf/*`: latency с сервера, round-trip в браузере и пачка для RPS."
      problem={problem}
      code={code}
    />
  )
}
