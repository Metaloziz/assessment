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
import { apiJson } from '../../lib/apiBase'
import styles from './NodejsDbAsyncConfigLab.module.css'

const TOPIC_ID = '244-nodejs-db-async-config'
const STEP = 0.6

type Pattern = 'store' | 'async' | 'config'
type StoreCase = 'sql' | 'nosql'
type AsyncCase = 'block' | 'await'
type ConfigCase = 'hardcoded' | 'env'
type CaseId = StoreCase | AsyncCase | ConfigCase
type Phase = 'idle' | 'a' | 'b' | 'done'

type LivePayload = {
  path: string
  latencyMs?: number
  summary: string
  ok: boolean
}

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'store', label: 'SQL / NoSQL' },
  { id: 'async', label: 'async' },
  { id: 'config', label: 'конфиг сред' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  store: [
    { id: 'sql', label: 'таблицы SQL' },
    { id: 'nosql', label: 'документ' },
  ],
  async: [
    { id: 'block', label: 'блок цикла' },
    { id: 'await', label: 'await + пул' },
  ],
  config: [
    { id: 'hardcoded', label: 'URL в коде' },
    { id: 'env', label: 'process.env' },
  ],
}

const LIVE_CASES = new Set<CaseId>(['sql', 'nosql', 'await', 'env'])

const PAIN: Record<Pattern, ReactNode> = {
  store: (
    <>
      SQL держит строки в таблицах со схемой; документный контраст — поле{' '}
      <code>jsonb</code> в Postgres (форма ближе к объекту, не отдельный Mongo).
    </>
  ),
  async: (
    <>
      Пока handler ждёт БД, event loop должен обслуживать другие запросы — поэтому{' '}
      <code>await</code> и пул, а не синхронное занятие потока.
    </>
  ),
  config: (
    <>
      Строка подключения и секреты приходят из среды (<code>process.env</code>), отдельно для
      dev и prod — не из захардкоженного литерала в репозитории.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  sql: (
    <>
      Запрос к таблице <code>lab_users</code> — одна строка с <code>id</code> и{' '}
      <code>email</code>.
    </>
  ),
  nosql: (
    <>
      То же Postgres, но поле <code>doc</code> — документ <code>jsonb</code>, не плоская строка
      таблицы.
    </>
  ),
  block: (
    <>
      Синхронное ожидание держит поток — второй запрос не стартует, пока первый не отпустит
      цикл.
    </>
  ),
  await: (
    <>
      <code>await pool.query</code> отдаёт управление циклу: другие запросы обрабатываются,
      пока ждём ответ БД.
    </>
  ),
  hardcoded: (
    <>
      URL и пароль в исходнике — одна среда на всех и риск утечки в git.
    </>
  ),
  env: (
    <>
      Приложение читает <code>DATABASE_URL</code> из среды; в ответе — только хост, без
      пароля.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  store: 'SELECT по таблице и чтение jsonb-документа — два контраста хранения в handler.',
  async: 'await к пулу: цикл свободен, пока драйвер ждёт сеть; sync-блок — антипример.',
  config: 'DATABASE_URL из process.env; fail fast, если ключ не задан.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  store: [
    {
      id: 'sql-user-route',
      label: 'routes/dbLab.ts · sql',
      note: 'Таблица lab_users: строки по схеме.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/db/sql-user?id=1
const rows = await db.execute(sql\`
  SELECT id, email FROM lab_users WHERE id = \${id}
\`); // ← SQL · строки

return {
  ok: true,
  store: 'sql',
  latencyMs,
  user: rows[0],
};
`,
    },
    {
      id: 'doc-user-route',
      label: 'routes/dbLab.ts · doc',
      note: 'lab_docs.doc — jsonb как документ.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/db/doc-user?id=1
const rows = await db.execute(sql\`
  SELECT doc FROM lab_docs WHERE id = \${id}
\`); // ← jsonb · документ

return {
  ok: true,
  store: 'doc',
  latencyMs,
  document: rows[0].doc,
};
`,
    },
  ],
  async: [
    {
      id: 'block-bad',
      label: 'bad-sync.js',
      note: 'Синхронное ожидание занимает поток — антипример.',
      executable: false,
      languageLabel: 'js',
      code: `// плохо: псевдо-синхронный драйвер / busy-wait
function getUserSync(id) {
  return db.querySync('SELECT * FROM users WHERE id = ?', [id]); // ← блок цикла
}
`,
    },
    {
      id: 'async-query-route',
      label: 'routes/dbLab.ts · async',
      note: 'await к пулу + latencyMs в ответе.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/db/async-query
const started = performance.now();
const rows = await db.execute(sql\`
  SELECT id, email FROM lab_users WHERE id = 1
\`); // ← await · цикл свободен
const latencyMs = Math.round(performance.now() - started);

return { ok: true, mode: 'await', latencyMs, user: rows[0] };
`,
    },
  ],
  config: [
    {
      id: 'hardcoded-bad',
      label: 'bad-config.js',
      note: 'Литерал с паролем в репозитории.',
      executable: false,
      languageLabel: 'js',
      code: `// плохо: одна среда и секрет в git
const pool = new pg.Pool({
  connectionString:
    'postgres://app:secret@prod-db:5432/app', // ← hardcode
});
`,
    },
    {
      id: 'config-route',
      label: 'routes/dbLab.ts · config',
      note: 'Снимок среды без пароля.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/db/config
return {
  ok: true,
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  dbHost: new URL(env.databaseUrl).hostname, // ← без пароля
  nodeEnv: process.env.NODE_ENV ?? 'development',
  source: process.env.DATABASE_URL ? 'process.env' : 'fallback',
};
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

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
}

function CaseSwitch({
  pattern,
  value,
  disabled,
  onChange,
}: {
  pattern: Pattern
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES[pattern].map((c) => (
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
  pattern: Pattern
  caseId: CaseId
  phase: Phase
  live: LivePayload | null
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function StoreViz({ caseId, phase, live, focusRef }: Omit<VizProps, 'pattern'>) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const isSql = caseId === 'sql'
  const bad = doneOn && live != null && !live.ok

  return (
    <LabVizPanel
      title={isSql ? 'SQL · lab_users' : 'jsonb · lab_docs'}
      meta={
        !doneOn
          ? phase === 'idle'
            ? 'ожидание'
            : phase === 'a'
              ? 'fetch…'
              : 'query…'
          : live
            ? `${live.ok ? 'ok' : 'err'} · ${live.latencyMs ?? '—'} ms`
            : 'done'
      }
    >
      <div className={styles.stage}>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>lab</span>
          <span className={labVizStyles.nodeSub}>
            {isSql ? 'handler → pool → таблица' : 'handler → pool → jsonb'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && (bad ? labVizStyles.nodeErr : labVizStyles.nodeOk),
          )}
        >
          <span className={labVizStyles.nodeLabel}>API + Postgres</span>
          <span className={labVizStyles.nodeSub}>
            {!bOn ? 'ещё нет' : isSql ? 'SELECT lab_users' : 'SELECT lab_docs.doc'}
          </span>
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
          <span className={labVizStyles.nodeLabel}>
            {isSql ? 'строка' : 'документ'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {!doneOn ? 'ещё нет' : (live?.summary ?? '—')}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function AsyncViz({ caseId, phase, live, focusRef }: Omit<VizProps, 'pattern'>) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const blocked = caseId === 'block'
  const bad = blocked ? doneOn : doneOn && live != null && !live.ok

  return (
    <LabVizPanel
      title={blocked ? 'sync · блок' : 'await · пул'}
      meta={
        !doneOn
          ? phase === 'idle'
            ? 'ожидание'
            : phase === 'a'
              ? blocked
                ? 'req A'
                : 'fetch…'
              : blocked
                ? 'цикл занят…'
                : 'await query…'
          : blocked
            ? 'req B ждал'
            : live
              ? `${live.ok ? 'ok' : 'err'} · ${live.latencyMs ?? '—'} ms`
              : 'done'
      }
    >
      <div className={styles.stage}>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>
            {blocked ? 'req A' : 'lab'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {blocked ? 'querySync…' : 'handler → pool'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && (bad ? labVizStyles.nodeErr : labVizStyles.nodeOk),
          )}
        >
          <span className={labVizStyles.nodeLabel}>event loop</span>
          <span className={labVizStyles.nodeSub}>
            {!bOn ? 'ещё нет' : blocked ? 'занят A' : 'свободен · await'}
          </span>
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
          <span className={labVizStyles.nodeLabel}>
            {blocked ? 'req B' : 'ответ'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {!doneOn
              ? blocked
                ? 'в очереди'
                : 'ещё нет'
              : blocked
                ? 'старт после A'
                : (live?.summary ?? '—')}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ConfigViz({ caseId, phase, live, focusRef }: Omit<VizProps, 'pattern'>) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const hard = caseId === 'hardcoded'
  const bad = hard ? doneOn : doneOn && live != null && !live.ok

  return (
    <LabVizPanel
      title={hard ? 'hardcode' : 'process.env'}
      meta={
        !doneOn
          ? phase === 'idle'
            ? 'ожидание'
            : phase === 'a'
              ? hard
                ? 'старт app'
                : 'fetch…'
              : hard
                ? 'литерал в коде'
                : 'чтение среды'
          : hard
            ? 'один URL · риск git'
            : live
              ? live.summary
              : 'done'
      }
    >
      <div className={styles.stage}>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>{hard ? 'app' : 'lab'}</span>
          <span className={labVizStyles.nodeSub}>
            {hard ? 'new Pool(…)' : 'чтение config'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && (bad ? labVizStyles.nodeErr : labVizStyles.nodeOk),
          )}
        >
          <span className={labVizStyles.nodeLabel}>
            {hard ? 'исходник' : 'среда'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {!bOn
              ? 'ещё нет'
              : hard
                ? 'postgres://…secret@'
                : 'DATABASE_URL'}
          </span>
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
          <span className={labVizStyles.nodeLabel}>итог</span>
          <span className={labVizStyles.nodeSub}>
            {!doneOn
              ? 'ещё нет'
              : hard
                ? 'утечка / одна среда'
                : (live?.summary ?? '—')}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ClusterViz(props: VizProps) {
  if (props.pattern === 'store') return <StoreViz {...props} />
  if (props.pattern === 'async') return <AsyncViz {...props} />
  return <ConfigViz {...props} />
}

function defaultCase(pattern: Pattern): CaseId {
  return CASES[pattern][0]!.id
}

async function fetchLive(caseId: CaseId): Promise<LivePayload> {
  if (caseId === 'sql') {
    const data = await apiJson<{
      ok: boolean
      latencyMs?: number
      user?: { id?: number; email?: string }
    }>('/api/lab/db/sql-user?id=1')
    return {
      path: '/api/lab/db/sql-user',
      ok: data.ok,
      latencyMs: data.latencyMs,
      summary: data.user?.email ?? JSON.stringify(data.user ?? {}),
    }
  }
  if (caseId === 'nosql') {
    const data = await apiJson<{
      ok: boolean
      latencyMs?: number
      document?: { email?: string; _id?: string }
    }>('/api/lab/db/doc-user?id=1')
    const doc = data.document
    return {
      path: '/api/lab/db/doc-user',
      ok: data.ok,
      latencyMs: data.latencyMs,
      summary: doc?.email ?? JSON.stringify(doc ?? {}),
    }
  }
  if (caseId === 'await') {
    const data = await apiJson<{
      ok: boolean
      latencyMs?: number
      user?: { email?: string }
    }>('/api/lab/db/async-query')
    return {
      path: '/api/lab/db/async-query',
      ok: data.ok,
      latencyMs: data.latencyMs,
      summary: `${data.latencyMs ?? '—'} ms · ${data.user?.email ?? 'row'}`,
    }
  }
  const data = await apiJson<{
    ok: boolean
    hasDatabaseUrl?: boolean
    dbHost?: string | null
    source?: string
  }>('/api/lab/db/config')
  return {
    path: '/api/lab/db/config',
    ok: data.ok,
    summary: `${data.dbHost ?? '?'} · ${data.source ?? 'env'}`,
  }
}

export function NodejsDbAsyncConfigLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('store')
  const [caseId, setCaseId] = useState<CaseId>('sql')
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

  const selectPattern = (next: Pattern) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
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
      setHint(hintText)
    } else {
      log('err', payload.summary)
      setHint(hintText)
    }
  }

  const runSimulated = () => {
    playTimeline(
      tlRef,
      [
        () => setPhase('a'),
        () => setPhase('b'),
        () => {
          setPhase('done')
          if (caseId === 'block') {
            log('err', 'цикл занят — второй запрос ждал')
            setHint('пока A в sync-ожидании, B не стартует')
          } else {
            log('err', 'пароль в исходнике')
            setHint('литерал в коде — одна среда и риск утечки')
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

  const runLive = async () => {
    setPhase('a')
    try {
      const payload = await fetchLive(caseId)
      setPhase('b')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 400))
      if (caseId === 'sql') {
        finishLive(payload, 'SQL вернул строку lab_users')
      } else if (caseId === 'nosql') {
        finishLive(payload, 'jsonb-документ из lab_docs')
      } else if (caseId === 'await') {
        finishLive(payload, 'await к пулу вернул строку и latencyMs')
      } else {
        finishLive(payload, 'host из env без пароля в ответе')
      }
      if (focusRef.current && !reducedMotion()) {
        gsap.fromTo(
          focusRef.current,
          { scale: 0.94, opacity: 0.45 },
          { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.inOut' },
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const payload: LivePayload = {
        path: 'API',
        ok: false,
        summary: message,
      }
      finishLive(payload, 'не удалось получить данные — повторите или проверьте подключение')
    } finally {
      setBusy(false)
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    if (LIVE_CASES.has(caseId)) {
      void runLive()
      return
    }
    runSimulated()
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('store')
    setCaseId('sql')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />
      <CaseSwitch
        pattern={pattern}
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

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ClusterViz
        pattern={pattern}
        caseId={caseId}
        phase={phase}
        live={live}
        focusRef={focusRef}
      />

      {phase === 'done' && hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <CaseSwitch pattern={pattern} value={caseId} onChange={selectCase} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="БД, async, конфиги"
      lead="Строки в таблице, документ в jsonb, await к пулу и конфиг из process.env — не из литерала в коде."
      problem={problem}
      code={code}
    />
  )
}
