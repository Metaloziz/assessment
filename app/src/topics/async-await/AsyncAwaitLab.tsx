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

type CaseId = 'then' | 'await'
type Phase = 'idle' | 'run' | 'done'
type StepId = 'fetch' | 'json' | 'use'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'then', label: '.then' },
  { id: 'await', label: 'async/await' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  then: (
    <>
      Ответ сети проходит по цепочке <code>.then</code>: сначала ответ, потом JSON, потом имя.
    </>
  ),
  await: (
    <>
      Те же шаги, но линейно: <code>await fetch</code>, <code>await json</code>, <code>return</code>.
    </>
  ),
}

const SNIPPET_THEN: InteractiveSnippet = {
  id: 'then',
  label: 'src/api/loadNameThen.js',
  note: 'Один `fetch` оформлен цепочкой промисов.',
  executable: false,
  code: `export function loadName(id) {
  return fetch(\`/api/users/\${id}\`) // ← сеть
    .then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json(); // ← тело → JSON
    })
    .then((user) => user.name); // ← данные готовы
}

loadName(1).catch(console.error);
`,
}

const SNIPPET_AWAIT: InteractiveSnippet = {
  id: 'await',
  label: 'src/api/loadNameAwait.js',
  note: 'Тот же запрос через `async`/`await` — снаружи всё равно Promise.',
  executable: false,
  code: `export async function loadName(id) {
  const res = await fetch(\`/api/users/\${id}\`); // ← сеть
  if (!res.ok) throw new Error(String(res.status));
  const user = await res.json(); // ← тело → JSON
  return user.name; // ← данные готовы
}

loadName(1).catch(console.error);
`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  then: [SNIPPET_THEN],
  await: [SNIPPET_AWAIT],
}

const THEN_LINES = ['fetch(…)', '.then(res → json)', '.then(user → name)'] as const
const AWAIT_LINES = ['await fetch(…)', 'await res.json()', 'return user.name'] as const

type Frame = {
  line: number
  step: StepId
  bridge: string
  status: 'run' | 'ok'
  log: { kind: 'info' | 'ok'; text: string }
}

const THEN_FRAMES: Frame[] = [
  {
    line: 0,
    step: 'fetch',
    bridge: 'fetch',
    status: 'run',
    log: { kind: 'info', text: 'fetch: запрос ушёл' },
  },
  {
    line: 1,
    step: 'json',
    bridge: '.then',
    status: 'run',
    log: { kind: 'info', text: 'then: res.json()' },
  },
  {
    line: 2,
    step: 'use',
    bridge: '.then',
    status: 'ok',
    log: { kind: 'ok', text: 'готово: имя из цепочки then' },
  },
]

const AWAIT_FRAMES: Frame[] = [
  {
    line: 0,
    step: 'fetch',
    bridge: 'await',
    status: 'run',
    log: { kind: 'info', text: 'await fetch: ждём ответ' },
  },
  {
    line: 1,
    step: 'json',
    bridge: 'await',
    status: 'run',
    log: { kind: 'info', text: 'await res.json()' },
  },
  {
    line: 2,
    step: 'use',
    bridge: 'return',
    status: 'ok',
    log: { kind: 'ok', text: 'готово: имя через async/await' },
  },
]

const FLOW: Array<{ id: StepId; label: string; sub: string }> = [
  { id: 'fetch', label: 'сеть', sub: 'fetch' },
  { id: 'json', label: 'JSON', sub: 'тело ответа' },
  { id: 'use', label: 'данные', sub: 'user.name' },
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

function stepState(current: StepId | null, id: StepId, done: boolean): 'idle' | 'active' | 'ok' {
  if (!current) return 'idle'
  const order: StepId[] = ['fetch', 'json', 'use']
  const ci = order.indexOf(current)
  const ii = order.indexOf(id)
  if (done && ii <= ci) return 'ok'
  if (ii < ci) return 'ok'
  if (ii === ci) return 'active'
  return 'idle'
}

type AwaitVizProps = {
  caseId: CaseId
  phase: Phase
  frame: Frame | null
}

const AwaitViz = ({ caseId, phase, frame }: AwaitVizProps) => {
  const isAwait = caseId === 'await'
  const lines = isAwait ? AWAIT_LINES : THEN_LINES
  const lineIdx = frame?.line ?? -1
  const done = phase === 'done' || frame?.status === 'ok'
  const current = frame?.step ?? null

  const meta =
    phase === 'idle'
      ? isAwait
        ? 'await · линейно'
        : '.then · цепочка'
      : done
        ? 'оба стиля → Promise'
        : frame?.bridge ?? '…'

  return (
    <LabVizPanel title="Один запрос, два стиля" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.col}>
          <p className={styles.label}>{isAwait ? 'async loadName()' : 'loadName() · then'}</p>
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
          <span className={styles.bridgeArrow}>→</span>
          <span>{frame?.bridge ?? (isAwait ? 'await' : '.then')}</span>
        </div>

        <div className={styles.side}>
          <p className={styles.label}>ход запроса</p>
          <div className={styles.flow}>
            {FLOW.map((node, i) => (
              <div key={node.id} className={styles.flowItem}>
                <LabNode
                  label={node.label}
                  sub={node.sub}
                  state={stepState(current, node.id, done)}
                />
                {i < FLOW.length - 1 ? <span className={styles.flowArrow}>→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function AsyncAwaitLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('then')
  const [phase, setPhase] = useState<Phase>('idle')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [hint, setHint] = useState<ReactNode | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const framesFor = (id: CaseId) => (id === 'await' ? AWAIT_FRAMES : THEN_FRAMES)

  const finishHint = (id: CaseId): ReactNode =>
    id === 'await' ? (
      <>
        Итог: <code>async</code>/<code>await</code> — тот же промис, шаги читаются сверху вниз.
      </>
    ) : (
      <>
        Итог: цепочка <code>.then</code> делает те же шаги; снаружи тоже Promise.
      </>
    )

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
            setCaseId('then')
            reset()
          }}
        >
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>
        Один <code>fetch</code> можно писать цепочкой <code>.then</code> или линейно через{' '}
        <code>async</code>/<code>await</code> — снаружи всё равно Promise.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
      <AwaitViz caseId={caseId} phase={phase} frame={frame} />
      {hint ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
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
          caseId === 'await'
            ? 'Тот же запрос через `async`/`await`.'
            : 'Тот же запрос цепочкой `.then`.'
        }
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="запрос · .then или async/await"
      lead="Один fetch — два стиля записи; результат снаружи один и тот же Promise."
      problem={problem}
      code={code}
    />
  )
}
