import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './GitResetTagLogDiffReflogLab.module.css'

const TOPIC_ID = '17-git-reset-tag-log-diff-reflog'
const STEP = 0.65

type Pattern = 'reset' | 'diff' | 'reflog'
type ResetCase = 'soft' | 'hard'
type DiffCase = 'unstaged' | 'staged'
type ReflogCase = 'lost' | 'recovery'
type CaseId = ResetCase | DiffCase | ReflogCase

type ResetPhase = 'idle' | 'move' | 'sync' | 'done'
type DiffPhase = 'idle' | 'highlight' | 'done'
type ReflogPhase = 'idle' | 'mistake' | 'scan' | 'restore' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'reset', label: 'reset' },
  { id: 'diff', label: 'diff' },
  { id: 'reflog', label: 'reflog' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  reset: [
    { id: 'soft', label: '--soft' },
    { id: 'hard', label: '--hard' },
  ],
  diff: [
    { id: 'unstaged', label: 'git diff' },
    { id: 'staged', label: '--staged' },
  ],
  reflog: [
    { id: 'lost', label: 'ошибка' },
    { id: 'recovery', label: 'HEAD@{1}' },
  ],
}

const HEAD_CODE = `export function greet() {
  return 'hello';
}`

const INDEX_CODE = `export function greet() {
  return 'hello there';
}`

const WORKTREE_CODE = `export function greet() {
  return 'hello world';
}`

const PAIN: Record<Pattern, ReactNode> = {
  reset: (
    <>
      <code>reset</code> двигает ветку и по режиму синхронизирует index и рабочие файлы — от
      «пересобрать коммит» до полного сброса WIP.
    </>
  ),
  diff: (
    <>
      У Git три слоя: HEAD, index и working tree. <code>diff</code> без флагов и{' '}
      <code>--staged</code> сравнивают разные пары — перед коммитом смотрят оба.
    </>
  ),
  reflog: (
    <>
      Reflog — локальный журнал перемещений HEAD. После ошибочного <code>reset --hard</code> коммит
      часто находят через <code>HEAD@{'{n}'}</code>, а не через <code>log</code>.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  soft: (
    <>
      <code>reset --soft HEAD~1</code>: ветка откатывается, index и файлы остаются — правки готовы
      к новому коммиту.
    </>
  ),
  hard: (
    <>
      <code>reset --hard HEAD~1</code>: ветка, index и working tree совпадают с целевым коммитом —
      незакоммиченная работа теряется.
    </>
  ),
  unstaged: (
    <>
      <code>git diff</code> показывает разницу working tree ↔ index — правки, ещё не в staging.
    </>
  ),
  staged: (
    <>
      <code>git diff --staged</code> сравнивает index ↔ HEAD — что попадёт в следующий commit.
    </>
  ),
  lost: (
    <>
      После <code>reset --hard</code> ветка указывает на старый коммит; «потерянный» commit виден
      только в reflog.
    </>
  ),
  recovery: (
    <>
      <code>reset --hard HEAD@{'{1}'}</code> возвращает ветку к записи reflog до ошибочного сброса.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  reset: 'Три режима reset и log с тегом — команды из повседневной диагностики истории.',
  diff: 'Три состояния файла и пары сравнения diff / diff --staged / diff HEAD.',
  reflog: 'Reflog и восстановление после ошибочного hard reset.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  reset: [
    {
      id: 'reset-modes',
      label: 'git-reset.sh',
      note: 'soft / mixed / hard — разная глубина сброса; mixed — режим по умолчанию.',
      executable: false,
      languageLabel: 'sh',
      code: `# ═══════════════════════════════════════════
# RESET ← три уровня сброса
# ═══════════════════════════════════════════
git reset --soft HEAD~1   # ← только ветка; index + файлы сохраняются
git reset --mixed HEAD~1  # ← ветка + index; файлы на диске остаются
git reset --hard abc1234  # ← всё = целевой commit (опасно для WIP)

git reset HEAD file.js    # ← убрать файл из index (unstage)`,
    },
    {
      id: 'log-tag',
      label: 'git-log-tag.sh',
      note: 'log — навигация по истории; annotated tag — метка релиза на commit.',
      executable: false,
      languageLabel: 'sh',
      code: `git log --oneline --graph --decorate --all
git log -p -n 5
git log main..feature/login   # ← commits в feature, которых нет в main

git tag -a v1.0.0 -m "Release 1.0.0"  # ← annotated tag
git show v1.0.0
git push origin v1.0.0        # ← tag не уезжает с push ветки`,
    },
  ],
  diff: [
    {
      id: 'diff-states',
      label: 'git-diff.sh',
      note: 'Без аргументов — worktree vs index; --staged — index vs HEAD.',
      executable: false,
      languageLabel: 'sh',
      code: `# ═══════════════════════════════════════════
# DIFF ← какая пара сравнивается
# ═══════════════════════════════════════════
git diff                    # ← working tree ↔ index (unstaged)
git diff --staged           # ← index ↔ HEAD (что в commit)
git diff HEAD               # ← все локальные правки ↔ HEAD
git diff main...HEAD        # ← изменения ветки от merge-base`,
    },
    {
      id: 'diff-file',
      label: 'git-diff-file.sh',
      note: 'Сравнение конкретного файла или двух ревизий.',
      executable: false,
      languageLabel: 'sh',
      code: `git diff -- app.js
git diff --staged -- app.js
git diff abc1234 def5678 -- src/app.js

# перед commit — оба:
git diff && git diff --staged`,
    },
  ],
  reflog: [
    {
      id: 'reflog-recover',
      label: 'git-reflog.sh',
      note: 'Reflog локален; HEAD@{n} — n-я запись назад во времени.',
      executable: false,
      languageLabel: 'sh',
      code: `# ═══════════════════════════════════════════
# REFLOG ← локальный журнал HEAD
# ═══════════════════════════════════════════
git reflog
git reflog show main

git reset --hard HEAD@{1}   # ← вернуться к записи до ошибки
git switch -c recovery abc1234  # ← или новая ветка на «потерянный» commit`,
    },
  ],
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
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

function ResetViz({
  phase,
  caseId,
  headRef,
}: {
  phase: ResetPhase
  caseId: ResetCase
  headRef: MutableRefObject<HTMLDivElement | null>
}) {
  const hard = caseId === 'hard'
  const moved = phase !== 'idle'
  const synced = phase === 'sync' || phase === 'done'
  const headOnC2 = moved
  const indexSynced = hard && synced
  const workSynced = hard && synced

  return (
    <LabVizPanel title="reset HEAD~1" meta={hard ? 'ветка + index + файлы' : 'только ветка'}>
      <div className={styles.graphRow}>
        <div className={`${styles.commit} ${headOnC2 ? styles.commitHead : ''}`}>
          <span className={styles.commitHash}>c1a2b3</span>
          <span className={styles.commitMsg}>init</span>
        </div>
        <span className={styles.graphArrow}>→</span>
        <div
          ref={headRef}
          className={`${styles.commit} ${headOnC2 ? styles.commitHead : ''} ${styles.commitTag}`}
        >
          <span className={styles.tagChip}>v0.9</span>
          <span className={styles.commitHash}>d4e5f6</span>
          <span className={styles.commitMsg}>add feature</span>
          {headOnC2 ? <span className={styles.branchLabel}>main →</span> : null}
        </div>
        <span className={styles.graphArrow}>→</span>
        <div
          className={[
            styles.commit,
            !headOnC2 ? styles.commitHead : '',
            headOnC2 ? styles.commitGhost : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.commitHash}>g7h8i9</span>
          <span className={styles.commitMsg}>fix typo</span>
          {!headOnC2 ? <span className={styles.branchLabel}>main →</span> : null}
        </div>
      </div>

      <div className={styles.layers}>
        <div className={`${styles.layer} ${moved && !indexSynced ? styles.layerActive : ''}`}>
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>HEAD</span>
            <span className={styles.layerHint}>{headOnC2 ? 'd4e5f6 · add feature' : 'g7h8i9 · fix typo'}</span>
          </div>
        </div>
        <div className={`${styles.layer} ${moved && !indexSynced ? styles.layerActive : ''}`}>
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>Index</span>
            <span className={styles.layerHint}>
              {indexSynced ? 'd4e5f6 (сброшен)' : 'g7h8i9 · staged'}
            </span>
          </div>
          {!indexSynced ? <pre className={styles.layerCode}>{INDEX_CODE}</pre> : null}
        </div>
        <div className={`${styles.layer} ${workSynced ? styles.layerActive : moved && !hard ? styles.layerActive : ''}`}>
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>Working tree</span>
            <span className={styles.layerHint}>
              {workSynced ? 'd4e5f6 (сброшен)' : 'WIP на диске'}
            </span>
          </div>
          {!workSynced ? <pre className={styles.layerCode}>{WORKTREE_CODE}</pre> : null}
        </div>
      </div>
    </LabVizPanel>
  )
}

function DiffViz({ phase, caseId }: { phase: DiffPhase; caseId: DiffCase }) {
  const staged = caseId === 'staged'
  const active = phase !== 'idle'

  return (
    <LabVizPanel
      title="app.js · три слоя"
      meta={staged ? 'index ↔ HEAD' : 'working tree ↔ index'}
    >
      <div className={styles.layers}>
        <div className={`${styles.layer} ${staged && active ? styles.layerActive : ''}`}>
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>HEAD</span>
            <span className={styles.layerHint}>последний commit</span>
          </div>
          <pre className={styles.layerCode}>{HEAD_CODE}</pre>
        </div>

        <div className={styles.diffArrowRow}>
          <span
            className={[styles.diffArrow, !staged && active ? styles.diffArrowActive : '']
              .filter(Boolean)
              .join(' ')}
          >
            {!staged && active ? '↕ git diff' : '↓'}
          </span>
        </div>

        <div
          className={`${styles.layer} ${(!staged && active) || (staged && active) ? styles.layerActive : ''}`}
        >
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>Index</span>
            <span className={styles.layerHint}>staging area</span>
          </div>
          <pre className={styles.layerCode}>{INDEX_CODE}</pre>
        </div>

        {!staged ? (
          <>
            <div className={styles.diffArrowRow}>
              <span
                className={[styles.diffArrow, active ? styles.diffArrowActive : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                {active ? '↕ git diff' : '↓'}
              </span>
            </div>
            <div className={`${styles.layer} ${active ? styles.layerActive : ''}`}>
              <div className={styles.layerHead}>
                <span className={styles.layerTitle}>Working tree</span>
                <span className={styles.layerHint}>файлы на диске</span>
              </div>
              <pre className={styles.layerCode}>{WORKTREE_CODE}</pre>
            </div>
          </>
        ) : (
          <div className={styles.diffArrowRow}>
            <span
              className={[styles.diffArrow, active ? styles.diffArrowActive : '']
                .filter(Boolean)
                .join(' ')}
            >
              {active ? '↕ git diff --staged' : '↑ к HEAD'}
            </span>
          </div>
        )}
      </div>
    </LabVizPanel>
  )
}

function ReflogViz({
  phase,
  caseId,
  targetRef,
}: {
  phase: ReflogPhase
  caseId: ReflogCase
  targetRef: MutableRefObject<HTMLDivElement | null>
}) {
  const recover = caseId === 'recovery'
  const afterMistake = phase === 'mistake' || phase === 'scan' || phase === 'restore' || phase === 'done'
  const restored = recover && (phase === 'restore' || phase === 'done')

  return (
    <LabVizPanel title="reflog main" meta={recover ? 'восстановление через HEAD@{1}' : 'commit пропал из ветки'}>
      <div className={styles.reflogList}>
        <div
          className={[
            styles.reflogEntry,
            !restored && afterMistake ? styles.reflogActive : restored ? styles.reflogGhost : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.reflogIdx}>HEAD@{'{0}'}</span>
          <span className={styles.reflogAction}>
            {restored ? 'reset: moving to HEAD@{1}' : 'reset: moving to HEAD~1'}
          </span>
          <span className={styles.reflogHash}>d4e5f6</span>
        </div>
        <div
          ref={targetRef}
          className={[
            styles.reflogEntry,
            restored ? styles.reflogTarget : afterMistake ? styles.reflogGhost : styles.reflogActive,
            recover && phase === 'scan' ? styles.reflogActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.reflogIdx}>HEAD@{'{1}'}</span>
          <span className={styles.reflogAction}>commit: fix typo</span>
          <span className={styles.reflogHash}>g7h8i9</span>
        </div>
        <div className={styles.reflogEntry}>
          <span className={styles.reflogIdx}>HEAD@{'{2}'}</span>
          <span className={styles.reflogAction}>commit: add feature</span>
          <span className={styles.reflogHash}>d4e5f6</span>
        </div>
      </div>
      <p className={styles.reflogNote}>
        {restored
          ? 'main снова на g7h8i9 — commit вернулся из reflog.'
          : afterMistake
            ? 'В git log commit g7h8i9 не виден — ветка на d4e5f6.'
            : 'main → g7h8i9 · последний commit «fix typo».'}
      </p>
    </LabVizPanel>
  )
}

export function GitResetTagLogDiffReflogLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('reset')
  const [caseId, setCaseId] = useState<CaseId>('soft')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [resetPhase, setResetPhase] = useState<ResetPhase>('idle')
  const [diffPhase, setDiffPhase] = useState<DiffPhase>('idle')
  const [reflogPhase, setReflogPhase] = useState<ReflogPhase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const targetRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setResetPhase('idle')
    setDiffPhase('idle')
    setReflogPhase('idle')
    setHint(null)
    for (const el of [headRef.current, targetRef.current]) {
      if (el) gsap.set(el, { clearProps: 'transform,opacity,scale' })
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

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    if (pattern === 'reset') {
      const hard = caseId === 'hard'
      playTimeline(
        tlRef,
        [
          () => setResetPhase('move'),
          () => setResetPhase(hard ? 'sync' : 'done'),
          () => {
            setResetPhase('done')
            if (hard) {
              log('warn', 'reset --hard HEAD~1 → main @ d4e5f6')
              log('err', 'index + worktree сброшены — WIP потерян')
              setHint('hard синхронизирует все три слоя')
            } else {
              log('ok', 'reset --soft HEAD~1 → main @ d4e5f6')
              log('info', 'index и worktree без изменений')
              setHint('soft — правки остаются staged / на диске')
            }
          },
        ],
        (tl) => {
          if (!headRef.current) return
          gsap.set(headRef.current, { scale: 0.92, opacity: 0.5 })
          tl.to(headRef.current, { scale: 1, opacity: 1 }, 0)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'diff') {
      const staged = caseId === 'staged'
      playTimeline(
        tlRef,
        [
          () => setDiffPhase('highlight'),
          () => {
            setDiffPhase('done')
            if (staged) {
              log('ok', 'git diff --staged → index vs HEAD')
              setHint('staged diff — что войдёт в commit')
            } else {
              log('ok', 'git diff → worktree vs index')
              setHint('unstaged diff — правки вне staging')
            }
          },
        ],
        null,
        () => setBusy(false),
      )
      return
    }

    const recover = caseId === 'recovery'
    playTimeline(
      tlRef,
      [
        () => setReflogPhase('mistake'),
        () => setReflogPhase(recover ? 'scan' : 'done'),
        () => {
          if (recover) setReflogPhase('restore')
        },
        () => {
          setReflogPhase('done')
          if (recover) {
            log('ok', 'reset --hard HEAD@{1} → g7h8i9')
            setHint('reflog хранит старые позиции HEAD локально')
          } else {
            log('warn', 'reset --hard HEAD~1 — g7h8i9 только в reflog')
            setHint('log не покажет «потерянный» commit')
          }
        },
      ],
      (tl) => {
        if (!targetRef.current || !recover) return
        gsap.set(targetRef.current, { scale: 0.92, opacity: 0.45 })
        tl.to(targetRef.current, { scale: 1, opacity: 1 }, STEP)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('reset')
    setCaseId('soft')
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

      {pattern === 'reset' ? (
        <ResetViz phase={resetPhase} caseId={caseId as ResetCase} headRef={headRef} />
      ) : null}
      {pattern === 'diff' ? <DiffViz phase={diffPhase} caseId={caseId as DiffCase} /> : null}
      {pattern === 'reflog' ? (
        <ReflogViz phase={reflogPhase} caseId={caseId as ReflogCase} targetRef={targetRef} />
      ) : null}

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
      title="reset · diff · reflog"
      lead="Три слоя Git, режимы reset, пары diff и восстановление через reflog."
      problem={problem}
      code={code}
    />
  )
}
