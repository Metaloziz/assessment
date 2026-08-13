import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncJsSingleThreadLab.module.css'

const TOPIC_ID = '213-async-js-single-thread'
const STEP = 0.6

type CaseId = 'short' | 'block'
type Phase = 'idle' | 'run' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'short', label: 'Короткий sync' },
  { id: 'block', label: 'Долгий цикл' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  short: <>Стек быстро опустел — UI снова может обработать клик.</>,
  block: (
    <>
      Пока <code>while</code> держит стек, event loop не забирает клик из очереди.
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'main-ui',
    label: 'src/ui/mainThread.js',
    note: 'Один call stack на main thread: долгий sync блокирует и отрисовку, и колбэки.',
    executable: false,
    code: `// ═══════════════════════════════════════════
// MAIN THREAD ← один call stack
// ═══════════════════════════════════════════
button.addEventListener('click', () => {
  console.log('click handled'); // ← только когда stack пуст
});

function shortWork() {
  const sum = 1 + 2; // ← стек свободен почти сразу
  return sum;
}

function blockUi(ms) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    // ← LONG TASK: UI и таймеры ждут
  }
}

shortWork();
// blockUi(3000); // не вызывать на клике без чанков / Worker
`,
  },
  {
    id: 'chunked',
    label: 'src/ui/chunkedWork.js',
    note: 'Тяжёлую работу режут на куски, чтобы стек успевал опустеть между ними.',
    executable: false,
    code: `export function processChunks(items, onDone) {
  let i = 0;
  function pump() {
    const end = Math.min(i + 500, items.length);
    for (; i < end; i++) {
      /* CPU work */
    }
    if (i < items.length) {
      setTimeout(pump, 0); // ← отдать управление loop
    } else {
      onDone();
    }
  }
  pump();
}
`,
  },
]

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ')
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

function StackViz({
  phase,
  caseId,
  frames,
  uiFrozen,
  panelRef,
}: {
  phase: Phase
  caseId: CaseId
  frames: string[]
  uiFrozen: boolean
  panelRef: MutableRefObject<HTMLDivElement | null>
}) {
  const done = phase === 'done'
  return (
    <LabVizPanel
      title="Call stack · UI"
      meta={caseId === 'short' ? 'стек свободен' : uiFrozen ? 'UI ждёт' : 'цикл занял стек'}
    >
      <div ref={panelRef} className={styles.flow}>
        <div className={styles.col}>
          <p className={styles.label}>call stack</p>
          <div className={styles.stack}>
            {frames.length === 0 ? (
              <div className={nodeCls(done && labVizStyles.nodeOk)}>
                <span className={labVizStyles.nodeLabel}>∅</span>
                <span className={labVizStyles.nodeSub}>пусто</span>
              </div>
            ) : (
              frames.map((f) => (
                <div key={f} className={nodeCls(labVizStyles.nodeActive)}>
                  <span className={labVizStyles.nodeLabel}>{f}</span>
                  <span className={labVizStyles.nodeSub}>frame</span>
                </div>
              ))
            )}
          </div>
        </div>
        <span className={styles.arrow} aria-hidden>
          →
        </span>
        <div
          className={nodeCls(
            uiFrozen && labVizStyles.nodeErr,
            !uiFrozen && phase !== 'idle' && labVizStyles.nodeOk,
          )}
        >
          <span className={labVizStyles.nodeLabel}>UI / click</span>
          <span className={labVizStyles.nodeSub}>{uiFrozen ? 'заморожен' : 'отвечает'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function AsyncJsSingleThreadLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('short')
  const [phase, setPhase] = useState<Phase>('idle')
  const [frames, setFrames] = useState<string[]>([])
  const [uiFrozen, setUiFrozen] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setFrames([])
    setUiFrozen(false)
    setHint(null)
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    const block = caseId === 'block'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('run')
          setFrames(block ? ['while'] : ['shortWork'])
          setUiFrozen(block)
          log('info', block ? 'стек: while (долго)' : 'стек: shortWork')
        },
        () => {
          if (block) {
            log('err', 'клик в очереди — стек ещё занят')
          } else {
            setFrames([])
            log('ok', 'стек пуст — можно обработать click')
          }
        },
        () => {
          if (block) {
            setFrames([])
            setUiFrozen(false)
            log('warn', 'цикл закончился — UI снова жив')
          }
          setPhase('done')
        },
      ],
      (tl) => {
        if (panelRef.current) {
          tl.fromTo(
            panelRef.current,
            { opacity: 0.6, y: 6 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
            0,
          )
        }
      },
      () => {
        setBusy(false)
        setHint(
          block
            ? 'Долгий sync на main thread = зависший UI; режьте работу или выносите в Worker.'
            : 'Короткий sync не мешает loop: стек свободен, клики обрабатываются.',
        )
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
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => {
            tlRef.current?.kill()
            setBusy(false)
            clear()
            resetViz()
            setCaseId('short')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        JS на main thread исполняет ваш код по одному <code>call stack</code>: пока стек занят, UI и
        колбэки ждут.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <StackViz phase={phase} caseId={caseId} frames={frames} uiFrozen={uiFrozen} panelRef={panelRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  return (
    <JsLabShell
      title="Один поток · call stack"
      lead="Синхронный код держит стек; асинхронность нужна, чтобы его отпускать."
      problem={problem}
      code={
        <InteractiveCodePanel
          topicId={TOPIC_ID}
          intro="Main thread: короткий sync vs long task; чанки через `setTimeout`."
          snippets={SNIPPETS}
        />
      }
    />
  )
}
