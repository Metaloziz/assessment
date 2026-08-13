import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import styles from './PatternsFactoryProxyAdapterLab.module.css'

const TOPIC_ID = '159-patterns-factory-prototype-proxy-singleton-adapter'
const STEP = 0.7

type Pattern = 'factory' | 'prototype' | 'proxy' | 'singleton' | 'adapter'
type FactoryCase = 'direct' | 'factory'
type ProtoCase = 'shallow' | 'deep'
type ProxyCase = 'miss' | 'hit'
type SingleCase = 'twice' | 'shared'
type AdaptCase = 'mismatch' | 'adapt'
type CaseId = FactoryCase | ProtoCase | ProxyCase | SingleCase | AdaptCase

type FactoryPhase = 'idle' | 'client' | 'slot' | 'product'
type ProtoPhase = 'idle' | 'clone' | 'mutate'
type ProxyPhase = 'idle' | 'client' | 'proxy' | 'real' | 'done'
type SinglePhase = 'idle' | 'call' | 'done'
type AdaptPhase = 'idle' | 'client' | 'mid' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'factory', label: 'Factory' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'proxy', label: 'Proxy' },
  { id: 'singleton', label: 'Singleton' },
  { id: 'adapter', label: 'Adapter' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  factory: [
    { id: 'direct', label: 'Прямой JSX' },
    { id: 'factory', label: 'createToast' },
  ],
  prototype: [
    { id: 'shallow', label: 'Shallow' },
    { id: 'deep', label: 'structuredClone' },
  ],
  proxy: [
    { id: 'miss', label: 'Cache miss' },
    { id: 'hit', label: 'Cache hit' },
  ],
  singleton: [
    { id: 'twice', label: 'new дважды' },
    { id: 'shared', label: 'getConfig' },
  ],
  adapter: [
    { id: 'mismatch', label: 'Без адаптера' },
    { id: 'adapt', label: 'Adapter' },
  ],
}

const CODE_INTRO: Record<Pattern, string> = {
  factory: 'Factory Method: `Checkout` передаёт `channel`, не импортирует конкретный toast.',
  prototype: 'Prototype: новый черновик формы = копия образца; shallow делит nested `flags`.',
  proxy: 'Proxy: тот же `get(id)`, плюс кэш в `ref`.',
  singleton: 'Singleton: `Context` / `getConfig` — один экземпляр на дерево.',
  adapter: 'Adapter: хук `charge(rub)` ↔ legacy `makePayment({ cents })`.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  factory: [
    {
      id: 'create-toast',
      label: 'src/notify/createToast.tsx',
      note: 'Factory Method: `Checkout` передаёт `channel`, не импортирует конкретный toast.',
      executable: false,
      languageLabel: 'tsx',
      code: `import type { ReactElement } from 'react';

type ToastProps = { message: string };

function EmailToast({ message }: ToastProps) {
  return <div role="status">✉ {message}</div>;
}

function SmsToast({ message }: ToastProps) {
  return <div role="status">📱 {message}</div>;
}

// ═══════════════════════════════════════════
// FACTORY METHOD ← выбор компонента в одном месте
// ═══════════════════════════════════════════
export function createToast(
  channel: 'email' | 'sms' | string,
  props: ToastProps,
): ReactElement {
  if (channel === 'email') return <EmailToast {...props} />;
  if (channel === 'sms') return <SmsToast {...props} />;
  throw new Error(\`unknown channel: \${channel}\`); // ← ошибка здесь, не в Checkout
}

// --- src/Checkout.tsx (клиент) ---
// return (
//   <>
//     <PayButton />
//     {createToast(channel, { message: 'Оплачено' })} // ← только контракт channel + props
//   </>
// );
//
// Плохо (прямой JSX):
// return <EmailToast message="Оплачено" />;`,
    },
  ],
  prototype: [
    {
      id: 'form-draft',
      label: 'src/forms/createFormDraft.ts',
      note: 'Prototype: `structuredClone` не делит nested `flags`; `{ ...proto }` — делит.',
      executable: false,
      languageLabel: 'ts',
      code: `export const formProto = {
  name: '',
  locale: 'ru',
  flags: { newsletter: false },
};

export function createFormDraftShallow() {
  return { ...formProto }; // ← SHALLOW: flags общий объект
}

export function createFormDraft() {
  return structuredClone(formProto); // ← PROTOTYPE: deep clone
}

// const a = createFormDraftShallow();
// a.flags.newsletter = true; // formProto.flags тоже true`,
    },
  ],
  proxy: [
    {
      id: 'user-api-proxy',
      label: 'src/api/useUserApi.ts',
      note: 'Proxy: клиент зовёт `get(id)` как у real; кэш внутри обёртки.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { useMemo, useRef } from 'react';

type UserApi = { get: (id: string) => Promise<{ id: string; name: string }> };

// ═══════════════════════════════════════════
// PROXY ← тот же get(id), плюс кэш в ref
// ═══════════════════════════════════════════
export function useUserApi(real: UserApi) {
  const cache = useRef(new Map<string, { id: string; name: string }>());

  return useMemo(
    () => ({
      async get(id: string) {
        if (cache.current.has(id)) return cache.current.get(id)!; // ← PROXY
        const value = await real.get(id);
        cache.current.set(id, value);
        return value;
      },
    }),
    [real],
  );
}`,
    },
  ],
  singleton: [
    {
      id: 'config-singleton',
      label: 'src/config.tsx',
      note: 'Singleton: `useMemo` value в `ConfigProvider` — один объект на дерево.',
      executable: false,
      languageLabel: 'tsx',
      code: `import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

type AppConfig = { ttlMs: number };
const ConfigContext = createContext<AppConfig | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({ ttlMs: 60_000 }), []); // ← один экземпляр value
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const cfg = useContext(ConfigContext);
  if (!cfg) throw new Error('ConfigProvider missing');
  return cfg;
}

// модульный вариант:
// let instance: AppConfig | undefined;
// export function getConfig() {
//   if (!instance) instance = Object.freeze({ ttlMs: 60_000 });
//   return instance; // ← тот же объект
// }`,
    },
  ],
  adapter: [
    {
      id: 'payment-adapter',
      label: 'src/payments/useCharge.ts',
      note: 'Adapter: React-хук `charge(rub)` ↔ legacy `makePayment({ cents })`.',
      executable: false,
      languageLabel: 'ts',
      code: `import { useCallback, useState } from 'react';

// legacy SDK (чужой контракт, не трогаем)
const stripeLegacy = {
  makePayment({ cents }: { cents: number }) {
    return Promise.resolve({ ok: true as const, cents });
  },
};

// ═══════════════════════════════════════════
// ADAPTER ← перевод интерфейса под UI
// ═══════════════════════════════════════════
function createPaymentAdapter(legacy = stripeLegacy) {
  return {
    charge(amountRub: number) {
      // ← ADAPTER: рубли → центы
      return legacy.makePayment({ cents: Math.round(amountRub * 100) });
    },
  };
}

const payments = createPaymentAdapter();

export function useCharge() {
  const [pending, setPending] = useState(false);

  const charge = useCallback(async (amountRub: number) => {
    setPending(true);
    try {
      return await payments.charge(amountRub);
    } finally {
      setPending(false);
    }
  }, []);

  return { charge, pending };
}`,
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
  return [styles.node, ...mods.filter(Boolean)].join(' ')
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

type FactoryVizProps = {
  phase: FactoryPhase
  caseId: FactoryCase
  productRef: MutableRefObject<HTMLDivElement | null>
}

function FactoryViz({ phase, caseId, productRef }: FactoryVizProps) {
  const viaFactory = caseId === 'factory'
  const clientOn = phase !== 'idle'
  const slotOn = viaFactory && (phase === 'slot' || phase === 'product')
  const productOn = phase === 'product'
  const productLabel = viaFactory ? 'SmsToast' : 'EmailToast'

  return (
    <div className={styles.viz}>
      <div className={styles.vizHead}>
        <p className={styles.vizTitle}>Каталог toast</p>
        <p className={styles.vizMeta}>{viaFactory ? 'createToast(channel)' : 'хардкод JSX'}</p>
      </div>
      <div className={styles.catalog}>
        <div className={nodeCls(clientOn && styles.nodeActive, productOn && styles.nodeOk)}>
          <span className={styles.nodeLabel}>Checkout</span>
          <span className={styles.nodeSub}>{viaFactory ? 'channel' : '<EmailToast />'}</span>
        </div>
        <div className={styles.slots}>
          <div className={`${styles.node} ${styles.slot}${viaFactory ? '' : ` ${styles.nodeSkipped}`}`}>
            <span className={styles.nodeLabel}>email</span>
            <span className={styles.nodeSub}>слот</span>
          </div>
          <div
            className={`${styles.node} ${styles.slot}${viaFactory ? '' : ` ${styles.nodeSkipped}`}${
              slotOn && viaFactory ? ` ${styles.nodeActive}` : ''
            }${productOn && viaFactory ? ` ${styles.nodeOk}` : ''}`}
          >
            <span className={styles.nodeLabel}>sms</span>
            <span className={styles.nodeSub}>{slotOn && viaFactory ? 'штамп' : 'слот'}</span>
          </div>
        </div>
        <div
          ref={productRef}
          className={`${styles.node} ${styles.stamp}${productOn ? ` ${styles.nodeOk}` : ''}`}
        >
          <span className={styles.nodeLabel}>{productOn ? productLabel : '—'}</span>
          <span className={styles.nodeSub}>{productOn ? 'в дереве' : 'ждёт штамп'}</span>
        </div>
      </div>
    </div>
  )
}

type ProtoVizProps = {
  phase: ProtoPhase
  caseId: ProtoCase
  cloneRef: MutableRefObject<HTMLDivElement | null>
}

function PrototypeViz({ phase, caseId, cloneRef }: ProtoVizProps) {
  const cloned = phase !== 'idle'
  const mutated = phase === 'mutate'
  const shared = caseId === 'shallow' && mutated
  const cloneNewsletter = mutated ? 'true' : 'false'
  const protoNewsletter = shared ? 'true' : 'false'

  return (
    <div className={styles.viz}>
      <div className={styles.vizHead}>
        <p className={styles.vizTitle}>Черновик формы</p>
        <p className={styles.vizMeta}>{caseId === 'shallow' ? '{ ...proto }' : 'structuredClone'}</p>
      </div>
      <div className={styles.protoRow}>
        <div className={nodeCls(cloned && styles.nodeActive, shared && styles.nodeWarn, styles.objCard)}>
          <span className={styles.nodeLabel}>formProto</span>
          <span className={styles.nodeSub}>образец</span>
          <ul className={styles.objFields}>
            <li className={styles.fieldRow}>
              <span>locale</span>
              <span>ru</span>
            </li>
            <li className={`${styles.fieldRow}${shared ? ` ${styles.fieldShared}` : ''}`}>
              <span>flags.newsletter</span>
              <span>{protoNewsletter}</span>
            </li>
          </ul>
        </div>
        <span className={`${styles.cloneArrow}${cloned ? ` ${styles.cloneArrowActive}` : ''}`}>
          →
        </span>
        <div
          ref={cloneRef}
          className={nodeCls(
            cloned && styles.nodeActive,
            mutated && (shared ? styles.nodeWarn : styles.nodeOk),
            styles.objCard,
          )}
        >
          <span className={styles.nodeLabel}>draft</span>
          <span className={styles.nodeSub}>{cloned ? 'clone' : 'ещё нет'}</span>
          {cloned ? (
            <ul className={styles.objFields}>
              <li className={styles.fieldRow}>
                <span>locale</span>
                <span>ru</span>
              </li>
              <li className={`${styles.fieldRow}${shared ? ` ${styles.fieldShared}` : ''}`}>
                <span>flags.newsletter</span>
                <span>{cloneNewsletter}</span>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}

type ProxyVizProps = {
  phase: ProxyPhase
  caseId: ProxyCase
  cacheRef: MutableRefObject<HTMLSpanElement | null>
}

function ProxyViz({ phase, caseId, cacheRef }: ProxyVizProps) {
  const hit = caseId === 'hit'
  const clientOn = phase !== 'idle'
  const proxyOn = phase === 'proxy' || phase === 'real' || phase === 'done'
  const realOn = phase === 'real' || (phase === 'done' && !hit)
  const realSkip = hit && phase !== 'idle'
  const cacheHit = hit && (phase === 'proxy' || phase === 'done')
  const cacheMiss = !hit && (phase === 'real' || phase === 'done')

  return (
    <div className={styles.viz}>
      <div className={styles.vizHead}>
        <p className={styles.vizTitle}>get(id)</p>
        <p className={styles.vizMeta}>{hit ? 'повторный вызов' : 'первый вызов'}</p>
      </div>
      <div className={styles.proxyRow}>
        <div className={nodeCls(clientOn && styles.nodeActive, phase === 'done' && styles.nodeOk)}>
          <span className={styles.nodeLabel}>Client</span>
          <span className={styles.nodeSub}>useUserApi</span>
        </div>
        <div
          className={`${styles.node} ${styles.proxyBox}${proxyOn ? ` ${styles.nodeActive}` : ''}${
            phase === 'done' ? ` ${styles.nodeOk}` : ''
          }`}
        >
          <span className={styles.nodeLabel}>Proxy</span>
          <span className={styles.nodeSub}>тот же get(id)</span>
          <span
            ref={cacheRef}
            className={`${styles.cacheBadge}${cacheHit ? ` ${styles.cacheHit}` : ''}${
              cacheMiss ? ` ${styles.cacheMiss}` : ''
            }`}
          >
            {cacheHit ? 'hit' : cacheMiss ? 'miss → write' : 'cache'}
          </span>
        </div>
        <div
          className={nodeCls(
            realOn && !hit && styles.nodeActive,
            phase === 'done' && !hit && styles.nodeOk,
            realSkip && styles.nodeSkipped,
          )}
        >
          <span className={styles.nodeLabel}>Real API</span>
          <span className={styles.nodeSub}>{realSkip ? 'не трогаем' : 'get(id)'}</span>
        </div>
      </div>
    </div>
  )
}

type SingleVizProps = {
  phase: SinglePhase
  caseId: SingleCase
  chipRef: MutableRefObject<HTMLDivElement | null>
}

function SingletonViz({ phase, caseId, chipRef }: SingleVizProps) {
  const shared = caseId === 'shared'
  const calling = phase !== 'idle'
  const done = phase === 'done'

  return (
    <div className={styles.viz}>
      <div className={styles.vizHead}>
        <p className={styles.vizTitle}>Конфиг приложения</p>
        <p className={styles.vizMeta}>{shared ? 'один экземпляр' : 'два new'}</p>
      </div>
      <div className={styles.singleRow}>
        <div className={styles.callCol}>
          <div className={nodeCls(calling && styles.nodeActive, done && styles.nodeOk)}>
            <span className={styles.nodeLabel}>Checkout</span>
            <span className={styles.nodeSub}>{shared ? 'getConfig()' : 'new Config()'}</span>
          </div>
          <div className={nodeCls(calling && styles.nodeActive, done && styles.nodeOk)}>
            <span className={styles.nodeLabel}>Settings</span>
            <span className={styles.nodeSub}>{shared ? 'getConfig()' : 'new Config()'}</span>
          </div>
        </div>
        <div className={styles.chipCol} ref={chipRef}>
          <div
            className={`${styles.node} ${styles.chip}${done ? ` ${styles.nodeOk}` : calling ? ` ${styles.nodeActive}` : ''}`}
          >
            <span className={styles.nodeLabel}>{shared ? '#1' : '#1'}</span>
            <span className={styles.nodeSub}>{shared ? 'тот же объект' : 'экземпляр A'}</span>
          </div>
          {shared ? null : (
            <div className={`${styles.node} ${styles.chip}${done ? ` ${styles.nodeWarn}` : calling ? ` ${styles.nodeActive}` : ''}`}>
              <span className={styles.nodeLabel}>#2</span>
              <span className={styles.nodeSub}>экземпляр B</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type AdaptVizProps = {
  phase: AdaptPhase
  caseId: AdaptCase
  adapterRef: MutableRefObject<HTMLDivElement | null>
}

function AdapterViz({ phase, caseId, adapterRef }: AdaptVizProps) {
  const withAdapter = caseId === 'adapt'
  const clientOn = phase !== 'idle'
  const midOn = phase === 'mid' || phase === 'done'
  const done = phase === 'done'
  const mismatch = !withAdapter && done

  return (
    <div className={styles.viz}>
      <div className={styles.vizHead}>
        <p className={styles.vizTitle}>Оплата</p>
        <p className={styles.vizMeta}>{withAdapter ? 'рубли → центы' : 'контракты не сходятся'}</p>
      </div>
      <div className={styles.adaptRow}>
        <div
          className={`${styles.node} ${styles.plug}${clientOn ? ` ${styles.nodeActive}` : ''}${
            done && withAdapter ? ` ${styles.nodeOk}` : ''
          }${mismatch ? ` ${styles.nodeErr}` : ''}`}
        >
          <span className={styles.nodeLabel}>UI</span>
          <span className={styles.nodeSub}>charge(100 ₽)</span>
        </div>
        <div
          ref={adapterRef}
          className={`${styles.node} ${styles.translator}${withAdapter ? '' : ` ${styles.nodeSkipped}`}${
            withAdapter && midOn ? ` ${styles.nodeActive}` : ''
          }${withAdapter && done ? ` ${styles.nodeOk}` : ''}`}
        >
          <span className={styles.nodeLabel}>{withAdapter ? 'Adapter' : '—'}</span>
          <span className={styles.nodeSub}>{withAdapter && midOn ? '×100' : 'переводчик'}</span>
        </div>
        <div
          className={`${styles.node} ${styles.plug}${midOn && withAdapter ? ` ${styles.nodeActive}` : ''}${
            done && withAdapter ? ` ${styles.nodeOk}` : ''
          }${mismatch ? ` ${styles.nodeErr}` : ''}`}
        >
          <span className={styles.nodeLabel}>legacy SDK</span>
          <span className={styles.nodeSub}>makePayment({'{ cents }'})</span>
        </div>
      </div>
    </div>
  )
}

const PAIN: Record<Pattern, ReactNode> = {
  factory: (
    <>
      После оплаты <code>Checkout</code> показывает toast: прямой <code>{'<EmailToast />'}</code>{' '}
      вшивает канал в JSX. Фабрика выбирает компонент по <code>channel</code>.
    </>
  ),
  prototype: (
    <>
      Черновик формы копируют с образца. Shallow <code>{'{ ...proto }'}</code> делит nested{' '}
      <code>flags</code>; <code>structuredClone</code> — нет.
    </>
  ),
  proxy: (
    <>
      Клиент зовёт <code>get(id)</code> как у API. Proxy с тем же интерфейсом отвечает из кэша или
      идёт в real.
    </>
  ),
  singleton: (
    <>
      Конфиг нужен один на дерево. Два <code>new Config()</code> дают разные объекты;{' '}
      <code>getConfig</code> / Context — один.
    </>
  ),
  adapter: (
    <>
      UI говорит <code>charge(rub)</code>, legacy ждёт <code>makePayment({'{ cents }'})</code>.
      Адаптер переводит, не трогая SDK.
    </>
  ),
}

export function PatternsFactoryProxyAdapterLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('factory')
  const [caseId, setCaseId] = useState<CaseId>('direct')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [factoryPhase, setFactoryPhase] = useState<FactoryPhase>('idle')
  const [protoPhase, setProtoPhase] = useState<ProtoPhase>('idle')
  const [proxyPhase, setProxyPhase] = useState<ProxyPhase>('idle')
  const [singlePhase, setSinglePhase] = useState<SinglePhase>('idle')
  const [adaptPhase, setAdaptPhase] = useState<AdaptPhase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const productRef = useRef<HTMLDivElement | null>(null)
  const cloneRef = useRef<HTMLDivElement | null>(null)
  const cacheRef = useRef<HTMLSpanElement | null>(null)
  const chipRef = useRef<HTMLDivElement | null>(null)
  const adapterRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setFactoryPhase('idle')
    setProtoPhase('idle')
    setProxyPhase('idle')
    setSinglePhase('idle')
    setAdaptPhase('idle')
    setHint(null)
    for (const el of [productRef.current, cloneRef.current, cacheRef.current, chipRef.current, adapterRef.current]) {
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

    if (pattern === 'factory') {
      const via = caseId === 'factory'
      playTimeline(
        tlRef,
        [
          () => setFactoryPhase('client'),
          () => setFactoryPhase(via ? 'slot' : 'client'),
          () => {
            setFactoryPhase('product')
            if (via) {
              log('ok', 'createToast("sms") → <SmsToast />')
              setHint('фабрика выбирает компонент; Checkout знает только channel')
            } else {
              log('warn', 'Checkout → <EmailToast /> — смена канала правит JSX')
              setHint('хардкод: Checkout знает EmailToast')
            }
          },
        ],
        (tl) => {
          if (!productRef.current) return
          gsap.set(productRef.current, { opacity: 0.35, y: 10 })
          tl.to(productRef.current, { opacity: 1, y: 0 }, STEP * 2)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'prototype') {
      const shallow = caseId === 'shallow'
      playTimeline(
        tlRef,
        [
          () => setProtoPhase('clone'),
          () => {
            setProtoPhase('mutate')
            if (shallow) {
              log('warn', 'draft.flags.newsletter = true — proto.flags тоже true')
              setHint('shallow делит nested flags')
            } else {
              log('ok', 'structuredClone: proto.flags.newsletter остался false')
              setHint('deep clone не делит вложенные объекты')
            }
          },
        ],
        (tl) => {
          if (!cloneRef.current) return
          gsap.set(cloneRef.current, { opacity: 0.35, y: 10 })
          tl.to(cloneRef.current, { opacity: 1, y: 0 }, 0)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'proxy') {
      const hit = caseId === 'hit'
      playTimeline(
        tlRef,
        [
          () => setProxyPhase('client'),
          () => setProxyPhase('proxy'),
          () => setProxyPhase(hit ? 'done' : 'real'),
          () => {
            setProxyPhase('done')
            if (hit) {
              log('ok', 'get("u1") → cache hit, real.get не вызван')
              setHint('тот же интерфейс; кэш внутри обёртки')
            } else {
              log('info', 'get("u1") miss → real.get, затем cache.set')
              setHint('первый вызов идёт в API и заполняет кэш')
            }
          },
        ],
        (tl) => {
          if (!cacheRef.current) return
          gsap.set(cacheRef.current, { scale: 0.92 })
          tl.to(cacheRef.current, { scale: 1 }, hit ? STEP : STEP * 2)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'singleton') {
      const shared = caseId === 'shared'
      playTimeline(
        tlRef,
        [
          () => setSinglePhase('call'),
          () => {
            setSinglePhase('done')
            if (shared) {
              log('ok', 'Checkout и Settings получили один и тот же объект')
              setHint('getConfig / Context — один экземпляр на дерево')
            } else {
              log('warn', 'new Config() ×2 → два разных объекта')
              setHint('два new — не singleton')
            }
          },
        ],
        (tl) => {
          if (!chipRef.current) return
          gsap.set(chipRef.current, { opacity: 0.4, y: 8 })
          tl.to(chipRef.current, { opacity: 1, y: 0 }, STEP)
        },
        () => setBusy(false),
      )
      return
    }

    const withAdapter = caseId === 'adapt'
    playTimeline(
      tlRef,
      [
        () => setAdaptPhase('client'),
        () => setAdaptPhase('mid'),
        () => {
          setAdaptPhase('done')
          if (withAdapter) {
            log('ok', 'charge(100) → makePayment({ cents: 10000 })')
            setHint('адаптер переводит рубли в центы')
          } else {
            log('err', 'charge(100) ≠ makePayment({ cents }) — вызов не стыкуется')
            setHint('без переводчика контракты разные')
          }
        },
      ],
      (tl) => {
        if (!adapterRef.current || !withAdapter) return
        gsap.set(adapterRef.current, { scale: 0.92, opacity: 0.5 })
        tl.to(adapterRef.current, { scale: 1, opacity: 1 }, STEP)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('factory')
    setCaseId('direct')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>{PAIN[pattern]}</p>
      <ol className={shell.steps}>
        <li>Выберите паттерн и кейс — схема ещё не играет.</li>
        <li>
          Нажмите <code>Запустить</code> и смотрите, что изменилось на картинке.
        </li>
      </ol>

      {pattern === 'factory' ? (
        <FactoryViz phase={factoryPhase} caseId={caseId as FactoryCase} productRef={productRef} />
      ) : null}
      {pattern === 'prototype' ? (
        <PrototypeViz phase={protoPhase} caseId={caseId as ProtoCase} cloneRef={cloneRef} />
      ) : null}
      {pattern === 'proxy' ? (
        <ProxyViz phase={proxyPhase} caseId={caseId as ProxyCase} cacheRef={cacheRef} />
      ) : null}
      {pattern === 'singleton' ? (
        <SingletonViz phase={singlePhase} caseId={caseId as SingleCase} chipRef={chipRef} />
      ) : null}
      {pattern === 'adapter' ? (
        <AdapterViz phase={adaptPhase} caseId={caseId as AdaptCase} adapterRef={adapterRef} />
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
      title="Factory · Prototype · Proxy · Singleton · Adapter"
      lead="Переключатель паттернов: каталог toast, clone формы, кэш-прокси, один конфиг, переводчик оплаты."
      problem={problem}
      code={code}
    />
  )
}
