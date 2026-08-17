import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './GitHooksLab.module.css'

const TOPIC_ID = '19-git-hooks'
const STEP = 0.65

type Pattern = 'pre-commit' | 'commit-msg' | 'policy'
type PreCommitCase = 'lint-fail' | 'lint-ok'
type CommitMsgCase = 'bad-msg' | 'conventional'
type PolicyCase = 'no-verify' | 'ci-gate'
type CaseId = PreCommitCase | CommitMsgCase | PolicyCase
type Phase = 0 | 1 | 2 | 3 | 4

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'pre-commit', label: 'pre-commit' },
  { id: 'commit-msg', label: 'commit-msg' },
  { id: 'policy', label: 'CI / bypass' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  'pre-commit': [
    { id: 'lint-fail', label: 'Lint fail' },
    { id: 'lint-ok', label: 'Lint ok' },
  ],
  'commit-msg': [
    { id: 'bad-msg', label: 'Плохой message' },
    { id: 'conventional', label: 'Conventional' },
  ],
  policy: [
    { id: 'no-verify', label: '--no-verify' },
    { id: 'ci-gate', label: 'Required check' },
  ],
}

const CODE_INTRO: Record<Pattern, string> = {
  'pre-commit':
    'Husky ставит скрипт в `.git/hooks`; lint-staged гоняет eslint/prettier только по staged-файлам.',
  'commit-msg':
    'Hook `commit-msg` получает путь к файлу сообщения; commitlint проверяет формат до создания коммита.',
  policy:
    '`--no-verify` обходит локальные hooks; обязательные CI-checks на protected branch — серверная политика.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  'pre-commit': [
    {
      id: 'husky-pre-commit',
      label: '.husky/pre-commit',
      note: 'После `npm install` Husky копирует wrapper в `.git/hooks/pre-commit`.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# PRE-COMMIT ← exit ≠ 0 отменяет commit
npx lint-staged`,
    },
    {
      id: 'lint-staged',
      label: 'package.json (lint-staged)',
      note: 'Только staged-файлы — быстрый feedback без полного `npm run lint`.',
      executable: false,
      languageLabel: 'json',
      code: `{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,md,json}": "prettier --write"
  }
}`,
    },
  ],
  'commit-msg': [
    {
      id: 'husky-commit-msg',
      label: '.husky/commit-msg',
      note: 'Первый аргумент — путь к temp-файлу с сообщением коммита.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# COMMIT-MSG ← проверка готового message
npx --no -- commitlint --edit "$1"`,
    },
    {
      id: 'commitlint-config',
      label: 'commitlint.config.js',
      note: 'Conventional Commits: type(scope): subject; exit 1 ломает commit.',
      executable: false,
      languageLabel: 'js',
      code: `export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'chore', 'refactor', 'test'],
    ],
    'subject-empty': [2, 'never'],
    'header-max-length': [2, 'always', 72],
  },
}

// feat(auth): add oauth callback  ← ok
// fix stuff                      ← exit 1`,
    },
  ],
  policy: [
    {
      id: 'lefthook-yml',
      label: 'lefthook.yml',
      note: 'Конфиг в репозитории; `lefthook install` — symlink в `.git/hooks`.',
      executable: false,
      languageLabel: 'yaml',
      code: `pre-commit:
  commands:
    lint:
      run: npm run lint
    types:
      run: npm run typecheck -- --pretty false

pre-push:
  commands:
    test:
      run: npm test -- --changedSince=HEAD

# prepare: lefthook install  ← в package.json`,
    },
    {
      id: 'ci-required',
      label: '.github/workflows/ci.yml',
      note: 'Required status check на main — не обойти `--no-verify`.',
      executable: false,
      languageLabel: 'yaml',
      code: `name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

# Branch protection: required check "verify"
# git push --no-verify  ← локальный pre-push пропущен
# merge в main всё равно заблокирован, пока CI красный`,
    },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  'pre-commit': (
    <>
      <code>pre-commit</code> запускается до создания коммита: lint/format на staged — exit ≠ 0
      отменяет операцию.
    </>
  ),
  'commit-msg': (
    <>
      <code>commit-msg</code> проверяет готовое сообщение; commitlint или свой скрипт — exit 1
      блокирует commit.
    </>
  ),
  policy: (
    <>
      <code>--no-verify</code> обходит только локальные hooks; protected branch и required CI-checks
      — серверная политика, не git hook.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  'lint-fail': <>ESLint на staged находит ошибку → exit 1 → объект коммита не создаётся.</>,
  'lint-ok': <>lint-staged проходит → exit 0 → Git записывает commit.</>,
  'bad-msg': <>Сообщение «fix stuff» не проходит commitlint → commit отменён.</>,
  conventional: <>Формат <code>fix(auth): …</code> проходит hook → commit создан.</>,
  'no-verify': (
    <>
      <code>git push --no-verify</code> пропускает локальный pre-push, но CI на PR остаётся
      обязательным.
    </>
  ),
  'ci-gate': (
    <>
      Required check «verify» на <code>main</code> блокирует merge, даже если локально hooks не
      установлены.
    </>
  ),
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

function nodeCls(...parts: Array<string | false | undefined>) {
  return [labVizStyles.node, ...parts.filter(Boolean)].join(' ')
}

type HookForkProps = {
  pattern: 'pre-commit' | 'commit-msg'
  pass: boolean
  phase: Phase
}

function HookForkViz({ pattern, pass, phase }: HookForkProps) {
  const hookLabel = pattern === 'pre-commit' ? 'pre-commit' : 'commit-msg'
  const hookSub =
    pattern === 'pre-commit'
      ? phase < 2
        ? 'lint-staged'
        : pass
          ? phase >= 4
            ? 'exit 0'
            : 'eslint…'
          : phase >= 3
            ? 'exit 1 · eslint error'
            : 'eslint…'
      : phase < 2
        ? 'commitlint'
        : pass
          ? phase >= 4
            ? 'exit 0'
            : 'проверка…'
          : phase >= 3
            ? 'exit 1 · bad format'
            : 'проверка…'

  const aOn = phase >= 1
  const bOn = phase >= 2
  const doneOn = phase >= 4
  const passPath = pass && (bOn || doneOn)
  const failPath = !pass && (bOn || doneOn)
  const passStrong = pass && (bOn || doneOn)
  const failStrong = !pass && (bOn || doneOn)

  const actionSub =
    phase === 0
      ? 'ожидание'
      : phase === 1
        ? 'git commit'
        : doneOn
          ? pass
            ? 'commit создан'
            : 'отменён'
          : 'в процессе…'

  return (
    <div className={styles.scheme}>
      <div
        className={`${styles.schemeTop} ${nodeCls(
          aOn && !doneOn && labVizStyles.nodeActive,
          doneOn && pass && labVizStyles.nodeOk,
          doneOn && !pass && labVizStyles.nodeErr,
          !aOn && styles.dim,
        )}`}
      >
        <span className={labVizStyles.nodeLabel}>git commit</span>
        <span className={labVizStyles.nodeSub}>{actionSub}</span>
      </div>

      <div
        className={`${styles.schemeMid} ${nodeCls(
          bOn && !doneOn && labVizStyles.nodeActive,
          doneOn && pass && labVizStyles.nodeOk,
          doneOn && !pass && labVizStyles.nodeErr,
          !bOn && styles.dim,
        )}`}
      >
        <span className={labVizStyles.nodeLabel}>{hookLabel}</span>
        <span className={labVizStyles.nodeSub}>{hookSub}</span>
      </div>

      <div className={styles.schemeFork} aria-hidden>
        <span
          className={`${styles.schemeForkPass}${passPath ? ` ${styles.schemeForkPassActive}` : ` ${styles.schemeForkIdle}`}`}
        >
          ↙ exit 0
        </span>
        <span />
        <span
          className={`${styles.schemeForkFail}${failPath ? ` ${styles.schemeForkFailActive}` : ` ${styles.schemeForkIdle}`}`}
        >
          exit 1 ↘
        </span>
      </div>

      <div
        className={`${styles.schemeBranch}${!passPath && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
      >
        <div
          className={nodeCls(
            passStrong && !doneOn && labVizStyles.nodeActive,
            doneOn && pass && labVizStyles.nodeOk,
            (!passPath || !bOn) && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>commit</span>
          <span className={labVizStyles.nodeSub}>
            {pass && doneOn ? 'hash записан' : pass ? 'создание…' : '—'}
          </span>
        </div>
      </div>

      <span className={styles.schemeBranchArrow} aria-hidden>
        {doneOn && pass ? '↓' : ''}
      </span>

      <div
        className={`${styles.schemeBranch}${!failPath && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
      >
        <div
          className={nodeCls(
            failStrong && !doneOn && labVizStyles.nodeActive,
            doneOn && !pass && labVizStyles.nodeErr,
            (!failPath || !bOn) && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>blocked</span>
          <span className={labVizStyles.nodeSub}>
            {!pass && doneOn ? 'commit отменён' : !pass ? 'hook fail' : '—'}
          </span>
        </div>
      </div>

      {pass ? (
        <div
          className={`${styles.schemeOut} ${nodeCls(
            doneOn && pass && labVizStyles.nodeOk,
            !doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>готово</span>
          <span className={labVizStyles.nodeSub}>{doneOn ? 'ref обновлён' : '—'}</span>
        </div>
      ) : null}
    </div>
  )
}

function PolicyViz({ caseId, phase }: { caseId: PolicyCase; phase: Phase }) {
  const bypass = caseId === 'no-verify'

  const aOn = phase >= 1
  const bOn = phase >= 2
  const cOn = phase >= 3
  const doneOn = phase >= 4

  const pushSub =
    phase === 0
      ? 'ожидание'
      : bypass
        ? 'git push --no-verify'
        : 'git push'

  const localSub = !bOn
    ? 'pre-push'
    : bypass
      ? 'пропущен (--no-verify)'
      : caseId === 'ci-gate'
        ? doneOn
          ? 'не установлен / ok'
          : '—'
        : doneOn
          ? 'exit 0'
          : 'npm test…'

  const remoteSub = !cOn ? 'origin' : doneOn ? 'refs приняты' : 'receive…'

  const ciSub = !doneOn
    ? 'CI pending'
    : caseId === 'ci-gate'
      ? 'verify · failed · merge blocked'
      : 'verify · failed · merge blocked'

  return (
    <div className={styles.policyRow}>
      <div
        className={nodeCls(
          aOn && !doneOn && labVizStyles.nodeActive,
          doneOn && labVizStyles.nodeOk,
          !aOn && styles.dim,
        )}
      >
        <span className={labVizStyles.nodeLabel}>local</span>
        <span className={labVizStyles.nodeSub}>{pushSub}</span>
      </div>

      <span
        className={`${styles.policyArrow}${aOn ? ` ${styles.policyArrowActive}` : ` ${styles.policyArrowIdle}`}`}
        aria-hidden
      >
        →
      </span>

      <div
        className={nodeCls(
          bOn && !doneOn && !bypass && labVizStyles.nodeActive,
          bypass && bOn && styles.skipped,
          !bOn && styles.dim,
        )}
      >
        <span className={labVizStyles.nodeLabel}>pre-push</span>
        <span className={labVizStyles.nodeSub}>{localSub}</span>
      </div>

      <span
        className={`${styles.policyArrow}${bOn ? (bypass ? ` ${styles.policyArrowSkip}` : ` ${styles.policyArrowActive}`) : ` ${styles.policyArrowIdle}`}`}
        aria-hidden
      >
        →
      </span>

      <div
        className={nodeCls(
          cOn && !doneOn && labVizStyles.nodeActive,
          doneOn && labVizStyles.nodeOk,
          !cOn && styles.dim,
        )}
      >
        <span className={labVizStyles.nodeLabel}>remote</span>
        <span className={labVizStyles.nodeSub}>{remoteSub}</span>
      </div>

      <span
        className={`${styles.policyArrow}${cOn ? ` ${styles.policyArrowActive}` : ` ${styles.policyArrowIdle}`}`}
        aria-hidden
      >
        →
      </span>

      <div
        className={nodeCls(
          doneOn && labVizStyles.nodeErr,
          doneOn && labVizStyles.nodeActive,
          !doneOn && styles.dim,
        )}
      >
        <span className={labVizStyles.nodeLabel}>CI / policy</span>
        <span className={labVizStyles.nodeSub}>{ciSub}</span>
      </div>
    </div>
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

export function GitHooksLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('pre-commit')
  const [caseId, setCaseId] = useState<CaseId>('lint-fail')
  const [phase, setPhase] = useState<Phase>(0)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const resetViz = () => {
    setPhase(0)
    setHint(null)
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

  const finish = (
    msgs: Array<{ kind: 'ok' | 'info' | 'warn' | 'err'; text: string }>,
    hintText: string,
  ) => {
    for (const m of msgs) log(m.kind, m.text)
    setHint(hintText)
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    if (pattern === 'pre-commit' && caseId === 'lint-fail') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'info', text: 'git commit · staged files' },
                { kind: 'err', text: 'eslint: no-unused-vars · exit 1' },
                { kind: 'warn', text: 'commit отменён' },
              ],
              'pre-commit блокирует commit до исправления',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'pre-commit' && caseId === 'lint-ok') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'info', text: 'lint-staged · eslint --fix' },
                { kind: 'ok', text: 'exit 0 · commit создан' },
              ],
              'быстрый lint только на staged',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'commit-msg' && caseId === 'bad-msg') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'info', text: 'message: "fix stuff"' },
                { kind: 'err', text: 'commitlint: type-empty · exit 1' },
                { kind: 'warn', text: 'commit отменён' },
              ],
              'commit-msg проверяет формат до записи commit',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'commit-msg' && caseId === 'conventional') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'info', text: 'fix(auth): handle oauth callback' },
                { kind: 'ok', text: 'commitlint ok · exit 0' },
              ],
              'Conventional Commits проходят commit-msg hook',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'policy' && caseId === 'no-verify') {
      playTimeline(
        tlRef,
        [
          () => setPhase(1),
          () => setPhase(2),
          () => setPhase(3),
          () => {
            setPhase(4)
            finish(
              [
                { kind: 'warn', text: 'pre-push пропущен (--no-verify)' },
                { kind: 'info', text: 'push принят на origin' },
                { kind: 'err', text: 'CI verify: lint failed · merge blocked' },
              ],
              'локальный bypass не отменяет required check',
            )
          },
        ],
        () => setBusy(false),
      )
      return
    }

    playTimeline(
      tlRef,
      [
        () => setPhase(1),
        () => setPhase(2),
        () => setPhase(3),
        () => {
          setPhase(4)
          finish(
            [
              { kind: 'info', text: 'push → origin/main' },
              { kind: 'err', text: 'required check verify · failed' },
              { kind: 'warn', text: 'merge в main заблокирован' },
            ],
            'CI дублирует критичные правила hooks',
          )
        },
      ],
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('pre-commit')
    setCaseId('lint-fail')
    resetViz()
  }

  const vizTitle =
    pattern === 'pre-commit'
      ? 'pre-commit'
      : pattern === 'commit-msg'
        ? 'commit-msg'
        : 'CI / bypass'

  const passCase =
    caseId === 'lint-ok' || caseId === 'conventional'

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
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <LabVizPanel title={vizTitle} meta={phase === 0 ? 'idle' : `шаг ${phase}`}>
        {pattern === 'policy' ? (
          <PolicyViz caseId={caseId as PolicyCase} phase={phase} />
        ) : (
          <HookForkViz
            pattern={pattern}
            pass={passCase}
            phase={phase}
          />
        )}
      </LabVizPanel>

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
      title="Git hooks"
      lead="pre-commit, commit-msg и политика CI: exit code блокирует операцию, `--no-verify` — только локально."
      problem={problem}
      code={code}
    />
  )
}
