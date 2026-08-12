import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '151-x-frame-options'

type Policy = 'none' | 'deny' | 'sameorigin' | 'csp-none' | 'csp-self'

const POLICY_LABEL: Record<Policy, string> = {
  none: 'без заголовка',
  deny: "X-Frame-Options: DENY",
  sameorigin: 'X-Frame-Options: SAMEORIGIN',
  'csp-none': "CSP frame-ancestors 'none'",
  'csp-self': "CSP frame-ancestors 'self'",
}

export function XFrameOptionsLab() {
  const { lines, log, clear } = useLabLog()
  const [policy, setPolicy] = useState<Policy>('none')
  const [parent, setParent] = useState<'evil' | 'same'>('evil')
  const [hint, setHint] = useState<string | null>(null)

  const simulate = () => {
    clear()
    const parentOrigin = parent === 'evil' ? 'https://evil.com' : 'https://bank.com'
    const target = 'https://bank.com/settings'
    log('info', `${parentOrigin} → <iframe src="${target}">`)
    log('info', `ответ ${target}: ${POLICY_LABEL[policy]}`)

    if (policy === 'none') {
      log('err', 'фрейм загружен — возможен clickjacking')
      setHint('нет защиты: UI банка внутри evil.com')
      return
    }
    if (policy === 'deny' || policy === 'csp-none') {
      log('ok', 'браузер блокирует встраивание')
      setHint('DENY / frame-ancestors \'none\' — фрейм пустой')
      return
    }
    if (parent === 'same') {
      log('ok', 'родитель same-origin — SAMEORIGIN / \'self\' пропускают')
      setHint('свой виджет/админка на том же origin ок')
      return
    }
    log('ok', 'чужой origin — встраивание отклонено')
    setHint('SAMEORIGIN / \'self\' не пускают evil.com')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Чужой сайт кладёт ваш UI в <code>iframe</code> и ловит клики (clickjacking). Защита —{' '}
        <code>X-Frame-Options</code> или CSP <code>frame-ancestors</code> на ответе страницы.
      </p>
      <ol className={shell.steps}>
        <li>Выберите родителя: <code>evil.com</code> или свой origin.</li>
        <li>Выберите политику заголовка.</li>
        <li>
          Нажмите «Проверить» и сверьте с «Код»: <code>server.js</code>, <code>nginx.conf</code>.
        </li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={parent === 'evil'}
          onClick={() => setParent('evil')}
        >
          evil.com
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={parent === 'same'}
          onClick={() => setParent('same')}
        >
          same origin
        </LabButton>
      </div>

      <div className={shell.row}>
        {(Object.keys(POLICY_LABEL) as Policy[]).map((p) => (
          <LabButton
            key={p}
            variant="ghost"
            size="sm"
            active={policy === p}
            onClick={() => setPolicy(p)}
          >
            {p === 'none'
              ? 'нет'
              : p === 'deny'
                ? 'DENY'
                : p === 'sameorigin'
                  ? 'SAMEORIGIN'
                  : p === 'csp-none'
                    ? "ancestors 'none'"
                    : "ancestors 'self'"}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={simulate}>
          Проверить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setPolicy('none')
            setParent('evil')
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
        <p className={shell.hint}>Выберите родителя и политику.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Заголовки на edge/сервере: `X-Frame-Options` и CSP `frame-ancestors`."
      snippets={[
        {
          id: 'server',
          label: 'server.js',
          note: 'Express: DENY + frame-ancestors. Meta http-equiv для XFO не использовать.',
          executable: false,
          code: `import express from 'express';

const app = express();

app.use((req, res, next) => {
  // ═══════════════════════════════════════════
  // X-Frame-Options ← clickjacking (legacy + широко)
  // DENY | SAMEORIGIN  (ALLOW-FROM устарел)
  // ═══════════════════════════════════════════
  res.setHeader('X-Frame-Options', 'DENY'); // ← запрет iframe везде

  // ═══════════════════════════════════════════
  // CSP frame-ancestors ← современный whitelist родителей
  // Приоритетнее XFO, если задан
  // ═══════════════════════════════════════════
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'none'", // ← или 'self' / https://partner.example
  );

  next();
});

app.get('/settings', (req, res) => {
  res.send('<button>Удалить аккаунт</button>');
});

app.listen(3000);`,
        },
        {
          id: 'nginx',
          label: 'nginx.conf',
          note: '`always` — заголовок и на error-ответах.',
          executable: false,
          code: `server {
  listen 443 ssl;
  server_name bank.example;

  # ═══════════════════════════════════════════
  # X-Frame-Options ← SAMEORIGIN: только свой сайт во фрейме
  # ═══════════════════════════════════════════
  add_header X-Frame-Options "SAMEORIGIN" always; # ←

  # ═══════════════════════════════════════════
  # frame-ancestors ← гибкий список (CSP)
  # ═══════════════════════════════════════════
  add_header Content-Security-Policy
    "frame-ancestors 'self'" always; # ←

  location / {
    proxy_pass http://app:3000;
  }
}`,
        },
        {
          id: 'attack',
          label: 'evil.html',
          note: 'Идея clickjacking: прозрачный iframe поверх «выигрыша».',
          executable: false,
          code: `<!DOCTYPE html>
<html>
  <body>
    <h1>Вы выиграли приз — нажмите!</h1>
    <!-- ═══════════════════════════════════════════
         CLICKJACKING ← ваш UI под/над приманкой
         Браузер режет, если bank шлёт DENY / frame-ancestors
         ═══════════════════════════════════════════ -->
    <iframe
      src="https://bank.example/settings"
      style="
        position: absolute;
        opacity: 0.01; /* ← почти невидим */
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
      "
    ></iframe>
  </body>
</html>`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="X-Frame-Options"
      lead="Симуляция встраивания в iframe и заголовки DENY / SAMEORIGIN / frame-ancestors."
      problem={problem}
      code={code}
    />
  )
}
