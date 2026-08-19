import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ProxyReflectLab.module.css'

const TOPIC_ID = '266-js-proxy-reflect'
const STEP = 0.65
const DEFAULT_MISSING = 'не задано'

type CaseId = 'default' | 'validate' | 'keys'
type Phase = 'idle' | 'client' | 'trap' | 'reflect' | 'target' | 'result' | 'reject' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'default', label: 'get · default' },
  { id: 'validate', label: 'set · отказ' },
  { id: 'keys', label: 'Reflect.ownKeys' },
]

const PAIN = (
  <>
    Без <code>Proxy</code> чтение и записи идут прямо в объект. Обёртка перехватывает операции в trap и
    через <code>Reflect</code> делегирует к <code>target</code> с учётом <code>receiver</code> или подменяет
    результат — так строят валидацию, лог и реактивность.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  default: (
    <>
      <code>profile.city</code> не в <code>target</code> — trap <code>get</code> возвращает default,
      без поля на объекте.
    </>
  ),
  validate: (
    <>
      <code>balance = -10</code> trap <code>set</code> отклоняет: <code>return false</code>, значение
      на <code>target</code> не меняется.
    </>
  ),
  keys: (
    <>
      <code>Reflect.ownKeys(proxy)</code> видит символ; <code>Object.keys</code> — только строковые
      enumerable ключи.
    </>
  ),
}

const CODE_INTRO =
  'Trap get/set и Reflect.ownKeys: делегация через Reflect.get/set, не голый target[key].'

const CODE_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'get-default',
    label: 'src/proxy/profileProxy.js',
    note: 'get trap: Reflect.get если ключ есть, иначе default.',
    executable: false,
    languageLabel: 'js',
    code: `const user = { name: 'Alex' };

const profile = new Proxy(user, {
  get(target, prop, receiver) {
    if (prop in target) {
      return Reflect.get(target, prop, receiver); // ← receiver для геттеров
    }
    return 'не задано'; // ← default без поля на target
  },
});

profile.name; // 'Alex' ← из target
profile.city; // 'не задано' ← trap`,
  },
  {
    id: 'set-validate',
    label: 'src/proxy/guardedAccount.js',
    note: 'set trap: return false отклоняет присваивание в strict.',
    executable: false,
    languageLabel: 'js',
    code: `const account = { balance: 100 };

const guarded = new Proxy(account, {
  set(target, prop, value, receiver) {
    if (prop === 'balance' && value < 0) {
      return false; // ← отказ, balance не меняется
    }
    return Reflect.set(target, prop, value, receiver);
  },
});

guarded.balance = 50;  // ok
guarded.balance = -10; // TypeError (strict)`,
  },
  {
    id: 'own-keys',
    label: 'src/proxy/reflectKeys.js',
    note: 'Reflect.ownKeys vs Object.keys на proxy.',
    executable: false,
    languageLabel: 'js',
    code: `const sym = Symbol('id');
const raw = { a: 1, [sym]: 2 };
const p = new Proxy(raw, {}); // ← проброс без trap

Reflect.ownKeys(p); // ['a', Symbol(id)] ← строки + символы
Object.keys(p);     // ['a'] ← без символов`,
  },
]

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
    defaults: { duration: STEP, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function nodeCls(active: boolean, ok = false, warn = false, dim = false) {
  return [
    styles.runtimeNode,
    active && styles.runtimeNodeActive,
    ok && styles.runtimeNodeOk,
    warn && styles.runtimeNodeWarn,
    dim && styles.runtimeNodeDim,
  ]
    .filter(Boolean)
    .join(' ')
}

type VizState = {
  targetLabel: string
  resultLabel: string
  chips: Array<{ label: string; warn?: boolean; ok?: boolean }>
}

type RuntimeVizProps = {
  caseId: CaseId
  phase: Phase
  viz: VizState
}

function RuntimeViz({ caseId, phase, viz }: RuntimeVizProps) {
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? caseId === 'default'
          ? 'default из trap'
          : caseId === 'validate'
            ? 'присваивание отклонено'
            : 'ownKeys vs keys'
        : 'перехват…'

  if (caseId === 'keys') {
    return (
      <LabVizPanel title="ключи на proxy" meta={meta}>
        <div className={styles.runtimeScene}>
          <div className={nodeCls(phase === 'client' || phase === 'done', phase === 'done')}>
            <span className={styles.runtimeTitle}>код</span>
            <span className={styles.runtimeProp}>Reflect.ownKeys(p) · Object.keys(p)</span>
          </div>
          <span className={styles.runtimeLink}>↓ proxy (проброс)</span>
          <div className={nodeCls(phase === 'trap' || phase === 'done', phase === 'done')}>
            <span className={styles.runtimeTitle}>trap ownKeys</span>
            <span className={styles.runtimeProp}>делегирует к target</span>
          </div>
          <span className={styles.runtimeLink}>↓ target</span>
          <div className={nodeCls(phase === 'target' || phase === 'done', phase === 'done')}>
            <span className={styles.runtimeTitle}>raw</span>
            <span className={styles.runtimeProp}>{viz.targetLabel}</span>
          </div>
          <span className={styles.runtimeLink}>↓ результат</span>
          <div className={nodeCls(phase === 'result' || phase === 'done', phase === 'done')}>
            <span className={styles.runtimeTitle}>сравнение</span>
            <span className={styles.runtimeProp}>{viz.resultLabel}</span>
          </div>
        </div>
        <div className={styles.stateRow}>
          {viz.chips.map((c) => (
            <span
              key={c.label}
              className={[
                styles.stateChip,
                c.ok && styles.stateChipOk,
                c.warn && styles.stateChipWarn,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {c.label}
            </span>
          ))}
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title="proxy перехватывает операцию" meta={meta}>
      <div className={styles.runtimeScene}>
        <div
          className={`${styles.runtimeBadge} ${phase !== 'idle' && phase !== 'done' ? styles.runtimeBadgeActive : ''}`}
        >
          {caseId === 'default' ? 'profile.city' : 'guarded.balance = -10'}
        </div>
        <span className={styles.runtimeLink}>↓ чтение / записи</span>
        <div className={nodeCls(phase === 'client' || phase === 'done', phase === 'done')}>
          <span className={styles.runtimeTitle}>код</span>
          <span className={styles.runtimeProp}>
            {caseId === 'default' ? 'читает profile.city' : 'присваивает balance'}
          </span>
        </div>
        <span className={styles.runtimeLink}>↓ trap</span>
        <div
          className={nodeCls(
            phase === 'trap' || phase === 'done',
            caseId === 'default' && phase === 'done',
            caseId === 'validate' && (phase === 'reject' || phase === 'done'),
          )}
        >
          <span className={styles.runtimeTitle}>{caseId === 'default' ? 'trap get' : 'trap set'}</span>
          <span className={styles.runtimeProp}>
            {caseId === 'default' ? 'ключ не в target → default' : 'value < 0 → return false'}
          </span>
        </div>
        {caseId === 'default' ? (
          <>
            <span className={styles.runtimeLink}>↓ Reflect.get или default</span>
            <div className={nodeCls(phase === 'reflect' || phase === 'done', phase === 'done')}>
              <span className={styles.runtimeTitle}>Reflect.get</span>
              <span className={styles.runtimeProp}>name есть · city нет</span>
            </div>
          </>
        ) : (
          <span className={styles.runtimeLink}>↓ без Reflect.set</span>
        )}
        <div className={nodeCls(phase === 'target' || phase === 'done', phase === 'done', caseId === 'validate')}>
          <span className={styles.runtimeTitle}>target</span>
          <span className={styles.runtimeProp}>{viz.targetLabel}</span>
        </div>
        <span className={styles.runtimeLink}>↓ в выражение</span>
        <div className={nodeCls(phase === 'result' || phase === 'done', phase === 'done')}>
          <span className={styles.runtimeTitle}>результат</span>
          <span className={styles.runtimeProp}>{viz.resultLabel}</span>
        </div>
      </div>
      <div className={styles.stateRow}>
        {viz.chips.map((c) => (
          <span
            key={c.label}
            className={[
              styles.stateChip,
              c.ok && styles.stateChipOk,
              c.warn && styles.stateChipWarn,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {c.label}
          </span>
        ))}
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const [caseId, setCaseId] = useState<CaseId>('default')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [viz, setViz] = useState<VizState>({
    targetLabel: '{ name: "Alex" }',
    resultLabel: '…',
    chips: [],
  })

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
    setViz({
      targetLabel: '{ name: "Alex" }',
      resultLabel: '…',
      chips: [],
    })
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  const runDefault = () => {
    const target = { name: 'Alex' }
    const profile = new Proxy(target, {
      get(t, prop, receiver) {
        if (prop in t) return Reflect.get(t, prop, receiver)
        return DEFAULT_MISSING
      },
    })

    const name = profile.name
    const city = (profile as Record<string, unknown>).city as string
    const hasCityOnTarget = 'city' in target

    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'profile.name и profile.city')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('client')
          log('info', 'читаем profile.city')
        },
        () => {
          setPhase('trap')
          setViz({
            targetLabel: JSON.stringify(target),
            resultLabel: `city → "${city}"`,
            chips: [
              { label: `name: ${name}`, ok: true },
              { label: `city: ${city}`, warn: true },
              { label: `city in target: ${hasCityOnTarget}`, warn: true },
            ],
          })
          log('ok', `name="${name}"`)
        },
        () => {
          setPhase('reflect')
          log('info', 'city не в target — trap без Reflect.get')
        },
        () => {
          setPhase('target')
          log('ok', `target keys: [${Object.keys(target).join(', ')}]`)
        },
        () => {
          setPhase('result')
          log('ok', `city="${city}" · поле на target не создано`)
        },
        () => {
          setPhase('done')
          log('ok', 'default из trap get')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runValidate = () => {
    const target = { balance: 100 }
    let setRejected = false

    const guarded = new Proxy(target, {
      set(t, prop, value, receiver) {
        if (prop === 'balance' && typeof value === 'number' && value < 0) {
          setRejected = true
          return false
        }
        return Reflect.set(t, prop, value, receiver)
      },
    })

    guarded.balance = 50
    try {
      guarded.balance = -10
    } catch {
      // strict assignment through proxy may throw in some contexts
    }
    const rejected = setRejected || target.balance !== -10

    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'balance = 50, затем balance = -10')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('client')
          log('ok', 'balance = 50 прошло')
        },
        () => {
          setPhase('trap')
          setViz({
            targetLabel: `balance: ${target.balance}`,
            resultLabel: rejected ? 'set отклонён' : 'ошибка демо',
            chips: [
              { label: `balance: ${target.balance}`, ok: true },
              { label: '-10 не записан', warn: true },
            ],
          })
          log('info', 'trap set: value < 0')
        },
        () => {
          setPhase('reject')
          log('err', 'return false — balance не изменился')
        },
        () => {
          setPhase('target')
          log('ok', `target.balance = ${target.balance}`)
        },
        () => {
          setPhase('result')
          setViz((v) => ({
            ...v,
            resultLabel: `balance остался ${target.balance}`,
            chips: [
              { label: `balance: ${target.balance}`, ok: true },
              { label: 'trap отказал', warn: true },
            ],
          }))
        },
        () => {
          setPhase('done')
          log('ok', 'Reflect.set не вызван для -10')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runKeys = () => {
    const sym = Symbol('id')
    const raw = { a: 1, [sym]: 2 }
    const p = new Proxy(raw, {})
    const own = Reflect.ownKeys(p)
    const keys = Object.keys(p)
    const ownLabels = own.map((k) => (typeof k === 'symbol' ? 'Symbol(id)' : String(k)))
    const targetLabel = '{ a: 1, [Symbol(id)]: 2 }'

    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'Reflect.ownKeys(p) и Object.keys(p)')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('client')
          log('info', 'сравнение ключей')
        },
        () => {
          setPhase('trap')
          setViz({
            targetLabel,
            resultLabel: `ownKeys: ${ownLabels.join(', ')}`,
            chips: [
              { label: `ownKeys: ${own.length}`, ok: true },
              { label: `keys: ${keys.length}`, warn: true },
            ],
          })
        },
        () => {
          setPhase('target')
          log('ok', `ownKeys: [${ownLabels.join(', ')}]`)
        },
        () => {
          setPhase('result')
          setViz({
            targetLabel,
            resultLabel: `keys: [${keys.join(', ')}]`,
            chips: [
              { label: `Reflect.ownKeys → ${ownLabels.join(', ')}`, ok: true },
              { label: `Object.keys → ${keys.join(', ')}`, warn: true },
            ],
          })
          log('ok', `Object.keys: [${keys.join(', ')}] — без Symbol`)
        },
        () => {
          setPhase('done')
          log('ok', 'символ виден только в ownKeys')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const onRun = () => {
    if (running) return
    resetVisual()
    if (caseId === 'default') runDefault()
    else if (caseId === 'validate') runValidate()
    else runKeys()
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint: Record<CaseId, string> = {
    default: 'Итог: trap get подставил default; на target поле city не появилось.',
    validate: 'Итог: trap set вернул false — balance на target не стал отрицательным.',
    keys: 'Итог: Reflect.ownKeys включает символы; Object.keys — только строковые enumerable.',
  }

  return (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={running}
            onClick={() => onCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
      <div className={shell.row}>
        <LabButton variant="primary" size="sm" disabled={running} onClick={onRun}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" size="sm" disabled={running} onClick={onReset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <RuntimeViz caseId={caseId} phase={phase} viz={viz} />

      {finished ? <p className={shell.hint}>{hint[caseId]}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

export function ProxyReflectLab() {
  return (
    <JsLabShell
      title="Proxy и Reflect: перехват операций"
      lead="Trap на proxy перехватывает чтение и записи; Reflect — зеркало для корректной делегации к target."
      problem={<ProblemPanel />}
      code={
        <div className={shell.codePane}>
          <InteractiveCodePanel topicId={TOPIC_ID} intro={CODE_INTRO} snippets={CODE_SNIPPETS} />
        </div>
      }
    />
  )
}
