import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import styles from './SoftwareMvcMvpMvvmLab.module.css'

const TOPIC_ID = '257-software-mvc-mvp-mvvm'
const STEP_MS = 0.6

type Pattern = 'mvc' | 'mvp' | 'mvvm'
type MvcCase = 'ctrl' | 'mvcLeak'
type MvpCase = 'passive' | 'knows'
type MvvmCase = 'bind' | 'direct'
type CaseId = MvcCase | MvpCase | MvvmCase
type Phase = 'idle' | 'view' | 'mid' | 'model' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'mvc', label: 'MVC' },
  { id: 'mvp', label: 'MVP' },
  { id: 'mvvm', label: 'MVVM' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  mvc: [
    { id: 'ctrl', label: 'Через Controller' },
    { id: 'mvcLeak', label: 'View → Model' },
  ],
  mvp: [
    { id: 'passive', label: 'Passive View' },
    { id: 'knows', label: 'View знает Model' },
  ],
  mvvm: [
    { id: 'bind', label: 'Binding' },
    { id: 'direct', label: 'View → Model' },
  ],
}

const CODE_INTRO: Record<Pattern, string> = {
  mvc: '`Controller.save` меняет Model; View подписан на `subscribe` и читает `getName`.',
  mvp: '`Presenter.onSave` меняет Model и зовёт `view.setName`; View модель не импортирует.',
  mvvm: 'View биндится к `name` и команде `save` у ViewModel; Model трогает только VM.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  mvc: [
    {
      id: 'profile-mvc',
      label: 'src/profile/mvc.ts',
      note: '`View` знает `Model` через `subscribe`; пишет только `Controller`.',
      executable: false,
      languageLabel: 'ts',
      code: `type Listener = () => void;

export function createProfileModel(initial = '') {
  let name = initial;
  const listeners = new Set<Listener>();
  return {
    getName: () => name,
    setName(next: string) {
      name = next;
      for (const fn of listeners) fn(); // ← notify View
    },
    subscribe(fn: Listener) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// ═══════════════════════════════════════════
// CONTROLLER ← жест Save, не render
// ═══════════════════════════════════════════
export function createProfileController(model: ReturnType<typeof createProfileModel>) {
  return {
    save(raw: string) {
      model.setName(raw.trim()); // ← пишет Controller
    },
  };
}

export function bindProfileView(
  input: HTMLInputElement,
  model: ReturnType<typeof createProfileModel>,
  controller: ReturnType<typeof createProfileController>,
) {
  model.subscribe(() => {
    input.value = model.getName(); // ← View читает Model
  });
  input.form?.addEventListener('submit', (e) => {
    e.preventDefault();
    controller.save(input.value);
  });
}`,
    },
  ],
  mvp: [
    {
      id: 'profile-mvp',
      label: 'src/profile/mvp.ts',
      note: '`View` пассивный: только `onSave` и `setName`. Model он не видит.',
      executable: false,
      languageLabel: 'ts',
      code: `type ProfileView = {
  setName: (value: string) => void;
  onSave: (handler: (raw: string) => void) => void;
};

export function createProfileModel(initial = '') {
  let name = initial;
  return {
    getName: () => name,
    setName(next: string) {
      name = next;
    },
  };
}

// ═══════════════════════════════════════════
// PRESENTER ← пишет Model и рисует View
// ═══════════════════════════════════════════
export function createProfilePresenter(
  view: ProfileView,
  model: ReturnType<typeof createProfileModel>,
) {
  view.onSave((raw) => {
    model.setName(raw.trim());
    view.setName(model.getName()); // ← Presenter → View
  });
}

// View не импортирует model — только setName / onSave`,
    },
  ],
  mvvm: [
    {
      id: 'profile-mvvm',
      label: 'src/profile/mvvm.ts',
      note: 'Bind к `name` и команде `save`; `Model` меняет только ViewModel.',
      executable: false,
      languageLabel: 'ts',
      code: `type NameProp = {
  get: () => string;
  subscribe: (fn: (value: string) => void) => () => void;
};

export function createProfileModel(initial = '') {
  let name = initial;
  return {
    getName: () => name,
    setName(next: string) {
      name = next;
    },
  };
}

function observable(initial: string): NameProp & { set: (v: string) => void } {
  let value = initial;
  const listeners = new Set<(v: string) => void>();
  return {
    get: () => value,
    set(next) {
      value = next;
      for (const fn of listeners) fn(value);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// ═══════════════════════════════════════════
// VIEWMODEL ← свойства и команда, не виджет
// ═══════════════════════════════════════════
export function createProfileViewModel(model: ReturnType<typeof createProfileModel>) {
  const name = observable(model.getName());
  return {
    name, // ← bind
    save(raw: string) {
      model.setName(raw.trim());
      name.set(model.getName()); // ← VM, не View
    },
  };
}

export function bindName(input: HTMLInputElement, prop: NameProp) {
  input.value = prop.get();
  prop.subscribe((value) => {
    input.value = value;
  });
}

// form.onsubmit → vm.save(input.value)`,
    },
  ],
}

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
    tl.call(step, undefined, i * STEP_MS)
  })
  motion?.(tl)
}

function isLeak(caseId: CaseId) {
  return caseId === 'mvcLeak' || caseId === 'knows' || caseId === 'direct'
}

function midLabel(pattern: Pattern) {
  if (pattern === 'mvc') return 'Controller'
  if (pattern === 'mvp') return 'Presenter'
  return 'ViewModel'
}

function nodeState(on: boolean, done: boolean, leak: boolean): LabNodeState {
  if (done && leak) return 'idle'
  if (done) return 'ok'
  if (on) return 'active'
  return 'idle'
}

type VizProps = {
  pattern: Pattern
  caseId: CaseId
  phase: Phase
  midRef: MutableRefObject<HTMLDivElement | null>
}

function ArchViz({ pattern, caseId, phase, midRef }: VizProps) {
  const leak = isLeak(caseId)
  const done = phase === 'done'
  const viewOn = phase === 'view' || phase === 'mid' || phase === 'model' || done
  const midOn = !leak && (phase === 'mid' || phase === 'model' || done)
  const modelOn = phase === 'model' || done
  const name = done || modelOn ? 'Анна' : ''

  const clickHot = phase === 'view' || (leak && phase === 'model')
  const midHot = !leak && phase === 'mid'
  const backHot = !leak && (phase === 'model' || done)

  const viewSub = done
    ? leak
      ? 'сам пишет Model'
      : pattern === 'mvp'
        ? 'setName("Анна")'
        : pattern === 'mvvm'
          ? 'bind name'
          : 'render ← subscribe'
    : phase === 'view'
      ? 'click Save'
      : 'input'

  const midSub = leak
    ? 'обойден'
    : done
      ? pattern === 'mvc'
        ? 'save()'
        : pattern === 'mvp'
          ? 'onSave + setName'
          : 'command save'
      : midOn
        ? 'save()'
        : 'ждёт'

  const modelSub = name ? `name="${name}"` : 'name=""'

  const downLabel = leak ? 'setName' : pattern === 'mvp' ? 'onSave' : pattern === 'mvvm' ? 'command' : 'event'
  const acrossLabel = leak ? '—' : 'set'
  const backLabel = leak
    ? `минуя ${midLabel(pattern)}`
    : pattern === 'mvc'
      ? 'notify'
      : pattern === 'mvp'
        ? 'setName'
        : 'bind'

  return (
    <LabVizPanel
      title="Поле имени"
      meta={leak ? 'View пишет Model' : `${midLabel(pattern)} в центре`}
    >
      <div className={styles.graph}>
        <LabNode
          label="View"
          sub={viewSub}
          state={nodeState(viewOn && !done, done, leak)}
          className={done && leak ? styles.nodeWarn : undefined}
        />
        <span className={`${styles.edge}${clickHot ? ` ${styles.edgeHot}` : ''}`}>↓ {downLabel}</span>
        <div className={styles.bottom}>
          <LabNode
            ref={midRef}
            label={leak ? '—' : midLabel(pattern)}
            sub={midSub}
            state={leak ? 'idle' : nodeState(midOn && !done, done, false)}
            className={`${styles.midNode}${leak ? ` ${styles.nodeSkipped}` : ''}`}
          />
          <span className={`${styles.edge}${midHot ? ` ${styles.edgeHot}` : ''}`}>
            {acrossLabel === '—' ? '·' : `→ ${acrossLabel}`}
          </span>
          <LabNode
            label="Model"
            sub={modelSub}
            state={nodeState(modelOn && !done, done, leak)}
            className={done && leak ? styles.nodeWarn : undefined}
          />
        </div>
        <span className={`${styles.edge}${backHot ? ` ${styles.edgeHot}` : ''}`}>
          {leak ? backLabel : `↑ ${backLabel}`}
        </span>
      </div>
    </LabVizPanel>
  )
}

const PAIN: Record<Pattern, ReactNode> = {
  mvc: (
    <>
      После клика <code>Controller</code> меняет <code>Model</code>; <code>View</code> подписан на модель и
      перерисовывается.
    </>
  ),
  mvp: (
    <>
      <code>View</code> пассивный: <code>Presenter</code> меняет <code>Model</code> и зовёт{' '}
      <code>view.setName()</code>.
    </>
  ),
  mvvm: (
    <>
      <code>View</code> биндится к свойствам <code>ViewModel</code>; <code>Model</code> трогает только VM.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ctrl: (
    <>
      Клик идёт в <code>Controller.save</code>; вид читает имя из <code>Model</code> по{' '}
      <code>subscribe</code>.
    </>
  ),
  mvcLeak: (
    <>
      <code>View</code> сам зовёт <code>model.setName</code> — <code>Controller</code> обойден.
    </>
  ),
  passive: (
    <>
      <code>onSave</code> принимает презентер; вид получает <code>setName</code> и не импортирует модель.
    </>
  ),
  knows: (
    <>
      Вид читает и пишет <code>Model</code> сам — <code>Presenter</code> не у дел.
    </>
  ),
  bind: (
    <>
      Поле подписано на <code>vm.name</code>; submit зовёт команду <code>vm.save</code>, не модель.
    </>
  ),
  direct: (
    <>
      Виджет зовёт <code>model.setName</code> напрямую — binding и команда VM не участвуют.
    </>
  ),
}

type Frame = {
  phase: Phase
  log?: { kind: 'info' | 'ok' | 'warn'; text: string }
  hint?: string
}

function framesFor(caseId: CaseId): Frame[] {
  if (caseId === 'ctrl') {
    return [
      { phase: 'view', log: { kind: 'info', text: 'View: click Save' } },
      { phase: 'mid', log: { kind: 'info', text: 'Controller.save("Анна")' } },
      { phase: 'model', log: { kind: 'info', text: 'Model.setName' } },
      {
        phase: 'done',
        log: { kind: 'ok', text: 'View.render ← subscribe' },
        hint: 'View знает Model, пишет только Controller',
      },
    ]
  }
  if (caseId === 'mvcLeak') {
    return [
      { phase: 'view', log: { kind: 'info', text: 'View: click Save' } },
      { phase: 'model', log: { kind: 'warn', text: 'View → Model.setName, Controller нет' } },
      {
        phase: 'done',
        log: { kind: 'warn', text: 'толстый View' },
        hint: 'Controller обойден',
      },
    ]
  }
  if (caseId === 'passive') {
    return [
      { phase: 'view', log: { kind: 'info', text: 'View: onSave' } },
      { phase: 'mid', log: { kind: 'info', text: 'Presenter → Model.setName' } },
      { phase: 'model', log: { kind: 'info', text: 'Presenter.view.setName("Анна")' } },
      {
        phase: 'done',
        log: { kind: 'ok', text: 'View не импортирует Model' },
        hint: 'Presenter рисует View',
      },
    ]
  }
  if (caseId === 'knows') {
    return [
      { phase: 'view', log: { kind: 'info', text: 'View: click Save' } },
      { phase: 'model', log: { kind: 'warn', text: 'View читает и пишет Model' } },
      {
        phase: 'done',
        log: { kind: 'warn', text: 'Presenter не у дел' },
        hint: 'View знает Model',
      },
    ]
  }
  if (caseId === 'bind') {
    return [
      { phase: 'view', log: { kind: 'info', text: 'View: submit → command' } },
      { phase: 'mid', log: { kind: 'info', text: 'ViewModel.save("Анна")' } },
      { phase: 'model', log: { kind: 'info', text: 'VM → Model.setName; name.notify' } },
      {
        phase: 'done',
        log: { kind: 'ok', text: 'input ← bind vm.name' },
        hint: 'команда и свойство на VM',
      },
    ]
  }
  return [
    { phase: 'view', log: { kind: 'info', text: 'View: click Save' } },
    { phase: 'model', log: { kind: 'warn', text: 'View → Model.setName, VM нет' } },
    {
      phase: 'done',
      log: { kind: 'warn', text: 'binding не участвует' },
      hint: 'View лезет в Model',
    },
  ]
}

export function SoftwareMvcMvpMvvmLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('mvc')
  const [caseId, setCaseId] = useState<CaseId>('ctrl')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [frame, setFrame] = useState(-1)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const midRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setFrame(-1)
    if (midRef.current) gsap.set(midRef.current, { clearProps: 'transform,opacity' })
  }

  const applyFrame = (item: Frame) => {
    setPhase(item.phase)
    if (item.log) log(item.log.kind, item.log.text)
    if (item.hint) setHint(item.hint)
  }

  const selectPattern = (next: Pattern) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
    setCaseId(CASES[next][0]!.id)
    clear()
    resetViz()
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
    const frames = framesFor(caseId)
    const leak = isLeak(caseId)
    playTimeline(
      tlRef,
      frames.map((item, i) => () => {
        setFrame(i)
        applyFrame(item)
      }),
      (tl) => {
        if (!midRef.current || leak) return
        gsap.set(midRef.current, { scale: 0.92, opacity: 0.5 })
        tl.to(midRef.current, { scale: 1, opacity: 1 }, STEP_MS)
      },
      () => setBusy(false),
    )
  }

  const stepOnce = () => {
    tlRef.current?.kill()
    setBusy(false)
    const frames = framesFor(caseId)
    const next = frame + 1
    if (next >= frames.length) return
    if (next === 0) {
      clear()
      setHint(null)
      if (midRef.current) gsap.set(midRef.current, { clearProps: 'transform,opacity' })
    }
    setFrame(next)
    applyFrame(frames[next]!)
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('mvc')
    setCaseId('ctrl')
    resetViz()
  }

  const frames = framesFor(caseId)
  const steppedOut = frame >= frames.length - 1 && frame >= 0

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES[pattern].map((c) => (
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
        <LabButton variant="secondary" disabled={busy || steppedOut} onClick={stepOnce}>
          Шаг
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ArchViz pattern={pattern} caseId={caseId} phase={phase} midRef={midRef} />

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
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="MVC · MVP · MVVM"
      lead="Переключатель: кто принимает клик и кто обновляет View."
      problem={problem}
      code={code}
    />
  )
}
