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

type CaseId = 'tray' | 'order'
type Phase = 'idle' | 'run' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'tray', label: 'С печи' },
  { id: 'order', label: 'Заказ' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  tray: (
    <>
      Печь встаёт на <code>yield</code>: витрина зовёт <code>next()</code> и забирает следующую булку с{' '}
      <code>{'{ value, done }'}</code>.
    </>
  ),
  order: (
    <>
      Пекарь спрашивает начинку через <code>yield</code>; ответ из <code>next(arg)</code> входит в тело как
      результат паузы.
    </>
  ),
}

const SNIPPET_TRAY: InteractiveSnippet = {
  id: 'bake-tray',
  label: 'src/bakery/bakeTray.js',
  note: 'Печь отдаёт булки порциями: каждый next() — одна позиция с противня.',
  executable: false,
  code: `export function* bakeTray() {
  yield 'булка'; // ← next() => { value: 'булка', done: false }
  yield 'круассан';
  yield 'багет';
  return 'противень пуст'; // ← { value: 'противень пуст', done: true }
}

const oven = bakeTray();
oven.next();
oven.next();
oven.next();
oven.next();`,
}

const SNIPPET_ORDER: InteractiveSnippet = {
  id: 'take-order',
  label: 'src/bakery/takeOrder.js',
  note: 'Аргумент следующего next возвращается туда, где пекарь ждал на yield.',
  executable: false,
  code: `export function* takeOrder() {
  const filling = yield 'Какая начинка?'; // ← pause
  return \`Булка с \${filling}\`;
}

const order = takeOrder();
order.next(); // { value: 'Какая начинка?', done: false }
order.next('маком'); // ← feeds yield
`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  tray: [SNIPPET_TRAY],
  order: [SNIPPET_ORDER],
}

const TRAY_LINES = ["yield 'булка'", "yield 'круассан'", "yield 'багет'", "return 'противень пуст'"] as const
const ORDER_LINES = ["const filling = yield 'Какая начинка?'", "return `Булка с ${filling}`"] as const

type Frame = {
  line: number
  call: string
  resultLabel: string
  resultSub: string
  feed: string | null
  tray: string[]
  status: 'run' | 'ok'
  log: { kind: 'info' | 'ok'; text: string }
}

const TRAY_FRAMES: Frame[] = [
  {
    line: 0,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'булка', done: false }",
    feed: null,
    tray: ['булка'],
    status: 'run',
    log: { kind: 'info', text: 'витрина: забрала булку' },
  },
  {
    line: 1,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'круассан', done: false }",
    feed: null,
    tray: ['булка', 'круассан'],
    status: 'run',
    log: { kind: 'info', text: 'витрина: забрала круассан' },
  },
  {
    line: 2,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'багет', done: false }",
    feed: null,
    tray: ['булка', 'круассан', 'багет'],
    status: 'run',
    log: { kind: 'info', text: 'витрина: забрала багет' },
  },
  {
    line: 3,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'противень пуст', done: true }",
    feed: null,
    tray: ['булка', 'круассан', 'багет'],
    status: 'ok',
    log: { kind: 'ok', text: 'печь: противень пуст, done true' },
  },
]

const ORDER_FRAMES: Frame[] = [
  {
    line: 0,
    call: 'next()',
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'Какая начинка?', done: false }",
    feed: null,
    tray: ['вопрос'],
    status: 'run',
    log: { kind: 'info', text: 'пекарь: спросил начинку' },
  },
  {
    line: 0,
    call: "next('маком')",
    resultLabel: 'yield ← arg',
    resultSub: "filling = 'маком'",
    feed: "'маком'",
    tray: ['вопрос'],
    status: 'run',
    log: { kind: 'info', text: 'покупатель: ответил «маком»' },
  },
  {
    line: 1,
    call: "next('маком')",
    resultLabel: '{ value, done }',
    resultSub: "{ value: 'Булка с маком', done: true }",
    feed: null,
    tray: ['вопрос', 'Булка с маком'],
    status: 'ok',
    log: { kind: 'ok', text: 'заказ готов, done true' },
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

type BakeryVizProps = {
  caseId: CaseId
  phase: Phase
  frame: Frame | null
}

const BakeryViz = ({ caseId, phase, frame }: BakeryVizProps) => {
  const order = caseId === 'order'
  const lines = order ? ORDER_LINES : TRAY_LINES
  const lineIdx = frame?.line ?? -1
  const feeding = Boolean(frame?.feed)
  const done = phase === 'done' || frame?.status === 'ok'

  const meta =
    phase === 'idle'
      ? order
        ? 'вопрос ⇄ ответ next(arg)'
        : 'пауза → next → булка'
      : feeding
        ? 'начинка → внутрь yield'
        : done
          ? 'печь закрыта · done'
          : 'ждёт на yield'

  return (
    <LabVizPanel title="Пекарня · печь и витрина" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.col}>
          <p className={styles.label}>{order ? 'пекарь · function*' : 'печь · function*'}</p>
          <div className={[styles.body, styles.oven].filter(Boolean).join(' ')}>
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
          <span>{feeding ? 'ответ' : 'поднос'}</span>
        </div>

        <div className={styles.consumer}>
          <p className={styles.label}>{order ? 'покупатель' : 'витрина'}</p>
          <LabNode
            className={styles.call}
            label={frame?.call ?? 'next()'}
            sub={
              feeding
                ? `arg ${frame?.feed}`
                : phase === 'idle'
                  ? 'ещё не звала'
                  : 'шаг итератора'
            }
            state={feeding ? 'ok' : frame ? 'active' : 'idle'}
          />
          <LabNode
            className={styles.result}
            label={frame?.resultLabel ?? '{ value, done }'}
            sub={frame?.resultSub ?? 'ждёт булку'}
            state={done ? 'ok' : frame ? 'active' : 'idle'}
          />
        </div>

        <div className={styles.tape}>
          <span className={styles.tapeLabel}>противень</span>
          {frame && frame.tray.length > 0 ? (
            frame.tray.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className={[styles.chip, i === frame.tray.length - 1 && styles.chipFresh]
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
  const [caseId, setCaseId] = useState<CaseId>('tray')
  const [phase, setPhase] = useState<Phase>('idle')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const framesFor = (id: CaseId) => (id === 'order' ? ORDER_FRAMES : TRAY_FRAMES)

  const finishHint = (id: CaseId) =>
    id === 'order'
      ? 'Итог: пекарь и покупатель обмениваются данными на границе yield / next(arg).'
      : 'Итог: печь отдаёт булки по одной — каждый next() возобновляет тело до следующего yield.'

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
    const finished = i === frames.length - 1
    setPhase(finished ? 'done' : 'run')
    log(f.log.kind, f.log.text)
    if (finished) setHint(finishHint(id))
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
            setCaseId('tray')
            reset()
          }}
        >
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>
        Печь с <code>function*</code> не выпекает весь противень сразу: на <code>yield</code> она ждёт,
        пока витрина не позовёт <code>next()</code>.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
      <BakeryViz caseId={caseId} phase={phase} frame={frame} />
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
          caseId === 'order'
            ? 'Заказ начинки: вопрос из yield, ответ через next(arg).'
            : 'Противень: печь отдаёт булки по одной через next().'
        }
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Генератор · печь и витрина"
      lead="Пекарня на function*: булки с печи по одной и заказ с начинкой через next(arg)."
      problem={problem}
      code={code}
    />
  )
}
