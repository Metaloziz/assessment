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
  { id: 'phases', label: 'Черновик · экран' },
  { id: 'interrupt', label: 'Срочный ввод' },
  { id: 'links', label: 'Обход дерева' },
]

const CODE_INTRO: Record<CaseId, string> = {
  phases: 'Сначала черновик дерева в памяти; в DOM пишут только на commit.',
  interrupt: 'Фоновый render можно прервать: срочный ввод важнее незавершённого списка.',
  links: 'Следующий узел — по стрелкам вниз, вправо, вверх; без глубокого стека.',
}

const SNIPPET_FIBER: InteractiveSnippet = {
  id: 'fiber-node',
  label: 'src/fiber/types.ts',
  note: 'Узел работы: связи и пара current / черновик.',
  executable: false,
  languageLabel: 'ts',
  code: `export type Fiber = {
  type: string | (() => unknown) | null;
  key: string | null;
  pendingProps: Record<string, unknown>;
  stateNode: HTMLElement | null; // ← host на экране
  child: Fiber | null;           // ← первый ребёнок
  sibling: Fiber | null;         // ← сосед справа
  return: Fiber | null;          // ← родитель
  alternate: Fiber | null;       // ← экран ↔ черновик
  flags: number;
};`,
}

const SNIPPET_WORK_LOOP: InteractiveSnippet = {
  id: 'work-loop',
  label: 'src/fiber/workLoop.ts',
  note: 'Один узел за шаг; можно отдать кадр браузеру.',
  executable: false,
  languageLabel: 'ts',
  code: `import type { Fiber } from './types';

let workInProgress: Fiber | null = null;

export const performUnitOfWork = (fiber: Fiber): Fiber | null => {
  beginWork(fiber); // ← render узла
  if (fiber.child) return fiber.child;
  return completeUnitOfWork(fiber); // ← сосед или родитель
};

export const workLoopConcurrent = () => {
  while (workInProgress && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress)!;
  }
  // ← нет времени / срочное — сохранить черновик и выйти
};`,
}

const SNIPPET_COMMIT: InteractiveSnippet = {
  id: 'commit-root',
  label: 'src/fiber/commitRoot.ts',
  note: 'Commit короткий: запись в DOM, layout, затем effects.',
  executable: false,
  languageLabel: 'ts',
  code: `export const commitRoot = (root: Fiber) => {
  // ← render закончен, экран ещё старый
  commitBeforeMutationEffects(root);
  commitMutationEffects(root); // ← единственная запись в DOM
  root.current = root;         // ← черновик стал current
  commitLayoutEffects(root);   // ← useLayoutEffect
  schedulePassiveEffects(root); // ← useEffect после paint
};`,
}

const SNIPPET_PRIORITY: InteractiveSnippet = {
  id: 'scheduler-lanes',
  label: 'src/scheduler/lanes.ts',
  note: 'Ввод важнее фоновой смены вкладки.',
  executable: false,
  languageLabel: 'ts',
  code: `export const SyncLane = 1;
export const InputContinuousLane = 4;
export const TransitionLane = 64;

export const requestUpdateLane = (source: 'input' | 'transition') =>
  source === 'input' ? InputContinuousLane : TransitionLane;

// ← срочный lane прерывает незавершённый render`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  phases: [SNIPPET_FIBER, SNIPPET_COMMIT],
  interrupt: [SNIPPET_WORK_LOOP, SNIPPET_PRIORITY],
  links: [SNIPPET_FIBER, SNIPPET_WORK_LOOP],
}

const PAIN =
  'React не переписывает экран одним махом: сначала собирает черновик по узлам, потом коротко пишет в DOM. Между узлами можно отдать кадр браузеру.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  phases: (
    <>
      Пока идёт черновик, на экране старый UI; новая картинка — только после <code>commit</code>.
    </>
  ),
  interrupt: (
    <>
      Длинный список в фоне прерывается вводом — черновик списка выбрасывают, на экран идёт актуальный query.
    </>
  ),
  links: (
    <>
      Путь <code>App → Header, Main → Item</code>: вниз к ребёнку, вправо к соседу, вверх к родителю.
    </>
  ),
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  onDone: () => void,
) => {
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

const phaseCls = (active: boolean, done: boolean) => {
  if (!active && !done) return [styles.phaseBlock, styles.phaseBlockIdle].join(' ')
  if (active) return [styles.phaseBlock, styles.phaseBlockActive].join(' ')
  return [styles.phaseBlock, styles.phaseBlockDone].join(' ')
}

const PhasesViz = ({ phase }: { phase: Phase }) => {
  const renderActive = phase === 'step1'
  const commitActive = phase === 'step2'
  const finished = phase === 'done'
  const domStale = phase !== 'done'

  return (
    <LabVizPanel
      title="Черновик и экран"
      meta={
        phase === 'idle'
          ? 'до обновления'
          : phase === 'step1'
            ? 'черновик'
            : phase === 'step2'
              ? 'запись на экран'
              : 'готово'
      }
    >
      <div className={styles.layout}>
        <div className={styles.col}>
          <p className={styles.colHead}>Черновик</p>
          <p className={styles.colSub}>дерево в памяти</p>
          <div className={styles.phaseStack}>
            <div className={phaseCls(renderActive, finished && !renderActive)}>
              <p className={styles.phaseTitle}>Render</p>
              <p className={styles.phaseBody}>
                согласование и флаги — экран <strong>не</strong> трогаем
              </p>
            </div>
            <div className={phaseCls(commitActive, finished)}>
              <p className={styles.phaseTitle}>Commit</p>
              <p className={styles.phaseBody}>запись в DOM · layout · effects</p>
            </div>
          </div>
        </div>

        <div className={styles.mid}>
          <span className={styles.midArrow} aria-hidden>
            {phase === 'idle' ? '→' : '⇄'}
          </span>
          <p className={styles.midLabel}>экран отстаёт до commit</p>
        </div>

        <div className={styles.col}>
          <p className={styles.colHead}>Экран</p>
          <p className={styles.colSub}>что видит пользователь</p>
          <div className={styles.domStrip}>
            <p className={styles.domLabel}>сейчас</p>
            <p className={[styles.domValue, domStale ? styles.domStale : styles.domFresh].join(' ')}>
              {domStale ? 'старый UI (v1)' : 'новый UI (v2)'}
            </p>
            {renderActive ? (
              <p className={styles.phaseBody}>черновик идёт — экран ещё v1</p>
            ) : commitActive ? (
              <p className={styles.phaseBody}>commit пишет v2</p>
            ) : finished ? (
              <p className={styles.phaseBody}>черновик стал current</p>
            ) : (
              <p className={styles.phaseBody}>ждёт обновление</p>
            )}
          </div>
        </div>
      </div>

      <p className={[styles.tag, finished ? styles.tagOk : styles.tagMuted].join(' ')}>
        {finished ? 'экран обновился один раз · после commit' : 'render и commit — разные проходы'}
      </p>
    </LabVizPanel>
  )
}

const InterruptViz = ({ phase }: { phase: Phase }) => {
  const listActive = phase === 'step1'
  const urgentActive = phase === 'step2' || phase === 'done'
  const listDiscarded = phase === 'step2' || phase === 'done'
  const finished = phase === 'done'

  return (
    <LabVizPanel
      title="Кто важнее"
      meta={
        phase === 'idle'
          ? 'два обновления'
          : phase === 'step1'
            ? 'фоновый список'
            : phase === 'step2'
              ? 'ввод вытесняет'
              : 'commit ввода'
      }
    >
      <div className={styles.fork}>
        <div className={styles.forkTop}>
          <p className={styles.forkTopLabel}>планировщик</p>
        </div>

        <div className={styles.forkArms}>
          <div
            className={[
              styles.forkBranch,
              listActive && styles.forkBranchActive,
              listDiscarded && styles.forkBranchDiscarded,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <p className={styles.forkTag}>фон · можно ждать</p>
            <p className={styles.forkBody}>длинный список</p>
            <p className={styles.forkMeta}>{listDiscarded ? 'черновик выброшен' : 'render…'}</p>
          </div>

          <div
            className={[
              styles.forkBranch,
              urgentActive && styles.forkBranchUrgent,
              finished && styles.forkBranchDone,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <p className={styles.forkTag}>срочно · ввод</p>
            <p className={styles.forkBody}>setQuery("react")</p>
            <p className={styles.forkMeta}>{finished ? 'дошёл до commit' : urgentActive ? 'перехват' : 'в очереди'}</p>
          </div>
        </div>

        <div className={[styles.forkSink, finished && styles.forkSinkOk].filter(Boolean).join(' ')}>
          <p className={styles.forkSinkLabel}>на экран</p>
          <p className={styles.forkSinkBody}>
            {finished ? 'актуальный query · без полуготового списка' : 'commit только у победителя'}
          </p>
        </div>
      </div>

      <p className={[styles.tag, finished ? styles.tagWarn : styles.tagMuted].join(' ')}>
        {finished
          ? 'срочный lane вытеснил фоновый render'
          : 'две ветки · ввод важнее списка'}
      </p>
    </LabVizPanel>
  )
}

type FiberId = 'app' | 'header' | 'main' | 'item'

const TRAVERSAL: Array<{ id: FiberId; link: string }> = [
  { id: 'app', link: 'вниз → Header' },
  { id: 'header', link: 'вправо → Main' },
  { id: 'main', link: 'вниз → Item' },
  { id: 'item', link: 'вверх → Main → App' },
]

const LinksViz = ({ phase }: { phase: Phase }) => {
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
      title="Обход по стрелкам"
      meta={phase === 'idle' ? 'дерево' : phase === 'done' ? 'обход готов' : currentLink}
    >
      <div className={styles.fiberTree}>
        <div className={styles.fiberRow}>
          <div className={nodeCls('app')}>
            <span className={styles.fiberName}>App</span>
            <span className={styles.fiberType}>компонент</span>
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

      <p className={[styles.tag, finished ? styles.tagOk : styles.tagMuted].join(' ')}>
        {finished
          ? 'между шагами можно отдать кадр · стек JS не растёт'
          : 'следующий узел: ребёнок → сосед → родитель'}
      </p>
    </LabVizPanel>
  )
}

const STEPS_COUNT: Record<CaseId, number> = {
  phases: 3,
  interrupt: 3,
  links: 3,
}

export const ReactFiberLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('phases')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [stepIndex, setStepIndex] = useState(0)

  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setStepIndex(0)
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
      log('ok', 'экран: v1 → v2')
      setHint('черновик не трогал DOM')
    } else if (id === 'interrupt') {
      log('warn', 'список выброшен · commit ввода')
      setHint('срочный ввод вытеснил фон')
    } else {
      log('ok', 'обход: вниз · вправо · вверх')
      setHint('цикл без глубокого стека')
    }
  }

  const applyStep = (id: CaseId, index: number) => {
    if (index === 1) setPhase('step1')
    else if (index === 2) setPhase('step2')
    else if (index >= 3) {
      setPhase('done')
      finishCase(id)
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    const total = STEPS_COUNT[caseId]

    playTimeline(
      tlRef,
      Array.from({ length: total }, (_, i) => () => {
        const next = i + 1
        setStepIndex(next)
        applyStep(caseId, next)
      }),
      () => setBusy(false),
    )
  }

  const stepOnce = () => {
    if (busy) return
    tlRef.current?.kill()
    const total = STEPS_COUNT[caseId]
    if (stepIndex >= total) return
    if (stepIndex === 0) clear()
    const next = stepIndex + 1
    setStepIndex(next)
    applyStep(caseId, next)
    if (next >= total) setBusy(false)
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
        <LabButton
          variant="secondary"
          disabled={busy || stepIndex >= STEPS_COUNT[caseId]}
          onClick={stepOnce}
        >
          Шаг
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
    <div className={shell.codePane}>
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
      lead="Карточки узлов, черновик без DOM и короткий commit — как React успевает отвечать на ввод."
      problem={problem}
      code={code}
    />
  )
}
