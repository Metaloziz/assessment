import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncPromiseAfterCatchLab.module.css'

const TOPIC_ID = '220-async-promise-after-catch'
const STEP = 0.6

type CaseId = 'recover' | 'rethrow'
type Phase = 'idle' | 'run' | 'done'
type ChainState = 'pending' | 'fulfilled' | 'rejected'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'recover', label: 'Восстановить' },
  { id: 'rethrow', label: 'Пробросить' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  recover: (
    <>
      <code>catch</code> возвращает запасное значение — следующий <code>then</code> снова видит{' '}
      <code>fulfilled</code>.
    </>
  ),
  rethrow: (
    <>
      <code>throw</code> из <code>catch</code> оставляет хвост в <code>rejected</code>: обычный{' '}
      <code>then</code> пропускается.
    </>
  ),
}

const SNIPPET_RECOVER: InteractiveSnippet = {
  id: 'recover',
  label: 'src/errors/recover.js',
  note: 'Возвращённое из `catch` значение превращает цепочку в fulfilled.',
  executable: false,
  code: `loadSettings()
  .catch((error) => {
    report(error);
    return defaultSettings; // ← recover: Promise fulfilled
  })
  .then((settings) => render(settings)); // ← выполняется
`,
}

const SNIPPET_RETHROW: InteractiveSnippet = {
  id: 'rethrow',
  label: 'src/errors/rethrow.js',
  note: 'Новая ошибка из `catch` передаётся следующему обработчику ошибки.',
  executable: false,
  code: `loadSettings()
  .catch((error) => {
    report(error);
    throw new SettingsError(error); // ← rethrow: Promise rejected
  })
  .then(render) // ← пропускается
  .catch(showSettingsFailure); // ← выполняется
`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  recover: [SNIPPET_RECOVER],
  rethrow: [SNIPPET_RETHROW],
}

const RECOVER_LINES = ['loadSettings()', '.catch → return default', '.then(render)'] as const
const RETHROW_LINES = [
  'loadSettings()',
  '.catch → throw',
  '.then(render)',
  '.catch(showFailure)',
] as const

type Frame = {
  line: number
  /** Lines that were skipped (e.g. then after rethrow) */
  skipped: number[]
  chain: ChainState
  actionLabel: string
  actionSub: string
  bridge: string
  tape: string[]
  status: 'run' | 'ok' | 'err'
  log: { kind: 'info' | 'ok' | 'warn' | 'err'; text: string }
}

const RECOVER_FRAMES: Frame[] = [
  {
    line: 0,
    skipped: [],
    chain: 'rejected',
    actionLabel: 'loadSettings',
    actionSub: 'Promise.reject(error)',
    bridge: 'reject',
    tape: ['rejected'],
    status: 'run',
    log: { kind: 'err', text: 'load: rejected' },
  },
  {
    line: 1,
    skipped: [],
    chain: 'fulfilled',
    actionLabel: 'catch',
    actionSub: 'return defaultSettings',
    bridge: 'return → ok',
    tape: ['rejected', 'fulfilled'],
    status: 'run',
    log: { kind: 'warn', text: 'catch: return defaultSettings' },
  },
  {
    line: 2,
    skipped: [],
    chain: 'fulfilled',
    actionLabel: 'then(render)',
    actionSub: 'получил defaultSettings',
    bridge: 'then',
    tape: ['rejected', 'fulfilled', 'render'],
    status: 'ok',
    log: { kind: 'ok', text: 'then: render defaultSettings' },
  },
]

const RETHROW_FRAMES: Frame[] = [
  {
    line: 0,
    skipped: [],
    chain: 'rejected',
    actionLabel: 'loadSettings',
    actionSub: 'Promise.reject(error)',
    bridge: 'reject',
    tape: ['rejected'],
    status: 'run',
    log: { kind: 'err', text: 'load: rejected' },
  },
  {
    line: 1,
    skipped: [],
    chain: 'rejected',
    actionLabel: 'catch',
    actionSub: 'throw SettingsError',
    bridge: 'throw',
    tape: ['rejected', 'rethrow'],
    status: 'run',
    log: { kind: 'warn', text: 'catch: throw SettingsError' },
  },
  {
    line: 2,
    skipped: [2],
    chain: 'rejected',
    actionLabel: 'then(render)',
    actionSub: 'пропущен · цепочка rejected',
    bridge: 'skip',
    tape: ['rejected', 'rethrow', 'skip then'],
    status: 'run',
    log: { kind: 'info', text: 'then: пропущен' },
  },
  {
    line: 3,
    skipped: [2],
    chain: 'rejected',
    actionLabel: 'catch(showFailure)',
    actionSub: 'финальный обработчик ошибки',
    bridge: 'catch',
    tape: ['rejected', 'rethrow', 'skip then', 'failure UI'],
    status: 'err',
    log: { kind: 'err', text: 'catch: showSettingsFailure' },
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

type CatchVizProps = {
  caseId: CaseId
  phase: Phase
  frame: Frame | null
}

const CatchViz = ({ caseId, phase, frame }: CatchVizProps) => {
  const recover = caseId === 'recover'
  const lines = recover ? RECOVER_LINES : RETHROW_LINES
  const lineIdx = frame?.line ?? -1
  const skipped = new Set(frame?.skipped ?? [])
  const done = phase === 'done'
  const ok = frame?.status === 'ok'
  const err = frame?.status === 'err'

  const meta =
    phase === 'idle'
      ? recover
        ? 'rejected → fulfilled'
        : 'rejected → rejected'
      : frame?.chain === 'fulfilled'
        ? 'цепочка fulfilled'
        : 'цепочка rejected'

  const chainState: 'idle' | 'active' | 'ok' | 'err' =
    !frame
      ? 'idle'
      : frame.chain === 'fulfilled'
        ? ok || done
          ? 'ok'
          : 'active'
        : err || frame.chain === 'rejected'
          ? frame.status === 'run' && lineIdx === 0
            ? 'err'
            : err
              ? 'err'
              : 'active'
          : 'idle'

  return (
    <LabVizPanel title="Состояние цепочки" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.col}>
          <p className={styles.label}>звенья Promise</p>
          <div className={styles.body}>
            {lines.map((code, i) => {
              const active = lineIdx === i
              const past = lineIdx > i && !skipped.has(i)
              const isSkip = skipped.has(i)
              const lineCls = [
                styles.line,
                active && !isSkip && labVizStyles.nodeActive,
                active && isSkip && labVizStyles.nodeActive,
                done && active && ok && labVizStyles.nodeOk,
                done && active && err && labVizStyles.nodeErr,
                past && styles.linePast,
                isSkip && styles.lineSkip,
                phase !== 'idle' && !active && !past && !isSkip && styles.lineDim,
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
            ok && styles.bridgeOk,
            (err || frame?.bridge === 'reject' || frame?.bridge === 'throw') && styles.bridgeWarn,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        >
          <span className={styles.bridgeArrow}>
            {frame?.bridge === 'return → ok' ? '✓' : frame?.bridge === 'skip' ? '↷' : '→'}
          </span>
          <span>{frame?.bridge ?? 'chain'}</span>
        </div>

        <div className={styles.side}>
          <p className={styles.label}>после шага</p>
          <LabNode
            className={styles.stateCard}
            label="состояние"
            sub={
              frame
                ? frame.chain === 'fulfilled'
                  ? 'fulfilled'
                  : 'rejected'
                : 'ещё не запущена'
            }
            state={chainState}
          />
          <LabNode
            className={styles.actionCard}
            label={frame?.actionLabel ?? 'обработчик'}
            sub={frame?.actionSub ?? 'ожидание прогона'}
            state={ok ? 'ok' : err ? 'err' : frame ? 'active' : 'idle'}
          />
        </div>

        <div className={styles.tape}>
          <span className={styles.tapeLabel}>путь</span>
          {frame && frame.tape.length > 0 ? (
            frame.tape.map((item, i) => {
              const last = i === frame.tape.length - 1
              const bad =
                item === 'rejected' || item === 'rethrow' || item === 'failure UI' || item === 'skip then'
              const good = item === 'fulfilled' || item === 'render'
              return (
                <span
                  key={`${item}-${i}`}
                  className={[
                    styles.chip,
                    last && styles.chipFresh,
                    good && styles.chipOk,
                    bad && styles.chipErr,
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

export function AsyncPromiseAfterCatchLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('recover')
  const [phase, setPhase] = useState<Phase>('idle')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const framesFor = (id: CaseId) => (id === 'recover' ? RECOVER_FRAMES : RETHROW_FRAMES)

  const finishHint = (id: CaseId) =>
    id === 'recover'
      ? 'Итог: значение из `catch` продолжает успешную ветку.'
      : 'Итог: `throw` из `catch` переносит ошибку к следующему `catch`.'

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
            setCaseId('recover')
            reset()
          }}
        >
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>
        <code>catch</code> не завершает цепочку сам по себе: его <code>return</code> или{' '}
        <code>throw</code> выбирает состояние следующего шага.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
      <CatchViz caseId={caseId} phase={phase} frame={frame} />
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
          caseId === 'recover'
            ? '`return` из `catch` восстанавливает fulfilled-ветку.'
            : '`throw` из `catch` оставляет хвост в rejected.'
        }
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Что после catch"
      lead="Обработчик ошибки либо возвращает данные, либо отправляет ошибку дальше."
      problem={problem}
      code={code}
    />
  )
}
