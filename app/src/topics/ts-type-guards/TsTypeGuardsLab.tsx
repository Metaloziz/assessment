import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './TsTypeGuardsLab.module.css'

const TOPIC_ID = '228-ts-type-guards'
const STEP = 0.6

type CaseId = 'typeof' | 'predicate'
type Phase = 'idle' | 'wide' | 'check' | 'narrow'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'typeof', label: 'typeof' },
  { id: 'predicate', label: 'is User' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  typeof: (
    <>
      После <code>typeof x === &quot;string&quot;</code> в ветке <code>x</code> уже{' '}
      <code>string</code>, не union.
    </>
  ),
  predicate: (
    <>
      Предикат <code>x is User</code> сужает <code>unknown</code> до формы с{' '}
      <code>id</code> и <code>name</code>.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  typeof: 'Встроенный guard: `typeof` отсекает ветку union.',
  predicate: 'Свой predicate: `unknown` → `User` после `isUser`.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  typeof: [
    {
      id: 'typeof-guard',
      label: 'src/len.ts',
      note: '`typeof` сужает `string | number` внутри ветки.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// TYPEOF ← встроенный type guard
// ═══════════════════════════════════════════
export function len(x: string | number) {
  if (typeof x === "string") {
    // ← NARROW: x: string
    return x.length;
  }
  // ← NARROW: x: number
  return String(x).length;
}
`,
    },
  ],
  predicate: [
    {
      id: 'is-user',
      label: 'src/user.ts',
      note: 'Сигнатура `x is User` — контракт сужения для checker.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// PREDICATE ← value is Type
// ═══════════════════════════════════════════
type User = { id: string; name: string };

export function isUser(x: unknown): x is User {
  // ← GUARD: boolean + сужение
  return (
    typeof x === "object" &&
    x !== null &&
    "id" in x &&
    typeof (x as User).id === "string" &&
    typeof (x as User).name === "string"
  );
}

export function greet(raw: unknown) {
  if (!isUser(raw)) return "guest";
  return raw.name; // ← NARROW: raw: User
}
`,
    },
  ],
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

type VizProps = {
  caseId: CaseId
  phase: Phase
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function TypeGuardsViz({ caseId, phase, focusRef }: VizProps) {
  const wideOn = phase !== 'idle'
  const checkOn = phase === 'check' || phase === 'narrow'
  const narrowOn = phase === 'narrow'

  if (caseId === 'typeof') {
    return (
      <LabVizPanel title="len(x)" meta={narrowOn ? 'x: string' : 'string | number'}>
        <div className={styles.stage}>
          <div
            className={nodeCls(wideOn && labVizStyles.nodeActive, narrowOn && styles.dim)}
          >
            <span className={labVizStyles.nodeLabel}>вход</span>
            <span className={labVizStyles.nodeSub}>x: string | number</span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            className={nodeCls(
              checkOn && labVizStyles.nodeActive,
              narrowOn && labVizStyles.nodeOk,
              !checkOn && phase !== 'idle' && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>typeof x === &quot;string&quot;</span>
            <span className={labVizStyles.nodeSub}>
              {checkOn ? (narrowOn ? 'true → ветка' : 'проверка…') : 'type guard'}
            </span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            ref={focusRef}
            className={nodeCls(
              narrowOn && labVizStyles.nodeOk,
              narrowOn && labVizStyles.nodeActive,
              !narrowOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>внутри if</span>
            <span className={labVizStyles.nodeSub}>
              {narrowOn ? 'x: string · .length ок' : 'ещё wide'}
            </span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title="greet(raw)" meta={narrowOn ? 'raw: User' : 'unknown'}>
      <div className={styles.stage}>
        <div className={nodeCls(wideOn && labVizStyles.nodeActive, narrowOn && styles.dim)}>
          <span className={labVizStyles.nodeLabel}>вход</span>
          <span className={labVizStyles.nodeSub}>raw: unknown</span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            checkOn && labVizStyles.nodeActive,
            narrowOn && labVizStyles.nodeOk,
            !checkOn && phase !== 'idle' && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>isUser(raw)</span>
          <span className={labVizStyles.nodeSub}>
            {checkOn ? (narrowOn ? 'true · x is User' : 'predicate…') : 'value is User'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          ref={focusRef}
          className={nodeCls(
            narrowOn && labVizStyles.nodeOk,
            narrowOn && labVizStyles.nodeActive,
            !narrowOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>после if</span>
          <span className={labVizStyles.nodeSub}>
            {narrowOn ? 'raw.name · id, name' : 'ещё unknown'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function CaseSwitch({
  value,
  disabled,
  onChange,
}: {
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          disabled={disabled}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

export function TsTypeGuardsLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('typeof')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (focusRef.current) gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
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

    const isTypeof = caseId === 'typeof'
    playTimeline(
      tlRef,
      [
        () => setPhase('wide'),
        () => setPhase('check'),
        () => {
          setPhase('narrow')
          if (isTypeof) {
            log('ok', 'typeof → x: string в ветке')
            setHint('union снаружи, string внутри if после typeof')
          } else {
            log('ok', 'isUser → raw: User')
            setHint('без `x is User` boolean не сузит тип')
          }
        },
      ],
      (tl) => {
        if (!focusRef.current) return
        gsap.set(focusRef.current, { scale: 0.94, opacity: 0.45 })
        tl.to(focusRef.current, { scale: 1, opacity: 1 }, STEP * 2)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('typeof')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} disabled={busy} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Type guard сужает тип в ветке: после проверки checker знает точную форму без{' '}
        <code>as</code>.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <TypeGuardsViz caseId={caseId} phase={phase} focusRef={focusRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <CaseSwitch value={caseId} onChange={selectCase} />
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
      title="Type guards"
      lead="Сужение через `typeof` и predicate `x is Type` — одна картина на кейс."
      problem={problem}
      code={code}
    />
  )
}
