import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { flushSync } from 'react-dom'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactSsrLab.module.css'

const TOPIC_ID = '192-react-ssr'
const STEP = 0.6
const SERVER_TITLE = 'Наушники Pro'
const CLIENT_MISMATCH = 'Наушники Pro · sale'

type CaseId = 'csr' | 'ssr' | 'mismatch'
type Phase = 'idle' | 'wait' | 'html' | 'live' | 'mismatch'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'csr', label: 'CSR' },
  { id: 'ssr', label: 'SSR + hydrate' },
  { id: 'mismatch', label: 'Mismatch' },
]

const CODE_INTRO: Record<CaseId, string> = {
  csr: 'Пустой `#root` и `createRoot` — UI появляется только после JS.',
  ssr: '`renderToString` кладёт HTML в ответ; клиент вызывает `hydrateRoot`.',
  mismatch: 'Сервер и клиент отдают разный текст — гидратация ругается.',
}

const SNIPPET_INDEX: InteractiveSnippet = {
  id: 'index-csr',
  label: 'index.html',
  note: 'CSR: в `#root` нет разметки приложения.',
  executable: false,
  languageLabel: 'html',
  code: `<body>
  <div id="root"></div> <!-- ← пусто до JS -->
  <script type="module" src="/src/entry-client.tsx"></script>
</body>`,
}

const SNIPPET_CLIENT_CSR: InteractiveSnippet = {
  id: 'entry-client-csr',
  label: 'src/entry-client.tsx',
  note: '`createRoot` монтирует дерево с нуля в пустой `#root`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

// ═══════════════════════════════════════════
// CSR ← UI только после бандла
// ═══════════════════════════════════════════
createRoot(root).render(<App />);`,
}

const SNIPPET_SERVER: InteractiveSnippet = {
  id: 'entry-server',
  label: 'src/entry-server.tsx',
  note: 'Сервер рендерит `App` в строку и вставляет в `#root`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { renderToString } from 'react-dom/server';
import { App } from './App';

export const render = () => {
  // ═══════════════════════════════════════════
  // SSR ← HTML для первого ответа
  // ═══════════════════════════════════════════
  const html = renderToString(<App />); // ← разметка в строке
  return \`<!doctype html>
<html>
  <body>
    <div id="root">\${html}</div>
    <script type="module" src="/entry-client.js"></script>
  </body>
</html>\`;
};`,
}

const SNIPPET_CLIENT_SSR: InteractiveSnippet = {
  id: 'entry-client-ssr',
  label: 'src/entry-client.tsx',
  note: '`hydrateRoot` навешивает обработчики на уже нарисованный DOM.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

// ═══════════════════════════════════════════
// HYDRATE ← не createRoot: HTML уже есть
// ═══════════════════════════════════════════
hydrateRoot(root, <App />);`,
}

const SNIPPET_APP_MISMATCH: InteractiveSnippet = {
  id: 'app-mismatch',
  label: 'src/App.tsx',
  note: '`window` на сервере нет — клиент рисует другой текст.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { title?: string };

export const App = ({ title = 'Наушники Pro' }: Props) => {
  const heading =
    typeof window === 'undefined'
      ? title
      : \`\${title} · sale\`; // ← другой HTML на клиенте

  // ═══════════════════════════════════════════
  // MISMATCH ← сервер и клиент разошлись
  // ═══════════════════════════════════════════
  return (
    <article>
      <h1>{heading}</h1>
      <button type="button">В корзину</button>
    </article>
  );
};`,
}

const SNIPPET_APP: InteractiveSnippet = {
  id: 'app-card',
  label: 'src/App.tsx',
  note: 'Одно дерево на сервере и на клиенте — гидратация сходится.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState } from 'react';

export const App = () => {
  const [count, setCount] = useState(0);

  return (
    <article>
      <h1>Наушники Pro</h1>
      <p>4 290 ₽</p>
      <button type="button" onClick={() => setCount((n) => n + 1)}>
        {count === 0 ? 'В корзину' : \`В корзине · \${count}\`}
      </button> {/* ← listeners после hydrate */}
    </article>
  );
};`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  csr: [SNIPPET_INDEX, SNIPPET_CLIENT_CSR],
  ssr: [SNIPPET_SERVER, SNIPPET_CLIENT_SSR, SNIPPET_APP],
  mismatch: [SNIPPET_APP_MISMATCH, SNIPPET_CLIENT_SSR],
}

const PAIN = (
  <>
    CSR отдаёт пустой <code>#root</code> и рисует UI только после JS. SSR кладёт HTML в ответ;{' '}
    <code>hydrateRoot</code> навешивает обработчики на уже существующий DOM.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  csr: (
    <>
      Браузер получает пустой <code>#root</code>; карточка появляется только после{' '}
      <code>createRoot</code>.
    </>
  ),
  ssr: (
    <>
      HTML карточки уже в ответе; после <code>hydrateRoot</code> кнопка начинает считать клики.
    </>
  ),
  mismatch: (
    <>
      Сервер написал «{SERVER_TITLE}», клиент — «{CLIENT_MISMATCH}»; гидратация расходится.
    </>
  ),
}

type CatalogProps = { title: string }

const CatalogCard = ({ title }: CatalogProps) => {
  const [count, setCount] = useState(0)
  return (
    <article data-ssr-card className={styles.product}>
      <p className={styles.productEyebrow}>Каталог</p>
      <h3 className={styles.productTitle}>{title}</h3>
      <p className={styles.productPrice}>4 290 ₽</p>
      <button type="button" className={styles.productBtn} onClick={() => setCount((n) => n + 1)}>
        {count === 0 ? 'В корзину' : `В корзине · ${count}`}
      </button>
    </article>
  )
}

const previewHtml = (html: string) =>
  html.replace(/class="[^"]*"/g, 'class="…"').replace(/></g, '>\n<')

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) => {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  serverHtml: string
  frameRef: MutableRefObject<HTMLDivElement | null>
}

const SsrLiveViz = ({ caseId, phase, serverHtml, frameRef }: VizProps) => {
  const htmlOn = phase === 'html' || phase === 'live' || phase === 'mismatch'
  const jsOn = phase === 'wait' || phase === 'live' || phase === 'mismatch'
  const liveOn = phase === 'live' || phase === 'mismatch'

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'wait'
        ? '#root пуст'
        : phase === 'html'
          ? 'HTML · без listeners'
          : phase === 'mismatch'
            ? 'mismatch'
            : 'hydrate · клики живые'

  const empty =
    phase === 'idle' || phase === 'wait'
      ? phase === 'wait'
        ? '#root пуст · ждём JS'
        : '#root пуст'
      : null

  const foot =
    phase === 'html'
      ? 'кнопка в DOM, обработчиков нет'
      : phase === 'live'
        ? 'hydrateRoot · клик меняет счётчик'
        : phase === 'mismatch'
          ? 'клиент перерисовал заголовок'
          : phase === 'wait'
            ? 'createRoot ещё не вызван'
            : caseId === 'csr'
              ? 'ответ без разметки App'
              : 'сервер ещё не отдал HTML'

  return (
    <LabVizPanel title="Запрос страницы" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.serverCol}>
          <p className={styles.colLabel}>ответ сервера</p>
          <pre
            className={[
              styles.serverPanel,
              htmlOn && caseId !== 'csr' ? styles.serverLive : '',
              phase === 'mismatch' ? styles.serverWarn : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {serverHtml || (caseId === 'csr' ? '<div id="root"></div>' : '—')}
          </pre>
        </div>

        <div className={styles.browserCol}>
          <p className={styles.colLabel}>браузер</p>
          <div
            className={[
              styles.browser,
              phase === 'live' ? styles.browserOk : '',
              phase === 'mismatch' ? styles.browserWarn : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.chrome}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.url}>shop.app/item</span>
            </div>
            <div className={styles.pipeline}>
              <span className={[styles.chip, htmlOn ? styles.chipOn : ''].filter(Boolean).join(' ')}>
                HTML
              </span>
              <span className={[styles.chip, jsOn ? styles.chipOn : ''].filter(Boolean).join(' ')}>
                JS
              </span>
              <span
                className={[
                  styles.chip,
                  liveOn && phase === 'mismatch' ? styles.chipWarn : liveOn ? styles.chipOk : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {phase === 'mismatch' ? 'mismatch' : 'клики'}
              </span>
            </div>
            <div className={styles.viewport}>
              <div ref={frameRef} className={styles.mount} />
              {empty ? <p className={styles.placeholder}>{empty}</p> : null}
            </div>
            <p className={styles.foot}>{foot}</p>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export const ReactSsrLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('csr')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [serverHtml, setServerHtml] = useState('')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<Root | null>(null)

  const teardown = () => {
    rootRef.current?.unmount()
    rootRef.current = null
    if (mountRef.current) mountRef.current.innerHTML = ''
  }

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const mount = document.createElement('div')
    mount.setAttribute('id', 'ssr-lab-root')
    mount.className = styles.mountInner
    frame.appendChild(mount)
    mountRef.current = mount
    return () => {
      rootRef.current?.unmount()
      rootRef.current = null
      mount.remove()
      mountRef.current = null
    }
  }, [])

  const pulseCard = () => {
    const el = mountRef.current?.querySelector('[data-ssr-card]')
    if (!el || reducedMotion()) return
    gsap.fromTo(el, { opacity: 0.55, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' })
  }

  const paintCsr = () => {
    const mount = mountRef.current
    if (!mount) return
    teardown()
    const root = createRoot(mount)
    rootRef.current = root
    flushSync(() => {
      root.render(<CatalogCard title={SERVER_TITLE} />)
    })
  }

  const injectHtml = (title: string) => {
    const mount = mountRef.current
    if (!mount) return ''
    teardown()
    const html = renderToString(<CatalogCard title={title} />)
    mount.innerHTML = html
    return html
  }

  const hydrate = (title: string) => {
    const mount = mountRef.current
    if (!mount) return
    flushSync(() => {
      rootRef.current = hydrateRoot(mount, <CatalogCard title={title} />)
    })
  }

  const resetViz = () => {
    teardown()
    setPhase('idle')
    setHint(null)
    setServerHtml('')
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    if (caseId === 'csr') {
      setServerHtml('<div id="root"></div>')
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('wait')
            log('info', 'HTML: пустой #root')
          },
          () => {
            paintCsr()
            setPhase('live')
            log('ok', 'createRoot().render → карточка')
            setHint('UI появился вместе с JS')
          },
        ],
        (tl) => {
          tl.call(() => pulseCard(), undefined, STEP + 0.08)
        },
        () => setBusy(false),
      )
      return
    }

    if (caseId === 'ssr') {
      playTimeline(
        tlRef,
        [
          () => {
            const html = injectHtml(SERVER_TITLE)
            setServerHtml(previewHtml(html))
            setPhase('html')
            log('ok', 'renderToString → HTML в #root')
          },
          () => {
            hydrate(SERVER_TITLE)
            setPhase('live')
            log('ok', 'hydrateRoot · кнопка живая')
            setHint('HTML был раньше listeners')
          },
        ],
        (tl) => {
          tl.call(() => pulseCard(), undefined, 0.08)
        },
        () => setBusy(false),
      )
      return
    }

    playTimeline(
      tlRef,
      [
        () => {
          const html = injectHtml(SERVER_TITLE)
          setServerHtml(previewHtml(html))
          setPhase('html')
          log('ok', 'сервер: «Наушники Pro»')
        },
        () => {
          hydrate(CLIENT_MISMATCH)
          setPhase('mismatch')
          log('warn', 'клиент: «Наушники Pro · sale»')
          setHint('разная разметка → mismatch')
        },
      ],
      (tl) => {
        tl.call(() => pulseCard(), undefined, 0.08)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('csr')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <SsrLiveViz caseId={caseId} phase={phase} serverHtml={serverHtml} frameRef={frameRef} />

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
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="SSR"
      lead="Живой стенд: пустой `#root` vs HTML с `renderToString` и `hydrateRoot`; клики оживают только после гидратации."
      problem={problem}
      code={code}
    />
  )
}
