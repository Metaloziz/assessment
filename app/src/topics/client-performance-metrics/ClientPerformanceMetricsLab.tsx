import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog, type LabLogKind } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ClientPerformanceMetricsLab.module.css'

const TOPIC_ID = '14-client-performance-metrics'
const STEP = 0.6
const LCP_LATE_MS = 2700
const INP_BLOCK_MS = 280

const HERO_SRC =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#243044"/>
      <circle cx="380" cy="320" r="160" fill="#69b1ff" fill-opacity="0.28"/>
      <text x="560" y="350" fill="#d7e3f4" font-size="56" font-family="system-ui,sans-serif">hero.webp</text>
    </svg>`,
  )

type MetricId = 'lcp' | 'inp' | 'cls'
type LcpCase = 'late' | 'priority'
type InpCase = 'block' | 'yield'
type ClsCase = 'jump' | 'slot'
type CaseId = LcpCase | InpCase | ClsCase
type Phase = 'idle' | 'run' | 'done'
type Grade = 'good' | 'ni' | 'poor'

type Reading = {
  label: string
  value: string
  grade: Grade
}

const METRICS: Array<{ id: MetricId; label: string }> = [
  { id: 'lcp', label: 'LCP' },
  { id: 'inp', label: 'INP' },
  { id: 'cls', label: 'CLS' },
]

const CASES: Record<MetricId, Array<{ id: CaseId; label: string }>> = {
  lcp: [
    { id: 'late', label: 'Поздний hero' },
    { id: 'priority', label: 'Сразу' },
  ],
  inp: [
    { id: 'block', label: 'Long task' },
    { id: 'yield', label: 'Короткий handler' },
  ],
  cls: [
    { id: 'jump', label: 'Без слота' },
    { id: 'slot', label: 'Резерв места' },
  ],
}

const CODE_INTRO: Record<MetricId, string> = {
  lcp: '`LCP` — отрисовка самого крупного элемента в viewport. LCP-картинку не делают `loading="lazy"`.',
  inp: '`INP` — от клика до следующего кадра. Long task на main thread держит интерфейс.',
  cls: '`CLS` копит неожиданные сдвиги. Слот с высотой резервирует место до прихода баннера.',
}

const SNIPPET_HERO_LATE: InteractiveSnippet = {
  id: 'hero-late',
  label: 'src/Hero.tsx',
  note: '`loading="lazy"` на LCP-кандидате откладывает главный кадр.',
  executable: false,
  languageLabel: 'tsx',
  code: `export const Hero = () => (
  <img
    src="/hero.webp"
    alt=""
    loading="lazy" // ← LCP не должен быть lazy
  />
);`,
}

const SNIPPET_HERO_OK: InteractiveSnippet = {
  id: 'hero-ok',
  label: 'src/Hero.tsx',
  note: 'Размеры известны сразу; `fetchPriority` поднимает LCP-ресурс.',
  executable: false,
  languageLabel: 'tsx',
  code: `export const Hero = () => (
  <img
    src="/hero.webp"
    width={1200}
    height={630}
    fetchPriority="high" // ← LCP-кандидат
    alt=""
  />
);`,
}

const SNIPPET_LCP_REPORT: InteractiveSnippet = {
  id: 'report-lcp',
  label: 'src/report.ts',
  note: '`onLCP` отдаёт элемент-кандидат в `entries`.',
  executable: false,
  languageLabel: 'ts',
  code: `import { onLCP } from 'web-vitals';

onLCP((metric) => {
  console.log(metric.value, metric.rating); // ← ms и good/ni/poor
  // metric.entries — LCP-элемент
});`,
}

const SNIPPET_BUY_BLOCK: InteractiveSnippet = {
  id: 'buy-block',
  label: 'src/BuyButton.tsx',
  note: 'Синхронный разбор на клике занимает main thread до следующего кадра.',
  executable: false,
  languageLabel: 'tsx',
  code: `export const BuyButton = () => (
  <button
    type="button"
    onClick={() => {
      JSON.parse(hugePayload); // ← long task
      addToCart();
    }}
  >
    Купить
  </button>
);`,
}

const SNIPPET_BUY_OK: InteractiveSnippet = {
  id: 'buy-ok',
  label: 'src/BuyButton.tsx',
  note: 'Короткий handler: корзина обновляется, тяжёлое уходит с main thread.',
  executable: false,
  languageLabel: 'tsx',
  code: `export const BuyButton = () => (
  <button
    type="button"
    onClick={() => {
      addToCart(); // ← короткий handler
      queueMicrotask(() => indexSearch(hugePayload));
    }}
  >
    Купить
  </button>
);`,
}

const SNIPPET_INP_REPORT: InteractiveSnippet = {
  id: 'report-inp',
  label: 'src/report.ts',
  note: '`onINP` смотрит почти все клики/тапы, не только первый.',
  executable: false,
  languageLabel: 'ts',
  code: `import { onINP } from 'web-vitals';

onINP((metric) => {
  console.log(metric.value, metric.rating); // ← ms до next paint
});`,
}

const SNIPPET_AD_JUMP: InteractiveSnippet = {
  id: 'ad-jump',
  label: 'src/AdSlot.tsx',
  note: 'Баннер вставляется в поток без высоты — контент ниже уезжает.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { html?: string };

export const AdSlot = ({ html }: Props) => (
  <div className="ad">{html}</div>
  // ← высота 0, пока баннер не пришёл
);`,
}

const SNIPPET_AD_OK: InteractiveSnippet = {
  id: 'ad-ok',
  label: 'src/AdSlot.tsx',
  note: '`minHeight` резервирует место до ответа рекламы.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { html?: string };

export const AdSlot = ({ html }: Props) => (
  <div className="ad" style={{ minHeight: 88 }}>
    {html}
  </div> // ← слот уже в потоке
);`,
}

const SNIPPET_CLS_REPORT: InteractiveSnippet = {
  id: 'report-cls',
  label: 'src/report.ts',
  note: '`onCLS` суммирует неожиданные сдвиги за жизнь страницы.',
  executable: false,
  languageLabel: 'ts',
  code: `import { onCLS } from 'web-vitals';

onCLS((metric) => {
  console.log(metric.value, metric.rating); // ← порог good ≤ 0.1
});`,
}

const CODE_SNIPPETS: Record<MetricId, InteractiveSnippet[]> = {
  lcp: [SNIPPET_HERO_LATE, SNIPPET_HERO_OK, SNIPPET_LCP_REPORT],
  inp: [SNIPPET_BUY_BLOCK, SNIPPET_BUY_OK, SNIPPET_INP_REPORT],
  cls: [SNIPPET_AD_JUMP, SNIPPET_AD_OK, SNIPPET_CLS_REPORT],
}

const PAIN: Record<MetricId, string> = {
  lcp: 'LCP — момент, когда отрисован самый крупный элемент в viewport. Поздний hero двигает метрику, даже если шапка уже на месте.',
  inp: 'INP — задержка от клика до следующего кадра. Long task на main thread держит кнопку «мёртвой».',
  cls: 'CLS копит неожиданные сдвиги. Баннер без зарезервированной высоты уезжает кнопку под пальцем.',
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  late: <>Hero приходит с задержкой — LCP-кандидат появляется после порога «хорошо».</>,
  priority: <>Тот же кадр на месте сразу — LCP близко к первой отрисовке стенда.</>,
  block: (
    <>
      Обработчик крутит main thread ~{INP_BLOCK_MS} мс — INP выше 200 мс.
    </>
  ),
  yield: <>Короткий handler: корзина обновляется на следующем кадре.</>,
  jump: <>Баннер вставляется в поток без слота — блок с ценой уезжает вниз.</>,
  slot: <>Высота слота известна заранее — баннер заполняет место, сдвига нет.</>,
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<{ at: number; run: () => void }>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) => {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step.run()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  for (const step of steps) {
    tl.call(step.run, undefined, step.at)
  }
  motion?.(tl)
}

const gradeKind = (grade: Grade): LabLogKind =>
  grade === 'good' ? 'ok' : grade === 'ni' ? 'warn' : 'err'

const gradeLcp = (ms: number): Grade => (ms <= 2500 ? 'good' : ms <= 4000 ? 'ni' : 'poor')
const gradeInp = (ms: number): Grade => (ms <= 200 ? 'good' : ms <= 500 ? 'ni' : 'poor')
const gradeCls = (value: number): Grade => (value <= 0.1 ? 'good' : value <= 0.25 ? 'ni' : 'poor')

const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`)

const gradeLabel: Record<Grade, string> = {
  good: 'good',
  ni: 'NI',
  poor: 'poor',
}

const blockMs = (ms: number) => {
  const end = performance.now() + ms
  while (performance.now() < end) {
    /* long task */
  }
}

const nextPaint = (fn: () => void) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn)
  })
}

type ShopVizProps = {
  metric: MetricId
  phase: Phase
  heroOn: boolean
  inCart: boolean
  banner: 'off' | 'empty' | 'filled'
  reading: Reading | null
  shopRef: MutableRefObject<HTMLDivElement | null>
  heroRef: MutableRefObject<HTMLImageElement | null>
  priceRef: MutableRefObject<HTMLParagraphElement | null>
}

const ShopViz = ({
  metric,
  phase,
  heroOn,
  inCart,
  banner,
  reading,
  shopRef,
  heroRef,
  priceRef,
}: ShopVizProps) => {
  const meta =
    phase === 'idle'
      ? 'до прогона'
      : phase === 'run'
        ? metric === 'lcp'
          ? 'ждём LCP-кандидат'
          : metric === 'inp'
            ? 'клик → next paint'
            : 'сдвиг layout'
        : reading
          ? `${reading.label} ${reading.value} · ${gradeLabel[reading.grade]}`
          : 'готово'

  const showHeroSlot = metric === 'lcp'
  const showBanner = metric === 'cls'

  return (
    <LabVizPanel title="Shop" meta={meta}>
      <div
        ref={shopRef}
        className={[
          styles.shop,
          phase === 'done' && reading?.grade === 'good' ? styles.shopOk : '',
          phase === 'done' && reading?.grade === 'ni' ? styles.shopWarn : '',
          phase === 'done' && reading?.grade === 'poor' ? styles.shopBad : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden />
            <strong>Shop</strong>
          </div>
          <span className={styles.nav}>Catalog</span>
        </header>

        <div className={styles.body}>
          {showBanner && banner !== 'off' ? (
            <div
              className={[
                styles.ad,
                banner === 'empty' ? styles.adEmpty : '',
                banner === 'filled' ? styles.adFilled : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {banner === 'filled' ? 'promo · −20%' : 'ad slot'}
            </div>
          ) : null}

          {showHeroSlot ? (
            <div className={styles.heroSlot}>
              {heroOn ? (
                <img
                  ref={heroRef}
                  className={styles.hero}
                  src={HERO_SRC}
                  width={1200}
                  height={630}
                  alt=""
                />
              ) : (
                <span className={styles.heroGhost}>hero.webp</span>
              )}
            </div>
          ) : null}

          <h3 className={styles.title}>Nova Run</h3>
          <p ref={priceRef} className={styles.price}>
            12 900 ₽
          </p>
          <div className={styles.actions}>
            <LabButton variant="primary" size="sm" disabled>
              {inCart ? 'В корзине' : 'Купить'}
            </LabButton>
            {metric === 'inp' ? (
              <span className={styles.cartMeta}>{inCart ? 'cart · 1' : 'cart · 0'}</span>
            ) : null}
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

const MetricSwitch = ({
  value,
  disabled,
  onChange,
}: {
  value: MetricId
  disabled?: boolean
  onChange: (id: MetricId) => void
}) => (
  <div className={shell.row}>
    {METRICS.map((m) => (
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

const defaultCase = (metric: MetricId): CaseId => CASES[metric][0]!.id

export const ClientPerformanceMetricsLab = () => {
  const { lines, log, clear } = useLabLog()
  const [metric, setMetric] = useState<MetricId>('lcp')
  const [caseId, setCaseId] = useState<CaseId>('late')
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [heroOn, setHeroOn] = useState(false)
  const [inCart, setInCart] = useState(false)
  const [banner, setBanner] = useState<'off' | 'empty' | 'filled'>('off')
  const [reading, setReading] = useState<Reading | null>(null)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const shopRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLImageElement | null>(null)
  const priceRef = useRef<HTMLParagraphElement | null>(null)
  const t0Ref = useRef(0)

  const idleBanner = (nextMetric: MetricId, nextCase: CaseId): 'off' | 'empty' | 'filled' => {
    if (nextMetric !== 'cls') return 'off'
    return nextCase === 'slot' ? 'empty' : 'off'
  }

  const resetViz = (nextMetric = metric, nextCase = caseId) => {
    setPhase('idle')
    setHint(null)
    setHeroOn(false)
    setInCart(false)
    setBanner(idleBanner(nextMetric, nextCase))
    setReading(null)
    if (shopRef.current) gsap.set(shopRef.current, { clearProps: 'transform,opacity' })
    if (heroRef.current) gsap.set(heroRef.current, { clearProps: 'opacity' })
  }

  const selectMetric = (next: MetricId) => {
    tlRef.current?.kill()
    setBusy(false)
    setMetric(next)
    const nextCase = defaultCase(next)
    setCaseId(nextCase)
    clear()
    resetViz(next, nextCase)
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz(metric, next)
  }

  const finish = (next: Reading, hintText: string, receipt: string) => {
    setReading(next)
    setPhase('done')
    log(gradeKind(next.grade), receipt)
    setHint(hintText)
    setBusy(false)
  }

  const runLcp = (late: boolean) => {
    t0Ref.current = performance.now()
    setPhase('run')
    const reveal = () => {
      flushSync(() => setHeroOn(true))
      const img = heroRef.current
      const painted = () => {
        const ms = performance.now() - t0Ref.current
        const grade = gradeLcp(ms)
        finish(
          { label: 'LCP', value: fmtMs(ms), grade },
          grade === 'good'
            ? 'Итог: hero уже был LCP-кандидатом — уложились в 2.5 с'
            : 'Итог: поздний hero.webp утащил LCP за порог «хорошо»',
          `LCP ${fmtMs(ms)} · ${gradeLabel[grade]}`,
        )
        log('info', 'element · hero.webp')
      }
      if (img) {
        void img.decode().then(painted).catch(painted)
      } else {
        nextPaint(painted)
      }
    }

    tlRef.current?.kill()
    const delay = late ? LCP_LATE_MS / 1000 : 0.05
    const tl = gsap.timeline()
    tlRef.current = tl
    tl.call(reveal, undefined, delay)
    if (!reducedMotion()) {
      tl.call(
        () => {
          const el = heroRef.current
          if (!el) return
          gsap.fromTo(el, { opacity: 0.35 }, { opacity: 1, duration: 0.5, ease: 'power2.inOut' })
        },
        undefined,
        delay + 0.02,
      )
    }
  }

  const runInp = (slow: boolean) => {
    setPhase('run')
    const tClick = performance.now()
    if (slow) blockMs(INP_BLOCK_MS)
    nextPaint(() => {
      setInCart(true)
      const ms = performance.now() - tClick
      const grade = gradeInp(ms)
      finish(
        { label: 'INP', value: fmtMs(ms), grade },
        grade === 'good'
          ? 'Итог: короткий handler — следующий кадр сразу'
          : 'Итог: long task на клике задержал next paint',
        `INP ${fmtMs(ms)} · ${gradeLabel[grade]}`,
      )
      log('info', slow ? 'handler · busy loop' : 'handler · addToCart')
    })
  }

  const runCls = (reserve: boolean) => {
    setPhase('run')
    playTimeline(
      tlRef,
      [
        {
          at: STEP,
          run: () => {
            const shopH = shopRef.current?.getBoundingClientRect().height ?? 1
            const before = priceRef.current?.getBoundingClientRect().top ?? 0
            flushSync(() => setBanner('filled'))
            const after = priceRef.current?.getBoundingClientRect().top ?? before
            const moved = Math.max(0, after - before)
            const distance = moved / shopH
            const impact = Math.min(1, Math.max(distance, moved > 1 ? 0.7 : 0))
            const value = Number((impact * distance).toFixed(3))
            const grade = gradeCls(value)
            finish(
              { label: 'CLS', value: value.toFixed(3), grade },
              reserve
                ? 'Итог: слот уже занимал высоту — сдвига нет'
                : 'Итог: баннер без высоты сдвинул цену и кнопку',
              `CLS ${value.toFixed(3)} · ${gradeLabel[grade]}`,
            )
            log('info', reserve ? 'ad · min-height' : 'ad · height 0 → insert')
          },
        },
      ],
      null,
      () => undefined,
    )
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    if (metric === 'lcp') {
      runLcp(caseId === 'late')
      return
    }
    if (metric === 'inp') {
      runInp(caseId === 'block')
      return
    }
    runCls(caseId === 'slot')
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setMetric('lcp')
    setCaseId('late')
    resetViz('lcp', 'late')
  }

  const problem = (
    <div className={shell.panel}>
      <MetricSwitch value={metric} disabled={busy} onChange={selectMetric} />

      <div className={shell.row}>
        {CASES[metric].map((c) => (
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

      <p className={shell.pain}>{PAIN[metric]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ShopViz
        metric={metric}
        phase={phase}
        heroOn={heroOn}
        inCart={inCart}
        banner={banner}
        reading={reading}
        shopRef={shopRef}
        heroRef={heroRef}
        priceRef={priceRef}
      />

      {hint ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <MetricSwitch value={metric} onChange={selectMetric} />
      <InteractiveCodePanel
        key={metric}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[metric]}
        snippets={CODE_SNIPPETS[metric]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Клиентские метрики"
      lead="Core Web Vitals в мини-магазине: когда появляется главное, как откликается клик и прыгает ли вёрстка."
      problem={problem}
      code={code}
    />
  )
}
