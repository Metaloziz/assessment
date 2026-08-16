import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncAwaitLab.module.css'

const TOPIC_ID = '219-async-await'
const STEP = 0.6

type CaseId = 'serial' | 'parallel'
type Phase = 'idle' | 'run' | 'done'
type Lane = 'idle' | 'run' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'serial', label: 'Последовательно' },
  { id: 'parallel', label: 'Promise.all' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  serial: (
    <>
      <code>await a()</code> завершится раньше, чем начнётся <code>b()</code>: время ожидания складывается.
    </>
  ),
  parallel: (
    <>
      Промисы стартуют до общего <code>await Promise.all</code> — независимые запросы идут вместе.
    </>
  ),
}

const SNIPPET_SERIAL: InteractiveSnippet = {
  id: 'serial',
  label: 'src/api/loadSerial.js',
  note: 'Вторая операция зависит от первого `await` только по времени, а не по данным.',
  executable: false,
  code: `export async function loadSerial() {
  const profile = await loadProfile(); // ← ждём A
  const feed = await loadFeed(); // ← B стартует после A
  return { profile, feed };
}
`,
}

const SNIPPET_PARALLEL: InteractiveSnippet = {
  id: 'parallel',
  label: 'src/api/loadParallel.js',
  note: 'Промисы создаются до ожидания, поэтому сеть работает параллельно.',
  executable: false,
  code: `export async function loadParallel() {
  const profilePromise = loadProfile(); // ← A стартует
  const feedPromise = loadFeed(); // ← B стартует рядом
  const [profile, feed] = await Promise.all([profilePromise, feedPromise]);
  return { profile, feed }; // ← join
}
`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  serial: [SNIPPET_SERIAL],
  parallel: [SNIPPET_PARALLEL],
}

const SERIAL_LINES = [
  'await loadProfile()',
  'await loadFeed()',
  'return { profile, feed }',
] as const

const PARALLEL_LINES = [
  'loadProfile() · start',
  'loadFeed() · start',
  'await Promise.all([…])',
  'return { profile, feed }',
] as const

type Frame = {
  line: number
  a: Lane
  b: Lane
  bridge: string
  joinLabel: string
  joinSub: string
  tape: string[]
  status: 'run' | 'ok'
  log: { kind: 'info' | 'ok'; text: string }
}

const SERIAL_FRAMES: Frame[] = [
  {
    line: 0,
    a: 'run',
    b: 'idle',
    bridge: 'await A',
    joinLabel: 'пауза',
    joinSub: 'ждём profile',
    tape: ['A'],
    status: 'run',
    log: { kind: 'info', text: 'A: request started' },
  },
  {
    line: 1,
    a: 'done',
    b: 'run',
    bridge: 'await B',
    joinLabel: 'пауза',
    joinSub: 'A готово · ждём feed',
    tape: ['A', 'B'],
    status: 'run',
    log: { kind: 'info', text: 'A: готово, B: request started' },
  },
  {
    line: 2,
    a: 'done',
    b: 'done',
    bridge: 'return',
    joinLabel: 'join',
    joinSub: '{ profile, feed }',
    tape: ['A', 'B', 'return'],
    status: 'ok',
    log: { kind: 'ok', text: 'join: оба результата готовы' },
  },
]

const PARALLEL_FRAMES: Frame[] = [
  {
    line: 0,
    a: 'run',
    b: 'idle',
    bridge: 'start A',
    joinLabel: 'старт',
    joinSub: 'profilePromise создан',
    tape: ['A↓'],
    status: 'run',
    log: { kind: 'info', text: 'A: request started' },
  },
  {
    line: 1,
    a: 'run',
    b: 'run',
    bridge: 'A ∥ B',
    joinLabel: 'старт',
    joinSub: 'оба запроса уже в полёте',
    tape: ['A↓', 'B↓'],
    status: 'run',
    log: { kind: 'info', text: 'B: request started параллельно' },
  },
  {
    line: 2,
    a: 'run',
    b: 'run',
    bridge: 'await all',
    joinLabel: 'Promise.all',
    joinSub: 'ждём оба settled',
    tape: ['A↓', 'B↓', 'all'],
    status: 'run',
    log: { kind: 'info', text: 'await Promise.all([A, B])' },
  },
  {
    line: 3,
    a: 'done',
    b: 'done',
    bridge: 'return',
    joinLabel: 'join',
    joinSub: '{ profile, feed }',
    tape: ['A↓', 'B↓', 'all', 'return'],
    status: 'ok',
    log: { kind: 'ok', text: 'join: оба результата готовы' },
  },
]

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    steps.forEach((x) => x())
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((x, i) => tl.call(x, undefined, i * STEP))
}

function laneText(lane: Lane, name: string) {
  if (lane === 'run') return `${name} · request`
  if (lane === 'done') return `${name} · готово`
  return `${name} · ждёт`
}

function laneCls(lane: Lane) {
  return [
    styles.bar,
    lane === 'idle' && styles.barIdle,
    lane === 'run' && labVizStyles.nodeActive,
    lane === 'done' && labVizStyles.nodeOk,
  ]
    .filter(Boolean)
    .join(' ')
}

type AwaitVizProps = {
  caseId: CaseId
  phase: Phase
  frame: Frame | null
}

const AwaitViz = ({ caseId, phase, frame }: AwaitVizProps) => {
  const parallel = caseId === 'parallel'
  const lines = parallel ? PARALLEL_LINES : SERIAL_LINES
  const lineIdx = frame?.line ?? -1
  const done = phase === 'done' || frame?.status === 'ok'
  const a = frame?.a ?? 'idle'
  const b = frame?.b ?? 'idle'

  const meta =
    phase === 'idle'
      ? parallel
        ? 'A ∥ B → join'
        : 'A → B → return'
      : done
        ? 'оба результата собраны'
        : frame?.bridge ?? 'await'

  return (
    <LabVizPanel title="Время ожидания" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.col}>
          <p className={styles.label}>{parallel ? 'async loadParallel()' : 'async loadSerial()'}</p>
          <div className={styles.body}>
            {lines.map((code, i) => {
              const active = lineIdx === i
              const past = lineIdx > i
              const lineCls = [
                styles.line,
                active && labVizStyles.nodeActive,
                done && active && labVizStyles.nodeOk,
                past && styles.linePast,
                phase !== 'idle' && !active && !past && styles.lineDim,
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <div key={code} className={lineCls}>
                  <span className={styles.cursor} aria-hidden>
                    {active ? '▶' : past ? '·' : ''}
                  </span>
                  <span className={styles.lineCode}>{code}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div
          className={[styles.bridge, frame && styles.bridgeActive, done && styles.bridgeOk]
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        >
          <span className={styles.bridgeArrow}>{parallel && !done ? '∥' : '→'}</span>
          <span>{frame?.bridge ?? 'await'}</span>
        </div>

        <div className={styles.side}>
          <p className={styles.label}>запросы</p>
          <div className={styles.lanes}>
            <div className={styles.lane}>
              <span className={styles.laneName}>A</span>
              <div className={laneCls(a)}>{laneText(a, 'profile')}</div>
            </div>
            <div className={styles.lane}>
              <span className={styles.laneName}>B</span>
              <div className={laneCls(b)}>{laneText(b, 'feed')}</div>
            </div>
          </div>
          <LabNode
            className={styles.joinCard}
            label={frame?.joinLabel ?? 'join'}
            sub={frame?.joinSub ?? 'ещё не собирали'}
            state={done ? 'ok' : frame ? 'active' : 'idle'}
          />
        </div>

        <div className={styles.tape}>
          <span className={styles.tapeLabel}>ход</span>
          {frame && frame.tape.length > 0 ? (
            frame.tape.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className={[
                  styles.chip,
                  i === frame.tape.length - 1 && styles.chipFresh,
                  done && styles.chipOk,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {item}
              </span>
            ))
          ) : (
            <span className={styles.chipEmpty}>пусто</span>
          )}
        </div>
      </div>
    </LabVizPanel>
  )
}

export function AsyncAwaitLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('serial')
  const [phase, setPhase] = useState<Phase>('idle')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const framesFor = (id: CaseId) => (id === 'parallel' ? PARALLEL_FRAMES : SERIAL_FRAMES)

  const finishHint = (id: CaseId) =>
    id === 'parallel'
      ? 'Итог: независимые запросы должны стартовать до общего `await Promise.all`.'
      : 'Итог: последовательный `await` нужен, когда B использует результат A — иначе время просто складывается.'

  const reset = () => {
    setPhase('idle')
    setFrame(null)
    setCursor(-1)
    setHint(null)
  }

  const select = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    reset()
  }

  const applyFrame = (frames: Frame[], i: number, id: CaseId) => {
    const f = frames[i]!
    setFrame(f)
    setCursor(i)
    const done = i === frames.length - 1
    setPhase(done ? 'done' : 'run')
    log(f.log.kind, f.log.text)
    if (done) setHint(finishHint(id))
  }

  const step = () => {
    if (busy || phase === 'done') return
    tlRef.current?.kill()
    const frames = framesFor(caseId)
    const next = cursor + 1
    if (next >= frames.length) return
    if (cursor < 0) {
      clear()
      setHint(null)
    }
    applyFrame(frames, next, caseId)
  }

  const run = () => {
    clear()
    reset()
    setBusy(true)
    const frames = framesFor(caseId)
    playTimeline(
      tlRef,
      frames.map((_, i) => () => {
        applyFrame(frames, i, caseId)
      }),
      () => {
        setBusy(false)
      },
    )
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => select(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy || phase === 'done'} onClick={step}>
          Шаг
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => {
            tlRef.current?.kill()
            setBusy(false)
            clear()
            setCaseId('serial')
            reset()
          }}
        >
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>
        <code>await</code> делает код линейным, но не определяет стратегию запуска: независимые
        операции можно начать вместе.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
      <AwaitViz caseId={caseId} phase={phase} frame={frame} />
      {hint ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <div className={styles.codeSwitch}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => select(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
      <InteractiveCodePanel
        topicId={TOPIC_ID}
        intro={
          caseId === 'parallel'
            ? 'Параллельный запуск через `Promise.all`.'
            : 'Последовательный `await`: B ждёт завершения A.'
        }
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="await · последовательно или вместе"
      lead="Ожидание результата и запуск работы — разные решения."
      problem={problem}
      code={code}
    />
  )
}
