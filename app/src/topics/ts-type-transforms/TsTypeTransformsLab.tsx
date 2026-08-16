import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './TsTypeTransformsLab.module.css'

const TOPIC_ID = '229-ts-type-transforms'
const STEP = 0.6

type PatternId = 'extends' | 'ops' | 'utility'
type CaseId = 'iface' | 'constraint' | 'union' | 'intersect' | 'pick' | 'partial'
type Phase = 'idle' | 'a' | 'b' | 'done'

const PATTERNS: Array<{ id: PatternId; label: string }> = [
  { id: 'extends', label: 'extends' },
  { id: 'ops', label: '| / &' },
  { id: 'utility', label: 'Utility' },
]

const CASES: Record<PatternId, Array<{ id: CaseId; label: string }>> = {
  extends: [
    { id: 'iface', label: 'interface extends' },
    { id: 'constraint', label: 'T extends' },
  ],
  ops: [
    { id: 'union', label: 'A | B' },
    { id: 'intersect', label: 'A & B' },
  ],
  utility: [
    { id: 'pick', label: 'Pick' },
    { id: 'partial', label: 'Partial' },
  ],
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  iface: (
    <>
      <code>User extends WithId</code> — к базовым полям дописывают свои.
    </>
  ),
  constraint: (
    <>
      <code>T extends {'{ id: string }'}</code> ограничивает дженерик: внутри функции <code>id</code> доступен.
    </>
  ),
  union: (
    <>
      <code>Ok | Err</code> — значение из одной ветки; обе сразу не требуются.
    </>
  ),
  intersect: (
    <>
      <code>User & Timestamped</code> — нужны поля обеих сторон сразу.
    </>
  ),
  pick: (
    <>
      <code>Pick&lt;User, "id" | "name"&gt;</code> оставляет только выбранные ключи.
    </>
  ),
  partial: (
    <>
      <code>Partial&lt;User&gt;</code> делает все поля опциональными — черновик формы.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  iface: 'interface extends: производная форма = база + новые поля.',
  constraint: 'Generic constraint: T обязан иметь id — иначе вызов не соберётся.',
  union: 'Union: Result — либо Ok, либо Err.',
  intersect: 'Intersection: StoredUser требует User и Timestamped вместе.',
  pick: 'Pick вырезает публичный срез из User.',
  partial: 'Partial — все ключи User становятся опциональными.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  iface: [
    {
      id: 'user-extends',
      label: 'src/user.ts',
      note: 'User наследует WithId и добавляет name.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// EXTENDS ← расширение формы
// ═══════════════════════════════════════════
interface WithId {
  id: string; // ← BASE
}

interface User extends WithId {
  name: string; // ← EXTENDS: id + name
}

export function label(u: User) {
  return \`\${u.id}: \${u.name}\`;
}
`,
    },
  ],
  constraint: [
    {
      id: 'pluck-id',
      label: 'src/pluck.ts',
      note: 'T extends { id: string } — только объекты с id.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// EXTENDS ← ограничение дженерика
// ═══════════════════════════════════════════
export function pluckId<T extends { id: string }>(row: T): string {
  return row.id; // ← CONSTRAINT: id точно есть
}

pluckId({ id: "1", name: "Ann" });
// pluckId({ name: "Ann" }); // ошибка: нет id
`,
    },
  ],
  union: [
    {
      id: 'result-union',
      label: 'src/result.ts',
      note: 'Одна ветка за раз: Ok или Err.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// UNION ← одна из веток
// ═══════════════════════════════════════════
type Ok = { ok: true; value: string };
type Err = { ok: false; error: string };

type Result = Ok | Err; // ← |

export function message(r: Result) {
  return r.ok ? r.value : r.error;
}
`,
    },
  ],
  intersect: [
    {
      id: 'stored-user',
      label: 'src/stored.ts',
      note: 'Intersection склеивает требования обоих типов.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// INTERSECTION ← оба набора полей
// ═══════════════════════════════════════════
type User = { id: string; name: string };
type Timestamped = { createdAt: Date };

type StoredUser = User & Timestamped; // ← &

export function age(u: StoredUser) {
  return Date.now() - u.createdAt.getTime(); // id, name, createdAt
}
`,
    },
  ],
  pick: [
    {
      id: 'user-pick',
      label: 'src/dto.ts',
      note: 'Публичный DTO без email.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// PICK ← выбранные ключи
// ═══════════════════════════════════════════
type User = {
  id: string;
  name: string;
  email: string;
};

type UserPublic = Pick<User, "id" | "name">; // ← PICK

export function card(u: UserPublic) {
  return \`\${u.id} · \${u.name}\`;
}
`,
    },
  ],
  partial: [
    {
      id: 'user-partial',
      label: 'src/draft.ts',
      note: 'Черновик: любое подмножество полей User.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// PARTIAL ← все поля опциональны
// ═══════════════════════════════════════════
type User = {
  id: string;
  name: string;
  email: string;
};

type UserDraft = Partial<User>; // ← PARTIAL

export function saveDraft(d: UserDraft) {
  return d; // можно { name: "Ann" } без id/email
}
`,
    },
  ],
}

const PAIN: Record<PatternId, ReactNode> = {
  extends: (
    <>
      <code>extends</code> наращивает форму или ограничивает параметр дженерика — без копипасты полей.
    </>
  ),
  ops: (
    <>
      <code>|</code> — одна из веток; <code>&</code> — требования обеих сторон сразу.
    </>
  ),
  utility: (
    <>
      Utility Types берут готовый <code>T</code> и меняют ключи или опциональность.
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

function FieldChips({
  fields,
  phase,
  mode,
}: {
  fields: string[]
  phase: Phase
  mode: 'all' | 'pick' | 'partial'
}) {
  const pickKeep = new Set(['id', 'name'])
  return (
    <div className={styles.fields}>
      {fields.map((f) => {
        let on = phase !== 'idle'
        let ok = phase === 'done'
        let off = false
        if (mode === 'pick' && phase === 'done') {
          off = !pickKeep.has(f)
          on = pickKeep.has(f)
          ok = pickKeep.has(f)
        }
        if (mode === 'partial' && phase === 'done') {
          on = true
          ok = true
        }
        return (
          <span
            key={f}
            className={[
              styles.chip,
              on && styles.chipOn,
              ok && styles.chipOk,
              off && styles.chipOff,
              phase === 'idle' && styles.chipOff,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {mode === 'partial' && phase === 'done' ? `${f}?` : f}
          </span>
        )
      })}
    </div>
  )
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function TransformsViz({ caseId, phase, focusRef }: VizProps) {
  const aOn = phase === 'a' || phase === 'b' || phase === 'done'
  const bOn = phase === 'b' || phase === 'done'
  const done = phase === 'done'

  if (caseId === 'iface') {
    return (
      <LabVizPanel title="User" meta={done ? 'id + name' : 'interface extends'}>
        <div className={styles.stage}>
          <div className={styles.row}>
            <div className={nodeCls(aOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>WithId</span>
              <span className={labVizStyles.nodeSub}>id</span>
            </div>
            <span className={styles.op}>extends</span>
            <div
              className={nodeCls(
                bOn && labVizStyles.nodeActive,
                done && labVizStyles.nodeOk,
                !bOn && phase !== 'idle' && styles.dim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>+ name</span>
              <span className={labVizStyles.nodeSub}>поля User</span>
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
              <span className={labVizStyles.nodeLabel}>User</span>
              <span className={labVizStyles.nodeSub}>
                {done ? '{ id, name }' : phase === 'b' ? 'собираем…' : 'ждёт extends'}
              </span>
            </div>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  if (caseId === 'constraint') {
    return (
      <LabVizPanel title="pluckId" meta={done ? 'T имеет id' : 'T extends { id }'}>
        <div className={styles.stage}>
          <div className={styles.row}>
            <div className={nodeCls(aOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>T</span>
              <span className={labVizStyles.nodeSub}>аргумент</span>
            </div>
            <span className={styles.op}>extends</span>
            <div
              className={nodeCls(
                bOn && labVizStyles.nodeActive,
                done && labVizStyles.nodeOk,
                !bOn && phase !== 'idle' && styles.dim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>{'{ id: string }'}</span>
              <span className={labVizStyles.nodeSub}>constraint</span>
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
              <span className={labVizStyles.nodeLabel}>row.id</span>
              <span className={labVizStyles.nodeSub}>
                {done ? 'доступен' : phase === 'b' ? 'проверяем…' : 'ждёт ограничение'}
              </span>
            </div>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  if (caseId === 'union') {
    return (
      <LabVizPanel title="Result" meta={done ? 'Ok | Err' : 'union'}>
        <div className={styles.stage}>
          <div className={styles.row}>
            <div className={nodeCls(aOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>Ok</span>
              <span className={labVizStyles.nodeSub}>value</span>
            </div>
            <span className={styles.op}>|</span>
            <div
              className={nodeCls(
                bOn && labVizStyles.nodeActive,
                done && labVizStyles.nodeOk,
                !bOn && phase !== 'idle' && styles.dim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>Err</span>
              <span className={labVizStyles.nodeSub}>error</span>
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
              <span className={labVizStyles.nodeLabel}>одна ветка</span>
              <span className={labVizStyles.nodeSub}>
                {done ? 'Ok или Err' : phase === 'b' ? 'собираем union…' : 'ждёт ветки'}
              </span>
            </div>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  if (caseId === 'intersect') {
    return (
      <LabVizPanel title="StoredUser" meta={done ? 'User & Timestamped' : 'intersection'}>
        <div className={styles.stage}>
          <div className={styles.row}>
            <div className={nodeCls(aOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
              <span className={labVizStyles.nodeLabel}>User</span>
              <span className={labVizStyles.nodeSub}>id · name</span>
            </div>
            <span className={styles.op}>&</span>
            <div
              className={nodeCls(
                bOn && labVizStyles.nodeActive,
                done && labVizStyles.nodeOk,
                !bOn && phase !== 'idle' && styles.dim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>Timestamped</span>
              <span className={labVizStyles.nodeSub}>createdAt</span>
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
              <span className={labVizStyles.nodeLabel}>оба набора</span>
              <span className={labVizStyles.nodeSub}>
                {done ? '{ id, name, createdAt }' : phase === 'b' ? 'склеиваем…' : 'ждёт &'}
              </span>
            </div>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const utilityTitle = caseId === 'pick' ? 'Pick' : 'Partial'
  const utilityMeta =
    done
      ? caseId === 'pick'
        ? 'id · name'
        : 'все поля?'
      : caseId === 'pick'
        ? 'Pick<User, K>'
        : 'Partial<User>'

  return (
    <LabVizPanel title={utilityTitle} meta={utilityMeta}>
      <div className={styles.stage}>
        <div className={styles.row}>
          <div className={nodeCls(aOn && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
            <span className={labVizStyles.nodeLabel}>User</span>
            <span className={labVizStyles.nodeSub}>id · name · email</span>
          </div>
          <span className={styles.op}>{caseId === 'pick' ? 'Pick' : 'Partial'}</span>
          <div
            className={nodeCls(
              bOn && labVizStyles.nodeActive,
              done && labVizStyles.nodeOk,
              !bOn && phase !== 'idle' && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>
              {caseId === 'pick' ? '"id" | "name"' : 'все ключи'}
            </span>
            <span className={labVizStyles.nodeSub}>аргумент утилиты</span>
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
            <span className={labVizStyles.nodeLabel}>результат</span>
            <FieldChips
              fields={['id', 'name', 'email']}
              phase={phase === 'idle' || phase === 'a' ? 'idle' : phase}
              mode={caseId === 'pick' ? 'pick' : 'partial'}
            />
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: PatternId
  disabled?: boolean
  onChange: (id: PatternId) => void
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

function CaseSwitch({
  pattern,
  value,
  disabled,
  onChange,
}: {
  pattern: PatternId
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES[pattern].map((c) => (
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

const HINTS: Record<CaseId, string> = {
  iface: 'User = WithId + name без дубля id',
  constraint: 'без id вызов pluckId не пройдёт проверку',
  union: 'значение — Ok или Err, не оба сразу',
  intersect: 'нужны id, name и createdAt вместе',
  pick: 'email отброшен — остались id и name',
  partial: 'черновик: id?, name?, email?',
}

const LOGS: Record<CaseId, string> = {
  iface: 'User extends WithId → { id, name }',
  constraint: 'T extends { id } → row.id доступен',
  union: 'Result = Ok | Err',
  intersect: 'StoredUser = User & Timestamped',
  pick: 'Pick → { id, name }',
  partial: 'Partial → все поля опциональны',
}

export function TsTypeTransformsLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<PatternId>('extends')
  const [caseId, setCaseId] = useState<CaseId>('iface')
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

  const selectPattern = (next: PatternId) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
    setCaseId(CASES[next][0].id)
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
        () => setPhase('a'),
        () => setPhase('b'),
        () => {
          setPhase('done')
          log('ok', LOGS[caseId])
          setHint(HINTS[caseId])
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
    setPattern('extends')
    setCaseId('iface')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />
      <CaseSwitch pattern={pattern} value={caseId} disabled={busy} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <TransformsViz caseId={caseId} phase={phase} focusRef={focusRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <CaseSwitch pattern={pattern} value={caseId} onChange={selectCase} />
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
      title="Преобразование типов"
      lead="extends, | / & и Utility Types — одна картина на выбранный кейс."
      problem={problem}
      code={code}
    />
  )
}
