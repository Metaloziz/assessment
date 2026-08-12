import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import styles from './IncrementalIterativeSpiralLab.module.css'

gsap.registerPlugin(useGSAP)

const TOPIC_ID = '259-software-incremental-iterative-spiral'

type Model = 'incremental' | 'iterative' | 'spiral'
type Step = 0 | 1 | 2 | 3
type FeatureId = 'auth' | 'cart' | 'pay'
type FeatureKind = 'empty' | 'sketch' | 'mid' | 'risk' | 'done'

const FEATURES: Array<{ id: FeatureId; label: string }> = [
  { id: 'auth', label: 'Auth' },
  { id: 'cart', label: 'Cart' },
  { id: 'pay', label: 'Pay' },
]

function featureKind(model: Model, step: Step, id: FeatureId): FeatureKind {
  if (step === 0) return 'empty'

  if (model === 'incremental') {
    const order: FeatureId[] = ['auth', 'cart', 'pay']
    const ready = order.slice(0, step)
    return ready.includes(id) ? 'done' : 'empty'
  }

  if (model === 'iterative') {
    if (step === 1) return 'sketch'
    if (step === 2) return 'mid'
    return 'done'
  }

  const riskAt: Record<Step, FeatureId | null> = {
    0: null,
    1: 'pay',
    2: 'auth',
    3: 'cart',
  }
  const doneBy: Record<FeatureId, Step> = { pay: 2, auth: 3, cart: 3 }
  if (riskAt[step] === id) return 'risk'
  if (step >= doneBy[id]) return 'done'
  if (id === 'pay' && step >= 1) return 'sketch'
  return 'empty'
}

function kindLabel(kind: FeatureKind, model: Model): string {
  if (kind === 'empty') return 'пусто'
  if (kind === 'risk') return 'риск цикла'
  if (kind === 'done') return 'готово'
  if (kind === 'mid') return 'точнее'
  if (kind === 'sketch') return model === 'iterative' ? 'заглушка' : 'прототип'
  return 'прототип'
}

function nodeClass(kind: FeatureKind): string {
  if (kind === 'done') return `${styles.node} ${styles.nodeOk}`
  if (kind === 'risk') return `${styles.node} ${styles.nodeActive}`
  if (kind === 'mid') return `${styles.node} ${styles.nodeMid}`
  if (kind === 'sketch') return `${styles.node} ${styles.nodeSketch}`
  return styles.node
}

function metaFor(model: Model, step: Step): string {
  if (step === 0) return 'такт 0'
  if (model === 'incremental') return `такт ${step}: срез по ROADMAP`
  if (model === 'iterative') return `такт ${step}: тот же контур`
  const risks = ['', 'шлюз Pay', 'сессии Auth', 'остаток Cart']
  return `цикл ${step}: ${risks[step]}`
}

function logLine(model: Model, step: Step): { kind: 'ok' | 'info' | 'warn'; text: string } {
  if (model === 'incremental') {
    const slice = ['', 'Auth', 'Cart', 'Pay'][step]
    return { kind: 'ok', text: `v0.${step}: ${slice} можно выкатить, остальное пусто` }
  }
  if (model === 'iterative') {
    if (step === 1) return { kind: 'info', text: 'все три экрана-заглушки — контур есть, среза нет' }
    if (step === 2) return { kind: 'info', text: 'тот же checkout: валидация и ошибки' }
    return { kind: 'ok', text: 'контур тот же, качество выросло — это итерация' }
  }
  if (step === 1) return { kind: 'warn', text: 'цикл 1: неизвестен шлюз → прототип Pay, не Auth' }
  if (step === 2) return { kind: 'warn', text: 'цикл 2: риск сессий → Auth; Pay уже не пустой' }
  return { kind: 'ok', text: 'цикл 3: Cart; порядок задал риск, не roadmap' }
}

function hintFor(model: Model): string {
  if (model === 'incremental') return 'готовый срез слева направо; пустые соседи — норма'
  if (model === 'iterative') return 'все части сразу, на такте качество выше'
  return 'Pay раньше Auth: в центре риск, не удобный бэклог'
}

type VizProps = { model: Model; step: Step }

function DeliveryViz({ model, step }: VizProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useGSAP(
    () => {
      if (reduced || !rootRef.current) return
      gsap.fromTo(
        rootRef.current.querySelectorAll('[data-node]'),
        { opacity: 0.55, y: 4 },
        { opacity: 1, y: 0, duration: 0.28, stagger: 0.05, ease: 'power2.out' },
      )
    },
    { scope: rootRef, dependencies: [model, step] },
  )

  const title =
    model === 'incremental' ? 'Инкремент' : model === 'iterative' ? 'Итерация' : 'Спираль'

  return (
    <div ref={rootRef} className={styles.viz}>
      <div className={styles.vizHead}>
        <p className={styles.vizTitle}>{title}</p>
        <p className={styles.vizMeta}>{metaFor(model, step)}</p>
      </div>
      <div className={styles.flow}>
        {FEATURES.map((f) => {
          const kind = featureKind(model, step, f.id)
          return (
            <div key={f.id} data-node className={nodeClass(kind)}>
              <span className={styles.nodeLabel}>{f.label}</span>
              <span className={styles.nodeSub}>{kindLabel(kind, model)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function IncrementalIterativeSpiralLab() {
  const { lines, log, clear } = useLabLog()
  const [model, setModel] = useState<Model>('incremental')
  const [step, setStep] = useState<Step>(0)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const run = async () => {
    clear()
    setHint(null)
    setBusy(true)
    setStep(0)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      for (const s of [1, 2, 3] as const) {
        if (!reduced) await new Promise((r) => setTimeout(r, 380))
        setStep(s)
        const line = logLine(model, s)
        log(line.kind, line.text)
      }
      setHint(hintFor(model))
    } finally {
      setBusy(false)
    }
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Checkout из <code>Auth</code>, <code>Cart</code>, <code>Pay</code>: шлюз ещё неизвестен, а
        roadmap зовёт начать с логина. От модели зависит, что будет готово через три такта.
      </p>
      <ol className={shell.steps}>
        <li>Выберите модель и нажмите «Прогнать» — три такта на схеме.</li>
        <li>
          Спираль должна зажечь <code>Pay</code> раньше <code>Auth</code>.
        </li>
        <li>
          В «Код»: <code>ROADMAP.md</code>, <code>checkout.md</code>, <code>risk-register.yml</code>.
        </li>
      </ol>

      <DeliveryViz model={model} step={step} />

      <div className={shell.row}>
        {(
          [
            ['incremental', 'Инкремент'],
            ['iterative', 'Итерация'],
            ['spiral', 'Спираль'],
          ] as const
        ).map(([id, label]) => (
          <LabButton
            key={id}
            variant="ghost"
            size="sm"
            active={model === id}
            disabled={busy}
            onClick={() => {
              setModel(id)
              setStep(0)
              setHint(null)
            }}
          >
            {label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={() => void run()}>
          Прогнать
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => {
            clear()
            setHint(null)
            setModel('incremental')
            setStep(0)
          }}
        >
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите модель и прогоните три такта.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Один checkout: инкременты в `ROADMAP.md`, уточнение того же контура в `checkout.md`, риск в `risk-register.yml`."
      snippets={[
        {
          id: 'roadmap',
          label: 'docs/ROADMAP.md',
          languageLabel: 'markdown',
          note: 'Каждый `v0.x` — готовый срез. Соседи могут быть пустыми.',
          executable: false,
          code: `# Checkout

## v0.1 Auth
- регистрация, сессия, выход
- можно выкатить на staging
# ← INCREMENT: готовый срез, Cart/Pay ещё нет

## v0.2 Cart
- состав заказа, количество
# ← INCREMENT: Auth уже в проде

## v0.3 Pay
- оплата, чек, возврат
`,
        },
        {
          id: 'checkout',
          label: 'docs/checkout.md',
          languageLabel: 'markdown',
          note: 'Тот же документ на трёх проходах — не новые фичи, а точность.',
          executable: false,
          code: `# Checkout (один контур)

## Итерация 1
Экраны Auth / Cart / Pay — заглушки, счастливый путь кликами.
# ← ITERATE: контур есть, среза «можно продавать» нет

## Итерация 2
Валидация, ошибки шлюза, пустая корзина.
# ← ITERATE: те же три части, поведение точнее

## Итерация 3
UX, доступность, идемпотентность оплаты.
# ← ITERATE: качество ↑, состав фич тот же
`,
        },
        {
          id: 'risk',
          label: 'docs/risk-register.yml',
          languageLabel: 'yaml',
          note: '`top_risk` задаёт порядок: Pay раньше Auth.',
          executable: false,
          code: `# Спираль: виток = риск + прототип, не строка ROADMAP

cycles:
  - id: 1
    top_risk: payment_gateway # ← SPIRAL: неизвестен шлюз
    prototype: pay_sandbox
    skip: [auth, cart]
  - id: 2
    top_risk: session_theft # ← SPIRAL: теперь сессии
    prototype: auth_http_only
    already: [pay_sandbox]
  - id: 3
    top_risk: leftover_cart
    slice: cart
    already: [pay_sandbox, auth_http_only]
`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Инкремент · итерация · спираль"
      lead="Три такта одного checkout: готовые срезы, уточнение контура, цикл вокруг риска."
      problem={problem}
      code={code}
    />
  )
}
