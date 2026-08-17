import { useCallback, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, LabNode } from '../../components/lab/LabViz'
import styles from './LazyLoadingCriticalPathLab.module.css'

const TOPIC_ID = '26-lazy-loading-critical-path'
const STEP = 0.65
const GRID_COUNT = 6

type Pattern = 'lazy' | 'crp'
type LazyCase = 'eager' | 'lazy' | 'lcp'
type CrpCase = 'blocking' | 'split'
type CaseId = LazyCase | CrpCase

type LazyPhase = 'idle' | 'start' | 'scroll' | 'done'
type CrpPhase = 'idle' | 'html' | 'css' | 'js' | 'render' | 'fcp' | 'done'

type ImgStatus = 'pending' | 'loading' | 'loaded' | 'error'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'lazy', label: 'Lazy-loading' },
  { id: 'crp', label: 'Critical path' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  lazy: [
    { id: 'eager', label: 'Все eager' },
    { id: 'lazy', label: 'Ниже сгиба lazy' },
    { id: 'lcp', label: 'Lazy на LCP' },
  ],
  crp: [
    { id: 'blocking', label: 'Блокирующий CSS+JS' },
    { id: 'split', label: 'Critical CSS + defer' },
  ],
}

/** Локальные SVG — без внешнего CDN (picsum часто 403 / блокируется). */
const imgUrl = (slot: string, runId: number) => {
  const hues: Record<string, number> = {
    hero: 210,
    'card-0': 160,
    'card-1': 280,
    'card-2': 25,
    'card-3': 340,
    'card-4': 55,
    'card-5': 190,
  }
  const hue = (hues[slot] ?? 200) + runId * 7
  const label = slot === 'hero' ? `Hero · run ${runId}` : slot.replace('card-', '#')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="100%" height="100%" fill="hsl(${hue} 42% 32%)"/><text x="160" y="90" fill="hsl(${hue} 20% 92%)" font-size="16" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
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
}

const PAIN: Record<Pattern, ReactNode> = {
  lazy: (
    <>
      На старте не нужны все картинки сразу. <code>loading="lazy"</code> откладывает запрос, пока элемент
      не приблизится к viewport — но LCP-кандидат так откладывать нельзя.
    </>
  ),
  crp: (
    <>
      Critical rendering path — ресурсы, без которых браузер не рисует первый экран. Синхронный CSS и JS
      на пути до FCP задерживают отрисовку; critical CSS и defer выносят хвост за пределы старта.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  eager: <>Все <code>&lt;img&gt;</code> с <code>loading="eager"</code> — сеть конкурирует за bandwidth уже на старте.</>,
  lazy: (
    <>
      Hero eager, сетка ниже сгиба — <code>loading="lazy"</code>; до прокрутки запросы не уходят.
    </>
  ),
  lcp: (
    <>
      Hero (LCP) ошибочно с <code>loading="lazy"</code> — главная картинка появляется позже, чем могла бы.
    </>
  ),
  blocking: (
    <>
      Полный CSS и синхронный JS блокируют парсинг и render tree — FCP сдвигается вправо по таймлайну.
    </>
  ),
  split: (
    <>
      Inline critical CSS даёт ранний FCP; полный CSS и app-бандл — <code>defer</code> после первого кадра.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  lazy: '`loading="lazy"` у `<img>` и `React.lazy` + `Suspense` для code splitting — отложенная загрузка вне первого экрана.',
  crp: 'Critical CSS inline в `<head>`, остальное CSS/JS — defer/async; меньше блокировок до FCP.',
}

const SNIPPET_LAZY_HTML: InteractiveSnippet = {
  id: 'lazy-img-html',
  label: 'index.html',
  note: 'Lazy ниже сгиба; hero и LCP — eager + размеры против CLS.',
  executable: false,
  languageLabel: 'html',
  code: `<img
  src="hero.jpg"
  alt="Hero"
  width="1200"
  height="480"
  fetchpriority="high"
/> <!-- ← LCP: не lazy -->

<img
  loading="lazy"
  src="gallery-4.jpg"
  alt="Слайд 4"
  width="640"
  height="360"
/> <!-- ← ниже fold -->`,
}

const SNIPPET_LAZY_REACT: InteractiveSnippet = {
  id: 'lazy-react-split',
  label: 'src/App.tsx',
  note: 'Dynamic import выносит страницу в отдельный чанк; Suspense держит fallback.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { lazy, Suspense } from 'react';

// ═══════════════════════════════════════════
// LAZY ← code splitting маршрута / виджета
// ═══════════════════════════════════════════
const Settings = lazy(() => import('./SettingsPage'));

export const App = () => (
  <Suspense fallback={<p>Загрузка…</p>}>
    <Settings /> {/* ← чанк грузится по demand */}
  </Suspense>
);`,
}

const SNIPPET_CRP_HEAD: InteractiveSnippet = {
  id: 'crp-critical-css',
  label: 'index.html',
  note: 'Critical CSS inline; полный stylesheet — без блокировки render.',
  executable: false,
  languageLabel: 'html',
  code: `<head>
  <style>
    /* CRITICAL ← above-the-fold */
    .hero { font-size: 2rem; }
  </style>
  <link
    rel="stylesheet"
    href="app.css"
    media="print"
    onload="this.media='all'"
  /> <!-- ← не блокирует первый paint -->
  <script src="app.js" defer></script> <!-- ← после DOM -->
</head>`,
}

const SNIPPET_CRP_BLOCK: InteractiveSnippet = {
  id: 'crp-blocking',
  label: 'index-blocking.html',
  note: 'Render-blocking CSS и sync script на критическом пути.',
  executable: false,
  languageLabel: 'html',
  code: `<head>
  <link rel="stylesheet" href="app.css" />
  <!-- BLOCK ← CSSOM ждёт весь файл -->
  <script src="analytics.js"></script>
  <!-- BLOCK ← парсинг HTML стоит -->
</head>
<body>
  <h1 class="hero">Каталог</h1>
</body>`,
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  lazy: [SNIPPET_LAZY_HTML, SNIPPET_LAZY_REACT],
  crp: [SNIPPET_CRP_HEAD, SNIPPET_CRP_BLOCK],
}

const heroLoading = (caseId: LazyCase): 'lazy' | 'eager' =>
  caseId === 'lcp' ? 'lazy' : 'eager'

const gridLoading = (caseId: LazyCase): 'lazy' | 'eager' =>
  caseId === 'eager' ? 'eager' : 'lazy'

type LazyLiveProps = {
  caseId: LazyCase
  runId: number
  phase: LazyPhase
  statuses: Record<string, ImgStatus>
  onStatus: (id: string, status: ImgStatus) => void
  viewportRef: MutableRefObject<HTMLDivElement | null>
}

const LazyLiveViz = ({ caseId, runId, phase, statuses, onStatus, viewportRef }: LazyLiveProps) => {
  const activeRun = runId > 0
  return (
  <LabVizPanel
    title="Scrollport"
    meta={
      <>
        hero · <code>{heroLoading(caseId)}</code> · grid · <code>{gridLoading(caseId)}</code>
      </>
    }
  >
    <div ref={viewportRef} className={styles.viewport}>
      <div className={styles.foldLine}>↑ above the fold</div>
      <div className={styles.hero}>
        <span className={styles.heroBadge}>LCP candidate</span>
        <img
          key={`hero-${runId}`}
          className={styles.heroImg}
          src={activeRun ? imgUrl('hero', runId) : undefined}
          alt="Hero"
          width={640}
          height={180}
          loading={heroLoading(caseId)}
          decoding="async"
          onLoad={() => onStatus('hero', 'loaded')}
          onError={() => onStatus('hero', 'error')}
        />
      </div>
      <div className={styles.grid}>
        {Array.from({ length: GRID_COUNT }, (_, i) => {
          const id = `card-${i}`
          const status = activeRun ? (statuses[id] ?? 'pending') : 'pending'
          return (
            <div key={`${id}-${runId}`} className={styles.card}>
              <img
                className={styles.cardImg}
                src={activeRun ? imgUrl(id, runId) : undefined}
                alt={`Card ${i + 1}`}
                width={320}
                height={180}
                loading={gridLoading(caseId)}
                decoding="async"
                onLoad={() => onStatus(id, 'loaded')}
                onError={() => onStatus(id, 'error')}
              />
              <div className={styles.cardMeta}>
                <span>#{i + 1}</span>
                <span
                  className={
                    status === 'loaded'
                      ? styles.statusLoaded
                      : status === 'error'
                        ? styles.statusErr
                        : status === 'loading'
                          ? styles.statusLoading
                          : styles.statusPending
                  }
                >
                  {status === 'loaded'
                    ? 'loaded'
                    : status === 'error'
                      ? 'error'
                      : status === 'loading'
                        ? 'loading…'
                        : 'pending'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
    {phase === 'scroll' ? (
      <p className={shell.hint}>Прокрутите scrollport — lazy-картинки запросятся при входе во viewport.</p>
    ) : null}
  </LabVizPanel>
  )
}

type CrpVizProps = {
  caseId: CrpCase
  phase: CrpPhase
}

const nodeState = (phase: CrpPhase, step: CrpPhase, split: boolean): 'idle' | 'active' | 'ok' | 'err' => {
  const orderBlocking: CrpPhase[] = ['html', 'css', 'js', 'render', 'fcp']
  const orderSplit: CrpPhase[] = ['html', 'css', 'render', 'fcp', 'js']
  const order = split ? orderSplit : orderBlocking
  const idx = order.indexOf(step)
  const cur = phase === 'done' ? order.length : order.indexOf(phase)
  if (phase === 'idle') return 'idle'
  if (cur < 0) return 'idle'
  if (cur === idx) return step === 'js' && !split ? 'err' : 'active'
  if (cur > idx) return step === 'js' && !split ? 'err' : 'ok'
  return 'idle'
}

const CrpViz = ({ caseId, phase }: CrpVizProps) => {
  const split = caseId === 'split'
  const steps = split
    ? [
        { id: 'html' as const, label: 'HTML', sub: 'parse' },
        { id: 'css' as const, label: 'critical CSS', sub: 'inline' },
        { id: 'render' as const, label: 'render tree', sub: 'paint' },
        { id: 'fcp' as const, label: 'FCP', sub: 'ранний' },
        { id: 'js' as const, label: 'defer JS + CSS', sub: 'после' },
      ]
    : [
        { id: 'html' as const, label: 'HTML', sub: 'parse' },
        { id: 'css' as const, label: 'app.css', sub: 'block' },
        { id: 'js' as const, label: 'sync JS', sub: 'block' },
        { id: 'render' as const, label: 'render tree', sub: 'ждёт' },
        { id: 'fcp' as const, label: 'FCP', sub: 'поздний' },
      ]

  const fcpLate = !split && (phase === 'fcp' || phase === 'done')
  const fcpEarly = split && (phase === 'fcp' || phase === 'done')

  return (
    <LabVizPanel title="Critical rendering path" meta={split ? 'critical + defer' : 'render-blocking'}>
      <div className={styles.crpTrack}>
        {steps.map((step, i) => (
          <span key={step.id} style={{ display: 'contents' }}>
            {i > 0 ? <span className={styles.crpArrow} aria-hidden="true">→</span> : null}
            <LabNode
              label={step.label}
              sub={step.sub}
              state={nodeState(phase, step.id, split)}
            />
          </span>
        ))}
      </div>
      <div
        className={[
          styles.fcpMarker,
          fcpEarly ? styles.fcpMarkerActive : '',
          fcpLate ? styles.fcpMarkerLate : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {phase === 'idle'
          ? 'FCP — после прогона'
          : fcpEarly
            ? 'FCP раньше: critical CSS + defer хвоста'
            : fcpLate
              ? 'FCP позже: CSS и sync JS на критическом пути'
              : '…'}
      </div>
    </LabVizPanel>
  )
}

const PatternSwitch = ({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) => (
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

export function LazyLoadingCriticalPathLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('lazy')
  const [caseId, setCaseId] = useState<CaseId>('lazy')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [runId, setRunId] = useState(0)
  const [lazyPhase, setLazyPhase] = useState<LazyPhase>('idle')
  const [crpPhase, setCrpPhase] = useState<CrpPhase>('idle')
  const [statuses, setStatuses] = useState<Record<string, ImgStatus>>({})

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const loadedRef = useRef<Set<string>>(new Set())

  const onStatus = useCallback((id: string, status: ImgStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: status }))
    if (status === 'loaded') loadedRef.current.add(id)
  }, [])

  const resetViz = () => {
    setLazyPhase('idle')
    setCrpPhase('idle')
    setStatuses({})
    loadedRef.current = new Set()
    setHint(null)
    if (viewportRef.current) viewportRef.current.scrollTop = 0
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

  const finishLazyRun = (lazyCase: LazyCase) => {
    const loaded = loadedRef.current.size
    const total = 1 + GRID_COUNT
    log('info', `загружено ${loaded}/${total}`)
    if (lazyCase === 'eager') {
      log('warn', 'eager: все слоты конкурируют на старте')
      setHint('eager — максимум запросов сразу')
    } else if (lazyCase === 'lazy') {
      log('ok', 'lazy: часть карточек ждёт scrollport')
      setHint('lazy — ниже fold после прокрутки')
    } else {
      log('err', 'LCP hero с loading=lazy — главная картинка отложена')
      setHint('lazy на LCP — типичная ловушка')
    }
    setLazyPhase('done')
  }

  const runLazy = () => {
    const lazyCase = caseId as LazyCase
    loadedRef.current = new Set()
    setStatuses({})
    setRunId((r) => r + 1)
    if (viewportRef.current) viewportRef.current.scrollTop = 0

    playTimeline(
      tlRef,
      [
        () => {
          setLazyPhase('start')
          log('info', `hero=${heroLoading(lazyCase)} · grid=${gridLoading(lazyCase)}`)
        },
        () => {
          setLazyPhase('scroll')
          window.setTimeout(() => {
            finishLazyRun(lazyCase)
          }, 900)
        },
      ],
      () => setBusy(false),
    )
  }

  const runCrp = () => {
    const split = caseId === 'split'
    const steps: Array<() => void> = split
      ? [
          () => setCrpPhase('html'),
          () => setCrpPhase('css'),
          () => setCrpPhase('render'),
          () => {
            setCrpPhase('fcp')
            log('ok', 'FCP — после inline critical CSS')
          },
          () => {
            setCrpPhase('js')
            log('info', 'defer: app.js + полный CSS после первого кадра')
          },
          () => {
            setCrpPhase('done')
            setHint('critical CSS + defer')
          },
        ]
      : [
          () => setCrpPhase('html'),
          () => {
            setCrpPhase('css')
            log('warn', 'render-blocking CSS')
          },
          () => {
            setCrpPhase('js')
            log('warn', 'sync script блокирует парсинг')
          },
          () => setCrpPhase('render'),
          () => {
            setCrpPhase('fcp')
            log('err', 'FCP сдвинут — CSS+JS на пути')
          },
          () => {
            setCrpPhase('done')
            setHint('блокирующий CSS+JS')
          },
        ]

    playTimeline(
      tlRef,
      steps,
      () => setBusy(false),
    )
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    if (pattern === 'lazy') runLazy()
    else runCrp()
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('lazy')
    setCaseId('lazy')
    setRunId(0)
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
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

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {pattern === 'lazy' ? (
        <LazyLiveViz
          caseId={caseId as LazyCase}
          runId={runId}
          phase={lazyPhase}
          statuses={statuses}
          onStatus={onStatus}
          viewportRef={viewportRef}
        />
      ) : (
        <CrpViz caseId={caseId as CrpCase} phase={crpPhase} />
      )}

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div>
      <PatternSwitch value={pattern} disabled={false} onChange={selectPattern} />
      <InteractiveCodePanel
        key={`${pattern}-${caseId}`}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Lazy-loading и critical path"
      lead="Живой scrollport с `loading` у `<img>` и схема critical rendering path: блокирующие ресурсы vs critical CSS + defer."
      problem={problem}
      code={code}
    />
  )
}
