import {
  useMemo,
  useRef,
  useState,
  type ComponentType,
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
import styles from './ReactHocLab.module.css'

const TOPIC_ID = '184-react-hoc'
const STEP = 0.6
const USER = { name: 'Анна' }

type CaseId = 'guest' | 'session' | 'remount'
type Phase = 'idle' | 'wrap' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'guest', label: 'Гость' },
  { id: 'session', label: 'Сессия' },
  { id: 'remount', label: 'HOC в render' },
]

const CODE_INTRO: Record<CaseId, string> = {
  guest: '`withAuth(Profile)` без сессии возвращает `Login` — `Profile` не монтируется.',
  session: 'Та же обёртка передаёт `user` в `Profile` через props, исходник экрана не правят.',
  remount: '`withDraft(Editor)` в теле родителя — новый тип на каждый render, черновик сбрасывается.',
}

const SNIPPET_WITH_AUTH: InteractiveSnippet = {
  id: 'with-auth',
  label: 'src/hoc/withAuth.tsx',
  note: 'Фабрика возвращает `WithAuth`: нет `user` — `Login`, есть — `Wrapped` с внедрённым props.',
  executable: false,
  languageLabel: 'tsx',
  code: `import type { ComponentType } from 'react';
import { Login } from '../ui/Login';

type User = { name: string };
type Inner = { title: string; user: User };

export const withAuth = (Wrapped: ComponentType<Inner>) => {
  const WithAuth = ({
    user,
    title,
  }: { user: User | null; title: string }) => {
    if (!user) return <Login />; // ← Profile не монтируется
    return <Wrapped title={title} user={user} />; // ← внедрили user
  };
  WithAuth.displayName = \`withAuth(\${Wrapped.displayName ?? Wrapped.name})\`;
  return WithAuth;
};`,
}

const SNIPPET_APP_GUEST: InteractiveSnippet = {
  id: 'app-guest',
  label: 'src/App.tsx',
  note: '`withAuth` вызывают один раз на модуле; в дерево идёт уже новый тип.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { withAuth } from './hoc/withAuth';
import { Profile } from './screens/Profile';

const AuthedProfile = withAuth(Profile); // ← стабильный тип

export const App = () => (
  <AuthedProfile title="Кабинет" user={null} />
);`,
}

const SNIPPET_PROFILE: InteractiveSnippet = {
  id: 'profile',
  label: 'src/screens/Profile.tsx',
  note: '`Profile` не знает про сессию — получает готовый `user`.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { title: string; user: { name: string } };

export const Profile = ({ title, user }: Props) => (
  <section>
    <h1>{title}</h1>
    <p>Сессия: {user.name}</p> {/* ← пришло из HOC */}
  </section>
);`,
}

const SNIPPET_APP_SESSION: InteractiveSnippet = {
  id: 'app-session',
  label: 'src/App.tsx',
  note: 'Сессия есть — обёртка монтирует `Profile` и подмешивает `user`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { withAuth } from './hoc/withAuth';
import { Profile } from './screens/Profile';

const AuthedProfile = withAuth(Profile);

export const App = () => (
  <AuthedProfile title="Кабинет" user={{ name: 'Анна' }} />
);`,
}

const SNIPPET_WITH_DRAFT: InteractiveSnippet = {
  id: 'with-draft',
  label: 'src/hoc/withDraft.tsx',
  note: 'Черновик живёт в обёртке. Смена типа `WithDraft` снимает это дерево.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState, type ComponentType } from 'react';

type Inner = { ticks: number; bump: () => void };

export const withDraft = (Wrapped: ComponentType<Inner>) => {
  const WithDraft = () => {
    const [ticks, setTicks] = useState(0); // ← state обёртки
    return (
      <Wrapped ticks={ticks} bump={() => setTicks((n) => n + 1)} />
    );
  };
  return WithDraft;
};`,
}

const SNIPPET_PARENT: InteractiveSnippet = {
  id: 'settings-parent',
  label: 'src/settings/Settings.tsx',
  note: 'Фабрика в теле компонента — новый тип на каждый render родителя.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { withDraft } from '../hoc/withDraft';
import { Editor } from './Editor';

export const Settings = () => {
  // ═══════════════════════════════════════════
  // RENDER ← новый тип на каждый render
  // ═══════════════════════════════════════════
  const Enhanced = withDraft(Editor);

  return <Enhanced />;
};`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  guest: [SNIPPET_WITH_AUTH, SNIPPET_APP_GUEST],
  session: [SNIPPET_WITH_AUTH, SNIPPET_PROFILE, SNIPPET_APP_SESSION],
  remount: [SNIPPET_WITH_DRAFT, SNIPPET_PARENT],
}

const PAIN =
  'Общая проверка или данные надевают снаружи: функция берёт экран и возвращает новый тип. Исходник экрана не правят.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  guest: (
    <>
      Нет сессии — <code>withAuth</code> рисует <code>Login</code>, <code>Profile</code> не
      появляется.
    </>
  ),
  session: (
    <>
      Сессия есть — та же обёртка монтирует <code>Profile</code> и передаёт <code>user</code> в
      props.
    </>
  ),
  remount: (
    <>
      <code>withDraft(Editor)</code> внутри родителя: после его render черновик-счётчик обнуляется.
    </>
  ),
}

type User = { name: string }

type ProfileProps = { title: string; user: User }

const LoginCard = () => (
  <div className={styles.inner}>
    <p className={styles.eyebrow}>Login</p>
    <h2 className={styles.innerTitle}>Нужен вход</h2>
    <p className={styles.innerLead}>Profile сейчас не монтируется — обёртка вернула другой экран.</p>
  </div>
)

const ProfileCard = ({ title, user }: ProfileProps) => (
  <div className={styles.inner}>
    <p className={styles.eyebrow}>Profile</p>
    <h2 className={styles.innerTitle}>{title}</h2>
    <p className={styles.innerLead}>
      Сессия: <code>{user.name}</code>
    </p>
  </div>
)

const withAuth = (Wrapped: ComponentType<ProfileProps>) => {
  const WithAuth = ({ user, title }: { user: User | null; title: string }) => {
    if (!user) return <LoginCard />
    return <Wrapped title={title} user={user} />
  }
  WithAuth.displayName = `withAuth(${Wrapped.displayName ?? Wrapped.name})`
  return WithAuth
}

const AuthedProfile = withAuth(ProfileCard)

type TickCardProps = { ticks: number; wrapId: number }

const TickCard = ({ ticks, wrapId }: TickCardProps) => (
  <div className={styles.inner}>
    <p className={styles.eyebrow}>Editor</p>
    <h2 className={styles.innerTitle}>Черновик</h2>
    <p className={styles.counter}>{ticks}</p>
    <p className={styles.innerLead}>
      экземпляр обёртки <code>#{wrapId}</code>
    </p>
  </div>
)

type TicksApi = { setTicks: (n: number) => void; wrapId: number }

const makeWithDraft = (apiRef: MutableRefObject<TicksApi | null>) => {
  let wrapSeq = 0
  return () => {
    wrapSeq += 1
    const wrapId = wrapSeq
    const WithDraft = () => {
      const [ticks, setTicks] = useState(0)
      apiRef.current = { setTicks, wrapId }
      return <TickCard ticks={ticks} wrapId={wrapId} />
    }
    WithDraft.displayName = `withDraft#${wrapId}`
    return WithDraft
  }
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
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

const RemountHost = ({
  nonce,
  factory,
}: {
  nonce: number
  factory: () => ComponentType
}) => {
  const Enhanced = useMemo(() => factory(), [factory, nonce])
  return <Enhanced key={nonce} />
}

type VizProps = {
  phase: Phase
  caseId: CaseId
  user: User | null
  parentTick: number
  showAuth: boolean
  innerRef: MutableRefObject<HTMLDivElement | null>
  withDraftFactory: () => ComponentType
}

const CabinetViz = ({
  phase,
  caseId,
  user,
  parentTick,
  showAuth,
  innerRef,
  withDraftFactory,
}: VizProps) => {
  const remount = caseId === 'remount'

  const wrapLabel = remount
    ? parentTick > 0 && phase === 'done'
      ? 'withDraft(Editor) · новый тип'
      : 'withDraft(Editor)'
    : 'withAuth(Profile)'

  const meta =
    phase === 'idle'
      ? 'до обёртки'
      : phase === 'wrap'
        ? remount
          ? 'родитель render…'
          : 'проверяем сессию'
        : remount
          ? 'remount'
          : user
            ? 'user в props'
            : 'Login'

  const wrapState =
    phase === 'wrap'
      ? styles.wrapActive
      : phase === 'done' && remount
        ? styles.wrapWarn
        : phase === 'done' && !user && !remount
          ? styles.wrapWarn
          : phase === 'done'
            ? styles.wrapOk
            : ''

  return (
    <LabVizPanel title="Кабинет" meta={meta}>
      <div className={styles.cabinet}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden />
            <strong>Cabinet</strong>
          </div>
          <span className={styles.headerMeta}>{remount ? `родитель · ${parentTick}` : 'экран'}</span>
        </header>
        <div className={styles.body}>
          <p className={styles.slotLabel}>{wrapLabel}</p>
          <div className={`${styles.wrap} ${wrapState}`}>
            <p className={styles.wrapCaption}>обёртка HOC</p>
            <div ref={innerRef}>
              {remount ? (
                <RemountHost nonce={parentTick} factory={withDraftFactory} />
              ) : showAuth ? (
                <AuthedProfile title="Кабинет" user={user} />
              ) : (
                <div className={`${styles.inner} ${styles.innerMuted}`}>
                  <p className={styles.eyebrow}>Profile</p>
                  <h2 className={styles.innerTitle}>Кабинет</h2>
                  <p className={styles.innerLead}>ждём решение обёртки</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export const ReactHocLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('guest')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [parentTick, setParentTick] = useState(0)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const ticksApi = useRef<TicksApi | null>(null)
  const factoryRef = useRef(makeWithDraft(ticksApi))

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setUser(null)
    setShowAuth(false)
    setParentTick(0)
    ticksApi.current = null
    factoryRef.current = makeWithDraft(ticksApi)
    if (innerRef.current) gsap.set(innerRef.current, { clearProps: 'transform,opacity' })
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
    setBusy(true)

    if (caseId === 'remount') {
      setHint(null)
      setPhase('idle')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('wrap')
            ticksApi.current?.setTicks(3)
            log('ok', `черновик · 3  экземпляр #${ticksApi.current?.wrapId ?? 1}`)
          },
          () => {
            setParentTick((n) => n + 1)
            log('warn', 'родитель render → withDraft(Editor) заново')
          },
          () => {
            setPhase('done')
            log('err', `remount · счётчик 0  экземпляр #${ticksApi.current?.wrapId ?? 2}`)
            setHint('новый тип WithDraft → React снял дерево, черновик сброшен')
          },
        ],
        (tl) => {
          tl.call(
            () => {
              const el = innerRef.current
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
      return
    }

    resetViz()
    playTimeline(
      tlRef,
      [
        () => {
          setPhase('wrap')
          log('ok', 'withAuth(Profile) проверяет сессию')
        },
        () => {
          const nextUser = caseId === 'session' ? USER : null
          setUser(nextUser)
          setShowAuth(true)
        },
        () => {
          setPhase('done')
          if (caseId === 'guest') {
            log('warn', 'нет user → Login, Profile не монтируется')
            setHint('обёртка решила за экран: гость видит Login')
          } else {
            log('ok', `user=${USER.name} → props Profile`)
            setHint('Profile получил user снаружи, свой файл не меняли')
          }
        },
      ],
      (tl) => {
        tl.call(
          () => {
            const el = innerRef.current
            if (!el) return
            gsap.fromTo(
              el,
              { opacity: 0.7, y: 6 },
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
    setCaseId('guest')
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
        user={user}
        parentTick={parentTick}
        showAuth={showAuth}
        innerRef={innerRef}
        withDraftFactory={factoryRef.current}
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
    <div className={shell.codePane}>
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
      title="Компоненты высшего порядка"
      lead="`withAuth` и `withDraft`: обёртка решает, что монтировать, и внедряет props снаружи."
      problem={problem}
      code={code}
    />
  )
}
