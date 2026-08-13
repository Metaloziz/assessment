import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './PatternsChainStrategyDecoratorLab.module.css'

const TOPIC_ID = '160-patterns-chain-abstract-factory-strategy-decorator'
const STEP = 0.7

type Pattern = 'chain' | 'abstract' | 'strategy' | 'decorator'
type ChainCase = 'ok' | 'auth-fail'
type FamilyCase = 'family' | 'mix'
type StratCase = 'fixed' | 'percent'
type DecoCase = 'bare' | 'metrics'
type CaseId = ChainCase | FamilyCase | StratCase | DecoCase

type ChainLayer = 'idle' | 'auth' | 'rate' | 'handler' | 'done' | 'err'
type FamilyPhase = 'idle' | 'factory' | 'products'
type StratPhase = 'idle' | 'pick' | 'slotted'
type DecoPhase = 'idle' | 'outer' | 'core' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'chain', label: 'Chain' },
  { id: 'abstract', label: 'Abstract Factory' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'decorator', label: 'Decorator' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  chain: [
    { id: 'ok', label: 'Chain OK' },
    { id: 'auth-fail', label: 'Auth fail' },
  ],
  abstract: [
    { id: 'family', label: 'Dark kit' },
    { id: 'mix', label: 'Смесь тем' },
  ],
  strategy: [
    { id: 'fixed', label: 'fixed −500' },
    { id: 'percent', label: 'percent 10%' },
  ],
  decorator: [
    { id: 'bare', label: 'Голый fetch' },
    { id: 'metrics', label: 'withMetrics' },
  ],
}

const CODE_INTRO: Record<Pattern, string> = {
  chain: 'Chain of Responsibility: каждое звено — `(ctx, next)`; stop или передать дальше.',
  abstract: 'Abstract Factory: семейство light/dark — кнопка и поле одной линейки.',
  strategy: 'Strategy: алгоритм скидки подставляется по ключу, контекст не раздувается `switch`.',
  decorator: 'Decorator: тот же API `fetch`, плюс слой метрик до и после вызова.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  chain: [
    {
      id: 'middleware-chain',
      label: 'src/http/createMiddlewareChain.ts',
      note: 'Chain of Responsibility: каждое звено — `(ctx, next)`; stop или передать дальше.',
      executable: false,
      languageLabel: 'ts',
      code: `type Ctx = { token?: string; count: number; result?: string };
type Handler = (ctx: Ctx, next: () => Promise<void>) => Promise<void>;

// ═══════════════════════════════════════════
// CHAIN OF RESPONSIBILITY ← порядок звеньев явный
// ═══════════════════════════════════════════
export function createChain(handlers: Handler[]) {
  return async function run(ctx: Ctx) {
    let i = 0;
    async function next() {
      const h = handlers[i++];
      if (!h) return;
      await h(ctx, next); // ← передать дальше или stop (без next)
    }
    await next();
  };
}

const auth: Handler = async (ctx, next) => {
  if (!ctx.token) throw new Error('403 auth'); // ← stop: next не вызываем
  await next();
};

const rate: Handler = async (ctx, next) => {
  if (ctx.count > 100) throw new Error('429 rate');
  await next();
};

const handler: Handler = async (ctx) => {
  ctx.result = 'order created';
};

export const handleOrder = createChain([auth, rate, handler]);

// await handleOrder({ token: 'x', count: 1 });`,
    },
  ],
  abstract: [
    {
      id: 'themed-factory',
      label: 'src/ui/themedFactory.ts',
      note: 'Abstract Factory: `createDarkTheme()` выдаёт Button и Input одной линейки.',
      executable: false,
      languageLabel: 'ts',
      code: `type ButtonProps = { label: string; theme: 'light' | 'dark' };
type InputProps = { name: string; theme: 'light' | 'dark' };

// ═══════════════════════════════════════════
// ABSTRACT FACTORY ← согласованное семейство UI
// ═══════════════════════════════════════════
export function createLightTheme() {
  return {
    Button: (p: Omit<ButtonProps, 'theme'>) =>
      ({ ...p, theme: 'light' as const }),
    Input: (p: Omit<InputProps, 'theme'>) =>
      ({ ...p, theme: 'light' as const }),
  };
}

export function createDarkTheme() {
  return {
    Button: (p: Omit<ButtonProps, 'theme'>) =>
      ({ ...p, theme: 'dark' as const }),
    Input: (p: Omit<InputProps, 'theme'>) =>
      ({ ...p, theme: 'dark' as const }),
  };
}

// const ui = createDarkTheme();
// ui.Button({ label: 'Pay' }); ui.Input({ name: 'email' });`,
    },
  ],
  strategy: [
    {
      id: 'pricing-strategy',
      label: 'src/checkout/pricingStrategy.ts',
      note: 'Strategy: алгоритм скидки подставляется по ключу, контекст не раздувается switch.',
      executable: false,
      languageLabel: 'ts',
      code: `type Cart = { base: number; rate?: number };

type PricingStrategy = (cart: Cart) => number;

// ═══════════════════════════════════════════
// STRATEGY ← взаимозаменяемые алгоритмы
// ═══════════════════════════════════════════
const fixed: PricingStrategy = (cart) => cart.base - 500;

const percent: PricingStrategy = (cart) =>
  cart.base * (1 - (cart.rate ?? 0));

const strategies: Record<string, PricingStrategy> = {
  fixed,
  percent,
};

export function total(cart: Cart, strategyKey: string) {
  const strategy = strategies[strategyKey];
  if (!strategy) throw new Error(\`unknown strategy: \${strategyKey}\`);
  return strategy(cart); // ← контекст не знает формулу
}

// total({ base: 10_000, rate: 0.1 }, 'percent');`,
    },
  ],
  decorator: [
    {
      id: 'with-metrics',
      label: 'src/api/withMetrics.ts',
      note: 'Decorator: тот же `FetchUser`, плюс лог времени вокруг core.',
      executable: false,
      languageLabel: 'ts',
      code: `type FetchUser = (id: string) => Promise<{ id: string; name: string }>;

// ═══════════════════════════════════════════
// DECORATOR ← тот же API, плюс метрики
// ═══════════════════════════════════════════
export function withMetrics(fn: FetchUser, name: string): FetchUser {
  return async (id) => {
    const t0 = performance.now();
    try {
      return await fn(id); // ← делегирование в core
    } finally {
      console.log(\`\${name}: \${(performance.now() - t0).toFixed(1)}ms\`);
    }
  };
}

// const fetchUser: FetchUser = async (id) => ({ id, name: 'Ada' });
// const timed = withMetrics(fetchUser, 'fetchUser');
// await timed('u1');`,
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

type ChainVizProps = {
  layer: ChainLayer
  caseId: ChainCase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function layerState(
  current: ChainLayer,
  name: 'auth' | 'rate' | 'handler',
  fail: boolean,
): string {
  const order: ChainLayer[] = ['idle', 'auth', 'rate', 'handler', 'done']
  if (fail && name !== 'auth' && (current === 'err' || current === 'auth')) {
    return `${labVizStyles.node} ${styles.layer} ${styles.nodeSkipped}`
  }
  if (fail && name === 'auth' && current === 'err') return `${labVizStyles.node} ${styles.layer} ${labVizStyles.nodeErr}`
  if (current === name) return `${labVizStyles.node} ${styles.layer} ${labVizStyles.nodeActive}`
  if (current === 'done' || order.indexOf(current) > order.indexOf(name)) {
    return `${labVizStyles.node} ${styles.layer} ${labVizStyles.nodeOk}`
  }
  return `${labVizStyles.node} ${styles.layer}`
}

function ChainViz({ layer, caseId, packetRef }: ChainVizProps) {
  const fail = caseId === 'auth-fail'
  const moving = layer !== 'idle'

  return (
    <LabVizPanel title="POST /api/order" meta={fail ? 'stop на auth' : 'пакет падает вниз'}>
      <div className={styles.stackWrap}>
        <div ref={packetRef} className={styles.packet} style={{ opacity: moving ? 1 : 0.55 }}>
          {layer === 'err' ? '403' : 'request'}
        </div>
        <div className={layerState(layer, 'auth', fail)}>
          <span className={labVizStyles.nodeLabel}>auth</span>
          <span className={labVizStyles.nodeSub}>{layer === 'err' ? 'stop' : 'next()'}</span>
        </div>
        <div className={layerState(layer, 'rate', fail)}>
          <span className={labVizStyles.nodeLabel}>rate</span>
          <span className={labVizStyles.nodeSub}>{fail && (layer === 'err' || layer === 'auth') ? 'не дошли' : 'next()'}</span>
        </div>
        <div className={layerState(layer, 'handler', fail)}>
          <span className={labVizStyles.nodeLabel}>handler</span>
          <span className={labVizStyles.nodeSub}>order</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

type FamilyVizProps = {
  phase: FamilyPhase
  caseId: FamilyCase
  kitRef: MutableRefObject<HTMLDivElement | null>
}

function FamilyViz({ phase, caseId, kitRef }: FamilyVizProps) {
  const mix = caseId === 'mix'
  const factoryOn = phase !== 'idle'
  const shown = phase === 'products'
  const warn = mix && shown

  return (
    <LabVizPanel title="Семейство UI" meta={mix ? 'разные линейки' : 'createDarkTheme()'}>
      <div className={styles.family}>
        <div className={nodeCls(factoryOn && labVizStyles.nodeActive, shown && !mix && labVizStyles.nodeOk, warn && styles.nodeWarn)}>
          <span className={labVizStyles.nodeLabel}>{mix ? 'вручную' : 'Dark factory'}</span>
          <span className={labVizStyles.nodeSub}>{mix ? 'Button + Input' : 'семейство'}</span>
        </div>
        <div className={styles.kit} ref={kitRef}>
          <div
            className={`${labVizStyles.node} ${styles.product} ${styles.productDark}${shown ? ` ${mix ? styles.nodeWarn : labVizStyles.nodeOk}` : ''}`}
          >
            <span className={labVizStyles.nodeLabel}>Button</span>
            <span className={labVizStyles.nodeSub}>dark</span>
          </div>
          <div
            className={`${labVizStyles.node} ${styles.product} ${mix ? styles.productLight : styles.productDark}${
              shown ? ` ${mix ? styles.nodeWarn : labVizStyles.nodeOk}` : ''
            }`}
          >
            <span className={labVizStyles.nodeLabel}>Input</span>
            <span className={labVizStyles.nodeSub}>{mix ? 'light' : 'dark'}</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

type StratVizProps = {
  phase: StratPhase
  caseId: StratCase
  slotRef: MutableRefObject<HTMLDivElement | null>
}

function StrategyViz({ phase, caseId, slotRef }: StratVizProps) {
  const fixed = caseId === 'fixed'
  const slotted = phase === 'slotted'
  const picking = phase !== 'idle'
  const total = slotted ? (fixed ? '9 500' : '9 000') : '—'

  return (
    <LabVizPanel title="Checkout total" meta="base 10 000">
      <div className={styles.strategy}>
        <div className={`${labVizStyles.node} ${styles.context}${picking ? ` ${labVizStyles.nodeActive}` : ''}${slotted ? ` ${labVizStyles.nodeOk}` : ''}`}>
          <div>
            <span className={labVizStyles.nodeLabel}>Context</span>
            <span className={labVizStyles.nodeSub}>total = {total}</span>
          </div>
          <div
            ref={slotRef}
            className={`${styles.slot}${slotted ? ` ${styles.slotFilled}` : ''}`}
          >
            <span className={labVizStyles.nodeLabel}>{slotted ? (fixed ? 'fixed' : 'percent') : 'слот стратегии'}</span>
            <span className={labVizStyles.nodeSub}>
              {slotted ? (fixed ? 'base − 500' : 'base × 0.9') : 'пока пусто'}
            </span>
          </div>
        </div>
        <div className={styles.cards}>
          <div className={`${labVizStyles.node} ${styles.card}${fixed && picking ? ` ${labVizStyles.nodeActive}` : ''}${fixed && slotted ? ` ${labVizStyles.nodeOk}` : ''}`}>
            <span className={labVizStyles.nodeLabel}>fixed</span>
            <span className={labVizStyles.nodeSub}>−500</span>
          </div>
          <div className={`${labVizStyles.node} ${styles.card}${!fixed && picking ? ` ${labVizStyles.nodeActive}` : ''}${!fixed && slotted ? ` ${labVizStyles.nodeOk}` : ''}`}>
            <span className={labVizStyles.nodeLabel}>percent</span>
            <span className={labVizStyles.nodeSub}>10%</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

type DecoVizProps = {
  phase: DecoPhase
  caseId: DecoCase
  ringRef: MutableRefObject<HTMLDivElement | null>
}

function DecoratorViz({ phase, caseId, ringRef }: DecoVizProps) {
  const wrapped = caseId === 'metrics'
  const coreOn = phase === 'core' || phase === 'done'
  const outerOn = wrapped && phase !== 'idle'
  const done = phase === 'done'

  return (
    <LabVizPanel title="fetchUser" meta={wrapped ? 'тот же API + слой' : 'только core'}>
      <div className={styles.onion}>
        <div
          ref={ringRef}
          className={`${styles.ring}${outerOn ? ` ${styles.ringActive}` : ''}${
            wrapped && done ? ` ${styles.ringOk}` : ''
          }${wrapped ? '' : ` ${styles.nodeSkipped}`}`}
        >
          <span className={styles.ringCaption}>{wrapped ? 'withMetrics' : 'без обёртки'}</span>
          <div className={`${labVizStyles.node} ${styles.core}${coreOn ? ` ${labVizStyles.nodeActive}` : ''}${done ? ` ${labVizStyles.nodeOk}` : ''}`}>
            <span className={labVizStyles.nodeLabel}>fetch</span>
            <span className={labVizStyles.nodeSub}>core</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

const PAIN: Record<Pattern, ReactNode> = {
  chain: (
    <>
      Запрос <code>POST /api/order</code> идёт через auth и rate. Звено либо зовёт <code>next()</code>,
      либо останавливает цепь.
    </>
  ),
  abstract: (
    <>
      Тема UI — семейство: кнопка и поле одной линейки. Смешать <code>DarkButton</code> с{' '}
      <code>LightInput</code> — сломать комплект.
    </>
  ),
  strategy: (
    <>
      Скидку лучше не раздувать <code>if</code> в контексте: алгоритм вставляется в слот с общим
      контрактом.
    </>
  ),
  decorator: (
    <>
      Метрики вокруг <code>fetch</code> не требуют нового класса-наследника: обёртка с тем же API
      добавляет слой.
    </>
  ),
}

export function PatternsChainStrategyDecoratorLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('chain')
  const [caseId, setCaseId] = useState<CaseId>('ok')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [chainLayer, setChainLayer] = useState<ChainLayer>('idle')
  const [familyPhase, setFamilyPhase] = useState<FamilyPhase>('idle')
  const [stratPhase, setStratPhase] = useState<StratPhase>('idle')
  const [decoPhase, setDecoPhase] = useState<DecoPhase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const packetRef = useRef<HTMLDivElement | null>(null)
  const kitRef = useRef<HTMLDivElement | null>(null)
  const slotRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setChainLayer('idle')
    setFamilyPhase('idle')
    setStratPhase('idle')
    setDecoPhase('idle')
    setHint(null)
    for (const el of [packetRef.current, kitRef.current, slotRef.current, ringRef.current]) {
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

    if (pattern === 'chain') {
      const fail = caseId === 'auth-fail'
      playTimeline(
        tlRef,
        fail
          ? [
              () => setChainLayer('auth'),
              () => {
                setChainLayer('err')
                log('err', 'auth → stop, rate и handler не вызваны')
                setHint('звено auth обрывает цепь — next() не зовётся')
              },
            ]
          : [
              () => setChainLayer('auth'),
              () => setChainLayer('rate'),
              () => setChainLayer('handler'),
              () => {
                setChainLayer('done')
                log('ok', 'auth → rate → handler → 200')
                setHint('каждое звено отдельно; порядок в createChain')
              },
            ],
        (tl) => {
          if (!packetRef.current) return
          gsap.set(packetRef.current, { y: 0, opacity: 1 })
          tl.to(packetRef.current, { y: 46 }, 0)
          if (fail) return
          tl.to(packetRef.current, { y: 96 }, STEP)
          tl.to(packetRef.current, { y: 146 }, STEP * 2)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'abstract') {
      const mix = caseId === 'mix'
      playTimeline(
        tlRef,
        [
          () => setFamilyPhase('factory'),
          () => {
            setFamilyPhase('products')
            if (mix) {
              log('warn', 'DarkButton + LightInput — семейство разъехалось')
              setHint('Abstract Factory выдаёт согласованный комплект')
            } else {
              log('ok', 'createDarkTheme() → Button dark + Input dark')
              setHint('одна фабрика — одна линейка')
            }
          },
        ],
        (tl) => {
          if (!kitRef.current) return
          gsap.set(kitRef.current, { opacity: 0.35, y: 12 })
          tl.to(kitRef.current, { opacity: 1, y: 0 }, STEP)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'strategy') {
      const fixed = caseId === 'fixed'
      playTimeline(
        tlRef,
        [
          () => setStratPhase('pick'),
          () => {
            setStratPhase('slotted')
            if (fixed) {
              log('ok', 'total({ base: 10000 }, "fixed") → 9500')
              setHint('контекст не знает формулу — только ключ стратегии')
            } else {
              log('ok', 'total({ base: 10000, rate: 0.1 }, "percent") → 9000')
              setHint('другая карточка в том же слоте')
            }
          },
        ],
        (tl) => {
          if (!slotRef.current) return
          gsap.set(slotRef.current, { opacity: 0.4, y: 10 })
          tl.to(slotRef.current, { opacity: 1, y: 0 }, STEP)
        },
        () => setBusy(false),
      )
      return
    }

    const wrapped = caseId === 'metrics'
    playTimeline(
      tlRef,
      wrapped
        ? [
            () => setDecoPhase('outer'),
            () => setDecoPhase('core'),
            () => {
              setDecoPhase('done')
              log('ok', 'withMetrics(fetchUser): core + 4.2ms в логе')
              setHint('тот же get(id), слой до и после вызова')
            },
          ]
        : [
            () => setDecoPhase('core'),
            () => {
              setDecoPhase('done')
              log('info', 'fetchUser(id) — без обёртки, метрик нет')
              setHint('голый вызов: только core')
            },
          ],
      (tl) => {
        if (!ringRef.current || !wrapped) return
        gsap.set(ringRef.current, { scale: 0.94, opacity: 0.55 })
        tl.to(ringRef.current, { scale: 1, opacity: 1 }, 0)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('chain')
    setCaseId('ok')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>{PAIN[pattern]}</p>
      <ol className={shell.steps}>
        <li>Выберите паттерн и кейс — схема ещё не играет.</li>
        <li>
          Нажмите <code>Запустить</code> и сравните картинку двух кейсов.
        </li>
      </ol>

      {pattern === 'chain' ? (
        <ChainViz layer={chainLayer} caseId={caseId as ChainCase} packetRef={packetRef} />
      ) : null}
      {pattern === 'abstract' ? (
        <FamilyViz phase={familyPhase} caseId={caseId as FamilyCase} kitRef={kitRef} />
      ) : null}
      {pattern === 'strategy' ? (
        <StrategyViz phase={stratPhase} caseId={caseId as StratCase} slotRef={slotRef} />
      ) : null}
      {pattern === 'decorator' ? (
        <DecoratorViz phase={decoPhase} caseId={caseId as DecoCase} ringRef={ringRef} />
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
      title="Chain · Abstract Factory · Strategy · Decorator"
      lead="Переключатель: вертикальная цепь middleware, семейство тем, слот стратегии, луковица обёрток."
      problem={problem}
      code={code}
    />
  )
}
