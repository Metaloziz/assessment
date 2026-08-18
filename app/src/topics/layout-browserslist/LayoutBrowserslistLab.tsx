import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './LayoutBrowserslistLab.module.css'

const TOPIC_ID = '174-layout-browserslist'
const STEP = 0.6

type CaseId = 'shared' | 'drift'
type Phase = 'idle' | 'query' | 'resolve' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'shared', label: 'Один список' },
  { id: 'drift', label: 'Разные цели' },
]

const PAIN = (
  <>
    Сборка спрашивает: под какие браузеры готовить код? <code>Browserslist</code> отвечает одним
    списком. Если <code>Babel</code> и <code>Autoprefixer</code> читают разное — в Safari карточка
    может приехать без префиксов.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  shared: (
    <>
      Chrome, Firefox, Safari и iOS из одного <code>package.json</code> — и JS, и CSS готовят{' '}
      <code>-webkit-backdrop-filter</code> для Safari 15.
    </>
  ),
  drift: (
    <>
      <code>Babel</code> целится в IE 11, Autoprefixer — только в свежий Chrome: Safari 15 открывает
      карточку без стекла.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  shared:
    '`chrome >= 110`, `safari >= 15`, `iOS >= 15`. Babel без `targets`, Autoprefixer без override — префиксы для Safari.',
  drift:
    '`targets` под IE 11 / Android 8; Autoprefixer — `last 1 chrome version`. Safari 15 в CSS-списке нет.',
}

const SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  shared: [
    {
      id: 'package-json',
      label: 'package.json',
      note: 'Реальные цели: Chrome, Firefox ESR, Safari и iOS. IE отсечён явно.',
      executable: false,
      languageLabel: 'json',
      code: `{
  "name": "shop-ui",
  "private": true,

  // ═══════════════════════════════════════════
  // BROWSERSLIST ← один список на JS и CSS
  // ═══════════════════════════════════════════
  "browserslist": [
    "chrome >= 110",
    "firefox >= 115",
    "safari >= 15",
    "iOS >= 15", // ← iPhone / iPad
    "not dead",
    "not IE 11"
  ]
}`,
    },
    {
      id: 'babel-config',
      label: 'babel.config.js',
      note: 'Без `targets` preset-env берёт тот же список: Chrome 120, Firefox 121, Safari 17, iOS 17.',
      executable: false,
      code: `module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // ← нет targets: chrome 120, firefox 121, safari 17, ios 17
        useBuiltIns: 'usage',
        corejs: 3,
      },
    ],
  ],
};`,
    },
    {
      id: 'card-css',
      label: 'src/card.css',
      note: 'Autoprefixer знает Safari 15 — дописывает `-webkit-` к блюру и `user-select`.',
      executable: false,
      languageLabel: 'css',
      code: `.card {
  -webkit-backdrop-filter: blur(12px); /* ← Safari 15 / iOS 15 */
  backdrop-filter: blur(12px);
  -webkit-user-select: none;
  user-select: none;
}

.buy {
  -webkit-appearance: none; /* ← Safari */
  appearance: none;
}`,
    },
  ],
  drift: [
    {
      id: 'babel-targets',
      label: 'babel.config.js',
      note: 'Свой `targets` перебивает Browserslist: JS собирается под IE 11 и старый Android.',
      executable: false,
      code: `module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // ← DRIFT: общий browserslist не читается
        targets: {
          ie: '11',
          android: '8',
          chrome: '90',
        },
        useBuiltIns: 'usage',
        corejs: 3,
      },
    ],
  ],
};`,
    },
    {
      id: 'postcss-override',
      label: 'postcss.config.js',
      note: 'Только последний Chrome и Firefox. Safari 15 и iOS в список не попали.',
      executable: false,
      code: `module.exports = {
  plugins: {
    autoprefixer: {
      overrideBrowserslist: [
        'last 1 chrome version', // ← Chrome 131
        'last 1 firefox version',
        // нет safari >= 15, нет iOS >= 15
      ],
    },
  },
};`,
    },
    {
      id: 'card-css-drift',
      label: 'src/card.css',
      note: 'Safari 15 не в списке Autoprefixer — `-webkit-backdrop-filter` не появился, блюр не включится.',
      executable: false,
      languageLabel: 'css',
      code: `/* то, что уехало в бандл для Safari 15 */
.card {
  backdrop-filter: blur(12px);
  user-select: none;
  /* нет -webkit-backdrop-filter ← Safari 15 игнорит */
}

.buy {
  appearance: none;
  /* нет -webkit-appearance ← кнопка «чужая» */
}`,
    },
  ],
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, ...mods.filter(Boolean)].join(' ')
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

type VizProps = {
  phase: Phase
  caseId: CaseId
  listRef: MutableRefObject<HTMLDivElement | null>
  previewRef: MutableRefObject<HTMLDivElement | null>
}

function BrowserslistViz({ phase, caseId, listRef, previewRef }: VizProps) {
  const shared = caseId === 'shared'
  const queryOn = phase !== 'idle'
  const resolved = phase === 'resolve' || phase === 'done'
  const done = phase === 'done'
  const forkOn = resolved
  const drift = !shared && done
  const broken = done && !shared

  const sourceSub = shared ? 'package.json' : 'два конфига'
  const listSub = !resolved
    ? 'ещё нет'
    : shared
      ? 'Chrome 120 · Firefox 121 · Safari 17 · iOS 17'
      : 'JS и CSS видят разное'

  const jsSub = !done
    ? 'ждёт список'
    : shared
      ? 'Chrome · Firefox · Safari · iOS'
      : 'IE 11 · Android 8 · Chrome 90'
  const cssSub = !done
    ? 'ждёт список'
    : shared
      ? 'те же + -webkit- для Safari'
      : 'Chrome 131 · Firefox 132'

  const previewMeta = !done
    ? 'ждём сборку'
    : shared
      ? 'блюр на месте'
      : 'стекла нет'

  const meta =
    phase === 'idle'
      ? 'что увидит Safari 15?'
      : done
        ? shared
          ? 'Safari 15 · ок'
          : 'Safari 15 · сломано'
        : phase === 'query'
          ? 'читаю цели'
          : 'версии'

  return (
    <LabVizPanel title="один список или два?" meta={meta}>
      <div className={styles.scheme}>
        <div
          className={`${styles.schemeTop} ${nodeCls(
            queryOn && !done && labVizStyles.nodeActive,
            done && (shared ? labVizStyles.nodeOk : labVizStyles.nodeErr),
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>откуда цели</span>
          <span className={labVizStyles.nodeSub}>{sourceSub}</span>
        </div>

        <div
          ref={listRef}
          className={`${styles.schemeMid} ${nodeCls(
            resolved && !done && labVizStyles.nodeActive,
            done && (shared ? labVizStyles.nodeOk : labVizStyles.nodeErr),
            !resolved && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>конкретные версии</span>
          <span className={labVizStyles.nodeSub}>{listSub}</span>
        </div>

        <div className={styles.schemeFork} aria-hidden>
          <span
            className={`${styles.schemeForkJs}${
              forkOn ? ` ${styles.schemeForkJsOn}` : ` ${styles.schemeForkIdle}`
            }`}
          >
            ↙ JS-сборка
          </span>
          <span />
          <span
            className={`${styles.schemeForkCss}${
              forkOn ? ` ${styles.schemeForkCssOn}` : ` ${styles.schemeForkIdle}`
            }`}
          >
            CSS-префиксы ↘
          </span>
        </div>

        <div className={`${styles.schemeBranch}${!forkOn ? ` ${styles.dim}` : ''}`}>
          <div
            className={nodeCls(
              resolved && !done && labVizStyles.nodeActive,
              done && (shared ? labVizStyles.nodeOk : labVizStyles.nodeErr),
              !forkOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>
              <code>Babel</code>
            </span>
            <span className={labVizStyles.nodeSub}>{jsSub}</span>
          </div>
        </div>

        <span className={styles.schemeBranchArrow} aria-hidden>
          {done ? '↓' : ''}
        </span>

        <div className={`${styles.schemeBranch}${!forkOn ? ` ${styles.dim}` : ''}`}>
          <div
            className={nodeCls(
              resolved && !done && labVizStyles.nodeActive,
              done && shared && labVizStyles.nodeOk,
              done && drift && labVizStyles.nodeErr,
              !forkOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>
              <code>Autoprefixer</code>
            </span>
            <span className={labVizStyles.nodeSub}>{cssSub}</span>
          </div>
        </div>

        <div
          ref={previewRef}
          className={`${styles.preview} ${done && shared ? styles.previewOk : ''} ${
            broken ? styles.previewErr : ''
          } ${!done ? styles.dim : ''}`}
        >
          <div className={styles.previewHead}>
            <span className={styles.previewTitle}>Safari 15 · iPhone</span>
            <span>{previewMeta}</span>
          </div>
          <div className={styles.previewStage}>
            <div
              className={`${styles.card} ${done && shared ? styles.cardOk : ''} ${
                broken ? styles.cardBroken : ''
              }`}
            >
              <span className={styles.cardName}>Стекло</span>
              <span>{broken ? 'блюр не включился' : 'backdrop-filter'}</span>
              <span className={styles.cardBtn}>В корзину</span>
            </div>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function CaseSwitch({
  value,
  disabled,
  onChange,
}: {
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          disabled={disabled}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

export function LayoutBrowserslistLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('shared')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<ReactNode>(null)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (listRef.current) gsap.set(listRef.current, { clearProps: 'transform,opacity' })
    if (previewRef.current) gsap.set(previewRef.current, { clearProps: 'transform,opacity' })
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
    const shared = caseId === 'shared'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('query')
          log(
            'info',
            shared
              ? 'читаю chrome ≥ 110, firefox ≥ 115, safari ≥ 15, iOS ≥ 15'
              : 'Babel: IE 11, Android 8, Chrome 90',
          )
        },
        () => {
          setPhase('resolve')
          log(
            shared ? 'ok' : 'warn',
            shared
              ? 'один список: Chrome 120 · Firefox 121 · Safari 17 · iOS 17'
              : 'Autoprefixer: только Chrome 131 и Firefox 132',
          )
        },
        () => {
          setPhase('done')
          if (shared) {
            log('ok', 'Safari 15: -webkit-backdrop-filter на месте, карточка со стеклом')
          } else {
            log('err', 'Safari 15: префиксов нет — блюр не включился')
          }
        },
      ],
      (tl) => {
        if (listRef.current) {
          tl.fromTo(
            listRef.current,
            { opacity: 0.55, y: 6 },
            { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
            STEP,
          )
        }
        if (previewRef.current) {
          tl.fromTo(
            previewRef.current,
            { opacity: 0.45, y: 8 },
            { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
            STEP * 2,
          )
        }
      },
      () => {
        setBusy(false)
        setHint(
          shared ? (
            <>
              Safari 15 и iOS видят те же префиксы, что Chrome: карточка со стеклом.
            </>
          ) : (
            <>
              В Safari 15 нет <code>-webkit-backdrop-filter</code> — карточка «голая». JS при этом
              собран под IE 11.
            </>
          ),
        )
      },
    )
  }

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} disabled={busy} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => {
            tlRef.current?.kill()
            setBusy(false)
            clear()
            resetViz()
            setCaseId('shared')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <BrowserslistViz phase={phase} caseId={caseId} listRef={listRef} previewRef={previewRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <CaseSwitch value={caseId} onChange={selectCase} />
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Browserslist"
      lead="Один список — Safari 15 со стеклом. Разные цели — карточка без префиксов."
      problem={problem}
      code={code}
    />
  )
}
