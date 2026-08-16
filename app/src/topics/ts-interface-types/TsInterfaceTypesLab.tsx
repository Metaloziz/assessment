import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './TsInterfaceTypesLab.module.css'

const TOPIC_ID = '226-ts-interface-types'
const STEP = 0.6

type CaseId = 'merge' | 'union'
type Phase = 'idle' | 'a' | 'b' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'merge', label: 'Interface merge' },
  { id: 'union', label: 'Type union' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  merge: (
    <>
      Два <code>interface User</code> с одним именем склеивают поля в один shape.
    </>
  ),
  union: (
    <>
      <code>type Result = Ok | Err</code> — взаимоисключающие ветки; interface так не объявляют.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  merge: 'Declaration merging: повторный interface с тем же именем дополняет контракт.',
  union: 'Union через type: одна сущность Result с ветками Ok и Err.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  merge: [
    {
      id: 'user-merge',
      label: 'src/user.ts',
      note: 'Повторный interface User не конфликтует — поля сливаются.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// INTERFACE ← declaration merging
// ═══════════════════════════════════════════
interface User {
  id: string; // ← MERGE: первая декларация
}

interface User {
  email: string; // ← MERGE: поля доклеиваются
}

export function label(u: User) {
  return \`\${u.id} <\${u.email}>\`;
}

// const bad: User = { id: "1" }; // ошибка: нет email
`,
    },
  ],
  union: [
    {
      id: 'result-union',
      label: 'src/result.ts',
      note: 'Discriminated union: type умеет |, interface — нет.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// TYPE ← union веток
// ═══════════════════════════════════════════
type Ok = { ok: true; value: string };
type Err = { ok: false; error: string };

type Result = Ok | Err; // ← UNION

export function message(r: Result) {
  return r.ok ? r.value : r.error;
}

// interface Result = Ok | Err; // так нельзя
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

function InterfaceTypesViz({ caseId, phase, focusRef }: VizProps) {
  if (caseId === 'merge') {
    const aOn = phase === 'a' || phase === 'b' || phase === 'done'
    const bOn = phase === 'b' || phase === 'done'
    const done = phase === 'done'

    return (
      <LabVizPanel title="User" meta={done ? 'id + email' : 'declaration merging'}>
        <div className={styles.stage}>
          <div className={styles.mergeRow}>
            <div
              className={nodeCls(aOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}
            >
              <span className={labVizStyles.nodeLabel}>interface User</span>
              <span className={labVizStyles.nodeSub}>id: string</span>
            </div>
            <span className={styles.mergeArrow}>+</span>
            <div
              className={nodeCls(
                bOn && labVizStyles.nodeActive,
                done && labVizStyles.nodeOk,
                !bOn && phase !== 'idle' && styles.dim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>interface User</span>
              <span className={labVizStyles.nodeSub}>email: string</span>
            </div>
          </div>
          <div className={styles.resultRow}>
            <div
              ref={focusRef}
              className={nodeCls(
                done && labVizStyles.nodeOk,
                (phase === 'b' || done) && labVizStyles.nodeActive,
                phase === 'idle' && styles.dim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>User (merged)</span>
              <span className={labVizStyles.nodeSub}>
                {done ? '{ id, email }' : phase === 'b' ? 'склеиваем…' : 'ждёт вторую декларацию'}
              </span>
            </div>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const aOn = phase === 'a' || phase === 'b' || phase === 'done'
  const bOn = phase === 'b' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel title="Result" meta={done ? 'Ok | Err' : 'type union'}>
      <div className={styles.stage}>
        <div className={styles.unionRow}>
          <div className={nodeCls(aOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
            <span className={labVizStyles.nodeLabel}>Ok</span>
            <span className={labVizStyles.nodeSub}>ok: true · value</span>
          </div>
          <span className={styles.unionOr}>|</span>
          <div
            className={nodeCls(
              bOn && labVizStyles.nodeActive,
              done && labVizStyles.nodeOk,
              !bOn && phase !== 'idle' && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Err</span>
            <span className={labVizStyles.nodeSub}>ok: false · error</span>
          </div>
        </div>
        <div className={styles.resultRow}>
          <div
            ref={focusRef}
            className={nodeCls(
              done && labVizStyles.nodeOk,
              (phase === 'b' || done) && labVizStyles.nodeActive,
              phase === 'idle' && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>type Result</span>
            <span className={labVizStyles.nodeSub}>
              {done ? 'Ok | Err' : phase === 'b' ? 'собираем union…' : 'ждёт ветки'}
            </span>
          </div>
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

export function TsInterfaceTypesLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('merge')
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

    const merge = caseId === 'merge'
    playTimeline(
      tlRef,
      [
        () => setPhase('a'),
        () => setPhase('b'),
        () => {
          setPhase('done')
          if (merge) {
            log('ok', 'User = { id, email } — merge двух interface')
            setHint('повторный interface дополняет контракт, не конфликтует')
          } else {
            log('ok', 'Result = Ok | Err — union через type')
            setHint('ветки взаимоисключающие; interface так не пишут')
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
    setCaseId('merge')
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
        <code>interface</code> и <code>type</code> описывают формы; у interface — merge, у type —
        удобный <code>|</code>.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <InterfaceTypesViz caseId={caseId} phase={phase} focusRef={focusRef} />

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
        </p>
      ) : null}
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
      title="Interface и type"
      lead="Merge у interface против union у type — одна картина на кейс."
      problem={problem}
      code={code}
    />
  )
}
