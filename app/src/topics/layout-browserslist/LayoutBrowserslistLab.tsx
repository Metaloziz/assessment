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
    списком. Если <code>Babel</code> и <code>Autoprefixer</code> читают разное — CSS и JS разъедутся.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  shared: (
    <>
      Запросы из <code>package.json</code> становятся одним списком версий — и JS, и CSS берут его.
    </>
  ),
  drift: (
    <>
      У <code>Babel</code> свой <code>targets</code>, Autoprefixer общий файл не видит — покрытие
      разъезжается.
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'package-json',
    label: 'package.json',
    note: 'Ключ `browserslist` — общий список целей для Babel и Autoprefixer.',
    executable: false,
    languageLabel: 'json',
    code: `{
  "name": "shop-ui",
  "private": true,

  // ═══════════════════════════════════════════
  // BROWSERSLIST ← один источник целей
  // ═══════════════════════════════════════════
  "browserslist": [
    "defaults",
    "not IE 11" // ← явный отказ от IE
  ],

  "devDependencies": {
    "@babel/preset-env": "^7.25.0",
    "autoprefixer": "^10.4.20",
    "browserslist": "^4.24.0"
  }
}`,
  },
  {
    id: 'babel-config',
    label: 'babel.config.js',
    note: 'Без своего `targets` preset-env читает Browserslist. Свой `targets` перебивает общий файл.',
    executable: false,
    code: `module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // ← нет targets: берёт browserslist
        useBuiltIns: 'usage',
        corejs: 3,

        // антипример: второй источник правды
        // targets: { ie: '11' }, // ← перебивает общий список
      },
    ],
  ],
};`,
  },
  {
    id: 'postcss-config',
    label: 'postcss.config.js',
    note: 'Autoprefixer без `overrideBrowserslist` читает тот же Browserslist.',
    executable: false,
    code: `module.exports = {
  plugins: {
    autoprefixer: {
      // ← пустой объект: читает browserslist
      //
      // антипример: свой список только для CSS
      // overrideBrowserslist: ['last 1 chrome version'],
    },
  },
};`,
  },
]

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
}

function BrowserslistViz({ phase, caseId, listRef }: VizProps) {
  const shared = caseId === 'shared'
  const queryOn = phase !== 'idle'
  const resolved = phase === 'resolve' || phase === 'done'
  const done = phase === 'done'
  const forkOn = resolved
  const drift = !shared && done

  const sourceSub = shared ? 'package.json' : 'Babel targets'
  const listSub = !resolved
    ? 'ещё нет'
    : shared
      ? 'Chrome · Firefox · Safari'
      : 'IE 11 — только у Babel'

  const jsSub = !done ? 'ждёт список' : shared ? 'тот же список' : 'свой targets'
  const cssSub = !done ? 'ждёт список' : shared ? 'тот же список' : 'другой / по умолчанию'

  const meta =
    phase === 'idle'
      ? 'откуда список?'
      : done
        ? shared
          ? 'оба на одном'
          : 'разъехались'
        : phase === 'query'
          ? 'читаю запросы'
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
              done && labVizStyles.nodeOk,
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
              resolved && shared && !done && labVizStyles.nodeActive,
              done && shared && labVizStyles.nodeOk,
              done && drift && labVizStyles.nodeErr,
              (!forkOn || (drift && !done)) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>
              <code>Autoprefixer</code>
            </span>
            <span className={labVizStyles.nodeSub}>{cssSub}</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
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

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (listRef.current) gsap.set(listRef.current, { clearProps: 'transform,opacity' })
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
          log('info', shared ? 'читаю запросы из package.json' : 'у Babel свой targets: IE 11')
        },
        () => {
          setPhase('resolve')
          log(
            shared ? 'ok' : 'warn',
            shared
              ? 'версии: Chrome, Firefox, Safari — без IE'
              : 'список только для Babel; Autoprefixer не в курсе',
          )
        },
        () => {
          setPhase('done')
          if (shared) {
            log('ok', 'JS и CSS смотрят один список')
          } else {
            log('err', 'JS под IE, CSS — под другое')
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
      },
      () => {
        setBusy(false)
        setHint(
          shared ? (
            'Один файл — оба инструмента на одном покрытии.'
          ) : (
            <>
              Свой <code>targets</code> у <code>Babel</code> ломает общий список; цели лучше держать
              в <code>browserslist</code>.
            </>
          ),
        )
      },
    )
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

      <BrowserslistViz phase={phase} caseId={caseId} listRef={listRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <InteractiveCodePanel
        topicId={TOPIC_ID}
        intro="`browserslist` в `package.json`; Babel без своего `targets`; Autoprefixer без `overrideBrowserslist`."
        snippets={SNIPPETS}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Browserslist"
      lead="Один список браузеров — и JS, и CSS готовятся под одних людей."
      problem={problem}
      code={code}
    />
  )
}
