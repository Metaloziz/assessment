import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncInfiniteGeneratorsLab.module.css'

const TOPIC_ID = '222-async-infinite-generators'
const STEP = 0.6

type CaseId = 'runaway' | 'take'
type Phase = 'idle' | 'run' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'runaway', label: 'Без stop' },
  { id: 'take', label: 'take(3)' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  runaway: (
    <>
      <code>for...of</code> без <code>break</code> снова и снова зовёт <code>next()</code>: у источника нет
      естественного <code>done</code>.
    </>
  ),
  take: (
    <>
      После третьего значения потребитель делает <code>break</code> / <code>take(3)</code> — бесконечный
      источник закрывается снаружи.
    </>
  ),
}

const SNIPPET_IDS: InteractiveSnippet = {
  id: 'ids',
  label: 'src/iter/ids.js',
  note: 'Бесконечный источник сам не сообщает об окончании.',
  executable: false,
  code: `export function* ids() {
  let id = 1;
  while (true) {
    yield id++; // ← бесконечный source
  }
}

for (const id of ids()) {
  save(id); // ← без break цикл не завершится
}`,
}

const SNIPPET_TAKE: InteractiveSnippet = {
  id: 'take',
  label: 'src/iter/take.js',
  note: 'Потребитель задаёт границу чтения, не меняя генератор-источник.',
  executable: false,
  code: `export function* take(iterable, count) {
  let seen = 0;
  for (const value of iterable) {
    yield value;
    if (++seen === count) break; // ← stop source
  }
}

const firstThree = [...take(ids(), 3)];`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  runaway: [SNIPPET_IDS],
  take: [SNIPPET_TAKE],
}

const SOURCE_LINES = ['while (true) {', '  yield id++', '}'] as const
/** Index of the yield line in SOURCE_LINES */
const YIELD_LINE = 1

type Frame = {
  /** Which source line has ▶; null = none */
  sourceLine: number | null
  yieldValue: number | null
  call: string
  resultLabel: string
  resultSub: string
  tape: string[]
  status: 'run' | 'ok' | 'err'
  bridge: 'next' | 'stop' | '∞'
  log: { kind: 'info' | 'ok' | 'warn'; text: string }
}

function buildFrames(caseId: CaseId): Frame[] {
  const take = caseId === 'take'
  const yields: Frame[] = [1, 2, 3].map((n) => ({
    sourceLine: YIELD_LINE,
    yieldValue: n,
    call: take ? `take · next #${n}` : `for…of · next #${n}`,
    resultLabel: '{ value, done }',
    resultSub: `{ value: ${n}, done: false }`,
    tape: [1, 2, 3].slice(0, n).map(String),
    status: 'run',
    bridge: 'next',
    log: { kind: 'info', text: `source: yield id ${n}` },
  }))

  if (take) {
    yields.push({
      sourceLine: YIELD_LINE,
      yieldValue: 3,
      call: 'break / take(3)',
      resultLabel: 'consumer stop',
      resultSub: 'граница 3 · source закрыт',
      tape: ['1', '2', '3'],
      status: 'ok',
      bridge: 'stop',
      log: { kind: 'ok', text: 'consumer: break after 3' },
    })
  } else {
    yields.push({
      sourceLine: YIELD_LINE,
      yieldValue: 3,
      call: 'for…of · next #4…',
      resultLabel: 'нет done',
      resultSub: 'ждёт 4, 5, ∞ — цикл не кончится',
      tape: ['1', '2', '3', '∞'],
      status: 'err',
      bridge: '∞',
      log: { kind: 'warn', text: 'consumer: ждёт id 4 и дальше' },
    })
  }

  return yields
}

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

type InfiniteVizProps = {
  caseId: CaseId
  phase: Phase
  frame: Frame | null
}

const InfiniteViz = ({ caseId, phase, frame }: InfiniteVizProps) => {
  const take = caseId === 'take'
  const stopped = frame?.status === 'ok'
  const runaway = frame?.status === 'err'
  const lineIdx = frame?.sourceLine ?? -1
  const yieldText =
    frame?.yieldValue != null ? `  yield ${frame.yieldValue}` : '  yield id++'

  const meta =
    phase === 'idle'
      ? take
        ? 'consumer ограничивает поток'
        : 'consumer без границы'
      : stopped
        ? 'take(3) · stop'
        : runaway
          ? 'нет done · ∞'
          : `yield ${frame?.yieldValue ?? '…'}`

  return (
    <LabVizPanel title="Бесконечный источник" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.col}>
          <p className={styles.label}>тело ids() · while (true)</p>
          <div className={styles.body}>
            {SOURCE_LINES.map((code, i) => {
              const active = lineIdx === i
              const display = i === YIELD_LINE ? yieldText : code
              const lineCls = [
                styles.line,
                active && labVizStyles.nodeActive,
                stopped && active && labVizStyles.nodeOk,
                runaway && active && labVizStyles.nodeErr,
                phase !== 'idle' && !active && styles.lineDim,
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <div key={code} className={lineCls}>
                  <span className={styles.cursor} aria-hidden>
                    {active ? '▶' : ''}
                  </span>
                  <span className={styles.lineCode}>{display}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div
          className={[
            styles.bridge,
            frame && styles.bridgeActive,
            stopped && styles.bridgeOk,
            runaway && styles.bridgeWarn,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        >
          <span className={styles.bridgeArrow}>
            {frame?.bridge === 'stop' ? '✖' : frame?.bridge === '∞' ? '∞' : '→'}
          </span>
          <span>{frame?.bridge === 'stop' ? 'stop' : frame?.bridge === '∞' ? 'ещё' : 'yield'}</span>
        </div>

        <div className={styles.consumer}>
          <p className={styles.label}>{take ? 'потребитель · take(3)' : 'потребитель · for…of'}</p>
          <LabNode
            className={styles.call}
            label={frame?.call ?? (take ? 'take(ids(), 3)' : 'for…of ids()')}
            sub={
              phase === 'idle'
                ? take
                  ? 'лимит ещё не применён'
                  : 'без break'
                : stopped
                  ? 'граница достигнута'
                  : runaway
                    ? 'продолжает next()'
                    : 'просит следующий id'
            }
            state={stopped ? 'ok' : runaway ? 'err' : frame ? 'active' : 'idle'}
          />
          <LabNode
            className={styles.result}
            label={frame?.resultLabel ?? '{ value, done }'}
            sub={frame?.resultSub ?? 'ожидание next()'}
            state={stopped ? 'ok' : runaway ? 'err' : frame ? 'active' : 'idle'}
          />
        </div>

        <div className={styles.tape}>
          <span className={styles.tapeLabel}>взято</span>
          {frame && frame.tape.length > 0 ? (
            frame.tape.map((item, i) => {
              const last = i === frame.tape.length - 1
              const isInf = item === '∞'
              return (
                <span
                  key={`${item}-${i}`}
                  className={[
                    styles.chip,
                    last && !isInf && styles.chipFresh,
                    stopped && styles.chipOk,
                    isInf && styles.chipWarn,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {item}
                </span>
              )
            })
          ) : (
            <span className={styles.chipEmpty}>пусто</span>
          )}
        </div>
      </div>
    </LabVizPanel>
  )
}

export function AsyncInfiniteGeneratorsLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('runaway')
  const [phase, setPhase] = useState<Phase>('idle')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const finishHint = (id: CaseId) =>
    id === 'take'
      ? 'Итог: бесконечность безопасна, когда потребитель владеет явной границей чтения.'
      : 'Итог: без `break` или лимита бесконечный iterator удерживает цикл в работе.'

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
    const frames = buildFrames(caseId)
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
    const frames = buildFrames(caseId)
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
            setCaseId('runaway')
            reset()
          }}
        >
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>
        Бесконечный генератор полезен как источник значений, но не должен сам определять длину
        обработки. Границу задаёт потребитель через <code>break</code> или адаптер <code>take</code>.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
      <InfiniteViz caseId={caseId} phase={phase} frame={frame} />
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
          caseId === 'take'
            ? 'Конечный consumer через `take` / `break`.'
            : 'Бесконечный `yield` без естественного `done`.'
        }
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Бесконечный генератор · stop"
      lead="Источник может работать всегда, а потребитель обязан ограничивать чтение."
      problem={problem}
      code={code}
    />
  )
}
