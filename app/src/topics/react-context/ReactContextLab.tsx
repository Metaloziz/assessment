import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactContextLab.module.css'

const TOPIC_ID = '191-react-context'
const STEP = 0.6

type CaseId = 'drill' | 'context' | 'broadcast'
type Phase = 'idle' | 'run' | 'done'
type Theme = 'light' | 'dark'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'drill', label: 'Prop drilling' },
  { id: 'context', label: 'Provider + useContext' },
  { id: 'broadcast', label: 'Нестабильный value' },
]

const CODE_INTRO: Record<CaseId, string> = {
  drill: '`theme` идёт через `Shell` и `Panel`, хотя им самим тема не нужна.',
  context: '`ThemeProvider` отдаёт значение; `ThemeBadge` читает через `useContext`.',
  broadcast: 'Новый объект в `value` на каждый тик — все потребители ре-рендерятся.',
}

const SNIPPET_DRILL: InteractiveSnippet = {
  id: 'theme-drill',
  label: 'src/App.tsx',
  note: 'Промежуточные слои только прокидывают `theme`.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Theme = 'light' | 'dark';

type ShellProps = { theme: Theme; children: React.ReactNode };
type PanelProps = { theme: Theme };

export const Shell = ({ theme, children }: ShellProps) => (
  <div className="shell" data-theme={theme}>
    {children}
  </div>
);

export const Panel = ({ theme }: PanelProps) => (
  <aside>
    <ThemeBadge theme={theme} /> {/* ← drill */}
  </aside>
);

export const App = () => {
  const theme: Theme = 'dark';
  return (
    <Shell theme={theme}>
      <Panel theme={theme} /> {/* ← theme через всех */}
    </Shell>
  );
};`,
}

const SNIPPET_BADGE_DRILL: InteractiveSnippet = {
  id: 'badge-drill',
  label: 'src/ui/ThemeBadge.tsx',
  note: 'Лист получает тему только через props.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Theme = 'light' | 'dark';
type Props = { theme: Theme };

export const ThemeBadge = ({ theme }: Props) => (
  <span className="badge">{theme}</span> // ← только props
);`,
}

const SNIPPET_CONTEXT: InteractiveSnippet = {
  id: 'theme-context',
  label: 'src/theme/ThemeContext.tsx',
  note: '`createContext` + `Provider`; лист читает без drill.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { createContext, useContext, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

// ═══════════════════════════════════════════
// CONTEXT ← канал без prop drilling
// ═══════════════════════════════════════════
const ThemeContext = createContext<Theme>('light');

type ProviderProps = { theme: Theme; children: ReactNode };

export const ThemeProvider = ({ theme, children }: ProviderProps) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export const ThemeBadge = () => {
  const theme = useContext(ThemeContext); // ← ближайший Provider
  return <span className="badge">{theme}</span>;
};`,
}

const SNIPPET_APP_CONTEXT: InteractiveSnippet = {
  id: 'app-context',
  label: 'src/App.tsx',
  note: '`Shell` / `Panel` больше не знают про `theme`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { ThemeProvider, ThemeBadge } from './theme/ThemeContext';

export const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="shell">{children}</div>
);

export const Panel = () => (
  <aside>
    <ThemeBadge /> {/* ← без props theme */}
  </aside>
);

export const App = () => (
  <ThemeProvider theme="dark">
    <Shell>
      <Panel />
    </Shell>
  </ThemeProvider>
);`,
}

const SNIPPET_BROADCAST: InteractiveSnippet = {
  id: 'unstable-value',
  label: 'src/app/AppContext.tsx',
  note: 'Новый объект в `value` на рендер → лишний broadcast потребителям.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { createContext, useContext, useState, type ReactNode } from 'react';

type AppValue = { theme: 'light' | 'dark'; tick: number };

const AppContext = createContext<AppValue>({ theme: 'dark', tick: 0 });

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme] = useState<'light' | 'dark'>('dark');
  const [tick, setTick] = useState(0);

  // ═══════════════════════════════════════════
  // VALUE ← новый объект каждый render
  // ═══════════════════════════════════════════
  return (
    <AppContext.Provider value={{ theme, tick }}>
      <button type="button" onClick={() => setTick((n) => n + 1)}>
        bump tick
      </button>
      {children}
    </AppContext.Provider>
  );
};

export const ThemeBadge = () => {
  const { theme } = useContext(AppContext);
  // theme не менялся, но value новый → render всё равно
  return <span className="badge">{theme}</span>;
};`,
}

const SNIPPET_SPLIT: InteractiveSnippet = {
  id: 'split-hint',
  label: 'src/theme/ThemeContext.tsx',
  note: 'Узкий контекст: меняется только то, на что подписаны.',
  executable: false,
  languageLabel: 'tsx',
  code: `// лучше: ThemeContext отдельно от TickContext
// или value = useMemo(() => ({ theme, tick }), [theme, tick])
// когда объект действительно общий и стабильный по смыслу

export const ThemeBadge = () => {
  const theme = useContext(ThemeContext); // ← только theme
  return <span className="badge">{theme}</span>;
};`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  drill: [SNIPPET_DRILL, SNIPPET_BADGE_DRILL],
  context: [SNIPPET_CONTEXT, SNIPPET_APP_CONTEXT],
  broadcast: [SNIPPET_BROADCAST, SNIPPET_SPLIT],
}

const PAIN =
  'Сквозные данные (тема, user) не должны раздувать props каждого слоя. Context отдаёт значение вниз; нестабильный `value` раздувает ре-рендеры.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  drill: (
    <>
      <code>theme</code> проходит через <code>Shell</code> и <code>Panel</code> только ради{' '}
      <code>ThemeBadge</code>.
    </>
  ),
  context: (
    <>
      <code>ThemeProvider</code> отдаёт тему; промежуточные узлы без <code>useContext</code> props не
      тащат.
    </>
  ),
  broadcast: (
    <>
      bump <code>tick</code> создаёт новый объект в <code>value</code> — <code>ThemeBadge</code>{' '}
      ре-рендерится, хотя <code>theme</code> тот же.
    </>
  ),
}

const ThemeCtx = createContext<Theme>('light')
const AppBagCtx = createContext<{ theme: Theme; tick: number }>({ theme: 'dark', tick: 0 })

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

type NodeFlash = {
  shell: boolean
  panel: boolean
  badge: boolean
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  theme: Theme
  tick: number
  flash: NodeFlash
  drillPropsVisible: boolean
}

const ThemeBadgeLive = ({
  mode,
  themeProp,
  flash,
}: {
  mode: CaseId
  themeProp: Theme
  flash: boolean
}) => {
  const themeFromCtx = useContext(ThemeCtx)
  const bag = useContext(AppBagCtx)
  const theme = mode === 'drill' ? themeProp : mode === 'broadcast' ? bag.theme : themeFromCtx

  return (
    <div className={[styles.leaf, flash ? styles.nodeFlash : ''].filter(Boolean).join(' ')}>
      <span className={styles.nodeName}>ThemeBadge</span>
      <span className={styles.themeChip} data-theme={theme}>
        {theme}
      </span>
      <span className={styles.nodeMeta}>
        {mode === 'drill' ? 'props' : mode === 'broadcast' ? 'useContext · bag' : 'useContext'}
      </span>
    </div>
  )
}

const ContextLiveViz = ({ caseId, phase, theme, tick, flash, drillPropsVisible }: VizProps) => {
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : caseId === 'drill'
        ? 'drill · props ↓'
        : caseId === 'context'
          ? 'Provider → useContext'
          : `value · tick ${tick}`

  const tree = (
    <div className={styles.tree}>
      <div className={styles.providerRow}>
        <span className={styles.providerLabel}>
          {caseId === 'context'
            ? 'ThemeProvider'
            : caseId === 'broadcast'
              ? 'AppProvider'
              : 'App'}
        </span>
        <code className={styles.providerValue}>
          {caseId === 'broadcast' ? `{ theme, tick: ${tick} }` : `theme="${theme}"`}
        </code>
      </div>

      <div
        className={[styles.node, flash.shell ? styles.nodeFlash : '', styles.nodeMid]
          .filter(Boolean)
          .join(' ')}
      >
        <div className={styles.nodeHead}>
          <span className={styles.nodeName}>Shell</span>
          {drillPropsVisible ? (
            <span className={styles.propTag}>theme?</span>
          ) : (
            <span className={styles.propTagMuted}>без theme</span>
          )}
        </div>
        <p className={styles.nodeHint}>
          {caseId === 'drill' ? 'прокидывает props' : 'layout · не читает Context'}
        </p>

        <div
          className={[styles.node, flash.panel ? styles.nodeFlash : '', styles.nodeMid]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.nodeHead}>
            <span className={styles.nodeName}>Panel</span>
            {drillPropsVisible ? (
              <span className={styles.propTag}>theme?</span>
            ) : (
              <span className={styles.propTagMuted}>без theme</span>
            )}
          </div>
          <p className={styles.nodeHint}>
            {caseId === 'drill' ? 'ещё один слой drill' : 'не подписан на Context'}
          </p>

          <ThemeBadgeLive mode={caseId} themeProp={theme} flash={flash.badge} />
        </div>
      </div>
    </div>
  )

  const body =
    caseId === 'context' ? (
      <ThemeCtx.Provider value={theme}>{tree}</ThemeCtx.Provider>
    ) : caseId === 'broadcast' ? (
      <AppBagCtx.Provider value={{ theme, tick }}>{tree}</AppBagCtx.Provider>
    ) : (
      tree
    )

  return (
    <LabVizPanel title="Дерево приложения" meta={meta}>
      <div className={styles.stage}>{body}</div>
    </LabVizPanel>
  )
}

export const ReactContextLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('drill')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [theme, setTheme] = useState<Theme>('dark')
  const [tick, setTick] = useState(0)
  const [flash, setFlash] = useState<NodeFlash>({ shell: false, panel: false, badge: false })
  const [drillPropsVisible, setDrillPropsVisible] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const flashTimers = useRef<number[]>([])

  useEffect(() => {
    return () => {
      flashTimers.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const pulse = (next: Partial<NodeFlash>, ms = 700) => {
    setFlash((prev) => ({ ...prev, ...next }))
    const id = window.setTimeout(() => {
      setFlash((prev) => {
        const cleared = { ...prev }
        for (const key of Object.keys(next) as Array<keyof NodeFlash>) {
          if (next[key]) cleared[key] = false
        }
        return cleared
      })
    }, ms)
    flashTimers.current.push(id)
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    setPhase('idle')
    setHint(null)
    setTheme('dark')
    setTick(0)
    setFlash({ shell: false, panel: false, badge: false })
    setDrillPropsVisible(next === 'drill')
  }

  const finishCase = (id: CaseId) => {
    setPhase('done')
    if (id === 'drill') {
      log('warn', 'Shell + Panel тащат theme только ради Badge')
      setHint('prop drilling через слои без своей нужды в theme')
    } else if (id === 'context') {
      log('ok', 'Provider → ThemeBadge; Shell/Panel без props theme')
      setHint('useContext читает ближайший Provider')
    } else {
      log('warn', 'tick++ → новый value → ThemeBadge render')
      setHint('нестабильный объект в value раздувает обновления')
    }
  }

  const run = () => {
    clear()
    setHint(null)
    setFlash({ shell: false, panel: false, badge: false })
    setBusy(true)
    setPhase('run')

    if (caseId === 'drill') {
      setDrillPropsVisible(true)
      setTheme('dark')
      playTimeline(
        tlRef,
        [
          () => {
            pulse({ shell: true })
            log('info', 'Shell получает theme')
          },
          () => {
            pulse({ panel: true })
            log('info', 'Panel получает theme')
          },
          () => {
            pulse({ badge: true })
            setTheme('light')
            finishCase('drill')
          },
        ],
        null,
        () => setBusy(false),
      )
      return
    }

    if (caseId === 'context') {
      setDrillPropsVisible(false)
      setTheme('dark')
      playTimeline(
        tlRef,
        [
          () => {
            log('info', 'ThemeProvider value="dark"')
          },
          () => {
            pulse({ badge: true })
            setTheme('light')
            log('ok', 'ThemeBadge ← useContext')
          },
          () => {
            finishCase('context')
          },
        ],
        null,
        () => setBusy(false),
      )
      return
    }

    setDrillPropsVisible(false)
    setTheme('dark')
    setTick(0)
    playTimeline(
      tlRef,
      [
        () => {
          log('info', 'value = { theme, tick: 0 }')
        },
        () => {
          setTick(1)
          pulse({ badge: true })
          log('warn', 'tick → 1 · Badge re-render')
        },
        () => {
          setTick(2)
          pulse({ badge: true })
          finishCase('broadcast')
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
    setCaseId('drill')
    setPhase('idle')
    setHint(null)
    setTheme('dark')
    setTick(0)
    setFlash({ shell: false, panel: false, badge: false })
    setDrillPropsVisible(true)
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

      <ContextLiveViz
        caseId={caseId}
        phase={phase}
        theme={theme}
        tick={tick}
        flash={flash}
        drillPropsVisible={caseId === 'drill' ? drillPropsVisible || phase !== 'idle' : false}
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
      title="React Context"
      lead="Живой стенд: prop drilling vs `Provider` + `useContext`, и лишний broadcast от нестабильного `value`."
      problem={problem}
      code={code}
    />
  )
}
