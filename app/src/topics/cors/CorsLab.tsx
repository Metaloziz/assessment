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

type Scenario = 'simple' | 'preflight' | 'star'
type FlowPhase = 'idle' | 'browser' | 'preflight' | 'request' | 'ok' | 'blocked'

/** Cross-origin base: prod URL или localhost:3000 (не Vite proxy — иначе same-origin и CORS не виден). */
function corsApiUrl(path: string): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  const base = fromEnv || 'http://localhost:3000'
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

type FlowVizProps = {
  phase: FlowPhase
  scenario: Scenario | null
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
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [phase, setPhase] = useState<FlowPhase>('idle')
  const [busy, setBusy] = useState(false)
  const [pageOrigin, setPageOrigin] = useState('')

  useEffect(() => {
    setPageOrigin(window.location.origin)
  }, [])

  const run = async (next: Scenario) => {
    clear()
    setBusy(true)
    setScenario(next)
    setPhase('browser')
    setHint(null)

    try {
      if (next === 'simple') {
        const url = corsApiUrl('/api/cors/lab/simple')
        setPhase('request')
        const res = await fetch(url, { credentials: 'include' })
        const acao = res.headers.get('Access-Control-Allow-Origin')
        log('ok', `GET ${res.status} · ACAO: ${acao ?? '—'}`)
        setPhase('ok')
        setHint('simple GET — без OPTIONS, ACAO = Origin')
        return
      }

      if (next === 'preflight') {
        const url = corsApiUrl('/api/cors/lab/orders')
        setPhase('preflight')
        await new Promise((r) => setTimeout(r, 280))
        setPhase('request')
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: 'cors-lab' }),
        })
        const acao = res.headers.get('Access-Control-Allow-Origin')
        log('ok', `POST ${res.status} после OPTIONS · ACAO: ${acao}`)
        setPhase('ok')
        setHint('application/json → сначала OPTIONS')
        return
      }

      // star: * + credentials
      const url = corsApiUrl('/api/cors/lab/star')
      setPhase('request')
      try {
        await fetch(url, { credentials: 'include' })
        log('warn', 'запрос прошёл — проверьте Origin / credentials')
        setPhase('ok')
      } catch {
        log('err', 'блокировка: Allow-Origin: * + credentials')
        setPhase('blocked')
      }
      setHint('credentials → конкретный Origin, не *')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setPhase('blocked')
      setHint('сеть или CORS — DevTools → Network / Console')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    clear()
    setHint(null)
    setScenario(null)
    setPhase('idle')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Фронт и API на разных origin: браузер шлёт <code>Origin</code> и смотрит{' '}
        <code>Access-Control-Allow-Origin</code>. Без совпадения <code>fetch</code> падает — хотя
        сервер мог ответить 200.
      </p>
      <ol className={shell.steps}>
        <li>Нажмите сценарий — живой запрос и схема обновятся.</li>
        <li>
          Сверьте с «Код»: <code>index.ts</code>, <code>corsLab.ts</code>.
        </li>
      </ol>

      <CorsFlowViz phase={phase} scenario={scenario} pageOrigin={pageOrigin} />

      <div className={shell.row}>
        <LabButton
          variant="primary"
          disabled={busy}
          onClick={() => void run('simple')}
        >
          Simple GET
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => void run('preflight')}
        >
          Preflight
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => void run('star')}
        >
          * + credentials
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите сценарий — схема покажет ok или CORS error.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Глобальный CORS allow-list и учебные маршруты `/api/cors/lab/*`."
      snippets={[
        {
          id: 'index',
          label: 'server/src/index.ts',
          note: '`@fastify/cors`: origin из env, `credentials: true`.',
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
          note: 'Simple GET, POST с preflight и ловушка `*` + credentials.',
          executable: false,
          code: `app.get('/api/cors/lab/simple', async (req) => ({
  ok: true,
  origin: req.headers.origin ?? null, // ← global cors выставил ACAO
}));

app.post('/api/cors/lab/orders', async (req) => {
  // ← Content-Type: application/json → браузер шлёт OPTIONS
  return { ok: true, item: req.body?.item ?? 'widget' };
});

app.get('/api/cors/lab/star', async (_req, reply) => {
  // в onSend: Access-Control-Allow-Origin: *  // ← ловушка с credentials
  return { ok: true, acao: '*' };
});`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="CORS"
      lead="Браузер сверяет `Origin` с `Access-Control-Allow-*`: simple, preflight и ловушка `*`."
      problem={problem}
      code={code}
    />
  )
}
