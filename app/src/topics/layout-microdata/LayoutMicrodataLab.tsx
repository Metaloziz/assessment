import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutMicrodataLab.module.css'

const TOPIC_ID = '178-layout-microdata'
const STEP = 0.55

type CaseId = 'jsonld' | 'microdata' | 'none'
type Phase = 'idle' | 'page' | 'parse' | 'card' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'jsonld', label: 'JSON-LD' },
  { id: 'microdata', label: 'Microdata' },
  { id: 'none', label: 'Без разметки' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  jsonld: (
    <>
      Блок <code>application/ld+json</code> с <code>Product</code> — парсер собирает имя, цену и рейтинг в карточку.
    </>
  ),
  microdata: (
    <>
      Те же поля через <code>itemscope</code> / <code>itemprop</code> на видимых узлах — граф сущности тот же.
    </>
  ),
  none: (
    <>
      На странице только текст и цена глазу; машиночитаемых свойств нет — в выдаче обычный сниппет.
    </>
  ),
}

const PRODUCT = {
  name: 'Наушники Pro',
  price: '4 990 ₽',
  rating: '4.6 · 128 отзывов',
}

const SNIPPETS_BY_CASE: Record<CaseId, InteractiveSnippet[]> = {
  jsonld: [
    {
      id: 'product-jsonld',
      label: 'product.jsonld.html',
      note: 'JSON-LD рядом с карточкой товара; @type Product + Offer.',
      executable: false,
      languageLabel: 'html',
      code: `<article class="product">
  <h1>Наушники Pro</h1>
  <p>4 990 ₽ · ★ 4.6</p>
</article>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product", /* ← тип сущности */
  "name": "Наушники Pro",
  "offers": {
    "@type": "Offer",
    "price": "4990", /* ← машиночитаемая цена */
    "priceCurrency": "RUB"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "128"
  }
}
</script>`,
    },
    {
      id: 'check-jsonld',
      label: 'check.mjs',
      note: 'После выкладки — валидатор rich results, не только глазами.',
      executable: false,
      code: `// ← проверка: Rich Results Test / Schema Markup Validator
// ожидаем Product + Offer.price + AggregateRating
export const expected = {
  '@type': 'Product',
  name: 'Наушники Pro',
  'offers.price': '4990',
  'aggregateRating.ratingValue': '4.6',
};`,
    },
  ],
  microdata: [
    {
      id: 'product-microdata',
      label: 'product.microdata.html',
      note: 'itemscope на карточке; itemprop на имени, цене, рейтинге.',
      executable: false,
      languageLabel: 'html',
      code: `<article
  itemscope
  itemtype="https://schema.org/Product" /* ← тип */
>
  <h1 itemprop="name">Наушники Pro</h1>

  <div
    itemprop="offers"
    itemscope
    itemtype="https://schema.org/Offer"
  >
    <span itemprop="price">4990</span> {/* ← цена в DOM */}
    <meta itemprop="priceCurrency" content="RUB" />
  </div>

  <div
    itemprop="aggregateRating"
    itemscope
    itemtype="https://schema.org/AggregateRating"
  >
    <span itemprop="ratingValue">4.6</span>
    <span itemprop="reviewCount">128</span>
  </div>
</article>`,
    },
    {
      id: 'check-microdata',
      label: 'check.mjs',
      note: 'Тот же граф Product, что у JSON-LD — формат другой, словарь тот же.',
      executable: false,
      code: `// ← Schema.org Product через Microdata
export const expected = {
  itemtype: 'https://schema.org/Product',
  name: 'Наушники Pro',
  'offers.price': '4990',
  'aggregateRating.ratingValue': '4.6',
};`,
    },
  ],
  none: [
    {
      id: 'product-plain',
      label: 'product.plain.html',
      note: 'Видимый UI без Schema.org — краулеру не из чего собрать Product.',
      executable: false,
      languageLabel: 'html',
      code: `<article class="product">
  <!-- ← нет JSON-LD и нет itemscope -->
  <h1>Наушники Pro</h1>
  <p>4 990 ₽ · ★ 4.6 (128 отзывов)</p>
</article>`,
    },
    {
      id: 'check-none',
      label: 'check.mjs',
      note: 'Парсер видит текст страницы, но не тип Product и не Offer.',
      executable: false,
      code: `export const extracted = {
  // ← structured data: пусто
  types: [],
  richFields: null,
};`,
    },
  ],
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
    defaults: { duration: 0.5, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

type VizProps = {
  phase: Phase
  caseId: CaseId
  stageRef: MutableRefObject<HTMLDivElement | null>
}

function MicrodataViz({ phase, caseId, stageRef }: VizProps) {
  const ok = caseId !== 'none'
  const running = phase !== 'idle'
  const showFields = phase === 'card' || phase === 'done'
  const parseOn = phase === 'parse' || phase === 'card' || phase === 'done'
  const cardOn = phase === 'card' || phase === 'done'

  const sourceLabel =
    caseId === 'jsonld' ? 'JSON-LD script' : caseId === 'microdata' ? 'itemscope / itemprop' : 'только видимый текст'

  return (
    <LabVizPanel
      title="Страница → парсер → карточка"
      meta={ok ? 'Product + Offer' : 'plain snippet'}
    >
      <div ref={stageRef} className={styles.stage}>
        <div
          className={[
            styles.col,
            running && styles.colOn,
            phase === 'page' && styles.colActive,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.colLabel}>Страница</span>
          <div className={styles.pageCard}>
            <strong className={styles.pageTitle}>{PRODUCT.name}</strong>
            <span className={styles.pagePrice}>{PRODUCT.price}</span>
            <span className={styles.pageRating}>★ 4.6</span>
            <span className={styles.sourceTag}>{sourceLabel}</span>
          </div>
        </div>

        <div
          className={[
            styles.arrow,
            parseOn && styles.arrowOn,
            phase === 'parse' && styles.arrowActive,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        >
          →
        </div>

        <div
          className={[
            styles.col,
            parseOn && styles.colOn,
            phase === 'parse' && styles.colActive,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.colLabel}>Парсер</span>
          <div className={styles.parseBox}>
            {ok ? (
              <>
                <code>@type: Product</code>
                <code>offers.price</code>
                <code>aggregateRating</code>
              </>
            ) : (
              <span className={styles.parseEmpty}>нет structured data</span>
            )}
          </div>
        </div>

        <div
          className={[
            styles.arrow,
            cardOn && styles.arrowOn,
            phase === 'card' && styles.arrowActive,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        >
          →
        </div>

        <div
          className={[
            styles.col,
            cardOn && styles.colOn,
            (phase === 'card' || phase === 'done') && styles.colActive,
            phase === 'done' && ok && styles.colOk,
            phase === 'done' && !ok && styles.colWarn,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.colLabel}>Rich result</span>
          <div className={ok ? styles.richOk : styles.richPlain}>
            {ok && showFields ? (
              <>
                <strong>{PRODUCT.name}</strong>
                <span className={styles.richPrice}>{PRODUCT.price}</span>
                <span className={styles.richStars}>★★★★☆ · 4.6</span>
                <span className={styles.richMeta}>Product · In stock</span>
              </>
            ) : showFields ? (
              <>
                <strong className={styles.plainTitle}>Наушники Pro — купить</strong>
                <span className={styles.plainUrl}>example.com › catalog</span>
                <span className={styles.plainDesc}>4 990 ₽ · отзывы на странице…</span>
              </>
            ) : (
              <span className={styles.richPlaceholder}>ожидание извлечения…</span>
            )}
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutMicrodataLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('jsonld')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (stageRef.current) gsap.set(stageRef.current, { clearProps: 'transform,opacity' })
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
    const ok = caseId !== 'none'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('page')
          log('info', `Страница: «${PRODUCT.name}», источник — ${
            caseId === 'jsonld' ? 'JSON-LD' : caseId === 'microdata' ? 'Microdata' : 'только HTML-текст'
          }`)
        },
        () => {
          setPhase('parse')
          if (ok) log('ok', 'Парсер: Product + Offer + AggregateRating')
          else log('warn', 'Парсер: structured data не найдена')
        },
        () => {
          setPhase('card')
          if (ok) log('ok', `Rich: ${PRODUCT.price}, ${PRODUCT.rating}`)
          else log('err', 'Обычный сниппет без цены и звёзд')
        },
        () => {
          setPhase('done')
          log(ok ? 'ok' : 'err', ok ? 'Карточка сущности собрана' : 'Rich result недоступен')
        },
      ],
      (tl) => {
        if (stageRef.current) {
          tl.fromTo(
            stageRef.current,
            { opacity: 0.65, y: 4 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
            0,
          )
        }
      },
      () => {
        setBusy(false)
        setHint(
          ok
            ? caseId === 'jsonld'
              ? 'JSON-LD отдаёт тот же Schema.org-граф, что и Microdata, без привязки к CSS.'
              : 'Microdata дублирует видимые поля в itemprop — словарь тот же, формат другой.'
            : 'Без JSON-LD/Microdata краулер не построит Product — останется plain snippet.',
        )
      },
    )
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
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => {
            tlRef.current?.kill()
            setBusy(false)
            clear()
            resetViz()
            setCaseId('jsonld')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Микроразметка даёт краулеру тип и свойства сущности (Product, цена, рейтинг), чтобы собрать rich
        result, а не только видимый текст.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <MicrodataViz phase={phase} caseId={caseId} stageRef={stageRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.panel}>
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
        intro="Schema.org через JSON-LD или Microdata; без разметки — только plain snippet."
        snippets={SNIPPETS_BY_CASE[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Микроразметка"
      lead="Schema.org → JSON-LD или Microdata → rich-карточка в выдаче."
      problem={problem}
      code={code}
    />
  )
}
