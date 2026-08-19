import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ClassEngineLab.module.css'

const TOPIC_ID = '113-js-class-engine'
const STEP = 0.65

type CaseId = 'static' | 'private' | 'subclass'
type Phase = 'idle' | 'source' | 'ctor' | 'proto' | 'instance' | 'slot' | 'block' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'static', label: 'Статика на конструкторе' },
  { id: 'private', label: 'Приватное поле' },
  { id: 'subclass', label: 'Подкласс без доступа' },
]

const PAIN = (
  <>
    Запись <code>class</code> превращается в конструктор и прототип, но{' '}
    <code>static</code> и <code>#private</code> лежат не там, где методы экземпляра. Без этой
    карты легко искать <code>taxRate</code> на объекте или <code>#balance</code> в{' '}
    <code>Object.keys</code>.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  static: (
    <>
      <code>Counter.count</code> живёт на конструкторе; у экземпляра своего{' '}
      <code>count</code> нет — только общий счётчик класса.
    </>
  ),
  private: (
    <>
      У счёта виден только <code>id</code> в ключах; <code>#balance</code> в слоте движка — снаружи
      не прочитать, через <code>getBalance()</code> внутри класса — да.
    </>
  ),
  subclass: (
    <>
      У <code>Savings</code> своё <code>#bonus</code>, но к <code>#balance</code> родителя код
      наследника не имеет доступа — только через публичный <code>deposit()</code>.
    </>
  ),
}

const CODE_INTRO =
  'Статика на конструкторе; `#поле` — слот движка, не строковый ключ объекта.'

const CODE_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'bank-static',
    label: 'src/classes/bankAccount.js',
    note: 'Static — на конструкторе; фабрика create() вызывает new this(...).',
    executable: false,
    languageLabel: 'js',
    code: `class BankAccount {
  static taxRate = 0.13; // ← static field на BankAccount

  static create(id) {
    return new this(id); // ← this = конструктор (BankAccount или наследник)
  }

  constructor(id) {
    this.id = id;
  }
}

const acc = BankAccount.create('A1');
BankAccount.taxRate; // 0.13 ← с конструктора
acc.taxRate; // undefined ← на экземпляре static нет`,
  },
  {
    id: 'wallet-private',
    label: 'src/classes/wallet.js',
    note: '#balance не попадает в Object.keys; доступ только из методов класса.',
    executable: false,
    languageLabel: 'js',
    code: `class Wallet {
  #balance = 0; // ← private slot, не own-ключ

  credit(amount) {
    this.#balance += amount; // ← brand этого класса
  }

  read() {
    return this.#balance;
  }
}

const w = new Wallet();
w.credit(50);
Object.keys(w); // [] или без #balance
w.read(); // 50
// w.#balance — SyntaxError снаружи`,
  },
  {
    id: 'savings-subclass',
    label: 'src/classes/savings.js',
    note: 'У подкласса своё #bonus; #balance родителя из Savings недоступен.',
    executable: false,
    languageLabel: 'js',
    code: `class BankAccount {
  #balance = 0;
  deposit(n) { this.#balance += n; }
  balance() { return this.#balance; }
}

class Savings extends BankAccount {
  #bonus = 0;

  addBonus(n) {
    this.#bonus += n;
    // this.#balance — TypeError: не объявлено в Savings
    this.deposit(n); // ← родительский метод трогает #balance внутри
  }
}`,
  },
]

class CounterDemo {
  static count = 0
  constructor() {
    CounterDemo.count += 1
  }
}

class AccountDemo {
  static taxRate = 0.13
  #balance = 0
  id: string
  constructor(id: string) {
    this.id = id
  }
  deposit(amount: number) {
    this.#balance += amount
  }
  getBalance() {
    return this.#balance
  }
}

class SavingsDemo extends AccountDemo {
  #bonus = 0
  addBonus(amount: number) {
    this.#bonus += amount
    this.deposit(amount)
  }
  getBonus() {
    return this.#bonus
  }
}

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

type RuntimeVizProps = {
  caseId: CaseId
  phase: Phase
}

function RuntimeViz({ caseId, phase }: RuntimeVizProps) {
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? caseId === 'static'
          ? 'static на конструкторе'
          : caseId === 'private'
            ? '#balance в слоте'
            : 'родительский # закрыт'
        : 'разбор…'

  if (caseId === 'static') {
    return (
      <LabVizPanel title="куда ложится static" meta={meta}>
        <div className={styles.runtimeScene}>
          <div
            className={`${styles.runtimeBadge} ${phase !== 'idle' && phase !== 'done' ? styles.runtimeBadgeActive : ''}`}
          >
            class Counter {'{ static count … }'}
          </div>
          <span className={styles.runtimeLink}>↓ в рантайме</span>
          <div className={nodeCls(phase === 'ctor' || phase === 'done', phase === 'done')}>
            <span className={styles.runtimeTitle}>Counter (конструктор)</span>
            <span className={styles.runtimeProp}>.count = N ← static здесь</span>
          </div>
          <span className={styles.runtimeLink}>↓ new Counter()</span>
          <div
            className={nodeCls(
              phase === 'instance' || phase === 'done',
              false,
              phase === 'instance' || phase === 'done',
              phase === 'ctor',
            )}
          >
            <span className={styles.runtimeTitle}>экземпляр</span>
            <span className={styles.runtimeProp}>нет .count — только Counter.count</span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  if (caseId === 'private') {
    return (
      <LabVizPanel title="где лежит #balance" meta={meta}>
        <div className={styles.runtimeScene}>
          <div className={nodeCls(phase === 'instance' || phase === 'done', phase === 'done')}>
            <span className={styles.runtimeTitle}>acc (экземпляр)</span>
            <span className={styles.runtimeProp}>own: id — виден в keys</span>
          </div>
          <span className={styles.runtimeLink}>+ слот движка</span>
          <div className={nodeCls(phase === 'slot' || phase === 'done', phase === 'done')}>
            <span className={styles.runtimeTitle}>#balance</span>
            <span className={styles.runtimeProp}>не ключ объекта · brand AccountDemo</span>
          </div>
          <span className={styles.runtimeLink}>↓ прототип</span>
          <div className={nodeCls(phase === 'proto' || phase === 'done', false, false, phase === 'slot')}>
            <span className={styles.runtimeTitle}>AccountDemo.prototype</span>
            <span className={styles.runtimeProp}>deposit(), getBalance()</span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title="private у родителя и наследника" meta={meta}>
      <div className={styles.runtimeScene}>
        <div className={nodeCls(phase === 'source' || phase === 'done', phase === 'done')}>
          <span className={styles.runtimeTitle}>AccountDemo</span>
          <span className={styles.runtimeProp}>#balance — brand родителя</span>
        </div>
        <span className={styles.runtimeLink}>↓ extends</span>
        <div className={nodeCls(phase === 'instance' || phase === 'done', phase === 'done')}>
          <span className={styles.runtimeTitle}>SavingsDemo</span>
          <span className={styles.runtimeProp}>#bonus — своё private</span>
        </div>
        <span className={styles.runtimeLink}>↓ попытка из Savings</span>
        <div className={nodeCls(phase === 'block' || phase === 'done', false, phase === 'block' || phase === 'done')}>
          <span className={styles.runtimeTitle}>this.#balance</span>
          <span className={styles.runtimeProp}>TypeError — не объявлено в Savings</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const [caseId, setCaseId] = useState<CaseId>('static')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  const runStatic = () => {
    CounterDemo.count = 0
    new CounterDemo()
    new CounterDemo()
    const last = new CounterDemo()

    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'три new Counter()')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('source')
          log('info', 'class → конструктор + prototype')
        },
        () => {
          setPhase('ctor')
          log('ok', `Counter.count = ${CounterDemo.count}`)
        },
        () => {
          setPhase('instance')
          log('info', `у экземпляра count? ${Object.prototype.hasOwnProperty.call(last, 'count')}`)
        },
        () => {
          setPhase('done')
          log('ok', 'static только на Counter')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runPrivate = () => {
    const acc = new AccountDemo('A1')
    acc.deposit(100)
    const keys = Object.keys(acc)

    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'new AccountDemo + deposit(100)')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('instance')
          log('ok', `keys: [${keys.join(', ')}]`)
        },
        () => {
          setPhase('slot')
          log('info', '#balance не в keys')
        },
        () => {
          setPhase('proto')
          log('ok', `getBalance() → ${acc.getBalance()}`)
        },
        () => {
          setPhase('done')
          log('ok', 'private только из методов класса')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runSubclass = () => {
    const s = new SavingsDemo('S1')
    s.addBonus(20)
    const keys = Object.keys(s)

    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'Savings.addBonus(20)')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('source')
          log('info', 'AccountDemo.#balance — brand родителя')
        },
        () => {
          setPhase('instance')
          log('ok', `bonus=${s.getBonus()}, balance=${s.getBalance()}`)
        },
        () => {
          setPhase('block')
          log('err', 'this.#balance в Savings — SyntaxError в исходнике')
        },
        () => {
          setPhase('done')
          log('ok', `keys: [${keys.join(', ')}] · deposit() родителя — ок`)
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
    if (caseId === 'static') runStatic()
    else if (caseId === 'private') runPrivate()
    else runSubclass()
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint: Record<CaseId, string> = {
    static: 'Итог: static — свойство конструктора; экземпляры делят один Counter.count.',
    private: 'Итог: #balance в internal slot; Object.keys его не показывает.',
    subclass: 'Итог: у наследника своё #bonus; #balance родителя снаружи класса BankAccount недоступен.',
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

      <RuntimeViz caseId={caseId} phase={phase} />

      {finished ? <p className={shell.hint}>{hint[caseId]}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

export function ClassEngineLab() {
  return (
    <JsLabShell
      title="Class в рантайме: static и #private"
      lead="Синтаксис class превращается в конструктор и прототип; static — на конструкторе, #поле — в слоте движка."
      problem={<ProblemPanel />}
      code={
        <div className={shell.codePane}>
          <InteractiveCodePanel topicId={TOPIC_ID} intro={CODE_INTRO} snippets={CODE_SNIPPETS} />
        </div>
      }
    />
  )
}
