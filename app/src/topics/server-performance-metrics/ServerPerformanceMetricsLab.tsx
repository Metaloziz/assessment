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
const TAIL_FAST = 6

type CaseId = 'contrast' | 'burst' | 'db' | 'tail' | 'resources'
type Phase = 'idle' | 'fetch' | 'done'

type ProcessResources = {
  cpuMs: number
  heapDeltaMb: number
  rssMb: number
}

type PerfResponse = {
  ok: boolean
  path: string
  latencyMs?: number
  delayMs?: number
  resources?: ProcessResources
}

type Sample = {
  label: string
  clientMs: number
  serverMs: number
  path: string
  ok: boolean
  resources?: ProcessResources
}

type LiveResult = {
  samples: Sample[]
  rps: number | null
  p50: number
  p95: number
  errors: number
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'contrast', label: 'Быстро vs медленно' },
  { id: 'burst', label: 'Пачка · RPS' },
  { id: 'db', label: 'Через БД' },
  { id: 'tail', label: 'Хвост · p95' },
  { id: 'resources', label: 'Ресурсы' },
]

const PAIN = (
  <>
    Задержка на сервере и полный round-trip в браузере часто расходятся: сеть, очередь и
    сериализация добавляют время поверх обработки в <code>handler</code>.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  contrast: (
    <>
      Подряд быстрый и медленный <code>handler</code> — контраст <code>latencyMs</code> с сервера.
    </>
  ),
  burst: (
    <>
      {BURST_COUNT} параллельных запросов — сколько запросов в секунду выдерживает лёгкий{' '}
      <code>handler</code>.
    </>
  ),
  db: (
    <>
      Запрос с <code>SELECT</code> в Postgres — server <code>latencyMs</code> включает round-trip
      к БД.
    </>
  ),
  tail: (
    <>
      Пачка из быстрых и одного медленного — <code>p50</code> остаётся низким,{' '}
      <code>p95</code> улетает вверх.
    </>
  ),
  resources: (
    <>
      Лёгкий и тяжёлый <code>handler</code> — в JSON приходит <code>cpuMs</code> и{' '}
      <code>heapDeltaMb</code> процесса Node.
    </>
  ),
}

const CODE_INTRO =
  'Handler замеряет время обработки запроса и отдаёт `latencyMs` в JSON.'

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
      note: 'Параллельные fetch — throughput за окно прогона.',
      executable: false,
      languageLabel: 'ts',
      code: `const started = performance.now();
const results = await Promise.all(
  Array.from({ length: 8 }, () => fetchPerf('/api/lab/perf/fast')),
);
const elapsedSec = (performance.now() - started) / 1000;
const rps = results.length / elapsedSec; // ← RPS за окно прогона
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
  tail: [
    {
      id: 'perf-tail-client',
      label: 'lab · tail',
      note: 'Один медленный запрос в пачке — p95 выше p50.',
      executable: false,
      languageLabel: 'ts',
      code: `const samples = await Promise.all([
  ...Array.from({ length: 6 }, () => fetchPerf('/api/lab/perf/fast')),
  fetchPerf('/api/lab/perf/slow'),
]);
const times = samples.map((s) => s.clientMs);
const p50 = percentile(times, 50); // ← медиана
const p95 = percentile(times, 95); // ← хвост, не среднее
`,
    },
    {
      id: 'prom-quantile',
      label: 'metrics.ts · quantile',
      note: 'p95 из гистограммы в PromQL / Grafana.',
      executable: false,
      languageLabel: 'promql',
      code: `histogram_quantile(
  0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route),
) // ← p95 по route, не avg
`,
    },
  ],
  resources: [
    {
      id: 'perf-heavy',
      label: 'routes/perfLab.ts · heavy',
      note: 'CPU-burn и буфер в heap — снимок `process.cpuUsage` / `memoryUsage`.',
      executable: false,
      languageLabel: 'ts',
      code: `const memBefore = process.memoryUsage();
const cpuBefore = process.cpuUsage();
burnCpu(120); // ← CPU процесса, не % всего сервера
const chunk = Buffer.alloc(8 * 1024 * 1024);
const memAfter = process.memoryUsage();
const cpu = process.cpuUsage(cpuBefore);
return {
  latencyMs,
  resources: {
    cpuMs: (cpu.user + cpu.system) / 1000,
    heapDeltaMb: (memAfter.heapUsed - memBefore.heapUsed) / 1e6,
  },
}; // ← в JSON ответа
`,
    },
    {
      id: 'node-exporter',
      label: 'infra · node_exporter',
      note: 'В проде CPU/RAM/disk хоста — exporter + Prometheus, не handler.',
      executable: false,
      languageLabel: 'yaml',
      code: `# scrape node_exporter на VM / k8s node
- job_name: node
  static_configs:
    - targets: ['node-exporter:9100']
# USE: Utilization CPU/RAM, Saturation queue, Errors
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
      resources: data.resources,
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

  if (caseId === 'tail') {
    const wallStart = performance.now()
    const samples = await Promise.all([
      ...Array.from({ length: TAIL_FAST }, (_, i) =>
        fetchPerf('/api/lab/perf/fast', `#${i + 1}`),
      ),
      fetchPerf('/api/lab/perf/slow', 'slow'),
    ])
    return buildResult(samples, performance.now() - wallStart)
  }

  if (caseId === 'resources') {
    const wallStart = performance.now()
    const light = await fetchPerf('/api/lab/perf/light', 'light')
    const heavy = await fetchPerf('/api/lab/perf/heavy', 'heavy')
    return buildResult([light, heavy], performance.now() - wallStart)
  }

  if (caseId === 'db') {
    const wallStart = performance.now()
    const db = await fetchPerf('/api/lab/perf/db', 'db')
    return buildResult([db], performance.now() - wallStart)
  }

  throw new Error(`unknown case: ${caseId satisfies never}`)
}

function primaryReading(
  caseId: CaseId,
  live: LiveResult,
): { label: string; value: string; sub: string; warn?: boolean } {
  switch (caseId) {
    case 'contrast':
      return {
        label: 'server latency',
        value: `${live.samples[0]?.serverMs ?? '—'} · ${live.samples[1]?.serverMs ?? '—'} ms`,
        sub: 'быстрый → медленный handler',
      }
    case 'burst':
      return {
        label: 'RPS',
        value: live.rps != null ? String(live.rps) : '—',
        sub: 'за окно прогона',
      }
    case 'db':
      return {
        label: 'server latency',
        value: `${live.samples[0]?.serverMs ?? '—'} ms`,
        sub: 'handler + Postgres',
      }
    case 'tail':
      return {
        label: 'p50 · p95',
        value: `${live.p50} · ${live.p95} ms`,
        sub: 'client round-trip',
        warn: live.p95 > live.p50 * 3,
      }
    case 'resources': {
      const light = live.samples[0]?.resources
      const heavy = live.samples[1]?.resources
      return {
        label: 'CPU процесса',
        value: `${light?.cpuMs ?? '—'} · ${heavy?.cpuMs ?? '—'} ms`,
        sub: `heap Δ ${heavy?.heapDeltaMb ?? '—'} MB · не % всего сервера`,
        warn: (heavy?.cpuMs ?? 0) > 15 || (heavy?.heapDeltaMb ?? 0) > 2,
      }
    }
  }
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
  const reading = done ? primaryReading(caseId, live) : null

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
      : busy
        ? 'active'
        : done
          ? 'ok'
          : 'idle'

  const backendLabel =
    caseId === 'db'
      ? 'Postgres'
      : caseId === 'resources'
        ? 'CPU + RAM'
        : caseId === 'burst' || caseId === 'tail'
          ? 'handler × N'
          : 'handler'
  const backendSub =
    caseId === 'db'
      ? done
        ? 'SELECT'
        : 'select 1'
      : caseId === 'resources'
        ? done
          ? 'burn + alloc'
          : 'лёгкий → тяжёлый'
      : caseId === 'burst'
        ? done
          ? `${BURST_COUNT} параллельно`
          : 'пачка запросов'
        : caseId === 'tail'
          ? done
            ? `${TAIL_FAST} fast + 1 slow`
            : 'есть медленный'
          : done
            ? 'fast → slow'
            : 'два handler'

  const arrowCls = (active: boolean) =>
    `${styles.arrow}${active ? ` ${styles.arrowActive}` : ` ${styles.arrowIdle}`}`

  return (
    <LabVizPanel
      title="Метрики ответа"
      meta={busy ? 'запрос…' : done ? 'готово' : 'ожидание'}
    >
      <div className={styles.flow}>
        <LabNode label="Браузер" sub="round-trip" state={browserState} />
        <span className={arrowCls(busy || done)} aria-hidden>
          →
        </span>
        <LabNode label="API" sub="handler" state={apiState} />
        <span className={arrowCls(busy || done)} aria-hidden>
          →
        </span>
        <LabNode label={backendLabel} sub={backendSub} state={backendState} />
      </div>

      <div
        ref={focusRef}
        className={`${styles.heroMetric}${done ? ` ${styles.heroMetricActive}` : ''}${reading?.warn ? ` ${styles.heroMetricWarn}` : ''}`}
      >
        <span className={styles.heroLabel}>{reading?.label ?? '—'}</span>
        <span className={styles.heroValue}>{reading?.value ?? '—'}</span>
        <span className={styles.heroSub}>{reading?.sub ?? '—'}</span>
      </div>
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
        contrast: `server ${result.samples[0]?.serverMs ?? '—'} ms vs ${result.samples[1]?.serverMs ?? '—'} ms — разница в handler, не в сети`,
        burst: `~${result.rps ?? '—'} RPS за прогон`,
        db: `Postgres добавил время: server ${result.samples[0]?.serverMs ?? '—'} ms`,
        tail: `p50 ${result.p50} ms, p95 ${result.p95} ms — один slow тянет хвост`,
        resources: `CPU ${result.samples[1]?.resources?.cpuMs ?? '—'} ms, heap +${result.samples[1]?.resources?.heapDeltaMb ?? '—'} MB — нагрузка на процесс Node`,
      }

      if (result.errors > 0) {
        log('err', `${result.errors} ошибок`)
      } else {
        const read = primaryReading(caseId, result)
        log('ok', `${read.label}: ${read.value}`)
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
      setHint('API недоступен — проверьте сеть или повторите позже')
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
      lead="Задержка ответа: что измеряет сервер и что доходит до браузера."
      problem={problem}
      code={code}
    />
  )
}
