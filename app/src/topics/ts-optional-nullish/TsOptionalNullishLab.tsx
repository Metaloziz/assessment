import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './TsOptionalNullishLab.module.css'

const TOPIC_ID = '232-ts-optional-nullish'
const STEP = 0.6

type Mode = 'optional' | 'nullish'
type OptionalCase = 'hit' | 'miss'
type NullishCase = 'keep' | 'or'
type CaseId = OptionalCase | NullishCase
type Phase = 'idle' | 'step1' | 'step2' | 'done'

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'optional', label: '?. chaining' },
  { id: 'nullish', label: '?? coalescing' },
]

const CASES: Record<Mode, Array<{ id: CaseId; label: string }>> = {
  optional: [
    { id: 'hit', label: 'путь цел' },
    { id: 'miss', label: 'дыра в profile' },
  ],
  nullish: [
    { id: 'keep', label: '0 ?? 10' },
    { id: 'or', label: '0 || 10' },
  ],
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  hit: (
    <>
      Все звенья есть: <code>user?.profile?.email</code> даёт строку без проверок вручную.
    </>
  ),
  miss: (
    <>
      На <code>profile === null</code> цепочка обрывается → <code>undefined</code>, без{' '}
      <code>TypeError</code>.
    </>
  ),
  keep: (
    <>
      <code>0 ?? 10</code> оставляет ноль: для <code>??</code> это не nullish.
    </>
  ),
  or: (
    <>
      <code>0 || 10</code> подставляет <code>10</code>: ноль для <code>||</code> — falsy.
    </>
  ),
}

const CODE_INTRO: Record<Mode, string> = {
  optional: 'Безопасный доступ к вложенным полям через `?.`.',
  nullish: 'Дефолт только для `null` / `undefined` — контраст с `||`.',
}

const CODE_SNIPPETS: Record<Mode, InteractiveSnippet[]> = {
  optional: [
    {
      id: 'user-email',
      label: 'src/userEmail.ts',
      note: '`?.` обрывает цепочку на nullish; иначе обычный доступ.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// OPTIONAL ← безопасная цепочка
// ═══════════════════════════════════════════
type User = {
  profile?: { email?: string } | null;
};

export function emailOf(user: User | null) {
  return user?.profile?.email; // ← CHAIN: string | undefined
}

emailOf({ profile: { email: "a@b.c" } }); // "a@b.c"
emailOf({ profile: null }); // undefined — без TypeError
emailOf(null); // undefined
`,
    },
    {
      id: 'optional-call',
      label: 'src/optionalCall.ts',
      note: '`fn?.()` вызывает только если слева есть функция.',
      executable: false,
      languageLabel: 'ts',
      code: `type Hook = (() => void) | undefined;

export function run(onReady: Hook) {
  onReady?.(); // ← CALL: нет функции — пропуск
}
`,
    },
  ],
  nullish: [
    {
      id: 'page-size',
      label: 'src/pageSize.ts',
      note: '`??` не трогает 0 / "" / false — только null и undefined.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// NULLISH ← дефолт для null | undefined
// ═══════════════════════════════════════════
export function pageSize(raw: number | null | undefined) {
  return raw ?? 20; // ← KEEP: 0 остаётся 0
}

pageSize(0); // 0
pageSize(null); // 20
pageSize(undefined); // 20
`,
    },
    {
      id: 'vs-or',
      label: 'src/vsOr.ts',
      note: '`||` срабатывает на любое falsy — ноль «пропадает».',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// VS || ← falsy vs nullish
// ═══════════════════════════════════════════
export const viaNullish = 0 ?? 10; // 0  ← NULLISH
export const viaOr = 0 || 10; // 10     ← OR: 0 falsy
`,
    },
  ],
}

const PAIN: Record<Mode, ReactNode> = {
  optional: (
    <>
      <code>?.</code> читает вложенность без <code>TypeError</code>: на{' '}
      <code>null</code>/<code>undefined</code> цепочка обрывается.
    </>
  ),
  nullish: (
    <>
      <code>??</code> подставляет запас только для nullish; <code>||</code> — для любого falsy.
    </>
  ),
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
  mode: Mode
  caseId: CaseId
  phase: Phase
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function OptionalViz({ caseId, phase, focusRef }: Omit<VizProps, 'mode'>) {
  const miss = caseId === 'miss'
  const s1 = phase !== 'idle'
  const s2 = phase === 'step2' || phase === 'done'
  const done = phase === 'done'
  const broke = miss && s2

  return (
    <LabVizPanel
      title="user?.profile?.email"
      meta={done ? (miss ? '→ undefined' : '→ "a@b.c"') : 'цепочка'}
    >
      <div className={styles.stageRow}>
        <div className={nodeCls(s1 && labVizStyles.nodeActive, done && !miss && labVizStyles.nodeOk)}>
          <span className={labVizStyles.nodeLabel}>user</span>
          <span className={labVizStyles.nodeSub}>{miss ? '{…}' : '{…}'}</span>
        </div>
        <span className={styles.arrow}>?.→</span>
        <div
          className={nodeCls(
            s2 && labVizStyles.nodeActive,
            broke && labVizStyles.nodeErr,
            done && !miss && labVizStyles.nodeOk,
            !s2 && phase !== 'idle' && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>profile</span>
          <span className={labVizStyles.nodeSub}>{miss ? 'null' : '{ email }'}</span>
        </div>
        <span className={`${styles.arrow}${broke ? ` ${styles.dim}` : ''}`}>?.→</span>
        <div
          ref={focusRef}
          className={nodeCls(
            done && !miss && labVizStyles.nodeOk,
            done && !miss && labVizStyles.nodeActive,
            (broke || !done) && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>email</span>
          <span className={labVizStyles.nodeSub}>
            {done && !miss ? '"a@b.c"' : broke ? 'не читали' : '…'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function NullishViz({ caseId, phase, focusRef }: Omit<VizProps, 'mode'>) {
  const useOr = caseId === 'or'
  const s1 = phase !== 'idle'
  const s2 = phase === 'step2' || phase === 'done'
  const done = phase === 'done'
  const result = useOr ? '10' : '0'
  const tookRight = useOr

  return (
    <LabVizPanel title={useOr ? '0 || 10' : '0 ?? 10'} meta={done ? `→ ${result}` : 'сравнение'}>
      <div className={styles.stageRow}>
        <div
          className={nodeCls(
            s1 && labVizStyles.nodeActive,
            done && !tookRight && labVizStyles.nodeOk,
            done && tookRight && labVizStyles.nodeErr,
          )}
        >
          <span className={labVizStyles.nodeLabel}>слева</span>
          <span className={labVizStyles.nodeSub}>0</span>
        </div>
        <span className={styles.arrow}>{useOr ? '||' : '??'}</span>
        <div
          className={nodeCls(
            s2 && labVizStyles.nodeActive,
            done && tookRight && labVizStyles.nodeOk,
            done && !tookRight && styles.dim,
            !s2 && phase !== 'idle' && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>справа</span>
          <span className={labVizStyles.nodeSub}>10</span>
        </div>
        <span className={styles.arrow}>→</span>
        <div
          ref={focusRef}
          className={nodeCls(
            done && labVizStyles.nodeOk,
            done && labVizStyles.nodeActive,
            !done && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>результат</span>
          <span className={labVizStyles.nodeSub}>{done ? result : '…'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ModeSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Mode
  disabled?: boolean
  onChange: (id: Mode) => void
}) {
  return (
    <div className={shell.row}>
      {MODES.map((m) => (
        <LabButton
          key={m.id}
          variant="ghost"
          size="sm"
          active={value === m.id}
          disabled={disabled}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </LabButton>
      ))}
    </div>
  )
}

function CaseSwitch({
  mode,
  value,
  disabled,
  onChange,
}: {
  mode: Mode
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES[mode].map((c) => (
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

export function TsOptionalNullishLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('optional')
  const [caseId, setCaseId] = useState<CaseId>('hit')
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

  const selectMode = (next: Mode) => {
    tlRef.current?.kill()
    setBusy(false)
    setMode(next)
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

    playTimeline(
      tlRef,
      [
        () => setPhase('step1'),
        () => setPhase('step2'),
        () => {
          setPhase('done')
          if (mode === 'optional') {
            if (caseId === 'hit') {
              log('ok', 'email → "a@b.c"')
              setHint('цепочка дошла до поля — значение как у обычной точки')
            } else {
              log('ok', 'обрыв на profile → undefined')
              setHint('email не читали: слева nullish — стоп без TypeError')
            }
          } else if (caseId === 'keep') {
            log('ok', '0 ?? 10 → 0')
            setHint('ноль не nullish — правую часть не брали')
          } else {
            log('warn', '0 || 10 → 10')
            setHint('|| видит falsy и подменяет ноль дефолтом')
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
    setMode('optional')
    setCaseId('hit')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <ModeSwitch value={mode} disabled={busy} onChange={selectMode} />
      <CaseSwitch mode={mode} value={caseId} disabled={busy} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[mode]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {mode === 'optional' ? (
        <OptionalViz caseId={caseId} phase={phase} focusRef={focusRef} />
      ) : (
        <NullishViz caseId={caseId} phase={phase} focusRef={focusRef} />
      )}

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <ModeSwitch value={mode} onChange={selectMode} />
      <InteractiveCodePanel
        key={mode}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[mode]}
        snippets={CODE_SNIPPETS[mode]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Optional chaining · nullish coalescing"
      lead="`?.` обрывает цепочку; `??` не путает ноль с «нет значения» — одна картина на кейс."
      problem={problem}
      code={code}
    />
  )
}
