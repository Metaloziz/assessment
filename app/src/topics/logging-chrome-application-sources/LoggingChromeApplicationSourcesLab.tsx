import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '145-logging-chrome-application-sources'

type Mode = 'sources' | 'storage' | 'sw'

export function LoggingChromeApplicationSourcesLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('sources')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()
    if (mode === 'sources') {
      log('info', 'Sources → Ctrl+P → checkout.js')
      log('ok', 'line breakpoint / debugger → Scope + Call Stack')
      log('ok', 'source maps: webpack:// или исходники Vite')
      setHint('Sources = пауза в JS — см. «Код» → checkout.js')
      return
    }
    if (mode === 'storage') {
      log('info', 'Application → Local Storage → https://app.example')
      log('ok', 'ключ token=eyJ… · Session Storage: draft')
      log('warn', 'Clear site data снимет и cookies, и cache')
      setHint('Application/Storage — см. auth.js')
      return
    }
    log('err', 'после деплоя UI старый')
    log('info', 'Application → Service Workers → unregister')
    log('ok', 'Cache Storage → удалить shell-cache')
    setHint('SW + Cache — частая причина «залипшей» версии')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        <code>Sources</code> — остановка в JS; <code>Application</code> — что лежит в storage / SW.
        Здесь сценарии вкладок; код записи и паузы — во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>Выберите Sources, Storage или Service Worker.</li>
        <li>
          Откройте «Код»: <code>checkout.js</code>, <code>auth.js</code>, регистрация SW.
        </li>
        <li>Сверьте лог с тем, куда смотреть в DevTools.</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'sources'}
          onClick={() => setMode('sources')}
        >
          Sources
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'storage'}
          onClick={() => setMode('storage')}
        >
          Storage
        </LabButton>
        <LabButton variant="ghost" size="sm" active={mode === 'sw'} onClick={() => setMode('sw')}>
          Service Worker
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
        <p className={shell.hint}>Выберите вкладку-сценарий.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Sources — `debugger` и maps; Application — storage и Service Worker."
      snippets={[
        {
          id: 'checkout',
          label: 'checkout.js',
          note: 'Sources: breakpoint / debugger; нужен source map в dev.',
          executable: false,
          code: `// ═══════════════════════════════════════════
// SOURCES ← отладка JS в DevTools
// F12 → Sources → Ctrl+P → этот файл
// ═══════════════════════════════════════════

export function applyDiscount(cart, percent) {
  // ← line breakpoint здесь или:
  debugger; // ← пауза, если DevTools открыты

  const total = cart.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const next = {
    ...cart,
    total: Math.round(total * (1 - percent / 100)),
  };

  // На паузе смотрите Scope: cart, percent, total
  // Call Stack — кто вызвал applyDiscount
  return next;
}

// vite.config.js / webpack: devtool / build.sourcemap
// ← без maps в Sources будет минифицированный бандл`,
        },
        {
          id: 'auth',
          label: 'auth.js',
          note: 'Application → Local/Session Storage и Cookies для этого origin.',
          executable: false,
          code: `// ═══════════════════════════════════════════
// APPLICATION → Storage
// F12 → Application → Local Storage → origin
// ═══════════════════════════════════════════

const TOKEN_KEY = 'token';
const DRAFT_KEY = 'checkout_draft';

export function persistSession(token) {
  // ← видно в Application → Local Storage
  localStorage.setItem(TOKEN_KEY, token);

  // Session Storage — до закрытия вкладки
  // ← Application → Session Storage
  sessionStorage.removeItem(DRAFT_KEY);
}

export function saveDraft(draft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.clear();
  // Cookies / SW / Cache — отдельно:
  // Application → Clear site data
}`,
        },
        {
          id: 'sw-register',
          label: 'sw-register.js',
          note: 'Application → Service Workers / Cache Storage при «старом» UI после деплоя.',
          executable: false,
          code: `// ═══════════════════════════════════════════
// APPLICATION → Service Workers + Cache Storage
// «После деплоя вижу старый UI» → сюда
// ═══════════════════════════════════════════

export async function registerShellWorker() {
  if (!('serviceWorker' in navigator)) return;

  // ← Application покажет registered worker + status
  const reg = await navigator.serviceWorker.register('/sw.js');
  console.log('SW scope', reg.scope);
}

// sw.js (фрагмент):
// self.addEventListener('install', (e) => {
//   e.waitUntil(caches.open('shell-v1').then((c) => c.addAll(['/', '/app.js'])));
// });
// ← Cache Storage: shell-v1 в Application

// Отладка залипшей версии:
// 1. Application → Service Workers → Unregister
// 2. Cache Storage → Delete shell-v1
// 3. или Clear site data для origin`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Application · Sources"
      lead="Сценарии вкладок DevTools; точки в коде — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}
