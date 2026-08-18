import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './LayoutToolsByBrowsersLab.module.css'

const TOPIC_ID = '175-layout-tools-by-browsers'
const STEP = 0.6

type CaseId = 'modern' | 'legacy'
type Phase = 'idle' | 'targets' | 'tools' | 'done'
type ToolId = 'transpile' | 'prefix' | 'polyfill'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'modern', label: 'Modern' },
  { id: 'legacy', label: 'Legacy' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  modern: (
    <>
      Цели evergreen / Baseline: transpile почти пустой, Autoprefixer молчит, <code>core-js</code> не тянем.
    </>
  ),
  legacy: (
    <>
      Широкий список с дырами: <code>preset-env</code>, Autoprefixer и polyfill’ы включаются под реальные пробелы.
    </>
  ),
}

const TOOLS: Array<{ id: ToolId; label: string; modern: string; legacy: string }> = [
  { id: 'transpile', label: 'Transpile', modern: 'почти нет', legacy: 'preset-env' },
  { id: 'prefix', label: 'Prefixes', modern: 'пусто', legacy: 'Autoprefixer' },
  { id: 'polyfill', label: 'Polyfills', modern: 'off', legacy: 'core-js usage' },
]

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'browserslist',
    label: '.browserslistrc',
    note: 'Два контракта целей: modern vs legacy. От query зависит, какие слои тулчейна имеют смысл.',
    executable: false,
    languageLabel: 'text',
    code: `# ═══════════════════════════════════════════
# MODERN ← evergreen / Baseline
# ═══════════════════════════════════════════
[modern]
last 2 Chrome versions
last 2 Firefox versions
last 2 Safari versions
not dead

# ═══════════════════════════════════════════
# LEGACY ← широкая аудитория с дырами
# ═══════════════════════════════════════════
[legacy]
> 0.5%
not dead
iOS >= 12
# IE 11 — только если продукт явно платит за это
`,
  },
  {
    id: 'babel-config',
    label: 'babel.config.js',
    note: '`preset-env` без своего `targets` читает Browserlist; `useBuiltIns` решает runtime-слой.',
    executable: false,
    code: `module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // ← цели из browserslist (не дублировать targets здесь)
        useBuiltIns: 'usage', // ← POLYFILL: только дыры списка
        corejs: 3,

        // modern + свежий caniuse-lite → мало transforms
        // legacy → больше синтаксиса и helpers
      },
    ],
  ],
};`,
  },
  {
    id: 'postcss-config',
    label: 'postcss.config.js',
    note: 'Autoprefixer включаем, когда в целях ещё есть браузеры без нужных CSS-фич без префиксов.',
    executable: false,
    code: `module.exports = {
  plugins: {
    // ← PREFIXES: читает тот же browserslist
    autoprefixer: {},

    // modern-only: часто почти ничего не допишет —
    // это нормально, не значит «плагин сломан»
  },
};`,
  },
]

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

type VizProps = {
  phase: Phase
  caseId: CaseId
  activeTool: ToolId | null
  rackRef: MutableRefObject<HTMLDivElement | null>
}

function ToolsViz({ phase, caseId, activeTool, rackRef }: VizProps) {
  const modern = caseId === 'modern'
  const targetsOn = phase !== 'idle'
  const toolsOn = phase === 'tools' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel
      title="Тулчейн под цели"
      meta={modern ? 'evergreen → лёгкий набор' : 'широкий список → полные слои'}
    >
      <div className={styles.flow}>
        <div
          className={nodeCls(
            targetsOn && labVizStyles.nodeActive,
            done && labVizStyles.nodeOk,
            styles.targetsNode,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Цели</span>
          <span className={labVizStyles.nodeSub}>
            {modern ? 'last 2 · Baseline' : '> 0.5% · iOS 12+'}
          </span>
        </div>

        <span className={styles.arrow} aria-hidden>
          →
        </span>

        <div ref={rackRef} className={styles.rack}>
          {TOOLS.map((tool) => {
            const light = modern ? tool.id === 'transpile' && toolsOn : toolsOn
            const heavy = !modern && toolsOn
            const isActive = activeTool === tool.id
            const off = modern && tool.id !== 'transpile' && toolsOn

            return (
              <div
                key={tool.id}
                className={nodeCls(
                  isActive && labVizStyles.nodeActive,
                  done && heavy && labVizStyles.nodeOk,
                  done && modern && tool.id === 'transpile' && labVizStyles.nodeOk,
                  done && off && styles.nodeDim,
                  light && !done && !isActive && styles.nodeSoft,
                  styles.toolNode,
                )}
              >
                <span className={labVizStyles.nodeLabel}>{tool.label}</span>
                <span className={labVizStyles.nodeSub}>
                  {!toolsOn ? '—' : modern ? tool.modern : tool.legacy}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutToolsByBrowsersLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('modern')
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const rackRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setActiveTool(null)
    setHint(null)
    if (rackRef.current) gsap.set(rackRef.current, { clearProps: 'transform,opacity' })
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
    const modern = caseId === 'modern'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('targets')
          log('info', modern ? 'цели: last 2 Chrome/Firefox/Safari' : 'цели: > 0.5%, iOS >= 12')
        },
        () => {
          setPhase('tools')
          setActiveTool('transpile')
          log(
            modern ? 'ok' : 'warn',
            modern ? 'transpile: почти пусто (синтаксис уже в движках)' : 'transpile: preset-env разворачивает синтаксис',
          )
        },
        () => {
          setActiveTool('prefix')
          log(
            modern ? 'ok' : 'warn',
            modern ? 'Autoprefixer: нечего дописывать' : 'Autoprefixer: префиксы под дыры списка',
          )
        },
        () => {
          setActiveTool('polyfill')
          setPhase('done')
          if (modern) {
            log('ok', 'polyfill: off — API уже в целях')
          } else {
            log('warn', 'polyfill: core-js usage под пробелы списка')
          }
        },
      ],
      (tl) => {
        if (rackRef.current) {
          tl.fromTo(
            rackRef.current,
            { opacity: 0.55, y: 8 },
            { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
            STEP,
          )
        }
      },
      () => {
        setBusy(false)
        setActiveTool(null)
        setHint(
          modern
            ? 'Узкие цели → лёгкий тулчейн; не тащите полный core-js «на всякий случай».'
            : 'Широкие цели → включайте слои осознанно под дыры, а не копируйте чужой стек вслепую.',
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
            setCaseId('modern')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Список браузеров — вход. На выходе решают, включать ли transpile, префиксы и polyfill’ы — каждый слой
        только если цели его требуют.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ToolsViz phase={phase} caseId={caseId} activeTool={activeTool} rackRef={rackRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Цели в `.browserslistrc` → реакция в `preset-env` (`useBuiltIns`) и Autoprefixer."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Инструменты под браузеры"
      lead="От аудитории к целям, от целей — к слоям transpile / prefixes / polyfills."
      problem={problem}
      code={code}
    />
  )
}
