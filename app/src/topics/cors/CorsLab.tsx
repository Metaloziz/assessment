import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '07-cors'

type Scenario = 'simple-ok' | 'preflight' | 'star-creds' | 'no-acao' | 'curl'

export function CorsLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('simple-ok')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()
    const page = 'https://app.example:5173'
    const api = 'https://api.example:3000'

    if (scenario === 'simple-ok') {
      log('info', `страница ${page}`)
      log('info', `GET ${api}/health  (simple: без кастомных headers)`)
      log('ok', 'Origin: https://app.example:5173')
      log('ok', 'Access-Control-Allow-Origin: https://app.example:5173')
      log('ok', 'браузер отдаёт ответ в JS')
      setHint('simple request — сразу GET, без OPTIONS')
      return
    }

    if (scenario === 'preflight') {
      log('info', `POST ${api}/orders  Content-Type: application/json`)
      log('info', 'браузер: сначала preflight OPTIONS')
      log('ok', 'Access-Control-Request-Method: POST')
      log('ok', 'Access-Control-Request-Headers: content-type')
      log('ok', 'ответ OPTIONS: Allow-Origin + Allow-Methods + Allow-Headers')
      log('ok', 'затем настоящий POST')
      setHint('без обработчика OPTIONS фронт увидит CORS error')
      return
    }

    if (scenario === 'star-creds') {
      log('info', `fetch(url, { credentials: 'include' })`)
      log('warn', 'сервер: Access-Control-Allow-Origin: *')
      log('err', 'браузер блокирует: * несовместим с credentials')
      log('ok', 'нужно: Allow-Origin = конкретный origin + Allow-Credentials: true')
      setHint('credentials → отражать Origin, не *')
      return
    }

    if (scenario === 'no-acao') {
      log('info', `fetch('${api}/data') из ${page}`)
      log('ok', 'сеть: HTTP 200, тело пришло на транспортном уровне')
      log('err', 'нет Access-Control-Allow-Origin → JS не читает ответ')
      log('info', 'curl/Postman тот же URL увидят 200 без ошибки CORS')
      setHint('CORS режет чтение в браузере, не «защищает сервер»')
      return
    }

    log('info', `curl -H "Origin: ${page}" ${api}/data`)
    log('ok', 'ответ 200 независимо от CORS-заголовков')
    log('warn', 'CORS — политика браузера для JS, не firewall API')
    setHint('проверка CORS только в браузере / DevTools')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Фронт на другом origin, чем API: браузер шлёт <code>Origin</code> и смотрит{' '}
        <code>Access-Control-Allow-*</code>. Без них <code>fetch</code> падает с CORS error — хотя
        сервер мог ответить 200.
      </p>
      <ol className={shell.steps}>
        <li>Выберите сценарий: simple, preflight, credentials, нет ACAO, curl.</li>
        <li>Нажмите «Прогнать» и разберите шаги в логе.</li>
        <li>
          Сверьте с «Код»: <code>server.js</code>, <code>api.ts</code>, <code>vite.config.ts</code>.
        </li>
      </ol>

      <div className={shell.row}>
        {(
          [
            ['simple-ok', 'Simple GET'],
            ['preflight', 'Preflight'],
            ['star-creds', '* + credentials'],
            ['no-acao', 'Без ACAO'],
            ['curl', 'curl'],
          ] as const
        ).map(([id, label]) => (
          <LabButton
            key={id}
            variant="ghost"
            size="sm"
            active={scenario === id}
            onClick={() => setScenario(id)}
          >
            {label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Прогнать
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setScenario('simple-ok')
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
        <p className={shell.hint}>Выберите сценарий.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Origin, `Access-Control-*`, preflight `OPTIONS`, `credentials` vs `*`."
      snippets={[
        {
          id: 'server',
          label: 'server.js',
          note: 'Явный origin при credentials; OPTIONS для preflight.',
          executable: false,
          code: `import express from 'express';

const app = express();
const ALLOWED = new Set(['https://app.example:5173']);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // ═══════════════════════════════════════════
  // CORS ← разрешаем только известные front-origin
  // ═══════════════════════════════════════════
  if (origin && ALLOWED.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // ← не * при cookie
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // ←
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS',
    );
  }

  // ═══════════════════════════════════════════
  // PREFLIGHT ← «сложный» запрос (JSON, PUT, …)
  // ═══════════════════════════════════════════
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // ← без тела
  }

  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/orders', express.json(), (req, res) => {
  res.status(201).json({ id: 1, ...req.body });
});

app.listen(3000);`,
        },
        {
          id: 'client',
          label: 'api.ts',
          note: '`credentials: include` требует конкретный Allow-Origin на API.',
          executable: false,
          code: `const API = 'https://api.example:3000';

// ═══════════════════════════════════════════
// SIMPLE ← GET без кастомных headers → без preflight
// ═══════════════════════════════════════════
export async function health() {
  const res = await fetch(\`\${API}/health\`, {
    credentials: 'include', // ← cookies cross-origin
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// ═══════════════════════════════════════════
// PREFLIGHT ← application/json → сначала OPTIONS
// ═══════════════════════════════════════════
export async function createOrder(body: unknown) {
  const res = await fetch(\`\${API}/orders\`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }, // ← триггер preflight
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}`,
        },
        {
          id: 'vite',
          label: 'vite.config.ts',
          note: 'Dev-proxy убирает cross-origin локально; на prod CORS на API всё равно нужен.',
          executable: false,
          code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // ═══════════════════════════════════════════
    // DEV PROXY ← браузер бьёт в :5173, Vite → API
    // Origin для страницы и «API» совпадает → без CORS в dev
    // ═══════════════════════════════════════════
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/api/, ''), // ←
      },
    },
  },
});

// В prod фронт и API на разных origin —
// нужен Access-Control-* на api.example, не только proxy.`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="CORS"
      lead="Simple vs preflight, Allow-Origin и ловушка `*` + credentials."
      problem={problem}
      code={code}
    />
  )
}
