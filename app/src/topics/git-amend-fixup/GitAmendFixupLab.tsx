import { useRef, useState, type MutableRefObject } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './GitAmendFixupLab.module.css'

const TOPIC_ID = '16-git-amend-fixup-revert-cherry-pick-stash'
const STEP = 0.65

type Pattern = 'amend' | 'fixup' | 'revert' | 'cherry' | 'stash'
type AmendCase = 'forgot' | 'pushed'
type FixupCase = 'squash' | 'message'
type RevertCase = 'safe' | 'vs-reset'
type CherryCase = 'hotfix' | 'abort'
type StashCase = 'switch' | 'untracked'
type CaseId = AmendCase | FixupCase | RevertCase | CherryCase | StashCase

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'amend', label: 'amend' },
  { id: 'fixup', label: 'fixup' },
  { id: 'revert', label: 'revert' },
  { id: 'cherry', label: 'cherry-pick' },
  { id: 'stash', label: 'stash' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  amend: [
    { id: 'forgot', label: 'Забыли файл' },
    { id: 'pushed', label: 'После push' },
  ],
  fixup: [
    { id: 'squash', label: 'autosquash' },
    { id: 'message', label: 'fixup vs squash' },
  ],
  revert: [
    { id: 'safe', label: 'На main' },
    { id: 'vs-reset', label: 'revert vs reset' },
  ],
  cherry: [
    { id: 'hotfix', label: 'Hotfix' },
    { id: 'abort', label: 'Конфликт' },
  ],
  stash: [
    { id: 'switch', label: 'Перед switch' },
    { id: 'untracked', label: 'Без -u' },
  ],
}

const PAIN: Record<Pattern, string> = {
  amend: 'Amend переписывает tip: hash меняется. На shared-ветке после push это расходится с remote.',
  fixup: 'Fixup — отдельная правка к старому коммиту; autosquash схлопывает её при rebase.',
  revert: 'Revert добавляет отменяющий коммит — история shared-веток остаётся прослеживаемой.',
  cherry: 'Cherry-pick копирует diff одного коммита на текущую ветку с новым hash.',
  stash: 'Stash прячет WIP в стек, не трогая коммиты — удобно перед switch или pull.',
}

const CASE_BRIEF: Record<CaseId, string> = {
  forgot: 'Забытый файл в индекс → amend: тот же tip, новый hash.',
  pushed: 'Amend после push: локальный main ушёл от origin/main.',
  squash: 'Fixup-коммит исчезает в целевом после rebase -i --autosquash.',
  message: 'Fixup отбрасывает сообщение правки; squash предлагает объединить тексты.',
  safe: 'Revert bad-коммита: в истории и fix, и Revert fix.',
  'vs-reset': 'Revert добавляет коммит; reset на shared main переписал бы историю.',
  hotfix: 'Коммит с main появляется на release — новый hash, тот же diff.',
  abort: 'Конфликт cherry-pick → --abort: release без нового коммита.',
  switch: 'Stash → чистое дерево → switch → pop возвращает WIP.',
  untracked: 'Без -u untracked-файлы остаются в рабочей директории.',
}

const CODE_INTRO: Record<Pattern, string> = {
  amend: '`--amend` заменяет последний коммит; `--no-edit` сохраняет сообщение.',
  fixup: '`--fixup` привязывает правку к hash; `--autosquash` расставляет fixup в todo rebase.',
  revert: 'Revert создаёт обратный diff новым коммитом; для merge нужен `-m 1`.',
  cherry: 'Pick переносит один коммит; `-n` — без commit, `--abort` отменяет операцию.',
  stash: 'Stash — стек WIP; `-u` включает untracked, `pop` применяет и удаляет запись.',
}

type CommitView = {
  id: string
  label: string
  hash: string
  tone?: 'active' | 'ok' | 'warn' | 'err' | 'ghost'
}

type HistoryFrame = {
  branch: string
  commits: CommitView[]
  remoteTip?: string
  stash?: string[]
  worktree: string
  worktreeClean?: boolean
  diverge?: string
  caption: string
}

function buildFrames(pattern: Pattern, caseId: CaseId): HistoryFrame[] {
  if (pattern === 'amend' && caseId === 'forgot') {
    return [
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'feat', hash: 'd4e5f6' },
        ],
        worktree: 'forgotten.js — unstaged',
        caption: 'tip без forgotten.js',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'feat', hash: 'd4e5f6', tone: 'active' },
        ],
        worktree: 'git add forgotten.js',
        worktreeClean: true,
        caption: 'файл в индексе',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2p', label: 'feat', hash: '9z8y7x', tone: 'ok' },
        ],
        worktree: 'clean',
        worktreeClean: true,
        caption: 'amend: тот же feat, hash d4e5f6 → 9z8y7x',
      },
    ]
  }

  if (pattern === 'amend' && caseId === 'pushed') {
    return [
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'fix', hash: 'd4e5f6' },
        ],
        remoteTip: 'd4e5f6',
        worktree: 'clean · origin/main совпадает',
        worktreeClean: true,
        caption: 'до amend',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2p', label: 'fix', hash: '9z8y7x', tone: 'warn' },
        ],
        remoteTip: 'd4e5f6',
        worktree: 'amend локально',
        diverge: 'origin/main → d4e5f6 · local main → 9z8y7x',
        caption: 'после amend без push — расхождение',
      },
    ]
  }

  if (pattern === 'fixup' && caseId === 'squash') {
    return [
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'feat', hash: 'd4e5f6' },
          { id: 'c3', label: 'tests', hash: '112233' },
        ],
        worktree: 'clean',
        worktreeClean: true,
        caption: 'серия до правки',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'feat', hash: 'd4e5f6', tone: 'active' },
          { id: 'c3', label: 'tests', hash: '112233' },
          { id: 'fx', label: 'fixup!', hash: '445566', tone: 'warn' },
        ],
        worktree: 'git commit --fixup d4e5f6',
        caption: 'fixup-коммит поверх серии',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2p', label: 'feat', hash: '778899', tone: 'ok' },
          { id: 'c3', label: 'tests', hash: '112233' },
        ],
        worktree: 'rebase -i --autosquash',
        worktreeClean: true,
        caption: 'fixup схлопнут в feat',
      },
    ]
  }

  if (pattern === 'fixup' && caseId === 'message') {
    return [
      {
        branch: 'main',
        commits: [
          { id: 'c2', label: 'feat', hash: 'd4e5f6', tone: 'active' },
          { id: 'sq', label: 'squash!', hash: 'aa1111', tone: 'warn' },
        ],
        worktree: 'squash → объединить сообщения',
        caption: 'squash предложит merge commit message',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c2p', label: 'feat', hash: 'bb2222', tone: 'ok' },
        ],
        worktree: 'сообщение squash сохранено в editor',
        worktreeClean: true,
        caption: 'после squash',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c2', label: 'feat', hash: 'd4e5f6', tone: 'active' },
          { id: 'fx', label: 'fixup!', hash: 'cc3333', tone: 'warn' },
        ],
        worktree: 'fixup → сообщение «typo» отброшено',
        caption: 'fixup не тащит текст правки',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c2p', label: 'feat', hash: 'dd4444', tone: 'ok' },
        ],
        worktree: 'осталось только сообщение feat',
        worktreeClean: true,
        caption: 'после fixup',
      },
    ]
  }

  if (pattern === 'revert' && caseId === 'safe') {
    return [
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'bad', hash: 'd4e5f6', tone: 'err' },
          { id: 'c3', label: 'next', hash: '112233' },
        ],
        worktree: 'bad уже в main',
        caption: 'до revert',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'bad', hash: 'd4e5f6', tone: 'ghost' },
          { id: 'c3', label: 'next', hash: '112233' },
          { id: 'rv', label: 'Revert bad', hash: '998877', tone: 'ok' },
        ],
        worktree: 'git revert d4e5f6',
        worktreeClean: true,
        caption: 'новый коммит отмены, bad виден в истории',
      },
    ]
  }

  if (pattern === 'revert' && caseId === 'vs-reset') {
    return [
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'bad', hash: 'd4e5f6', tone: 'err' },
          { id: 'c3', label: 'next', hash: '112233' },
        ],
        worktree: 'shared main · revert безопасен',
        caption: 'revert: история только растёт',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'bad', hash: 'd4e5f6', tone: 'ghost' },
          { id: 'c3', label: 'next', hash: '112233' },
          { id: 'rv', label: 'Revert bad', hash: '998877', tone: 'ok' },
        ],
        worktree: 'коллеги видят и bad, и revert',
        worktreeClean: true,
        caption: 'revert на shared',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c3', label: 'next', hash: '112233', tone: 'warn' },
        ],
        worktree: 'reset --hard до init — bad исчез из логa',
        diverge: 'на shared main reset ломает чужие clone',
        caption: 'reset переписал бы историю (опасно)',
      },
    ]
  }

  if (pattern === 'cherry' && caseId === 'hotfix') {
    return [
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'fix', hash: 'd4e5f6', tone: 'ok' },
        ],
        worktree: 'fix проверен на main',
        worktreeClean: true,
        caption: 'источник hotfix',
      },
      {
        branch: 'release/2.0',
        commits: [
          { id: 'r1', label: 'rel', hash: '111aaa' },
        ],
        worktree: 'git switch release/2.0',
        caption: 'целевая ветка',
      },
      {
        branch: 'release/2.0',
        commits: [
          { id: 'r1', label: 'rel', hash: '111aaa' },
          { id: 'r2', label: 'fix', hash: '222bbb', tone: 'ok' },
        ],
        worktree: 'git cherry-pick d4e5f6',
        worktreeClean: true,
        caption: 'тот же diff, новый hash 222bbb',
      },
    ]
  }

  if (pattern === 'cherry' && caseId === 'abort') {
    return [
      {
        branch: 'release/2.0',
        commits: [{ id: 'r1', label: 'rel', hash: '111aaa' }],
        worktree: 'pick конфликтует с rel',
        caption: 'cherry-pick в процессе',
      },
      {
        branch: 'release/2.0',
        commits: [{ id: 'r1', label: 'rel', hash: '111aaa' }],
        worktree: 'git cherry-pick --abort',
        worktreeClean: true,
        caption: 'release без нового коммита',
      },
    ]
  }

  if (pattern === 'stash' && caseId === 'switch') {
    return [
      {
        branch: 'feature',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'wip', hash: 'd4e5f6' },
        ],
        worktree: 'login.tsx — правки не закоммичены',
        caption: 'dirty tree блокирует switch',
      },
      {
        branch: 'feature',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'c2', label: 'wip', hash: 'd4e5f6' },
        ],
        stash: ['stash@{0}: login experiment'],
        worktree: 'clean после stash push',
        worktreeClean: true,
        caption: 'WIP в стеке',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'm2', label: 'hotfix', hash: '998877' },
        ],
        worktree: 'git switch main',
        worktreeClean: true,
        caption: 'переключились на main',
      },
      {
        branch: 'main',
        commits: [
          { id: 'c1', label: 'init', hash: 'a1b2c3' },
          { id: 'm2', label: 'hotfix', hash: '998877' },
        ],
        worktree: 'login.tsx вернулся после stash pop',
        caption: 'WIP снова в рабочей директории',
      },
    ]
  }

  // stash untracked
  return [
    {
      branch: 'main',
      commits: [{ id: 'c1', label: 'init', hash: 'a1b2c3' }],
      worktree: 'notes.txt (untracked) + app.js (modified)',
      caption: 'git stash без -u',
    },
    {
      branch: 'main',
      commits: [{ id: 'c1', label: 'init', hash: 'a1b2c3' }],
      stash: ['stash@{0}: only tracked'],
      worktree: 'notes.txt всё ещё на диске · app.js в stash',
      caption: 'untracked остался',
    },
    {
      branch: 'main',
      commits: [{ id: 'c1', label: 'init', hash: 'a1b2c3' }],
      stash: ['stash@{0}: with untracked'],
      worktree: 'git stash push -u — notes.txt тоже в stash',
      worktreeClean: true,
      caption: 'полный карман WIP',
    },
  ]
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  amend: [
    {
      id: 'amend-file',
      label: 'scripts/amend-forgotten.sh',
      note: 'Добавить забытый файл в последний коммит без смены сообщения.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

# ← AMEND: заменяет tip; hash изменится
git add src/forgotten.js
git commit --amend --no-edit

git log -1 --oneline`,
    },
    {
      id: 'amend-push',
      label: 'scripts/amend-after-push.sh',
      note: 'После amend на опубликованной ветке — только `--force-with-lease`.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

git commit --amend --no-edit   # ← переписан tip

# ← SHARED: без договорённости не пушить
git push --force-with-lease origin feature/login`,
    },
  ],
  fixup: [
    {
      id: 'fixup-rebase',
      label: 'scripts/fixup-autosquash.sh',
      note: 'Fixup привязан к hash целевого коммита; autosquash расставляет todo.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

TARGET=d4e5f6
git add .
git commit --fixup "$TARGET"    # ← FIXUP: правка к старому коммиту

git rebase -i --autosquash "\${TARGET}^"  # ← схлопнуть fixup в pick`,
    },
    {
      id: 'fixup-squash',
      label: 'scripts/squash-contrast.sh',
      note: 'Squash предложит объединить сообщения; fixup — нет.',
      executable: false,
      languageLabel: 'sh',
      code: `# fixup — сообщение правки отбрасывается
git commit --fixup abc1234 -m "typo in feat"

# squash — Git откроет editor для merge message
git commit --squash abc1234 -m "docs tweak"`,
    },
  ],
  revert: [
    {
      id: 'revert-main',
      label: 'scripts/revert-on-main.sh',
      note: 'Revert создаёт новый коммит; исходный остаётся в истории.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

BAD=d4e5f6
git revert "$BAD"              # ← REVERT: обратный diff новым коммитом

git log --oneline -3`,
    },
    {
      id: 'revert-merge',
      label: 'scripts/revert-merge.sh',
      note: 'Для merge-коммита укажите mainline через `-m 1`.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

MERGE=abc1234
git revert -m 1 "$MERGE"       # ← -m 1: первая родительская линия = main`,
    },
  ],
  cherry: [
    {
      id: 'cherry-hotfix',
      label: 'scripts/cherry-pick-hotfix.sh',
      note: 'Pick переносит diff; hash на release будет другой.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

FIX=d4e5f6
git switch release/2.0
git cherry-pick "$FIX"         # ← CHERRY-PICK: копия коммита

git log --oneline -2`,
    },
    {
      id: 'cherry-abort',
      label: 'scripts/cherry-pick-abort.sh',
      note: 'При конфликте — правки, add, `--continue` или `--abort`.',
      executable: false,
      languageLabel: 'sh',
      code: `git cherry-pick abc1234
# conflict …
git cherry-pick --abort        # ← вернуть release как до pick`,
    },
  ],
  stash: [
    {
      id: 'stash-switch',
      label: 'scripts/stash-before-switch.sh',
      note: 'Stash очищает дерево для switch; pop возвращает WIP.',
      executable: false,
      languageLabel: 'sh',
      code: `#!/usr/bin/env bash
set -euo pipefail

git stash push -m "login experiment"  # ← STASH: WIP в стек
git switch main
git stash pop                         # ← вернуть правки`,
    },
    {
      id: 'stash-untracked',
      label: 'scripts/stash-untracked.sh',
      note: 'Untracked не попадают в stash без `-u`.',
      executable: false,
      languageLabel: 'sh',
      code: `git stash push -m "tracked only"
git stash push -u -m "with untracked"  # ← -u: новые файлы тоже`,
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
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function commitClass(tone?: CommitView['tone']) {
  return [
    styles.commit,
    tone === 'active' ? styles.commitActive : '',
    tone === 'ok' ? styles.commitOk : '',
    tone === 'warn' ? styles.commitWarn : '',
    tone === 'err' ? styles.commitErr : '',
    tone === 'ghost' ? styles.commitGhost : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function HistoryViz({ frame }: { frame: HistoryFrame }) {
  return (
    <LabVizPanel title="История и рабочее дерево" meta={frame.branch}>
      <div className={styles.historyRow}>
        <span className={styles.branchLabel}>{frame.branch}</span>
        {frame.commits.map((c, i) => (
          <span key={`${c.id}-${c.hash}-${i}`} style={{ display: 'contents' }}>
            {i > 0 ? <span className={styles.arrow} aria-hidden>→</span> : null}
            <div className={commitClass(c.tone)}>
              <span className={styles.commitLabel}>{c.label}</span>
              <span className={styles.commitHash}>{c.hash}</span>
            </div>
          </span>
        ))}
      </div>

      {frame.remoteTip ? (
        <p className={styles.legend}>
          origin/main → <code>{frame.remoteTip}</code>
        </p>
      ) : null}

      {frame.stash && frame.stash.length > 0 ? (
        <div className={styles.stashStack}>
          <span className={styles.stashTitle}>stash</span>
          {frame.stash.map((s) => (
            <span key={s} className={`${styles.stashItem} ${styles.stashItemActive}`}>
              {s}
            </span>
          ))}
        </div>
      ) : null}

      <div
        className={[
          styles.worktree,
          frame.worktreeClean ? styles.worktreeClean : styles.worktreeDirty,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {frame.worktree}
      </div>

      {frame.diverge ? <p className={styles.diverge}>{frame.diverge}</p> : null}
      <p className={styles.legend}>{frame.caption}</p>
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
    <div className={styles.patternRow}>
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

export function GitAmendFixupLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('amend')
  const [caseId, setCaseId] = useState<CaseId>('forgot')
  const [frameIdx, setFrameIdx] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const frames = buildFrames(pattern, caseId)
  const frame = frames[Math.min(frameIdx, frames.length - 1)]!

  const resetViz = () => {
    setFrameIdx(0)
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

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    const seq = buildFrames(pattern, caseId)
    const stepFns = seq.map((_, i) => () => setFrameIdx(i))

    playTimeline(tlRef, stepFns, () => {
      setBusy(false)
      const last = seq[seq.length - 1]!
      log('ok', last.caption)

      if (pattern === 'amend' && caseId === 'forgot') {
        log('info', 'git add forgotten.js')
        log('ok', 'commit --amend → hash d4e5f6 → 9z8y7x')
        setHint('tip переписан, сообщение feat сохранено')
      } else if (pattern === 'amend' && caseId === 'pushed') {
        log('warn', 'local main ≠ origin/main')
        setHint('нужен force-with-lease или новый коммит')
      } else if (pattern === 'fixup' && caseId === 'squash') {
        log('info', 'fixup! поверх серии')
        log('ok', 'autosquash схлопнул правку в feat')
        setHint('fixup-коммит исчез из лога')
      } else if (pattern === 'fixup' && caseId === 'message') {
        log('info', 'squash → merge message')
        log('ok', 'fixup → сообщение правки отброшено')
        setHint('fixup для мелких правок без лишнего текста')
      } else if (pattern === 'revert' && caseId === 'safe') {
        log('ok', 'Revert bad добавлен поверх next')
        setHint('bad остаётся в истории')
      } else if (pattern === 'revert' && caseId === 'vs-reset') {
        log('ok', 'revert — новый коммит')
        log('warn', 'reset на shared main переписал бы лог')
        setHint('на main выбирай revert, не reset')
      } else if (pattern === 'cherry' && caseId === 'hotfix') {
        log('info', 'pick d4e5f6 → release/2.0')
        log('ok', 'новый hash 222bbb')
        setHint('diff тот же, коммит другой')
      } else if (pattern === 'cherry' && caseId === 'abort') {
        log('warn', 'conflict при pick')
        log('info', 'cherry-pick --abort')
        setHint('release без hotfix-коммита')
      } else if (pattern === 'stash' && caseId === 'switch') {
        log('info', 'stash push → switch main → pop')
        log('ok', 'WIP вернулся в worktree')
        setHint('история коммитов не менялась')
      } else {
        log('warn', 'stash без -u не прячет untracked')
        log('ok', 'stash push -u забирает notes.txt')
        setHint('untracked — явный флаг -u')
      }
    })
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('amend')
    setCaseId('forgot')
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
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <HistoryViz frame={frame} />

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
      title="Amend, fixup, revert, cherry-pick, stash"
      lead="На схеме — как меняется история, remote и stash; на «Код» — те же команды в shell-скриптах."
      problem={problem}
      code={code}
    />
  )
}
