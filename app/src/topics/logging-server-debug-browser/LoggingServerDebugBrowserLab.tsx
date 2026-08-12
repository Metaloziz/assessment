import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '147-logging-server-debug-browser'

type Mode = 'inspect' | 'breakpoint' | 'danger'

export function LoggingServerDebugBrowserLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('inspect')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()
    if (mode === 'inspect') {
      log('info', 'node --inspect dist/server.js')
      log('ok', 'Debugger listening on ws://127.0.0.1:9229/…')
      log('ok', 'Chrome → chrome://inspect → Open dedicated DevTools')
      setHint('см. «Код» → package.json scripts')
      return
    }
    if (mode === 'breakpoint') {
      log('info', 'Sources → routes/pay.js · breakpoint на validate')
      log('ok', 'Scope: req.body, userId · Call Stack: middleware → handler')
      log('info', 'Network во вкладке сайта ≠ пауза в Node')
      setHint('серверный Sources — см. pay.route.js')
      return
    }
    log('err', '--inspect=0.0.0.0:9229 в публичном контейнере')
    log('err', 'любой в сети может подключить DevTools к процессу')
    log('ok', 'только localhost / VPN / выключено на prod')
    setHint('не светить inspect наружу')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Серверный Node отлаживают через Inspector и Chrome, как клиентский Sources — но цель
        процесс на <code>9229</code>. Скрипты запуска — во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>Выберите Inspect, Breakpoint или Danger.</li>
        <li>
          Откройте «Код»: <code>package.json</code>, handler, замечания по Docker.
        </li>
        <li>Сверьте лог с флагами <code>--inspect</code>.</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'inspect'}
          onClick={() => setMode('inspect')}
        >
          Inspect
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'breakpoint'}
          onClick={() => setMode('breakpoint')}
        >
          Breakpoint
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'danger'}
          onClick={() => setMode('danger')}
        >
          Danger
        </LabButton>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
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
      intro="`node --inspect` + chrome://inspect; breakpoint в handler."
      snippets={[
        {
          id: 'package-json',
          label: 'package.json',
          note: 'Dev-скрипты с inspect; на проде флаг не включать.',
          executable: false,
          languageLabel: 'json',
          code: `{
  "name": "shop-api",
  "private": true,
  "scripts": {
    // ═══════════════════════════════════════════
    // INSPECT ← Chrome DevTools Protocol :9229
    // ═══════════════════════════════════════════
    "dev": "node --watch --inspect dist/server.js",
    "dev:break": "node --inspect-brk dist/server.js",
    "start": "node dist/server.js"
  }
}`,
        },
        {
          id: 'pay-route',
          label: 'routes/pay.js',
          note: 'В DevTools (Node) — breakpoint / debugger, как на клиенте.',
          executable: false,
          code: `import { Router } from 'express';
import { charge } from '../payments.js';

const router = Router();

// ═══════════════════════════════════════════
// SERVER BREAKPOINT ← chrome://inspect → Sources
// ═══════════════════════════════════════════
router.post('/pay', async (req, res) => {
  const { cartId, token } = req.body;

  debugger; // ← пауза в процессе Node (DevTools открыты)

  try {
    const result = await charge({ cartId, token });
    // Scope: cartId, result · Call Stack: router → charge
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'payment_failed' });
  }
});

export default router;

// Клиентская вкладка Network показывает HTTP,
// но не останавливает эту строку — нужен --inspect`,
        },
        {
          id: 'docker-note',
          label: 'docker-compose.dev.yml',
          note: 'Проброс 9229 только для локального/VPN доступа.',
          executable: false,
          languageLabel: 'yaml',
          code: `services:
  api:
    build: .
    command: node --inspect=0.0.0.0:9229 dist/server.js
    ports:
      - "3000:3000"
      # ═══════════════════════════════════════════
      # DEBUG PORT ← не публиковать в интернет
      # ═══════════════════════════════════════════
      - "9229:9229" # ← только dev-машина / VPN
    # production: без --inspect и без publish 9229`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Дебаг сервера через Chrome"
      lead="Сценарии inspect и безопасности порта; скрипты — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}
