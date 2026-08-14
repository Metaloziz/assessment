import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactFiberLab.module.css'

const TOPIC_ID = '197-react-fiber'
const STEP = 0.65

type CaseId = 'phases' | 'interrupt' | 'links'
type Phase = 'idle' | 'step1' | 'step2' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'phases', label: 'Render · Commit' },
  { id: 'interrupt', label: 'Прерывание' },
  { id: 'links', label: 'child · sibling' },
]

const CODE_INTRO: Record<CaseId, string> = {
  phases: 'Render собирает черновик fiber; commit — единственная фаза записи в DOM.',
  interrupt: 'Срочное обновление переключает work loop; черновик не доходит до commit.',
  links: 'Reconciler обходит дерево по связям child / sibling / return, без глубокого стека.',
}

const SNIPPET_FIBER: InteractiveSnippet = {
  id: 'fiber-node',
  label: 'src/fiber/types.ts',
  note: 'У каждого узла — связный список и пара alternate для double buffering.',
  executable: false,
  languageLabel: 'ts',
  code: `export type Fiber = {
  type: string | (() => unknown) | null;
  key: string | null;
  pendingProps: Record<string, unknown>;
  stateNode: HTMLElement | null; // ← host-компонент
  child: Fiber | null;           // ← первый ребёнок
  sibling: Fiber | null;         // ← сосед справа
  return: Fiber | null;          // ← родитель
  alternate: Fiber | null;       // ← current ↔ workInProgress
  flags: number;
};`,
}

const SNIPPET_WORK_LOOP: InteractiveSnippet = {
  id: 'work-loop',
  label: 'src/fiber/workLoop.ts',
  note: 'Один fiber за итерацию; concurrent-режим может yield между шагами.',
  executable: false,
  languageLabel: 'ts',
  code: `import type { Fiber } from './types';

let workInProgress: Fiber | null = null;

export function performUnitOfWork(fiber: Fiber): Fiber | null {
  beginWork(fiber); // ← render компонента / host
  if (fiber.child) return fiber.child;
  return completeUnitOfWork(fiber); // ← sibling или return
}

export function workLoopConcurrent() {
  while (workInProgress && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress)!;
  }
  // ← нет времени / пришло срочное — сохранить WIP и выйти
}`,
}

const SNIPPET_COMMIT: InteractiveSnippet = {
  id: 'commit-root',
  label: 'src/fiber/commitRoot.ts',
  note: 'Commit синхронный: мутации DOM, layout effects, затем passive.',
  executable: false,
  languageLabel: 'ts',
  code: `export function commitRoot(root: Fiber) {
  // ← render уже закончился, DOM ещё старый
  commitBeforeMutationEffects(root);
  commitMutationEffects(root); // ← единственное место записи в DOM
  root.current = root;         // ← WIP становится current
  commitLayoutEffects(root);   // ← useLayoutEffect
  schedulePassiveEffects(root); // ← useEffect после paint
}`,
}

const SNIPPET_PRIORITY: InteractiveSnippet = {
  id: 'scheduler-lanes',
  label: 'src/scheduler/lanes.ts',
  note: 'Ввод и клики получают более высокий lane, чем фоновый список.',
  executable: false,
  languageLabel: 'ts',
  code: `export const SyncLane = 1;
export const InputContinuousLane = 4;
export const TransitionLane = 64;

export function requestUpdateLane(source: 'input' | 'transition') {
  return source === 'input' ? InputContinuousLane : TransitionLane;
}

// ← срочный lane прерывает незавершённый render с TransitionLane`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  phases: [SNIPPET_FIBER, SNIPPET_COMMIT],
  interrupt: [SNIPPET_WORK_LOOP, SNIPPET_PRIORITY],
  links: [SNIPPET_FIBER, SNIPPET_WORK_LOOP],
}

const PAIN =
  'Fiber разбивает обновление на шаги: render собирает черновик дерева без DOM, commit применяет правки синхронно — между узлами work loop может отдать кадр браузеру.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  phases: (
    <>
      Пока идёт <strong>render</strong>, на экране остаётся старый DOM; запись в DOM — только в{' '}
      <strong>commit</strong>.
    </>
  ),
  interrupt: (
    <>
      Длинный render списка (<code>transition</code>) прерывается срочным вводом — черновик отбрасывается,
      commit идёт только для актуального state.
    </>
  ),
  links: (
    <>
      Обход дерева <code>App → Header, Main → Item</code>: вниз по <code>child</code>, вправо по{' '}
      <code>sibling</code>, вверх по <code>return</code>.
    </>
  ),
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
}

function phaseCls(active: boolean, done: boolean, warn = false) {
  if (!active && !done) return [styles.phaseBlock, styles.phaseBlockIdle].join(' ')
  if (warn) return [styles.phaseBlock, styles.phaseBlockWarn].join(' ')
  if (active) return [styles.phaseBlock, styles.phaseBlockActive].join(' ')
  return [styles.phaseBlock, styles.phaseBlockDone].join(' ')
}

function PhasesViz({ phase }: { phase: Phase }) {
  const renderActive = phase === 'step1'
  const commitActive = phase === 'step2'
  const finished = phase === 'done'
  const domStale = phase !== 'done'

  return (
    <LabVizPanel
      title="Две фазы обновления"
      meta={phase === 'idle' ? 'до update' : phase === 'step1' ? 'render' : phase === 'step2' ? 'commit' : 'готово'}
    >
      <div className={styles.layout}>
        <div className={styles.col}>
          <p className={styles.colHead}>Work in progress</p>
          <p className={styles.colSub}>черновик fiber-дерева</p>
          <div className={styles.phaseStack}>
            <div className={phaseCls(renderActive, finished && !renderActive)}>
              <p className={styles.phaseTitle}>Render</p>
              <p className={styles.phaseBody}>
                reconcile, hooks, flags — DOM <strong>не</strong> меняется
              </p>
            </div>
            <div className={phaseCls(commitActive, finished)}>
              <p className={styles.phaseTitle}>Commit</p>
              <p className={styles.phaseBody}>mutation + layout effects — запись в DOM</p>
            </div>
          </div>
        </div>

        <div className={styles.mid}>
          <span className={styles.midArrow} aria-hidden>
            {phase === 'idle' ? '→' : '⇄'}
          </span>
          <p className={styles.midLabel}>DOM отстаёт до commit</p>
        </div>

        <div className={styles.col}>
          <p className={styles.colHead}>Real DOM</p>
          <p className={styles.colSub}>что видит пользователь</p>
          <div className={styles.domStrip}>
            <p className={styles.domLabel}>экран</p>
            <p className={[styles.domValue, domStale ? styles.domStale : styles.domFresh].join(' ')}>
              {domStale ? 'старый UI (v1)' : 'новый UI (v2)'}
            </p>
            {renderActive ? (
              <p className={styles.phaseBody}>render идёт — DOM ещё v1</p>
            ) : commitActive ? (
              <p className={styles.phaseBody}>commit пишет v2</p>
            ) : finished ? (
              <p className={styles.phaseBody}>current ← workInProgress</p>
            ) : (
              <p className={styles.phaseBody}>ожидает update</p>
            )}
          </div>
        </div>
      </div>

      <div
        className={[
          styles.verdict,
          finished ? styles.verdictActive : styles.verdictIdle,
          finished && styles.verdictOk,
        ].join(' ')}
      >
        {finished ? (
          <>
            <p className={styles.verdictTitle}>DOM обновился один раз</p>
            <p className={styles.verdictText}>
              Весь render мог занять много кадров, но пользователь увидел v2 только после синхронного commit.
            </p>
          </>
        ) : (
          <p className={styles.verdictText}>Render и commit — разные проходы; путать их — типичная ошибка.</p>
        )}
      </div>
    </LabVizPanel>
  )
}

function InterruptViz({ phase }: { phase: Phase }) {
  const started = phase !== 'idle'
  const interrupted = phase === 'step2' || phase === 'done'
  const finished = phase === 'done'

  return (
    <LabVizPanel
      title="Scheduler и прерывание"
      meta={
        phase === 'idle'
          ? 'очередь'
          : phase === 'step1'
            ? 'render списка'
            : phase === 'step2'
              ? 'срочный ввод'
              : 'commit срочного'
      }
    >
      <div className={styles.queue}>
        <div
          className={[
            styles.queueRow,
            phase === 'step1' && styles.queueRowActive,
            interrupted && styles.queueRowDiscarded,
          ].join(' ')}
        >
          <span className={styles.queueTag}>TransitionLane · низкий</span>
          <p className={styles.queueBody}>Render большого списка (fiber 1…N)</p>
        </div>

        <div
          className={[
            styles.queueRow,
            phase === 'step2' && styles.queueRowUrgent,
            finished && styles.queueRowDone,
          ].join(' ')}
        >
          <span className={styles.queueTag}>InputLane · срочный</span>
          <p className={styles.queueBody}>setQuery("react") — ввод в поле</p>
        </div>
      </div>

      <div
        className={[
          styles.verdict,
          started ? styles.verdictActive : styles.verdictIdle,
          finished && styles.verdictWarn,
        ].join(' ')}
        style={{ marginTop: '0.65rem' }}
      >
        {finished ? (
          <>
            <p className={styles.verdictTitle}>Черновик списка отброшен</p>
            <p className={styles.verdictText}>
              Work loop переключился на ввод; незавершённый transition-render не дошёл до commit. На экране —
              актуальный query, не «полуготовый» список.
            </p>
          </>
        ) : interrupted ? (
          <>
            <p className={styles.verdictTitle}>Yield → новый lane</p>
            <p className={styles.verdictText}>Scheduler прервал transition и поднял срочное обновление.</p>
          </>
        ) : phase === 'step1' ? (
          <p className={styles.verdictText}>Work loop обрабатывает fiber-узлы списка…</p>
        ) : (
          <p className={styles.verdictText}>Два обновления с разным приоритетом в одной очереди.</p>
        )}
      </div>
    </LabVizPanel>
  )
}

type FiberId = 'app' | 'header' | 'main' | 'item'

const TRAVERSAL: Array<{ id: FiberId; link: string }> = [
  { id: 'app', link: 'child → Header' },
  { id: 'header', link: 'sibling → Main' },
  { id: 'main', link: 'child → Item' },
  { id: 'item', link: 'return → Main → App' },
]

function LinksViz({ phase }: { phase: Phase }) {
  const activeIndex =
    phase === 'idle' ? -1 : phase === 'step1' ? 0 : phase === 'step2' ? 2 : TRAVERSAL.length - 1
  const finished = phase === 'done'

  const nodeCls = (id: FiberId) => {
    const idx = TRAVERSAL.findIndex((t) => t.id === id)
    const active = idx === activeIndex || (phase === 'step2' && id === 'item')
    const done = finished || (activeIndex >= 0 && idx < activeIndex)
    return [
      styles.fiberNode,
      active && styles.fiberNodeActive,
      done && !active && styles.fiberNodeDone,
    ]
      .filter(Boolean)
      .join(' ')
  }

  const currentLink = activeIndex >= 0 ? TRAVERSAL[activeIndex]!.link : '—'

  return (
    <LabVizPanel
      title="Обход fiber-дерева"
      meta={phase === 'idle' ? 'дерево' : phase === 'done' ? 'обход завершён' : `шаг · ${currentLink}`}
    >
      <div className={styles.fiberTree}>
        <div className={styles.fiberRow}>
          <div className={nodeCls('app')}>
            <span className={styles.fiberName}>App</span>
            <span className={styles.fiberType}>function</span>
          </div>
        </div>
        <div className={styles.fiberRow}>
          <div className={nodeCls('header')}>
            <span className={styles.fiberName}>Header</span>
            <span className={styles.fiberType}>host</span>
          </div>
          <div className={nodeCls('main')}>
            <span className={styles.fiberName}>Main</span>
            <span className={styles.fiberType}>host</span>
          </div>
        </div>
        <div className={styles.fiberRow}>
          <div className={nodeCls('item')}>
            <span className={styles.fiberName}>Item</span>
            <span className={styles.fiberType}>host</span>
          </div>
        </div>
      </div>

      <div className={styles.fiberLinks}>
        {TRAVERSAL.map((step, i) => (
          <p
            key={step.id}
            className={[styles.linkItem, i === activeIndex && styles.linkActive].filter(Boolean).join(' ')}
          >
            {step.link}
          </p>
        ))}
      </div>

      <div
        className={[
          styles.verdict,
          phase !== 'idle' ? styles.verdictActive : styles.verdictIdle,
          finished && styles.verdictOk,
        ].join(' ')}
      >
        {finished ? (
          <>
            <p className={styles.verdictTitle}>Итеративный work loop</p>
            <p className={styles.verdictText}>
              Между любым шагом reconciler может yield — стек JS не растёт с глубиной дерева.
            </p>
          </>
        ) : (
          <p className={styles.verdictText}>Следующий fiber выбирается по child → sibling → return.</p>
        )}
      </div>
    </LabVizPanel>
  )
}

export function ReactFiberLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('phases')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const finishCase = (id: CaseId) => {
    if (id === 'phases') {
      log('ok', 'commit · DOM v1 → v2')
      setHint('render не трогал DOM')
    } else if (id === 'interrupt') {
      log('warn', 'transition отброшен · commit input')
      setHint('срочный lane прервал render')
    } else {
      log('ok', 'обход child/sibling/return')
      setHint('work loop без глубокого стека')
    }
  }

  const runStepsForCase = (id: CaseId): Array<() => void> => {
    if (id === 'phases') {
      return [
        () => setPhase('step1'),
        () => setPhase('step2'),
        () => {
          setPhase('done')
          finishCase(id)
        },
      ]
    }
    if (id === 'interrupt') {
      return [
        () => setPhase('step1'),
        () => setPhase('step2'),
        () => {
          setPhase('done')
          finishCase(id)
        },
      ]
    }
    return [
      () => setPhase('step1'),
      () => setPhase('step2'),
      () => {
        setPhase('done')
        finishCase(id)
      },
    ]
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    playTimeline(
      tlRef,
      runStepsForCase(caseId),
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('phases')
    resetViz()
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
      </div>

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

      {caseId === 'phases' ? (
        <PhasesViz phase={phase} />
      ) : caseId === 'interrupt' ? (
        <InterruptViz phase={phase} />
      ) : (
        <LinksViz phase={phase} />
      )}

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Fiber"
      lead="Единица работы, две фазы и прерываемый work loop — как React успевает откликаться на ввод."
      problem={problem}
      code={code}
    />
  )
}
