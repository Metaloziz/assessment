import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './TsBasicTypesLab.module.css'

const TOPIC_ID = '225-ts-basic-types'
const STEP = 0.6

type CaseId = 'throw' | 'exhaustive' | 'miss'
type Phase = 'idle' | 'enter' | 'branch' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'throw', label: 'fail(): never' },
  { id: 'exhaustive', label: 'switch ок' },
  { id: 'miss', label: 'забыли case' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  throw: (
    <>
      <code>fail</code> с типом <code>never</code> бросает ошибку — после вызова нормальный путь не продолжается.
    </>
  ),
  exhaustive: (
    <>
      Все литералы <code>Status</code> закрыты: в <code>default</code> остаток — <code>never</code>, checker доволен.
    </>
  ),
  miss: (
    <>
      В <code>Status</code> добавили <code>"error"</code> без <code>case</code> — присвоить его в <code>never</code> нельзя.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  throw: '`never` у функции: нет нормального return — только throw или бесконечный цикл.',
  exhaustive: 'Исчерпывающий switch: после всех веток Status сужается до never.',
  miss: 'Негатив: Status расширили, ветку забыли — ошибка на _exhaustive: never.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  throw: [
    {
      id: 'fail-never',
      label: 'src/fail.ts',
      note: 'Return type never: после fail код ниже по ветке для checker’а недостижим.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// NEVER ← нет нормального return
// ═══════════════════════════════════════════
export function fail(msg: string): never {
  throw new Error(msg); // ← NEVER: путь обрывается
}

export function handle(ok: boolean): string {
  if (!ok) {
    return fail("сломалось"); // ← дальше по ветке не идём
  }
  return "готово";
}

// function oops(): never {
//   return 1; // ошибка: number не never
// }
`,
    },
  ],
  exhaustive: [
    {
      id: 'status-exhaustive',
      label: 'src/status.ts',
      note: 'Все ветки закрыты — в default status имеет тип never.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// NEVER ← исчерпывающий switch (ок)
// ═══════════════════════════════════════════
type Status = "idle" | "loading" | "done";

export function label(status: Status): string {
  switch (status) {
    case "idle":
      return "жду";
    case "loading":
      return "гружу";
    case "done":
      return "готово";
    default: {
      const _exhaustive: never = status; // ← NEVER: пусто — ок
      return _exhaustive;
    }
  }
}
`,
    },
  ],
  miss: [
    {
      id: 'status-miss',
      label: 'src/status-miss.ts',
      note: 'Status += "error" без case — "error" не assignable to never.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// NEVER ← забытый case (ошибка типов)
// ═══════════════════════════════════════════
type Status = "idle" | "loading" | "done" | "error"; // ← добавили error

export function label(status: Status): string {
  switch (status) {
    case "idle":
      return "жду";
    case "loading":
      return "гружу";
    case "done":
      return "готово";
    // нет case "error"
    default: {
      // Type '"error"' is not assignable to type 'never'
      const _exhaustive: never = status; // ← MISS
      return _exhaustive;
    }
  }
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

function NeverViz({ caseId, phase, focusRef }: VizProps) {
  const enter = phase !== 'idle'
  const branch = phase === 'branch' || phase === 'done'
  const done = phase === 'done'

  if (caseId === 'throw') {
    return (
      <LabVizPanel title="control flow" meta={done ? 'путь оборван' : 'fail(): never'}>
        <div className={styles.stage}>
          <div className={styles.flow}>
            <div className={nodeCls(enter && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>handle(false)</span>
              <span className={labVizStyles.nodeSub}>вход</span>
            </div>
            <span className={styles.arrow}>→</span>
            <div
              ref={focusRef}
              className={nodeCls(
                branch && labVizStyles.nodeActive,
                done && labVizStyles.nodeErr,
              )}
            >
              <span className={labVizStyles.nodeLabel}>fail()</span>
              <span className={labVizStyles.nodeSub}>: never · throw</span>
            </div>
            <span className={`${styles.arrow}${done ? '' : ` ${styles.dim}`}`}>↛</span>
            <div className={nodeCls(done && styles.dim)}>
              <span className={labVizStyles.nodeLabel}>"готово"</span>
              <span className={labVizStyles.nodeSub}>
                {done ? 'недостижимо' : 'return string'}
              </span>
            </div>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const miss = caseId === 'miss'
  const defaultOk = done && !miss
  const defaultErr = done && miss

  return (
    <LabVizPanel
      title="Status → label"
      meta={
        done
          ? miss
            ? '"error" ↛ never'
            : 'остаток → never'
          : miss
            ? 'забытый case'
            : 'exhaustive check'
      }
    >
      <div className={styles.stage}>
        <div className={styles.switchCol}>
          <div className={`${styles.cases}${miss ? ` ${styles.casesWide}` : ''}`}>
            <div className={nodeCls(enter && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>idle</span>
              <span className={labVizStyles.nodeSub}>return</span>
            </div>
            <div className={nodeCls(enter && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>loading</span>
              <span className={labVizStyles.nodeSub}>return</span>
            </div>
            <div className={nodeCls(enter && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>done</span>
              <span className={labVizStyles.nodeSub}>return</span>
            </div>
            {miss ? (
              <div
                className={nodeCls(
                  enter && labVizStyles.nodeActive,
                  done && labVizStyles.nodeErr,
                )}
              >
                <span className={labVizStyles.nodeLabel}>error</span>
                <span className={labVizStyles.nodeSub}>{done ? 'нет case' : 'в Status'}</span>
              </div>
            ) : null}
          </div>
          <div className={styles.defaultRow}>
            <div
              ref={focusRef}
              className={nodeCls(
                branch && labVizStyles.nodeActive,
                defaultOk && labVizStyles.nodeOk,
                defaultErr && labVizStyles.nodeErr,
                phase === 'idle' && styles.dim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>default</span>
              <span className={labVizStyles.nodeSub}>
                {done
                  ? miss
                    ? '"error" ≠ never'
                    : '_exhaustive: never'
                  : 'остаток Status'}
              </span>
            </div>
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

export function TsBasicTypesLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('throw')
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
    playTimeline(
      tlRef,
      [
        () => setPhase('enter'),
        () => setPhase('branch'),
        () => {
          setPhase('done')
          if (caseId === 'throw') {
            log('warn', 'fail(): never — throw, ветка "готово" недостижима')
            setHint('never = нет нормального return; путь обрывается')
          } else if (caseId === 'miss') {
            log('err', '"error" не assignable to never — забыли case')
            setHint('расширили Status без ветки — checker ловит на _exhaustive')
          } else {
            log('ok', 'все Status закрыты → default: never')
            setHint('остаток пуст: присвоить never можно')
          }
        },
      ],
      (tl) => {
        if (!focusRef.current) return
        gsap.set(focusRef.current, { scale: 0.94, opacity: 0.45 })
        tl.to(focusRef.current, { scale: 1, opacity: 1 }, STEP)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('throw')
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
        Тип <code>never</code> — пустое множество значений: функция не возвращается нормально, либо
        ветка должна быть недостижима.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <NeverViz caseId={caseId} phase={phase} focusRef={focusRef} />

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
      title="Тип never"
      lead="Обрыв пути через throw; switch с never — ок и негатив с забытым case."
      problem={problem}
      code={code}
    />
  )
}
