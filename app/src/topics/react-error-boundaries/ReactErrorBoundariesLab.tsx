import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactErrorBoundariesLab.module.css'

const TOPIC_ID = '188-react-error-boundaries'
const STEP = 0.6

type CaseId = 'crash' | 'isolate' | 'miss'
type Phase = 'idle' | 'render' | 'throw' | 'done'
type WidgetView = 'ok' | 'error' | 'click-bomb'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'crash', label: 'Без границы' },
  { id: 'isolate', label: 'С предохранителем' },
  { id: 'miss', label: 'Throw в onClick' },
]

const CODE_INTRO: Record<CaseId, string> = {
  crash: 'Throw в `render` без границы — падает весь `App`, включая шапку.',
  isolate: '`ErrorBoundary` + `FallbackComponent` — локальный экран ошибки вместо белого экрана.',
  miss: 'Throw в `onClick` граница не ловит — нужен `try/catch` в handler.',
}

const SNIPPET_FALLBACK: InteractiveSnippet = {
  id: 'chart-fallback',
  label: 'src/ui/ChartFallback.tsx',
  note: 'Экран ошибки: заголовок, текст, «Повторить» через `resetErrorBoundary`.',
  executable: false,
  languageLabel: 'tsx',
  code: `export type FallbackProps = {
  error: Error;
  resetErrorBoundary: () => void;
};

// ═══════════════════════════════════════════
// FALLBACK ← экран ошибки виджета
// ═══════════════════════════════════════════
export const ChartFallback = ({
  error,
  resetErrorBoundary,
}: FallbackProps) => (
  <div role="alert" className="errorPanel">
    <p className="errorEyebrow">ChartWidget</p>
    <h2>Не удалось загрузить график</h2>
    <p className="errorMessage">{error.message}</p>
    <button type="button" onClick={resetErrorBoundary}>
      Повторить
    </button>
  </div>
);`,
}

const SNIPPET_BOUNDARY: InteractiveSnippet = {
  id: 'error-boundary-usage',
  label: 'src/App.tsx',
  note: '`ErrorBoundary` оборачивает виджет; `FallbackComponent` — запасной UI.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { ErrorBoundary } from 'react-error-boundary';
import { Header } from './ui/Header';
import { ChartFallback } from './ui/ChartFallback';
import { ChartWidget } from './widgets/ChartWidget';

// ═══════════════════════════════════════════
// BOUNDARY ← изоляция сбоя в main
// ═══════════════════════════════════════════
export const App = () => (
  <div className="shell">
    <Header title="Cabinet" />
    <main>
      <ErrorBoundary
        FallbackComponent={ChartFallback} // ← запасной UI
        onError={(err) => console.error(err.message)}
      >
        <ChartWidget explode />
      </ErrorBoundary>
    </main>
  </div>
);`,
}

const SNIPPET_WIDGET: InteractiveSnippet = {
  id: 'chart-widget',
  label: 'src/widgets/ChartWidget.tsx',
  note: 'Throw в `render` ловит граница; throw в `onClick` — нет.',
  executable: false,
  languageLabel: 'tsx',
  code: `type ChartWidgetProps = {
  explode?: boolean;
};

export const ChartWidget = ({ explode = false }: ChartWidgetProps) => {
  // ═══════════════════════════════════════════
  // RENDER ← фаза, которую ловит граница
  // ═══════════════════════════════════════════
  if (explode) {
    throw new Error('chart failed'); // ← render-phase
  }

  return (
    <div className="chart">
      <p>Revenue · 7 days</p>
      <button
        type="button"
        onClick={() => {
          throw new Error('click boom'); // ← boundary НЕ ловит
        }}
      >
        Export
      </button>
    </div>
  );
};`,
}

const SNIPPET_APP_CRASH: InteractiveSnippet = {
  id: 'app-crash',
  label: 'src/App.tsx',
  note: 'Без обёртки throw в виджете уносит весь экран.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Header } from './ui/Header';
import { ChartWidget } from './widgets/ChartWidget';

export const App = () => (
  <div className="shell">
    <Header title="Cabinet" />
    {/* нет ErrorBoundary ← зона поражения = весь App */}
    <main>
      <ChartWidget explode />
    </main>
  </div>
);`,
}

const SNIPPET_HEADER: InteractiveSnippet = {
  id: 'header',
  label: 'src/ui/Header.tsx',
  note: 'Шапка вне границы — переживает сбой виджета.',
  executable: false,
  languageLabel: 'tsx',
  code: `type HeaderProps = { title: string };

export const Header = ({ title }: HeaderProps) => (
  <header className="header">
    <strong>{title}</strong>
    <nav>Overview · Charts</nav>
  </header>
);`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  crash: [SNIPPET_WIDGET, SNIPPET_APP_CRASH],
  isolate: [SNIPPET_FALLBACK, SNIPPET_BOUNDARY],
  miss: [SNIPPET_WIDGET, SNIPPET_BOUNDARY],
}

const PAIN =
  'Сбой одного виджета не должен уносить весь экран. Предохранитель показывает запасной UI через `FallbackComponent`.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  crash: (
    <>
      Без границы throw в <code>ChartWidget</code> оставляет пустой экран вместо cabinet.
    </>
  ),
  isolate: (
    <>
      Шапка жива; вместо графика — экран ошибки <code>ChartFallback</code>.
    </>
  ),
  miss: (
    <>
      Throw в <code>onClick</code> граница не перехватывает — график и шапка на месте.
    </>
  ),
}

type FallbackProps = {
  error: Error
  onRetry: () => void
}

const ChartFallback = ({ error, onRetry }: FallbackProps) => (
  <div className={styles.errorPanel} role="alert">
    <p className={styles.errorEyebrow}>ChartWidget</p>
    <h2 className={styles.errorTitle}>Не удалось загрузить график</h2>
    <p className={styles.errorLead}>
      Данные временно недоступны. Остальной кабинет работает — можно продолжить или повторить
      загрузку.
    </p>
    <p className={styles.errorCode}>
      <code>{error.message}</code>
    </p>
    <div className={styles.errorActions}>
      <LabButton variant="primary" size="sm" onClick={onRetry}>
        Повторить
      </LabButton>
    </div>
  </div>
)

const ChartOk = () => (
  <div className={styles.chart}>
    <div className={styles.chartHead}>
      <p className={styles.chartTitle}>Revenue · 7 days</p>
      <span className={styles.chartBadge}>live</span>
    </div>
    <div className={styles.chartBars} aria-hidden>
      <span style={{ height: '42%' }} />
      <span style={{ height: '68%' }} />
      <span style={{ height: '55%' }} />
      <span style={{ height: '80%' }} />
      <span style={{ height: '48%' }} />
      <span style={{ height: '72%' }} />
      <span style={{ height: '61%' }} />
    </div>
    <p className={styles.chartMeta}>series · ok</p>
  </div>
)

const ChartClickBomb = () => (
  <div className={styles.chart}>
    <div className={styles.chartHead}>
      <p className={styles.chartTitle}>Revenue · 7 days</p>
      <span className={styles.chartBadgeWarn}>handler</span>
    </div>
    <div className={styles.chartBars} aria-hidden>
      <span style={{ height: '42%' }} />
      <span style={{ height: '68%' }} />
      <span style={{ height: '55%' }} />
      <span style={{ height: '80%' }} />
      <span style={{ height: '48%' }} />
      <span style={{ height: '72%' }} />
      <span style={{ height: '61%' }} />
    </div>
    <p className={styles.chartMeta}>Export бросил в onClick — граница молчит</p>
  </div>
)

type ErrorBoundaryProps = {
  error: Error | null
  FallbackComponent: (props: FallbackProps) => ReactNode
  onRetry: () => void
  children: ReactNode
}

const ErrorBoundary = ({ error, FallbackComponent, onRetry, children }: ErrorBoundaryProps) => {
  if (error) return <>{FallbackComponent({ error, onRetry })}</>
  return <>{children}</>
}

const CrashScreen = () => (
  <div className={styles.crashScreen} role="alert">
    <p className={styles.crashEyebrow}>Application error</p>
    <h2 className={styles.crashTitle}>Что-то сломалось</h2>
    <p className={styles.crashLead}>
      Нет предохранителя — React снял дерево. Шапка и график исчезли вместе.
    </p>
    <p className={styles.crashCode}>
      <code>Uncaught Error: chart failed</code>
    </p>
  </div>
)

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
    defaults: { duration: 0.55, ease: 'power2.inOut' },
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
  widgetView: WidgetView
  widgetError: Error | null
  shellRef: MutableRefObject<HTMLDivElement | null>
  onRetry: () => void
}

const CabinetViz = ({
  phase,
  caseId,
  widgetView,
  widgetError,
  shellRef,
  onRetry,
}: VizProps) => {
  const done = phase === 'done'
  const crashed = caseId === 'crash' && done

  const meta =
    phase === 'idle'
      ? 'до сбоя'
      : phase === 'render'
        ? 'render…'
        : phase === 'throw'
          ? caseId === 'miss'
            ? 'onClick throw'
            : 'throw'
          : caseId === 'crash'
            ? 'application error'
            : caseId === 'isolate'
              ? 'fallback UI'
              : 'не поймано'

  const widget =
    widgetView === 'error' && widgetError ? (
      <ErrorBoundary
        error={widgetError}
        FallbackComponent={ChartFallback}
        onRetry={onRetry}
      >
        <ChartOk />
      </ErrorBoundary>
    ) : widgetView === 'click-bomb' ? (
      <ErrorBoundary error={null} FallbackComponent={ChartFallback} onRetry={onRetry}>
        <ChartClickBomb />
      </ErrorBoundary>
    ) : caseId === 'isolate' || caseId === 'miss' ? (
      <ErrorBoundary error={null} FallbackComponent={ChartFallback} onRetry={onRetry}>
        <ChartOk />
      </ErrorBoundary>
    ) : (
      <ChartOk />
    )

  return (
    <LabVizPanel title="Cabinet" meta={meta}>
      {crashed ? (
        <div ref={shellRef}>
          <CrashScreen />
        </div>
      ) : (
        <div
          ref={shellRef}
          className={[
            styles.cabinet,
            done && caseId === 'isolate' ? styles.cabinetRecovered : '',
            done && caseId === 'miss' ? styles.cabinetMiss : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <header className={styles.header}>
            <div className={styles.brand}>
              <span className={styles.brandMark} aria-hidden />
              <strong>Cabinet</strong>
            </div>
            <nav className={styles.headerNav}>
              <span>Overview</span>
              <span className={styles.navActive}>Charts</span>
            </nav>
          </header>

          <main className={styles.main}>
            <div className={styles.slotLabel}>
              {caseId === 'crash' ? 'main · без границы' : 'ErrorBoundary · ChartWidget'}
            </div>
            {widget}
          </main>
        </div>
      )}
    </LabVizPanel>
  )
}

export const ReactErrorBoundariesLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('crash')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [widgetView, setWidgetView] = useState<WidgetView>('ok')
  const [widgetError, setWidgetError] = useState<Error | null>(null)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setWidgetView('ok')
    setWidgetError(null)
    if (shellRef.current) gsap.set(shellRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const onRetry = () => {
    setWidgetView('ok')
    setWidgetError(null)
    setPhase('idle')
    setHint(null)
    log('ok', 'resetErrorBoundary → снова монтируем ChartWidget')
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('render')
          if (caseId === 'miss') setWidgetView('click-bomb')
        },
        () => {
          setPhase('throw')
          if (caseId === 'isolate') {
            const err = new Error('chart failed')
            setWidgetError(err)
            setWidgetView('error')
            log('ok', `onError: ${err.message} → ChartFallback`)
          } else if (caseId === 'miss') {
            try {
              throw new Error('click boom')
            } catch {
              log('warn', 'onClick throw — FallbackComponent не показан')
            }
          }
        },
        () => {
          setPhase('done')
          if (caseId === 'crash') {
            log('err', 'нет границы → application error на весь экран')
            setHint('без предохранителя зона поражения = весь UI')
          } else if (caseId === 'isolate') {
            setHint('Header жив; вместо графика — экран ChartFallback')
          } else {
            setHint('для handlers нужен try/catch, не boundary')
          }
        },
      ],
      (tl) => {
        tl.call(
          () => {
            const el = shellRef.current
            if (!el) return
            gsap.fromTo(
              el,
              { opacity: 0.7, y: 6 },
              { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
            )
          },
          undefined,
          STEP * 2 + 0.05,
        )
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('crash')
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

      <CabinetViz
        phase={phase}
        caseId={caseId}
        widgetView={widgetView}
        widgetError={widgetError}
        shellRef={shellRef}
        onRetry={onRetry}
      />

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
      title="Предохранители"
      lead="`ErrorBoundary` + `FallbackComponent`: локальный экран ошибки вместо белого экрана."
      problem={problem}
      code={code}
    />
  )
}
