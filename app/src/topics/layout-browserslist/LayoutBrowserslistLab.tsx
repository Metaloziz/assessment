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
const STEP = 0.65

type CaseId = 'shared' | 'drift'
type Phase = 'idle' | 'query' | 'resolve' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'shared', label: 'Один конфиг' },
  { id: 'drift', label: 'Рассинхрон' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  shared: (
    <>
      Запросы из <code>package.json</code> резолвятся в один список; Babel и Autoprefixer берут его оба.
    </>
  ),
  drift: (
    <>
      У Babel свой <code>targets</code>, Autoprefixer без общего списка — CSS и JS целятся в разные браузеры.
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'package-json',
    label: 'package.json',
    note: 'Ключ `browserslist` — общий контракт целей для Babel, Autoprefixer и PostCSS.',
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
    "@babel/core": "^7.25.0",
    "@babel/preset-env": "^7.25.0",
    "autoprefixer": "^10.4.20",
    "browserslist": "^4.24.0",
    "postcss": "^8.4.47"
  }
}`,
  },
  {
    id: 'babel-config',
    label: 'babel.config.js',
    note: 'Без своего `targets` preset-env читает Browserslist. Свой `targets` перебивает общий конфиг.',
    executable: false,
    code: `module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // ← SHARED: targets нет → берёт browserslist из package.json
        useBuiltIns: 'usage',
        corejs: 3,

        // ← DRIFT (антипример): рассинхрон с Autoprefixer
        // targets: { ie: '11' },
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
      // ← SHARED: пустой объект → читает browserslist
      //
      // ← DRIFT (антипример): свой список только для CSS
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
  const drift = !shared && done

  const listSub = !resolved
    ? 'ещё нет'
    : shared
      ? 'chrome 120 · firefox 121 · …'
      : 'только у Babel'

  return (
    <LabVizPanel
      title="Целевые браузеры"
      meta={shared ? 'один список → оба инструмента' : 'targets только в Babel'}
    >
      <div className={styles.flow}>
        <div
          className={nodeCls(
            queryOn && labVizStyles.nodeActive,
            done && (shared ? labVizStyles.nodeOk : styles.nodeWarn),
          )}
        >
          <span className={labVizStyles.nodeLabel}>Query</span>
          <span className={labVizStyles.nodeSub}>
            {shared ? 'browserslist' : 'babel targets'}
          </span>
        </div>

        <span className={styles.arrow} aria-hidden>
          →
        </span>

        <div
          ref={listRef}
          className={nodeCls(
            resolved && labVizStyles.nodeActive,
            done && (shared ? labVizStyles.nodeOk : styles.nodeWarn),
            styles.listNode,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Список</span>
          <span className={labVizStyles.nodeSub}>{listSub}</span>
        </div>

        <span className={styles.arrow} aria-hidden>
          →
        </span>

        <div className={styles.consumers}>
          <div
            className={nodeCls(
              done && labVizStyles.nodeOk,
              resolved && shared && labVizStyles.nodeActive,
              resolved && !shared && labVizStyles.nodeActive,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Babel</span>
            <span className={labVizStyles.nodeSub}>
              {done ? (shared ? 'тот же list' : 'свой targets') : 'ждёт'}
            </span>
          </div>
          <div
            className={nodeCls(
              done && shared && labVizStyles.nodeOk,
              done && drift && styles.nodeWarn,
              resolved && shared && labVizStyles.nodeActive,
              !shared && styles.nodeSkipped,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Autoprefixer</span>
            <span className={labVizStyles.nodeSub}>
              {done ? (shared ? 'тот же list' : 'другой / default') : 'ждёт'}
            </span>
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
  const [hint, setHint] = useState<string | null>(null)
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
          log('info', shared ? 'читаю browserslist из package.json' : 'Babel: targets: { ie: "11" }')
        },
        () => {
          setPhase('resolve')
          log(
            shared ? 'ok' : 'warn',
            shared
              ? 'caniuse-lite → chrome / firefox / safari (без IE 11)'
              : 'список только для preset-env; Autoprefixer не в курсе',
          )
        },
        () => {
          setPhase('done')
          if (shared) {
            log('ok', 'Babel + Autoprefixer на одном списке')
          } else {
            log('err', 'JS под IE 11, CSS — под default/override → рассинхрон')
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
          shared
            ? 'Один browserslist — оба потребителя на одном покрытии.'
            : 'Свой targets у Babel ломает единый контракт; вынесите цели в browserslist.',
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

      <p className={shell.pain}>
        <code>Browserslist</code> превращает запросы в список версий. Babel и Autoprefixer должны
        читать один конфиг — иначе CSS и JS целятся в разные браузеры.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <BrowserslistViz phase={phase} caseId={caseId} listRef={listRef} />

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="`browserslist` в `package.json`; Babel без своего `targets`; Autoprefixer без `overrideBrowserslist`."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Browserslist"
      lead="Один query → список браузеров → Babel и Autoprefixer на одном покрытии."
      problem={problem}
      code={code}
    />
  )
}
