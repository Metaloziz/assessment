import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './GitGrepLab.module.css'

const TOPIC_ID = '33-git-grep'
const STEP = 0.65

type Pattern = 'scope' | 'revision' | 'filter'
type ScopeCase = 'grep' | 'git-grep'
type RevisionCase = 'branch' | 'commit'
type FilterCase = 'pathspec' | 'cached'
type CaseId = ScopeCase | RevisionCase | FilterCase

type Phase = 'idle' | 'scan' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'scope', label: 'vs grep' },
  { id: 'revision', label: 'ревизия' },
  { id: 'filter', label: 'фильтры' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  scope: [
    { id: 'grep', label: 'grep -r' },
    { id: 'git-grep', label: 'git grep' },
  ],
  revision: [
    { id: 'branch', label: 'develop' },
    { id: 'commit', label: 'abc1234' },
  ],
  filter: [
    { id: 'pathspec', label: "-- '*.js'" },
    { id: 'cached', label: '--cached' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  scope: (
    <>
      <code>git grep</code> ищет только в tracked-файлах и уважает <code>.gitignore</code> — меньше
      шума, чем у «голого» grep по каталогу.
    </>
  ),
  revision: (
    <>
      Поиск можно привязать к ветке или коммиту: <code>git grep "deprecated" develop</code> — строка
      в истории, а не только в рабочей копии.
    </>
  ),
  filter: (
    <>
      Pathspec сужает пути; <code>--cached</code> смотрит index без unstaged-правок на диске — удобно
      перед commit.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  grep: (
    <>
      <code>grep -r TODO .</code> находит совпадения и в <code>node_modules</code>, и в untracked —
      лишний шум.
    </>
  ),
  'git-grep': (
    <>
      <code>git grep TODO</code> — только tracked: совпадения в <code>src/</code>, игнор и untracked
      пропускаются.
    </>
  ),
  branch: (
    <>
      На <code>main</code> строки нет; <code>git grep deprecated develop</code> находит её в tip
      develop.
    </>
  ),
  commit: (
    <>
      <code>git grep deprecated abc1234</code> ищет в снимке коммита — даже если ветка уже ушла
      вперёд.
    </>
  ),
  pathspec: (
    <>
      <code>git grep import -- '*.js'</code> не смотрит <code>.ts</code> и конфиги — только JS в
      tracked.
    </>
  ),
  cached: (
    <>
      <code>git grep --cached secret</code> видит staged-версию; unstaged правка на диске в вывод не
      попадает.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  scope: 'Базовый поиск, флаги -n/-i/-c и контраст с shell grep по каталогу.',
  revision: 'Поиск в ветке и коммите; для «когда строка появилась» — git log -S / -G.',
  filter: 'Pathspec, --cached и типичные комбинации перед commit.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  scope: [
    {
      id: 'grep-basics',
      label: 'git-grep-basics.sh',
      note: 'Tracked-only; -n номера строк, -i без регистра, -c счётчик совпадений.',
      executable: false,
      languageLabel: 'sh',
      code: `# ═══════════════════════════════════════════
# GIT GREP ← только tracked-файлы
# ═══════════════════════════════════════════
git grep "TODO"
git grep -n --color "deprecated"     # ← номера строк
git grep -i "error"                  # ← без учёта регистра
git grep -c "function"               # ← count per file

# vs shell grep — шум из .gitignore / untracked:
grep -r "TODO" .                     # ← node_modules, dist, tmp…`,
    },
    {
      id: 'gitignore',
      label: '.gitignore',
      note: 'git grep не лезет в игнорируемые пути; grep -r — лезет.',
      executable: false,
      languageLabel: 'gitignore',
      code: `node_modules/
dist/
.env
*.log
coverage/

# git grep "secret" — не ищет в .env на диске
# grep -r "secret" . — найдёт, если файл есть`,
    },
  ],
  revision: [
    {
      id: 'grep-revision',
      label: 'git-grep-revision.sh',
      note: 'Второй аргумент — tree-ish: ветка, tag, commit.',
      executable: false,
      languageLabel: 'sh',
      code: `# ═══════════════════════════════════════════
# REVISION ← поиск не только в HEAD
# ═══════════════════════════════════════════
git grep "deprecated" develop
git grep "import React" v2.0.0
git grep -n "legacy" abc1234 -- src/

git grep "TODO" main..feature/login  # ← diff-range (осторожно с синтаксисом)`,
    },
    {
      id: 'log-pickaxe',
      label: 'git-log-pickaxe.sh',
      note: 'Когда строка появилась/исчезла — pickaxe, не grep.',
      executable: false,
      languageLabel: 'sh',
      code: `# HISTORY ← git grep не заменяет pickaxe
git log -S "removedApi" --oneline    # ← добавление/удаление строки
git log -G "function\\s+oldName" -p  # ← regex по diff

git grep "removedApi" HEAD           # ← есть ли строка сейчас`,
    },
  ],
  filter: [
    {
      id: 'grep-pathspec',
      label: 'git-grep-pathspec.sh',
      note: 'Pathspec после -- ; без него Git ищет по всем tracked.',
      executable: false,
      languageLabel: 'sh',
      code: `# ═══════════════════════════════════════════
# PATHSPEC ← фильтр путей
# ═══════════════════════════════════════════
git grep "import" -- '*.js'
git grep "config" -- src/ tests/
git grep -l "eslint-disable" -- ':!*.min.js'  # ← exclude pathspec

git grep -n "TODO" --cached -- app.js        # ← index + один файл`,
    },
    {
      id: 'grep-cached',
      label: 'git-grep-cached.sh',
      note: '--cached — index; без флага — working tree (и index для совпадений).',
      executable: false,
      languageLabel: 'sh',
      code: `# INDEX ← staged vs unstaged
git add app.js
# на диске правка ещё не в index

git grep "secret" --cached   # ← только staged snapshot
git grep "secret" app.js     # ← working tree (unstaged тоже)

# перед commit — оба:
git grep "debug" && git grep --cached "debug"`,
    },
  ],
}

type FileEntry = {
  id: string
  path: string
  tag?: 'ignored' | 'untracked' | 'tracked'
  line: string
  match?: boolean
}

const SCOPE_FILES: FileEntry[] = [
  { id: 'app', path: 'src/app.js', tag: 'tracked', line: '// TODO: refactor auth', match: true },
  { id: 'util', path: 'src/util.js', tag: 'tracked', line: 'export const TODO = 1', match: true },
  {
    id: 'nm',
    path: 'node_modules/pkg/index.js',
    tag: 'ignored',
    line: '/* TODO vendor */',
    match: true,
  },
  { id: 'dist', path: 'dist/bundle.js', tag: 'ignored', line: '// TODO build', match: true },
  { id: 'tmp', path: 'tmp/scratch.js', tag: 'untracked', line: 'const TODO = true', match: true },
]

const API_MAIN = `export function fetchUser() {
  return api.get('/users');
}`

const API_DEVELOP = `/** @deprecated use fetchProfile */
export function fetchUser() {
  return api.get('/users');
}`

const INDEX_SNIPPET = `const API_KEY = 'secret-staged';
export const ready = true;`

const WORKTREE_SNIPPET = `const API_KEY = 'secret-staged';
export const ready = true;
// debug: remove before prod`

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

function ScopeViz({
  phase,
  caseId,
  hitRef,
}: {
  phase: Phase
  caseId: ScopeCase
  hitRef: MutableRefObject<HTMLDivElement | null>
}) {
  const shellGrep = caseId === 'grep'
  const done = phase === 'done'

  const visibleHits = SCOPE_FILES.filter((f) => {
    if (!done) return false
    if (shellGrep) return f.match
    return f.tag === 'tracked' && f.match
  }).length

  const noiseHits = shellGrep && done ? SCOPE_FILES.filter((f) => f.tag !== 'tracked').length : 0

  return (
    <LabVizPanel
      title='поиск "TODO"'
      meta={shellGrep ? 'grep -r по каталогу' : 'git grep · tracked only'}
    >
      <div className={styles.queryBar}>
        <span className={styles.queryLabel}>запрос</span>
        <span className={styles.queryText}>{shellGrep ? 'grep -r TODO .' : 'git grep TODO'}</span>
      </div>

      <div className={styles.repoRoot}>
        {SCOPE_FILES.map((file) => {
          const isHit = done && file.match && (shellGrep || file.tag === 'tracked')
          const isNoise = done && shellGrep && file.tag !== 'tracked' && file.match
          const isSkip = done && !shellGrep && file.tag !== 'tracked'
          const scanning = phase === 'scan'

          return (
            <div
              key={file.id}
              ref={file.id === 'app' ? hitRef : undefined}
              className={[
                styles.fileRow,
                isSkip ? styles.fileRowSkip : '',
                scanning ? styles.fileRowScan : '',
                isHit && !isNoise ? styles.fileRowHit : '',
                isNoise ? styles.fileRowNoise : '',
                !done && file.tag !== 'tracked' ? styles.fileRowMuted : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.filePath}>{file.path}</span>
              {file.tag === 'ignored' ? (
                <span className={`${styles.fileTag} ${styles.fileTagIgnored}`}>.gitignore</span>
              ) : null}
              {file.tag === 'untracked' ? (
                <span className={`${styles.fileTag} ${styles.fileTagUntracked}`}>untracked</span>
              ) : null}
              <span
                className={[styles.fileLine, isHit || isNoise ? styles.fileLineHit : styles.fileLineDim]
                  .filter(Boolean)
                  .join(' ')}
              >
                {file.line}
              </span>
            </div>
          )
        })}
      </div>

      {done ? (
        <div className={styles.summaryRow}>
          <span className={`${styles.summaryChip} ${styles.summaryOk}`}>{visibleHits} hit(s)</span>
          {noiseHits > 0 ? (
            <span className={`${styles.summaryChip} ${styles.summaryWarn}`}>
              +{noiseHits} шум (ignore/untracked)
            </span>
          ) : (
            <span className={styles.summaryChip}>ignore/untracked пропущены</span>
          )}
        </div>
      ) : null}
    </LabVizPanel>
  )
}

function RevisionViz({
  phase,
  caseId,
  branchRef,
}: {
  phase: Phase
  caseId: RevisionCase
  branchRef: MutableRefObject<HTMLDivElement | null>
}) {
  const onDevelop = caseId === 'branch'
  const onCommit = caseId === 'commit'
  const active = phase !== 'idle'
  const found = phase === 'done'

  const query = onDevelop ? 'git grep deprecated develop' : 'git grep deprecated abc1234'
  const branchLabel = onDevelop ? 'develop' : 'abc1234'
  const code = found
    ? onDevelop || onCommit
      ? API_DEVELOP
      : API_MAIN
    : onDevelop
      ? API_MAIN
      : API_DEVELOP

  const showMatch = found && (onDevelop || onCommit)

  return (
    <LabVizPanel title="src/api.js" meta={onDevelop ? 'ветка develop' : 'снимок коммита'}>
      <div className={styles.branchRow}>
        <span className={`${styles.branchChip} ${!onDevelop && active ? styles.branchGhost : ''}`}>
          main
        </span>
        <span className={styles.revisionArrow}>·</span>
        <span
          ref={branchRef}
          className={[
            styles.branchChip,
            onDevelop && active ? styles.branchActive : '',
            onCommit ? styles.branchGhost : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {branchLabel}
        </span>
      </div>

      <div className={styles.queryBar}>
        <span className={styles.queryLabel}>запрос</span>
        <span className={styles.queryText}>{query}</span>
      </div>

      <div className={`${styles.revisionFile} ${active ? styles.revisionFileActive : ''}`}>
        <div className={styles.revisionHead}>
          <span>{onDevelop ? 'develop:HEAD' : 'tree abc1234'}</span>
          <span>{showMatch ? '1 match' : active && !found ? '…' : '0 matches'}</span>
        </div>
        <pre className={styles.revisionCode}>
          {showMatch ? (
            <>
              {`/** `}
              <span className={styles.revisionMark}>@deprecated</span>
              {` use fetchProfile */}
export function fetchUser() {
  return api.get('/users');
}`}
            </>
          ) : (
            code
          )}
        </pre>
      </div>

      <p className={styles.revisionNote}>
        {showMatch
          ? 'Строка есть в выбранной ревизии — в tip main её уже нет.'
          : active
            ? 'Сканируем снимок дерева Git, не каталог на диске.'
            : 'main без @deprecated — выберите develop или старый commit.'}
      </p>
    </LabVizPanel>
  )
}

function FilterViz({ phase, caseId }: { phase: Phase; caseId: FilterCase }) {
  const pathspec = caseId === 'pathspec'
  const active = phase !== 'idle'
  const done = phase === 'done'

  if (pathspec) {
    return (
      <LabVizPanel title='git grep import -- "*.js"' meta="pathspec после --">
        <div className={styles.repoRoot}>
          {[
            { path: 'src/app.js', ext: 'js', hit: true },
            { path: 'src/util.js', ext: 'js', hit: true },
            { path: 'src/types.ts', ext: 'ts', hit: false },
            { path: 'package.json', ext: 'json', hit: false },
          ].map((file) => {
            const inScope = file.ext === 'js'
            const isHit = done && inScope && file.hit
            const muted = done && !inScope

            return (
              <div
                key={file.path}
                className={[
                  styles.fileRow,
                  muted ? styles.fileRowSkip : '',
                  phase === 'scan' && inScope ? styles.fileRowScan : '',
                  isHit ? styles.fileRowHit : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={styles.filePath}>{file.path}</span>
                <span className={styles.fileTag}>{file.ext}</span>
                <span
                  className={[styles.fileLine, isHit ? styles.fileLineHit : styles.fileLineDim]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {file.ext === 'js' ? "import { api } from './api'" : '— вне pathspec'}
                </span>
              </div>
            )
          })}
        </div>
        {done ? (
          <div className={styles.summaryRow}>
            <span className={`${styles.summaryChip} ${styles.summaryOk}`}>2 файла · *.js</span>
            <span className={styles.summaryChip}>.ts / json не сканировались</span>
          </div>
        ) : null}
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title='git grep --cached "secret"' meta="index vs working tree">
      <div className={styles.layerPair}>
        <div
          className={[
            styles.layerBox,
            active ? styles.layerBoxActive : '',
            done ? '' : styles.layerBoxMuted,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>Index</span>
            <span className={styles.layerHint}>--cached</span>
          </div>
          <pre className={styles.layerCode}>{INDEX_SNIPPET}</pre>
        </div>
        <div
          className={[
            styles.layerBox,
            done ? styles.layerBoxMuted : active ? styles.layerBoxActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>Working tree</span>
            <span className={styles.layerHint}>unstaged +</span>
          </div>
          <pre className={styles.layerCode}>{WORKTREE_SNIPPET}</pre>
        </div>
      </div>
      {done ? (
        <p className={styles.revisionNote}>
          <code>--cached</code> нашёл <code>secret-staged</code> в index; строка{' '}
          <code>debug: remove</code> только на диске — в вывод не попала.
        </p>
      ) : null}
    </LabVizPanel>
  )
}

export function GitGrepLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('scope')
  const [caseId, setCaseId] = useState<CaseId>('grep')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const hitRef = useRef<HTMLDivElement | null>(null)
  const branchRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    for (const el of [hitRef.current, branchRef.current]) {
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

    playTimeline(
      tlRef,
      [
        () => setPhase('scan'),
        () => {
          setPhase('done')
          if (pattern === 'scope') {
            if (caseId === 'grep') {
              log('warn', 'grep -r TODO → 5 файлов')
              log('info', '2 tracked + 3 ignore/untracked')
              setHint('shell grep не знает про .gitignore')
            } else {
              log('ok', 'git grep TODO → 2 файла')
              log('info', 'node_modules, dist, tmp пропущены')
              setHint('только tracked — меньше шума')
            }
          } else if (pattern === 'revision') {
            log('ok', `git grep deprecated ${caseId === 'branch' ? 'develop' : 'abc1234'}`)
            log('info', '1 match · src/api.js')
            setHint('поиск в tree-ish, не только HEAD')
          } else if (caseId === 'pathspec') {
            log('ok', 'git grep import -- *.js → 2 hits')
            setHint('pathspec после -- сужает скан')
          } else {
            log('ok', 'git grep --cached secret → index')
            log('info', 'unstaged debug не в выводе')
            setHint('--cached = staged snapshot')
          }
        },
      ],
      (tl) => {
        const el = pattern === 'scope' ? hitRef.current : branchRef.current
        if (!el) return
        gsap.set(el, { scale: 0.94, opacity: 0.55 })
        tl.to(el, { scale: 1, opacity: 1 }, STEP)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('scope')
    setCaseId('grep')
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

      {pattern === 'scope' ? (
        <ScopeViz phase={phase} caseId={caseId as ScopeCase} hitRef={hitRef} />
      ) : null}
      {pattern === 'revision' ? (
        <RevisionViz phase={phase} caseId={caseId as RevisionCase} branchRef={branchRef} />
      ) : null}
      {pattern === 'filter' ? <FilterViz phase={phase} caseId={caseId as FilterCase} /> : null}

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
      title="git grep"
      lead="Поиск по tracked-файлам: контраст с grep, ревизии, pathspec и --cached."
      problem={problem}
      code={code}
    />
  )
}
