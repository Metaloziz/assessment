import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '13-csrf'

type Scenario = 'attack' | 'samesite' | 'token' | 'bearer'

export function CsrfLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('attack')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()

    if (scenario === 'attack') {
      log('info', 'victim залогинен на bank.com (Cookie: session=…)')
      log('warn', 'открыл evil.com → auto-submit POST /transfer')
      log('err', 'браузер сам приложил Cookie к bank.com')
      log('err', 'перевод выполнен; evil.com ответ читать не может — и не нужно')
      setHint('CSRF = действие с чужой cookie-сессией')
      return
    }

    if (scenario === 'samesite') {
      log('info', 'Set-Cookie: session=…; SameSite=Lax; Secure; HttpOnly')
      log('ok', 'cross-site POST с evil.com — session cookie не уходит')
      log('warn', 'Lax всё же шлёт cookie на top-level GET — мутации не через GET')
      log('ok', 'Strict жёстче; None — только с отдельной CSRF-защитой')
      setHint('SameSite режет типичный cross-site POST')
      return
    }

    if (scenario === 'token') {
      log('info', 'форма bank.com: hidden _csrf = секрет из сессии')
      log('ok', 'сервер: body._csrf === session.csrf → иначе 403')
      log('ok', 'evil.com не знает токен и не прочитает его из ответа (SOP)')
      log('warn', 'XSS на bank.com токен украдёт — CSRF-защита падает')
      setHint('synchronizer token + SameSite')
      return
    }

    log('info', 'API ждёт Authorization: Bearer <access>')
    log('ok', 'браузер сам Bearer не подставит с evil.com')
    log('ok', 'классический cookie-CSRF на такой endpoint не срабатывает')
    log('warn', 'если access снова в cookie — модель CSRF возвращается')
    setHint('Bearer в header ≠ cookie auto-send')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Чужой сайт инициирует запрос на ваш origin — браузер сам прикладывает session cookie и
        выполняет действие от имени жертвы. Нужны <code>SameSite</code>, CSRF-токен и понимание, чем
        это отличается от Bearer.
      </p>
      <ol className={shell.steps}>
        <li>Выберите сценарий: атака, SameSite, токен или Bearer.</li>
        <li>Прогоните и сравните, уходит ли cookie / проходит ли мутация.</li>
        <li>
          В «Код»: <code>evil.html</code>, <code>server.js</code>, <code>apiClient.ts</code>.
        </li>
      </ol>

      <div className={shell.row}>
        {(
          [
            ['attack', 'Атака'],
            ['samesite', 'SameSite'],
            ['token', 'CSRF token'],
            ['bearer', 'Bearer'],
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
            setScenario('attack')
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
      intro="Form-POST атака, проверка CSRF-токена / Origin, SameSite на session cookie."
      snippets={[
        {
          id: 'evil',
          label: 'evil.html',
          note: 'Идея CSRF: форма на bank.com без ведома жертвы.',
          executable: false,
          code: `<!DOCTYPE html>
<html>
  <body>
    <h1>Бесплатный приз</h1>
    <!-- ═══════════════════════════════════════════
         CSRF ← браузер приложит Cookie: session к bank.com
         ═══════════════════════════════════════════ -->
    <form
      id="f"
      action="https://bank.example/transfer"
      method="POST"
    >
      <input type="hidden" name="to" value="attacker" />
      <input type="hidden" name="amount" value="1000" />
    </form>
    <script>document.getElementById('f').submit();</script>
  </body>
</html>`,
        },
        {
          id: 'server',
          label: 'server.js',
          note: 'SameSite + synchronizer token + Origin.',
          executable: false,
          code: `import express from 'express';
import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax', // ← режет типичный cross-site POST
    },
  }),
);

app.get('/transfer-form', (req, res) => {
  req.session.csrf = crypto.randomBytes(32).toString('hex'); // ←
  res.send(\`<form method="POST" action="/transfer">
    <input type="hidden" name="_csrf" value="\${req.session.csrf}" />
    <input name="to" /><input name="amount" />
    <button>Send</button>
  </form>\`);
});

app.post('/transfer', (req, res) => {
  const origin = req.get('origin');
  if (origin && origin !== 'https://bank.example') {
    return res.sendStatus(403); // ←
  }
  if (req.body._csrf !== req.session.csrf) {
    return res.sendStatus(403); // ← нет токена у evil.com
  }
  // выполнить перевод…
  res.sendStatus(204);
});

app.listen(3000);`,
        },
        {
          id: 'client',
          label: 'apiClient.ts',
          note: 'Bearer в header браузер сам не приклеит с чужого сайта.',
          executable: false,
          code: `let accessToken: string | null = null; // ← memory, не cookie

export async function transfer(to: string, amount: number) {
  // ═══════════════════════════════════════════
  // Не классический CSRF: header не auto-send
  // (если access не лежит в cookie)
  // ═══════════════════════════════════════════
  return fetch('https://api.bank.example/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${accessToken}\`, // ←
    },
    body: JSON.stringify({ to, amount }),
  });
}

// Cookie-session API → credentials: 'include' + CSRF header/токен`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="CSRF"
      lead="Подделка запроса с cookie-сессией: атака, SameSite, токен и отличие от Bearer."
      problem={problem}
      code={code}
    />
  )
}
