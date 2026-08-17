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
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import styles from './BundleCdnLab.module.css'

const TOPIC_ID = '15-bundle-cdn'
const STEP = 0.55

type Pattern = 'build' | 'cdn'
type BuildCase = 'monolith' | 'split'
type CdnCase = 'immutable' | 'notModified' | 'gzip'
type CaseId = BuildCase | CdnCase

type BuildPhase = 'idle' | 'bundle' | 'emit' | 'done'
type CdnPhase = 'idle' | 'request' | 'edge' | 'origin' | 'done'

type CdnReceipt = {
  status: number
  cacheControl: string
  etag?: string
  encoding?: string
  wireBytes: number
  rawBytes?: number
  summary: string
}

const CHUNK_ETAG = '"app-a1b2c3"'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'build', label: 'Сборка' },
  { id: 'cdn', label: 'CDN / кеш' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  build: [
    { id: 'monolith', label: 'Monolith' },
    { id: 'split', label: 'Code split' },
  ],
  cdn: [
    { id: 'immutable', label: 'Hashed chunk' },
    { id: 'notModified', label: '304' },
    { id: 'gzip', label: 'gzip' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  build: (
    <>
      Tree shaking и code splitting режут начальный бандл на этапе сборки — что попадёт в первый
      чанк, решает граф <code>import</code>.
    </>
  ),
  cdn: (
    <>
      CDN и браузер кешируют уже собранные файлы по заголовкам ответа. Схема показывает{' '}
      <code>Cache-Control</code>, <code>ETag</code> / <code>304</code> и сжатие на проводе — без
      отдельного бэка.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  monolith: <>Admin и main в одном чанке — редкий маршрут тянется на первом экране.</>,
  split: (
    <>
      <code>import()</code> выносит admin в отдельный файл — стартовый JS легче.
    </>
  ),
  immutable: (
    <>
      Первый запрос hashed-чанка — <code>200</code>, <code>immutable</code> и запись на edge.
    </>
  ),
  notModified: (
    <>
      Повтор с тем же <code>ETag</code> — <code>304</code> с edge, origin не отдаёт тело.
    </>
  ),
  gzip: (
    <>
      Edge отдаёт <code>Content-Encoding: gzip</code> — меньше байт на проводе, minify — другой этап.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  build: 'Tree shaking, dynamic import и `contenthash` в output — артефакты сборки.',
  cdn: 'Nginx / CDN: long cache для hashed assets, короткий для `index.html`, gzip на edge.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  build: [
    {
      id: 'vite-split',
      label: 'vite.config.ts',
      note: 'Manual chunks и dynamic import — admin не в initial bundle.',
      executable: false,
      languageLabel: 'ts',
      code: `import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // ← contenthash в имени = безопасный long cache на CDN
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        manualChunks: {
          vendor: ['react', 'react-dom'], // ← vendor отдельно от app
        },
      },
    },
  },
});`,
    },
    {
      id: 'lazy-route',
      label: 'src/routes/AdminRoute.tsx',
      note: 'Dynamic import — чанк грузится только при переходе на /admin.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { lazy, Suspense } from 'react';

// ← отдельный чанк admin.[hash].js
const AdminPage = lazy(() => import('./AdminPage'));

export const AdminRoute = () => (
  <Suspense fallback={<p>…</p>}>
    <AdminPage />
  </Suspense>
);`,
    },
    {
      id: 'side-effects',
      label: 'package.json',
      note: '`sideEffects: false` — подсказка bundler’у для tree shaking.',
      executable: false,
      languageLabel: 'json',
      code: `{
  "name": "shop-ui",
  "sideEffects": false,
  "dependencies": {
    "lodash-es": "^4.17.21"
  }
}`,
    },
  ],
  cdn: [
    {
      id: 'nginx-cache',
      label: 'deploy/nginx.conf',
      note: 'index.html — короткий кеш; hashed assets — immutable.',
      executable: false,
      languageLabel: 'nginx',
      code: `location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
  gzip on; # ← сжатие на edge / origin
}

location = /index.html {
  add_header Cache-Control "no-cache"; # ← shell перепроверяем
}`,
    },
    {
      id: 'origin-headers',
      label: 'origin/express.static.ts',
      note: 'ETag на hashed chunk; 304 по If-None-Match.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/assets/app.*.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('ETag', CHUNK_ETAG); // ← revalidate

  if (req.headers['if-none-match'] === CHUNK_ETAG) {
    return res.status(304).end(); // ← тело не отдаём
  }
  res.sendFile('dist/app.a1b2c3.js');
});`,
    },
    {
      id: 'html-shell',
      label: 'dist/index.html',
      note: 'Shell ссылается на актуальные hashed-имена чанков.',
      executable: false,
      languageLabel: 'html',
      code: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <!-- ← короткий кеш на HTML; чанки — immutable -->
    <script type="module" src="/assets/app.a1b2c3.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`,
    },
  ],
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
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

function chunkCls(active: boolean, ok: boolean, warn = false) {
  return [
    styles.chunk,
    active ? styles.chunkActive : styles.chunkIdle,
    ok ? styles.chunkOk : '',
    warn ? styles.chunkWarn : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function BuildViz({ phase, caseId }: { phase: BuildPhase; caseId: BuildCase }) {
  const split = caseId === 'split'
  const started = phase !== 'idle'
  const done = phase === 'done'

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : done
        ? split
          ? 'main + admin.chunk'
          : 'main.js · admin внутри'
        : phase === 'bundle'
          ? 'rollup graph…'
          : 'emit chunks…'

  return (
    <LabVizPanel title="Артефакты сборки" meta={meta}>
      <div className={styles.buildLayout}>
        <div className={styles.buildRow}>
          <div className={chunkCls(started && phase === 'bundle', done)}>
            <span className={styles.chunkLabel}>src/</span>
            <span className={styles.chunkSub}>routes · utils</span>
          </div>
          <span className={`${styles.arrow}${started ? ` ${styles.arrowActive}` : ''}`}>→</span>
          <div
            className={chunkCls(started && !done, done, !split && done)}
          >
            <span className={styles.chunkLabel}>main.[hash].js</span>
            <span className={styles.chunkSub}>
              {split ? 'bootstrap' : 'bootstrap + admin'}
            </span>
          </div>
          {split ? (
            <>
              <span
                className={`${styles.arrow}${
                  (phase === 'emit' || done) ? ` ${styles.arrowOk}` : ''
                }`}
              >
                +
              </span>
              <div className={[chunkCls(phase === 'emit', done), styles.chunkWide].join(' ')}>
                <span className={styles.chunkLabel}>admin.[hash].js</span>
                <span className={styles.chunkSub}>lazy · on route</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </LabVizPanel>
  )
}

function HeaderStrip({ receipt }: { receipt: CdnReceipt | null }) {
  if (!receipt) return null

  const rows: Array<{ key: string; val: string; ok?: boolean }> = [
    { key: 'status', val: String(receipt.status), ok: receipt.status === 304 },
    { key: 'Cache-Control', val: receipt.cacheControl },
  ]
  if (receipt.etag) rows.push({ key: 'ETag', val: receipt.etag })
  if (receipt.encoding) rows.push({ key: 'Content-Encoding', val: receipt.encoding, ok: true })
  rows.push({
    key: 'body',
    val:
      receipt.rawBytes != null
        ? `${receipt.wireBytes} B wire · ${receipt.rawBytes} B raw`
        : `${receipt.wireBytes} B`,
    ok: receipt.status === 304,
  })

  return (
    <div className={styles.headers}>
      {rows.map((row) => (
        <div key={row.key} className={styles.headerRow}>
          <span className={styles.headerKey}>{row.key}</span>
          <span className={[styles.headerVal, row.ok ? styles.headerValOk : ''].filter(Boolean).join(' ')}>
            {row.val}
          </span>
        </div>
      ))}
    </div>
  )
}

function CdnCacheViz({
  phase,
  caseId,
  receipt,
}: {
  phase: CdnPhase
  caseId: CdnCase
  receipt: CdnReceipt | null
}) {
  const hit = caseId === 'notModified'
  const started = phase !== 'idle'
  const done = phase === 'done'

  const browserState: LabNodeState =
    phase === 'idle' ? 'idle' : phase === 'done' ? 'ok' : 'active'
  const edgeState: LabNodeState =
    phase === 'edge' || phase === 'origin'
      ? 'active'
      : done
        ? 'ok'
        : 'idle'
  const originState: LabNodeState =
    hit
      ? 'idle'
      : phase === 'origin'
        ? 'active'
        : done
          ? 'ok'
          : 'idle'

  const hitActive = started && hit
  const missActive = started && !hit
  const hitPathOff = started && !hit
  const missPathOff = started && hit

  const meta =
    done && receipt
      ? receipt.summary
      : phase === 'idle'
        ? 'ожидание'
        : hit
          ? 'edge lookup…'
          : 'miss → origin…'

  const nodeCls = (off: boolean) => (off ? styles.pathOff : '')

  return (
    <LabVizPanel title="CDN / кеш" meta={meta}>
      <div className={styles.cdnScheme}>
        <div className={styles.cdnTop}>
          <LabNode label="Browser" sub="GET app.[hash].js" state={browserState} />
        </div>
        <div className={styles.cdnFork}>
          <span
            className={[
              styles.cdnForkHit,
              hitActive ? styles.cdnForkHitActive : styles.cdnForkIdle,
            ].join(' ')}
          >
            hit · 304
          </span>
          <span>↙ ↘</span>
          <span
            className={[
              styles.cdnForkMiss,
              missActive ? styles.cdnForkMissActive : styles.cdnForkIdle,
            ].join(' ')}
          >
            miss · 200
          </span>
        </div>
        <div className={styles.cdnBranch}>
          <div className={nodeCls(hitPathOff)}>
            <LabNode
              label="CDN edge"
              sub={hit && done ? '304 · cached' : 'HIT'}
              state={hit && started ? edgeState : hitPathOff ? 'idle' : edgeState}
            />
          </div>
          <span className={styles.cdnBranchArrow}>↓</span>
          <div className={nodeCls(hitPathOff)}>
            <LabNode label="Response" sub={hit && done ? '0 B' : '—'} state={hit && done ? 'ok' : 'idle'} />
          </div>
        </div>
        <div className={styles.cdnBranch}>
          <div className={nodeCls(missPathOff)}>
            <LabNode label="CDN edge" sub="MISS" state={missActive ? edgeState : 'idle'} />
          </div>
          <span className={styles.cdnBranchArrow}>↓</span>
          <div className={nodeCls(missPathOff)}>
            <LabNode label="Origin" sub="200 + body" state={originState} />
          </div>
          <span className={styles.cdnBranchArrow}>↓</span>
          <div className={nodeCls(missPathOff)}>
            <LabNode
              label="Response"
              sub={!hit && done && receipt ? `${receipt.wireBytes} B` : '—'}
              state={!hit && done ? 'ok' : 'idle'}
            />
          </div>
        </div>
        <div className={styles.cdnOut}>
          <LabNode
            label="Browser cache"
            sub={done ? (hit ? 'valid · revalidate' : 'store immutable') : '…'}
            state={done ? 'ok' : 'idle'}
          />
        </div>
      </div>
      <HeaderStrip receipt={receipt} />
    </LabVizPanel>
  )
}

function GzipViz({
  phase,
  receipt,
}: {
  phase: CdnPhase
  receipt: CdnReceipt | null
}) {
  const started = phase !== 'idle'
  const done = phase === 'done'
  const raw = receipt?.rawBytes ?? 48_000
  const wire = receipt?.wireBytes ?? 4_200

  const rawPct = done ? 100 : started ? 88 : 18
  const wirePct = done ? Math.round((wire / raw) * 100) : started ? 12 : 8

  return (
    <LabVizPanel
      title="Сжатие на проводе"
      meta={done && receipt ? receipt.summary : started ? 'gzip…' : 'ожидание'}
    >
      <div className={styles.compressRow}>
        <div className={styles.compressLane}>
          <span className={styles.compressLabel}>raw</span>
          <div
            className={[styles.compressBar, started ? styles.compressBarActive : ''].filter(Boolean).join(' ')}
            style={{ width: `${rawPct}%` }}
          />
          <span className={styles.compressMeta}>{raw} B</span>
        </div>
        <div className={styles.compressLane}>
          <span className={styles.compressLabel}>gzip</span>
          <div
            className={[styles.compressBar, done ? styles.compressBarOk : started ? styles.compressBarActive : '']
              .filter(Boolean)
              .join(' ')}
            style={{ width: `${Math.max(wirePct, 8)}%` }}
          />
          <span className={styles.compressMeta}>{done ? `${wire} B` : '…'}</span>
        </div>
      </div>
      <HeaderStrip receipt={receipt} />
    </LabVizPanel>
  )
}

function simulateCdn(caseId: CdnCase): CdnReceipt {
  if (caseId === 'immutable') {
    return {
      status: 200,
      cacheControl: 'public, max-age=31536000, immutable',
      etag: CHUNK_ETAG,
      wireBytes: 42_000,
      summary: '200 · miss · 42 KB · immutable',
    }
  }
  if (caseId === 'notModified') {
    return {
      status: 304,
      cacheControl: 'public, max-age=31536000, immutable',
      etag: CHUNK_ETAG,
      wireBytes: 0,
      summary: '304 · edge hit · 0 B',
    }
  }
  return {
    status: 200,
    cacheControl: 'public, max-age=3600',
    encoding: 'gzip',
    wireBytes: 4_200,
    rawBytes: 48_000,
    summary: '200 · gzip · 4.2 KB wire',
  }
}

export function BundleCdnLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('cdn')
  const [caseId, setCaseId] = useState<CaseId>('immutable')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle')
  const [cdnPhase, setCdnPhase] = useState<CdnPhase>('idle')
  const [receipt, setReceipt] = useState<CdnReceipt | null>(null)

  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const resetViz = () => {
    setBuildPhase('idle')
    setCdnPhase('idle')
    setHint(null)
    setReceipt(null)
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

  const runBuild = () => {
    clear()
    resetViz()
    setBusy(true)
    const split = caseId === 'split'

    playTimeline(
      tlRef,
      [
        () => setBuildPhase('bundle'),
        () => setBuildPhase('emit'),
        () => {
          setBuildPhase('done')
          if (split) {
            log('ok', 'main.[hash].js + admin.[hash].js — admin не в initial')
            setHint('code splitting режет первый чанк, не сумму всех маршрутов')
          } else {
            log('warn', 'main.[hash].js включает admin — старт тяжелее')
            setHint('без dynamic import редкий маршрут в initial bundle')
          }
        },
      ],
      () => setBusy(false),
    )
  }

  const runCdn = () => {
    clear()
    resetViz()
    setBusy(true)
    const cdnCase = caseId as CdnCase
    const hit = cdnCase === 'notModified'
    const gzip = cdnCase === 'gzip'

    playTimeline(
      tlRef,
      [
        () => setCdnPhase('request'),
        () => setCdnPhase('edge'),
        () => setCdnPhase(hit ? 'done' : 'origin'),
        () => {
          const next = simulateCdn(cdnCase)
          setReceipt(next)
          setCdnPhase('done')
          if (hit) {
            log('ok', next.summary)
            setHint('304 — тело не качается, ETag совпал')
          } else if (gzip) {
            log('ok', `${next.summary} (raw ${next.rawBytes} B)`)
            setHint('minify режет исходник; gzip — байты на проводе')
          } else {
            log('ok', next.summary)
            setHint('immutable + ETag — hashed chunk можно кешировать годами')
          }
        },
      ],
      () => setBusy(false),
    )
  }

  const run = () => {
    if (pattern === 'build') runBuild()
    else runCdn()
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('cdn')
    setCaseId('immutable')
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

      {pattern === 'build' ? (
        <BuildViz phase={buildPhase} caseId={caseId as BuildCase} />
      ) : caseId === 'gzip' ? (
        <GzipViz phase={cdnPhase} receipt={receipt} />
      ) : (
        <CdnCacheViz phase={cdnPhase} caseId={caseId as CdnCase} receipt={receipt} />
      )}

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
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
      title="Бандл и CDN"
      lead="Сборка режет initial chunk; CDN — кеш, 304 и gzip на схеме без отдельного API."
      problem={problem}
      code={code}
    />
  )
}
