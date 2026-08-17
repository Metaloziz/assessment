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
import styles from './ApoLab.module.css'

const TOPIC_ID = '52-apo'
const STEP = 0.55

type CaseId = 'guess' | 'profile'
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'guess', label: 'Угадать слой' },
  { id: 'profile', label: 'Сначала профиль' },
]

const PAIN = (
  <>
    Dashboard «медленный»: без flame graph легко чинить <code>sortUsers</code>, хотя{' '}
    <code>fetch('/api/users')</code> съедает большую часть времени.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  guess: (
    <>
      Патчим сортировку на 200 строк — код сложнее, p95 почти не двигается: hotspot был в{' '}
      <code>Network</code>.
    </>
  ),
  profile: (
    <>
      Performance → 88% в <code>fetch</code> → кэш ответа: простой патч, p95 −70%,{' '}
      <code>sortUsers</code> не трогаем.
    </>
  ),
}

const CODE_INTRO =
  'Один `loadDashboard`: «оптимизация» сортировки без профиля vs кэш после flame graph.'

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  guess: [
    {
      id: 'dashboard-guess',
      label: 'src/dashboard/loadDashboard.ts',
      note: 'Hotspot в fetch, а патч — в sort.',
      executable: false,
      languageLabel: 'ts',
      code: `const usersCache = new Map<string, User[]>();

export async function loadDashboard() {
  const res = await fetch('/api/users'); // ← 88% времени (Network)
  const users = (await res.json()) as User[];

  // ═══════════════════════════════════════════
  // APO ← «оптимизация» без профиля
  // ═══════════════════════════════════════════
  return sortUsersFast(users); // ← патч не там
}

function sortUsersFast(users: User[]) {
  return users.slice().sort((a, b) => {
    const ka = (a.name ?? '').toLowerCase();
    const kb = (b.name ?? '').toLowerCase();
    return ka < kb ? -1 : ka > kb ? 1 : 0; // ← сложнее, ~0 выигрыша
  });
}`,
    },
    {
      id: 'perf-guess',
      label: 'notes/perf-guess.md',
      note: 'Flame graph, который не открыли.',
      executable: false,
      languageLabel: 'md',
      code: `# p95 loadDashboard: 820 ms → 810 ms после sortUsersFast

Performance tab:
  fetch /api/users     88%
  JSON.parse           7%
  sortUsers            2%   ← сюда ушли две недели

→ преждевременная оптимизация: сложность ↑, SLA не закрыт`,
    },
  ],
  profile: [
    {
      id: 'dashboard-profile',
      label: 'src/dashboard/loadDashboard.ts',
      note: 'Кэш после профиля — точечный патч.',
      executable: false,
      languageLabel: 'ts',
      code: `const usersCache = new Map<string, User[]>();
const TTL_MS = 30_000;

export async function loadDashboard() {
  const cached = usersCache.get('all');
  if (cached) return sortUsers(cached); // ← простой sort, cold path

  const res = await fetch('/api/users'); // ← hotspot из профиля
  const users = (await res.json()) as User[];
  usersCache.set('all', users);
  setTimeout(() => usersCache.delete('all'), TTL_MS); // ← invalidate
  return sortUsers(users);
}

function sortUsers(users: User[]) {
  return [...users].sort((a, b) => a.name.localeCompare(b.name));
}`,
    },
    {
      id: 'perf-profile',
      label: 'notes/perf-profile.md',
      note: 'Baseline → профиль → патч → стоп.',
      executable: false,
      languageLabel: 'md',
      code: `# SLA: p95 loadDashboard < 300 ms

1. baseline: p95 820 ms
2. Performance → fetch 88%
3. cache GET /api/users (TTL 30s)
4. after: p95 240 ms — SLA ok, sort не трогали

→ обоснованная оптимизация: один hotspot, измеримый эффект`,
    },
  ],
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function nodeCls(...parts: Array<string | false | undefined>) {
  return [labVizStyles.node, ...parts.filter(Boolean)].join(' ')
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
    defaults: { duration: 0.5, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function FlameMini({ caseId, phase }: { caseId: CaseId; phase: Phase }) {
  const show = phase === 'b' || phase === 'c' || phase === 'done'
  if (!show) return null

  const fetchPct = caseId === 'guess' ? 88 : 24
  const sortPct = caseId === 'guess' ? 2 : 2
  const cachePct = caseId === 'profile' ? 64 : 0
  const restPct = 100 - fetchPct - sortPct - cachePct

  return (
    <div>
      <div className={styles.flameBar} aria-hidden>
        <div className={styles.flameFetch} style={{ width: `${fetchPct}%` }} />
        {cachePct > 0 ? (
          <div className={styles.flameCache} style={{ width: `${cachePct}%` }} />
        ) : null}
        <div className={styles.flameSort} style={{ width: `${sortPct}%` }} />
        <div style={{ width: `${restPct}%` }} />
      </div>
      <div className={styles.flameLegend}>
        <span className={styles.flameLegendItem}>
          <span className={`${styles.flameDot} ${styles.flameFetch}`} />
          fetch {fetchPct}%
        </span>
        {cachePct > 0 ? (
          <span className={styles.flameLegendItem}>
            <span className={`${styles.flameDot} ${styles.flameCache}`} />
            cache hit {cachePct}%
          </span>
        ) : null}
        <span className={styles.flameLegendItem}>
          <span className={`${styles.flameDot} ${styles.flameSort}`} />
          sort {sortPct}%
        </span>
      </div>
    </div>
  )
}

function ApoViz({ caseId, phase, focusRef }: VizProps) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'c' || phase === 'done'
  const cOn = phase === 'c' || phase === 'done'
  const doneOn = phase === 'done'

  const guessPath = caseId === 'guess'
  const profilePath = caseId === 'profile'

  const leftStrong = guessPath && bOn
  const rightStrong = profilePath && bOn

  const meta = !doneOn
    ? phase === 'idle'
      ? 'ожидание'
      : phase === 'a'
        ? 'симптом: p95 820 ms'
        : phase === 'b'
          ? 'Performance / flame graph'
          : caseId === 'guess'
            ? 'sortUsersFast…'
            : 'cache GET…'
    : caseId === 'guess'
      ? 'p95 810 ms · SLA не закрыт'
      : 'p95 240 ms · SLA ok'

  const outSub = !doneOn
    ? '—'
    : caseId === 'guess'
      ? 'сложность ↑ · выигрыш ~1%'
      : 'cache hit · sort без изменений'

  return (
    <LabVizPanel title="loadDashboard" meta={meta}>
      <div className={styles.scheme}>
        <div
          className={`${styles.schemeTop} ${nodeCls(
            aOn && labVizStyles.nodeActive,
            doneOn && labVizStyles.nodeOk,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>симптом</span>
          <span className={labVizStyles.nodeSub}>p95 820 ms · SLA 300 ms</span>
        </div>

        <div className={styles.schemeFork}>
          <span
            className={`${styles.schemeForkLeft}${leftStrong ? ` ${styles.schemeForkLeftActive}` : bOn && profilePath ? ` ${styles.schemeForkIdle}` : ''}`}
          >
            угадать ↙
          </span>
          <span className={labVizStyles.nodeSub}>?</span>
          <span
            className={`${styles.schemeForkRight}${rightStrong ? ` ${styles.schemeForkRightActive}` : bOn && guessPath ? ` ${styles.schemeForkIdle}` : ''}`}
          >
            профиль ↘
          </span>
        </div>

        <div
          className={`${styles.schemeBranch}${!guessPath && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
        >
          <div
            className={nodeCls(
              leftStrong && !doneOn && labVizStyles.nodeActive,
              doneOn && guessPath && styles.nodeWarn,
              (!guessPath || !bOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>sortUsersFast</span>
            <span className={labVizStyles.nodeSub}>
              {!guessPath ? 'не трогаем' : cOn ? 'патч…' : '—'}
            </span>
          </div>
          <span className={styles.schemeBranchArrow} aria-hidden>
            ↓
          </span>
          <div className={nodeCls((!guessPath || !cOn) && styles.dim)}>
            <span className={labVizStyles.nodeLabel}>fetch</span>
            <span className={labVizStyles.nodeSub}>88% без профиля</span>
          </div>
        </div>

        <div
          className={`${styles.schemeBranch}${!profilePath && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
        >
          <div
            className={nodeCls(
              rightStrong && !doneOn && labVizStyles.nodeActive,
              doneOn && profilePath && labVizStyles.nodeOk,
              (!profilePath || !bOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Performance</span>
            <span className={labVizStyles.nodeSub}>
              {!profilePath ? '—' : bOn ? 'flame graph' : '—'}
            </span>
          </div>
          <span className={styles.schemeBranchArrow} aria-hidden>
            ↓
          </span>
          <div
            className={nodeCls(
              rightStrong && cOn && !doneOn && labVizStyles.nodeActive,
              doneOn && profilePath && labVizStyles.nodeOk,
              (!profilePath || !cOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>cache GET</span>
            <span className={labVizStyles.nodeSub}>
              {!profilePath ? 'не трогаем' : doneOn ? 'TTL 30s' : cOn ? 'set…' : '—'}
            </span>
          </div>
        </div>

        <div className={styles.schemeTop}>
          <FlameMini caseId={caseId} phase={phase} />
        </div>

        <div
          ref={focusRef}
          className={`${styles.schemeOut} ${nodeCls(
            doneOn && profilePath && labVizStyles.nodeOk,
            doneOn && guessPath && styles.nodeWarn,
            doneOn && labVizStyles.nodeActive,
            !doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>итог</span>
          <span className={labVizStyles.nodeSub}>{outSub}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function ApoLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('guess')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
  }

  const selectCase = (id: CaseId) => {
    if (busy) return
    setCaseId(id)
    resetViz()
  }

  const run = () => {
    clear()
    setHint(null)
    setBusy(true)
    setPhase('idle')

    playTimeline(
      tlRef,
      [
        () => setPhase('a'),
        () => setPhase('b'),
        () => setPhase('c'),
        () => {
          setPhase('done')
          if (caseId === 'guess') {
            log('warn', 'sortUsersFast: p95 820 → 810 ms · fetch всё ещё 88%')
            log('info', 'сложность выросла · SLA 300 ms не достигнут')
            setHint('hotspot в Network — патч sort не помог')
          } else {
            log('ok', 'Performance: fetch 88% → cache TTL 30s')
            log('ok', 'p95 820 → 240 ms · sortUsers без изменений')
            setHint('профиль → один патч → стоп')
          }
        },
      ],
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('guess')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
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

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ApoViz caseId={caseId} phase={phase} focusRef={focusRef} />

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel topicId={TOPIC_ID} intro={CODE_INTRO} snippets={CODE_SNIPPETS[caseId]} />
  )

  return (
    <JsLabShell
      title="Профиль → hotspot → патч"
      lead="Развилка: оптимизация наугад vs измерение перед патчем."
      problem={problem}
      code={code}
    />
  )
}
