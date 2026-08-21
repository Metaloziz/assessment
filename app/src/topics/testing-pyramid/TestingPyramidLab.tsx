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
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './TestingPyramidLab.module.css'

const TOPIC_ID = '270-testing-pyramid'
const STEP = 0.55

type CaseId = 'unit' | 'integration' | 'e2e' | 'inverted'
type Phase = 'idle' | 'pick' | 'run' | 'done'
type LayerId = 'e2e' | 'integration' | 'unit'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'unit', label: 'unit' },
  { id: 'integration', label: 'integration' },
  { id: 'e2e', label: 'e2e' },
  { id: 'inverted', label: 'перевёрнутая' },
]

const PAIN = (
  <>
    Один баг можно ловить на разных уровнях: быстро в изоляции, на стыке модулей или
    целиком в браузере — и легко уехать в «всё через e2e».
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  unit: (
    <>
      Формула скидки — <code>Jest</code> / <code>Vitest</code> в Node, без DOM и сети.
    </>
  ),
  integration: (
    <>
      Форма логина: <code>Testing Library</code> + runner, соседние модули живые, I/O на границе.
    </>
  ),
  e2e: (
    <>
      Checkout в реальном браузере — <code>Playwright</code> / <code>Cypress</code>, сценариев мало.
    </>
  ),
  inverted: (
    <>
      Почти всё закрыто e2e: suite медленный и flaky — классическая перевёрнутая пирамида.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  unit: 'Unit: чистая логика, быстрый feedback. Jest и Vitest — один уровень пирамиды.',
  integration: 'Integration: стык UI/API без полного браузерного пути.',
  e2e: 'E2E: критичный пользовательский flow. Таких тестов должно быть мало.',
  inverted: 'Антипаттерн: e2e вместо unit — дорого и хрупко.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  unit: [
    {
      id: 'discount',
      label: 'discount.test.ts',
      note: 'Node, без DOM. Основание пирамиды.',
      executable: false,
      languageLabel: 'ts',
      code: `test('скидка 10%', () => {
  expect(calcDiscount(1000, 10)).toBe(900); // ← UNIT
});
`,
    },
    {
      id: 'tools-unit',
      label: 'инструменты',
      note: 'Runner + assertions на уровне модуля.',
      executable: false,
      languageLabel: 'txt',
      code: `Jest · Vitest · Node assert
среда: Node (логика) / jsdom (DOM-утилиты)
моки: только I/O и внешние сервисы
`,
    },
  ],
  integration: [
    {
      id: 'login-rtl',
      label: 'LoginForm.test.tsx',
      note: 'Поведение пользователя, не internals компонента.',
      executable: false,
      languageLabel: 'tsx',
      code: `render(<LoginForm />);
await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');
await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
expect(await screen.findByText('Добро пожаловать')).toBeInTheDocument();
// ← INTEGRATION (UI)
`,
    },
    {
      id: 'api-integ',
      label: 'orders.integration.ts',
      note: 'Стык HTTP + БД без браузера.',
      executable: false,
      languageLabel: 'ts',
      code: `const res = await request(app).post('/orders').send({ sku: 'A1' });
expect(res.status).toBe(201);
expect(await db.orders.findById(res.body.id)).toMatchObject({ status: 'created' });
`,
    },
  ],
  e2e: [
    {
      id: 'playwright',
      label: 'e2e/checkout.spec.ts',
      note: 'Реальный браузер, один критичный путь.',
      executable: false,
      languageLabel: 'ts',
      code: `test('оформляет заказ', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByTestId('pay').click(); // ← E2E
  await expect(page.getByText('Заказ оформлен')).toBeVisible();
});
`,
    },
    {
      id: 'cypress',
      label: 'cypress/e2e/checkout.cy.ts',
      note: 'Тот же уровень: другой API, та же идея.',
      executable: false,
      languageLabel: 'js',
      code: `it('оформляет заказ', () => {
  cy.visit('/checkout');
  cy.get('[data-testid=pay]').click();
  cy.contains('Заказ оформлен').should('be.visible');
});
`,
    },
  ],
  inverted: [
    {
      id: 'all-e2e',
      label: 'e2e/everything.spec.ts',
      note: 'Формула скидки через браузер — перевёрнутая пирамида.',
      executable: false,
      languageLabel: 'ts',
      code: `// плохо: unit-логика через полный UI
test('скидка 10%', async ({ page }) => {
  await page.goto('/cart');
  await page.getByTestId('coupon').fill('SALE10');
  await page.getByTestId('apply').click();
  await expect(page.getByTestId('total')).toHaveText('900');
}); // ← медленно, flaky, дорого
`,
    },
    {
      id: 'fix',
      label: 'как должно быть',
      note: 'Тот же контракт — unit за миллисекунды.',
      executable: false,
      languageLabel: 'ts',
      code: `test('скидка 10%', () => {
  expect(calcDiscount(1000, 10)).toBe(900); // ← UNIT
});
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

function nodeCls(...parts: Array<string | false | undefined>) {
  return [labVizStyles.node, ...parts.filter(Boolean)].join(' ')
}

function targetLayer(caseId: CaseId): LayerId | null {
  if (caseId === 'unit') return 'unit'
  if (caseId === 'integration') return 'integration'
  if (caseId === 'e2e') return 'e2e'
  return null
}

function layerState(
  caseId: CaseId,
  phase: Phase,
  layer: LayerId,
): 'idle' | 'active' | 'ok' | 'err' | 'dim' {
  if (phase === 'idle') return 'dim'

  if (caseId === 'inverted') {
    if (layer === 'e2e') {
      if (phase === 'pick' || phase === 'run') return 'active'
      if (phase === 'done') return 'err'
    }
    if (layer === 'unit' && phase === 'done') return 'err'
    return 'dim'
  }

  const target = targetLayer(caseId)
  if (layer !== target) return 'dim'
  if (phase === 'pick' || phase === 'run') return 'active'
  if (phase === 'done') return 'ok'
  return 'dim'
}

function toolLabel(caseId: CaseId, phase: Phase): string {
  if (phase === 'idle') return 'выбери уровень'
  if (caseId === 'unit') return 'Jest / Vitest'
  if (caseId === 'integration') return 'Testing Library · Supertest'
  if (caseId === 'e2e') return 'Playwright / Cypress'
  return 'всё через e2e ✕'
}

function counts(caseId: CaseId): { unit: string; integ: string; e2e: string } {
  if (caseId === 'inverted') {
    return { unit: 'unit ×3', integ: 'integ ×5', e2e: 'e2e ×40' }
  }
  return { unit: 'unit ×80', integ: 'integ ×15', e2e: 'e2e ×5' }
}

type PyramidVizProps = {
  caseId: CaseId
  phase: Phase
  toolRef: MutableRefObject<HTMLDivElement | null>
}

function PyramidViz({ caseId, phase, toolRef }: PyramidVizProps) {
  const layers: Array<{ id: LayerId; label: string; sub: string; widthCls: string }> = [
    { id: 'e2e', label: 'e2e', sub: 'браузер · дорого', widthCls: styles.layerE2e },
    {
      id: 'integration',
      label: 'integration',
      sub: 'стыки · средняя цена',
      widthCls: styles.layerInteg,
    },
    { id: 'unit', label: 'unit', sub: 'модуль · дёшево', widthCls: styles.layerUnit },
  ]

  const inverted = caseId === 'inverted' && phase !== 'idle'
  const c = counts(caseId)
  const meta =
    phase === 'idle'
      ? 'баланс покрытия'
      : caseId === 'inverted'
        ? phase === 'done'
          ? 'медленный flaky suite'
          : 'много e2e'
        : phase === 'done'
          ? 'уровень выбран'
          : 'подбор инструмента'

  return (
    <LabVizPanel title="пирамида тестирования" meta={meta}>
      <div
        ref={toolRef}
        className={styles.tool}
        style={{ opacity: phase === 'idle' ? 0.45 : 1 }}
      >
        {toolLabel(caseId, phase)}
      </div>
      <div className={[styles.pyramid, inverted && styles.inverted].filter(Boolean).join(' ')}>
        {layers.map((L) => {
          const st = layerState(caseId, phase, L.id)
          const dim = st === 'dim'
          const state = st === 'dim' ? 'idle' : st
          return (
            <div
              key={L.id}
              className={[
                nodeCls(
                  state === 'active' && labVizStyles.nodeActive,
                  state === 'ok' && labVizStyles.nodeOk,
                  state === 'err' && labVizStyles.nodeErr,
                ),
                styles.layer,
                L.widthCls,
                dim && styles.dim,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={labVizStyles.nodeLabel}>{L.label}</span>
              <span className={labVizStyles.nodeSub}>{L.sub}</span>
            </div>
          )
        })}
      </div>
      <ul className={styles.stats}>
        <li className={caseId === 'inverted' && phase !== 'idle' ? undefined : styles.statHot}>
          {c.unit}
        </li>
        <li>{c.integ}</li>
        <li className={caseId === 'inverted' && phase !== 'idle' ? styles.statHot : undefined}>
          {c.e2e}
        </li>
      </ul>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [caseId, setCaseId] = useState<CaseId>('unit')
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const toolRef = useRef<HTMLDivElement | null>(null)

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
    if (toolRef.current) gsap.set(toolRef.current, { y: 0, clearProps: 'y' })
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

    if (caseId === 'unit') {
      log('info', 'задача: calcDiscount')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('pick')
            log('info', 'уровень: unit')
          },
          () => {
            setPhase('run')
            log('ok', 'инструмент: Jest / Vitest')
          },
          () => {
            setPhase('done')
            log('ok', 'мс, детерминировано')
          },
        ],
        (tl) => {
          if (!toolRef.current) return
          tl.fromTo(toolRef.current, { y: -6 }, { y: 0 }, 0)
        },
        () => {
          setRunning(false)
          setFinished(true)
        },
      )
      return
    }

    if (caseId === 'integration') {
      log('info', 'задача: LoginForm / API+БД')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('pick')
            log('info', 'уровень: integration')
          },
          () => {
            setPhase('run')
            log('ok', 'RTL · Supertest · MSW')
          },
          () => {
            setPhase('done')
            log('ok', 'стык без полного e2e')
          },
        ],
        (tl) => {
          if (!toolRef.current) return
          tl.fromTo(toolRef.current, { y: -6 }, { y: 0 }, 0)
        },
        () => {
          setRunning(false)
          setFinished(true)
        },
      )
      return
    }

    if (caseId === 'e2e') {
      log('info', 'задача: checkout')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('pick')
            log('info', 'уровень: e2e')
          },
          () => {
            setPhase('run')
            log('ok', 'Playwright / Cypress')
          },
          () => {
            setPhase('done')
            log('ok', 'мало сценариев · критичный путь')
          },
        ],
        (tl) => {
          if (!toolRef.current) return
          tl.fromTo(toolRef.current, { y: -6 }, { y: 0 }, 0)
        },
        () => {
          setRunning(false)
          setFinished(true)
        },
      )
      return
    }

    log('warn', 'антипаттерн: перевёрнутая пирамида')
    playTimeline(
      tlRef,
      [
        () => {
          setPhase('pick')
          log('warn', 'скидка через полный UI')
        },
        () => {
          setPhase('run')
          log('warn', 'e2e ×40 · unit почти нет')
        },
        () => {
          setPhase('done')
          log('err', 'медленно · flaky · дорого')
        },
      ],
      (tl) => {
        if (!toolRef.current) return
        tl.fromTo(toolRef.current, { y: -6 }, { y: 0 }, 0)
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
    caseId === 'unit'
      ? 'Итог: основание пирамиды — Jest/Vitest, быстрый контракт модуля.'
      : caseId === 'integration'
        ? 'Итог: середина — Testing Library / Supertest на стыках.'
        : caseId === 'e2e'
          ? 'Итог: верхушка — мало e2e на критичных путях.'
          : 'Итог: перевёрнутая пирамида съедает время CI и маскирует unit-баги.'

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

      <PyramidViz caseId={caseId} phase={phase} toolRef={toolRef} />

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [caseId, setCaseId] = useState<CaseId>('unit')

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

export function TestingPyramidLab() {
  return (
    <JsLabShell
      title="Пирамида тестирования"
      lead="Уровень проверки → инструмент: unit, integration, e2e и перевёрнутая пирамида."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
