import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './ProjectHotColdLab.module.css'

const TOPIC_ID = '03-build-hot-cold'

type Kind = 'hot' | 'cold'
type HotCase = 'incremental' | 'lazy'
type ColdCase = 'miss' | 'hit'
type CaseId = HotCase | ColdCase

const KINDS: Array<{ id: Kind; label: string }> = [
  { id: 'hot', label: 'Горячая (dev)' },
  { id: 'cold', label: 'Холодная (prod/CI)' },
]

const CASES: Record<Kind, Array<{ id: CaseId; label: string }>> = {
  hot: [
    { id: 'incremental', label: 'Save → подграф' },
    { id: 'lazy', label: 'Lazy route' },
  ],
  cold: [
    { id: 'miss', label: 'Cache miss' },
    { id: 'hit', label: 'Cache hit' },
  ],
}

const PAIN: Record<Kind, ReactNode> = {
  hot: (
    <>
      Горячая сборка — короткий цикл «сохранил файл → увидел изменение»: пересобирают только затронутый
      подграф, а не весь проект.
    </>
  ),
  cold: (
    <>
      Холодная — полная пересборка с нуля; повторный прогон дешевле, если на диске уже лежит кэш
      webpack или vite.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  incremental: (
    <>
      Сохранили <code>Button.tsx</code> — webpack пересобрал три связанных модуля и отправил{' '}
      <code>HMR</code>-патч без полной перезагрузки страницы.
    </>
  ),
  lazy: (
    <>
      Маршрут <code>/admin</code> не открывали — <code>lazyCompilation</code> его не трогал; после
      первого захода модуль собрали по запросу.
    </>
  ),
  miss: (
    <>
      Первый <code>npm run build</code> без кэша: полный transpile, minify и запись в{' '}
      <code>dist/</code>.
    </>
  ),
  hit: (
    <>
      Повторный build с <code>cache: {'{ type: "filesystem" }'}</code> — webpack читает{' '}
      <code>.webpack-cache</code>, полная работа не нужна.
    </>
  ),
}

const CODE_INTRO: Record<Kind, string> = {
  hot: 'Dev-конфиг: HMR, watch и lazy compilation — узкая работа на каждый save.',
  cold: 'Prod-конфиг: filesystem cache и быстрый transpile — повторный cold дешевле первого.',
}

const CODE_SNIPPETS: Record<Kind, InteractiveSnippet[]> = {
  hot: [
    {
      id: 'webpack-dev',
      label: 'webpack.dev.js',
      note: 'HMR, watch и lazy compilation — не трогаем лишние модули на save.',
      executable: false,
      code: `const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',

  // ═══════════════════════════════════════════
  // HOT ← быстрый feedback на save
  // ═══════════════════════════════════════════
  devtool: 'eval-cheap-module-source-map',

  devServer: {
    hot: true, // ← HMR: патч модуля, не full reload
    port: 3000,
  },

  watchOptions: {
    ignored: /node_modules/, // ← watcher не смотрит лишнее
  },

  // ═══════════════════════════════════════════
  // LAZY ← неоткрытые роуты — compile on demand
  // ═══════════════════════════════════════════
  experiments: {
    lazyCompilation: true, // ← собрать при первом запросе
  },
});`,
    },
    {
      id: 'vite-hot',
      label: 'vite.config.js · dev',
      note: 'Vite: native ESM по запросу; deps заранее через esbuild.',
      executable: false,
      code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ═══════════════════════════════════════════
  // HOT (Vite) ← модули по запросу, не бандлить всё в dev
  // ═══════════════════════════════════════════
  server: {
    hmr: true, // ← HMR из коробки
  },

  optimizeDeps: {
    // ← prebundle тяжёлых deps через esbuild (один раз)
    include: ['react', 'react-dom'],
  },
});`,
    },
  ],
  cold: [
    {
      id: 'webpack-prod',
      label: 'webpack.prod.js',
      note: 'Filesystem cache + SWC — повторный cold быстрее первого.',
      executable: false,
      code: `const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'production',

  // ═══════════════════════════════════════════
  // COLD CACHE ← повторная полная сборка быстрее первого
  // CI: кешировать .webpack-cache / node_modules
  // ═══════════════════════════════════════════
  cache: {
    type: 'filesystem', // ← persistent cache на диск
    buildDependencies: {
      config: [__filename],
    },
  },

  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        exclude: /node_modules/,
        // ═══════════════════════════════════════════
        // FAST TRANSPILE ← SWC/esbuild вместо тяжёлого Babel
        // ═══════════════════════════════════════════
        use: 'swc-loader', // ← быстрый transpile
      },
    ],
  },

  devtool: 'source-map', // ← меньше maps → меньше работы на cold
});`,
    },
    {
      id: 'vite-cold',
      label: 'vite.config.js · build',
      note: 'Prod build Vite: esbuild minify по умолчанию.',
      executable: false,
      code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ═══════════════════════════════════════════
  // COLD (Vite build) ← esbuild minify по умолчанию
  // ═══════════════════════════════════════════
  build: {
    target: 'esnext',
    minify: 'esbuild', // ← быстрый minify на prod build
    sourcemap: true,
  },
});`,
    },
  ],
}

function nodeCls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function KindSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Kind
  disabled?: boolean
  onChange: (id: Kind) => void
}) {
  return (
    <div className={shell.row}>
      {KINDS.map((k) => (
        <LabButton
          key={k.id}
          variant="ghost"
          size="sm"
          active={value === k.id}
          disabled={disabled}
          onClick={() => onChange(k.id)}
        >
          {k.label}
        </LabButton>
      ))}
    </div>
  )
}

function CaseSwitch({
  kind,
  value,
  disabled,
  onChange,
}: {
  kind: Kind
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES[kind].map((c) => (
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

function HotViz({ caseId, ran }: { caseId: HotCase; ran: boolean }) {
  const incremental = caseId === 'incremental'
  const aOn = ran
  const bOn = ran
  const cOn = ran && incremental

  const title = incremental ? 'save → подграф → HMR' : 'lazy route · compile on demand'
  const meta = !ran
    ? 'ожидание'
    : incremental
      ? '3 модуля · HMR patch'
      : '/admin · собран по запросу'

  if (!incremental) {
    return (
      <LabVizPanel title={title} meta={meta}>
        <div className={styles.hotRow}>
          <div className={nodeCls(labVizStyles.node, !ran && styles.dim, aOn && labVizStyles.nodeActive)}>
            <span className={labVizStyles.nodeLabel}>маршрут /admin</span>
            <span className={labVizStyles.nodeSub}>{ran ? 'открыли вкладку' : 'не открыт'}</span>
          </div>
          <span
            className={nodeCls(styles.hotArrow, aOn ? styles.hotArrowActive : styles.hotArrowIdle)}
            aria-hidden
          >
            →
          </span>
          <div className={nodeCls(labVizStyles.node, !aOn && styles.dim, aOn && labVizStyles.nodeOk)}>
            <span className={labVizStyles.nodeLabel}>lazyCompilation</span>
            <span className={labVizStyles.nodeSub}>{ran ? 'compile on demand' : '—'}</span>
          </div>
          <span
            className={nodeCls(styles.hotArrow, aOn ? styles.hotArrowActive : styles.hotArrowIdle)}
            aria-hidden
          >
            →
          </span>
          <div className={nodeCls(labVizStyles.node, !aOn && styles.dim, aOn && labVizStyles.nodeActive)}>
            <span className={labVizStyles.nodeLabel}>chunk admin</span>
            <span className={labVizStyles.nodeSub}>{ran ? 'готов' : 'ещё нет'}</span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.hotRow}>
        <div className={nodeCls(labVizStyles.node, !ran && styles.dim, aOn && labVizStyles.nodeActive)}>
          <span className={labVizStyles.nodeLabel}>save Button.tsx</span>
          <span className={labVizStyles.nodeSub}>{ran ? 'файл изменён' : '—'}</span>
        </div>
        <span
          className={nodeCls(styles.hotArrow, bOn ? styles.hotArrowActive : styles.hotArrowIdle)}
          aria-hidden
        >
          →
        </span>
        <div className={nodeCls(labVizStyles.node, !bOn && styles.dim, bOn && labVizStyles.nodeActive)}>
          <span className={labVizStyles.nodeLabel}>подграф</span>
          <span className={labVizStyles.nodeSub}>{ran ? '3 модуля' : '—'}</span>
        </div>
        <span
          className={nodeCls(styles.hotArrow, cOn ? styles.hotArrowActive : styles.hotArrowIdle)}
          aria-hidden
        >
          →
        </span>
        <div className={nodeCls(labVizStyles.node, !cOn && styles.dim, cOn && labVizStyles.nodeOk)}>
          <span className={labVizStyles.nodeLabel}>HMR patch</span>
          <span className={labVizStyles.nodeSub}>{ran ? 'state сохранён' : '—'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ColdViz({ caseId, ran }: { caseId: ColdCase; ran: boolean }) {
  const isHit = caseId === 'hit'
  const hitPath = ran && isHit
  const missPath = ran && !isHit

  const title = isHit ? 'build · cache hit' : 'build · cache miss'
  const meta = !ran ? 'ожидание' : isHit ? '~11s · cache HIT' : '~42s · cache MISS'

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.scheme}>
        <div
          className={nodeCls(
            styles.schemeTop,
            labVizStyles.node,
            !ran && styles.dim,
            ran && labVizStyles.nodeActive,
          )}
        >
          <span className={labVizStyles.nodeLabel}>npm run build</span>
          <span className={labVizStyles.nodeSub}>{ran ? 'production' : '—'}</span>
        </div>

        <div className={styles.schemeFork}>
          <span
            className={nodeCls(
              styles.schemeForkMiss,
              missPath ? styles.schemeForkMissActive : styles.schemeForkIdle,
            )}
          >
            miss ↙
          </span>
          <span className={labVizStyles.nodeLabel}>cache?</span>
          <span
            className={nodeCls(
              styles.schemeForkHit,
              hitPath ? styles.schemeForkHitActive : styles.schemeForkIdle,
            )}
          >
            ↘ hit
          </span>
        </div>

        <div className={styles.schemeBranch}>
          <div
            className={nodeCls(
              labVizStyles.node,
              !missPath && ran && styles.pathOff,
              !ran && styles.dim,
              missPath && labVizStyles.nodeActive,
              missPath && labVizStyles.nodeErr,
            )}
          >
            <span className={labVizStyles.nodeLabel}>full transpile</span>
            <span className={labVizStyles.nodeSub}>{missPath ? 'SWC + minify' : '—'}</span>
          </div>
          <span className={styles.schemeBranchArrow} aria-hidden>
            ↓
          </span>
        </div>

        <div className={styles.schemeBranch}>
          <div
            className={nodeCls(
              labVizStyles.node,
              !hitPath && ran && styles.pathOff,
              !ran && styles.dim,
              hitPath && labVizStyles.nodeOk,
              hitPath && labVizStyles.nodeActive,
            )}
          >
            <span className={labVizStyles.nodeLabel}>.webpack-cache</span>
            <span className={labVizStyles.nodeSub}>{hitPath ? 'читаем кэш' : '—'}</span>
          </div>
          <span className={styles.schemeBranchArrow} aria-hidden>
            ↓
          </span>
        </div>

        <div
          className={nodeCls(
            styles.schemeOut,
            labVizStyles.node,
            !ran && styles.dim,
            ran && labVizStyles.nodeOk,
          )}
        >
          <span className={labVizStyles.nodeLabel}>dist/</span>
          <span className={labVizStyles.nodeSub}>{ran ? 'готово' : 'ещё нет'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function ProjectHotColdLab() {
  const { lines, log, clear } = useLabLog()
  const [kind, setKind] = useState<Kind>('hot')
  const [caseId, setCaseId] = useState<CaseId>('incremental')
  const [ran, setRan] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const reset = () => {
    clear()
    setRan(false)
    setHint(null)
  }

  const pickKind = (next: Kind) => {
    setKind(next)
    setCaseId(CASES[next][0].id)
    reset()
  }

  const pickCase = (next: CaseId) => {
    setCaseId(next)
    reset()
  }

  const run = () => {
    clear()
    setRan(true)

    if (caseId === 'incremental') {
      log('info', 'save Button.tsx')
      log('ok', 'incremental: 3 модуля в подграфе')
      log('ok', 'HMR patch → UI без full reload')
      log('info', 'vendor и другие роуты не трогали')
      setHint('горячая: узкий подграф + HMR — см. webpack.dev.js')
      return
    }

    if (caseId === 'lazy') {
      log('info', 'маршрут /admin не открыт')
      log('ok', 'lazyCompilation: chunk не собран')
      log('info', 'открыли /admin → compile on demand')
      log('ok', 'chunk admin готов')
      setHint('lazy route собирают только после первого запроса')
      return
    }

    if (caseId === 'miss') {
      log('info', 'cold production build')
      log('err', 'cache MISS — полный transpile + minify')
      log('info', 'учебное время ~42s')
      setHint('первый cold дорогой — кэша на диске ещё нет')
      return
    }

    log('info', 'cold production build')
    log('ok', 'cache HIT — читаем .webpack-cache')
    log('info', 'учебное время ~11s')
    setHint('повторный cold быстрее — filesystem cache прогрет')
  }

  const problem = (
    <div className={shell.panel}>
      <KindSwitch value={kind} onChange={pickKind} />
      <CaseSwitch kind={kind} value={caseId} onChange={pickCase} />

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[kind]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {kind === 'hot' ? (
        <HotViz caseId={caseId as HotCase} ran={ran} />
      ) : (
        <ColdViz caseId={caseId as ColdCase} ran={ran} />
      )}

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}

      {ran ? <LabLogView lines={lines} /> : null}
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <KindSwitch value={kind} onChange={pickKind} />
      <InteractiveCodePanel
        key={kind}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[kind]}
        snippets={CODE_SNIPPETS[kind]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Горячая vs холодная сборка"
      lead="Dev ускоряют HMR и инкремент; prod и CI — кэш и быстрый transpile."
      problem={problem}
      code={code}
    />
  )
}
