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
import styles from './NodejsModulesGlobalsLab.module.css'

const TOPIC_ID = '242-nodejs-modules-globals'
const STEP = 0.6

type Mode = 'http' | 'fs' | 'process'
type HttpCase = 'ok' | 'hang'
type FsCase = 'async' | 'sync'
type ProcessCase = 'env' | 'pollute'
type CaseId = HttpCase | FsCase | ProcessCase
type Phase = 'idle' | 'a' | 'b' | 'done'

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'http', label: 'http' },
  { id: 'fs', label: 'fs' },
  { id: 'process', label: 'process / global' },
]

const CASES: Record<Mode, Array<{ id: CaseId; label: string }>> = {
  http: [
    { id: 'ok', label: 'res.end' },
    { id: 'hang', label: 'без end' },
  ],
  fs: [
    { id: 'async', label: 'readFile' },
    { id: 'sync', label: 'readFileSync' },
  ],
  process: [
    { id: 'env', label: 'process.env' },
    { id: 'pollute', label: 'global.foo' },
  ],
}

const PAIN: Record<Mode, ReactNode> = {
  http: (
    <>
      <code>http.createServer</code> принимает запрос; ответ нужно закрыть через{' '}
      <code>res.end</code>, иначе клиент ждёт.
    </>
  ),
  fs: (
    <>
      Асинхронный <code>fs</code> отпускает event loop на время I/O;{' '}
      <code>*Sync</code> держит поток, пока диск не ответит.
    </>
  ),
  process: (
    <>
      <code>process.env</code> — конфиг процесса; данные приложения держат в
      модуле, а не в <code>global</code>.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ok: (
    <>
      Handler пишет заголовки и вызывает <code>end</code> — клиент получает{' '}
      <code>200</code>.
    </>
  ),
  hang: (
    <>
      Handler отрабатывает без <code>res.end</code> — соединение остаётся
      открытым.
    </>
  ),
  async: (
    <>
      Пока ждём диск, loop может принять другой запрос — поток не занят чтением.
    </>
  ),
  sync: (
    <>
      <code>readFileSync</code> блокирует процесс до конца чтения — соседний
      запрос стоит в очереди.
    </>
  ),
  env: (
    <>
      Порт берётся из <code>process.env.PORT</code> (или запасное значение), без
      хардкода в коде.
    </>
  ),
  pollute: (
    <>
      Запись в <code>global.cache</code> видна всему процессу и легко конфликтует
      с другими модулями.
    </>
  ),
}

const CODE_INTRO: Record<Mode, string> = {
  http: '`node:http`: createServer + listen; ответ закрывают `res.end`.',
  fs: '`node:fs`: async read vs Sync в горячем пути HTTP.',
  process: '`process.env` для конфига; состояние — в экспорте модуля, не в `global`.',
}

const CODE_SNIPPETS: Record<Mode, InteractiveSnippet[]> = {
  http: [
    {
      id: 'server-js',
      label: 'server.js',
      note: 'Минимальный HTTP: handler обязан вызвать `end`.',
      executable: false,
      languageLabel: 'js',
      code: `import http from 'node:http';

// ═══════════════════════════════════════════
// HTTP ← встроенный модуль
// ═══════════════════════════════════════════
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('ok'); // ← закрыть ответ
});

server.listen(3000); // ← порт ОС
`,
    },
    {
      id: 'hang-js',
      label: 'hang.js',
      note: 'Без `end` клиент не получает завершённый ответ.',
      executable: false,
      languageLabel: 'js',
      code: `import http from 'node:http';

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    // ← нет res.end — запрос «висит»
  })
  .listen(3000);
`,
    },
  ],
  fs: [
    {
      id: 'read-async',
      label: 'read-async.js',
      note: 'Promises API: I/O не блокирует JS-поток.',
      executable: false,
      languageLabel: 'js',
      code: `import fs from 'node:fs/promises';
import path from 'node:path';

// ═══════════════════════════════════════════
// FS ASYNC ← диск вне call stack
// ═══════════════════════════════════════════
export async function loadHello() {
  const file = path.join(process.cwd(), 'hello.txt');
  return fs.readFile(file, 'utf8'); // ← await I/O
}
`,
    },
    {
      id: 'read-sync',
      label: 'read-sync.js',
      note: 'Sync в handler HTTP блокирует весь процесс.',
      executable: false,
      languageLabel: 'js',
      code: `import fs from 'node:fs';
import path from 'node:path';

export function loadHelloSync() {
  const file = path.join(process.cwd(), 'hello.txt');
  return fs.readFileSync(file, 'utf8'); // ← BLOCK: поток ждёт диск
}
`,
    },
  ],
  process: [
    {
      id: 'env-js',
      label: 'config.js',
      note: 'Порт и флаги — из окружения процесса.',
      executable: false,
      languageLabel: 'js',
      code: `// ═══════════════════════════════════════════
// PROCESS ← паспорт процесса
// ═══════════════════════════════════════════
export const port = Number(process.env.PORT) || 3000; // ← ENV
export const isProd = process.env.NODE_ENV === 'production';

// node -e "process.env.PORT=8080" … / PORT=8080 node app.js
`,
    },
    {
      id: 'global-js',
      label: 'cache.js',
      note: 'Модульный экспорт вместо общей корзины `global`.',
      executable: false,
      languageLabel: 'js',
      code: `// плохо:
// global.cache = global.cache || new Map(); // ← POLLUTE

// ═══════════════════════════════════════════
// MODULE STATE ← свой Map на файл
// ═══════════════════════════════════════════
export const cache = new Map();

export function remember(key, value) {
  cache.set(key, value);
}
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

function ModeSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Mode
  disabled?: boolean
  onChange: (id: Mode) => void
}) {
  return (
    <div className={shell.row}>
      {MODES.map((m) => (
        <LabButton
          key={m.id}
          variant="ghost"
          size="sm"
          active={value === m.id}
          disabled={disabled}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </LabButton>
      ))}
    </div>
  )
}

function CaseSwitch({
  mode,
  value,
  disabled,
  onChange,
}: {
  mode: Mode
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES[mode].map((c) => (
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
  mode: Mode
  caseId: CaseId
  phase: Phase
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function ModulesViz({ mode, caseId, phase, focusRef }: VizProps) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'

  if (mode === 'http') {
    const hang = caseId === 'hang'
    const title = hang ? 'http · без end' : 'http · res.end'
    const meta = !doneOn
      ? phase === 'idle'
        ? 'ожидание'
        : phase === 'a'
          ? 'запрос принят'
          : 'handler…'
      : hang
        ? 'клиент ждёт'
        : '200 · закрыто'

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
            <span className={labVizStyles.nodeSub}>GET /</span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            className={nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && !hang && labVizStyles.nodeOk,
              doneOn && hang && labVizStyles.nodeErr,
            )}
          >
            <span className={labVizStyles.nodeLabel}>handler</span>
            <span className={labVizStyles.nodeSub}>
              {hang
                ? doneOn
                  ? 'writeHead · end нет'
                  : 'writeHead…'
                : doneOn
                  ? 'writeHead + end'
                  : 'пишем ответ'}
            </span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            ref={focusRef}
            className={nodeCls(
              doneOn && !hang && labVizStyles.nodeOk,
              doneOn && !hang && labVizStyles.nodeActive,
              doneOn && hang && labVizStyles.nodeErr,
              !doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>ответ</span>
            <span className={labVizStyles.nodeSub}>
              {doneOn ? (hang ? 'ожидание…' : '200 ok') : 'ещё нет'}
            </span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  if (mode === 'fs') {
    const sync = caseId === 'sync'
    const title = sync ? 'fs · readFileSync' : 'fs · readFile'
    const meta = !doneOn
      ? phase === 'idle'
        ? 'ожидание'
        : phase === 'a'
          ? 'старт чтения'
          : sync
            ? 'поток занят…'
            : 'ждём диск…'
      : sync
        ? 'loop был заблокирован'
        : 'loop свободен на I/O'

    return (
      <LabVizPanel title={title} meta={meta}>
        <div className={styles.stage}>
          <div
            className={nodeCls(
              aOn && !doneOn && labVizStyles.nodeActive,
              doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>handler</span>
            <span className={labVizStyles.nodeSub}>нужен hello.txt</span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            ref={focusRef}
            className={nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && (sync ? labVizStyles.nodeErr : labVizStyles.nodeOk),
            )}
          >
            <span className={labVizStyles.nodeLabel}>
              {sync ? 'readFileSync' : 'readFile'}
            </span>
            <span className={labVizStyles.nodeSub}>
              {sync
                ? doneOn
                  ? 'JS ждал диск'
                  : 'блокирует call stack'
                : doneOn
                  ? 'I/O вне стека'
                  : 'callback / await'}
            </span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            className={nodeCls(
              doneOn && labVizStyles.nodeOk,
              doneOn && labVizStyles.nodeActive,
              !doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>event loop</span>
            <span className={labVizStyles.nodeSub}>
              {doneOn
                ? sync
                  ? 'другие запросы ждали'
                  : 'мог принять соседей'
                : 'статус неизвестен'}
            </span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const pollute = caseId === 'pollute'
  const title = pollute ? 'global · pollute' : 'process.env'
  const meta = !doneOn
    ? phase === 'idle'
      ? 'ожидание'
      : phase === 'a'
        ? 'чтение контекста'
        : 'применение…'
    : pollute
      ? 'общее имя на процесс'
      : 'PORT из окружения'

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.stage}>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>
            {pollute ? 'модуль A' : 'shell / CI'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {pollute ? 'ставит global.cache' : 'PORT=8080'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && (pollute ? labVizStyles.nodeErr : labVizStyles.nodeOk),
          )}
        >
          <span className={labVizStyles.nodeLabel}>
            {pollute ? 'global' : 'process.env'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {pollute
              ? doneOn
                ? 'один Map на всех'
                : 'общая корзина'
              : doneOn
                ? 'PORT=8080'
                : 'читаем env'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          ref={focusRef}
          className={nodeCls(
            doneOn && !pollute && labVizStyles.nodeOk,
            doneOn && !pollute && labVizStyles.nodeActive,
            doneOn && pollute && labVizStyles.nodeErr,
            !doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>
            {pollute ? 'модуль B' : 'listen'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {doneOn
              ? pollute
                ? 'видел чужой cache'
                : 'порт 8080'
              : 'ещё не применено'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function defaultCase(mode: Mode): CaseId {
  return CASES[mode][0]!.id
}

export function NodejsModulesGlobalsLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('http')
  const [caseId, setCaseId] = useState<CaseId>('ok')
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

  const selectMode = (next: Mode) => {
    tlRef.current?.kill()
    setBusy(false)
    setMode(next)
    setCaseId(defaultCase(next))
    clear()
    resetViz()
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
          if (mode === 'http') {
            if (caseId === 'ok') {
              log('ok', '200 · res.end')
              setHint('ответ закрыт; клиент получил тело')
            } else {
              log('err', 'нет res.end')
              setHint('соединение открыто, пока handler не вызовет end')
            }
          } else if (mode === 'fs') {
            if (caseId === 'async') {
              log('ok', 'readFile · loop free')
              setHint('пока ждём диск, процесс может обслуживать других')
            } else {
              log('warn', 'readFileSync · blocked')
              setHint('sync держит call stack — соседние запросы ждут')
            }
          } else if (caseId === 'env') {
            log('ok', 'listen(process.env.PORT)')
            setHint('конфиг из окружения, без секретов в репозитории')
          } else {
            log('warn', 'global.cache')
            setHint('лучше export const cache — без общей корзины процесса')
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
    setMode('http')
    setCaseId('ok')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <ModeSwitch value={mode} disabled={busy} onChange={selectMode} />
      <CaseSwitch
        mode={mode}
        value={caseId}
        disabled={busy}
        onChange={selectCase}
      />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[mode]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ModulesViz
        mode={mode}
        caseId={caseId}
        phase={phase}
        focusRef={focusRef}
      />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <ModeSwitch value={mode} onChange={selectMode} />
      <InteractiveCodePanel
        key={mode}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[mode]}
        snippets={CODE_SNIPPETS[mode]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Модули и глобалы Node"
      lead="http, fs и process/global — один стенд на механизм."
      problem={problem}
      code={code}
    />
  )
}
