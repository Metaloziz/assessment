import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './ReactRouterLab.module.css'

const TOPIC_ID = '190-react-router'
const STEP = 0.6

type CaseId = 'match' | 'outlet' | 'hoc'
type Phase = 'idle' | 'nav' | 'match' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'match', label: 'URL → Route' },
  { id: 'outlet', label: 'Nested + Outlet' },
  { id: 'hoc', label: 'withRouter' },
]

const CODE_INTRO: Record<CaseId, string> = {
  match: 'Pathname выбирает `Route`; `Link` / `navigate` меняют URL без reload.',
  outlet: 'Родительский layout живёт; дочерний экран рендерится в `Outlet`.',
  hoc: 'v5 `withRouter` подмешивал router-props в класс; в v6+ — хуки или тонкая обёртка.',
}

const SNIPPET_ROUTES: InteractiveSnippet = {
  id: 'app-routes-v2',
  label: 'src/App.tsx',
  note: 'Дерево маршрутов: URL ↔ какой element показать.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { UserPage } from './pages/UserPage';

export const App = () => (
  <BrowserRouter>
    <nav>
      <Link to="/app">Home</Link>
      <Link to="/app/users/42">User</Link>
    </nav>
    {/* ═══════════════════════════════════════════
        MATCH ← pathname выбирает Route
        ═══════════════════════════════════════════ */}
    <Routes>
      <Route path="/app" element={<Home />} />
      <Route path="/app/users/:id" element={<UserPage />} />
      <Route path="*" element={<p>404</p>} />
    </Routes>
  </BrowserRouter>
);`,
}

const SNIPPET_PARAMS: InteractiveSnippet = {
  id: 'user-params-v2',
  label: 'src/pages/UserPage.tsx',
  note: '`useParams` читает динамический сегмент из URL.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useParams, useNavigate } from 'react-router-dom';

export const UserPage = () => {
  const { id } = useParams(); // ← из /users/:id
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate('/app')}>
      User {id}
    </button>
  );
};`,
}

const SNIPPET_OUTLET: InteractiveSnippet = {
  id: 'layout-outlet-v2',
  label: 'src/layouts/AppLayout.tsx',
  note: 'Layout не размонтируется; меняется только содержимое `Outlet`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Outlet, NavLink } from 'react-router-dom';

export const AppLayout = () => (
  <div className="shell">
    <header>
      <NavLink to="/app">Home</NavLink>
      <NavLink to="/app/users/42">User</NavLink>
    </header>
    {/* OUTLET ← дыра для дочернего Route */}
    <Outlet />
  </div>
);`,
}

const SNIPPET_NESTED: InteractiveSnippet = {
  id: 'nested-routes-v2',
  label: 'src/App.tsx',
  note: 'Вложенный `Route`: родитель = layout, children = страницы.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Home } from './pages/Home';
import { UserPage } from './pages/UserPage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/app" element={<AppLayout />}>
      <Route index element={<Home />} />
      <Route path="users/:id" element={<UserPage />} /> {/* ← в Outlet */}
    </Route>
  </Routes>
);`,
}

const SNIPPET_WITH_ROUTER: InteractiveSnippet = {
  id: 'with-router-v5-v2',
  label: 'src/badges/UserBadge.tsx',
  note: 'Исторический v5: HOC пробрасывал `history` / `match`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Component } from 'react';
// react-router-dom@5
import { withRouter, type RouteComponentProps } from 'react-router-dom';

// ═══════════════════════════════════════════
// withRouter ← HOC для класса (v5)
// ═══════════════════════════════════════════
class UserBadge extends Component<RouteComponentProps<{ id: string }>> {
  render() {
    const { match, history } = this.props; // ← подмешал HOC
    return (
      <button
        type="button"
        onClick={() => history.push(\`/users/\${match.params.id}\`)}
      >
        Open
      </button>
    );
  }
}

export default withRouter(UserBadge);`,
}

const SNIPPET_HOOKS: InteractiveSnippet = {
  id: 'hooks-instead-v2',
  label: 'src/badges/UserBadge.tsx',
  note: 'v6+: хуки вместо `withRouter`; для класса — тонкая обёртка.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useNavigate, useParams } from 'react-router-dom';

export const UserBadge = () => {
  const { id } = useParams();
  const navigate = useNavigate(); // ← вместо history.push
  return (
    <button type="button" onClick={() => navigate(\`/users/\${id}\`)}>
      Open
    </button>
  );
};

// Класс нельзя трогать? Обёртка:
// const withRouterCompat = (Comp) => (props) => {
//   const navigate = useNavigate();
//   return <Comp {...props} navigate={navigate} />;
// };`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  match: [SNIPPET_ROUTES, SNIPPET_PARAMS],
  outlet: [SNIPPET_OUTLET, SNIPPET_NESTED],
  hoc: [SNIPPET_WITH_ROUTER, SNIPPET_HOOKS],
}

const PAIN =
  'SPA должна менять экраны по URL без reload. React Router матчит pathname на дерево `Route`; nested layout держит `Outlet`, а `withRouter` — старый способ отдать router-props классу.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  match: (
    <>
      Переход на <code>/app/users/42</code> включает соответствующий <code>Route</code> и{' '}
      <code>useParams().id</code>.
    </>
  ),
  outlet: (
    <>
      <code>AppLayout</code> остаётся смонтированным; в <code>Outlet</code> меняется только страница.
    </>
  ),
  hoc: (
    <>
      v5 <code>withRouter</code> подмешивал props; в v6 тот же доступ дают хуки / compat-обёртка.
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

type NodeTone = 'idle' | 'active' | 'ok' | 'warn'

const toneClass = (tone: NodeTone) => {
  if (tone === 'active') return labVizStyles.nodeActive
  if (tone === 'ok') return labVizStyles.nodeOk
  if (tone === 'warn') return styles.nodeWarn
  return undefined
}

const nodeCls = (...mods: Array<string | false | undefined>) =>
  [labVizStyles.node, ...mods.filter(Boolean)].join(' ')

type VizProps = {
  phase: Phase
  caseId: CaseId
  focusRef: MutableRefObject<HTMLDivElement | null>
}

const urlFor = (caseId: CaseId, phase: Phase) => {
  if (phase === 'idle') return caseId === 'hoc' ? '/app/users/42' : '/app'
  if (caseId === 'hoc') return '/app/users/42'
  return '/app/users/42'
}

const RouterViz = ({ phase, caseId, focusRef }: VizProps) => {
  const busy = phase !== 'idle'
  const done = phase === 'done'
  const matching = phase === 'match' || done
  const url = urlFor(caseId, phase)

  const meta =
    phase === 'idle'
      ? 'старт'
      : phase === 'nav'
        ? 'navigate…'
        : phase === 'match'
          ? 'match'
          : caseId === 'outlet'
            ? 'layout + outlet'
            : caseId === 'hoc'
              ? 'props injected'
              : 'page on'

  const layoutTone: NodeTone =
    caseId === 'outlet' ? (done ? 'ok' : busy ? 'active' : 'idle') : busy ? 'active' : 'idle'

  const pageLabel =
    caseId === 'hoc'
      ? done
        ? 'UserBadge + props'
        : 'UserBadge'
      : matching
        ? 'UserPage · id=42'
        : 'Home'

  const pageTone: NodeTone = done ? 'ok' : matching ? 'active' : 'idle'
  const outletHighlight = caseId === 'outlet' && matching
  const hocInjected = caseId === 'hoc' && matching

  return (
    <LabVizPanel title="URL и дерево маршрутов" meta={meta}>
      <div className={styles.stack}>
        <div
          className={[styles.urlBar, busy ? styles.urlBarActive : ''].filter(Boolean).join(' ')}
          ref={caseId === 'match' ? focusRef : undefined}
        >
          <span className={styles.urlScheme}>https://app</span>
          <span className={styles.urlPath}>{url}</span>
        </div>

        <div className={styles.tree}>
          <div className={nodeCls(styles.leaf, toneClass(layoutTone))}>
            {caseId === 'outlet' ? 'AppLayout · mount #1' : 'Routes'}
          </div>

          {caseId === 'outlet' ? (
            <div className={styles.outletWrap}>
              <div
                className={[styles.outletLabel, outletHighlight ? styles.outletLabelOn : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                Outlet
              </div>
              <div
                ref={focusRef}
                className={nodeCls(styles.leaf, styles.indent, toneClass(pageTone))}
              >
                {pageLabel}
              </div>
            </div>
          ) : caseId === 'hoc' ? (
            <div className={styles.hocRow}>
              <div
                className={nodeCls(
                  styles.leaf,
                  styles.indent,
                  hocInjected ? toneClass('warn') : toneClass('idle'),
                )}
              >
                withRouter / compat
              </div>
              <div className={styles.hocArrow} aria-hidden>
                →
              </div>
              <div ref={focusRef} className={nodeCls(styles.leaf, toneClass(pageTone))}>
                {pageLabel}
              </div>
            </div>
          ) : (
            <div ref={focusRef} className={nodeCls(styles.leaf, styles.indent, toneClass(pageTone))}>
              {pageLabel}
            </div>
          )}
        </div>

        {caseId === 'hoc' && matching ? (
          <p className={styles.injectNote}>
            props: <code>navigate</code>, <code>params.id=42</code>
          </p>
        ) : null}
      </div>
    </LabVizPanel>
  )
}

export const ReactRouterLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('match')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (focusRef.current) gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
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

    playTimeline(
      tlRef,
      [
        () => setPhase('nav'),
        () => setPhase('match'),
        () => {
          setPhase('done')
          if (caseId === 'match') {
            log('ok', 'match /app/users/:id → UserPage')
            log('ok', 'params.id = 42')
            setHint('URL выбрал Route без перезагрузки документа')
          } else if (caseId === 'outlet') {
            log('ok', 'AppLayout mount #1 жив')
            log('ok', 'Outlet ← UserPage')
            setHint('сменилась только дыра Outlet, не весь layout')
          } else {
            log('ok', 'withRouter / compat → props')
            log('ok', 'params.id = 42')
            setHint('в v6 тот же доступ — useNavigate / useParams')
          }
        },
      ],
      (tl) => {
        tl.call(
          () => {
            const el = focusRef.current
            if (!el) return
            gsap.fromTo(
              el,
              { opacity: 0.55, y: 6 },
              { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
            )
          },
          undefined,
          STEP + 0.05,
        )
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('match')
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

      <RouterViz phase={phase} caseId={caseId} focusRef={focusRef} />

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
      title="React Router"
      lead="URL выбирает экран; nested `Outlet` держит layout; `withRouter` — наследие v5 вместо хуков."
      problem={problem}
      code={code}
    />
  )
}
