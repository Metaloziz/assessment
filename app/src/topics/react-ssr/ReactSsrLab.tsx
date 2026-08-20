import { useRef, useState, type ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import { apiJson } from '../../lib/apiBase'
import styles from './ReactSsrLab.module.css'

const TOPIC_ID = '192-react-ssr'

type Phase = 'idle' | 'html' | 'hydrated'
type SsrHelloResponse = { ok: true; html: string; ts: string }

/** Initial DOM must match server `renderToString` (`/api/ssr/hello`). */
const HelloApp = ({ onClick }: { onClick?: () => void }) => {
  const [n, setN] = useState(0)
  return (
    <div data-ssr-hello="">
      <p>Hello World</p>
      <button
        type="button"
        onClick={() => {
          setN((c) => c + 1)
          onClick?.()
        }}
      >
        {n === 0 ? 'Нажми' : `Кликов: ${n}`}
      </button>
    </div>
  )
}

const SNIPPET_SERVER: InteractiveSnippet = {
  id: 'ssr-route',
  label: 'server/src/routes/ssrLab.ts',
  note: '`renderToString` на assessment-api отдаёт HTML фрагмент в JSON.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

const HelloApp = () =>
  h('div', { 'data-ssr-hello': '' },
    h('p', null, 'Hello World'),
    h('button', { type: 'button' }, 'Нажми'),
  );

app.get('/api/ssr/hello', async () => {
  // ═══════════════════════════════════════════
  // SSR ← HTML в ответе API
  // ═══════════════════════════════════════════
  const html = renderToString(h(HelloApp));
  return { ok: true, html };
});`,
}

const SNIPPET_APP: InteractiveSnippet = {
  id: 'hello-app',
  label: 'src/HelloApp.tsx',
  note: 'Первый рендер совпадает с сервером (`Нажми`); дальше счётчик только на клиенте.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState } from 'react';

export const HelloApp = () => {
  const [n, setN] = useState(0);

  // ═══════════════════════════════════════════
  // APP ← тот же initial DOM, что renderToString
  // ═══════════════════════════════════════════
  return (
    <div data-ssr-hello="">
      <p>Hello World</p>
      <button type="button" onClick={() => setN((c) => c + 1)}>
        {n === 0 ? 'Нажми' : \`Кликов: \${n}\`}
      </button>
    </div>
  );
};`,
}

const SNIPPET_HYDRATE: InteractiveSnippet = {
  id: 'hydrate',
  label: 'src/hydrate.ts',
  note: 'Сначала вставляем HTML с API, потом `hydrateRoot` — не `createRoot`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { hydrateRoot } from 'react-dom/client';
import { HelloApp } from './HelloApp';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

const { html } = await fetch('/api/ssr/hello').then((r) => r.json());
root.innerHTML = html; // ← разметка уже есть

// ═══════════════════════════════════════════
// HYDRATE ← listeners на существующий DOM
// ═══════════════════════════════════════════
hydrateRoot(root, <HelloApp />);`,
}

const PAIN = (
  <>
    API вызывает <code>renderToString</code> и отдаёт HTML. Клиент вставляет разметку и вызывает{' '}
    <code>hydrateRoot</code> — кнопка оживает без повторной сборки DOM с нуля.
  </>
)

const BRIEF: ReactNode = (
  <>
    <strong>Запустить</strong> — живой <code>GET /api/ssr/hello</code>, затем гидратация. После этого нажми
    кнопку в сцене.
  </>
)

export const ReactSsrLab = () => {
  const { lines, log, clear } = useLabLog()
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const mountRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<Root | null>(null)

  const teardown = () => {
    rootRef.current?.unmount()
    rootRef.current = null
    if (mountRef.current) mountRef.current.innerHTML = ''
    setHtmlPreview(null)
    setPhase('idle')
    setHint(null)
  }

  const run = async () => {
    clear()
    teardown()
    setBusy(true)

    try {
      log('info', 'GET /api/ssr/hello')
      const data = await apiJson<SsrHelloResponse>('/api/ssr/hello')
      if (!data.ok || typeof data.html !== 'string') {
        throw new Error('unexpected response')
      }

      setHtmlPreview(data.html)
      setPhase('html')
      log('ok', 'renderToString → HTML в ответе')

      const mount = mountRef.current
      if (!mount) throw new Error('mount missing')

      mount.innerHTML = data.html
      rootRef.current = hydrateRoot(
        mount,
        <HelloApp
          onClick={() => {
            log('ok', 'клик · listeners после hydrate')
            setHint('кнопка живая — HTML был раньше JS')
          }}
        />,
      )
      setPhase('hydrated')
      log('ok', 'hydrateRoot · listeners на существующем DOM')
      setHint('нажми кнопку в сцене')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log('warn', `ошибка: ${message}`)
      setHint('API недоступен или роут ещё не задеплоен')
      teardown()
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    clear()
    teardown()
  }

  const meta =
    phase === 'idle' ? 'ожидание' : phase === 'html' ? 'HTML с API' : 'hydrate · клики живые'

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={() => void run()}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{BRIEF}</p>

      <LabVizPanel title="#root" meta={meta}>
        <div className={styles.stage}>
          {htmlPreview ? (
            <pre className={styles.htmlPreview} tabIndex={0}>
              {htmlPreview}
            </pre>
          ) : (
            <p className={styles.placeholder}>HTML с API появится здесь</p>
          )}
          <div
            ref={mountRef}
            className={[styles.mount, phase === 'hydrated' ? styles.mountLive : '']
              .filter(Boolean)
              .join(' ')}
            data-empty={phase === 'idle' ? 'true' : undefined}
          />
          {phase === 'idle' ? <p className={styles.mountHint}>сцена пуста до запуска</p> : null}
        </div>
      </LabVizPanel>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <InteractiveCodePanel
        topicId={TOPIC_ID}
        intro="`renderToString` на API → HTML в `#root` → `hydrateRoot` оживляет кнопку."
        snippets={[SNIPPET_SERVER, SNIPPET_APP, SNIPPET_HYDRATE]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="SSR"
      lead="Живой `renderToString` на assessment-api; `hydrateRoot` навешивает обработчики на уже пришедший HTML."
      problem={problem}
      code={code}
    />
  )
}
