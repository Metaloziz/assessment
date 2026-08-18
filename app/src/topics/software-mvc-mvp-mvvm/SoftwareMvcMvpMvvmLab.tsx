import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import { LabBadge } from '../../components/lab/LabBadge'
import { LabField, LabInput } from '../../components/lab/LabField'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './SoftwareMvcMvpMvvmLab.module.css'

const TOPIC_ID = '257-software-mvc-mvp-mvvm'
const STEP_MS = 0.6
const DEFAULT_NAME = 'Анна '

type Pattern = 'mvc' | 'mvvm'
type MvcCase = 'ctrl' | 'mvcLeak'
type MvvmCase = 'bind' | 'direct'
type CaseId = MvcCase | MvvmCase
type Phase = 'idle' | 'view' | 'mid' | 'model' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'mvc', label: 'MVC' },
  { id: 'mvvm', label: 'MVVM' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  mvc: [
    { id: 'ctrl', label: 'Через контроллер' },
    { id: 'mvcLeak', label: 'Экран сам пишет' },
  ],
  mvvm: [
    { id: 'bind', label: 'Через ViewModel' },
    { id: 'direct', label: 'Экран сам пишет' },
  ],
}

const CODE_INTRO: Record<Pattern, string> = {
  mvc: 'Контроллер пишет имя в `Model`. Экран подписан через `subscribe` и сам подставляет значение в поле.',
  mvvm: 'Экран приклеен к `vm.name` и команде `vm.save`. `Model` трогает только ViewModel.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  mvc: [
    {
      id: 'profile-model',
      label: 'src/profile/model.ts',
      note: '`subscribe` — экран узнаёт, что имя изменилось. Писать сюда должен контроллер.',
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
      for (const fn of listeners) fn(); // ← сказать экрану
    },
    subscribe(fn: Listener) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}`,
    },
    {
      id: 'profile-controller',
      label: 'src/profile/controller.ts',
      note: '`save` пишет в модель. Экран только читает `getName` по подписке.',
      executable: false,
      languageLabel: 'ts',
      code: `import { createProfileModel } from './model';

type Model = ReturnType<typeof createProfileModel>;

// ═══════════════════════════════════════════
// CONTROLLER ← клик Save, не рисует экран
// ═══════════════════════════════════════════
export function createProfileController(model: Model) {
  return {
    save(raw: string) {
      model.setName(raw.trim()); // ← пишет Controller
    },
  };
}

export function bindProfileView(
  input: HTMLInputElement,
  model: Model,
  controller: ReturnType<typeof createProfileController>,
) {
  model.subscribe(() => {
    input.value = model.getName(); // ← экран читает Model
  });
  input.form?.addEventListener('submit', (e) => {
    e.preventDefault();
    controller.save(input.value);
  });
}`,
    },
  ],
  mvvm: [
    {
      id: 'profile-model-mvvm',
      label: 'src/profile/model.ts',
      note: 'Модель ничего не знает про экран. Её трогает только ViewModel.',
      executable: false,
      languageLabel: 'ts',
      code: `export function createProfileModel(initial = '') {
  let name = initial;
  return {
    getName: () => name,
    setName(next: string) {
      name = next; // ← без notify: экран сюда не подписан
    },
  };
}`,
    },
    {
      id: 'profile-viewmodel',
      label: 'src/profile/viewModel.ts',
      note: 'Поле биндится к `name`. Кнопка зовёт команду `save`, не модель.',
      executable: false,
      languageLabel: 'ts',
      code: `import { createProfileModel } from './model';

function observable(initial: string) {
  let value = initial;
  const fns = new Set<(v: string) => void>();
  return {
    get: () => value,
    set(next: string) {
      value = next;
      for (const fn of fns) fn(value); // ← сказать полю
    },
    subscribe(fn: (v: string) => void) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
  };
}

// ═══════════════════════════════════════════
// VIEWMODEL ← свойство name и команда save
// ═══════════════════════════════════════════
export function createProfileViewModel(model: ReturnType<typeof createProfileModel>) {
  const name = observable(model.getName());
  return {
    name, // ← bind
    save(raw: string) {
      model.setName(raw.trim());
      name.set(model.getName()); // ← VM, не экран
    },
  };
}

// bind(input, vm.name); form.onsubmit = () => vm.save(input.value)`,
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
  return caseId === 'mvcLeak' || caseId === 'direct'
}

function quote(value: string) {
  return value ? `«${value}»` : 'пусто'
}

function layerClass(args: { hot: boolean; ok: boolean; err: boolean; dim?: boolean }) {
  return [
    labVizStyles.node,
    styles.layer,
    args.hot ? labVizStyles.nodeActive : '',
    args.ok ? labVizStyles.nodeOk : '',
    args.err ? labVizStyles.nodeErr : '',
    args.dim ? styles.dim : '',
  ]
    .filter(Boolean)
    .join(' ')
}

type VizProps = {
  pattern: Pattern
  caseId: CaseId
  phase: Phase
  draft: string
  stored: string
  shown: string
  vmName: string
  busy: boolean
  midRef: MutableRefObject<HTMLDivElement | null>
  dataRef: MutableRefObject<HTMLDivElement | null>
  onDraft: (value: string) => void
  onSave: () => void
}

function ProfileStand({
  pattern,
  caseId,
  phase,
  draft,
  stored,
  shown,
  vmName,
  busy,
  midRef,
  dataRef,
  onDraft,
  onSave,
}: VizProps) {
  const leak = isLeak(caseId)
  const done = phase === 'done'
  const viewHot = phase === 'view'
  const midHot = !leak && phase === 'mid'
  const modelHot = phase === 'model'
  const backHot = !leak && (phase === 'model' || done)
  const trimmed = draft.trim()

  const appClass = [
    styles.app,
    viewHot ? styles.appHot : '',
    done && !leak && shown ? styles.appOk : '',
    done && leak ? styles.appWarn : '',
  ]
    .filter(Boolean)
    .join(' ')

  const midLabel = pattern === 'mvc' ? 'Контроллер' : 'ViewModel'
  const midRole = pattern === 'mvc' ? 'принял клик' : 'свойства и команда'

  let midBody = 'ждёт клик'
  if (leak) midBody = 'не звали'
  else if (phase === 'mid') midBody = `save(${quote(draft)})`
  else if (phase === 'model' || done) {
    midBody =
      pattern === 'mvc'
        ? `записал ${quote(trimmed)}`
        : `name: ${quote(vmName || trimmed)}\nкоманда save`
  }

  const dataBody = stored ? `{ name: "${stored}" }` : '{ name: "" }'
  const dataWho = !stored
    ? 'ещё пусто'
    : leak
      ? 'записал экран'
      : pattern === 'mvc'
        ? 'записал контроллер'
        : 'записал ViewModel'

  const hello = shown ? `Привет, ${shown}` : 'Ещё не сохраняли — приветствие пустое'
  const meta = leak
    ? 'экран сам пишет в данные'
    : pattern === 'mvc'
      ? phase === 'done'
        ? 'данные уже есть — экран подписался и обновился'
        : 'контроллер пишет, экран подписан'
      : phase === 'done'
        ? 'поле подтянуло имя из ViewModel'
        : 'экран приклеен к ViewModel'

  const downLabel = leak ? '↓ сам пишет в данные' : pattern === 'mvvm' ? '↔ bind · команда save' : '↓ клик «Сохранить»'
  const acrossLabel = leak ? 'минуя слой' : '→ записал'
  const backLabel =
    leak && done
      ? 'приветствие обновил сам экран'
      : pattern === 'mvc'
        ? '↑ подписка: экран сам взял имя из данных'
        : 'поле и приветствие ← bind'

  return (
    <LabVizPanel title="Мини-приложение: профиль" meta={meta}>
      <div className={styles.stand}>
        <div className={appClass}>
          <div className={styles.head}>
            <span className={styles.brand}>
              <span className={styles.brandMark} aria-hidden />
              Профиль
            </span>
            <LabBadge tone={done && leak ? 'warn' : done ? 'ok' : viewHot ? 'info' : 'default'}>экран</LabBadge>
          </div>
          <div className={styles.formRow}>
            <LabField label="Имя" className={styles.formField}>
              <LabInput
                value={draft}
                disabled={busy}
                placeholder="Как к вам обращаться"
                onChange={(e) => onDraft(e.target.value)}
              />
            </LabField>
            <LabButton variant="primary" size="sm" disabled={busy} onClick={onSave}>
              Сохранить
            </LabButton>
          </div>
          <p
            className={`${styles.hello}${shown ? '' : ` ${styles.helloEmpty}`}${done && shown && !leak ? ` ${styles.helloHot}` : ''}`}
          >
            {hello}
          </p>
        </div>

        <span className={`${styles.edge}${viewHot || (leak && modelHot) ? ` ${styles.edgeHot}` : ''}`}>{downLabel}</span>

        <div className={styles.layers}>
          <div
            ref={midRef}
            className={layerClass({
              hot: midHot,
              ok: done && !leak,
              err: false,
              dim: leak,
            })}
          >
            <div className={styles.layerHead}>
              <span className={styles.layerTitle}>{midLabel}</span>
              <LabBadge tone={leak ? 'warn' : done && !leak ? 'ok' : 'default'}>{leak ? 'обойден' : midRole}</LabBadge>
            </div>
            <p className={styles.layerBody}>{midBody}</p>
          </div>
          <span className={`${styles.edge}${midHot || (leak && modelHot) ? ` ${styles.edgeHot}` : ''}`}>{acrossLabel}</span>
          <div
            ref={dataRef}
            className={layerClass({
              hot: modelHot,
              ok: done && !leak && Boolean(stored),
              err: done && leak,
            })}
          >
            <div className={styles.layerHead}>
              <span className={styles.layerTitle}>Данные</span>
              <LabBadge tone={done && leak ? 'warn' : stored ? 'ok' : 'default'}>{dataWho}</LabBadge>
            </div>
            <p className={styles.layerBody}>{dataBody}</p>
          </div>
        </div>

        <span className={`${styles.edge}${backHot || (leak && done) ? ` ${styles.edgeHot}` : ''}`}>{backLabel}</span>
      </div>
    </LabVizPanel>
  )
}

const PAIN: Record<Pattern, ReactNode> = {
  mvc: (
    <>
      В мини-приложении кнопка «Сохранить» не пишет имя сама: это делает <code>Controller</code>. Приветствие
      обновляется, потому что экран подписан на <code>Model</code>.
    </>
  ),
  mvvm: (
    <>
      Поле и кнопка приклеены к <code>ViewModel</code>: команда <code>save</code> пишет данные, свойство{' '}
      <code>name</code> возвращает имя на экран.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ctrl: (
    <>
      Клик идёт в <code>Controller.save</code>; приветствие загорается только после подписки на модель.
    </>
  ),
  mvcLeak: (
    <>
      Экран сам кладёт имя в данные и сразу рисует приветствие — контроллер так и не вызвали.
    </>
  ),
  bind: (
    <>
      Кнопка зовёт <code>vm.save</code>; поле и приветствие читают <code>vm.name</code>, не модель.
    </>
  ),
  direct: (
    <>
      Виджет пишет в <code>Model</code> напрямую — <code>ViewModel</code> остаётся пустым.
    </>
  ),
}

type Frame = {
  phase: Phase
  log?: { kind: 'info' | 'ok' | 'warn'; text: string }
  hint?: ReactNode
  writeStore?: boolean
  writeVm?: boolean
  writeScreen?: boolean
}

function framesFor(caseId: CaseId, raw: string): Frame[] {
  const name = raw.trim()
  const label = quote(name)
  if (caseId === 'ctrl') {
    return [
      { phase: 'view', log: { kind: 'info', text: `Экран: нажали «Сохранить» ${label}` } },
      { phase: 'mid', log: { kind: 'info', text: `Контроллер принял ${label}` } },
      { phase: 'model', log: { kind: 'info', text: `Данные: name = ${label}` }, writeStore: true },
      {
        phase: 'done',
        log: { kind: 'ok', text: 'Приветствие обновилось по подписке' },
        writeScreen: true,
        hint: (
          <>
            Имя уже лежало в данных; экран сам его прочитал через <code>subscribe</code>.
          </>
        ),
      },
    ]
  }
  if (caseId === 'mvcLeak') {
    return [
      { phase: 'view', log: { kind: 'info', text: `Экран: нажали «Сохранить» ${label}` } },
      {
        phase: 'model',
        log: { kind: 'warn', text: 'Экран сам записал имя в данные' },
        writeStore: true,
        writeScreen: true,
      },
      {
        phase: 'done',
        log: { kind: 'warn', text: 'Контроллер не звали' },
        hint: (
          <>
            Приветствие появилось, но слой посередине обошли — это уже толстый <code>View</code>.
          </>
        ),
      },
    ]
  }
  if (caseId === 'bind') {
    return [
      { phase: 'view', log: { kind: 'info', text: 'Экран: кнопка зовёт команду save' } },
      { phase: 'mid', log: { kind: 'info', text: `ViewModel.save(${label})` } },
      {
        phase: 'model',
        log: { kind: 'info', text: `VM записала данные и свойство name = ${label}` },
        writeStore: true,
        writeVm: true,
      },
      {
        phase: 'done',
        log: { kind: 'ok', text: 'Поле и приветствие подтянули имя по bind' },
        writeScreen: true,
        hint: (
          <>
            Экран не знает <code>Model</code> — только свойство и команду на <code>ViewModel</code>.
          </>
        ),
      },
    ]
  }
  return [
    { phase: 'view', log: { kind: 'info', text: `Экран: нажали «Сохранить» ${label}` } },
    {
      phase: 'model',
      log: { kind: 'warn', text: 'Экран сам записал имя в данные' },
      writeStore: true,
      writeScreen: true,
    },
    {
      phase: 'done',
      log: { kind: 'warn', text: 'ViewModel не участвует' },
      hint: (
        <>
          Binding не сработал: виджет лезет в <code>Model</code>.
        </>
      ),
    },
  ]
}

export function SoftwareMvcMvpMvvmLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('mvc')
  const [caseId, setCaseId] = useState<CaseId>('ctrl')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<ReactNode | null>(null)
  const [busy, setBusy] = useState(false)
  const [frame, setFrame] = useState(-1)
  const [draft, setDraft] = useState(DEFAULT_NAME)
  const [stored, setStored] = useState('')
  const [shown, setShown] = useState('')
  const [vmName, setVmName] = useState('')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const midRef = useRef<HTMLDivElement | null>(null)
  const dataRef = useRef<HTMLDivElement | null>(null)
  const rawRef = useRef(DEFAULT_NAME)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setFrame(-1)
    setStored('')
    setShown('')
    setVmName('')
    if (midRef.current) gsap.set(midRef.current, { clearProps: 'transform,opacity' })
    if (dataRef.current) gsap.set(dataRef.current, { clearProps: 'transform,opacity' })
  }

  const applyFrame = (item: Frame, raw: string) => {
    const name = raw.trim()
    setPhase(item.phase)
    if (item.log) log(item.log.kind, item.log.text)
    if (item.hint) setHint(item.hint)
    if (item.writeStore) setStored(name)
    if (item.writeVm) setVmName(name)
    if (item.writeScreen) {
      setShown(name)
      setDraft(name)
    }
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
    const raw = draft
    rawRef.current = raw
    setBusy(true)
    const frames = framesFor(caseId, raw)
    const leak = isLeak(caseId)
    playTimeline(
      tlRef,
      frames.map((item, i) => () => {
        setFrame(i)
        applyFrame(item, raw)
      }),
      (tl) => {
        const target = leak ? dataRef.current : midRef.current
        if (!target) return
        gsap.set(target, { scale: 0.96, opacity: 0.65 })
        tl.to(target, { scale: 1, opacity: 1 }, leak ? STEP_MS : STEP_MS)
      },
      () => setBusy(false),
    )
  }

  const stepOnce = () => {
    tlRef.current?.kill()
    setBusy(false)
    const next = frame + 1
    const raw = next === 0 ? draft : rawRef.current
    if (next === 0) {
      rawRef.current = draft
      clear()
      setHint(null)
      setStored('')
      setShown('')
      setVmName('')
      if (midRef.current) gsap.set(midRef.current, { clearProps: 'transform,opacity' })
      if (dataRef.current) gsap.set(dataRef.current, { clearProps: 'transform,opacity' })
    }
    const frames = framesFor(caseId, raw)
    if (next >= frames.length) return
    setFrame(next)
    applyFrame(frames[next]!, raw)
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('mvc')
    setCaseId('ctrl')
    setDraft(DEFAULT_NAME)
    resetViz()
  }

  const frames = framesFor(caseId, rawRef.current)
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

      <ProfileStand
        pattern={pattern}
        caseId={caseId}
        phase={phase}
        draft={draft}
        stored={stored}
        shown={shown}
        vmName={vmName}
        busy={busy}
        midRef={midRef}
        dataRef={dataRef}
        onDraft={setDraft}
        onSave={run}
      />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
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
      title="MVC · MVVM"
      lead="Мини-приложение «Профиль»: кто принимает «Сохранить» и откуда берётся приветствие."
      problem={problem}
      code={code}
    />
  )
}
