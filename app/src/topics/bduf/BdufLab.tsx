import { useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import styles from './BdufLab.module.css'

gsap.registerPlugin(useGSAP)

const TOPIC_ID = '53-bduf'
const STEP = 0.65

type Mode = 'bduf' | 'enough'
type CaseId = 'stall' | 'pivot' | 'skeleton' | 'risk'
type Tick = 0 | 1 | 2 | 3
type FeatureId = 'auth' | 'cart' | 'pay'
type DocId = 'spec' | 'uml' | 'openapi' | 'runbook'

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'bduf', label: 'BDUF' },
  { id: 'enough', label: 'Достаточно' },
]

const CASES: Record<Mode, Array<{ id: CaseId; label: string }>> = {
  bduf: [
    { id: 'stall', label: 'Стопка spec' },
    { id: 'pivot', label: 'Смена требований' },
  ],
  enough: [
    { id: 'skeleton', label: 'Walking skeleton' },
    { id: 'risk', label: 'Риск Pay первым' },
  ],
}

const DOCS: Array<{ id: DocId; label: string }> = [
  { id: 'spec', label: 'Spec v3' },
  { id: 'uml', label: 'UML' },
  { id: 'openapi', label: 'OpenAPI' },
  { id: 'runbook', label: 'Runbook' },
]

const FEATURES: Array<{ id: FeatureId; label: string }> = [
  { id: 'auth', label: 'Auth' },
  { id: 'cart', label: 'Cart' },
  { id: 'pay', label: 'Pay' },
]

function docVisible(mode: Mode, caseId: CaseId, tick: Tick, id: DocId): boolean {
  if (tick === 0) return false
  if (mode === 'bduf') {
    if (caseId === 'pivot' && tick >= 2 && id === 'spec') return false
    const order: DocId[] = ['spec', 'uml', 'openapi', 'runbook']
    const idx = order.indexOf(id)
    if (caseId === 'pivot' && tick === 2) return id === 'uml' || id === 'openapi'
    if (caseId === 'pivot' && tick === 3) return id !== 'spec'
    return idx < tick
  }
  if (tick >= 1 && id === 'spec') return true
  return false
}

function docSub(mode: Mode, caseId: CaseId, tick: Tick, id: DocId): string {
  if (mode === 'bduf' && caseId === 'pivot' && id === 'spec' && tick >= 2) return 'снято'
  if (mode === 'enough' && id === 'spec') {
    if (caseId === 'risk' && tick >= 1) return 'ADR-1 + риск Pay'
    if (tick >= 1) return 'ADR-1'
  }
  if (mode === 'bduf') {
    const pages = ['', '120 стр.', '+ диаграммы', '+ контракт', '+ runbook']
    return pages[tick] ?? ''
  }
  return ''
}

function featureKind(mode: Mode, caseId: CaseId, tick: Tick, id: FeatureId): 'empty' | 'sketch' | 'done' {
  if (tick === 0) return 'empty'

  if (mode === 'bduf') return 'empty'

  if (caseId === 'skeleton') {
    if (id === 'auth' && tick >= 1) return 'done'
    if (id === 'cart' && tick >= 2) return tick === 2 ? 'sketch' : 'done'
    if (id === 'pay' && tick >= 3) return 'sketch'
    return 'empty'
  }

  if (id === 'pay' && tick >= 1) return tick === 1 ? 'sketch' : 'done'
  if (id === 'auth' && tick >= 2) return 'done'
  if (id === 'cart' && tick >= 3) return 'sketch'
  return 'empty'
}

function featureState(kind: 'empty' | 'sketch' | 'done'): LabNodeState {
  if (kind === 'done') return 'ok'
  if (kind === 'sketch') return 'active'
  return 'idle'
}

function metaFor(mode: Mode, caseId: CaseId, tick: Tick): string {
  if (tick === 0) return 'такт 0'
  if (mode === 'bduf') {
    if (caseId === 'pivot' && tick === 2) return `такт ${tick}: spec v3 отменён`
    return `такт ${tick}: проектирование`
  }
  if (caseId === 'risk') return `такт ${tick}: риск Pay, не roadmap`
  return `такт ${tick}: shippable-срез`
}

function logLine(mode: Mode, caseId: CaseId, tick: Tick): { kind: 'ok' | 'info' | 'warn'; text: string } {
  if (mode === 'bduf') {
    if (caseId === 'pivot' && tick === 2) {
      return { kind: 'warn', text: 'OAuth вместо email — spec v3 в корзину, код всё ещё ∅' }
    }
    if (tick === 3) {
      return { kind: 'warn', text: 'Runbook готов, Auth/Cart/Pay в проде нет' }
    }
    return { kind: 'info', text: `+ артефакт такта ${tick}, продукт не выкатывался` }
  }
  if (caseId === 'risk') {
    if (tick === 1) return { kind: 'warn', text: 'прототип Pay на sandbox — риск снят раньше Auth' }
    if (tick === 2) return { kind: 'ok', text: 'v0.2 Auth на staging, Pay уже проверен' }
    return { kind: 'ok', text: 'Cart подключают к известному шлюзу' }
  }
  if (tick === 1) return { kind: 'ok', text: 'v0.1 Auth на staging — первый shippable-срез' }
  if (tick === 2) return { kind: 'info', text: 'Cart заглушка + контракт уточняется в коде' }
  return { kind: 'ok', text: 'Pay после двух срезов, не после 400 страниц spec' }
}

function hintFor(mode: Mode, caseId: CaseId): string {
  if (mode === 'bduf' && caseId === 'pivot') return 'смена требований бьёт по монолитному spec'
  if (mode === 'bduf') return 'бумага растёт, checkout в проде пуст'
  if (caseId === 'risk') return 'порядок задаёт риск, не «сначала Auth в roadmap»'
  return 'ADR + вертикальный срез вместо стопки ТЗ'
}

const PAIN: Record<Mode, ReactNode> = {
  bduf: (
    <>
      Checkout из <code>Auth</code>, <code>Cart</code>, <code>Pay</code>: месяцы уходят в spec и
      диаграммы, а рабочий срез не выкатывают — обратная связь откладывается.
    </>
  ),
  enough: (
    <>
      Достаточный дизайн: короткий <code>ADR</code>, walking skeleton и прототип риска. Спецификация
      растёт **вместе** с кодом, а не блокирует его.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  stall: (
    <>
      Три такта добавляют <code>Spec</code>, <code>UML</code>, <code>OpenAPI</code> —{' '}
      <code>Auth</code>/<code>Cart</code>/<code>Pay</code> остаются пустыми.
    </>
  ),
  pivot: (
    <>
      На такте 2 продукт просит OAuth вместо email — «финальный» <code>Spec v3</code> снимают, код
      так и не стартовал.
    </>
  ),
  skeleton: (
    <>
      <code>ADR-1</code> на один экран, затем <code>v0.1 Auth</code> на staging; соседи могут быть
      заглушками.
    </>
  ),
  risk: (
    <>
      Первый такт — песочница <code>Pay</code> (неизвестный шлюз), <code>Auth</code> после проверки
      риска, не после spec на все модули.
    </>
  ),
}

const CODE_INTRO: Record<Mode, string> = {
  bduf: 'Монолитный `checkout-spec.md` растёт до интеграционного runbook — без shippable-среза.',
  enough: '`ADR-001` фиксирует границу; `ROADMAP.md` — только то, что можно выкатить.',
}

const CODE_SNIPPETS: Record<Mode, InteractiveSnippet[]> = {
  bduf: [
    {
      id: 'checkout-spec',
      label: 'docs/checkout-spec.md',
      languageLabel: 'markdown',
      note: '«Финальная» спецификация на все модули до первой строки кода.',
      executable: false,
      code: `# Checkout — финальная спецификация v3

## Auth (42 стр.)
Регистрация, email/password, refresh, RBAC, audit…
# ← BDUF: детали до проверки OAuth vs email

## Cart (38 стр.)
Состав заказа, промо, налоги, резерв inventory…

## Pay (55 стр.)
Шлюз, 3DS, возвраты, идемпотентность, reconciliation…
# ← BDUF: Pay описан полностью, sandbox ещё не гоняли

## Интеграции (appendix)
Kafka, CRM, anti-fraud — на будущие релизы.
# ← BDUF: прогресс = страницы, не staging
`,
    },
    {
      id: 'integration-runbook',
      label: 'docs/integration-runbook.md',
      languageLabel: 'markdown',
      note: 'Runbook без работающего API — типичный хвост BDUF.',
      executable: false,
      code: `# Runbook checkout (draft)

1. Deploy auth-service v2.4 (TBD)
2. Wire cart-service to pricing (TBD)
3. Enable pay-gateway canary at 0% traffic
# ← BDUF: шаги без v0.1 Auth в staging

Rollback: revert Helm chart ??? 
# ← BDUF: откат не проверяли — кода нет
`,
    },
  ],
  enough: [
    {
      id: 'adr-001',
      label: 'docs/adr/001-auth-skeleton.md',
      languageLabel: 'markdown',
      note: 'Короткий ADR: граница среза и открытые вопросы.',
      executable: false,
      code: `# ADR-001: Auth как первый вертикальный срез

Статус: accepted

Решение
- v0.1: регистрация + сессия на staging
- Cart/Pay в UI — заглушки «скоро»
# ← ENOUGH: shippable раньше полного spec

Открытые вопросы
- OAuth vs email (решим после v0.1)
- TTL refresh-токена

Критерий готовности
- пользователь логинится без ручных костылей
`,
    },
    {
      id: 'roadmap',
      label: 'docs/ROADMAP.md',
      languageLabel: 'markdown',
      note: 'Каждый `v0.x` — выкатываемый кусок, не глава ТЗ.',
      executable: false,
      code: `# Checkout roadmap

## v0.1 Auth (shippable)
- register / login / logout
- staging + smoke e2e
# ← ENOUGH: первый срез = обратная связь

## v0.2 Cart
- line items, qty
- contract уточняется в коде + короткий ADR-2

## v0.3 Pay
- только после pay_sandbox (риск снят)
# ← ENOUGH: Pay после прототипа, не после 55 стр. spec
`,
    },
    {
      id: 'risk-yml',
      label: 'docs/risk-register.yml',
      languageLabel: 'yaml',
      note: 'Порядок срезов задаёт риск, не длина spec.',
      executable: false,
      code: `top_risk: payment_gateway_unknown

cycles:
  - prototype: pay_sandbox   # ← ENOUGH: Pay до полного Auth spec
    outcome: gateway_latency_ok
  - slice: auth_v0.1
    depends_on: [pay_sandbox]
  - slice: cart_v0.2
`,
    },
  ],
}

type VizProps = { mode: Mode; caseId: CaseId; tick: Tick }

function CheckoutViz({ mode, caseId, tick }: VizProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!rootRef.current) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.fromTo(
        rootRef.current.querySelectorAll('[data-node]'),
        { opacity: 0.55, y: 4 },
        { opacity: 1, y: 0, duration: 0.28, stagger: 0.04, ease: 'power2.out', overwrite: true },
      )
    },
    { scope: rootRef, dependencies: [mode, caseId, tick] },
  )

  const title = mode === 'bduf' ? 'BDUF' : 'Достаточный дизайн'

  return (
    <LabVizPanel ref={rootRef} title={title} meta={metaFor(mode, caseId, tick)}>
      <div className={styles.lanes}>
        <p className={styles.laneLabel}>Артефакты</p>
        <div className={styles.flow}>
          {DOCS.map((d) => {
            const on = docVisible(mode, caseId, tick, d.id)
            const sub = docSub(mode, caseId, tick, d.id)
            const warn = mode === 'bduf' && caseId === 'pivot' && d.id === 'spec' && tick >= 2
            return (
              <LabNode
                key={d.id}
                data-node
                label={d.label}
                sub={on ? sub || 'готово' : '—'}
                state={on ? (warn ? 'err' : 'active') : 'idle'}
                className={`${styles.tile} ${styles.docStack}${warn ? ` ${styles.docWarn}` : ''}${on ? '' : ` ${styles.productEmpty}`}`}
              />
            )
          })}
        </div>
        <p className={styles.laneLabel}>Продукт</p>
        <div className={styles.flow}>
          {FEATURES.map((f) => {
            const kind = featureKind(mode, caseId, tick, f.id)
            const state = featureState(kind)
            const sub = kind === 'done' ? 'staging' : kind === 'sketch' ? 'прототип' : 'пусто'
            return (
              <LabNode
                key={f.id}
                data-node
                label={f.label}
                sub={sub}
                state={state}
                className={`${styles.tile}${kind === 'empty' ? ` ${styles.productEmpty}` : ''}${kind === 'done' ? ` ${styles.productDone}` : ''}`}
              />
            )
          })}
        </div>
      </div>
    </LabVizPanel>
  )
}

export function BdufLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('bduf')
  const [caseId, setCaseId] = useState<CaseId>('stall')
  const [tick, setTick] = useState<Tick>(0)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const selectMode = (next: Mode) => {
    tlRef.current?.kill()
    setBusy(false)
    setMode(next)
    setCaseId(CASES[next][0]!.id)
    setTick(0)
    setHint(null)
    clear()
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    setTick(0)
    setHint(null)
    clear()
  }

  const run = () => {
    clear()
    setHint(null)
    setBusy(true)
    setTick(0)
    tlRef.current?.kill()

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const steps: Tick[] = [1, 2, 3]

    if (reduced) {
      for (const t of steps) {
        setTick(t)
        const line = logLine(mode, caseId, t)
        log(line.kind, line.text)
      }
      setHint(hintFor(mode, caseId))
      setBusy(false)
      return
    }

    const tl = gsap.timeline({
      onComplete: () => setBusy(false),
    })
    tlRef.current = tl

    steps.forEach((t, i) => {
      tl.call(
        () => {
          setTick(t)
          const line = logLine(mode, caseId, t)
          log(line.kind, line.text)
          if (t === 3) setHint(hintFor(mode, caseId))
        },
        undefined,
        i * STEP,
      )
    })
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setMode('bduf')
    setCaseId('stall')
    setTick(0)
    setHint(null)
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {MODES.map((m) => (
          <LabButton
            key={m.id}
            variant="ghost"
            size="sm"
            active={mode === m.id}
            disabled={busy}
            onClick={() => selectMode(m.id)}
          >
            {m.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        {CASES[mode].map((c) => (
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

      <p className={shell.pain}>{PAIN[mode]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <CheckoutViz mode={mode} caseId={caseId} tick={tick} />

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <div className={shell.row}>
        {MODES.map((m) => (
          <LabButton
            key={m.id}
            variant="ghost"
            size="sm"
            active={mode === m.id}
            onClick={() => selectMode(m.id)}
          >
            {m.label}
          </LabButton>
        ))}
      </div>
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
      title="BDUF vs достаточный дизайн"
      lead="Checkout: стопка spec без prod или ADR + shippable-срез."
      problem={problem}
      code={code}
    />
  )
}
