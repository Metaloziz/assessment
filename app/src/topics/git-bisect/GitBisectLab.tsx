import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './GitBisectLab.module.css'

const TOPIC_ID = '20-git-bisect'
const STEP = 0.65

type Pattern = 'manual' | 'run'
type ManualCase = 'regression' | 'skip'
type RunCase = 'auto' | 'exit125'
type CaseId = ManualCase | RunCase

type CommitStatus = 'good' | 'bad' | 'skip' | 'current' | 'first-bad'

type BisectCommit = {
  id: string
  label: string
  hash: string
  status?: CommitStatus
  excluded?: boolean
}

type BisectFrame = {
  commits: BisectCommit[]
  command?: string
  rangeLeft?: string
  rangeRight?: string
  testLine?: string
  testTone?: 'pass' | 'fail' | 'skip'
  caption: string
}

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'manual', label: 'ручной' },
  { id: 'run', label: 'bisect run' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  manual: [
    { id: 'regression', label: 'good / bad' },
    { id: 'skip', label: 'bisect skip' },
  ],
  run: [
    { id: 'auto', label: 'npm test' },
    { id: 'exit125', label: 'exit 125' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  manual: (
    <>
      <code>git bisect</code> сужает диапазон между known good и bad: после каждой проверки
      остаётся ~половина коммитов — за <code>log₂(N)</code> шагов находят первый bad.
    </>
  ),
  run: (
    <>
      <code>bisect run</code> сам checkout&apos;ит середину и гоняет скрипт: exit <code>0</code> —
      good, <code>1</code> — bad, <code>125</code> — skip. В конце —{' '}
      <code>git bisect reset</code>.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  regression: (
    <>
      HEAD bad, tag <code>v1.2.0</code> good — три шага bisect находят коммит, где сломался login.
    </>
  ),
  skip: (
    <>
      Старый коммит не собирается — <code>git bisect skip</code> (или exit <code>125</code> в run)
      исключает его из поиска.
    </>
  ),
  auto: (
    <>
      <code>git bisect run npm test</code> — Git сам переключает ревизии и читает код возврата
      теста.
    </>
  ),
  exit125: (
    <>
      Скрипт возвращает <code>125</code> на ревизии без lockfile — bisect не считает её good/bad.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  manual: 'Старт сессии, границы good/bad, ручные метки и reset в detached HEAD.',
  run: 'Автопоиск через скрипт; коды 0 / 1 / 125 и типичный wrapper для npm test.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  manual: [
    {
      id: 'bisect-manual',
      label: 'scripts/bisect-manual.sh',
      note: 'Регрессия: bad на HEAD, good на известном tag; после каждой проверки — good или bad.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

# ← BISECT: бинарный поиск первого bad-коммита
git bisect start
git bisect bad HEAD              # ← текущий сломан
git bisect good v1.2.0           # ← старый рабочий tag

# Git checkout'ит середину диапазона — проверить приложение:
npm test -- --grep "login"
git bisect good                  # ← ошибки нет → сужаем вверх
# либо:
git bisect bad                   # ← ошибка есть → сужаем вниз

git bisect reset                 # ← вернуть ветку; не оставлять detached HEAD`,
    },
    {
      id: 'bisect-skip',
      label: 'scripts/bisect-skip.sh',
      note: 'Промежуточная ревизия не собирается — skip, не good/bad.',
      executable: false,
      languageLabel: 'sh',
      code: `# ← SKIP: ревизию нельзя проверить
npm ci || git bisect skip        # ← не ломает сессию

git bisect log > bisect-steps.txt
git bisect replay bisect-steps.txt

git bisect reset`,
    },
  ],
  run: [
    {
      id: 'bisect-run',
      label: 'scripts/bisect-run.sh',
      note: 'Один вызов — Git сам перебирает ревизии по exit code скрипта.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

# ← RUN: start с двумя границами сразу
git bisect start HEAD v1.2.0
git bisect run npm test -- --grep "login should work"

# exit 0 → good, 1–127 (кроме 125) → bad
git bisect reset`,
    },
    {
      id: 'bisect-run-wrapper',
      label: 'scripts/bisect-test-wrapper.sh',
      note: '125 = skip: старые коммиты без package-lock или с другим Node.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/bin/sh
# ← WRAPPER для bisect run

if [ ! -f package-lock.json ]; then
  exit 125                     # ← SKIP: нельзя npm ci
fi

npm ci --silent || exit 125
npm test -- --grep "login"
# test exit 0 → good, 1 → bad`,
    },
  ],
}

const BASE_COMMITS: Omit<BisectCommit, 'status' | 'excluded'>[] = [
  { id: 'c1', label: 'init', hash: 'a1b2c3' },
  { id: 'c2', label: 'deps bump', hash: 'b2c3d4' },
  { id: 'c3', label: 'refactor auth', hash: 'c3d4e5' },
  { id: 'c4', label: 'add cache', hash: 'd4e5f6' },
  { id: 'c5', label: 'ui polish', hash: 'e5f6a7' },
  { id: 'c6', label: 'break login', hash: 'f6a7b8' },
  { id: 'c7', label: 'HEAD', hash: 'a7b8c9' },
]

function buildFrames(pattern: Pattern, caseId: CaseId): BisectFrame[] {
  if (pattern === 'manual' && caseId === 'regression') {
    return [
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          status: c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'git bisect start && git bisect bad && git bisect good v1.2.0',
        rangeLeft: 'v1.2.0',
        rangeRight: 'HEAD',
        caption: '7 коммитов между good и bad — ~3 проверки вместо шести.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          status: c.id === 'c4' ? 'current' : c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'git checkout c4 (середина)',
        rangeLeft: 'v1.2.0',
        rangeRight: 'HEAD',
        testLine: 'npm test --grep login → PASS',
        testTone: 'pass',
        caption: 'Detached HEAD на середине — проверяем воспроизводимость бага.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: c.id === 'c1' || c.id === 'c2' || c.id === 'c3' || c.id === 'c4',
          status:
            c.id === 'c1' || c.id === 'c4'
              ? 'good'
              : c.id === 'c7'
                ? 'bad'
                : undefined,
        })),
        command: 'git bisect good',
        rangeLeft: 'c4',
        rangeRight: 'HEAD',
        caption: 'После good половина снизу исключена — остались c5–c7.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: c.id !== 'c5' && c.id !== 'c6' && c.id !== 'c7',
          status: c.id === 'c6' ? 'current' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'git checkout c6',
        testLine: 'login test → FAIL',
        testTone: 'fail',
        caption: 'Следующая середина — баг уже проявился.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: c.id !== 'c5' && c.id !== 'c6',
          status: c.id === 'c6' ? 'bad' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'git bisect bad',
        rangeLeft: 'c4',
        rangeRight: 'c6',
        caption: 'bad на c6 — c7 тоже bad, диапазон сузился до c5–c6.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: c.id !== 'c5' && c.id !== 'c6',
          status: c.id === 'c5' ? 'current' : undefined,
        })),
        command: 'git checkout c5',
        testLine: 'login test → PASS',
        testTone: 'pass',
        caption: 'c5 ещё good — первый bad между c5 и c6.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: true,
          status:
            c.id === 'c6'
              ? 'first-bad'
              : c.id === 'c1'
                ? 'good'
                : c.id === 'c7'
                  ? 'bad'
                  : undefined,
        })),
        command: 'git bisect good → first bad f6a7b8',
        caption: 'Git называет c6 «break login» — смотрим diff через git show.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          status: c.id === 'c7' ? 'current' : undefined,
        })),
        command: 'git bisect reset',
        caption: 'Вернулись на исходную ветку — detached HEAD закрыт.',
      },
    ]
  }

  if (pattern === 'manual' && caseId === 'skip') {
    return [
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          status: c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'git bisect start HEAD v1.2.0',
        rangeLeft: 'v1.2.0',
        rangeRight: 'HEAD',
        caption: 'Середина попала на c2 — старый deps bump без lockfile.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          status: c.id === 'c2' ? 'current' : c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'git checkout c2',
        testLine: 'npm ci → ENOENT package-lock.json',
        testTone: 'fail',
        caption: 'Сборка падает не из-за бага — good/bad здесь недостоверны.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          status: c.id === 'c2' ? 'skip' : c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
          excluded: c.id === 'c2',
        })),
        command: 'git bisect skip',
        testTone: 'skip',
        testLine: 'ревизия исключена из поиска',
        caption: 'skip убирает c2 — Git выбирает другую середину.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: c.id === 'c1' || c.id === 'c2' || c.id === 'c3' || c.id === 'c4',
          status: c.id === 'c4' ? 'current' : c.id === 'c2' ? 'skip' : c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'git checkout c4',
        testLine: 'login test → PASS',
        testTone: 'pass',
        caption: 'Поиск продолжается с проверяемой ревизии.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: c.id !== 'c5' && c.id !== 'c6' && c.id !== 'c7' && c.id !== 'c2',
          status:
            c.id === 'c6'
              ? 'first-bad'
              : c.id === 'c2'
                ? 'skip'
                : c.id === 'c1'
                  ? 'good'
                  : c.id === 'c7'
                    ? 'bad'
                    : undefined,
        })),
        command: '…good/bad… → first bad c6',
        caption: 'Пропуск не ломает сессию — bisect log можно replay.',
      },
    ]
  }

  if (pattern === 'run' && caseId === 'auto') {
    return [
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          status: c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'git bisect start HEAD v1.2.0',
        rangeLeft: 'v1.2.0',
        rangeRight: 'HEAD',
        caption: 'Один bisect run — Git сам checkout и npm test.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          status: c.id === 'c4' ? 'current' : c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'bisect run: checkout c4',
        testLine: 'npm test → exit 0 (good)',
        testTone: 'pass',
        caption: 'Скрипт вернул 0 — диапазон сужен без ручного good.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: c.id !== 'c5' && c.id !== 'c6' && c.id !== 'c7',
          status: c.id === 'c6' ? 'current' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'bisect run: checkout c6',
        testLine: 'npm test → exit 1 (bad)',
        testTone: 'fail',
        caption: 'exit 1 — bad; Git продолжает автоматически.',
      },
      {
        commits: BASE_COMMITS.map((c) => ({
          ...c,
          excluded: true,
          status: c.id === 'c6' ? 'first-bad' : c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        })),
        command: 'bisect run finished',
        testLine: 'first bad commit f6a7b8',
        testTone: 'fail',
        caption: '~log₂(7) шагов — тот же результат, что ручной bisect.',
      },
    ]
  }

  // run / exit125
  return [
    {
      commits: BASE_COMMITS.map((c) => ({
        ...c,
        status: c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
      })),
      command: 'git bisect run ./bisect-test-wrapper.sh',
      rangeLeft: 'v1.2.0',
      rangeRight: 'HEAD',
      caption: 'Wrapper возвращает 125, если нет package-lock.json.',
    },
    {
      commits: BASE_COMMITS.map((c) => ({
        ...c,
        status: c.id === 'c2' ? 'current' : c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
      })),
      command: 'wrapper @ c2',
      testLine: 'exit 125 → skip',
      testTone: 'skip',
      caption: '125 = «не могу проверить» — не путать с bad.',
    },
    {
      commits: BASE_COMMITS.map((c) => ({
        ...c,
        status: c.id === 'c2' ? 'skip' : c.id === 'c1' ? 'good' : c.id === 'c7' ? 'bad' : undefined,
        excluded: c.id === 'c2',
      })),
      command: 'bisect run: skip c2, checkout c4',
      testLine: 'npm ci && npm test → exit 0',
      testTone: 'pass',
      caption: 'После skip — нормальная ревизия с lockfile.',
    },
    {
      commits: BASE_COMMITS.map((c) => ({
        ...c,
        excluded: true,
        status:
          c.id === 'c6'
            ? 'first-bad'
            : c.id === 'c2'
              ? 'skip'
              : c.id === 'c1'
                ? 'good'
                : c.id === 'c7'
                  ? 'bad'
                  : undefined,
      })),
      command: 'bisect run finished',
      caption: '125 в скрипте = git bisect skip вручную.',
    },
  ]
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
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function statusTag(status?: CommitStatus) {
  if (status === 'good') return { label: 'good', className: styles.tagGood }
  if (status === 'bad') return { label: 'bad', className: styles.tagBad }
  if (status === 'skip') return { label: 'skip', className: styles.tagSkip }
  if (status === 'current') return { label: 'HEAD?', className: styles.tagCurrent }
  if (status === 'first-bad') return { label: 'first bad', className: styles.tagBad }
  return null
}

function BisectViz({
  frame,
  currentRef,
}: {
  frame: BisectFrame | null
  currentRef: MutableRefObject<HTMLDivElement | null>
}) {
  if (!frame) {
    return (
      <LabVizPanel title="git bisect" meta="бинарный поиск по истории">
        <p className={styles.caption}>7 коммитов между v1.2.0 и HEAD — диапазон ещё не сужен.</p>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title="git bisect" meta={frame.rangeLeft ? `${frame.rangeLeft} … ${frame.rangeRight}` : 'сессия'}>
      {frame.command ? (
        <div className={styles.commandBar}>
          <span className={styles.commandLabel}>cmd</span>
          <span className={styles.commandText}>{frame.command}</span>
        </div>
      ) : null}

      {frame.rangeLeft && frame.rangeRight ? (
        <div className={styles.rangeRow}>
          <span className={`${styles.rangeBound} ${styles.rangeGood}`}>{frame.rangeLeft}</span>
          <span className={styles.rangeMid}>диапазон</span>
          <span className={`${styles.rangeBound} ${styles.rangeBad}`}>{frame.rangeRight}</span>
        </div>
      ) : null}

      <div className={styles.timeline}>
        {frame.commits.map((commit) => {
          const tag = statusTag(commit.status)
          const rowClass = [
            styles.commitRow,
            commit.excluded ? styles.commitRowExcluded : '',
            commit.status === 'current' ? styles.commitRowCurrent : '',
            commit.status === 'good' ? styles.commitRowGood : '',
            commit.status === 'bad' ? styles.commitRowBad : '',
            commit.status === 'skip' ? styles.commitRowSkip : '',
            commit.status === 'first-bad' ? styles.commitRowFirstBad : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={commit.id}
              ref={commit.status === 'current' ? currentRef : undefined}
              className={rowClass}
            >
              <span className={styles.commitHash}>{commit.hash}</span>
              <span className={styles.commitLabel}>{commit.label}</span>
              {tag ? (
                <span className={`${styles.commitTag} ${tag.className}`}>{tag.label}</span>
              ) : null}
            </div>
          )
        })}
      </div>

      {frame.testLine ? (
        <div
          className={[
            styles.testBox,
            frame.testTone === 'pass' ? styles.testPass : '',
            frame.testTone === 'fail' ? styles.testFail : '',
            frame.testTone === 'skip' ? styles.testSkip : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {frame.testLine}
        </div>
      ) : null}

      <p className={styles.caption}>{frame.caption}</p>
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

export function GitBisectLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('manual')
  const [caseId, setCaseId] = useState<CaseId>('regression')
  const [frameIdx, setFrameIdx] = useState(-1)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const currentRef = useRef<HTMLDivElement | null>(null)

  const frames = buildFrames(pattern, caseId)
  const frame = frameIdx >= 0 ? frames[frameIdx]! : null
  const atEnd = frameIdx >= frames.length - 1
  const canStep = frameIdx >= 0 && frameIdx < frames.length - 1

  const resetViz = () => {
    setFrameIdx(-1)
    setHint(null)
    if (currentRef.current) gsap.set(currentRef.current, { clearProps: 'transform,opacity,scale' })
  }

  const finishRun = () => {
    const last = frames[frames.length - 1]!
    log('ok', last.caption)

    if (pattern === 'manual' && caseId === 'regression') {
      log('info', '3× bisect good/bad')
      log('ok', 'first bad f6a7b8 · break login')
      setHint('log₂(7) ≈ 3 проверки')
    } else if (pattern === 'manual' && caseId === 'skip') {
      log('warn', 'c2 не собирается')
      log('info', 'git bisect skip')
      setHint('skip ≠ bad — среда, не регрессия')
    } else if (pattern === 'run' && caseId === 'auto') {
      log('ok', 'bisect run npm test')
      log('info', 'exit 0/1 без ручных меток')
      setHint('тот же first bad, меньше рутины')
    } else {
      log('warn', 'exit 125 на c2')
      log('ok', 'wrapper → skip → first bad c6')
      setHint('125 = skip в bisect run')
    }
  }

  const advanceFrame = (nextIdx: number, animate: boolean) => {
    setFrameIdx(nextIdx)
    const el = currentRef.current
    if (!el || !animate || reducedMotion()) return
    gsap.fromTo(el, { scale: 0.94, opacity: 0.55 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'power2.inOut' })
  }

  const runAll = () => {
    clear()
    resetViz()
    setBusy(true)

    const stepFns = frames.map((_, i) => () => advanceFrame(i, true))

    playTimeline(tlRef, stepFns, () => {
      setBusy(false)
      finishRun()
    })
  }

  const stepOnce = () => {
    if (busy) return
    clear()
    setHint(null)

    const next = frameIdx + 1
    if (next >= frames.length) return

    if (frameIdx < 0) setBusy(true)

    advanceFrame(next, true)

    if (next >= frames.length - 1) {
      finishRun()
      setBusy(false)
    } else if (frameIdx < 0) {
      setBusy(false)
    }
  }

  const selectPattern = (next: Pattern) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
    setCaseId(CASES[next][0]!.id)
    clear()
    resetViz()
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('manual')
    setCaseId('regression')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES[pattern].map((c) => (
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
        <LabButton variant="primary" disabled={busy} onClick={runAll}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy || (!canStep && frameIdx >= 0 && atEnd)} onClick={stepOnce}>
          Шаг
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      {frameIdx >= 0 ? (
        <p className={styles.stepHint}>
          кадр {frameIdx + 1} / {frames.length}
        </p>
      ) : null}

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <BisectViz frame={frame} currentRef={currentRef} />

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
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="git bisect"
      lead="Бинарный поиск первого bad-коммита: ручные метки, skip и bisect run с exit-кодами."
      problem={problem}
      code={code}
    />
  )
}
