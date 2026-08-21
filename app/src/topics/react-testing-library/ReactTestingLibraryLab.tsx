import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactTestingLibraryLab.module.css'

const TOPIC_ID = '39-react-testing-library'
const STEP = 0.55

type CaseId = 'role' | 'css' | 'async'
type Phase = 'idle' | 'render' | 'query' | 'act' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'role', label: 'по роли' },
  { id: 'css', label: 'по классу' },
  { id: 'async', label: 'async' },
]

const PAIN = (
  <>
    Один и тот же логин можно искать по роли и подписи — как видит пользователь — или по
    CSS-классу, который завтра переименуют в вёрстке.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  role: (
    <>
      <code>getByRole</code> + имя «Войти» находит кнопку так же, как скринридер и глаз.
    </>
  ),
  css: (
    <>
      Селектор <code>.btn-primary</code> ломается после смены класса, хотя кнопка та же.
    </>
  ),
  async: (
    <>
      Статус появляется после загрузки — <code>findByRole</code> ждёт элемент, не{' '}
      <code>sleep</code>.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  role: 'RTL: роль и имя — устойчивый запрос к доступному DOM.',
  css: 'Антипаттерн: CSS-класс привязывает тест к вёрстке, не к UX.',
  async: 'Асинхронный UI: findBy* / waitFor вместо фиксированной паузы.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  role: [
    {
      id: 'login-test',
      label: 'LoginForm.test.tsx',
      note: 'Пользовательский сценарий: label + роль кнопки.',
      executable: false,
      languageLabel: 'tsx',
      code: `test('отправляет логин', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  await user.type(
    screen.getByLabelText('Email'), // ← по подписи
    'a@b.c',
  );
  await user.click(
    screen.getByRole('button', { name: 'Войти' }), // ← по роли
  );

  expect(onSubmit).toHaveBeenCalled();
});
`,
    },
    {
      id: 'login-form',
      label: 'LoginForm.tsx',
      note: 'Доступные имя и label дают RTL, за что держаться.',
      executable: false,
      languageLabel: 'tsx',
      code: `export const LoginForm = ({ onSubmit }: Props) => (
  <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
    <label>
      Email
      <input type="email" />
    </label>
    <button type="submit">Войти</button> {/* ← accessible name */}
  </form>
);
`,
    },
  ],
  css: [
    {
      id: 'brittle',
      label: 'LoginForm.fragile.test.tsx',
      note: 'Класс вёрстки — хрупкая привязка.',
      executable: false,
      languageLabel: 'tsx',
      code: `test('клик по primary', async () => {
  render(<LoginForm onSubmit={vi.fn()} />);
  const btn = document.querySelector('.btn-primary'); // ← хрупко
  await userEvent.click(btn!);
});
`,
    },
    {
      id: 'restyle',
      label: 'LoginForm.tsx',
      note: 'Дизайн сменил класс — UX тот же, тест красный.',
      executable: false,
      languageLabel: 'tsx',
      code: `// было:  className="btn-primary"
<button type="submit" className="btn solid"> {/* ← restyle */}
  Войти
</button>
`,
    },
  ],
  async: [
    {
      id: 'findby',
      label: 'StatusBanner.test.tsx',
      note: 'findBy ждёт появления в DOM.',
      executable: false,
      languageLabel: 'tsx',
      code: `test('показывает статус', async () => {
  render(<StatusBanner />);

  expect(
    await screen.findByRole('status'), // ← ждёт, не sleep
  ).toHaveTextContent('Готово');
});
`,
    },
    {
      id: 'banner',
      label: 'StatusBanner.tsx',
      note: 'Сначала загрузка, потом role=status.',
      executable: false,
      languageLabel: 'tsx',
      code: `export const StatusBanner = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return <p>Загрузка…</p>;
  return <p role="status">Готово</p>; // ← async UI
};
`,
    },
  ],
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
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
    defaults: { duration: STEP, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

type StandProps = {
  caseId: CaseId
  phase: Phase
  restyled: boolean
  statusReady: boolean
  chipRef: MutableRefObject<HTMLDivElement | null>
}

function QueryStand({ caseId, phase, restyled, statusReady, chipRef }: StandProps) {
  const meta =
    phase === 'idle'
      ? 'как тест находит кнопку'
      : caseId === 'role'
        ? phase === 'done'
          ? 'hit · по роли'
          : 'getByRole'
        : caseId === 'css'
          ? phase === 'done'
            ? 'miss · класс сменился'
            : 'querySelector'
          : phase === 'done'
            ? 'status · findBy'
            : 'ждём появления'

  const chip =
    caseId === 'role'
      ? "getByRole('button', { name: 'Войти' })"
      : caseId === 'css'
        ? restyled
          ? "querySelector('.btn-primary') → null"
          : "querySelector('.btn-primary')"
        : statusReady
          ? "findByRole('status')"
          : 'findByRole… ожидание'

  const chipCls = [
    styles.queryChip,
    caseId === 'css' && phase !== 'idle' && styles.queryChipWarn,
    caseId === 'css' && phase === 'done' && styles.queryChipErr,
  ]
    .filter(Boolean)
    .join(' ')

  const loginHit = caseId === 'role' && (phase === 'query' || phase === 'act' || phase === 'done')
  const loginMiss = caseId === 'css' && phase === 'done'
  const loginDim =
    (caseId === 'css' && phase === 'query') ||
    (caseId === 'async' && phase !== 'idle')

  const cancelDim =
    caseId === 'role' && (phase === 'query' || phase === 'act' || phase === 'done')

  const loginCls = [
    styles.demoBtn,
    !restyled && styles.demoBtnPrimary,
    loginHit && styles.demoBtnHit,
    loginMiss && styles.demoBtnMiss,
    loginDim && !loginMiss && styles.demoBtnDim,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <LabVizPanel title="форма под тестом" meta={meta}>
      <div className={styles.scene}>
        <div
          ref={chipRef}
          className={chipCls}
          style={{ opacity: phase === 'idle' ? 0.45 : 1 }}
        >
          {chip}
        </div>

        {caseId === 'async' ? (
          <div className={styles.formCard}>
            <p
              className={[
                styles.statusLine,
                statusReady ? styles.statusOk : styles.statusWait,
              ]
                .filter(Boolean)
                .join(' ')}
              role={statusReady ? 'status' : undefined}
            >
              {statusReady ? 'Готово' : 'Загрузка…'}
            </p>
          </div>
        ) : (
          <div className={styles.formCard}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rtl-lab-email">
                Email
              </label>
              <input
                id="rtl-lab-email"
                className={styles.input}
                type="email"
                defaultValue="a@b.c"
                readOnly
              />
            </div>
            <div className={styles.actions}>
              <button type="button" className={loginCls} tabIndex={-1}>
                Войти
              </button>
              <button
                type="button"
                className={[styles.demoBtn, cancelDim && styles.demoBtnDim]
                  .filter(Boolean)
                  .join(' ')}
                tabIndex={-1}
              >
                Отмена
              </button>
            </div>
            {restyled && caseId === 'css' ? (
              <p className={styles.restyleNote}>класс сменили: btn-primary → btn solid</p>
            ) : null}
          </div>
        )}
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [caseId, setCaseId] = useState<CaseId>('role')
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [restyled, setRestyled] = useState(false)
  const [statusReady, setStatusReady] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const chipRef = useRef<HTMLDivElement | null>(null)

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
    setRestyled(false)
    setStatusReady(false)
    if (chipRef.current) gsap.set(chipRef.current, { y: 0, clearProps: 'y' })
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  const onRun = () => {
    if (running) return
    resetVisual()
    setRunning(true)
    setFinished(false)
    clear()

    if (caseId === 'role') {
      log('info', 'render LoginForm')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('render')
            log('info', 'getByLabelText · Email')
          },
          () => {
            setPhase('query')
            log('ok', "getByRole('button', { name: 'Войти' })")
          },
          () => {
            setPhase('act')
            log('ok', 'userEvent.click')
          },
          () => {
            setPhase('done')
            log('ok', 'assert · submit вызван')
          },
        ],
        (tl) => {
          if (!chipRef.current) return
          tl.fromTo(chipRef.current, { y: -6 }, { y: 0 }, 0)
        },
        () => {
          setRunning(false)
          setFinished(true)
        },
      )
      return
    }

    if (caseId === 'css') {
      log('warn', 'поиск по классу')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('render')
            log('info', 'render · .btn-primary есть')
          },
          () => {
            setPhase('query')
            log('warn', "querySelector('.btn-primary')")
          },
          () => {
            setRestyled(true)
            setPhase('act')
            log('warn', 'restyle: класс сменили')
          },
          () => {
            setPhase('done')
            log('err', 'элемент не найден')
          },
        ],
        (tl) => {
          if (!chipRef.current) return
          tl.fromTo(chipRef.current, { y: -6 }, { y: 0 }, 0)
        },
        () => {
          setRunning(false)
          setFinished(true)
        },
      )
      return
    }

    log('info', 'async UI')
    playTimeline(
      tlRef,
      [
        () => {
          setPhase('render')
          setStatusReady(false)
          log('info', 'Загрузка…')
        },
        () => {
          setPhase('query')
          log('info', 'findByRole · ждём')
        },
        () => {
          setStatusReady(true)
          setPhase('act')
          log('ok', "role='status' появился")
        },
        () => {
          setPhase('done')
          log('ok', 'Готово')
        },
      ],
      (tl) => {
        if (!chipRef.current) return
        tl.fromTo(chipRef.current, { y: -6 }, { y: 0 }, 0)
      },
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    caseId === 'role'
      ? 'Итог: роль и имя переживают рефакторинг вёрстки.'
      : caseId === 'css'
        ? 'Итог: CSS-класс привязал тест к стилю, не к кнопке «Войти».'
        : 'Итог: findBy ждёт DOM; sleep только маскирует гонку.'

  return (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={running}
            onClick={() => onCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
      <div className={shell.row}>
        <LabButton variant="primary" size="sm" disabled={running} onClick={onRun}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" size="sm" disabled={running} onClick={onReset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <QueryStand
        caseId={caseId}
        phase={phase}
        restyled={restyled}
        statusReady={statusReady}
        chipRef={chipRef}
      />

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [caseId, setCaseId] = useState<CaseId>('role')

  return (
    <div className={shell.codePane}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => setCaseId(c.id)}
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
}

export function ReactTestingLibraryLab() {
  return (
    <JsLabShell
      title="React Testing Library"
      lead="Логин: поиск по роли, хрупкий CSS или ожидание async-статуса."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
