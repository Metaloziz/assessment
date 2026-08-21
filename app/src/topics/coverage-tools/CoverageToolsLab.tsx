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
import styles from './CoverageToolsLab.module.css'

const TOPIC_ID = '271-coverage-tools-principles'
const STEP = 0.55

type CaseId = 'how' | 'ways' | 'trap'
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'
type LineId = 'l1' | 'l2' | 'l3'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'how', label: 'как работает' },
  { id: 'ways', label: 'два способа' },
  { id: 'trap', label: 'ловушка' },
]

const PAIN = (
  <>
    Coverage показывает, какой код тесты <strong>задели</strong>. Это карта посещений, а не
    оценка качества проверок.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  how: (
    <>
      Включили <code>--coverage</code> → прогнали тесты → в отчёте зелёные и красные строки.
    </>
  ),
  ways: (
    <>
      Счётчики в коде (Istanbul) или движок сам запоминает (V8). Для тебя обычно один флаг в
      Jest/Vitest.
    </>
  ),
  trap: (
    <>
      Функцию вызвали без <code>expect</code> — процент вырос, а поведение не проверили.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  how: 'Три шага: запуск с --coverage, тесты, отчёт.',
  ways: 'Два способа сбора — один флаг в runner.',
  trap: 'Выполнили код ≠ проверили результат.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  how: [
    {
      id: 'run',
      label: 'запуск',
      note: 'Обычный способ включить coverage.',
      executable: false,
      languageLabel: 'bash',
      code: `npm test -- --coverage
# или: jest --coverage
# или: vitest run --coverage
`,
    },
    {
      id: 'fn',
      label: 'shipping.js',
      note: 'Код, по которому «ходят» тесты.',
      executable: false,
      languageLabel: 'js',
      code: `function shipping(total) {
  if (total >= 1000) return 0;  // ветка A
  return 200;                   // ветка B
}
`,
    },
  ],
  ways: [
    {
      id: 'istanbul',
      label: 'способ 1 — счётчики',
      note: 'В код временно ставят «+1» на строку.',
      executable: false,
      languageLabel: 'js',
      code: `// идея Istanbul (упрощённо)
function shipping(total) {
  hit('строка 1'); // ← счётчик
  if (total >= 1000) return 0;
  return 200;
}
`,
    },
    {
      id: 'v8',
      label: 'способ 2 — движок',
      note: 'Node сам помнит, что исполнял (V8 / c8).',
      executable: false,
      languageLabel: 'bash',
      code: `jest --coverage --coverageProvider=v8
vitest run --coverage
`,
    },
  ],
  trap: [
    {
      id: 'bad',
      label: 'плохо',
      note: 'Код выполнился — цифра растёт, проверки нет.',
      executable: false,
      languageLabel: 'js',
      code: `test('плохо', () => {
  shipping(500); // ← только вызов
});
`,
    },
    {
      id: 'good',
      label: 'хорошо',
      note: 'Проверяем результат — вот смысл теста.',
      executable: false,
      languageLabel: 'js',
      code: `test('хорошо', () => {
  expect(shipping(500)).toBe(200);
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

type LineState = 'idle' | 'active' | 'ok' | 'err' | 'dim'

function lineStates(caseId: CaseId, phase: Phase): Record<LineId, LineState> {
  const allDim: Record<LineId, LineState> = { l1: 'dim', l2: 'dim', l3: 'dim' }
  if (phase === 'idle') return allDim

  if (caseId === 'how') {
    if (phase === 'a') return { l1: 'active', l2: 'dim', l3: 'dim' }
    if (phase === 'b') return { l1: 'ok', l2: 'active', l3: 'dim' }
    if (phase === 'c') return { l1: 'ok', l2: 'ok', l3: 'active' }
    return { l1: 'ok', l2: 'ok', l3: 'err' } // B не покрыта одним тестом
  }

  if (caseId === 'ways') {
    if (phase === 'a') return { l1: 'active', l2: 'active', l3: 'dim' }
    if (phase === 'b') return { l1: 'ok', l2: 'dim', l3: 'active' }
    if (phase === 'c' || phase === 'done') return { l1: 'ok', l2: 'ok', l3: 'ok' }
    return allDim
  }

  // trap
  if (phase === 'a') return { l1: 'active', l2: 'dim', l3: 'dim' }
  if (phase === 'b') return { l1: 'ok', l2: 'active', l3: 'active' }
  if (phase === 'c') return { l1: 'ok', l2: 'ok', l3: 'ok' }
  return { l1: 'err', l2: 'err', l3: 'err' }
}

function badge(caseId: CaseId, phase: Phase): string {
  if (phase === 'idle') return 'отчёт coverage'
  if (caseId === 'how') {
    if (phase === 'a') return '1. запуск --coverage'
    if (phase === 'b') return '2. тесты идут'
    if (phase === 'c') return '3. строки в отчёте'
    return 'ветка B ещё красная'
  }
  if (caseId === 'ways') {
    if (phase === 'a') return 'счётчики в коде'
    if (phase === 'b') return 'или память движка'
    return 'для тебя — один флаг'
  }
  if (phase === 'a') return 'тест без expect'
  if (phase === 'b') return 'строки «зелёные»'
  if (phase === 'c') return 'coverage 100%'
  return 'поведение не проверено'
}

function footer(caseId: CaseId, phase: Phase): string {
  if (phase === 'idle') return 'выбери сценарий и нажми «Запустить»'
  if (caseId === 'how') {
    if (phase === 'done') return 'зелёное = выполнили · красное = не задели'
    return 'идём по шагам пайплайна'
  }
  if (caseId === 'ways') {
    if (phase === 'done') return 'Istanbul или V8 — отчёт похож'
    return 'два пути к одной цифре'
  }
  if (phase === 'done') return 'нужен expect, не только вызов'
  return 'ловушка красивого процента'
}

type CodeVizProps = {
  caseId: CaseId
  phase: Phase
  badgeRef: MutableRefObject<HTMLDivElement | null>
}

function CodeViz({ caseId, phase, badgeRef }: CodeVizProps) {
  const states = lineStates(caseId, phase)
  const lines: Array<{ id: LineId; text: string; tag: string }> = [
    { id: 'l1', text: 'function shipping(total) {', tag: 'fn' },
    { id: 'l2', text: '  if (total >= 1000) return 0;', tag: 'ветка A' },
    { id: 'l3', text: '  return 200;', tag: 'ветка B' },
  ]

  return (
    <LabVizPanel title="код под coverage" meta={footer(caseId, phase)}>
      <div
        ref={badgeRef}
        className={styles.badge}
        style={{ opacity: phase === 'idle' ? 0.45 : 1 }}
      >
        {badge(caseId, phase)}
      </div>
      <div className={styles.codeBlock}>
        {lines.map((L) => {
          const st = states[L.id]
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
                styles.line,
                dim && styles.dim,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.lineTag}>{L.tag}</span>
              <code className={styles.lineCode}>{L.text}</code>
            </div>
          )
        })}
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [caseId, setCaseId] = useState<CaseId>('how')
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const badgeRef = useRef<HTMLDivElement | null>(null)

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
    if (badgeRef.current) gsap.set(badgeRef.current, { y: 0, clearProps: 'y' })
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

    const finish = () => {
      setRunning(false)
      setFinished(true)
    }
    const bounce = (tl: gsap.core.Timeline) => {
      if (!badgeRef.current) return
      tl.fromTo(badgeRef.current, { y: -6 }, { y: 0 }, 0)
    }

    if (caseId === 'how') {
      log('info', 'сценарий: как работает')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('a')
            log('info', 'jest --coverage')
          },
          () => {
            setPhase('b')
            log('ok', 'тест: shipping(1000)')
          },
          () => {
            setPhase('c')
            log('ok', 'строки отмечены')
          },
          () => {
            setPhase('done')
            log('warn', 'ветка B ещё красная')
          },
        ],
        bounce,
        finish,
      )
      return
    }

    if (caseId === 'ways') {
      log('info', 'сценарий: два способа')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('a')
            log('info', 'Istanbul: счётчики в коде')
          },
          () => {
            setPhase('b')
            log('info', 'V8: движок сам помнит')
          },
          () => {
            setPhase('c')
            log('ok', 'оба дают отчёт')
          },
          () => {
            setPhase('done')
            log('ok', 'тебе нужен --coverage')
          },
        ],
        bounce,
        finish,
      )
      return
    }

    log('warn', 'сценарий: ловушка')
    playTimeline(
      tlRef,
      [
        () => {
          setPhase('a')
          log('info', 'shipping(500) без expect')
        },
        () => {
          setPhase('b')
          log('warn', 'строки выполнились')
        },
        () => {
          setPhase('c')
          log('warn', 'в отчёте почти 100%')
        },
        () => {
          setPhase('done')
          log('err', 'результат никто не сверил')
        },
      ],
      bounce,
      finish,
    )
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    caseId === 'how'
      ? 'Итог: coverage — отчёт «где побывали тесты».'
      : caseId === 'ways'
        ? 'Итог: счётчики или V8 — снаружи это просто --coverage.'
        : 'Итог: без expect красивый процент ничего не значит.'

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

      <CodeViz caseId={caseId} phase={phase} badgeRef={badgeRef} />

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [caseId, setCaseId] = useState<CaseId>('how')

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

export function CoverageToolsLab() {
  return (
    <JsLabShell
      title="Coverage простыми словами"
      lead="Как собирают покрытие, чем отличаются способы и почему 100% может врать."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
