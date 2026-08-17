import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './LegacyCodeApproachesLab.module.css'

const TOPIC_ID = '55-legacy-code-approaches'
const STEP = 0.65

type Lens = 'feathers' | 'stack' | 'friction'
type CaseId = 'billing' | 'checkout'
type Phase = 'idle' | 'lens' | 'traits' | 'done'
type TraitId = 'tests' | 'stack' | 'lead' | 'owners'

const LENSES: Array<{ id: Lens; label: string }> = [
  { id: 'feathers', label: 'Feathers · тесты' },
  { id: 'stack', label: 'Стек' },
  { id: 'friction', label: 'Трение' },
]

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'billing', label: 'billing-core' },
  { id: 'checkout', label: 'checkout-ui' },
]

const LENS_TRAITS: Record<Lens, TraitId[]> = {
  feathers: ['tests'],
  stack: ['stack'],
  friction: ['lead', 'owners'],
}

const MODULE: Record<
  CaseId,
  { title: string; traits: Record<TraitId, { label: string; sub: string }> }
> = {
  billing: {
    title: 'billing/legacyProcessor.js',
    traits: {
      tests: { label: 'Тесты', sub: 'нет · 0%' },
      stack: { label: 'Стек', sub: 'jQuery 1.x · 2014' },
      lead: { label: 'Lead time', sub: 'недели на мелкий фикс' },
      owners: { label: 'Ownership', sub: '1 «хранитель»' },
    },
  },
  checkout: {
    title: 'checkout/CheckoutForm.tsx',
    traits: {
      tests: { label: 'Тесты', sub: '~82% критичный путь' },
      stack: { label: 'Стек', sub: 'React 18 · 2023' },
      lead: { label: 'Lead time', sub: 'дни' },
      owners: { label: 'Ownership', sub: 'команда checkout' },
    },
  },
}

const VERDICT: Record<Lens, Record<CaseId, { legacy: boolean; note: string }>> = {
  feathers: {
    billing: { legacy: true, note: 'нет seam-тестов → легаси' },
    checkout: { legacy: false, note: 'есть страховка → не легаси' },
  },
  stack: {
    billing: { legacy: true, note: 'EOL-слой · CVE без патча' },
    checkout: { legacy: false, note: 'актуальный toolchain' },
  },
  friction: {
    billing: { legacy: true, note: 'высокое трение изменений' },
    checkout: { legacy: false, note: 'низкий lead time' },
  },
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  billing: (
    <>
      Старый revenue-path без тестов: по Feathers и стеку — легаси, по возрасту сам по себе — не аргумент.
    </>
  ),
  checkout: (
    <>
      Свежий модуль с покрытием: по Feathers не легаси, хотя в том же монорепо рядом «старьё».
    </>
  ),
}

const LENS_PAIN: Record<Lens, string> = {
  feathers: 'Feathers: легаси — код без тестов, через который страшно менять поведение.',
  stack: 'Стек: легаси — EOL runtime/deps и риск без security-fix, а не календарный год файла.',
  friction: 'Трение: легаси — когда мелкое изменение стоит недель и одного «хранителя» знаний.',
}

const CODE_INTRO: Record<Lens, string> = {
  feathers: 'Критерии Feathers + characterization test на seam billing-модуля.',
  stack: 'Inventory deps: EOL jQuery vs актуальный React-слой checkout.',
  friction: 'Lead time и ownership в team-критериях — не путать с «не мы писали».',
}

const CODE_SNIPPETS: Record<Lens, InteractiveSnippet[]> = {
  feathers: [
    {
      id: 'criteria-feathers',
      label: 'docs/legacy-criteria.md',
      note: 'Feathers: порог «нет тестов + часто меняем» → backlog страховки.',
      executable: false,
      languageLabel: 'md',
      code: `# ═══════════════════════════════════════════
# FEATHERS ← тесты и страх изменений
# ═══════════════════════════════════════════
## Легаси
- модуль в top-20 по churn
- нет автотестов на публичный seam
→ characterization test, затем refactor

## Не легаси (по этой линзе)
- есть зелёный контур на критичный путь
  даже если файлу 10 лет
`,
    },
    {
      id: 'billing-seam',
      label: 'src/billing/legacyProcessor.js',
      note: 'Seam для теста: `processInvoice` — единственная точка входа наружу.',
      executable: false,
      code: `// ═══════════════════════════════════════════
// BILLING ← revenue-path без тестов
// ═══════════════════════════════════════════
function calcTotal(items) {
  return items.reduce((s, i) => s + i.price * i.qty, 0); // ← tribal logic
}

// ← SEAM: сюда characterization test
export function processInvoice(items) {
  const total = calcTotal(items);
  $('#invoice-total').text(total.toFixed(2)); // ← jQuery side-effect
  return total;
}
`,
    },
  ],
  stack: [
    {
      id: 'deps-audit',
      label: 'package.json (фрагмент)',
      note: 'Stack-линза: EOL deps с CVE vs поддерживаемый React-слой.',
      executable: false,
      languageLabel: 'json',
      code: `{
  "dependencies": {
    "jquery": "1.12.4",
    "react": "^18.3.1"
  },
  "legacyStack": {
    "billing": ["jquery@1.x"],
    "checkout": ["react@18"]
  }
}
`,
    },
    {
      id: 'stack-criteria',
      label: 'docs/legacy-criteria.md',
      note: 'Порог по стеку: CVE без патча > 90 дней в prod → adapter или roadmap.',
      executable: false,
      languageLabel: 'md',
      code: `# ═══════════════════════════════════════════
# STACK ← платформа и deps
# ═══════════════════════════════════════════
## Легаси
- runtime/framework без security-fix
- dep блокирует обновление toolchain

## Действие
- adapter / strangler, не «переписать всё завтра»
`,
    },
  ],
  friction: [
    {
      id: 'criteria-friction',
      label: 'docs/legacy-criteria.md',
      note: 'Трение: lead time и bus factor — отдельно от возраста и «чужого» кода.',
      executable: false,
      languageLabel: 'md',
      code: `# ═══════════════════════════════════════════
# FRICTION ← стоимость изменения
# ═══════════════════════════════════════════
## Легаси
- мелкий фикс > 1 недели end-to-end
- правки только через одного owner

## Не путать
- «не мы писали» без метрик трения — слабый критерий
`,
    },
    {
      id: 'checkout-test',
      label: 'src/checkout/CheckoutForm.test.tsx',
      note: 'Низкое трение часто идёт вместе с тестами — но линзы разные.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { render, screen } from '@testing-library/react';
import { CheckoutForm } from './CheckoutForm';

// ← страховка снижает страх diff (Feathers), не lead time сама по себе
it('submits total from cart', async () => {
  render(<CheckoutForm cart={[{ sku: 'A', qty: 2 }]} />);
  await userEvent.click(screen.getByRole('button', { name: /pay/i }));
  expect(mockPay).toHaveBeenCalledWith({ total: 120 });
});
`,
    },
  ],
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, ...mods.filter(Boolean)].join(' ')
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
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
}

function LensSwitch({ value, onChange }: { value: Lens; onChange: (id: Lens) => void }) {
  return (
    <div className={shell.row}>
      {LENSES.map((l) => (
        <LabButton
          key={l.id}
          variant="ghost"
          size="sm"
          active={value === l.id}
          onClick={() => onChange(l.id)}
        >
          {l.label}
        </LabButton>
      ))}
    </div>
  )
}

function CaseSwitch({ value, onChange }: { value: CaseId; onChange: (id: CaseId) => void }) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

type VizProps = {
  lens: Lens
  caseId: CaseId
  phase: Phase
  verdictRef: MutableRefObject<HTMLDivElement | null>
}

function LegacyViz({ lens, caseId, phase, verdictRef }: VizProps) {
  const mod = MODULE[caseId]
  const activeTraits = LENS_TRAITS[lens]
  const verdict = VERDICT[lens][caseId]
  const lit = phase !== 'idle'
  const traitsLit = phase === 'traits' || phase === 'done'
  const done = phase === 'done'

  const lensLabels: Record<Lens, string> = {
    feathers: 'тесты · страх diff',
    stack: 'EOL · deps · CVE',
    friction: 'lead time · owners',
  }

  return (
    <LabVizPanel
      title="Один модуль — разные линзы"
      meta={`${mod.title} · линза: ${lensLabels[lens]}`}
    >
      <div className={styles.flow}>
        <div className={nodeCls(lit && labVizStyles.nodeActive, styles.moduleCard)}>
          <span className={styles.moduleTitle}>{mod.title}</span>
          <div className={styles.traits}>
            {(Object.keys(mod.traits) as TraitId[]).map((id) => {
              const t = mod.traits[id]
              const relevant = activeTraits.includes(id)
              const on = traitsLit && relevant
              const dim = traitsLit && !relevant
              return (
                <div
                  key={id}
                  className={nodeCls(
                    styles.trait,
                    on && labVizStyles.nodeActive,
                    on && styles.traitOn,
                    dim && styles.traitDim,
                  )}
                >
                  <span className={labVizStyles.nodeLabel}>{t.label}</span>
                  <span className={labVizStyles.nodeSub}>{t.sub}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.lensRow}>
          <span className={styles.arrow} aria-hidden>
            ↓
          </span>
          <div
            className={nodeCls(
              lit && labVizStyles.nodeActive,
              done && (verdict.legacy ? labVizStyles.nodeErr : labVizStyles.nodeOk),
            )}
          >
            <span className={labVizStyles.nodeLabel}>Линза</span>
            <span className={labVizStyles.nodeSub}>{lensLabels[lens]}</span>
          </div>
          <span className={styles.arrow} aria-hidden>
            →
          </span>
          <div
            ref={verdictRef}
            className={nodeCls(
              styles.verdict,
              done && (verdict.legacy ? styles.verdictLegacy : styles.verdictOk),
              done && (verdict.legacy ? labVizStyles.nodeErr : labVizStyles.nodeOk),
            )}
          >
            <span className={labVizStyles.nodeLabel}>
              {done ? (verdict.legacy ? 'легаси' : 'не легаси') : 'вердикт'}
            </span>
            <span className={labVizStyles.nodeSub}>
              {done ? verdict.note : '—'}
            </span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LegacyCodeApproachesLab() {
  const [lens, setLens] = useState<Lens>('feathers')
  const [caseId, setCaseId] = useState<CaseId>('billing')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const verdictRef = useRef<HTMLDivElement | null>(null)
  const { lines, log, clear } = useLabLog()

  const reset = () => {
    tlRef.current?.kill()
    setPhase('idle')
    setHint(null)
    clear()
  }

  const onLensChange = (id: Lens) => {
    setLens(id)
    reset()
  }

  const onCaseChange = (id: CaseId) => {
    setCaseId(id)
    reset()
  }

  const run = () => {
    reset()
    const v = VERDICT[lens][caseId]
    playTimeline(
      tlRef,
      [
        () => setPhase('lens'),
        () => setPhase('traits'),
        () => setPhase('done'),
      ],
      () => {
        setHint(
          v.legacy
            ? `Итог: по линзе «${LENSES.find((l) => l.id === lens)?.label}» — легаси; план — страховка или strangler, не ярлык «удалить».`
            : `Итог: по этой линзе модуль не легаси; другие шкалы (стек, трение) могут дать иной вердикт.`,
        )
        log(v.legacy ? 'warn' : 'ok', v.legacy ? 'legacy · да' : 'legacy · нет')
        log('info', v.note)
      },
    )
  }

  const problem = (
    <div className={shell.panel}>
      <LensSwitch value={lens} onChange={onLensChange} />
      <CaseSwitch value={caseId} onChange={onCaseChange} />

      <div className={shell.row}>
        <LabButton variant="primary" size="sm" onClick={run} disabled={phase !== 'idle' && phase !== 'done'}>
          Запустить
        </LabButton>
        <LabButton variant="ghost" size="sm" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{LENS_PAIN[lens]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <LegacyViz lens={lens} caseId={caseId} phase={phase} verdictRef={verdictRef} />

      {hint ? <p className={shell.note}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <LensSwitch value={lens} onChange={onLensChange} />
      <InteractiveCodePanel
        key={lens}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[lens]}
        snippets={CODE_SNIPPETS[lens]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Подходы к определению легаси кода"
      lead="Три линзы — Feathers, стек, трение — на одном модуле; критерии и seam'ы на вкладке Код."
      problem={problem}
      code={code}
    />
  )
}
