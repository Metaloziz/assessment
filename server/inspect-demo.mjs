/**
 * Локальный стенд для темы 147 — реальный node --inspect.
 *
 *   cd server
 *   npm run inspect:demo
 *
 * Chrome → chrome://inspect → Remote Target → inspect
 * Откройте Sources → inspect-demo.mjs → breakpoint на debugger (или F8 Resume)
 * Триггер: curl -X POST http://127.0.0.1:3333/pay -H "Content-Type: application/json" -d "{\"cartId\":\"c1\",\"token\":\"secret\"}"
 * или кнопка «Оплатить» на http://127.0.0.1:3333/
 */

import http from 'node:http'
import { URL } from 'node:url'

const PORT = Number(process.env.INSPECT_DEMO_PORT ?? 3333)
const HOST = '127.0.0.1'

async function readJson(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function charge({ cartId, token }) {
  return {
    id: `ch_${Date.now().toString(36)}`,
    cartId,
    tokenProcessed: Boolean(token),
  }
}

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Inspect demo · POST /pay</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; line-height: 1.5; }
    code { background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 4px; }
    button { padding: 0.5rem 1rem; font-size: 1rem; cursor: pointer; }
    pre { background: #18181b; color: #e4e4e7; padding: 1rem; border-radius: 8px; overflow: auto; }
  </style>
</head>
<body>
  <h1>Inspect demo</h1>
  <p>Сервер запущен с <code>node --inspect</code>. DevTools подключайте к <strong>процессу Node</strong> (<code>chrome://inspect</code>), не к этой вкладке.</p>
  <ol>
    <li><code>chrome://inspect</code> → inspect у Remote Target</li>
    <li>Sources → <code>inspect-demo.mjs</code> → line breakpoint или ждите <code>debugger;</code></li>
    <li>Нажмите кнопку ниже — пауза в Node, Scope: <code>cartId</code>, <code>token</code></li>
  </ol>
  <button type="button" id="pay">Оплатить (POST /pay)</button>
  <pre id="out">—</pre>
  <script>
    document.getElementById('pay').onclick = async () => {
      const out = document.getElementById('out');
      out.textContent = 'fetch…';
      try {
        const res = await fetch('/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: 'cart-demo', token: 'tok_local_secret' }),
        });
        const json = await res.json();
        out.textContent = JSON.stringify(json, null, 2);
      } catch (e) {
        out.textContent = String(e);
      }
    };
  </script>
</body>
</html>`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(HTML)
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, inspect: process.debugPort, pid: process.pid }))
    return
  }

  if (req.method === 'POST' && url.pathname === '/pay') {
    try {
      const body = await readJson(req)
      const cartId = typeof body.cartId === 'string' ? body.cartId : 'cart-demo'
      const token = typeof body.token === 'string' ? body.token : 'tok-demo'
      const userId = 'user-42'

      // ═══════════════════════════════════════════
      // BREAKPOINT ← chrome://inspect → Sources (Node)
      // ═══════════════════════════════════════════
      debugger

      const result = charge({ cartId, token })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          chargeId: result.id,
          userId,
        }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: message }))
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'not_found' }))
})

server.listen(PORT, HOST, () => {
  const inspect = process.debugPort
  console.log('')
  console.log('  Inspect demo')
  console.log(`  HTTP   http://${HOST}:${PORT}/`)
  console.log(`  POST   http://${HOST}:${PORT}/pay`)
  if (inspect > 0) {
    console.log(`  Debug  ws://${HOST}:${inspect}  →  chrome://inspect`)
  } else {
    console.log('  Debug  запустите: npm run inspect:demo')
  }
  console.log('')
})
