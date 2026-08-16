import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
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
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import { apiJson } from '../../lib/apiBase'
import styles from './NodejsWorkerThreadsLab.module.css'

const TOPIC_ID = '246-nodejs-worker-threads'
const DURATION_MS = 350

type CaseId = 'main' | 'worker'
type Phase = 'idle' | 'a' | 'b' | 'done'

type LivePayload = {
  mode: CaseId
  jobMs: number
  pingMs: number
  checksum: number
  blockedMain: boolean
  ok: boolean
  summary: string
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'main', label: 'job на main' },
  { id: 'worker', label: 'job в Worker' },
]

const PAIN = (
  <>
    CPU-bound sync в handler держит event loop: параллельный{' '}
    <code>GET /ping</code> ждёт. Тот же объём в <code>worker_threads</code> —
    main отвечает сразу.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  main: (
    <>
      Живой <code>POST /api/lab/workers/job</code> с <code>mode: main</code> и
      параллельный ping — latency ping ≈ job.
    </>
  ),
  worker: (
    <>
      Тот же job в <code>Worker</code>; ping уходит вторым запросом и отвечает,
      пока поток считает.
    </>
  ),
}

const CODE_INTRO =
  'Учебные роуты `/api/lab/workers/*`: sync burn на main vs Worker + concurrent ping.'

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  main: [
    {
      id: 'job-main',
      label: 'routes/workersLab.ts · POST job',
      note: 'Sync burn в handler — event loop занят.',
      executable: false,
      languageLabel: 'ts',
      code: `// POST /api/lab/workers/job  { mode: 'main', durationMs: 350 }
function burnMain(ms) {
  const end = performance.now() + ms;
  let x = 0;
  while (performance.now() < end) x = (x + 1) % 1e9;
  return x;
}

const checksum = burnMain(durationMs); // ← блокирует main
return { ok: true, mode: 'main', latencyMs, checksum, blockedMain: true };
`,
    },
    {
      id: 'ping',
      label: 'routes/workersLab.ts · GET ping',
      note: 'Лёгкий зонд: отвечает, только когда loop свободен.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/workers/ping
app.get('/api/lab/workers/ping', async () => {
  return { ok: true, thread: 'main', latencyMs: 0 }; // ← ждёт, если burn на main
});
`,
    },
  ],
  worker: [
    {
      id: 'job-worker',
      label: 'routes/workersLab.ts · Worker',
      note: 'Handler ждёт message; loop свободен для ping.',
      executable: false,
      languageLabel: 'ts',
      code: `import { Worker } from 'node:worker_threads';

const worker = new Worker(WORKER_PATH, {
  workerData: { durationMs }, // ← вход в поток
});

const { checksum } = await new Promise((resolve, reject) => {
  worker.on('message', resolve); // ← не блокирует event loop
  worker.on('error', reject);
});
return { ok: true, mode: 'worker', checksum, blockedMain: false };
`,
    },
    {
      id: 'heavy-job',
      label: 'workers/heavyJob.mjs',
      note: 'Тот же burn вне main thread.',
      executable: false,
      languageLabel: 'js',
      code: `import { parentPort, workerData } from 'node:worker_threads';

const end = performance.now() + workerData.durationMs;
let x = 0;
while (performance.now() < end) x = (x + 1) % 1e9;

parentPort.postMessage({ ok: true, checksum: x }); // ← результат в main
`,
    },
  ],
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function nodeCls(...parts: Array<string | false | undefined>) {
  return [labVizStyles.node, ...parts.filter(Boolean)].join(' ')
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
  live: LivePayload | null
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function WorkersViz({ caseId, phase, live, focusRef }: VizProps) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const bad = doneOn && live != null && !live.ok
  const onMain = caseId === 'main'

  const title = onMain ? 'job · main thread' : 'job · worker_threads'
  const meta = !doneOn
    ? phase === 'idle'
      ? 'ожидание'
      : phase === 'a'
        ? 'job + ping…'
        : 'считаем…'
    : live
      ? `${live.ok ? 'ok' : 'err'} · ping ${live.pingMs} ms`
      : 'done'

  const jobSub = !bOn
    ? onMain
      ? 'burn sync?'
      : 'Worker?'
    : doneOn
      ? live
        ? `${live.jobMs} ms · Σ${live.checksum % 1000}`
        : '—'
      : onMain
        ? 'burn…'
        : 'thread…'

  const pingSub = !bOn
    ? 'concurrent GET'
    : doneOn
      ? live
        ? `${live.pingMs} ms`
        : '—'
      : 'ждём…'

  const loopSub = !doneOn
    ? onMain
      ? 'занят burn?'
      : 'свободен?'
    : live?.blockedMain
      ? 'был занят'
      : 'был свободен'

  const outSub = !doneOn
    ? 'ещё нет'
    : live
      ? live.ok
        ? `ping ${live.pingMs} / job ${live.jobMs}`
        : live.summary
      : '—'

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.scheme}>
        <div
          className={`${styles.schemeTop} ${nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>lab</span>
          <span className={labVizStyles.nodeSub}>job ∥ ping</span>
        </div>

        <div className={styles.schemeFork} aria-hidden>
          <span
            className={`${styles.forkLabel}${bOn ? ` ${styles.forkActive}` : ` ${styles.forkIdle}`}`}
          >
            ↙ job
          </span>
          <span />
          <span
            className={`${styles.forkLabel}${bOn ? ` ${styles.forkActive}` : ` ${styles.forkIdle}`}`}
          >
            ping ↘
          </span>
        </div>

        <div className={styles.schemeBranch}>
          <div
            className={nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && !bad && labVizStyles.nodeOk,
              !bOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>
              {onMain ? 'main · burn' : 'Worker'}
            </span>
            <span className={labVizStyles.nodeSub}>{jobSub}</span>
          </div>
        </div>

        <div className={styles.schemeBranch}>
          <div
            className={nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && live != null
                ? live.blockedMain
                  ? labVizStyles.nodeErr
                  : labVizStyles.nodeOk
                : false,
              !bOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>GET /ping</span>
            <span className={labVizStyles.nodeSub}>{pingSub}</span>
          </div>
        </div>

        <div
          className={`${styles.schemeMid} ${nodeCls(
            doneOn && Boolean(live?.blockedMain) && labVizStyles.nodeErr,
            doneOn && live != null && !live.blockedMain && labVizStyles.nodeOk,
            !doneOn && bOn && labVizStyles.nodeActive,
            !bOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>event loop</span>
          <span className={labVizStyles.nodeSub}>{loopSub}</span>
        </div>

        <div
          ref={focusRef}
          className={`${styles.schemeOut} ${nodeCls(
            doneOn && !bad && labVizStyles.nodeOk,
            doneOn && !bad && labVizStyles.nodeActive,
            doneOn && bad && labVizStyles.nodeErr,
            !doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>сравнение</span>
          <span className={labVizStyles.nodeSub}>{outSub}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

async function fetchLive(caseId: CaseId): Promise<LivePayload> {
  const jobStarted = performance.now()
  const jobPromise = apiJson<{
    ok: boolean
    mode?: string
    latencyMs?: number
    checksum?: number
    blockedMain?: boolean
    error?: string
  }>('/api/lab/workers/job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: caseId, durationMs: DURATION_MS }),
  })

  // Дать job дойти до server раньше ping (особенно для mode=main).
  await new Promise((r) => setTimeout(r, 40))

  const pingStarted = performance.now()
  const pingPromise = apiJson<{ ok: boolean; latencyMs?: number }>(
    '/api/lab/workers/ping',
  ).then((data) => ({
    ...data,
    clientMs: Math.round(performance.now() - pingStarted),
  }))

  const [job, ping] = await Promise.all([jobPromise, pingPromise])
  const jobMs =
    typeof job.latencyMs === 'number'
      ? job.latencyMs
      : Math.round(performance.now() - jobStarted)
  const pingMs = ping.clientMs
  const blockedMain =
    typeof job.blockedMain === 'boolean'
      ? job.blockedMain
      : caseId === 'main'

  return {
    mode: caseId,
    jobMs,
    pingMs,
    checksum: Number(job.checksum ?? 0),
    blockedMain,
    ok: Boolean(job.ok) && Boolean(ping.ok),
    summary: `ping ${pingMs} ms · job ${jobMs} ms`,
  }
}

export function NodejsWorkerThreadsLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('main')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState<LivePayload | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setLive(null)
    if (focusRef.current)
      gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const finishLive = (payload: LivePayload, hintText: string) => {
    setLive(payload)
    setPhase('done')
    if (payload.ok) {
      log('ok', payload.summary)
      setHint(hintText)
    } else {
      log('err', payload.summary)
      setHint(hintText)
    }
  }

  const runLive = async () => {
    setPhase('a')
    try {
      setPhase('b')
      const payload = await fetchLive(caseId)
      const hintText =
        caseId === 'main'
          ? `ping ~${payload.pingMs} ms ждал конца burn на main (~${payload.jobMs} ms)`
          : `ping ~${payload.pingMs} ms при job ~${payload.jobMs} ms — loop свободен`
      finishLive(payload, hintText)
      if (focusRef.current && !reducedMotion()) {
        gsap.fromTo(
          focusRef.current,
          { scale: 0.94, opacity: 0.45 },
          { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.inOut' },
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      finishLive(
        {
          mode: caseId,
          jobMs: 0,
          pingMs: 0,
          checksum: 0,
          blockedMain: caseId === 'main',
          ok: false,
          summary: message,
        },
        'API недоступен — дождитесь деплоя Render или поднимите server',
      )
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
    setCaseId('main')
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

      <WorkersViz
        caseId={caseId}
        phase={phase}
        live={live}
        focusRef={focusRef}
      />

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
      title="worker_threads"
      lead="Живой контраст: CPU на main блокирует ping; тот же burn в Worker — loop свободен."
      problem={problem}
      code={code}
    />
  )
}
