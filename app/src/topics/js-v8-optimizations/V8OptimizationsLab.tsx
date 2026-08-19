import { Fragment, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './V8OptimizationsLab.module.css'

const TOPIC_ID = '116-js-v8-optimizations'
const STEP = 0.62

type Pattern = 'shapes' | 'args' | 'global'
type ShapeCase = 'stable' | 'mixed'
type ArgsCase = 'mono' | 'mixed'
type GlobalCase = 'module' | 'loop'
type CaseId = ShapeCase | ArgsCase | GlobalCase

type ShapePhase = 'idle' | 'build' | 'ic' | 'fork' | 'done'
type ArgsPhase = 'idle' | 'call' | 'profile' | 'turbofan' | 'deopt' | 'fallback' | 'done'
type GlobalPhase = 'idle' | 'declare' | 'use' | 'spawn' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'shapes', label: 'Скрытые классы' },
  { id: 'args', label: 'Типы аргументов' },
  { id: 'global', label: 'Глобальные сущности' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  shapes: [
    { id: 'stable', label: 'Одна форма' },
    { id: 'mixed', label: 'Разные формы' },
  ],
  args: [
    { id: 'mono', label: 'Числа' },
    { id: 'mixed', label: 'Смена типа' },
  ],
  global: [
    { id: 'module', label: 'Уровень модуля' },
    { id: 'loop', label: 'В цикле' },
  ],
}

const PAIN: ReactNode = (
  <>
    V8 ускоряет горячий код, когда объекты собраны в одну внутреннюю форму, аргументы приходят с
    предсказуемыми типами, а функции и конструкторы не пересоздаются на каждой итерации. Сначала
    профиль — потом точечная правка.
  </>
)

const CASE_BRIEF: Record<Pattern, Record<string, ReactNode>> = {
  shapes: {
    stable: (
      <>
        Все объекты <code>{'{ x, y }'}</code> в одном порядке полей — inline cache на{' '}
        <code>sumXY</code> остаётся monomorphic.
      </>
    ),
    mixed: (
      <>
        То поле <code>y</code>, то <code>label</code> — разные shapes на одном call site, кэш
        раздувается.
      </>
    ),
  },
  args: {
    mono: (
      <>
        Длинная серия <code>add(1, 2)</code> даёт узкий профиль «число + число» — TurboFan держит
        специализацию.
      </>
    ),
    mixed: (
      <>
        После числового профиля вызов <code>add('1', '2')</code> ломает допущение — deopt и общий
        путь.
      </>
    ),
  },
  global: {
    module: (
      <>
        <code>Point</code> и <code>sumXY</code> объявлены один раз на уровне модуля — один профиль на
        горячий цикл.
      </>
    ),
    loop: (
      <>
        <code>function sumXY</code> создаётся заново внутри <code>for</code> — каждый проход новая
        функция, профиль не копится.
      </>
    ),
  },
}

const CODE_INTRO: Record<Pattern, string> = {
  shapes:
    'Скрытые классы: один порядок полей → одна shape; inline cache на `obj.x` быстрее при monomorphic.',
  args: 'Профиль аргументов на call site: стабильные `number` помогают TurboFan; смена типа — deopt.',
  global:
    'Горячие конструкторы и функции — на уровне модуля, не `function …` внутри цикла на каждый проход.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  shapes: [
    {
      id: 'stable-shape',
      label: 'models/point.js',
      note: 'Конструктор задаёт поля в одном порядке — все экземпляры делят shape.',
      code: `function Point(x, y) {
  this.x = x; // ← SHAPE: порядок полей фиксирован
  this.y = y;
}

function sumXY(p) {
  return p.x + p.y; // ← IC: один call site, одна форма
}

let acc = 0;
for (let i = 0; i < 5000; i++) {
  acc += sumXY(new Point(i, i + 1));
}
console.log('stable', acc);`,
    },
    {
      id: 'mixed-shape',
      label: 'hot-path/mixed.js',
      note: 'Разные наборы ключей → разные shapes; IC становится polymorphic.',
      code: `function sumX(p) {
  return p.x + (p.y || 0) + (p.label ? 1 : 0);
}

let acc = 0;
for (let i = 0; i < 5000; i++) {
  const p = { x: i };
  if (i % 2) p.y = 1; // ← SHAPE A
  else p.label = 'n'; // ← SHAPE B — другая форма
  acc += sumX(p);
}
console.log('mixed', acc);`,
    },
  ],
  args: [
    {
      id: 'mono-args',
      label: 'math/add.js',
      note: 'Горячий цикл с числами — узкий профиль типов на call site.',
      code: `function add(a, b) {
  return a + b;
}

let acc = 0;
for (let i = 0; i < 10_000; i++) {
  acc = add(acc, 1); // ← ARGS: number + number
}
console.log('mono profile', acc);`,
    },
    {
      id: 'mixed-args',
      label: 'math/add-deopt.js',
      note: 'После числового профиля строка ломает допущение TurboFan.',
      code: `function add(a, b) {
  return a + b;
}

for (let i = 0; i < 10_000; i++) add(1, 2);
const r = add('1', '2'); // ← ARGS: смена типа → deopt
console.log('after deopt', r);`,
    },
  ],
  global: [
    {
      id: 'module-entities',
      label: 'models/point-module.js',
      note: 'Сущности объявлены один раз — профиль и IC копятся на одной функции.',
      code: `// GLOBAL ← один раз на модуль
function Point(x, y) {
  this.x = x;
  this.y = y;
}

function sumXY(p) {
  return p.x + p.y;
}

export { Point, sumXY };

// import { Point, sumXY } from './point-module.js'
// for (…) acc += sumXY(new Point(i, i + 1));`,
      executable: false,
    },
    {
      id: 'loop-entities',
      label: 'hot-path/loop-factory.js',
      note: 'Новая функция на каждой итерации — оптимизация не «прилипает».',
      code: `let acc = 0;
for (let i = 0; i < 5000; i++) {
  function sumXY(p) {
    return p.x + p.y;
  } // ← GLOBAL: новая функция каждый проход
  acc += sumXY({ x: i, y: i + 1 });
}
console.log('loop fn', acc);`,
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
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.58, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function StageChip({
  label,
  sub,
  active,
  ok,
  warn,
  dim,
}: {
  label: string
  sub?: string
  active?: boolean
  ok?: boolean
  warn?: boolean
  dim?: boolean
}) {
  return (
    <div
      className={[
        styles.stageCard,
        active ? styles.stageActive : '',
        ok ? styles.stageOk : '',
        warn ? styles.stageWarn : '',
        dim ? styles.stageDim : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.stageLabel}>{label}</span>
      {sub ? <span className={styles.stageSub}>{sub}</span> : null}
    </div>
  )
}

function StageTrack({
  stages,
  renderStage,
  arrows = true,
  className,
}: {
  stages: Array<{ id: string }>
  renderStage: (index: number) => ReactNode
  arrows?: boolean
  className?: string
}) {
  return (
    <div className={[styles.trackFlex, className].filter(Boolean).join(' ')}>
      {stages.map((s, i) => (
        <Fragment key={s.id}>
          {i > 0 && arrows ? <span className={styles.trackArrow} aria-hidden>→</span> : null}
          <div className={styles.trackCell}>{renderStage(i)}</div>
        </Fragment>
      ))}
    </div>
  )
}

function ShapesViz({ caseId, phase }: { caseId: ShapeCase; phase: ShapePhase }) {
  const stable = caseId === 'stable'
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? stable
          ? 'IC monomorphic'
          : 'IC polymorphic'
        : 'сборка объектов…'

  const buildOn = phase !== 'idle'
  const icOn = phase === 'ic' || phase === 'fork' || phase === 'done'
  const forkOn = !stable && (phase === 'fork' || phase === 'done')

  return (
    <LabVizPanel title="obj.x → inline cache" meta={meta}>
      <div className={styles.shapeRow}>
        <div
          className={[
            styles.shapeCard,
            buildOn ? styles.shapeActive : '',
            phase === 'done' && stable ? styles.shapeOk : '',
            phase === 'done' && !stable ? styles.shapeWarn : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.shapeTitle}>объекты в цикле</span>
          <span className={styles.shapeFields}>
            {stable ? '{ x, y } × N' : 'то { x, y }, то { x, label }'}
          </span>
        </div>
        <div
          className={[
            styles.shapeCard,
            icOn ? styles.shapeActive : styles.shapeDim,
            phase === 'done' && stable ? styles.shapeOk : '',
            phase === 'done' && !stable ? styles.shapeWarn : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.shapeTitle}>IC на sumXY</span>
          <span className={styles.shapeFields}>
            {stable ? 'одна shape' : 'несколько shapes'}
          </span>
        </div>
      </div>
      {forkOn ? (
        <div className={styles.icFork}>
          <span className={styles.icLead}>↓ разные формы</span>
          <div className={styles.icBranches}>
            <StageChip label="shape A" sub="x, y" ok={phase === 'done'} dim={phase !== 'done'} />
            <StageChip label="shape B" sub="x, label" warn={phase === 'done'} dim={phase !== 'done'} />
          </div>
        </div>
      ) : null}
    </LabVizPanel>
  )
}

function ArgsViz({ caseId, phase }: { caseId: ArgsCase; phase: ArgsPhase }) {
  const withDeopt = caseId === 'mixed'
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? withDeopt
          ? 'deopt → общий путь'
          : 'TurboFan держит код'
        : 'профиль аргументов…'

  const callOn = phase !== 'idle'
  const profileOn =
    phase === 'profile' || phase === 'turbofan' || phase === 'deopt' || phase === 'fallback' || phase === 'done'
  const turboOn =
    phase === 'turbofan' || (phase === 'done' && !withDeopt) || phase === 'deopt' || phase === 'fallback'
  const deoptOn = withDeopt && (phase === 'deopt' || phase === 'fallback' || phase === 'done')
  const fallbackOn = withDeopt && (phase === 'fallback' || phase === 'done')

  return (
    <LabVizPanel title="add(a, b) — типы на call site" meta={meta}>
      <StageTrack
        className={styles.flow}
        stages={[{ id: 'call' }, { id: 'profile' }, { id: 'turbofan' }]}
        renderStage={(i) => {
          if (i === 0) {
            return (
              <StageChip
                label="Вызов"
                sub="call site"
                active={phase === 'call'}
                ok={callOn && phase === 'done'}
                dim={phase === 'idle'}
              />
            )
          }
          if (i === 1) {
            return (
              <StageChip
                label="Профиль"
                sub="number"
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
              ok={turboOn && !withDeopt && phase === 'done'}
              warn={withDeopt && deoptOn}
              dim={!turboOn}
            />
          )
        }}
      />
      {withDeopt ? (
        <div className={styles.deoptFork}>
          <span className={styles.deoptLead}>↓ add('1', '2')</span>
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

function GlobalViz({ caseId, phase }: { caseId: GlobalCase; phase: GlobalPhase }) {
  const moduleLevel = caseId === 'module'
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? moduleLevel
          ? 'одна функция на модуль'
          : 'новая функция каждый проход'
        : moduleLevel
          ? 'объявление…'
          : 'цикл…'

  const declareOn = phase !== 'idle'
  const useOn = phase === 'use' || phase === 'spawn' || phase === 'done'
  const spawnOn = !moduleLevel && (phase === 'spawn' || phase === 'done')

  return (
    <LabVizPanel title="где живёт sumXY" meta={meta}>
      <div className={styles.scopeRow}>
        {moduleLevel ? (
          <div
            className={[
              styles.scopeBox,
              declareOn ? styles.scopeActive : '',
              phase === 'done' ? styles.scopeOk : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.scopeTitle}>модуль models/point.js</span>
            <span className={styles.scopeChip}>function Point</span>
            <span className={styles.scopeChip}>function sumXY</span>
            <span className={styles.scopeChip} style={{ opacity: useOn ? 1 : 0.45 }}>
              for → new Point → sumXY
            </span>
          </div>
        ) : (
          <>
            <div
              className={[
                styles.scopeBox,
                declareOn ? styles.scopeActive : styles.scopeDim,
                phase === 'done' ? styles.scopeWarn : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.scopeTitle}>for (i … n)</span>
              <div className={styles.loopGrid}>
                {spawnOn
                  ? ['fn#0', 'fn#1', 'fn#2', '…'].map((label) => (
                      <span key={label} className={styles.loopChip}>
                        {label}
                      </span>
                    ))
                  : (
                    <span className={styles.loopChip}>function sumXY</span>
                  )}
              </div>
            </div>
            <div
              className={[
                styles.scopeBox,
                useOn ? styles.scopeActive : styles.scopeDim,
                phase === 'done' ? styles.scopeWarn : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.scopeTitle}>профиль IC</span>
              <span className={styles.scopeChip}>не копится на одной fn</span>
            </div>
          </>
        )}
      </div>
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
  const [pattern, setPattern] = useState<Pattern>('shapes')
  const [caseId, setCaseId] = useState<CaseId>('stable')
  const [shapePhase, setShapePhase] = useState<ShapePhase>('idle')
  const [argsPhase, setArgsPhase] = useState<ArgsPhase>('idle')
  const [globalPhase, setGlobalPhase] = useState<GlobalPhase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const cases = CASES[pattern]

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setShapePhase('idle')
    setArgsPhase('idle')
    setGlobalPhase('idle')
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

  const runStableShapes = () => {
    setRunning(true)
    setFinished(false)
    clear()
    let acc = 0
    for (let i = 0; i < 5000; i++) acc += (i + (i + 1))

    playTimeline(
      tlRef,
      [
        () => {
          setShapePhase('build')
          log('info', '5000× Point { x, y } — один порядок полей')
        },
        () => {
          setShapePhase('ic')
          log('info', 'sumXY(p) — IC запоминает смещение x, y')
        },
        () => {
          setShapePhase('done')
          log('ok', `acc=${acc}; IC monomorphic`)
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runMixedShapes = () => {
    setRunning(true)
    setFinished(false)
    clear()

    playTimeline(
      tlRef,
      [
        () => {
          setShapePhase('build')
          log('info', 'чётные: { x, label }; нечётные: { x, y }')
        },
        () => {
          setShapePhase('ic')
          log('warn', 'sumX(p) — несколько shapes на одном call site')
        },
        () => {
          setShapePhase('fork')
          log('warn', 'IC polymorphic — проверок больше')
        },
        () => {
          setShapePhase('done')
          log('err', 'формы пляшут — кэш раздувается')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runMonoArgs = () => {
    setRunning(true)
    setFinished(false)
    clear()
    let acc = 0
    for (let i = 0; i < 5000; i++) acc = acc + 1

    playTimeline(
      tlRef,
      [
        () => {
          setArgsPhase('call')
          log('info', 'add(acc, 1) — горячий call site')
        },
        () => {
          setArgsPhase('profile')
          log('info', 'профиль: number + number')
        },
        () => {
          setArgsPhase('turbofan')
          log('ok', 'TurboFan — узкая специализация')
        },
        () => {
          setArgsPhase('done')
          log('ok', `acc=${acc}; оптимизация удерживается`)
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runMixedArgs = () => {
    setRunning(true)
    setFinished(false)
    clear()

    playTimeline(
      tlRef,
      [
        () => {
          setArgsPhase('call')
          log('info', '10k× add(1, 2)')
        },
        () => {
          setArgsPhase('profile')
          log('info', 'профиль: number + number')
        },
        () => {
          setArgsPhase('turbofan')
          log('ok', 'TurboFan под числа')
        },
        () => {
          setArgsPhase('deopt')
          log('warn', "add('1', '2') — другой тип аргументов")
        },
        () => {
          setArgsPhase('fallback')
          log('err', 'deopt → Ignition, общий путь')
        },
        () => {
          setArgsPhase('done')
          log('ok', 'результат верный, оптимизация сброшена')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runModuleGlobal = () => {
    setRunning(true)
    setFinished(false)
    clear()
    let acc = 0
    for (let i = 0; i < 5000; i++) acc += i + (i + 1)

    playTimeline(
      tlRef,
      [
        () => {
          setGlobalPhase('declare')
          log('info', 'models/point.js — Point и sumXY один раз')
        },
        () => {
          setGlobalPhase('use')
          log('info', 'import → цикл вызывает ту же sumXY')
        },
        () => {
          setGlobalPhase('done')
          log('ok', `acc=${acc}; профиль копится на одной функции`)
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runLoopGlobal = () => {
    setRunning(true)
    setFinished(false)
    clear()

    playTimeline(
      tlRef,
      [
        () => {
          setGlobalPhase('declare')
          log('info', 'for (i … 5000) { function sumXY … }')
        },
        () => {
          setGlobalPhase('spawn')
          log('warn', 'каждый проход — новая функция в рантайме')
        },
        () => {
          setGlobalPhase('done')
          log('err', 'IC и профиль не «приклеиваются» как у модуля')
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
    resetVisual()
    if (pattern === 'shapes') {
      if (caseId === 'stable') runStableShapes()
      else runMixedShapes()
    } else if (pattern === 'args') {
      if (caseId === 'mono') runMonoArgs()
      else runMixedArgs()
    } else if (caseId === 'module') {
      runModuleGlobal()
    } else {
      runLoopGlobal()
    }
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    pattern === 'shapes'
      ? caseId === 'stable'
        ? 'Итог: одинаковый порядок полей — одна shape, IC на горячем доступе остаётся monomorphic.'
        : 'Итог: разные наборы ключей на одном call site раздувают inline cache.'
      : pattern === 'args'
        ? caseId === 'mono'
          ? 'Итог: стабильные типы аргументов помогают TurboFan; пороги смотрите в профиле.'
          : 'Итог: deopt — штатный откат при смене типа; семантика JS сохраняется.'
        : caseId === 'module'
          ? 'Итог: конструктор и обработчик на уровне модуля — один профиль на hot path.'
          : 'Итог: функция внутри цикла пересоздаётся — оптимизация не успевает закрепиться.'

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
        <LabButton variant="secondary" size="sm" disabled={running} onClick={onReset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      {brief ? <p className={shell.hint}>{brief}</p> : null}

      {pattern === 'shapes' ? (
        <ShapesViz caseId={caseId as ShapeCase} phase={shapePhase} />
      ) : pattern === 'args' ? (
        <ArgsViz caseId={caseId as ArgsCase} phase={argsPhase} />
      ) : (
        <GlobalViz caseId={caseId as GlobalCase} phase={globalPhase} />
      )}

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [pattern, setPattern] = useState<Pattern>('shapes')

  return (
    <div className={shell.codePane}>
      <PatternSwitch value={pattern} onChange={setPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
        fillAvailable={false}
      />
    </div>
  )
}

export function V8OptimizationsLab() {
  return (
    <JsLabShell
      title="Shapes, типы аргументов и модульные сущности"
      lead="Три механизма V8 на hot path: одинаковые формы объектов, стабильные типы аргументов и функции, объявленные один раз на уровне модуля."
      problem={<ProblemPanel />}
      code={<CodePanel />}
      fill={false}
    />
  )
}
