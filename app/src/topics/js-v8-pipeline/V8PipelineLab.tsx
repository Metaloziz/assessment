import { Fragment, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './V8PipelineLab.module.css'

const TOPIC_ID = '112-js-v8-pipeline'
const STEP = 0.65

type Pattern = 'parse' | 'jit' | 'full'
type ParseCase = 'preparse' | 'pipeline'
type JitCase = 'stable' | 'deopt'
type FullCase = 'stable' | 'deopt'
type CaseId = ParseCase | JitCase | FullCase

type ParsePhase = 'idle' | 'load' | 'pre' | 'call' | 'full' | 'tokens' | 'ast' | 'bytecode' | 'done'
type JitPhase = 'idle' | 'ignition' | 'profile' | 'turbofan' | 'deopt' | 'fallback' | 'done'
type FullPhase =
  | 'idle'
  | 'source'
  | 'preparse'
  | 'fullparse'
  | 'tokens'
  | 'ast'
  | 'bytecode'
  | 'ignition'
  | 'profile'
  | 'turbofan'
  | 'deopt'
  | 'fallback'
  | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'parse', label: 'Разбор' },
  { id: 'jit', label: 'JIT' },
  { id: 'full', label: 'Конвейер' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  parse: [
    { id: 'preparse', label: 'Pre-parse' },
    { id: 'pipeline', label: 'Токены → AST' },
  ],
  jit: [
    { id: 'stable', label: 'Стабильный профиль' },
    { id: 'deopt', label: 'Смена типа' },
  ],
  full: [
    { id: 'stable', label: 'До TurboFan' },
    { id: 'deopt', label: 'С deopt' },
  ],
}

const PAIN: ReactNode = (
  <>
    V8 режет исходник на токены, строит AST и байткод, затем гоняет его через Ignition. Горячие
    участки JIT-компилятор TurboFan ускоряет под наблюдаемые типы; если допущение ломается —
    deopt возвращает более общий путь без смены результата.
  </>
)

const CASE_BRIEF: Record<Pattern, Record<string, ReactNode>> = {
  parse: {
    preparse: (
      <>
        Внутренние функции сначала проходят лёгкий <code>pre-parse</code>; полный разбор и байткод —
        перед первым вызовом.
      </>
    ),
    pipeline: (
      <>
        Лексический анализ выдаёт токены, парсер собирает <code>AST</code>, дальше генерация байткода
        для Ignition.
      </>
    ),
  },
  jit: {
    stable: (
      <>
        Длинная серия <code>number + number</code> даёт узкий профиль — TurboFan может удерживать
        оптимизированный код.
      </>
    ),
    deopt: (
      <>
        После «числового» профиля вызов со строками ломает допущение — deopt и более общий путь
        исполнения.
      </>
    ),
  },
  full: {
    stable: (
      <>
        Весь путь <code>add()</code>: исходник → pre/full parse → токены → AST → байткод → Ignition →
        профиль → TurboFan.
      </>
    ),
    deopt: (
      <>
        Тот же конвейер до TurboFan, затем вызов <code>add('1','2')</code> — deopt и снова Ignition.
      </>
    ),
  },
}

const CODE_INTRO: Record<Pattern, string> = {
  parse:
    'Pre-parser экономит загрузку; полный parse строит AST и готовит байткод. AST — синтаксическое дерево, не машинный код.',
  jit: 'Ignition интерпретирует байткод; TurboFan компилирует горячее. Смена типов в hot path — типичный повод для deopt.',
  full: 'Сквозной путь одной функции: от текста в файле до JIT и (при смене типа) deopt. Этапы упрощены, порядок — как в теме.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  parse: [
    {
      id: 'preparse',
      label: 'src/v8/preparse.js',
      note: 'Pre-parse проверяет синтаксис; полный разбор — перед исполнением.',
      executable: false,
      languageLabel: 'js',
      code: `const script = {
  functions: [
    { name: 'boot', parsed: 'full' }, // ← top-level сразу full
    { name: 'rarelyUsed', parsed: 'pre' }, // ← только метаданные
  ],
};

function ensureFullParse(fn) {
  if (fn.parsed === 'pre') {
    fn.parsed = 'full'; // ← AST + байткод перед вызовом
    console.log(fn.name + ': полный разбор');
  }
  return fn;
}

ensureFullParse(script.functions[1]);`,
    },
    {
      id: 'ast',
      label: 'src/v8/astShape.js',
      note: 'AST описывает синтаксис; дальше по нему строят байткод.',
      executable: false,
      languageLabel: 'js',
      code: `// const x = 1 + 2;
// VariableDeclaration (const)
// └── VariableDeclarator
//     ├── Identifier: x
//     └── BinaryExpression (+)
//         ├── Literal: 1
//         └── Literal: 2

const x = 1 + 2; // ← исходник
console.log(x); // ← Ignition исполняет байткод, не AST`,
    },
  ],
  jit: [
    {
      id: 'hot-stable',
      label: 'src/v8/hotAdd.js',
      note: 'Стабильные типы на горячем пути — кандидат для TurboFan.',
      executable: false,
      languageLabel: 'js',
      code: `function add(a, b) {
  return a + b;
}

for (let i = 0; i < 10_000; i++) {
  add(1, 2); // ← узкий числовой профиль
}

console.log(add(1, 2)); // ← TurboFan мог специализировать`,
    },
    {
      id: 'deopt',
      label: 'src/v8/deoptAdd.js',
      note: 'Смена типа после оптимизации — deopt, семантика та же.',
      executable: false,
      languageLabel: 'js',
      code: `function add(a, b) {
  return a + b;
}

for (let i = 0; i < 10_000; i++) add(1, 2);
console.log(add('1', '2')); // ← другой тип → deopt узкого кода

// пороги JIT не хардкодить — смотреть профиль`,
    },
  ],
  full: [
    {
      id: 'full-pipeline',
      label: 'src/v8/fullPipeline.js',
      note: 'Одна функция — весь конвейер V8 от исходника до JIT/deopt.',
      executable: false,
      languageLabel: 'js',
      code: `function add(a, b) {
  return a + b;
}

// ← 1. загрузка: pre-parse (метаданные, без AST)
// ← 2. первый вызов: full parse → токены → AST → байткод
// ← 3. Ignition исполняет байткод

for (let i = 0; i < 10_000; i++) add(1, 2);
// ← 4. профиль: number + number
// ← 5. TurboFan — JIT под узкий сценарий

add('1', '2');
// ← 6. другой тип → deopt → снова Ignition (общий путь)`,
    },
    {
      id: 'full-stages',
      label: 'src/v8/stages.md',
      note: 'Краткая карта этапов — для сверки со схемой на «Проблеме».',
      executable: false,
      languageLabel: 'md',
      code: `# Конвейер function add(a, b)

исходник → pre-parse → full parse (на 1-м вызове)
  → lexer (токены) → parser (AST) → bytecode
  → Ignition (интерпретация + профиль)
  → TurboFan (JIT, если горячо и стабильно)
  → deopt (если тип/форма сломали допущение) → Ignition`,
    },
  ],
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    steps.forEach((s) => s())
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
}

function stageCls(active: boolean, ok = false, warn = false, dim = false) {
  return [
    styles.stageCard,
    active && styles.stageActive,
    ok && styles.stageOk,
    warn && styles.stageWarn,
    dim && styles.stageDim,
  ]
    .filter(Boolean)
    .join(' ')
}

type StageChipProps = {
  label: string
  sub: string
  active?: boolean
  ok?: boolean
  warn?: boolean
  dim?: boolean
}

function StageChip({ label, sub, active = false, ok = false, warn = false, dim = false }: StageChipProps) {
  return (
    <div className={stageCls(active, ok, warn, dim)}>
      <span className={styles.stageLabel}>{label}</span>
      <span className={styles.stageSub}>{sub}</span>
    </div>
  )
}

function StageTrack({
  className,
  stages,
  renderStage,
  arrows = true,
}: {
  className: string
  stages: ReadonlyArray<{ id: string }>
  renderStage: (index: number) => ReactNode
  arrows?: boolean
}) {
  if (!arrows) {
    return (
      <div className={className}>
        {stages.map((s, i) => (
          <div key={s.id} className={styles.trackCell}>
            {renderStage(i)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {stages.map((s, i) => (
        <Fragment key={s.id}>
          {i > 0 ? (
            <span className={styles.trackArrow} aria-hidden>
              →
            </span>
          ) : null}
          <div className={styles.trackCell}>{renderStage(i)}</div>
        </Fragment>
      ))}
    </div>
  )
}

function fnCls(active: boolean, ok = false, dim = false) {
  return [
    styles.fnCard,
    active && styles.fnCardActive,
    ok && styles.fnCardOk,
    dim && styles.fnCardDim,
  ]
    .filter(Boolean)
    .join(' ')
}

const PIPELINE_STAGES = [
  { id: 'tokens', label: 'Токены', sub: 'lexer' },
  { id: 'ast', label: 'AST', sub: 'parse' },
  { id: 'bytecode', label: 'Байткод', sub: 'gen' },
  { id: 'ignition', label: 'Ignition', sub: 'interp' },
] as const

type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id']

function ParseViz({ caseId, phase }: { caseId: ParseCase; phase: ParsePhase }) {
  if (caseId === 'preparse') {
    const meta =
      phase === 'idle'
        ? 'ожидание'
        : phase === 'done'
          ? 'full перед вызовом'
          : phase === 'call' || phase === 'full'
            ? 'первый вызов'
            : 'загрузка скрипта'

    const bootActive = phase === 'load' || phase === 'full' || phase === 'done'
    const rareActive = phase === 'pre' || phase === 'call' || phase === 'full' || phase === 'done'
    const bootOk = phase === 'load' || phase === 'full' || phase === 'done'
    const rareOk = phase === 'full' || phase === 'done'

    return (
      <LabVizPanel title="pre-parse vs full" meta={meta}>
        <div className={styles.fnRow}>
          <div className={fnCls(bootActive, bootOk, phase === 'pre')}>
            <span className={styles.stageLabel}>boot()</span>
            <span className={styles.stageSub}>full parse</span>
            <span className={styles.stageNote}>top-level сразу</span>
          </div>
          <div className={fnCls(rareActive, rareOk, phase === 'idle' || phase === 'load')}>
            <span className={styles.stageLabel}>rarelyUsed()</span>
            <span className={styles.stageSub}>
              {phase === 'full' || phase === 'done' ? 'full parse' : 'pre-parse'}
            </span>
            <span className={styles.stageNote}>
              {phase === 'call' ? 'нужен вызов…' : 'ждёт вызова'}
            </span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const activeStage = (id: PipelineStageId) => {
    const order: ParsePhase[] = ['tokens', 'ast', 'bytecode', 'done']
    const idx = PIPELINE_STAGES.findIndex((s) => s.id === id)
    const cur = order.indexOf(phase)
    if (phase === 'idle') return false
    if (phase === 'done') return true
    if (cur < 0) return false
    return cur >= idx
  }

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? 'готов байткод'
        : phase === 'bytecode'
          ? 'генерация…'
          : 'разбор…'

  return (
    <LabVizPanel title="лексика → AST → байткод" meta={meta}>
      <StageTrack
        className={styles.flow}
        stages={PIPELINE_STAGES}
        renderStage={(i) => {
          const s = PIPELINE_STAGES[i]!
          return (
            <StageChip
              label={s.label}
              sub={s.sub}
              active={phase === s.id}
              ok={activeStage(s.id) && phase === 'done'}
              dim={phase !== 'idle' && !activeStage(s.id) && phase !== s.id}
            />
          )
        }}
      />
    </LabVizPanel>
  )
}

function JitViz({ caseId, phase }: { caseId: JitCase; phase: JitPhase }) {
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? caseId === 'stable'
          ? 'TurboFan держит код'
          : 'deopt → общий путь'
        : phase === 'deopt'
          ? 'допущение сломано'
          : 'профилирование…'

  const ignitionOn = phase !== 'idle'
  const profileOn = phase === 'profile' || phase === 'turbofan' || phase === 'deopt' || phase === 'fallback' || phase === 'done'
  const turboOn = phase === 'turbofan' || (phase === 'done' && caseId === 'stable') || phase === 'deopt' || phase === 'fallback'
  const deoptOn = caseId === 'deopt' && (phase === 'deopt' || phase === 'fallback' || phase === 'done')
  const fallbackOn = caseId === 'deopt' && (phase === 'fallback' || phase === 'done')

  return (
    <LabVizPanel title="Ignition → TurboFan" meta={meta}>
      <StageTrack
        className={styles.flow}
        stages={[
          { id: 'ignition' },
          { id: 'profile' },
          { id: 'turbofan' },
        ]}
        renderStage={(i) => {
          if (i === 0) {
            return (
              <StageChip
                label="Ignition"
                sub="байткод"
                active={phase === 'ignition'}
                ok={ignitionOn && phase === 'done'}
                dim={phase === 'idle'}
              />
            )
          }
          if (i === 1) {
            return (
              <StageChip
                label="Профиль"
                sub="типы"
                active={phase === 'profile'}
                ok={profileOn && phase === 'done'}
                dim={!profileOn}
              />
            )
          }
          return (
            <StageChip
              label="TurboFan"
              sub="JIT"
              active={phase === 'turbofan'}
              ok={turboOn && caseId === 'stable' && phase === 'done'}
              warn={caseId === 'deopt' && deoptOn}
              dim={!turboOn}
            />
          )
        }}
      />
      {caseId === 'deopt' ? (
        <div className={styles.deoptFork}>
          <span className={styles.deoptLead}>↓ смена типа</span>
          <StageTrack
            className={styles.deoptBranches}
            stages={[{ id: 'deopt' }, { id: 'fallback' }]}
            renderStage={(i) =>
              i === 0 ? (
                <StageChip
                  label="Deopt"
                  sub="откат"
                  active={deoptOn}
                  warn={deoptOn}
                  dim={!deoptOn && phase !== 'idle'}
                />
              ) : (
                <StageChip
                  label="Ignition"
                  sub="общий"
                  active={fallbackOn}
                  ok={fallbackOn}
                  dim={!fallbackOn}
                />
              )
            }
          />
        </div>
      ) : null}
    </LabVizPanel>
  )
}

const FULL_PARSE_STAGES: Array<{ id: FullPhase; label: string; sub: string }> = [
  { id: 'source', label: 'Исходник', sub: 'add()' },
  { id: 'preparse', label: 'Pre-parse', sub: 'скелет' },
  { id: 'fullparse', label: 'Full parse', sub: 'вызов' },
  { id: 'tokens', label: 'Токены', sub: 'lexer' },
  { id: 'ast', label: 'AST', sub: 'дерево' },
  { id: 'bytecode', label: 'Байткод', sub: 'gen' },
]

const FULL_RUN_STAGES: Array<{ id: FullPhase; label: string; sub: string }> = [
  { id: 'ignition', label: 'Ignition', sub: 'interp' },
  { id: 'profile', label: 'Профиль', sub: 'типы' },
  { id: 'turbofan', label: 'TurboFan', sub: 'JIT' },
]

const FULL_DEOPT_STAGES: Array<{ id: FullPhase; label: string; sub: string }> = [
  { id: 'deopt', label: 'Deopt', sub: 'тип' },
  { id: 'fallback', label: 'Ignition', sub: 'общий' },
]

const FULL_PHASE_ORDER: FullPhase[] = [
  'source',
  'preparse',
  'fullparse',
  'tokens',
  'ast',
  'bytecode',
  'ignition',
  'profile',
  'turbofan',
  'deopt',
  'fallback',
  'done',
]

function fullPhaseIndex(phase: FullPhase) {
  if (phase === 'idle') return -1
  if (phase === 'done') return FULL_PHASE_ORDER.length
  return FULL_PHASE_ORDER.indexOf(phase)
}

function FullPathViz({ caseId, phase }: { caseId: FullCase; phase: FullPhase }) {
  const cur = fullPhaseIndex(phase)
  const withDeopt = caseId === 'deopt'

  const stageState = (id: FullPhase, warn = false) => {
    const idx = FULL_PHASE_ORDER.indexOf(id)
    const active = phase === id
    const passed = cur > idx
    const dim = cur >= 0 && !active && !passed
    return { active, ok: passed && !warn, warn: active && warn, dim }
  }

  const meta =
    phase === 'idle'
      ? 'ожидание — Запустить или Шаг'
      : phase === 'done'
        ? withDeopt
          ? 'конвейер + deopt'
          : 'конвейер до TurboFan'
        : `шаг ${Math.max(1, cur + 1)}`

  const renderFullStage = (s: { id: FullPhase; label: string; sub: string }, warn = false) => {
    const st = stageState(s.id, warn)
    return (
      <StageChip
        label={s.label}
        sub={s.sub}
        active={st.active}
        ok={st.ok}
        warn={st.warn}
        dim={st.dim}
      />
    )
  }

  return (
    <LabVizPanel title="function add — весь путь" meta={meta}>
      <span className={styles.fullFnChip}>function add(a, b) {'{ … }'}</span>
      <div className={styles.fullSection}>
        <span className={styles.fullRowLabel}>Разбор</span>
        <StageTrack
          className={styles.fullTrackParse}
          stages={FULL_PARSE_STAGES}
          arrows={false}
          renderStage={(i) => renderFullStage(FULL_PARSE_STAGES[i]!)}
        />
      </div>
      <div className={styles.fullSection}>
        <span className={styles.fullRowLabel}>Исполнение</span>
        <StageTrack
          className={styles.fullTrackRun}
          stages={FULL_RUN_STAGES}
          arrows={false}
          renderStage={(i) => renderFullStage(FULL_RUN_STAGES[i]!)}
        />
      </div>
      {withDeopt ? (
        <div className={styles.fullSection}>
          <span className={styles.fullRowLabel}>Смена типа</span>
          <div className={styles.fullDeoptRow}>
            <span className={styles.fullDeoptLead}>после TurboFan — другой тип аргумента</span>
            <StageTrack
              className={styles.fullDeoptTrack}
              stages={FULL_DEOPT_STAGES}
              renderStage={(i) => renderFullStage(FULL_DEOPT_STAGES[i]!, i === 0)}
            />
          </div>
        </div>
      ) : null}
    </LabVizPanel>
  )
}

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) {
  return (
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
}

function ProblemPanel() {
  const [pattern, setPattern] = useState<Pattern>('full')
  const [caseId, setCaseId] = useState<CaseId>('stable')
  const [parsePhase, setParsePhase] = useState<ParsePhase>('idle')
  const [jitPhase, setJitPhase] = useState<JitPhase>('idle')
  const [fullPhase, setFullPhase] = useState<FullPhase>('idle')
  const [fullStepIdx, setFullStepIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const cases = CASES[pattern]

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setParsePhase('idle')
    setJitPhase('idle')
    setFullPhase('idle')
    setFullStepIdx(0)
    setFinished(false)
    setRunning(false)
  }

  const onPattern = (id: Pattern) => {
    if (running) return
    setPattern(id)
    setCaseId(CASES[id][0]!.id)
    clear()
    resetVisual()
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  type FullStep = { phase: FullPhase; run: () => void }

  const buildFullSteps = (variant: FullCase): FullStep[] => {
    const base: FullStep[] = [
      {
        phase: 'source',
        run: () => {
          setFullPhase('source')
          log('info', 'script.js: function add(a, b) { … }')
        },
      },
      {
        phase: 'preparse',
        run: () => {
          setFullPhase('preparse')
          log('info', 'pre-parse — синтаксис ок, AST пока нет')
        },
      },
      {
        phase: 'fullparse',
        run: () => {
          setFullPhase('fullparse')
          log('info', 'первый вызов add() — нужен full parse')
        },
      },
      {
        phase: 'tokens',
        run: () => {
          setFullPhase('tokens')
          log('info', 'lexer: function, (, ), return, + …')
        },
      },
      {
        phase: 'ast',
        run: () => {
          setFullPhase('ast')
          log('ok', 'AST: FunctionDeclaration → ReturnStatement')
        },
      },
      {
        phase: 'bytecode',
        run: () => {
          setFullPhase('bytecode')
          log('info', 'байткод для Ignition готов')
        },
      },
      {
        phase: 'ignition',
        run: () => {
          setFullPhase('ignition')
          log('info', 'Ignition — первые вызовы add(1, 2)')
        },
      },
      {
        phase: 'profile',
        run: () => {
          setFullPhase('profile')
          log('info', '10 000× add(1, 2) — узкий профиль')
        },
      },
      {
        phase: 'turbofan',
        run: () => {
          setFullPhase('turbofan')
          log('ok', 'TurboFan — машинный код под number+number')
        },
      },
    ]

    if (variant === 'deopt') {
      return [
        ...base,
        {
          phase: 'deopt',
          run: () => {
            setFullPhase('deopt')
            log('warn', "add('1', '2') — тип аргументов другой")
          },
        },
        {
          phase: 'fallback',
          run: () => {
            setFullPhase('fallback')
            log('err', 'deopt → снова Ignition, общий путь')
          },
        },
        {
          phase: 'done',
          run: () => {
            setFullPhase('done')
            log('ok', 'результат верный, оптимизация сброшена')
          },
        },
      ]
    }

    return [
      ...base,
      {
        phase: 'done',
        run: () => {
          setFullPhase('done')
          log('ok', 'горячий add() остаётся на TurboFan')
        },
      },
    ]
  }

  const runFullSteps = (fromIdx: number, oneStep: boolean) => {
    const steps = buildFullSteps(caseId as FullCase)
    if (fromIdx >= steps.length) return

    if (oneStep) {
      const step = steps[fromIdx]!
      step.run()
      const next = fromIdx + 1
      setFullStepIdx(next)
      if (next >= steps.length) setFinished(true)
      return
    }

    setRunning(true)
    setFinished(false)
    if (fromIdx === 0) clear()

    playTimeline(
      tlRef,
      steps.slice(fromIdx).map((step) => step.run),
      () => {
        setFullPhase('done')
        setFullStepIdx(steps.length)
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runPreparse = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'загрузка script.js')

    playTimeline(
      tlRef,
      [
        () => {
          setParsePhase('load')
          log('ok', 'boot() — full parse сразу')
        },
        () => {
          setParsePhase('pre')
          log('info', 'rarelyUsed() — pre-parse, без AST')
        },
        () => {
          setParsePhase('call')
          log('info', 'первый вызов rarelyUsed()')
        },
        () => {
          setParsePhase('full')
          log('ok', 'полный разбор → байткод')
        },
        () => {
          setParsePhase('done')
          log('ok', 'теперь можно исполнять')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runPipeline = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'const x = 1 + 2')

    playTimeline(
      tlRef,
      [
        () => {
          setParsePhase('tokens')
          log('info', 'lexer: function, const, +, …')
        },
        () => {
          setParsePhase('ast')
          log('ok', 'AST: VariableDeclaration → BinaryExpression')
        },
        () => {
          setParsePhase('bytecode')
          log('info', 'генерация байткода для Ignition')
        },
        () => {
          setParsePhase('done')
          log('ok', 'AST не исполняется — только байткод')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runStable = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'горячий цикл add(1, 2)')

    let acc = 0
    for (let i = 0; i < 5000; i++) acc = acc + 1

    playTimeline(
      tlRef,
      [
        () => {
          setJitPhase('ignition')
          log('info', 'Ignition — быстрый старт')
        },
        () => {
          setJitPhase('profile')
          log('info', 'сбор профиля: number + number')
        },
        () => {
          setJitPhase('turbofan')
          log('ok', 'TurboFan — узкая специализация')
        },
        () => {
          setJitPhase('done')
          log('ok', `acc=${acc}; оптимизация удерживается`)
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runDeopt = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', '10k× add(1, 2) — числовой профиль')

    playTimeline(
      tlRef,
      [
        () => {
          setJitPhase('ignition')
          log('info', 'Ignition')
        },
        () => {
          setJitPhase('profile')
          log('info', 'профиль: number + number')
        },
        () => {
          setJitPhase('turbofan')
          log('ok', 'TurboFan под числа')
        },
        () => {
          setJitPhase('deopt')
          log('warn', "add('1', '2') — другой тип")
        },
        () => {
          setJitPhase('fallback')
          log('err', 'deopt → общий путь Ignition')
        },
        () => {
          setJitPhase('done')
          log('ok', 'результат верный, оптимизация сброшена')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const onRun = () => {
    if (running) return
    if (pattern === 'full') {
      resetVisual()
      runFullSteps(0, false)
      return
    }
    resetVisual()
    if (pattern === 'parse') {
      if (caseId === 'preparse') runPreparse()
      else runPipeline()
    } else if (caseId === 'stable') {
      runStable()
    } else {
      runDeopt()
    }
  }

  const onStep = () => {
    if (running || pattern !== 'full') return
    const steps = buildFullSteps(caseId as FullCase)
    if (fullStepIdx >= steps.length) return
    if (fullStepIdx === 0) clear()
    runFullSteps(fullStepIdx, true)
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    pattern === 'full'
      ? caseId === 'stable'
        ? 'Итог: одна функция проходит разбор, интерпретацию и JIT; на стабильном профиле TurboFan удерживает код.'
        : 'Итог: после полного конвейера смена типа сбрасывает оптимизацию — deopt и снова Ignition.'
      : pattern === 'parse'
        ? caseId === 'preparse'
          ? 'Итог: pre-parse ускоряет загрузку; полный разбор — только когда функцию реально вызывают.'
          : 'Итог: токены и AST — этапы разбора; исполняет байткод Ignition, не дерево.'
        : caseId === 'stable'
          ? 'Итог: стабильные типы на горячем пути помогают TurboFan; пороги JIT смотрите в профиле.'
          : 'Итог: deopt — штатный откат оптимизации; семантика JS сохраняется.'

  const brief = CASE_BRIEF[pattern][caseId]

  return (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={running} onChange={onPattern} />
      <div className={shell.row}>
        {cases.map((c) => (
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
        {pattern === 'full' ? (
          <LabButton
            variant="secondary"
            size="sm"
            disabled={running || fullStepIdx >= buildFullSteps(caseId as FullCase).length}
            onClick={onStep}
          >
            Шаг
          </LabButton>
        ) : null}
        <LabButton variant="secondary" size="sm" disabled={running} onClick={onReset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      {brief ? <p className={shell.hint}>{brief}</p> : null}

      {pattern === 'parse' ? (
        <ParseViz caseId={caseId as ParseCase} phase={parsePhase} />
      ) : pattern === 'jit' ? (
        <JitViz caseId={caseId as JitCase} phase={jitPhase} />
      ) : (
        <FullPathViz caseId={caseId as FullCase} phase={fullPhase} />
      )}

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [pattern, setPattern] = useState<Pattern>('full')

  return (
    <div className={shell.codePane}>
      <PatternSwitch value={pattern} onChange={setPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )
}

export function V8PipelineLab() {
  return (
    <JsLabShell
      title="От исходника до TurboFan — и deopt"
      lead="Режим «Конвейер» проходит все этапы function add(): разбор, байткод, Ignition, JIT; кейс «С deopt» добавляет откат при смене типа."
      problem={<ProblemPanel />}
      code={<CodePanel />}
    />
  )
}
