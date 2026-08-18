import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './V8GcLab.module.css'

const TOPIC_ID = '111-js-v8-gc'
const STEP = 0.65

type Pattern = 'links' | 'generations'
type LinksCase = 'release' | 'cache'
type GenCase = 'minor' | 'major'
type CaseId = LinksCase | GenCase

type LinksPhase = 'idle' | 'roots' | 'hold' | 'release' | 'sweep' | 'done'
type GenPhase = 'idle' | 'alloc' | 'collect' | 'promote' | 'mark' | 'sweep' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'links', label: 'Ссылки' },
  { id: 'generations', label: 'Поколения' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  links: [
    { id: 'release', label: 'session = null' },
    { id: 'cache', label: 'Кэш без лимита' },
  ],
  generations: [
    { id: 'minor', label: 'Minor GC' },
    { id: 'major', label: 'Major GC' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  links: (
    <>
      V8 удаляет объект, когда до него нельзя дойти от корней — стека, глобала, активных контекстов.
      Пока жива ссылка в переменной, кэше или замыкании, память не отпустит.
    </>
  ),
  generations: (
    <>
      Новые объекты попадают в young generation — там быстрый minor GC. Пережившие несколько сборок
      переезжают в old, где major GC дороже и паузы длиннее.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  release: (
    <>
      После <code>session = null</code> объект становится недостижим — кандидат на сборку, но момент
      GC не гарантирован.
    </>
  ),
  cache: (
    <>
      Запись в <code>Map</code> без TTL/LRU остаётся достижимой от глобального кэша — для GC это не
      мусор, даже если UI уже не показывает данные.
    </>
  ),
  minor: (
    <>
      Короткоживущие объекты в young generation minor GC собирает быстро; выжившие продвигаются в
      old.
    </>
  ),
  major: (
    <>
      В old generation major GC помечает живые объекты и освобождает недостижимые — работа тяжелее,
      чем minor.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  links: 'Достижимость от корней: `null` отпускает ссылку; безлимитный кэш держит объекты живыми.',
  generations:
    'Young generation — частый minor GC; old — major GC с mark-sweep. Снижают GC pressure аллокациями и лимитами кэша.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  links: [
    {
      id: 'reachability',
      label: 'src/gc/reachability.js',
      note: 'Обнулили ссылку — объект кандидат на GC; когда именно соберут — неизвестно.',
      executable: false,
      languageLabel: 'js',
      code: `let session = { payload: new Array(1000).fill(0) };
console.log('достижим:', session.payload.length);

session = null; // ← нет пути от корней — кандидат на GC
console.log('после null — сборка когда-нибудь, не сразу');`,
    },
    {
      id: 'cache-leak',
      label: 'src/gc/cacheLeak.js',
      note: 'Map без лимита держит все значения достижимыми от global cache.',
      executable: false,
      languageLabel: 'js',
      code: `const cache = new Map(); // ← корень: global

function remember(key, value) {
  cache.set(key, value); // ← ссылка жива — не мусор
}

for (let i = 0; i < 5; i++) {
  remember('user:' + i, { blob: new Array(1000).fill(i) });
}

// исправление: лимит + вытеснение
const MAX = 3;
function rememberLimited(key, value) {
  cache.set(key, value);
  if (cache.size > MAX) {
    cache.delete(cache.keys().next().value); // ← LRU-упрощение
  }
}`,
    },
    {
      id: 'listener-leak',
      label: 'src/gc/listenerTimer.js',
      note: 'Забытый interval удерживает замыкание и всё, что оно захватило.',
      executable: false,
      languageLabel: 'js',
      code: `const huge = { data: new Array(5000).fill('x') };

function onTick() {
  console.log(huge.data.length); // ← замыкание держит huge
}

const id = setInterval(onTick, 1000);
clearInterval(id); // ← без этого huge жив, пока жив interval`,
    },
  ],
  generations: [
    {
      id: 'minor-gc',
      label: 'src/gc/minorPressure.js',
      note: 'Много короткоживущих объектов в цикле — нагрузка на young generation.',
      executable: false,
      languageLabel: 'js',
      code: `function buildRows(count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({ id: i, tag: String(i) }); // ← temp в young
  }
  return rows;
}

buildRows(10_000);
// ← minor GC часто; не держите лишние temp в hot path`,
    },
    {
      id: 'major-gc',
      label: 'src/gc/oldGeneration.js',
      note: 'Долгоживущий кэш копится в old — major GC дороже minor.',
      executable: false,
      languageLabel: 'js',
      code: `const store = new Map(); // ← переживёт minor GC

function keepForever(key, value) {
  store.set(key, value); // ← promotion в old при долгой жизни
}

for (let i = 0; i < 50_000; i++) {
  keepForever('k' + i, { buf: new Uint8Array(256) });
}

// ← major GC при давлении; нужны TTL/LRU/delete`,
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

function nodeCls(active: boolean, ok = false, warn = false, err = false, dim = false) {
  return [
    styles.gcNode,
    active && styles.gcNodeActive,
    ok && styles.gcNodeOk,
    warn && styles.gcNodeWarn,
    err && styles.gcNodeErr,
    dim && styles.gcNodeDim,
  ]
    .filter(Boolean)
    .join(' ')
}

function zoneCls(active: boolean, ok = false, warn = false, dim = false) {
  return [
    styles.genZone,
    active && styles.genZoneActive,
    ok && styles.genZoneOk,
    warn && styles.genZoneWarn,
    dim && styles.genZoneDim,
  ]
    .filter(Boolean)
    .join(' ')
}

type LinksVizProps = {
  caseId: LinksCase
  phase: LinksPhase
}

function LinksViz({ caseId, phase }: LinksVizProps) {
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? caseId === 'release'
          ? 'кандидат на GC'
          : 'утечка: всё ещё достижимо'
        : 'обход от корней…'

  const rootsActive = phase === 'roots' || phase === 'hold' || phase === 'release'
  const targetActive =
    caseId === 'release'
      ? phase === 'hold' || phase === 'roots'
      : phase === 'hold' || phase === 'roots'
  const targetSweep = caseId === 'release' && (phase === 'sweep' || phase === 'done')
  const targetWarn = caseId === 'cache' && (phase === 'hold' || phase === 'done')
  const linkBroken = caseId === 'release' && (phase === 'release' || phase === 'sweep' || phase === 'done')

  return (
    <LabVizPanel title="граф ссылок" meta={meta}>
      <div className={styles.graphScene}>
        <div className={nodeCls(rootsActive, true, false, false, phase === 'sweep' && caseId === 'release')}>
          <span className={styles.gcTitle}>корни</span>
          <span className={styles.gcMeta}>stack · global</span>
        </div>

        <span className={`${styles.gcLink} ${linkBroken ? styles.gcLinkBroken : ''}`}>
          {linkBroken ? 'ссылка обнулена' : '→ ссылка →'}
        </span>

        {caseId === 'release' ? (
          <div
            className={nodeCls(
              targetActive,
              false,
              false,
              targetSweep,
              targetSweep,
            )}
          >
            <span className={styles.gcTitle}>session</span>
            <span className={styles.gcMeta}>
              {targetSweep ? '{ payload } · недостижим' : '{ payload: Array }'}
            </span>
          </div>
        ) : (
          <div className={nodeCls(targetActive || targetWarn, false, targetWarn, false, false)}>
            <span className={styles.gcTitle}>cache (Map)</span>
            <span className={styles.gcMeta}>
              {phase === 'done' || phase === 'hold' ? 'k1…k5 → объекты' : 'global root'}
            </span>
          </div>
        )}
      </div>
    </LabVizPanel>
  )
}

type GenVizProps = {
  caseId: GenCase
  phase: GenPhase
  minorSurvivors: number
}

function GenViz({ caseId, phase, minorSurvivors }: GenVizProps) {
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? caseId === 'minor'
          ? 'young очищен, выжившие в old'
          : 'old: мусор снят'
        : caseId === 'minor'
          ? 'minor GC…'
          : 'major GC…'

  const youngActive = caseId === 'minor' && (phase === 'alloc' || phase === 'collect')
  const youngOk = caseId === 'minor' && phase === 'done'
  const oldActive =
    caseId === 'major'
      ? phase === 'mark' || phase === 'sweep'
      : phase === 'promote' || phase === 'done'
  const oldWarn = caseId === 'major' && phase === 'alloc'

  const tempGone = caseId === 'minor' && (phase === 'collect' || phase === 'done')
  const survivorCount = caseId === 'minor' ? minorSurvivors : 0

  return (
    <LabVizPanel title="young · old" meta={meta}>
      <div className={styles.genScene}>
        <div className={zoneCls(youngActive, youngOk, false, caseId === 'major' && phase !== 'idle')}>
          <span className={styles.genLabel}>young generation</span>
          <div className={styles.objChips}>
            {caseId === 'minor' ? (
              <>
                <span className={`${styles.objChip} ${phase === 'alloc' ? styles.objChipActive : ''} ${tempGone ? styles.objChipGone : ''}`}>
                  temp ×N
                </span>
                <span
                  className={`${styles.objChip} ${phase === 'promote' || phase === 'done' ? styles.objChipOk : ''} ${tempGone ? styles.objChipActive : ''}`}
                >
                  survivor ×{survivorCount || 1}
                </span>
              </>
            ) : (
              <span className={`${styles.objChip} ${styles.objChipDim}`}>—</span>
            )}
          </div>
        </div>

        {caseId === 'minor' && (phase === 'promote' || phase === 'done') ? (
          <span className={styles.promoteArrow}>↓ promotion</span>
        ) : null}

        <div className={zoneCls(oldActive, phase === 'done', oldWarn, caseId === 'minor' && phase === 'alloc')}>
          <span className={styles.genLabel}>old generation</span>
          <div className={styles.objChips}>
            {caseId === 'minor' ? (
              <span className={`${styles.objChip} ${phase === 'done' ? styles.objChipOk : ''}`}>
                store, config…
              </span>
            ) : (
              <>
                <span
                  className={`${styles.objChip} ${phase === 'mark' ? styles.objChipActive : ''} ${phase === 'sweep' || phase === 'done' ? styles.objChipOk : ''}`}
                >
                  live
                </span>
                <span
                  className={`${styles.objChip} ${phase === 'mark' ? styles.objChipWarn : ''} ${phase === 'sweep' || phase === 'done' ? styles.objChipGone : ''}`}
                >
                  dead
                </span>
              </>
            )}
          </div>
        </div>
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
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const [pattern, setPattern] = useState<Pattern>('links')
  const [caseId, setCaseId] = useState<CaseId>('release')
  const [linksPhase, setLinksPhase] = useState<LinksPhase>('idle')
  const [genPhase, setGenPhase] = useState<GenPhase>('idle')
  const [minorSurvivors, setMinorSurvivors] = useState(1)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  const cases = CASES[pattern]

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setLinksPhase('idle')
    setGenPhase('idle')
    setMinorSurvivors(1)
    setFinished(false)
    setRunning(false)
  }

  const onPattern = (id: Pattern) => {
    if (running) return
    setPattern(id)
    setCaseId(CASES[id][0].id)
    clear()
    resetVisual()
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  const runRelease = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'session жив — достижим от корней')

    playTimeline(
      tlRef,
      [
        () => {
          setLinksPhase('roots')
          log('info', 'корни → session')
        },
        () => {
          setLinksPhase('hold')
          log('ok', 'объект помечен живым')
        },
        () => {
          setLinksPhase('release')
          log('info', 'session = null')
        },
        () => {
          setLinksPhase('sweep')
          log('warn', 'нет пути — кандидат на GC')
        },
        () => {
          setLinksPhase('done')
          log('ok', 'момент сборки не гарантирован')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runCache = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'cache — корень в global')

    playTimeline(
      tlRef,
      [
        () => {
          setLinksPhase('roots')
          log('info', 'Map достижим от global')
        },
        () => {
          setLinksPhase('hold')
          log('warn', 'k1…k5 — ссылки не отпущены')
        },
        () => {
          setLinksPhase('done')
          log('err', 'для GC не мусор — нужен TTL/LRU')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runMinor = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'аллокации в young')

    playTimeline(
      tlRef,
      [
        () => {
          setGenPhase('alloc')
          log('info', 'temp ×N в nursery')
        },
        () => {
          setGenPhase('collect')
          setMinorSurvivors(1)
          log('info', 'minor GC: temp собраны')
        },
        () => {
          setGenPhase('promote')
          log('ok', 'survivor → old')
        },
        () => {
          setGenPhase('done')
          log('ok', 'young очищен')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runMajor = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'давление на old generation')

    playTimeline(
      tlRef,
      [
        () => {
          setGenPhase('alloc')
          log('warn', 'куча old раздута')
        },
        () => {
          setGenPhase('mark')
          log('info', 'mark: живые помечены')
        },
        () => {
          setGenPhase('sweep')
          log('info', 'sweep: dead освобождены')
        },
        () => {
          setGenPhase('done')
          log('ok', 'major GC — пауза длиннее minor')
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
    if (caseId === 'release') runRelease()
    else if (caseId === 'cache') runCache()
    else if (caseId === 'minor') runMinor()
    else runMajor()
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    pattern === 'links'
      ? caseId === 'release'
        ? 'Итог: null отпускает ссылку — объект недостижим, но GC сработает по своему расписанию.'
        : 'Итог: кэш без лимита держит данные достижимыми — чинят TTL, LRU или явное delete.'
      : caseId === 'minor'
        ? 'Итог: minor GC быстро убирает короткоживущий мусор в young; выжившие уезжают в old.'
        : 'Итог: major GC в old тяжелее — меньше лишних аллокаций и долгоживущих ссылок снижают pressure.'

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

      {pattern === 'links' ? (
        <LinksViz caseId={caseId as LinksCase} phase={linksPhase} />
      ) : (
        <GenViz caseId={caseId as GenCase} phase={genPhase} minorSurvivors={minorSurvivors} />
      )}

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [pattern, setPattern] = useState<Pattern>('links')

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

export function V8GcLab() {
  return (
    <JsLabShell
      title="Память держится, пока жива ссылка"
      lead="V8 собирает недостижимые объекты по поколениям. Утечки чинят ссылками и лимитами кэша, а не «ручным GC»."
      problem={<ProblemPanel />}
      code={<CodePanel />}
    />
  )
}
