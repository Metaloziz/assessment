import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '11-xss'

type Scenario = 'reflected' | 'stored' | 'dom' | 'defend'

export function XssLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('reflected')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()

    if (scenario === 'reflected') {
      log('info', 'GET /search?q=<script>…</script>')
      log('err', 'сервер вставил q в HTML без экранирования')
      log('err', 'браузер жертвы выполнил скрипт в origin приложения')
      log('warn', 'payload не в БД — срабатывает на «отравленной» ссылке')
      setHint('Reflected: запрос → ответ без escape')
      return
    }

    if (scenario === 'stored') {
      log('info', 'POST /comments { body: "<img src=x onerror=…>" }')
      log('err', 'сохранено в БД как есть')
      log('err', 'каждый GET /post/:id отдаёт payload всем читателям')
      log('warn', 'ущерб масштабируется: один инжект → много жертв')
      setHint('Stored: payload живёт в хранилище')
      return
    }

    if (scenario === 'dom') {
      log('info', 'сервер отдал чистый shell; клиент читает location.hash')
      log('err', "out.innerHTML = location.hash.slice(1)")
      log('err', 'DOM-based XSS: исполнение без «грязного» HTML с сервера')
      log('ok', 'textContent / encodeURIComponent + whitelist — безопаснее')
      setHint('DOM-based: дыра в клиентском JS')
      return
    }

    log('info', 'защита слоями')
    log('ok', 'текст → textContent / JSX {value} (escape)')
    log('ok', 'HTML → DOMPurify.sanitize, затем вставка')
    log('ok', 'CSP без unsafe-inline; cookie сессии — HttpOnly')
    log('warn', 'dangerouslySetInnerHTML / eval без sanitize снова открывают XSS')
    setHint('escape + sanitize + CSP + HttpOnly')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Недоверенные данные попадают в страницу как код: кража сессии, действия от имени
        пользователя. Важно различать reflected / stored / DOM-based и закрывать вывод, а не
        только «фильтр на входе».
      </p>
      <ol className={shell.steps}>
        <li>Выберите тип XSS или сценарий защиты.</li>
        <li>Прогоните и разберите путь payload в логе.</li>
        <li>
          В «Код»: <code>search.js</code>, <code>comments.tsx</code>, <code>widget.ts</code>.
        </li>
      </ol>

      <div className={shell.row}>
        {(
          [
            ['reflected', 'Reflected'],
            ['stored', 'Stored'],
            ['dom', 'DOM-based'],
            ['defend', 'Защита'],
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
            setScenario('reflected')
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
      intro="Reflected / stored / DOM XSS и безопасный вывод текста и HTML."
      snippets={[
        {
          id: 'search',
          label: 'search.js',
          note: 'Reflected: query в HTML только через escape.',
          executable: false,
          code: `import express from 'express';

const app = express();

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

app.get('/search', (req, res) => {
  const q = req.query.q ?? '';

  // ═══════════════════════════════════════════
  // ПЛОХО ← reflected XSS
  // ═══════════════════════════════════════════
  // res.send(\`<h1>Результаты: \${q}</h1>\`);

  // ═══════════════════════════════════════════
  // ХОРОШО ← escape под HTML-текст
  // ═══════════════════════════════════════════
  res.type('html').send(\`<h1>Результаты: \${escapeHtml(q)}</h1>\`); // ←
});

app.listen(3000);`,
        },
        {
          id: 'comments',
          label: 'comments.tsx',
          note: 'Stored: JSX экранирует текст; сырой HTML — только после DOMPurify.',
          executable: false,
          code: `import DOMPurify from 'dompurify';

type Comment = { id: string; author: string; body: string };

// ═══════════════════════════════════════════
// ТЕКСТ ← React экранирует {author} / {body}
// ═══════════════════════════════════════════
export function CommentText({ c }: { c: Comment }) {
  return (
    <article>
      <strong>{c.author}</strong>
      <p>{c.body}</p> {/* ← безопасно для текста */}
    </article>
  );
}

// ═══════════════════════════════════════════
// HTML из CMS ← sanitize, не сырой dangerously…
// ═══════════════════════════════════════════
export function CommentHtml({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html); // ←
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// ПЛОХО: dangerouslySetInnerHTML={{ __html: c.body }} без sanitize`,
        },
        {
          id: 'widget',
          label: 'widget.ts',
          note: 'DOM-based: не писать location / ввод в innerHTML.',
          executable: false,
          code: `const out = document.querySelector('#out')!;

// ═══════════════════════════════════════════
// ПЛОХО ← DOM XSS
// ═══════════════════════════════════════════
// out.innerHTML = location.hash.slice(1);

// ═══════════════════════════════════════════
// ХОРОШО ← текст без интерпретации HTML
// ═══════════════════════════════════════════
out.textContent = decodeURIComponent(location.hash.slice(1) || ''); // ←

function setGreeting(name: string) {
  // ещё хуже: 'javascript:' в href из user input
  const a = document.createElement('a');
  a.textContent = 'Профиль';
  a.href = name.startsWith('https://') ? name : '/'; // ← whitelist
  out.append(a);
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="XSS"
      lead="Reflected, stored, DOM-based и слои защиты: escape, sanitize, CSP."
      problem={problem}
      code={code}
    />
  )
}
