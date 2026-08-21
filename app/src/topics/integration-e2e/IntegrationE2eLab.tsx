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
import styles from './IntegrationE2eLab.module.css'

const TOPIC_ID = '43-integration-e2e'
const STEP = 0.55

type CaseId = 'integration' | 'e2e' | 'brittle'
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'integration', label: 'интеграция' },
  { id: 'e2e', label: 'e2e' },
  { id: 'brittle', label: 'хрупкий e2e' },
]

const PAIN = (
  <>
    Один сценарий «создать заказ» можно проверить на разных срезах стека: быстрее без
    браузера или целиком глазами пользователя — и легко сломать ожиданиями.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  integration: (
    <>
      Тест бьёт в <code>API</code> и смотрит запись в <code>БД</code> — браузер не нужен.
    </>
  ),
  e2e: (
    <>
      Cypress / Playwright ведут клики в браузере до видимого результата на всём стеке.
    </>
  ),
  brittle: (
    <>
      CSS-селектор и <code>wait(5000)</code> — сценарий мигает или падает без причины в коде.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  integration: 'Интеграция: HTTP + БД без UI. Стык модулей, не клики.',
  e2e: 'Тот же сценарий в браузере: Cypress и Playwright — разный API, одна идея.',
  brittle: 'Антипаттерн: класс вёрстки и фиксированная пауза вместо ожидания состояния.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  integration: [
    {
      id: 'orders-api',
      label: 'tests/orders.integration.ts',
      note: 'Реальный app + тестовая БД; браузера нет.',
      executable: false,
      languageLabel: 'ts',
      code: `test('создаёт заказ', async () => {
  const res = await request(app)
    .post('/orders')
    .send({ sku: 'A1' }); // ← INTEGRATION: API

  expect(res.status).toBe(201);

  const row = await db.orders.findById(res.body.id);
  expect(row?.status).toBe('created'); // ← стык с БД
});
`,
    },
    {
      id: 'seed',
      label: 'tests/seed.ts',
      note: 'Данные на тест, без зависимости от соседей.',
      executable: false,
      languageLabel: 'ts',
      code: `beforeEach(async () => {
  await db.reset(); // ← изоляция
  await db.products.insert({ sku: 'A1', stock: 3 });
});
`,
    },
  ],
  e2e: [
    {
      id: 'cypress',
      label: 'cypress/e2e/checkout.cy.ts',
      note: 'Цепочки cy.* и автоожидание assertions.',
      executable: false,
      languageLabel: 'js',
      code: `it('оформляет заказ', () => {
  cy.visit('/products');
  cy.get('[data-testid=product-1]').click(); // ← E2E
  cy.get('[data-testid=checkout]').click();
  cy.get('[data-testid=order-ok]').should('be.visible');
});
`,
    },
    {
      id: 'playwright',
      label: 'e2e/checkout.spec.ts',
      note: 'Тот же путь: локаторы + expect.',
      executable: false,
      languageLabel: 'ts',
      code: `test('оформляет заказ', async ({ page }) => {
  await page.goto('/products');
  await page.getByTestId('product-1').click(); // ← E2E
  await page.getByTestId('checkout').click();
  await expect(page.getByTestId('order-ok')).toBeVisible();
});
`,
    },
  ],
  brittle: [
    {
      id: 'bad-wait',
      label: 'cypress/e2e/fragile.cy.ts',
      note: 'Фиксированная пауза и CSS — типичный flaky.',
      executable: false,
      languageLabel: 'js',
      code: `it('оформляет заказ', () => {
  cy.visit('/products');
  cy.get('.btn-primary.mt-2').click(); // ← хрупко: класс вёрстки
  cy.wait(5000); // ← не ждать состояние
  cy.contains('Спасибо').should('exist');
});
`,
    },
    {
      id: 'stable',
      label: 'e2e/stable.spec.ts',
      note: 'data-testid и ожидание элемента вместо sleep.',
      executable: false,
      languageLabel: 'ts',
      code: `await page.getByTestId('checkout').click();
await expect(page.getByTestId('order-ok')).toBeVisible();
// ← ждём UI, не setTimeout
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

type LayerId = 'browser' | 'ui' | 'api' | 'db'

function layerState(
  caseId: CaseId,
  phase: Phase,
  layer: LayerId,
): 'idle' | 'active' | 'ok' | 'err' | 'dim' {
  if (phase === 'idle') return 'dim'

  if (caseId === 'integration') {
    if (layer === 'browser' || layer === 'ui') return 'dim'
    if (phase === 'a' && layer === 'api') return 'active'
    if (phase === 'b' && layer === 'db') return 'active'
    if (phase === 'done' && (layer === 'api' || layer === 'db')) return 'ok'
    if ((phase === 'b' || phase === 'done') && layer === 'api') return 'ok'
    return 'dim'
  }

  if (caseId === 'brittle') {
    if (layer === 'browser' && (phase === 'a' || phase === 'b')) return 'active'
    if (layer === 'ui' && phase === 'b') return 'active'
    if (phase === 'done') {
      if (layer === 'browser' || layer === 'ui') return 'err'
      return 'dim'
    }
    if (layer === 'api' || layer === 'db') return 'dim'
    return 'dim'
  }

  // e2e — весь стек
  if (phase === 'a' && layer === 'browser') return 'active'
  if (phase === 'b' && (layer === 'ui' || layer === 'api')) return layer === 'ui' ? 'active' : 'ok'
  if (phase === 'c' && layer === 'db') return 'active'
  if (phase === 'done') return 'ok'
  if (phase === 'b' && layer === 'browser') return 'ok'
  if (phase === 'c' && (layer === 'browser' || layer === 'ui' || layer === 'api')) return 'ok'
  return 'dim'
}

type StackVizProps = {
  caseId: CaseId
  phase: Phase
  probeRef: MutableRefObject<HTMLDivElement | null>
}

function StackViz({ caseId, phase, probeRef }: StackVizProps) {
  const layers: Array<{ id: LayerId; label: string; sub: string }> = [
    { id: 'browser', label: 'браузер', sub: 'Cypress / Playwright' },
    { id: 'ui', label: 'UI', sub: 'страница / клики' },
    { id: 'api', label: 'API', sub: 'HTTP / сервисы' },
    { id: 'db', label: 'БД', sub: 'хранилище' },
  ]

  const meta =
    phase === 'idle'
      ? 'срез стека'
      : caseId === 'integration'
        ? phase === 'done'
          ? 'API + БД ok'
          : 'без браузера'
        : caseId === 'brittle'
          ? phase === 'done'
            ? 'flaky / timeout'
            : 'CSS + sleep'
          : phase === 'done'
            ? 'путь целиком'
            : 'e2e прогон'

  const probe =
    caseId === 'integration'
      ? 'POST /orders'
      : caseId === 'brittle'
        ? '.btn-primary + wait'
        : 'checkout → order-ok'

  return (
    <LabVizPanel title="какой срез покрывает тест" meta={meta}>
      <div className={styles.stack}>
        <div
          ref={probeRef}
          className={styles.probe}
          style={{ opacity: phase === 'idle' ? 0.45 : 1 }}
        >
          {probe}
        </div>
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
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [caseId, setCaseId] = useState<CaseId>('integration')
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const probeRef = useRef<HTMLDivElement | null>(null)

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
    if (probeRef.current) gsap.set(probeRef.current, { y: 0, clearProps: 'y' })
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

    if (caseId === 'integration') {
      log('info', 'интеграция: без браузера')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('a')
            log('info', 'POST /orders')
          },
          () => {
            setPhase('b')
            log('ok', 'запись в БД')
          },
          () => {
            setPhase('done')
            log('ok', 'status created')
          },
        ],
        (tl) => {
          if (!probeRef.current) return
          tl.fromTo(probeRef.current, { y: -8 }, { y: 0 }, 0)
        },
        () => {
          setRunning(false)
          setFinished(true)
        },
      )
      return
    }

    if (caseId === 'brittle') {
      log('warn', 'хрупкий e2e')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('a')
            log('info', 'visit /products')
          },
          () => {
            setPhase('b')
            log('warn', '.btn-primary · wait(5000)')
          },
          () => {
            setPhase('done')
            log('err', 'timeout / flaky')
          },
        ],
        (tl) => {
          if (!probeRef.current) return
          tl.fromTo(probeRef.current, { y: -8 }, { y: 0 }, 0)
        },
        () => {
          setRunning(false)
          setFinished(true)
        },
      )
      return
    }

    log('info', 'e2e: Cypress / Playwright')
    playTimeline(
      tlRef,
      [
        () => {
          setPhase('a')
          log('info', 'браузер: visit')
        },
        () => {
          setPhase('b')
          log('ok', 'клик → API')
        },
        () => {
          setPhase('c')
          log('ok', 'БД обновилась')
        },
        () => {
          setPhase('done')
          log('ok', 'order-ok visible')
        },
      ],
      (tl) => {
        if (!probeRef.current) return
        tl.fromTo(probeRef.current, { y: -8 }, { y: 0 }, 0)
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
    caseId === 'integration'
      ? 'Итог: стык API и БД пойман без UI — быстрее e2e.'
      : caseId === 'brittle'
        ? 'Итог: класс вёрстки и sleep делают suite хрупким.'
        : 'Итог: e2e закрывает весь путь; таких сценариев мало.'

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

      <StackViz caseId={caseId} phase={phase} probeRef={probeRef} />

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [caseId, setCaseId] = useState<CaseId>('integration')

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

export function IntegrationE2eLab() {
  return (
    <JsLabShell
      title="Интеграция и e2e"
      lead="Один заказ: срез API+БД, полный браузерный путь или хрупкий сценарий."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
