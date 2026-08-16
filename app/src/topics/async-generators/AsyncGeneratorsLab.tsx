import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncGeneratorsLab.module.css'

const TOPIC_ID = '221-async-generators'
const STEP = 0.6

type CaseId = 'range' | 'dialog'
type Phase = 'idle' | 'run' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'range', label: 'range()' },
  { id: 'dialog', label: 'next(arg)' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  range: (
    <>
      Курсор стоит на <code>yield</code>: <code>next()</code> возобновляет тело и отдаёт{' '}
      <code>{'{ value, done }'}</code>.
    </>
  ),
  dialog: (
    <>
      Аргумент <code>next(arg)</code> входит в тело как результат приостановленного <code>yield</code>.
    </>
  ),
}

const SNIPPET_RANGE: InteractiveSnippet = {
  id: 'range',
  label: 'src/iter/range.js',
  note: 'Синхронный генератор отдаёт значение порциями через iterator protocol.',
  executable: false,
  code: `export function* range() {
  yield 1; // ← next() => { value: 1, done: false }
  yield 2;
  yield 3;
  return 'done'; // ← { value: 'done', done: true }
}

const iterator = range();
iterator.next();
iterator.next();
iterator.next();
iterator.next();`,
}

const SNIPPET_DIALOG: InteractiveSnippet = {
  id: 'dialog',
  label: 'src/iter/dialog.js',
  note: 'Аргумент следующего `next` возвращается туда, где генератор остановился.',
  executable: false,
  code: `export function* dialog() {
  const name = yield 'Как вас зовут?'; // ← pause
  return \`Привет, \${name}\`;
}

const iterator = dialog();
iterator.next(); // { value: 'Как вас зовут?', done: false }
iterator.next('Анна'); // ← feeds yield
`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  range: [SNIPPET_RANGE],
  dialog: [SNIPPET_DIALOG],
}

const RANGE_LINES = ['yield 1', 'yield 2', 'yield 3', "return 'done'"] as const
const DIALOG_LINES = ["const name = yield 'Как вас зовут?'", "return `Привет, ${name}`"] as const

type Frame = {
  line: number
  call: string
  resultLabel: string
  resultSub: string
  feed: string | null
  tape: string[]
  status: 'run' | 'ok'
  log: { kind: 'info' | 'ok'; text: string }
}

const RANGE_FRAMES: Frame[] = [
  {
    line: 0,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: '{ value: 1, done: false }',
    feed: null,
    tape: ['1'],
    status: 'run',
    log: { kind: 'info', text: 'next(): value 1, done false' },
  },
  {
    line: 1,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: '{ value: 2, done: false }',
    feed: null,
    tape: ['1', '2'],
    status: 'run',
    log: { kind: 'info', text: 'next(): value 2, done false' },
  },
  {
    line: 2,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: '{ value: 3, done: false }',
    feed: null,
    tape: ['1', '2', '3'],
    status: 'run',
    log: { kind: 'info', text: 'next(): value 3, done false' },
  },
  {
    line: 3,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'done', done: true }",
    feed: null,
    tape: ['1', '2', '3'],
    status: 'ok',
    log: { kind: 'ok', text: "next(): value 'done', done true" },
  },
]

const DIALOG_FRAMES: Frame[] = [
  {
    line: 0,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'Как вас зовут?', done: false }",
    feed: null,
    tape: ["'Как вас зовут?'"],
    status: 'run',
    log: { kind: 'info', text: 'next(): вопрос из yield' },
  },
  {
    line: 0,
    call: "next('Анна')",
    resultLabel: 'yield ← arg',
    resultSub: "name = 'Анна'",
    feed: "'Анна'",
    tape: ["'Как вас зовут?'"],
    status: 'run',
    log: { kind: 'info', text: 'next("Анна"): аргумент вошёл в yield' },
  },
  {
    line: 1,
    call: "next('Анна')",
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'Привет, Анна', done: true }",
    feed: null,
    tape: ["'Как вас зовут?'", "'Привет, Анна'"],
    status: 'ok',
    log: { kind: 'ok', text: 'return: iterator.done = true' },
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

type GeneratorVizProps = {
  caseId: CaseId
  phase: Phase
  frame: Frame | null
}

const GeneratorViz = ({ caseId, phase, frame }: GeneratorVizProps) => {
  const dialog = caseId === 'dialog'
  const lines = dialog ? DIALOG_LINES : RANGE_LINES
  const lineIdx = frame?.line ?? -1
  const feeding = Boolean(frame?.feed)
  const done = phase === 'done' || frame?.status === 'ok'

  const meta =
    phase === 'idle'
      ? dialog
        ? 'yield ⇄ next(arg)'
        : 'pause → next → resume'
      : feeding
        ? 'arg → внутрь yield'
        : done
          ? 'iterator.done = true'
          : 'paused at yield'

  return (
    <LabVizPanel title="Пауза генератора" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.col}>
          <p className={styles.label}>тело function*</p>
          <div className={styles.body}>
            {lines.map((code, i) => {
              const active = lineIdx === i
              const past = lineIdx > i
              const lineCls = [
                styles.line,
                active && labVizStyles.nodeActive,
                done && i === lineIdx && labVizStyles.nodeOk,
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
          className={[
            styles.bridge,
            frame && styles.bridgeActive,
            feeding && styles.bridgeIn,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        >
          <span className={styles.bridgeArrow}>{feeding ? '←' : '→'}</span>
          <span>{feeding ? 'feed' : 'yield'}</span>
        </div>

        <div className={styles.consumer}>
          <p className={styles.label}>потребитель</p>
          <LabNode
            className={styles.call}
            label={frame?.call ?? 'next()'}
            sub={feeding ? `arg ${frame?.feed}` : phase === 'idle' ? 'ещё не вызван' : 'шаг итератора'}
            state={feeding ? 'ok' : frame ? 'active' : 'idle'}
          />
          <LabNode
            className={styles.result}
            label={frame?.resultLabel ?? '{ value, done }'}
            sub={frame?.resultSub ?? 'ожидание результата'}
            state={done ? 'ok' : frame ? 'active' : 'idle'}
          />
        </div>

        <div className={styles.tape}>
          <span className={styles.tapeLabel}>выдано</span>
          {frame && frame.tape.length > 0 ? (
            frame.tape.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className={[styles.chip, i === frame.tape.length - 1 && styles.chipFresh]
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

export function AsyncGeneratorsLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('range')
  const [phase, setPhase] = useState<Phase>('idle')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const framesFor = (id: CaseId) => (id === 'dialog' ? DIALOG_FRAMES : RANGE_FRAMES)

  const finishHint = (id: CaseId) =>
    id === 'dialog'
      ? 'Итог: генератор — двусторонний диалог между телом и итератором.'
      : 'Итог: `yield` делит вычисление на возобновляемые шаги. Асинхронные генераторы используют другой протокол `asyncIterator`.'

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
            setCaseId('range')
            reset()
          }}
        >
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>
        Синхронный генератор сохраняет место выполнения на <code>yield</code> и продолжает работу
        только по вызову итератора. Асинхронные генераторы похожи по форме, но возвращают промисы.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
      <GeneratorViz caseId={caseId} phase={phase} frame={frame} />
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
          caseId === 'dialog'
            ? 'Двусторонний `next(arg)` на границе `yield`.'
            : 'Синхронный `function*`: пауза на `yield` и шаги `next()`.'
        }
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Генератор · пауза и next()"
      lead="Синхронный iterator отдаёт значения и принимает данные на границе yield."
      problem={problem}
      code={code}
    />
  )
}
