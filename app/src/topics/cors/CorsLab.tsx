import { useEffect, useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import { apiUrl } from '../../lib/apiBase'
import styles from './CorsLab.module.css'

const TOPIC_ID = '07-cors'

type Scenario = 'simple' | 'preflight' | 'star'
type FlowPhase = 'idle' | 'browser' | 'preflight' | 'request' | 'ok' | 'blocked'

const CASES: Array<{ id: Scenario; label: string }> = [
  { id: 'simple', label: 'Простой GET' },
  { id: 'preflight', label: 'Сначала OPTIONS' },
  { id: 'star', label: 'Звёздочка + cookies' },
]

const PAIN = (
  <>
    Страница и API на разных origin: браузер шлёт <code>Origin</code> и смотрит{' '}
    <code>Access-Control-Allow-Origin</code>. Без совпадения <code>fetch</code> падает — хотя
    сервер мог ответить 200.
  </>
)

const CASE_BRIEF: Record<Scenario, ReactNode> = {
  simple: (
    <>
      Обычный GET без JSON-тела: браузер идёт сразу к API и сверяет заголовок разрешения с origin
      страницы.
    </>
  ),
  preflight: (
    <>
      POST с <code>application/json</code> — сначала короткий <code>OPTIONS</code>, потом сам
      запрос.
    </>
  ),
  star: (
    <>
      Ответ с <code>Allow-Origin: *</code> при <code>credentials: include</code> браузер режет — нужен
      конкретный origin.
    </>
  ),
}

const CASE_HINT: Record<Scenario, string> = {
  simple: 'простой GET — без OPTIONS, разрешение совпало с origin страницы',
  preflight: 'JSON POST — сначала OPTIONS, потом тело ответа доступно JS',
  star: 'cookies / credentials требуют конкретный Origin, не *',
}

type FlowVizProps = {
  phase: FlowPhase
  scenario: Scenario
  pageOrigin: string
}

function CorsFlowViz({ phase, scenario, pageOrigin }: FlowVizProps) {
  const showPreflight = scenario === 'preflight'
  const browserState: LabNodeState =
    phase === 'blocked' ? 'err' : phase === 'ok' ? 'ok' : phase === 'idle' ? 'idle' : 'active'
  const apiState: LabNodeState =
    phase === 'ok' ? 'ok' : phase === 'request' || phase === 'preflight' ? 'active' : 'idle'
  const jsState: LabNodeState = phase === 'ok' ? 'ok' : phase === 'blocked' ? 'err' : 'idle'

  const arrowCls = (active: boolean, err = false) =>
    `${styles.arrow}${err ? ` ${styles.arrowErr}` : active ? ` ${styles.arrowActive}` : ''}`

  return (
    <LabVizPanel title="Поток запроса" meta={pageOrigin || 'origin?'}>
      <div className={styles.flow}>
        <LabNode label="Страница" sub="fetch из JS" state={browserState} />
        <span className={arrowCls(phase !== 'idle', phase === 'blocked')}>→</span>
        {showPreflight ? (
          <>
            <LabNode
              label="OPTIONS"
              sub="можно ли?"
              state={phase === 'preflight' ? 'active' : 'idle'}
            />
            <span className={arrowCls(phase === 'preflight' || phase === 'request' || phase === 'ok')}>
              →
            </span>
          </>
        ) : null}
        <LabNode label="API" sub="Access-Control-*" state={apiState} />
        <span className={arrowCls(phase === 'ok' || phase === 'blocked', phase === 'blocked')}>
          {phase === 'blocked' ? '✗' : '→'}
        </span>
        <LabNode
          label="JS на странице"
          sub={phase === 'ok' ? 'читает тело' : phase === 'blocked' ? 'CORS error' : 'ждёт'}
          state={jsState}
        />
      </div>
    </LabVizPanel>
  )
}

export function CorsLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('simple')
  const [hint, setHint] = useState<string | null>(null)
  const [phase, setPhase] = useState<FlowPhase>('idle')
  const [busy, setBusy] = useState(false)
  const [pageOrigin, setPageOrigin] = useState('')
  const runIdRef = useRef(0)

  useEffect(() => {
    setPageOrigin(window.location.origin)
  }, [])

  const selectCase = (next: Scenario) => {
    if (busy) return
    setScenario(next)
    setHint(null)
    setPhase('idle')
    clear()
  }

  const run = async () => {
    const runId = ++runIdRef.current
    clear()
    setBusy(true)
    setPhase('browser')
    setHint(null)

    try {
      if (scenario === 'simple') {
        const url = apiUrl('/api/cors/lab/simple')
        setPhase('request')
        const res = await fetch(url, { credentials: 'include' })
        if (runId !== runIdRef.current) return
        const acao = res.headers.get('Access-Control-Allow-Origin')
        log('ok', `GET ${res.status} · разрешение: ${acao ?? '—'}`)
        setPhase('ok')
        setHint(CASE_HINT.simple)
        return
      }

      if (scenario === 'preflight') {
        const url = apiUrl('/api/cors/lab/orders')
        setPhase('preflight')
        await new Promise((r) => setTimeout(r, 320))
        if (runId !== runIdRef.current) return
        setPhase('request')
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: 'cors-lab' }),
        })
        if (runId !== runIdRef.current) return
        const acao = res.headers.get('Access-Control-Allow-Origin')
        log('ok', `POST ${res.status} после OPTIONS · разрешение: ${acao ?? '—'}`)
        setPhase('ok')
        setHint(CASE_HINT.preflight)
        return
      }

      const url = apiUrl('/api/cors/lab/star')
      setPhase('request')
      try {
        await fetch(url, { credentials: 'include' })
        if (runId !== runIdRef.current) return
        log('warn', 'запрос прошёл — проверьте Origin и credentials')
        setPhase('ok')
      } catch {
        if (runId !== runIdRef.current) return
        log('err', 'блокировка: Allow-Origin: * + credentials')
        setPhase('blocked')
      }
      setHint(CASE_HINT.star)
    } catch (e) {
      if (runId !== runIdRef.current) return
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setPhase('blocked')
      setHint('сеть или CORS — смотрите Network / Console в DevTools')
    } finally {
      if (runId === runIdRef.current) setBusy(false)
    }
  }

  const reset = () => {
    runIdRef.current += 1
    clear()
    setHint(null)
    setScenario('simple')
    setPhase('idle')
    setBusy(false)
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={scenario === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={() => void run()}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[scenario]}</p>

      <CorsFlowViz phase={phase} scenario={scenario} pageOrigin={pageOrigin} />

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
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
    </div>
  )

  return (
    <JsLabShell
      title="CORS"
      lead="Браузер сверяет origin страницы с `Access-Control-Allow-*`: простой запрос, OPTIONS и ловушка `*`."
      problem={problem}
      code={code}
    />
  )
}
