import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './PatternsMediatorCompositeMementoLab.module.css'

const TOPIC_ID = '161-patterns-mediator-composite-memento'
const STEP = 0.7

type Pattern = 'mediator' | 'composite' | 'memento'
type MedCase = 'mesh' | 'hub'
type CompCase = 'leaf' | 'tree'
type MemCase = 'lost' | 'undo'
type CaseId = MedCase | CompCase | MemCase

type MedPhase = 'idle' | 'emit' | 'route' | 'done'
type CompPhase = 'idle' | 'root' | 'kids' | 'done'
type MemPhase = 'idle' | 'snap' | 'edit' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'mediator', label: 'Mediator' },
  { id: 'composite', label: 'Composite' },
  { id: 'memento', label: 'Memento' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  mediator: [
    { id: 'mesh', label: 'Все со всеми' },
    { id: 'hub', label: 'Через хаб' },
  ],
  composite: [
    { id: 'leaf', label: 'Только leaf' },
    { id: 'tree', label: 'Folder.size()' },
  ],
  memento: [
    { id: 'lost', label: 'Без снимка' },
    { id: 'undo', label: 'Undo' },
  ],
}

const CODE_INTRO: Record<Pattern, string> = {
  mediator: 'Mediator: поля формы шлют `change` в хаб; Submit читает `submitEnabled`, не зная Input.',
  composite: 'Composite: `file` и `folder` с одним `size()`; папка суммирует детей.',
  memento: 'Memento: `save()` / `restore()` у редактора; History только держит стек.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  mediator: [
    {
      id: 'form-mediator',
      label: 'src/form/createFormMediator.ts',
      note: 'Mediator: коллеги не импортируют друг друга — только хаб.',
      executable: false,
      languageLabel: 'ts',
      code: `type FormSnapshot = { values: Record<string, string>; submitEnabled: boolean };
type Listener = (snap: FormSnapshot) => void;

// ═══════════════════════════════════════════
// MEDIATOR ← маршрутизация связей формы
// ═══════════════════════════════════════════
export function createFormMediator() {
  let values: Record<string, string> = {};
  const listeners = new Set<Listener>();

  function publish() {
    const submitEnabled = Boolean(values.email && values.password);
    const snap = { values, submitEnabled };
    for (const fn of listeners) fn(snap); // ← хаб решает, кого уведомить
  }

  return {
    subscribe(fn: Listener) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    change(name: string, value: string) {
      values = { ...values, [name]: value };
      publish();
    },
  };
}

// EmailField → mediator.change('email', v)
// SubmitButton ← subscribe → disabled = !submitEnabled`,
    },
  ],
  composite: [
    {
      id: 'fs-composite',
      label: 'src/fs/nodes.ts',
      note: 'Composite: лист и группа с одним `size()`; клиент не пишет switch по типу.',
      executable: false,
      languageLabel: 'ts',
      code: `export type FsNode = { name: string; size: () => number };

// ═══════════════════════════════════════════
// COMPOSITE ← общий контракт leaf / folder
// ═══════════════════════════════════════════
export function file(name: string, bytes: number): FsNode {
  return {
    name,
    size: () => bytes, // ← leaf
  };
}

export function folder(name: string, children: FsNode[] = []): FsNode {
  return {
    name,
    size: () => children.reduce((sum, c) => sum + c.size(), 0), // ← recurse
  };
}

export const src = folder('src', [
  file('a.ts', 100),
  folder('ui', [file('Button.tsx', 40)]),
]);

// src.size() === 140`,
    },
  ],
  memento: [
    {
      id: 'editor-memento',
      label: 'src/editor/history.ts',
      note: 'Memento: caretaker не читает поля снимка — только push / undo.',
      executable: false,
      languageLabel: 'ts',
      code: `type Memento = { content: string };

// ═══════════════════════════════════════════
// MEMENTO ← originator сам save/restore
// ═══════════════════════════════════════════
export function createEditor(text = '') {
  let content = text;
  return {
    type(chunk: string) {
      content += chunk;
    },
    getText: () => content,
    save: (): Memento => ({ content }), // ← снимок
    restore(m: Memento) {
      content = m.content;
    },
  };
}

export function createHistory(limit = 20) {
  const stack: Memento[] = [];
  return {
    push(m: Memento) {
      stack.push(m);
      if (stack.length > limit) stack.shift();
    },
    undo(editor: ReturnType<typeof createEditor>) {
      const m = stack.pop();
      if (m) editor.restore(m); // ← caretaker не читает m.content
    },
  };
}

// history.push(editor.save());
// editor.type('!');
// history.undo(editor);`,
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

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, ...mods.filter(Boolean)].join(' ')
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

type MedVizProps = {
  phase: MedPhase
  caseId: MedCase
  hubRef: MutableRefObject<HTMLDivElement | null>
}

function MediatorViz({ phase, caseId, hubRef }: MedVizProps) {
  const hub = caseId === 'hub'
  const emit = phase !== 'idle'
  const routed = phase === 'route' || phase === 'done'
  const done = phase === 'done'
  const meshWarn = !hub && done

  return (
    <LabVizPanel title="Форма логина" meta={hub ? 'звезда через хаб' : 'полный граф связей'}>
      <div className={styles.hubLayout}>
        <div className={styles.colleagues}>
          <div
            className={nodeCls(
              emit && labVizStyles.nodeActive,
              done && (hub ? labVizStyles.nodeOk : styles.nodeWarn),
            )}
          >
            <span className={labVizStyles.nodeLabel}>Email</span>
            <span className={labVizStyles.nodeSub}>{hub ? 'change()' : '→ Submit'}</span>
          </div>
          <div
            className={nodeCls(
              emit && labVizStyles.nodeActive,
              done && (hub ? labVizStyles.nodeOk : styles.nodeWarn),
            )}
          >
            <span className={labVizStyles.nodeLabel}>Password</span>
            <span className={labVizStyles.nodeSub}>{hub ? 'change()' : '→ Banner'}</span>
          </div>
        </div>
        <div
          ref={hubRef}
          className={`${labVizStyles.node} ${styles.hub}${hub ? '' : ` ${styles.nodeSkipped}`}${
            hub && routed ? ` ${labVizStyles.nodeActive}` : ''
          }${hub && done ? ` ${labVizStyles.nodeOk}` : ''}`}
        >
          <span className={labVizStyles.nodeLabel}>{hub ? 'Mediator' : '—'}</span>
          <span className={labVizStyles.nodeSub}>{hub && routed ? 'publish' : 'хаб'}</span>
        </div>
        <div
          className={nodeCls(
            routed && labVizStyles.nodeActive,
            done && (hub ? labVizStyles.nodeOk : styles.nodeWarn),
            meshWarn && styles.nodeWarn,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Submit</span>
          <span className={labVizStyles.nodeSub}>{done ? (hub ? 'enabled' : 'жёсткие связи') : 'ждёт'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

type CompVizProps = {
  phase: CompPhase
  caseId: CompCase
  treeRef: MutableRefObject<HTMLDivElement | null>
}

function CompositeViz({ phase, caseId, treeRef }: CompVizProps) {
  const tree = caseId === 'tree'
  const rootOn = phase !== 'idle'
  const kidsOn = phase === 'kids' || phase === 'done'
  const done = phase === 'done'
  const total = tree ? (done ? '140' : kidsOn ? '…' : '—') : done ? '100' : '—'

  return (
    <LabVizPanel title="size()" meta={tree ? 'folder recurse' : 'один file'}>
      <div className={styles.treeLayout} ref={treeRef}>
        <div
          className={nodeCls(
            rootOn && labVizStyles.nodeActive,
            done && labVizStyles.nodeOk,
            styles.treeRoot,
          )}
        >
          <span className={labVizStyles.nodeLabel}>{tree ? 'src/' : 'a.ts'}</span>
          <span className={labVizStyles.nodeSub}>size = {total}</span>
        </div>
        {tree ? (
          <div className={styles.treeKids}>
            <div className={nodeCls(kidsOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>a.ts</span>
              <span className={labVizStyles.nodeSub}>100</span>
            </div>
            <div className={nodeCls(kidsOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>ui/</span>
              <span className={labVizStyles.nodeSub}>{done ? '40' : 'folder'}</span>
            </div>
            <div
              className={nodeCls(
                kidsOn && labVizStyles.nodeActive,
                done && labVizStyles.nodeOk,
                styles.treeLeaf,
              )}
            >
              <span className={labVizStyles.nodeLabel}>Button.tsx</span>
              <span className={labVizStyles.nodeSub}>40</span>
            </div>
          </div>
        ) : (
          <div className={`${styles.treeKids} ${styles.nodeSkipped}`}>
            <div className={labVizStyles.node}>
              <span className={labVizStyles.nodeLabel}>дети</span>
              <span className={labVizStyles.nodeSub}>нет — leaf</span>
            </div>
          </div>
        )}
      </div>
    </LabVizPanel>
  )
}

type MemVizProps = {
  phase: MemPhase
  caseId: MemCase
  slotRef: MutableRefObject<HTMLDivElement | null>
}

function MementoViz({ phase, caseId, slotRef }: MemVizProps) {
  const withUndo = caseId === 'undo'
  const snapped = phase === 'snap' || phase === 'edit' || phase === 'done'
  const edited = phase === 'edit' || phase === 'done'
  const done = phase === 'done'
  const text = done && withUndo ? 'Hello' : edited ? 'Hello!' : 'Hello'
  const lost = !withUndo && done

  return (
    <LabVizPanel title="Редактор" meta={withUndo ? 'снимок → undo' : 'правка без истории'}>
      <div className={styles.memLayout}>
        <div
          className={nodeCls(
            phase !== 'idle' && labVizStyles.nodeActive,
            done && (withUndo ? labVizStyles.nodeOk : styles.nodeWarn),
            styles.editorCard,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Originator</span>
          <span className={labVizStyles.nodeSub}>{`"${text}"`}</span>
        </div>
        <div
          ref={slotRef}
          className={`${labVizStyles.node} ${styles.slot}${withUndo ? '' : ` ${styles.nodeSkipped}`}${
            withUndo && snapped ? ` ${labVizStyles.nodeActive}` : ''
          }${withUndo && done ? ` ${labVizStyles.nodeOk}` : ''}`}
        >
          <span className={labVizStyles.nodeLabel}>{withUndo ? 'Memento' : '—'}</span>
          <span className={labVizStyles.nodeSub}>
            {withUndo && snapped ? '"Hello"' : 'слот снимка'}
          </span>
        </div>
        <div
          className={nodeCls(
            withUndo && edited && labVizStyles.nodeActive,
            withUndo && done && labVizStyles.nodeOk,
            !withUndo && styles.nodeSkipped,
            lost && styles.nodeWarn,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Caretaker</span>
          <span className={labVizStyles.nodeSub}>
            {lost ? 'истории нет' : done && withUndo ? 'undo ✓' : 'stack'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

const PAIN: Record<Pattern, ReactNode> = {
  mediator: (
    <>
      Поля формы включают Submit. Прямые связи размазывают граф; медиатор принимает{' '}
      <code>change</code> и публикует снимок.
    </>
  ),
  composite: (
    <>
      Нужен общий <code>size()</code> для файла и папки. Composite обходит дерево без{' '}
      <code>switch</code> по типу.
    </>
  ),
  memento: (
    <>
      После правки нужен Undo. Originator делает снимок; caretaker хранит стек и вызывает{' '}
      <code>restore</code>.
    </>
  ),
}

export function PatternsMediatorCompositeMementoLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('mediator')
  const [caseId, setCaseId] = useState<CaseId>('mesh')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [medPhase, setMedPhase] = useState<MedPhase>('idle')
  const [compPhase, setCompPhase] = useState<CompPhase>('idle')
  const [memPhase, setMemPhase] = useState<MemPhase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const hubRef = useRef<HTMLDivElement | null>(null)
  const treeRef = useRef<HTMLDivElement | null>(null)
  const slotRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setMedPhase('idle')
    setCompPhase('idle')
    setMemPhase('idle')
    setHint(null)
    for (const el of [hubRef.current, treeRef.current, slotRef.current]) {
      if (el) gsap.set(el, { clearProps: 'transform,opacity' })
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
    setBusy(true)

    if (pattern === 'mediator') {
      const hub = caseId === 'hub'
      playTimeline(
        tlRef,
        [
          () => setMedPhase('emit'),
          () => setMedPhase(hub ? 'route' : 'emit'),
          () => {
            setMedPhase('done')
            if (hub) {
              log('ok', 'Email/Password → Mediator.publish → Submit enabled')
              setHint('коллеги знают только хаб')
            } else {
              log('warn', 'Email → Submit, Password → Banner — полный граф')
              setHint('без медиатора связи размазаны')
            }
          },
        ],
        (tl) => {
          if (!hubRef.current || !hub) return
          gsap.set(hubRef.current, { scale: 0.92, opacity: 0.5 })
          tl.to(hubRef.current, { scale: 1, opacity: 1 }, STEP)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'composite') {
      const tree = caseId === 'tree'
      playTimeline(
        tlRef,
        [
          () => setCompPhase('root'),
          () => setCompPhase(tree ? 'kids' : 'done'),
          () => {
            setCompPhase('done')
            if (tree) {
              log('ok', 'src.size() = 100 + 40 → 140')
              setHint('folder делегирует size() детям')
            } else {
              log('info', 'a.ts.size() = 100 — leaf без recurse')
              setHint('тот же контракт size(), без детей')
            }
          },
        ],
        (tl) => {
          if (!treeRef.current) return
          gsap.set(treeRef.current, { opacity: 0.45, y: 8 })
          tl.to(treeRef.current, { opacity: 1, y: 0 }, 0)
        },
        () => setBusy(false),
      )
      return
    }

    const withUndo = caseId === 'undo'
    playTimeline(
      tlRef,
      [
        () => setMemPhase(withUndo ? 'snap' : 'edit'),
        () => setMemPhase('edit'),
        () => {
          setMemPhase('done')
          if (withUndo) {
            log('ok', 'save("Hello") → type("!") → undo → "Hello"')
            setHint('caretaker хранит снимок, не поля редактора')
          } else {
            log('warn', 'type("!") без save — откатить некуда')
            setHint('без memento история потеряна')
          }
        },
      ],
      (tl) => {
        if (!slotRef.current || !withUndo) return
        gsap.set(slotRef.current, { scale: 0.92, opacity: 0.45 })
        tl.to(slotRef.current, { scale: 1, opacity: 1 }, 0)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('mediator')
    setCaseId('mesh')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>{PAIN[pattern]}</p>
      <ol className={shell.steps}>
        <li>Выберите паттерн и кейс — схема ещё не играет.</li>
        <li>
          Нажмите <code>Запустить</code> и смотрите, что изменилось на картинке.
        </li>
      </ol>

      {pattern === 'mediator' ? (
        <MediatorViz phase={medPhase} caseId={caseId as MedCase} hubRef={hubRef} />
      ) : null}
      {pattern === 'composite' ? (
        <CompositeViz phase={compPhase} caseId={caseId as CompCase} treeRef={treeRef} />
      ) : null}
      {pattern === 'memento' ? (
        <MementoViz phase={memPhase} caseId={caseId as MemCase} slotRef={slotRef} />
      ) : null}

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
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите паттерн и кейс, затем нажмите «Запустить».</p>
      )}
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
      title="Mediator · Composite · Memento"
      lead="Переключатель: хаб формы, дерево size(), undo через снимок."
      problem={problem}
      code={code}
    />
  )
}
