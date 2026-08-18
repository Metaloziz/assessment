import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './LexicalEnvironmentLab.module.css'

const TOPIC_ID = '93-js-lexical-environment'
const STEP = 0.65

type Pattern = 'counter' | 'loop'
type CounterCase = 'separate' | 'shared'
type LoopCase = 'var' | 'let'
type CaseId = CounterCase | LoopCase

type CounterPhase = 'idle' | 'env1' | 'call1' | 'call2' | 'env2' | 'call3' | 'done'
type LoopPhase = 'idle' | 'loop' | 'iter' | 'fire' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'counter', label: 'Счётчик' },
  { id: 'loop', label: 'Цикл' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  counter: [
    { id: 'separate', label: 'Два окружения' },
    { id: 'shared', label: 'Один count' },
  ],
  loop: [
    { id: 'var', label: 'var в цикле' },
    { id: 'let', label: 'let в цикле' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  counter: (
    <>
      У каждого вызова функции своё лексическое окружение — «словарь» имён и ссылка наружу.
      Замыкание держит <code>count</code> живым, пока жива возвращённая функция.
    </>
  ),
  loop: (
    <>
      В цикле <code>var</code> делит одно окружение на все итерации, а <code>let</code> создаёт
      своё на каждый проход — отсюда разные числа в отложенных колбэках.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  separate: (
    <>
      Два вызова <code>makeCounter()</code> — два независимых <code>count</code>; второй счётчик
      снова начинает с 1.
    </>
  ),
  shared: (
    <>
      Один общий <code>count</code> на двух «счётчиках» — оба крутят одно и то же число.
    </>
  ),
  var: (
    <>
      Три <code>setTimeout</code> после цикла с <code>var</code> — все увидят финальный{' '}
      <code>i = 3</code>.
    </>
  ),
  let: (
    <>
      С <code>let</code> у каждой итерации своё окружение — колбэки печатают{' '}
      <code>0, 1, 2</code>.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  counter: 'Каждый вызов `makeCounter()` создаёт своё окружение с `count`; замыкание держит ссылку.',
  loop: '`var` — одно окружение на цикл; `let` — отдельное на каждую итерацию.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  counter: [
    {
      id: 'make-counter',
      label: 'src/counter/makeCounter.js',
      note: 'Вызов фабрики — новое окружение; возвращённая функция помнит свой `count`.',
      executable: false,
      languageLabel: 'js',
      code: `function makeCounter() {
  let count = 0; // ← окружение вызова makeCounter
  return () => ++count; // ← замыкание на count
}

const first = makeCounter();
const second = makeCounter();

first(); // 1
first(); // 2
second(); // 1 — свой count, не 3`,
    },
    {
      id: 'shared-trap',
      label: 'src/counter/sharedTrap.js',
      note: 'Один `count` на двоих — оба bump меняют одну переменную.',
      executable: false,
      languageLabel: 'js',
      code: `let count = 0; // ← одно окружение на модуль

const bumpA = () => ++count;
const bumpB = () => ++count;

bumpA(); // 1
bumpB(); // 2 — тот же count`,
    },
  ],
  loop: [
    {
      id: 'loop-var',
      label: 'src/loop/varTimeouts.js',
      note: '`var i` одно на весь цикл — колбэки читают финальное значение.',
      executable: false,
      languageLabel: 'js',
      code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// ← одно окружение: 3, 3, 3`,
    },
    {
      id: 'loop-let',
      label: 'src/loop/letTimeouts.js',
      note: 'На каждую итерацию своё окружение с `i`.',
      executable: false,
      languageLabel: 'js',
      code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// ← три окружения: 0, 1, 2`,
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
    defaults: { duration: STEP, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function envCls(active: boolean, ok = false, err = false, dim = false) {
  return [
    styles.envCard,
    active && styles.envCardActive,
    ok && styles.envCardOk,
    err && styles.envCardErr,
    dim && styles.envCardDim,
  ]
    .filter(Boolean)
    .join(' ')
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

type CounterVizProps = {
  caseId: CounterCase
  phase: CounterPhase
}

function CounterViz({ caseId, phase }: CounterVizProps) {
  const separate = caseId === 'separate'
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : separate
        ? phase === 'done'
          ? 'два count'
          : 'фабрика'
        : phase === 'done'
          ? 'один count'
          : 'общая переменная'

  if (separate) {
    const env1On = phase === 'env1' || phase === 'call1' || phase === 'call2' || phase === 'env2' || phase === 'call3' || phase === 'done'
    const env2On = phase === 'env2' || phase === 'call3' || phase === 'done'
    const count1 =
      phase === 'call1' ? 1 : phase === 'call2' || phase === 'env2' || phase === 'call3' || phase === 'done' ? 2 : 0
    const count2 = phase === 'call3' || phase === 'done' ? 1 : 0

    return (
      <LabVizPanel title="окружения счётчика" meta={meta}>
        <div className={styles.envScene}>
          <div className={envCls(false, false, false, phase !== 'idle')}>
            <span className={styles.envTitle}>глобальное</span>
            <span className={styles.envVar}>makeCounter</span>
          </div>
          <span className={styles.envLink}>↑ наружу</span>
          <div className={styles.envRow}>
            <div
              className={envCls(
                phase === 'env1' || phase === 'call1' || phase === 'call2',
                phase === 'call2' || phase === 'done',
                false,
                !env1On,
              )}
            >
              <span className={styles.envTitle}>вызов #1</span>
              <span className={styles.envVar}>count = {count1}</span>
              <span className={labVizStyles.nodeSub}>замыкание first</span>
            </div>
            <div
              className={envCls(
                phase === 'env2' || phase === 'call3',
                phase === 'done',
                false,
                !env2On,
              )}
            >
              <span className={styles.envTitle}>вызов #2</span>
              <span className={styles.envVar}>count = {count2}</span>
              <span className={labVizStyles.nodeSub}>замыкание second</span>
            </div>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const count =
    phase === 'call1' || phase === 'env1'
      ? 1
      : phase === 'call2' || phase === 'done'
        ? 2
        : 0

  return (
    <LabVizPanel title="общий count" meta={meta}>
      <div className={styles.envScene}>
        <div className={envCls(phase !== 'idle' && phase !== 'done', phase === 'done', true, phase === 'idle')}>
          <span className={styles.envTitle}>модуль</span>
          <span className={styles.envVar}>count = {count}</span>
          <span className={labVizStyles.nodeSub}>bumpA и bumpB смотрят сюда</span>
        </div>
        <div className={styles.envCallbacks}>
          <span
            className={[
              styles.callbackChip,
              (phase === 'env1' || phase === 'call1') && styles.callbackChipActive,
              phase === 'call2' || phase === 'done' ? '' : phase === 'idle' ? styles.callbackChipDim : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            bumpA
          </span>
          <span
            className={[
              styles.callbackChip,
              phase === 'call2' && styles.callbackChipActive,
              phase === 'idle' ? styles.callbackChipDim : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            bumpB
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

type LoopVizProps = {
  caseId: LoopCase
  phase: LoopPhase
  iter: number
}

function LoopViz({ caseId, phase, iter }: LoopVizProps) {
  const withVar = caseId === 'var'
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : withVar
        ? phase === 'done'
          ? 'все → 3'
          : 'одно i'
        : phase === 'done'
          ? '0, 1, 2'
          : 'своё i'

  if (withVar) {
    const iVal = phase === 'loop' && iter < 3 ? iter : phase === 'fire' || phase === 'done' ? 3 : 0
    return (
      <LabVizPanel title="var в цикле" meta={meta}>
        <div className={styles.envScene}>
          <div className={envCls(phase !== 'idle', phase === 'done', phase === 'done')}>
            <span className={styles.envTitle}>окружение цикла</span>
            <span className={styles.envVar}>i = {iVal}</span>
          </div>
          <div className={styles.envCallbacks}>
            {[0, 1, 2].map((n) => (
              <span
                key={n}
                className={[
                  styles.callbackChip,
                  phase === 'fire' || phase === 'done' ? styles.callbackChipActive : '',
                  phase === 'idle' ? styles.callbackChipDim : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                log → {phase === 'fire' || phase === 'done' ? 3 : '?'}
              </span>
            ))}
          </div>
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title="let в цикле" meta={meta}>
      <div className={styles.envScene}>
        <div className={styles.loopStrip}>
          {[0, 1, 2].map((n) => {
            const active = phase === 'iter' && iter === n
            const fired = (phase === 'fire' || phase === 'done') && iter >= n
            return (
              <div key={n} className={envCls(active, fired, false, phase === 'idle')}>
                <span className={styles.envTitle}>итерация {n}</span>
                <span className={styles.envVar}>i = {n}</span>
                <span className={labVizStyles.nodeSub}>
                  {fired ? `log → ${n}` : active ? 'колбэк' : '…'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [pattern, setPattern] = useState<Pattern>('counter')
  const [caseId, setCaseId] = useState<CaseId>('separate')
  const [counterPhase, setCounterPhase] = useState<CounterPhase>('idle')
  const [loopPhase, setLoopPhase] = useState<LoopPhase>('idle')
  const [loopIter, setLoopIter] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const cases = CASES[pattern]

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setCounterPhase('idle')
    setLoopPhase('idle')
    setLoopIter(0)
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

  const runCounterSeparate = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'makeCounter() — первый вызов')

    playTimeline(
      tlRef,
      [
        () => {
          setCounterPhase('env1')
          log('info', 'окружение #1: count = 0')
        },
        () => {
          setCounterPhase('call1')
          log('ok', 'first() → 1')
        },
        () => {
          setCounterPhase('call2')
          log('ok', 'first() → 2')
        },
        () => {
          setCounterPhase('env2')
          log('info', 'makeCounter() — второй вызов, новый count')
        },
        () => {
          setCounterPhase('call3')
          log('ok', 'second() → 1 (не 3)')
        },
        () => {
          setCounterPhase('done')
          log('ok', 'два независимых окружения')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runCounterShared = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('warn', 'один count на bumpA и bumpB')

    playTimeline(
      tlRef,
      [
        () => {
          setCounterPhase('env1')
          log('info', 'count = 0')
        },
        () => {
          setCounterPhase('call1')
          log('info', 'bumpA → 1')
        },
        () => {
          setCounterPhase('call2')
          log('warn', 'bumpB → 2 — тот же count')
        },
        () => {
          setCounterPhase('done')
          log('err', 'счётчики не разделены')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runLoopVar = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'for (var i = 0; i < 3; i++)')

    playTimeline(
      tlRef,
      [
        () => {
          setLoopPhase('loop')
          setLoopIter(0)
          log('info', 'i растёт в одном окружении')
        },
        () => {
          setLoopIter(1)
        },
        () => {
          setLoopIter(2)
        },
        () => {
          setLoopIter(3)
          log('warn', 'цикл закончился, i = 3')
        },
        () => {
          setLoopPhase('fire')
          log('err', 'три колбэка → 3, 3, 3')
        },
        () => {
          setLoopPhase('done')
          log('ok', 'финальное i у всех')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runLoopLet = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'for (let i = 0; i < 3; i++)')

    playTimeline(
      tlRef,
      [
        () => {
          setLoopPhase('iter')
          setLoopIter(0)
          log('info', 'итерация 0 — своё i')
        },
        () => {
          setLoopIter(1)
          log('info', 'итерация 1')
        },
        () => {
          setLoopIter(2)
          log('info', 'итерация 2')
        },
        () => {
          setLoopPhase('fire')
          setLoopIter(2)
          log('ok', 'колбэки → 0, 1, 2')
        },
        () => {
          setLoopPhase('done')
          log('ok', 'у каждой итерации свой i')
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
    if (pattern === 'counter') {
      if (caseId === 'separate') runCounterSeparate()
      else runCounterShared()
    } else if (caseId === 'var') {
      runLoopVar()
    } else {
      runLoopLet()
    }
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    pattern === 'counter'
      ? caseId === 'separate'
        ? 'Итог: каждый вызов фабрики создал своё окружение — счётчики не мешают друг другу.'
        : 'Итог: без отдельного окружения на фабрику оба «счётчика» делят одну переменную.'
      : caseId === 'var'
        ? 'Итог: var живёт в одном окружении цикла — отложенные колбэки читают финальный i.'
        : 'Итог: let на каждый проход создаёт своё окружение — колбэк помнит «свой» i.'

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

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {pattern === 'counter' ? (
        <CounterViz caseId={caseId as CounterCase} phase={counterPhase} />
      ) : (
        <LoopViz caseId={caseId as LoopCase} phase={loopPhase} iter={loopIter} />
      )}

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [pattern, setPattern] = useState<Pattern>('counter')

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

export function LexicalEnvironmentLab() {
  return (
    <JsLabShell
      title="Окружение, которое помнит count"
      lead="Лексическое окружение — локальные имена и ссылка наружу; каждый вызов функции создаёт своё."
      problem={<ProblemPanel />}
      code={<CodePanel />}
    />
  )
}
