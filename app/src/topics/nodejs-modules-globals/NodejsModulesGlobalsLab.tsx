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
import { apiJson, apiUrl } from '../../lib/apiBase'
import styles from './NodejsModulesGlobalsLab.module.css'

const TOPIC_ID = '242-nodejs-modules-globals'
const STEP = 0.6
const HANG_ABORT_MS = 2500

type Mode = 'http' | 'fs' | 'process'
type HttpCase = 'ok' | 'hang'
type FsCase = 'async' | 'sync'
type ProcessCase = 'env' | 'pollute'
type CaseId = HttpCase | FsCase | ProcessCase
type Phase = 'idle' | 'a' | 'b' | 'done'

type LivePayload = {
  ok: boolean
  summary: string
  fsMs?: number
  pingMs?: number
  blockedLoop?: boolean
  port?: number | null
  nodeEnv?: string
  status?: number
  body?: string
  hung?: boolean
}

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
      <code>*Sync</code> держит поток — параллельный ping на том же процессе
      это показывает.
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
      Живой GET с завершённым телом — клиент получает <code>200</code> и{' '}
      <code>ended: true</code>.
    </>
  ),
  hang: (
    <>
      Симуляция: handler без <code>res.end</code> — соединение остаётся открытым
      (на API hang — controlled timeout).
    </>
  ),
  async: (
    <>
      Живой <code>readFile</code> + параллельный ping — loop успевает ответить,
      пока ждём диск.
    </>
  ),
  sync: (
    <>
      Живой <code>readFileSync</code> + ping: sync держит loop, ping ждёт дольше.
    </>
  ),
  env: (
    <>
      Живой срез <code>process.env</code> и <code>cwd</code> — порт и окружение без
      хардкода в коде.
    </>
  ),
  pollute: (
    <>
      Симуляция: запись в <code>global.cache</code> видна всему процессу и легко
      конфликтует с другими модулями.
    </>
  ),
}

const CODE_INTRO: Record<Mode, string> = {
  http: '`node:http`: createServer + listen; ответ закрывают `res.end`.',
  fs: '`node:fs` на сервере: async read vs Sync + ping на том же процессе.',
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
      id: 'lab-http-ok',
      label: 'routes/modulesGlobalsLab.ts · ok',
      note: 'Live-лаба: завершённый JSON-ответ.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/modules/http?mode=ok
return reply.status(200).send({
  ok: true,
  body: 'ok',
  ended: true, // ← аналог res.end
  latencyMs,
});
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
      id: 'lab-fs',
      label: 'routes/modulesGlobalsLab.ts · fs',
      note: 'Sync + holdLoop vs async readFile.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/modules/fs?mode=sync|async
if (mode === 'sync') {
  const text = fs.readFileSync(HELLO_FILE, 'utf8'); // ← BLOCK
  holdLoop(SYNC_HOLD_MS);
  return { ok: true, blockedLoop: true, preview: text };
}
const text = await fsPromises.readFile(HELLO_FILE, 'utf8');
return { ok: true, blockedLoop: false, preview: text };
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
      id: 'lab-env',
      label: 'routes/modulesGlobalsLab.ts · env',
      note: 'Без секретов: PORT, NODE_ENV, cwd.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/modules/env
return {
  ok: true,
  port: Number(process.env.PORT) || null,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  cwd: process.cwd(), // ← рабочая директория
  pid: process.pid,
};
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

function usesLive(mode: Mode, caseId: CaseId): boolean {
  if (mode === 'http') return caseId === 'ok'
  if (mode === 'fs') return true
  if (mode === 'process') return caseId === 'env'
  return false
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
  live: LivePayload | null
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function ModulesViz({ mode, caseId, phase, live, focusRef }: VizProps) {
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
        ? live?.hung
          ? 'клиент ждёт'
          : 'клиент ждёт'
        : live?.status === 200
          ? '200 · закрыто'
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
              {doneOn
                ? hang
                  ? live?.hung
                    ? 'ожидание…'
                    : 'ожидание…'
                  : live?.body ?? '200 ok'
                : 'ещё нет'}
            </span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  if (mode === 'fs') {
    const sync = caseId === 'sync'
    const title = sync ? 'fs · readFileSync' : 'fs · readFile'
    const blocked = live?.blockedLoop ?? sync
    const meta = !doneOn
      ? phase === 'idle'
        ? 'ожидание'
        : phase === 'a'
          ? 'старт чтения'
          : sync
            ? 'поток занят…'
            : 'ждём диск…'
      : blocked
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
            <span className={labVizStyles.nodeSub}>hello.txt</span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            ref={focusRef}
            className={nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && (blocked ? labVizStyles.nodeErr : labVizStyles.nodeOk),
            )}
          >
            <span className={labVizStyles.nodeLabel}>
              {sync ? 'readFileSync' : 'readFile'}
            </span>
            <span className={labVizStyles.nodeSub}>
              {doneOn && live?.fsMs != null
                ? `${live.fsMs} ms`
                : sync
                  ? 'блокирует call stack'
                  : 'callback / await'}
            </span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            className={nodeCls(
              doneOn && !blocked && labVizStyles.nodeOk,
              doneOn && blocked && labVizStyles.nodeErr,
              doneOn && labVizStyles.nodeActive,
              !doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>ping</span>
            <span className={labVizStyles.nodeSub}>
              {doneOn && live?.pingMs != null
                ? `${live.pingMs} ms`
                : doneOn
                  ? blocked
                    ? 'ждал sync'
                    : 'ответил быстро'
                  : 'статус неизвестен'}
            </span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const pollute = caseId === 'pollute'
  const title = pollute ? 'global · pollute' : 'process.env'
  const portLabel =
    live?.port != null ? String(live.port) : pollute ? '—' : '8080'
  const meta = !doneOn
    ? phase === 'idle'
      ? 'ожидание'
      : phase === 'a'
        ? 'чтение контекста'
        : 'применение…'
    : pollute
      ? 'общее имя на процесс'
      : live?.nodeEnv
        ? `${live.nodeEnv} · PORT`
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
            {pollute ? 'ставит global.cache' : `PORT=${portLabel}`}
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
              ? 'общая корзина'
              : doneOn && live?.nodeEnv
                ? live.nodeEnv
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
            {pollute
              ? doneOn
                ? 'видел чужой cache'
                : 'ещё не применено'
              : doneOn
                ? `порт ${portLabel}`
                : 'ещё не применено'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

async function fetchHttpOk(): Promise<LivePayload> {
  const started = performance.now()
  const data = await apiJson<{
    ok: boolean
    body?: string
    ended?: boolean
    status?: number
    latencyMs?: number
  }>('/api/lab/modules/http?mode=ok')
  const clientMs = Math.round(performance.now() - started)
  return {
    ok: Boolean(data.ok && data.ended),
    status: data.status ?? 200,
    body: data.body ?? 'ok',
    summary: `200 · ${data.latencyMs ?? clientMs} ms server · ${clientMs} ms RTT`,
  }
}

async function fetchFs(mode: FsCase): Promise<LivePayload> {
  const fsStarted = performance.now()
  const fsPromise = apiJson<{
    ok: boolean
    mode?: string
    latencyMs?: number
    blockedLoop?: boolean
    preview?: string
  }>(`/api/lab/modules/fs?mode=${mode}`)

  await new Promise((r) => setTimeout(r, 40))

  const pingStarted = performance.now()
  const pingPromise = apiJson<{ ok: boolean; latencyMs?: number }>(
    '/api/lab/modules/ping',
  ).then((data) => ({
    ...data,
    clientMs: Math.round(performance.now() - pingStarted),
  }))

  const [fs, ping] = await Promise.all([fsPromise, pingPromise])
  const fsMs =
    typeof fs.latencyMs === 'number'
      ? fs.latencyMs
      : Math.round(performance.now() - fsStarted)
  const pingMs = ping.clientMs
  const blockedLoop =
    typeof fs.blockedLoop === 'boolean' ? fs.blockedLoop : mode === 'sync'

  return {
    ok: Boolean(fs.ok) && Boolean(ping.ok),
    fsMs,
    pingMs,
    blockedLoop,
    summary: `fs ${fsMs} ms · ping ${pingMs} ms`,
  }
}

async function fetchEnv(): Promise<LivePayload> {
  const data = await apiJson<{
    ok: boolean
    port?: number | null
    portFallback?: number
    nodeEnv?: string
    cwd?: string
  }>('/api/lab/modules/env')
  const port = data.port ?? data.portFallback ?? 3000
  return {
    ok: Boolean(data.ok),
    port,
    nodeEnv: data.nodeEnv,
    summary: `PORT=${port} · ${data.nodeEnv ?? 'development'}`,
  }
}

async function fetchHttpHang(): Promise<LivePayload> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HANG_ABORT_MS)
  try {
    await fetch(apiUrl('/api/lab/modules/http?mode=hang'), {
      signal: controller.signal,
    })
    return {
      ok: false,
      hung: true,
      summary: 'ответ пришёл позже abort',
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      ok: aborted,
      hung: aborted,
      summary: aborted
        ? `abort ${HANG_ABORT_MS} ms — ответ не закрыт`
        : err instanceof Error
          ? err.message
          : String(err),
    }
  } finally {
    clearTimeout(timer)
  }
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
  const [live, setLive] = useState<LivePayload | null>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setLive(null)
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

  const finishLive = (payload: LivePayload, hintText: string) => {
    setLive(payload)
    setPhase('done')
    if (payload.ok) {
      log('ok', payload.summary)
    } else if (payload.hung) {
      log('warn', payload.summary)
    } else {
      log('err', payload.summary)
    }
    setHint(hintText)
  }

  const pulseFocus = () => {
    if (focusRef.current && !reducedMotion()) {
      gsap.fromTo(
        focusRef.current,
        { scale: 0.94, opacity: 0.45 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.inOut' },
      )
    }
  }

  const runLive = async () => {
    setPhase('a')
    try {
      setPhase('b')
      if (mode === 'http' && caseId === 'ok') {
        const payload = await fetchHttpOk()
        finishLive(
          payload,
          payload.ok
            ? 'ответ закрыт; клиент получил тело'
            : 'ответ без ended — проверьте API',
        )
      } else if (mode === 'fs') {
        const payload = await fetchFs(caseId as FsCase)
        finishLive(
          payload,
          caseId === 'async'
            ? `ping ${payload.pingMs} ms — loop свободен на I/O`
            : `ping ${payload.pingMs} ms ждал sync (~${payload.fsMs} ms)`,
        )
      } else if (caseId === 'env') {
        const payload = await fetchEnv()
        finishLive(
          payload,
          'конфиг из окружения, без секретов в репозитории',
        )
      } else if (mode === 'http' && caseId === 'hang') {
        const payload = await fetchHttpHang()
        finishLive(
          payload,
          'соединение открыто, пока handler не вызовет end',
        )
      }
      pulseFocus()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      finishLive(
        { ok: false, summary: message },
        'API недоступен — дождитесь деплоя Render',
      )
    } finally {
      setBusy(false)
    }
  }

  const runSimulation = () => {
    playTimeline(
      tlRef,
      [
        () => setPhase('a'),
        () => setPhase('b'),
        () => {
          setPhase('done')
          if (caseId === 'hang') {
            log('err', 'нет res.end')
            setHint('соединение открыто, пока handler не вызовет end')
            setLive({ ok: false, hung: true, summary: 'нет res.end' })
          } else {
            log('warn', 'global.cache')
            setHint('лучше export const cache — без общей корзины процесса')
            setLive({ ok: false, summary: 'global.cache' })
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

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    if (usesLive(mode, caseId) || (mode === 'http' && caseId === 'hang')) {
      void runLive()
      return
    }

    runSimulation()
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
        live={live}
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
      lead="Живой fs и process.env на Node API; http ok и hang — реальный запрос; global — симуляция."
      problem={problem}
      code={code}
    />
  )
}
