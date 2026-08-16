import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './NodejsRoutingStaticLab.module.css'

const TOPIC_ID = '243-nodejs-routing-static'
const STEP = 0.6

type CaseId = 'api' | 'static' | 'escape'
type Phase = 'idle' | 'a' | 'b' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'api', label: 'маршрут API' },
  { id: 'static', label: 'файл static' },
  { id: 'escape', label: 'path ..' },
]

const PAIN = (
  <>
    Запрос сначала ищут в таблице маршрутов, иначе — в корне <code>public/</code>;
    путь с <code>..</code> за пределы корня режут.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  api: (
    <>
      <code>GET /api/health</code> совпадает с ключом таблицы — handler отдаёт JSON.
    </>
  ),
  static: (
    <>
      Маршрута нет; файл <code>public/style.css</code> есть — ответ со{' '}
      <code>Content-Type: text/css</code>.
    </>
  ),
  escape: (
    <>
      <code>/../secret.txt</code> после normalize выходит из <code>public</code> —{' '}
      <code>403</code>, файл не читают.
    </>
  ),
}

const CODE_INTRO =
  'Таблица method+path, раздача из public/ и проверка корня против `..`.'

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  api: [
    {
      id: 'routes-js',
      label: 'routes.js',
      note: 'Ключ маршрута — метод и pathname.',
      executable: false,
      languageLabel: 'js',
      code: `import http from 'node:http';
import { URL } from 'node:url';

// ═══════════════════════════════════════════
// ROUTES ← method + path → handler
// ═══════════════════════════════════════════
const routes = {
  'GET /api/health': (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true })); // ← API
  },
};

http.createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const key = \`\${req.method} \${pathname}\`; // ← ключ таблицы
  const handler = routes[key];
  if (handler) return handler(req, res);
  res.writeHead(404);
  res.end('not found');
}).listen(3000);
`,
    },
    {
      id: 'express-routes',
      label: 'app.js',
      note: 'Тот же смысл через Express Router.',
      executable: false,
      languageLabel: 'js',
      code: `import express from 'express';

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true }); // ← маршрут API
});

app.listen(3000);
`,
    },
  ],
  static: [
    {
      id: 'static-js',
      label: 'static.js',
      note: 'Файл относительно корня public + MIME.',
      executable: false,
      languageLabel: 'js',
      code: `import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public');

export async function sendCss(res) {
  const file = path.join(root, 'style.css'); // ← внутри public
  const body = await fs.readFile(file);
  res.writeHead(200, { 'Content-Type': 'text/css' }); // ← MIME
  res.end(body);
}
`,
    },
    {
      id: 'express-static',
      label: 'app.js',
      note: 'Middleware static после API-роутов.',
      executable: false,
      languageLabel: 'js',
      code: `import express from 'express';
import path from 'node:path';

const app = express();

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// STATIC ← после API
app.use(express.static(path.join(process.cwd(), 'public')));

app.listen(3000);
`,
    },
  ],
  escape: [
    {
      id: 'safe-path',
      label: 'safe-path.js',
      note: 'Итог path.resolve должен остаться под root.',
      executable: false,
      languageLabel: 'js',
      code: `import path from 'node:path';

const root = path.resolve('public');

export function resolveSafe(urlPath) {
  const safe = path.normalize(urlPath).replace(/^(\\.\\.(\\/|\\\\|$))+/, '');
  const file = path.resolve(root, '.' + safe);
  // TRAVERSAL ← ../secret не должен пройти
  if (!file.startsWith(root + path.sep) && file !== root) {
    return null; // ← 403
  }
  return file;
}

resolveSafe('/../secret.txt'); // → null
`,
    },
    {
      id: 'bad-join',
      label: 'bad-join.js',
      note: 'Слепая склейка пути клиента с диском.',
      executable: false,
      languageLabel: 'js',
      code: `import path from 'node:path';

// плохо: клиент диктует путь без проверки корня
const file = path.join('public', reqUrl); // ← /../secret.txt утечёт
// fs.readFile(file) — риск path traversal
`,
    },
  ],
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | undefined,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    steps.forEach((s) => s())
    onDone()
    return
  }
  const tl = gsap.timeline({ onComplete: onDone })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

function nodeCls(...parts: Array<string | false | undefined>) {
  return [labVizStyles.node, ...parts.filter(Boolean)].join(' ')
}

function CaseSwitch({
  value,
  disabled,
  onChange,
}: {
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          disabled={disabled}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function requestLine(caseId: CaseId) {
  if (caseId === 'api') return 'GET /api/health'
  if (caseId === 'static') return 'GET /style.css'
  return 'GET /../secret.txt'
}

function RoutingViz({ caseId, phase, focusRef }: VizProps) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const bad = caseId === 'escape'

  const title =
    caseId === 'api'
      ? 'router · API'
      : caseId === 'static'
        ? 'static · public'
        : 'path · traversal'

  const meta = !doneOn
    ? phase === 'idle'
      ? 'ожидание'
      : phase === 'a'
        ? 'запрос принят'
        : caseId === 'api'
          ? 'ищем в таблице…'
          : caseId === 'static'
            ? 'ищем файл…'
            : 'проверяем корень…'
    : caseId === 'api'
      ? '200 · application/json'
      : caseId === 'static'
        ? '200 · text/css'
        : '403 · вне public'

  const midLabel =
    caseId === 'api' ? 'таблица routes' : caseId === 'static' ? 'public/' : 'resolveSafe'
  const midSub = !bOn
    ? 'ещё нет'
    : doneOn
      ? caseId === 'api'
        ? 'GET /api/health'
        : caseId === 'static'
          ? 'style.css'
          : 'вне root'
      : caseId === 'api'
        ? 'method + path'
        : caseId === 'static'
          ? 'path.join(root, …)'
          : 'startsWith(root)?'

  const outSub = !doneOn
    ? 'ещё нет'
    : caseId === 'api'
      ? '{ ok: true }'
      : caseId === 'static'
        ? 'body css'
        : 'forbidden'

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.stage}>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>клиент</span>
          <span className={labVizStyles.nodeSub}>{requestLine(caseId)}</span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && (bad ? labVizStyles.nodeErr : labVizStyles.nodeOk),
          )}
        >
          <span className={labVizStyles.nodeLabel}>{midLabel}</span>
          <span className={labVizStyles.nodeSub}>{midSub}</span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          ref={focusRef}
          className={nodeCls(
            doneOn && !bad && labVizStyles.nodeOk,
            doneOn && !bad && labVizStyles.nodeActive,
            doneOn && bad && labVizStyles.nodeErr,
            !doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>ответ</span>
          <span className={labVizStyles.nodeSub}>{outSub}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function NodejsRoutingStaticLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('api')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (focusRef.current)
      gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
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
        () => setPhase('a'),
        () => setPhase('b'),
        () => {
          setPhase('done')
          if (caseId === 'api') {
            log('ok', '200 · /api/health')
            setHint('маршрут сработал раньше статики')
          } else if (caseId === 'static') {
            log('ok', '200 · style.css')
            setHint('файл из public с нужным Content-Type')
          } else {
            log('err', '403 · path traversal')
            setHint('путь нормализован и отклонён — вне корня public')
          }
        },
      ],
      (tl) => {
        if (!focusRef.current) return
        gsap.set(focusRef.current, { scale: 0.94, opacity: 0.45 })
        tl.to(focusRef.current, { scale: 1, opacity: 1 }, STEP * 2)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('api')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} disabled={busy} onChange={selectCase} />

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

      <RoutingViz caseId={caseId} phase={phase} focusRef={focusRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <CaseSwitch value={caseId} onChange={selectCase} />
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Рутинг и статика"
      lead="Один запрос — маршрут, файл из public или отказ при выходе за корень."
      problem={problem}
      code={code}
    />
  )
}
