import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncEventLoopLab.module.css'

const TOPIC_ID = '215-async-event-loop'
const STEP = 1.56

type CaseId =
  | 'callStack'
  | 'taskQueue'
  | 'microQueue'
  | 'tasksVsMicro'
  | 'allVsRace'
  | 'promiseErrors'
  | 'nestedChain'
  | 'timeoutPromise'

type ChipKind = 'sync' | 'micro' | 'macro'

type Chip = {
  id: string
  label: string
  sub: string
  kind: ChipKind
  seeded?: boolean
  /** One-shot enqueue into micro when this frame first runs */
  spawnMicro?: { label: string; sub: string }
}

type VizState = {
  stack: Chip[]
  micro: Chip[]
  macro: Chip[]
  meta: string
  focusId: string | null
}

type StepResult = {
  next: VizState
  log?: { level: 'info' | 'ok' | 'warn'; text: string }
  done?: boolean
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'callStack', label: 'Call Stack' },
  { id: 'taskQueue', label: 'Task Queue' },
  { id: 'microQueue', label: 'Microtask Queue' },
  { id: 'tasksVsMicro', label: 'Tasks vs Microtasks' },
  { id: 'allVsRace', label: 'Promise.all / race' },
  { id: 'promiseErrors', label: 'Promises and Errors' },
  { id: 'nestedChain', label: 'Nested Promise Chain' },
  { id: 'timeoutPromise', label: 'setTimeout → Promise' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  callStack: (
    <>
      На <code>call stack</code> два sync-frame: <code>main</code> и <code>fnA</code> — сходят с вершины по
      LIFO.
    </>
  ),
  taskQueue: (
    <>
      Две macrotask в task queue; при пустом стеке loop забирает их по одной.
    </>
  ),
  microQueue: (
    <>
      Две microtask ждут в очереди — drain идёт полностью, пока очередь не опустеет.
    </>
  ),
  tasksVsMicro: (
    <>
      Рядом лежат <code>then</code> и <code>timeout</code>: при пустом стеке сначала micro, потом macro.
    </>
  ),
  allVsRace: (
    <>
      Обработчики <code>Promise.all</code> и <code>Promise.race</code> — обе microtask в одной очереди.
    </>
  ),
  promiseErrors: (
    <>
      После reject в очереди microtask: сначала путь <code>then</code>, затем <code>catch</code>.
    </>
  ),
  nestedChain: (
    <>
      Старт с <code>then1</code>; во время run он ставит вложенный <code>then2</code> в microtask queue.
    </>
  ),
  timeoutPromise: (
    <>
      Сначала macrotask <code>timeout</code>, внутри неё ставится <code>then</code> — micro после task.
    </>
  ),
}

const CASE_HINT: Record<CaseId, ReactNode> = {
  callStack: (
    <>
      Итог: sync-код живёт только на <code>call stack</code>; пока стек не пуст, очереди не трогают.
    </>
  ),
  taskQueue: (
    <>
      Итог: из task queue loop берёт по одной macrotask за раз на пустой стек.
    </>
  ),
  microQueue: (
    <>
      Итог: microtask queue дренируется полностью, пока в ней есть колбэки.
    </>
  ),
  tasksVsMicro: (
    <>
      Итог: <code>then</code> из microtask queue выполнился раньше <code>timeout</code> из task queue.
    </>
  ),
  allVsRace: (
    <>
      Итог: и <code>all·then</code>, и <code>race·then</code> — microtask; порядок в очереди, не «параллель
      потоков».
    </>
  ),
  promiseErrors: (
    <>
      Итог: и успех, и <code>catch</code> идут через microtask queue после опустошения стека.
    </>
  ),
  nestedChain: (
    <>
      Итог: вложенный <code>then2</code> попал в ту же microtask queue и ушёл до возврата к macrotask.
    </>
  ),
  timeoutPromise: (
    <>
      Итог: <code>setTimeout</code> — macrotask; <code>then</code> после него — уже microtask на следующем
      обороте drain.
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'loop-tick',
    label: 'src/runtime/loopTick.js',
    note: '`Promise.then` — microtask; `setTimeout` — macrotask. Loop берёт их при пустом `call stack`.',
    executable: false,
    code: `console.log('sync: start');

// ═══════════════════════════════════════════
// SCHEDULE ← очереди, не стек сразу
// ═══════════════════════════════════════════
Promise.resolve().then(() => {
  console.log('microtask'); // ← microtask queue → stack
});

setTimeout(() => {
  console.log('macrotask'); // ← task queue → stack
}, 0);

console.log('sync: end'); // ← call stack сначала
`,
  },
  {
    id: 'timeout-then',
    label: 'src/runtime/timeoutThen.js',
    note: 'Внутри timer ставится `Promise.then` — новая microtask после текущей macrotask.',
    executable: false,
    code: `setTimeout(() => {
  // ═══════════════════════════════════════════
  // MACRO → MICRO ← then после timeout
  // ═══════════════════════════════════════════
  Promise.resolve().then(() => {
    console.log('then after timeout'); // ← microtask
  });
}, 0);

Promise.resolve().then(() => {
  console.log('then1');
  return Promise.resolve();
}).then(() => {
  console.log('then2'); // ← nested microtask
});
`,
  },
  {
    id: 'unhandled-rejection',
    label: 'src/runtime/unhandledRejection.js',
    note: 'Reject без `catch` / `onRejected` к checkpoint → unhandled rejection; слушатель ловит событие.',
    executable: false,
    code: `// ═══════════════════════════════════════════
// UNHANDLED ← reject без обработчика
// ═══════════════════════════════════════════
window.addEventListener('unhandledrejection', (e) => {
  console.warn('unhandled', e.reason); // ← после microtask checkpoint
});

Promise.reject(new Error('boom')); // нет catch → unhandled rejection

// handled: хвост есть — события не будет
Promise.reject(new Error('caught'))
  .catch((err) => {
    console.log('handled', err.message); // ← microtask onRejected
  });

// async без await/catch на вызове — тот же класс
async function load() {
  throw new Error('async boom');
}
load(); // rejected Promise без подписчика
`,
  },
]

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function chipCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, styles.chip, ...mods.filter(Boolean)].join(' ')
}

let chipSeq = 0
function makeChip(
  label: string,
  sub: string,
  kind: ChipKind,
  extra?: Pick<Chip, 'spawnMicro'>,
): Chip {
  chipSeq += 1
  return { id: `el-${chipSeq}`, label, sub, kind, ...extra }
}

function cloneViz(s: VizState): VizState {
  return {
    ...s,
    stack: s.stack.map((c) => ({ ...c })),
    micro: s.micro.map((c) => ({ ...c })),
    macro: s.macro.map((c) => ({ ...c })),
  }
}

function baseViz(partial: Partial<VizState> & Pick<VizState, 'stack' | 'micro' | 'macro' | 'meta'>): VizState {
  return {
    focusId: partial.focusId ?? (partial.stack[partial.stack.length - 1]?.id ?? null),
    ...partial,
  }
}

function buildInitial(caseId: CaseId): VizState {
  switch (caseId) {
    case 'callStack': {
      const main = makeChip('main', 'sync', 'sync')
      const fnA = makeChip('fnA', 'sync', 'sync')
      return baseViz({
        stack: [main, fnA],
        micro: [],
        macro: [],
        meta: 'LIFO на call stack',
        focusId: fnA.id,
      })
    }
    case 'taskQueue':
      return baseViz({
        stack: [],
        micro: [],
        macro: [
          makeChip('timeout1', 'macrotask', 'macro'),
          makeChip('timeout2', 'macrotask', 'macro'),
        ],
        meta: 'task queue ждёт пустой стек',
        focusId: null,
      })
    case 'microQueue':
      return baseViz({
        stack: [],
        micro: [makeChip('then1', 'microtask', 'micro'), makeChip('then2', 'microtask', 'micro')],
        macro: [],
        meta: 'drain microtask queue',
        focusId: null,
      })
    case 'tasksVsMicro':
      return baseViz({
        stack: [],
        micro: [makeChip('then', 'microtask', 'micro')],
        macro: [makeChip('timeout', 'macrotask', 'macro')],
        meta: 'micro раньше macro',
        focusId: null,
      })
    case 'allVsRace':
      return baseViz({
        stack: [],
        micro: [
          makeChip('all·then', 'microtask', 'micro'),
          makeChip('race·then', 'microtask', 'micro'),
        ],
        macro: [],
        meta: 'all / race → microtask',
        focusId: null,
      })
    case 'promiseErrors':
      return baseViz({
        stack: [],
        micro: [makeChip('then', 'reject path', 'micro'), makeChip('catch', 'microtask', 'micro')],
        macro: [],
        meta: 'then → catch в micro',
        focusId: null,
      })
    case 'nestedChain':
      return baseViz({
        stack: [],
        micro: [
          makeChip('then1', 'microtask', 'micro', {
            spawnMicro: { label: 'then2', sub: 'nested' },
          }),
        ],
        macro: [],
        meta: 'then1 поставит then2',
        focusId: null,
      })
    case 'timeoutPromise':
      return baseViz({
        stack: [],
        micro: [],
        macro: [
          makeChip('timeout', 'macrotask', 'macro', {
            spawnMicro: { label: 'then', sub: 'after timer' },
          }),
        ],
        meta: 'timeout → then',
        focusId: null,
      })
  }
}

function advance(state: VizState): StepResult {
  const s = cloneViz(state)

  if (s.stack.length > 0) {
    const top = s.stack[s.stack.length - 1]!
    s.focusId = top.id

    if (!top.seeded) {
      top.seeded = true
      if (top.spawnMicro) {
        s.micro.push(makeChip(top.spawnMicro.label, top.spawnMicro.sub, 'micro'))
        s.meta = `${top.label} → enqueue ${top.spawnMicro.label}`
        return {
          next: s,
          log: {
            level: 'ok',
            text: `${top.kind}: ${top.label} + micro ${top.spawnMicro.label}`,
          },
        }
      }
      s.meta = `run ${top.label}`
      const lane = top.kind === 'sync' ? 'stack' : top.kind === 'micro' ? 'micro' : 'macro'
      return {
        next: s,
        log: {
          level: top.kind === 'micro' ? 'ok' : 'info',
          text: `${lane}: ${top.label} на стеке`,
        },
      }
    }

    s.stack = s.stack.slice(0, -1)
    s.focusId = s.stack.length > 0 ? s.stack[s.stack.length - 1]!.id : null
    s.meta = `${top.label} завершён`
    return { next: s, log: { level: 'info', text: `stack: pop ${top.label}` } }
  }

  if (s.micro.length > 0) {
    const [head, ...rest] = s.micro
    s.micro = rest
    s.stack = [{ ...head!, seeded: false }]
    s.focusId = head!.id
    s.meta = 'microtask → call stack'
    return {
      next: s,
      log: { level: 'ok', text: `loop: ${head!.label} из microtask queue` },
    }
  }

  if (s.macro.length > 0) {
    const [head, ...rest] = s.macro
    s.macro = rest
    s.stack = [{ ...head!, seeded: false }]
    s.focusId = head!.id
    s.meta = 'macrotask → call stack'
    return {
      next: s,
      log: { level: 'info', text: `loop: ${head!.label} из task queue` },
    }
  }

  s.meta = 'очереди пусты'
  s.focusId = null
  return { next: s, done: true, log: { level: 'ok', text: 'прогон завершён' } }
}

function chipState(chip: Chip, focusId: string | null, lane: 'stack' | 'queue') {
  if (focusId === chip.id && lane === 'stack') return labVizStyles.nodeActive
  if (chip.kind === 'micro') return focusId === chip.id ? labVizStyles.nodeActive : labVizStyles.nodeOk
  if (chip.kind === 'macro' && focusId === chip.id) return labVizStyles.nodeActive
  if (chip.kind === 'sync' && focusId === chip.id) return labVizStyles.nodeActive
  return undefined
}

function allChips(s: VizState): Chip[] {
  return [...s.stack, ...s.micro, ...s.macro]
}

function captureChipRects(root: HTMLElement | null): Map<string, DOMRect> {
  const map = new Map<string, DOMRect>()
  if (!root) return map
  root.querySelectorAll<HTMLElement>('[data-chip]').forEach((el) => {
    const id = el.dataset.chip
    if (id) map.set(id, el.getBoundingClientRect())
  })
  return map
}

function laneRect(root: HTMLElement | null, lane: 'stack' | 'micro' | 'macro'): DOMRect | null {
  if (!root) return null
  const el = root.querySelector<HTMLElement>(`[data-lane="${lane}"]`)
  return el ? el.getBoundingClientRect() : null
}

function makeGhost(chip: Chip, rect: DOMRect): HTMLElement {
  const ghost = document.createElement('div')
  ghost.className = chipCls(
    styles.chipGhost,
    chip.kind === 'micro' && labVizStyles.nodeOk,
  )
  ghost.style.left = `${rect.left}px`
  ghost.style.top = `${rect.top}px`
  ghost.style.width = `${rect.width}px`
  ghost.style.height = `${rect.height}px`
  const label = document.createElement('span')
  label.className = labVizStyles.nodeLabel
  label.textContent = chip.label
  const sub = document.createElement('span')
  sub.className = labVizStyles.nodeSub
  sub.textContent = chip.sub
  ghost.append(label, sub)
  document.body.appendChild(ghost)
  return ghost
}

function playChipMotion(
  root: HTMLElement | null,
  prev: VizState,
  next: VizState,
  fromRects: Map<string, DOMRect>,
  tl: gsap.core.Timeline,
) {
  if (!root) {
    tl.to({}, { duration: STEP }, 0)
    return
  }

  const prevIds = new Set(allChips(prev).map((c) => c.id))
  const nextById = new Map(allChips(next).map((c) => [c.id, c]))
  const removed = allChips(prev).filter((c) => !nextById.has(c.id))
  const spawned = allChips(next).filter((c) => !prevIds.has(c.id))

  const focusRect =
    (prev.focusId && fromRects.get(prev.focusId)) ||
    (prev.stack.length > 0 ? fromRects.get(prev.stack[prev.stack.length - 1]!.id) : null) ||
    laneRect(root, 'stack')

  let moved = false

  root.querySelectorAll<HTMLElement>('[data-chip]').forEach((el) => {
    const id = el.dataset.chip
    if (!id) return
    const to = el.getBoundingClientRect()
    const from = fromRects.get(id)

    if (from) {
      const dx = from.left - to.left
      const dy = from.top - to.top
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        moved = true
        gsap.set(el, { x: dx, y: dy, zIndex: 5 })
        tl.to(
          el,
          { x: 0, y: 0, duration: STEP, ease: 'power2.inOut', clearProps: 'transform,zIndex' },
          0,
        )
      } else if (next.focusId === id) {
        moved = true
        tl.fromTo(
          el,
          { scale: 0.96 },
          { scale: 1, duration: STEP * 0.85, ease: 'power2.inOut', clearProps: 'transform' },
          0,
        )
      }
      return
    }

    const origin = focusRect ?? laneRect(root, 'stack')
    if (!origin) return
    moved = true
    const dx = origin.left + origin.width / 2 - (to.left + to.width / 2)
    const dy = origin.top + origin.height / 2 - (to.top + to.height / 2)
    const delay = spawned.findIndex((c) => c.id === id) * 0.1
    gsap.set(el, { x: dx, y: dy, opacity: 0.35, scale: 0.88, zIndex: 6 })
    tl.to(
      el,
      {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        duration: STEP,
        ease: 'power2.inOut',
        clearProps: 'transform,opacity,zIndex',
      },
      delay,
    )
  })

  removed.forEach((chip, i) => {
    const rect = fromRects.get(chip.id)
    if (!rect) return
    moved = true
    const ghost = makeGhost(chip, rect)
    tl.to(
      ghost,
      {
        y: -18,
        opacity: 0,
        scale: 0.82,
        duration: STEP * 0.9,
        ease: 'power2.inOut',
        onComplete: () => ghost.remove(),
      },
      i * 0.06,
    )
  })

  if (!moved) tl.to({}, { duration: STEP }, 0)
}

type LoopVizProps = {
  viz: VizState
  playing: boolean
  stageRef: MutableRefObject<HTMLDivElement | null>
}

const LoopViz = ({ viz, playing, stageRef }: LoopVizProps) => {
  return (
    <LabVizPanel title="Event loop" meta={playing || viz.meta ? viz.meta : 'stack ↔ micro ↔ macro'}>
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.columns}>
          <div className={styles.col}>
            <p className={styles.label}>call stack</p>
            <div
              className={`${styles.well} ${styles.stackWell}`}
              data-lane="stack"
              aria-label="Call stack"
            >
              {viz.stack.length === 0 ? (
                <span className={styles.empty}>∅</span>
              ) : (
                viz.stack.map((c) => (
                  <div key={c.id} data-chip={c.id} className={chipCls(chipState(c, viz.focusId, 'stack'))}>
                    <span className={labVizStyles.nodeLabel}>{c.label}</span>
                    <span className={labVizStyles.nodeSub}>{c.sub}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.col}>
            <p className={styles.label}>microtask queue</p>
            <div
              className={`${styles.well} ${styles.queueWell} ${styles.microWell}`}
              data-lane="micro"
              aria-label="Microtask queue"
            >
              {viz.micro.length === 0 ? (
                <span className={styles.empty}>∅</span>
              ) : (
                viz.micro.map((c) => (
                  <div key={c.id} data-chip={c.id} className={chipCls(chipState(c, viz.focusId, 'queue'))}>
                    <span className={labVizStyles.nodeLabel}>{c.label}</span>
                    <span className={labVizStyles.nodeSub}>{c.sub}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.col}>
            <p className={styles.label}>macrotask queue</p>
            <div
              className={`${styles.well} ${styles.queueWell} ${styles.macroWell}`}
              data-lane="macro"
              aria-label="Macrotask queue"
            >
              {viz.macro.length === 0 ? (
                <span className={styles.empty}>∅</span>
              ) : (
                viz.macro.map((c) => (
                  <div key={c.id} data-chip={c.id} className={chipCls(chipState(c, viz.focusId, 'queue'))}>
                    <span className={labVizStyles.nodeLabel}>{c.label}</span>
                    <span className={labVizStyles.nodeSub}>{c.sub}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={styles.statusRow}>
          <span>
            stack <code className={styles.statusAccent}>{viz.stack.length}</code>
          </span>
          <span>
            micro <code>{viz.micro.length}</code>
          </span>
          <span>
            macro <code>{viz.macro.length}</code>
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function AsyncEventLoopLab() {
  const { lines, log, clear } = useLabLog(5)
  const [caseId, setCaseId] = useState<CaseId>('tasksVsMicro')
  const [viz, setViz] = useState<VizState>(() => buildInitial('tasksVsMicro'))
  const [hint, setHint] = useState<ReactNode | null>(null)
  const [playing, setPlaying] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const runIdRef = useRef(0)
  const vizRef = useRef(viz)
  const caseRef = useRef(caseId)
  const stageRef = useRef<HTMLDivElement | null>(null)

  vizRef.current = viz
  caseRef.current = caseId

  const stopRun = () => {
    runIdRef.current += 1
    tlRef.current?.kill()
    tlRef.current = null
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    document.querySelectorAll(`.${styles.chipGhost}`).forEach((n) => n.remove())
    stageRef.current?.querySelectorAll<HTMLElement>('[data-chip]').forEach((el) => {
      gsap.set(el, { clearProps: 'transform,opacity,zIndex' })
    })
  }

  useEffect(
    () => () => {
      stopRun()
    },
    [],
  )

  const showTemplate = (id: CaseId) => {
    const initial = buildInitial(id)
    vizRef.current = initial
    setViz(initial)
    setHint(null)
  }

  const selectCase = (next: CaseId) => {
    stopRun()
    setPlaying(false)
    setCaseId(next)
    clear()
    showTemplate(next)
  }

  const resetAll = () => {
    stopRun()
    setPlaying(false)
    clear()
    setCaseId('tasksVsMicro')
    showTemplate('tasksVsMicro')
  }

  const finishRun = (runId: number, id: CaseId) => {
    if (runId !== runIdRef.current) return
    setPlaying(false)
    setHint(CASE_HINT[id])
  }

  const applyStep = (result: StepResult, runId: number) => {
    if (runId !== runIdRef.current) return
    vizRef.current = result.next
    flushSync(() => {
      setViz(result.next)
    })
    if (result.log) log(result.log.level, result.log.text)
  }

  const scheduleNext = (runId: number) => {
    if (runId !== runIdRef.current) return

    const prev = vizRef.current
    const fromRects = captureChipRects(stageRef.current)
    const result = advance(prev)

    if (result.done) {
      applyStep(result, runId)
      finishRun(runId, caseRef.current)
      return
    }

    applyStep(result, runId)
    if (runId !== runIdRef.current) return

    if (reducedMotion()) {
      timeoutRef.current = window.setTimeout(() => scheduleNext(runId), Math.round(STEP * 1000))
      return
    }

    tlRef.current?.kill()
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => scheduleNext(runId),
    })
    tlRef.current = tl
    playChipMotion(stageRef.current, prev, result.next, fromRects, tl)
  }

  const run = () => {
    stopRun()
    const runId = ++runIdRef.current
    clear()
    setHint(null)
    setPlaying(true)

    const start = buildInitial(caseId)
    vizRef.current = start
    flushSync(() => {
      setViz(start)
    })

    if (reducedMotion()) {
      log('info', 'reduced-motion: стартовый набор без анимации')
      setHint(CASE_HINT[caseId])
      setPlaying(false)
      return
    }

    log('info', `шаблон: ${CASES.find((c) => c.id === caseId)?.label ?? caseId}`)
    scheduleNext(runId)
  }

  const problem = (
    <div className={shell.panel}>
      <div className={`${shell.row} ${styles.caseRow}`}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            disabled={playing}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
        <LabButton variant="primary" disabled={playing} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={resetAll}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Event loop переносит колбэк на <code>call stack</code> только когда стек пуст: сначала дренирует{' '}
        <code>microtask queue</code>, затем берёт одну задачу из task queue. Вложенный <code>then</code> остаётся
        в micro до следующей macrotask.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <LoopViz viz={viz} playing={playing} stageRef={stageRef} />

      {hint ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  return (
    <JsLabShell
      title="Event loop · шаблоны"
      lead="Восемь стартовых наборов: стек, task/micro очереди, Promise-сценарии — один прогон до пустоты."
      problem={problem}
      code={
        <InteractiveCodePanel
          topicId={TOPIC_ID}
          intro="`then` / nested chain — microtask; `setTimeout` — macrotask; reject без `catch` — unhandled rejection."
          snippets={SNIPPETS}
        />
      }
    />
  )
}
