import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, LabNode, type LabNodeState } from '../../components/lab/LabViz'
import styles from './ReactSsrLab.module.css'

const TOPIC_ID = '192-react-ssr'
const STEP = 0.6

type CaseId = 'csr' | 'ssr' | 'mismatch'
type Phase = 'idle' | 'html' | 'js' | 'done'

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
      HTML карточки уже в ответе; после <code>hydrateRoot</code> кнопка получает listeners.
    </>
  ),
  mismatch: (
    <>
      Сервер написал «Наушники Pro», клиент — «Наушники Pro · sale»; гидратация расходится.
    </>
  ),
}

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

const nodeState = (active: boolean, done: boolean, err = false): LabNodeState => {
  if (err && done) return 'err'
  if (active) return 'active'
  if (done) return 'ok'
  return 'idle'
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  focusRef: MutableRefObject<HTMLDivElement | null>
}

const SsrViz = ({ caseId, phase, focusRef }: VizProps) => {
  const htmlOn = phase === 'html' || phase === 'js' || phase === 'done'
  const jsOn = phase === 'js' || phase === 'done'
  const done = phase === 'done'
  const isCsr = caseId === 'csr'
  const isMismatch = caseId === 'mismatch'

  const serverSub = isCsr ? 'оболочка' : 'renderToString'
  const htmlSub = !htmlOn || isCsr ? '#root пуст' : '<article>…'
  const jsSub = isCsr ? 'createRoot' : 'hydrateRoot'
  const rootSub = !jsOn
    ? isCsr || !htmlOn
      ? 'пусто'
      : 'HTML · без listeners'
    : isMismatch && done
      ? 'sale · mismatch'
      : isCsr
        ? 'карточка + клики'
        : 'HTML + listeners'

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'html'
        ? isCsr
          ? '#root пуст'
          : 'HTML в ответе'
        : phase === 'js'
          ? isCsr
            ? 'createRoot'
            : 'hydrateRoot'
          : isMismatch
            ? 'mismatch'
            : isCsr
              ? 'UI после JS'
              : 'клики живые'

  return (
    <LabVizPanel title="Запрос страницы" meta={meta}>
      <div className={styles.stack}>
        <LabNode
          className={styles.node}
          label="сервер"
          sub={serverSub}
          state={nodeState(false, htmlOn)}
        />
        <span className={styles.arrow} aria-hidden>
          ↓
        </span>
        <LabNode
          className={styles.node}
          label="HTML"
          sub={htmlSub}
          state={nodeState(phase === 'html', htmlOn && !isCsr && phase !== 'html')}
        />
        <span className={styles.arrow} aria-hidden>
          ↓
        </span>
        <LabNode
          className={styles.node}
          label="JS"
          sub={jsSub}
          state={nodeState(phase === 'js', done)}
        />
        <span className={styles.arrow} aria-hidden>
          ↓
        </span>
        <LabNode
          ref={focusRef}
          className={styles.node}
          label="#root"
          sub={rootSub}
          state={nodeState(false, done && !isMismatch, isMismatch && done)}
        />
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

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (focusRef.current) gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
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

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('html')
          if (caseId === 'csr') log('info', 'HTML: пустой #root')
          else log('ok', 'renderToString → HTML в #root')
        },
        () => {
          setPhase('js')
          if (caseId === 'csr') log('info', 'бандл → createRoot')
          else log('info', 'бандл → hydrateRoot')
        },
        () => {
          setPhase('done')
          if (caseId === 'csr') {
            log('ok', 'createRoot().render → карточка')
            setHint('UI появился вместе с JS')
          } else if (caseId === 'ssr') {
            log('ok', 'hydrateRoot · listeners на существующем DOM')
            setHint('HTML был раньше listeners')
          } else {
            log('warn', 'клиент: «Наушники Pro · sale»')
            setHint('разная разметка → mismatch')
          }
        },
      ],
      (tl) => {
        tl.call(
          () => {
            const el = focusRef.current
            if (!el) return
            gsap.fromTo(
              el,
              { opacity: 0.55, y: 6 },
              { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
            )
          },
          undefined,
          STEP * 2 + 0.08,
        )
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

      <SsrViz caseId={caseId} phase={phase} focusRef={focusRef} />

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
      lead="`renderToString` отдаёт HTML; `hydrateRoot` навешивает обработчики; расхождение сервер/клиент — mismatch."
      problem={problem}
      code={code}
    />
  )
}
