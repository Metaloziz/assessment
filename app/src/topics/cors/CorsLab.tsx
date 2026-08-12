import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import styles from './CorsLab.module.css'

gsap.registerPlugin(useGSAP)

const TOPIC_ID = '07-cors'

type Scenario = 'simple-ok' | 'preflight' | 'star-creds' | 'no-acao' | 'curl'
type FlowPhase = 'idle' | 'browser' | 'preflight' | 'request' | 'ok' | 'blocked'

/** Cross-origin base: prod URL или localhost:3000 (не Vite proxy — иначе same-origin и CORS не виден). */
function corsApiUrl(path: string): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  const base = fromEnv || 'http://localhost:3000'
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

function pickHeader(res: Response, name: string): string | null {
  return res.headers.get(name)
}

type FlowVizProps = {
  phase: FlowPhase
  scenario: Scenario
  pageOrigin: string
}

function CorsFlowViz({ phase, scenario, pageOrigin }: FlowVizProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useGSAP(
    () => {
      if (reduced || !rootRef.current) return
      gsap.fromTo(
        rootRef.current.querySelectorAll('[data-node]'),
        { opacity: 0.55, y: 4 },
        { opacity: 1, y: 0, duration: 0.28, stagger: 0.05, ease: 'power2.out' },
      )
    },
    { scope: rootRef, dependencies: [phase, scenario] },
  )

  const showPreflight = scenario === 'preflight'
  const browserCls =
    phase === 'blocked'
      ? `${styles.node} ${styles.nodeErr}`
      : phase === 'ok'
        ? `${styles.node} ${styles.nodeOk}`
        : phase === 'idle'
          ? styles.node
          : `${styles.node} ${styles.nodeActive}`

  const apiCls =
    phase === 'ok'
      ? `${styles.node} ${styles.nodeOk}`
      : phase === 'request' || phase === 'preflight'
        ? `${styles.node} ${styles.nodeActive}`
        : styles.node

  const arrowCls = (active: boolean, err = false) =>
    `${styles.arrow}${err ? ` ${styles.arrowErr}` : active ? ` ${styles.arrowActive}` : ''}`

  return (
    <div ref={rootRef} className={styles.viz}>
      <div className={styles.vizHead}>
        <p className={styles.vizTitle}>Поток CORS</p>
        <p className={styles.vizMeta}>{pageOrigin || 'origin?'}</p>
      </div>
      <div className={styles.flow}>
        <div data-node className={browserCls}>
          <span className={styles.nodeLabel}>Browser</span>
          <span className={styles.nodeSub}>JS fetch</span>
        </div>
        <span className={arrowCls(phase !== 'idle', phase === 'blocked')}>→</span>
        {showPreflight ? (
          <>
            <div
              data-node
              className={
                phase === 'preflight' ? `${styles.node} ${styles.nodeActive}` : styles.node
              }
            >
              <span className={styles.nodeLabel}>OPTIONS</span>
              <span className={styles.nodeSub}>preflight</span>
            </div>
            <span className={arrowCls(phase === 'preflight' || phase === 'request' || phase === 'ok')}>
              →
            </span>
          </>
        ) : null}
        <div data-node className={apiCls}>
          <span className={styles.nodeLabel}>API</span>
          <span className={styles.nodeSub}>Access-Control-*</span>
        </div>
        <span className={arrowCls(phase === 'ok' || phase === 'blocked', phase === 'blocked')}>
          {phase === 'blocked' ? '✗' : '→'}
        </span>
        <div
          data-node
          className={
            phase === 'ok'
              ? `${styles.node} ${styles.nodeOk}`
              : phase === 'blocked'
                ? `${styles.node} ${styles.nodeErr}`
                : styles.node
          }
        >
          <span className={styles.nodeLabel}>JS</span>
          <span className={styles.nodeSub}>
            {phase === 'ok' ? 'читает тело' : phase === 'blocked' ? 'CORS error' : 'ждёт'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function CorsLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('simple-ok')
  const [hint, setHint] = useState<string | null>(null)
  const [phase, setPhase] = useState<FlowPhase>('idle')
  const [busy, setBusy] = useState(false)
  const [pageOrigin, setPageOrigin] = useState('')

  useEffect(() => {
    setPageOrigin(window.location.origin)
  }, [])

  const run = async () => {
    clear()
    setBusy(true)
    setPhase('browser')
    const origin = window.location.origin
    log('info', `страница Origin: ${origin}`)
    log('info', `API base: ${(import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000'}`)

    try {
      if (scenario === 'curl') {
        setPhase('request')
        log('info', 'curl / Postman не применяют Same-Origin Policy')
        log('ok', 'тот же URL без браузера отдаст 200 даже без ACAO')
        log('warn', 'CORS — политика браузера для JS, не firewall API')
        const url = corsApiUrl('/api/cors/lab/no-acao')
        log('info', `для сравнения: fetch(${url}) из JS…`)
        try {
          await fetch(url, { credentials: 'include' })
          log('warn', 'браузер неожиданно пропустил — проверьте, не same-origin ли запрос')
          setPhase('ok')
        } catch {
          log('err', 'в браузере: Failed to fetch (нет ACAO) — это и есть CORS')
          setPhase('blocked')
        }
        setHint('проверка CORS только в браузере / DevTools')
        return
      }

      if (scenario === 'simple-ok') {
        const url = corsApiUrl('/api/cors/lab/simple')
        log('info', `GET ${url} (simple, credentials)`)
        setPhase('request')
        const res = await fetch(url, { credentials: 'include' })
        const acao = pickHeader(res, 'Access-Control-Allow-Origin')
        const data = (await res.json()) as { ok?: boolean }
        log('ok', `HTTP ${res.status}`)
        log('ok', `Access-Control-Allow-Origin: ${acao ?? '(нет в JS — opaque?)'}`)
        log('ok', `тело: ${JSON.stringify(data)}`)
        setPhase('ok')
        setHint('simple request — сразу GET, без OPTIONS')
        return
      }

      if (scenario === 'preflight') {
        const url = corsApiUrl('/api/cors/lab/orders')
        log('info', `POST ${url} Content-Type: application/json`)
        log('info', 'браузер сначала шлёт preflight OPTIONS')
        setPhase('preflight')
        await new Promise((r) => setTimeout(r, 280))
        setPhase('request')
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: 'cors-lab' }),
        })
        const acao = pickHeader(res, 'Access-Control-Allow-Origin')
        const data = (await res.json()) as { ok?: boolean; item?: string }
        log('ok', `HTTP ${res.status} после preflight`)
        log('ok', `Access-Control-Allow-Origin: ${acao}`)
        log('ok', `тело: ${JSON.stringify(data)}`)
        setPhase('ok')
        setHint('без OPTIONS на API фронт увидит CORS error')
        return
      }

      if (scenario === 'star-creds') {
        const url = corsApiUrl('/api/cors/lab/star')
        log('info', `GET ${url} с credentials: 'include'`)
        log('warn', 'сервер отвечает Access-Control-Allow-Origin: *')
        setPhase('request')
        try {
          await fetch(url, { credentials: 'include' })
          log('warn', 'запрос прошёл — неожиданно (проверьте Origin / credentials)')
          setPhase('ok')
        } catch {
          log('err', 'браузер блокирует: * несовместим с credentials')
          log('ok', 'нужно: Allow-Origin = конкретный origin + Allow-Credentials: true')
          setPhase('blocked')
        }
        setHint('credentials → отражать Origin, не *')
        return
      }

      // no-acao
      const url = corsApiUrl('/api/cors/lab/no-acao')
      log('info', `GET ${url}`)
      setPhase('request')
      try {
        const res = await fetch(url, { credentials: 'include' })
        log('warn', `HTTP ${res.status} — но без ACAO чтение в JS обычно невозможно`)
        setPhase('blocked')
      } catch {
        log('err', 'Failed to fetch: нет Access-Control-Allow-Origin')
        log('info', 'на транспорте ответ мог быть 200 — JS его не видит')
        setPhase('blocked')
      }
      setHint('CORS режет чтение в браузере, не «защищает сервер»')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setPhase('blocked')
      setHint('CORS error или сеть — смотрите DevTools → Network / Console')
    } finally {
      setBusy(false)
    }
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Фронт и API на разных origin: браузер шлёт <code>Origin</code> и смотрит{' '}
        <code>Access-Control-Allow-*</code>. Без них <code>fetch</code> падает с CORS error — хотя
        сервер мог ответить 200.
      </p>
      <ol className={shell.steps}>
        <li>Выберите сценарий и нажмите «Прогнать» — запрос идёт в живой API.</li>
        <li>Сверьте поток на схеме и заголовки в логе / DevTools → Network.</li>
        <li>
          В «Код»: <code>index.ts</code>, <code>corsLab.ts</code>, <code>env.ts</code>.
        </li>
      </ol>

      <CorsFlowViz phase={phase} scenario={scenario} pageOrigin={pageOrigin} />

      <div className={shell.row}>
        {(
          [
            ['simple-ok', 'Simple GET'],
            ['preflight', 'Preflight'],
            ['star-creds', '* + credentials'],
            ['no-acao', 'Без ACAO'],
            ['curl', 'curl vs браузер'],
          ] as const
        ).map(([id, label]) => (
          <LabButton
            key={id}
            variant="ghost"
            size="sm"
            active={scenario === id}
            disabled={busy}
            onClick={() => {
              setScenario(id)
              setPhase('idle')
              setHint(null)
            }}
          >
            {label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={() => void run()}>
          Прогнать
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => {
            clear()
            setHint(null)
            setScenario('simple-ok')
            setPhase('idle')
          }}
        >
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите сценарий и прогоните против API.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Глобальный CORS allow-list и учебные маршруты `/api/cors/lab/*` (star / no-acao)."
      snippets={[
        {
          id: 'index',
          label: 'server/src/index.ts',
          note: '`@fastify/cors`: origin из env, credentials: true.',
          executable: false,
          code: `import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';
import { corsLabRoutes } from './routes/corsLab.js';

const app = Fastify({ logger: true });

// ═══════════════════════════════════════════
await app.register(cors, {
  origin: env.corsOrigins, // ← allow-list (Pages + localhost)
  credentials: true, // ← нельзя сочетать с Allow-Origin: *
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
// ═══════════════════════════════════════════

await app.register(corsLabRoutes);
await app.listen({ port: env.port, host: env.host });`,
        },
        {
          id: 'corsLab',
          label: 'server/src/routes/corsLab.ts',
          note: 'Демо: правильный simple/POST и намеренно «ломаные» star / no-acao.',
          executable: false,
          code: `// onSend: для учебных путей переписываем CORS-заголовки

app.get('/api/cors/lab/simple', async (req) => ({
  ok: true,
  origin: req.headers.origin ?? null, // ← global cors уже выставил ACAO
}));

app.post('/api/cors/lab/orders', async (req) => {
  // Content-Type: application/json → браузер шлёт OPTIONS (preflight)
  return { ok: true, item: req.body?.item ?? 'widget' };
});

app.get('/api/cors/lab/star', async (_req, reply) => {
  // в onSend: Access-Control-Allow-Origin: *  // ← ловушка с credentials
  return { ok: true, acao: '*' };
});

app.get('/api/cors/lab/no-acao', async (_req, reply) => {
  // в onSend: strip Access-Control-*  // ← JS не читает тело
  return { ok: true, kind: 'no-acao' };
});`,
        },
        {
          id: 'env',
          label: 'server/src/env.ts',
          note: 'CORS_ORIGINS на Render включает GitHub Pages.',
          executable: false,
          code: `export const env = {
  // …
  corsOrigins: (process.env.CORS_ORIGINS ??
    'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean), // ← https://metaloziz.github.io на проде
};`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="CORS"
      lead="Живой API: simple vs preflight, ловушка `*` + credentials, ответ без ACAO."
      problem={problem}
      code={code}
    />
  )
}
