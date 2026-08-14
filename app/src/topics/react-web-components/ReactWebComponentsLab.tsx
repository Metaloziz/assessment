import {
  createElement,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactWebComponentsLab.module.css'

const TOPIC_ID = '198-react-web-components'
const TAG = 'lab-product-chip'
const STEP = 0.6

type CaseId = 'attr' | 'property' | 'event'
type Phase = 'idle' | 'mount' | 'sync' | 'done'

type ChipMeta = {
  title: string
  price: number
}

type ProductChipEl = HTMLElement & {
  meta?: ChipMeta | null
  getMetaDisplay?: () => string
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'attr', label: 'Атрибут sku' },
  { id: 'property', label: 'Свойство meta' },
  { id: 'event', label: 'chip-action' },
]

const DEMO_META: ChipMeta = { title: 'Наушники Pro', price: 4290 }

function ensureProductChip() {
  if (customElements.get(TAG)) return

  class ProductChip extends HTMLElement {
    private _meta: ChipMeta | null = null

    static get observedAttributes() {
      return ['sku']
    }

    set meta(value: ChipMeta | null) {
      this._meta = value
      this.render()
    }

    get meta() {
      return this._meta
    }

    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
    }

    private onCartClick = () => {
      this.dispatchEvent(
        new CustomEvent('chip-action', {
          bubbles: true,
          detail: { sku: this.getAttribute('sku') ?? '' },
        }),
      )
    }

    connectedCallback() {
      this.render()
    }

    attributeChangedCallback() {
      this.render()
    }

    getMetaDisplay() {
      if (this._meta) return `${this._meta.title} · ${this._meta.price} ₽`
      const attr = this.getAttribute('meta')
      if (attr) return attr
      return 'нет meta'
    }

    render() {
      if (!this.shadowRoot) return
      const sku = this.getAttribute('sku') ?? '—'
      const metaLine = this.getMetaDisplay()
      const metaBroken = !this._meta && this.hasAttribute('meta')

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            padding: 0.55rem 0.65rem;
            border: 1px solid color-mix(in srgb, var(--accent, #69b1ff) 35%, #444);
            border-radius: 6px;
            background: color-mix(in srgb, var(--bg-elevated, #1e1e1e) 80%, #111);
            font-family: system-ui, sans-serif;
          }
          .sku {
            margin: 0 0 0.25rem;
            font-family: ui-monospace, monospace;
            font-size: var(--lab-font-meta, 0.9rem);
            color: #8b949e;
          }
          .meta {
            margin: 0 0 0.45rem;
            font-size: var(--lab-font-ui, 1rem);
            font-weight: 600;
            color: #e6edf3;
          }
          .meta-warn { color: #f0883e; }
          button {
            font: inherit;
            font-size: var(--lab-font-meta, 0.9rem);
            padding: 0.25rem 0.55rem;
            border-radius: 4px;
            border: 1px solid #444;
            background: #21262d;
            color: #e6edf3;
            cursor: pointer;
          }
        </style>
        <p class="sku">sku: ${sku}</p>
        <p class="meta ${metaBroken ? 'meta-warn' : ''}">${metaLine}</p>
        <button type="button">В корзину</button>
      `
      this.shadowRoot.querySelector('button')?.addEventListener('click', this.onCartClick)
    }
  }

  customElements.define(TAG, ProductChip)
}

const CODE_INTRO: Record<CaseId, string> = {
  attr: 'Строковый `sku` React пишет как HTML-атрибут — для CE этого достаточно.',
  property: 'Объект `meta` — свойство host; через JSX-атрибут останется строка.',
  event: '`chip-action` из shadow ловят на host через `addEventListener`, не `onClick` на React-обёртке.',
}

const SNIPPET_JSX_ATTR: InteractiveSnippet = {
  id: 'jsx-attr',
  label: 'src/ui/ProductRow.tsx',
  note: 'Строковый контракт — атрибут в разметке.',
  executable: false,
  languageLabel: 'tsx',
  code: `export const ProductRow = () => (
  // ═══════════════════════════════════════════
  // ATTR ← sku как HTML-атрибут
  // ═══════════════════════════════════════════
  <lab-product-chip sku="SKU-42" />
);`,
}

const SNIPPET_TS_INTRINSIC: InteractiveSnippet = {
  id: 'ts-intrinsic',
  label: 'src/types/custom-elements.d.ts',
  note: 'TS знает тег с дефисом в JSX.',
  executable: false,
  languageLabel: 'tsx',
  code: `declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lab-product-chip': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { sku?: string },
        HTMLElement
      >;
    }
  }
}
export {};`,
}

const SNIPPET_PROPERTY: InteractiveSnippet = {
  id: 'property-bridge',
  label: 'src/ui/ChipWithMeta.tsx',
  note: 'Объект на host через ref + useEffect.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useEffect, useRef } from 'react';

type ChipMeta = { title: string; price: number };
type ProductChipEl = HTMLElement & { meta?: ChipMeta };

export const ChipWithMeta = () => {
  const ref = useRef<ProductChipEl>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ═══════════════════════════════════════════
    // PROPERTY ← объект, не атрибут meta="…"
    // ═══════════════════════════════════════════
    el.meta = { title: 'Наушники Pro', price: 4290 };
  }, []);

  return <lab-product-chip ref={ref} sku="SKU-42" />;
};`,
}

const SNIPPET_CE_META: InteractiveSnippet = {
  id: 'ce-meta-setter',
  label: 'src/widgets/product-chip.ts',
  note: 'CE читает meta из property setter, не из атрибута.',
  executable: false,
  languageLabel: 'ts',
  code: `class ProductChip extends HTMLElement {
  private _meta: ChipMeta | null = null;

  set meta(value: ChipMeta | null) {
    this._meta = value; // ← property API
    this.render();
  }

  render() {
    const line = this._meta
      ? \`\${this._meta.title} · \${this._meta.price} ₽\`
      : this.getAttribute('meta') ?? 'нет meta';
    // … shadow DOM
  }
}
customElements.define('lab-product-chip', ProductChip);`,
}

const SNIPPET_EVENT: InteractiveSnippet = {
  id: 'event-bridge',
  label: 'src/ui/ChipWithMeta.tsx',
  note: 'CustomEvent с host — native listener на ref.',
  executable: false,
  languageLabel: 'tsx',
  code: `useEffect(() => {
  const el = ref.current;
  if (!el) return;

  const onAction = (e: Event) => {
    const sku = (e as CustomEvent<{ sku: string }>).detail.sku;
    console.log('chip-action', sku);
  };

  // ═══════════════════════════════════════════
  // EVENT ← имя как в CE, не React onClick
  // ═══════════════════════════════════════════
  el.addEventListener('chip-action', onAction);
  return () => el.removeEventListener('chip-action', onAction);
}, []);`,
}

const SNIPPET_CE_EVENT: InteractiveSnippet = {
  id: 'ce-dispatch',
  label: 'src/widgets/product-chip.ts',
  note: 'Кнопка в shadow шлёт CustomEvent с host.',
  executable: false,
  languageLabel: 'ts',
  code: `this.dispatchEvent(
  new CustomEvent('chip-action', {
    bubbles: true,
    detail: { sku: this.getAttribute('sku') ?? '' },
  }),
); // ← слушатель на <lab-product-chip>, не на button`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  attr: [SNIPPET_JSX_ATTR, SNIPPET_TS_INTRINSIC],
  property: [SNIPPET_PROPERTY, SNIPPET_CE_META],
  event: [SNIPPET_EVENT, SNIPPET_CE_EVENT],
}

const PAIN =
  'Custom element в React — мост: React обновляет host, а контракт (meta, события) живёт в DOM API Web Components.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  attr: (
    <>
      Только <code>sku</code> в JSX — chip показывает артикул, строка meta пустая.
    </>
  ),
  property: (
    <>
      Сначала без <code>meta</code>, затем <code>ref</code> выставляет property — chip показывает
      название и цену.
    </>
  ),
  event: (
    <>
      Клик «В корзину» в shadow шлёт <code>chip-action</code> — React ловит его на host через
      listener.
    </>
  ),
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) => {
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

type ChipMountProps = {
  caseId: CaseId
  chipRef: RefObject<ProductChipEl | null>
  withListener: boolean
  onChipEvent: (sku: string) => void
}

const ChipMount = ({ caseId, chipRef, withListener, onChipEvent }: ChipMountProps) => {
  useEffect(() => {
    const el = chipRef.current
    if (!el || caseId !== 'event' || !withListener) return
    const handler = (e: Event) => {
      onChipEvent((e as CustomEvent<{ sku: string }>).detail.sku)
    }
    el.addEventListener('chip-action', handler)
    return () => el.removeEventListener('chip-action', handler)
  }, [caseId, chipRef, withListener, onChipEvent])

  if (caseId === 'property') {
    return createElement('lab-product-chip', { ref: chipRef, sku: 'SKU-42' })
  }

  return createElement('lab-product-chip', { ref: chipRef, sku: 'SKU-42' })
}

type LiveVizProps = {
  phase: Phase
  caseId: CaseId
  mounted: boolean
  metaSynced: boolean
  eventCaught: boolean
  lastEvent: string | null
  chipRef: RefObject<ProductChipEl | null>
  withListener: boolean
  onChipEvent: (sku: string) => void
}

const WebComponentsLiveViz = ({
  phase,
  caseId,
  mounted,
  metaSynced,
  eventCaught,
  lastEvent,
  chipRef,
  withListener,
  onChipEvent,
}: LiveVizProps) => {
  const metaDisplay =
    caseId === 'property' && metaSynced
      ? `${DEMO_META.title} · ${DEMO_META.price} ₽`
      : caseId === 'property' && mounted
        ? 'нет meta'
        : caseId === 'attr' && mounted
          ? 'нет meta'
          : '—'

  const metaTone =
    caseId === 'property' && mounted && !metaSynced
      ? styles.bridgeValueWarn
      : caseId === 'property' && metaSynced
        ? styles.bridgeValueOk
        : styles.bridgeValueMuted

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : caseId === 'attr'
        ? 'attr · sku'
        : caseId === 'property'
          ? metaSynced
            ? 'property · meta'
            : 'meta пусто'
          : eventCaught
            ? 'chip-action · ok'
            : withListener
              ? 'listener · host'
              : 'без listener'

  return (
    <LabVizPanel title="Каталог" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.reactColumn}>
          <p className={styles.colLabel}>React · ProductPage</p>
          <div className={styles.appShell}>
            <header className={styles.appHeader}>
              <span className={styles.brandMark} aria-hidden />
              <strong>Shop</strong>
              <span className={styles.appNav}>Каталог</span>
            </header>
            <div className={styles.appBody}>
              <p className={styles.pageTitle}>Товар</p>
              <div
                className={[
                  styles.chipHost,
                  mounted ? styles.chipHostLive : '',
                  caseId === 'property' && metaSynced ? styles.chipHostOk : '',
                  caseId === 'property' && mounted && !metaSynced ? styles.chipHostWarn : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {mounted ? (
                  <ChipMount
                    caseId={caseId}
                    chipRef={chipRef}
                    withListener={withListener}
                    onChipEvent={onChipEvent}
                  />
                ) : (
                  <p className={styles.chipPlaceholder}>&lt;lab-product-chip /&gt; ещё не смонтирован</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.bridgeColumn}>
          <p className={styles.colLabel}>мост React → CE</p>
          <div className={styles.bridgePanel}>
            <div className={styles.bridgeRow}>
              <p className={styles.bridgeKey}>attribute sku</p>
              <p className={styles.bridgeValue}>
                {mounted ? 'SKU-42' : '—'}
              </p>
            </div>
            <div className={styles.bridgeRow}>
              <p className={styles.bridgeKey}>property meta</p>
              <p className={[styles.bridgeValue, metaTone].filter(Boolean).join(' ')}>
                {mounted ? metaDisplay : '—'}
              </p>
            </div>
            <div className={styles.bridgeRow}>
              <p className={styles.bridgeKey}>CustomEvent</p>
              <span
                className={[
                  styles.eventBadge,
                  eventCaught ? styles.eventBadgeLive : '',
                  caseId === 'event' && mounted && !eventCaught ? styles.eventBadgeMiss : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {caseId === 'event' && eventCaught
                  ? `chip-action · ${lastEvent ?? ''}`
                  : caseId === 'event' && mounted
                    ? 'chip-action · ждём клик'
                    : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export const ReactWebComponentsLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('attr')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [mounted, setMounted] = useState(false)
  const [metaSynced, setMetaSynced] = useState(false)
  const [withListener, setWithListener] = useState(false)
  const [eventCaught, setEventCaught] = useState(false)
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const chipRef = useRef<ProductChipEl | null>(null)
  const chipHostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ensureProductChip()
  }, [])

  const resetViz = () => {
    setPhase('idle')
    setMounted(false)
    setMetaSynced(false)
    setWithListener(false)
    setEventCaught(false)
    setLastEvent(null)
    setHint(null)
    chipRef.current = null
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const handleChipEvent = (sku: string) => {
    setEventCaught(true)
    setLastEvent(sku)
    log('ok', `chip-action · ${sku}`)
    setHint('событие из shadow поймано на host')
    setPhase('done')
  }

  const finishCase = (id: CaseId) => {
    if (id === 'attr') {
      log('ok', 'sku → attribute · meta пусто')
      setHint('строковый sku — достаточно атрибута')
    } else if (id === 'property') {
      log('ok', 'el.meta → property · цена в shadow')
      setHint('объект meta — через property на host')
    }
    setPhase('done')
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    if (caseId === 'attr') {
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('mount')
            setMounted(true)
          },
          () => finishCase('attr'),
        ],
        (tl) => {
          const host = chipHostRef.current
          if (!host) return
          tl.fromTo(host, { opacity: 0.7 }, { opacity: 1, duration: 0.5, ease: 'power2.inOut' }, 0)
        },
        () => setBusy(false),
      )
      return
    }

    if (caseId === 'property') {
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('mount')
            setMounted(true)
          },
          () => {
            setPhase('sync')
            const el = chipRef.current
            if (el) el.meta = DEMO_META
            setMetaSynced(true)
          },
          () => finishCase('property'),
        ],
        null,
        () => setBusy(false),
      )
      return
    }

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('mount')
          setWithListener(true)
          setMounted(true)
        },
        () => {
          setPhase('sync')
          chipRef.current?.shadowRoot?.querySelector('button')?.click()
        },
      ],
      null,
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('attr')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
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

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <div ref={chipHostRef}>
        <WebComponentsLiveViz
          phase={phase}
          caseId={caseId}
          mounted={mounted}
          metaSynced={metaSynced}
          eventCaught={eventCaught}
          lastEvent={lastEvent}
          chipRef={chipRef}
          withListener={withListener}
          onChipEvent={handleChipEvent}
        />
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
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
      title="Web Components в React"
      lead="Живой `<lab-product-chip>` в React: атрибут `sku`, property `meta` и событие `chip-action`."
      problem={problem}
      code={code}
    />
  )
}
