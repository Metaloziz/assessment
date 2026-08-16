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
import styles from './NodejsDbAsyncConfigLab.module.css'

const TOPIC_ID = '244-nodejs-db-async-config'
const STEP = 0.6

type Pattern = 'store' | 'async' | 'config'
type StoreCase = 'sql' | 'nosql'
type AsyncCase = 'block' | 'await'
type ConfigCase = 'hardcoded' | 'env'
type CaseId = StoreCase | AsyncCase | ConfigCase
type Phase = 'idle' | 'a' | 'b' | 'done'

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

const PAIN: Record<Pattern, ReactNode> = {
  store: (
    <>
      SQL держит строки в таблицах со схемой; NoSQL отдаёт документ или пару ключ-значение —
      форма данных другая, оба — внешний I/O из Node.
    </>
  ),
  async: (
    <>
      Пока handler ждёт БД, event loop должен обслуживать другие запросы — поэтому{' '}
      <code>await</code> и пул, а не синхронная блокировка.
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
      <code>SELECT … FROM users</code> возвращает строки таблицы по схеме.
    </>
  ),
  nosql: (
    <>
      <code>findOne</code> возвращает документ коллекции без жёсткого JOIN.
    </>
  ),
  block: (
    <>
      Синхронное ожидание держит поток — второй запрос не стартует, пока первый не закончит БД.
    </>
  ),
  await: (
    <>
      <code>await pool.query</code> отпускает цикл: пока ждём сеть, принимаем другой request.
    </>
  ),
  hardcoded: (
    <>
      URL и пароль в исходнике — одна среда на всех и риск утечки в git.
    </>
  ),
  env: (
    <>
      <code>DATABASE_URL</code> из <code>process.env</code> — dev и prod подставляют разные
      значения.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  store: 'SQL — строки и схема; документ — объект коллекции. Оба через async-драйвер.',
  async: 'Пул соединений и `await` на запросе — event loop свободен для других handler.',
  config: '`DATABASE_URL` из среды; fail fast, если ключа нет.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  store: [
    {
      id: 'sql-users',
      label: 'db/users.sql.js',
      note: 'Таблица users: строки по схеме, плейсхолдер $1.',
      executable: false,
      languageLabel: 'js',
      code: `import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// ═══════════════════════════════════════════
// SQL ← таблица + схема
// ═══════════════════════════════════════════
export async function getUser(id) {
  const { rows } = await pool.query(
    'SELECT id, email FROM users WHERE id = $1', // ← строки
    [id],
  );
  return rows[0] ?? null;
}
`,
    },
    {
      id: 'nosql-users',
      label: 'db/users.doc.js',
      note: 'Коллекция users: один документ на запись.',
      executable: false,
      languageLabel: 'js',
      code: `import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URL);
const db = client.db('app');

// ═══════════════════════════════════════════
// NOSQL ← документ коллекции
// ═══════════════════════════════════════════
export async function getUser(id) {
  return db.collection('users').findOne({ _id: id }); // ← документ
}
`,
    },
  ],
  async: [
    {
      id: 'block-bad',
      label: 'bad-sync.js',
      note: 'Синхронное ожидание занимает поток целиком.',
      executable: false,
      languageLabel: 'js',
      code: `// плохо: псевдо-синхронный драйвер / busy-wait
function getUserSync(id) {
  return db.querySync('SELECT * FROM users WHERE id = ?', [id]); // ← блок цикла
}

// пока querySync не вернётся — другие request не обрабатываются
`,
    },
    {
      id: 'pool-await',
      label: 'pool.js',
      note: 'Пул + await: I/O не держит event loop.',
      executable: false,
      languageLabel: 'js',
      code: `import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // ← слоты пула
});

export async function getUser(id) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id],
  ); // ← await: цикл свободен
  return rows[0] ?? null;
}
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
      id: 'env-config',
      label: 'config.js',
      note: 'Ключи из process.env; разные значения в dev/prod.',
      executable: false,
      languageLabel: 'js',
      code: `// ═══════════════════════════════════════════
// CONFIG ← среда, не литерал
// ═══════════════════════════════════════════
export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL, // ← из среды
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required'); // ← fail fast
}

// .env.development → localhost
// секреты CI/prod  → боевой хост
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
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function StoreViz({ caseId, phase, focusRef }: Omit<VizProps, 'pattern'>) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const isSql = caseId === 'sql'

  return (
    <LabVizPanel
      title={isSql ? 'SQL · таблицы' : 'NoSQL · документ'}
      meta={
        !doneOn
          ? phase === 'idle'
            ? 'ожидание'
            : phase === 'a'
              ? 'handler'
              : isSql
                ? 'query…'
                : 'findOne…'
          : isSql
            ? 'rows[0]'
            : '{ _id, email }'
      }
    >
      <div className={styles.stage}>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>handler</span>
          <span className={labVizStyles.nodeSub}>getUser(id)</span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && labVizStyles.nodeOk,
          )}
        >
          <span className={labVizStyles.nodeLabel}>
            {isSql ? 'pg.Pool' : 'collection'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {!bOn
              ? 'ещё нет'
              : isSql
                ? 'SELECT … FROM users'
                : 'users.findOne'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          ref={focusRef}
          className={nodeCls(
            doneOn && labVizStyles.nodeOk,
            doneOn && labVizStyles.nodeActive,
            !doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>
            {isSql ? 'строка' : 'документ'}
          </span>
          <span className={labVizStyles.nodeSub}>
            {!doneOn ? 'ещё нет' : isSql ? '{ id, email }' : '{ _id, email }'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function AsyncViz({ caseId, phase, focusRef }: Omit<VizProps, 'pattern'>) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const blocked = caseId === 'block'

  return (
    <LabVizPanel
      title={blocked ? 'sync · блок' : 'await · пул'}
      meta={
        !doneOn
          ? phase === 'idle'
            ? 'ожидание'
            : phase === 'a'
              ? 'req A в handler'
              : blocked
                ? 'цикл занят…'
                : 'I/O ждёт, цикл свободен'
          : blocked
            ? 'req B ждал'
            : 'req B успел ответить'
      }
    >
      <div className={styles.stage}>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>req A</span>
          <span className={labVizStyles.nodeSub}>
            {blocked ? 'querySync…' : 'await pool.query'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && (blocked ? labVizStyles.nodeErr : labVizStyles.nodeOk),
          )}
        >
          <span className={labVizStyles.nodeLabel}>event loop</span>
          <span className={labVizStyles.nodeSub}>
            {!bOn ? 'ещё нет' : blocked ? 'занят A' : 'свободен'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          ref={focusRef}
          className={nodeCls(
            doneOn && !blocked && labVizStyles.nodeOk,
            doneOn && !blocked && labVizStyles.nodeActive,
            doneOn && blocked && labVizStyles.nodeErr,
            !doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>req B</span>
          <span className={labVizStyles.nodeSub}>
            {!doneOn ? 'в очереди' : blocked ? 'старт после A' : 'ответил параллельно'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ConfigViz({ caseId, phase, focusRef }: Omit<VizProps, 'pattern'>) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const hard = caseId === 'hardcoded'

  return (
    <LabVizPanel
      title={hard ? 'hardcode' : 'process.env'}
      meta={
        !doneOn
          ? phase === 'idle'
            ? 'ожидание'
            : phase === 'a'
              ? 'старт app'
              : hard
                ? 'литерал в коде'
                : 'чтение среды'
          : hard
            ? 'один URL · риск git'
            : 'dev ≠ prod URL'
      }
    >
      <div className={styles.stage}>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>app</span>
          <span className={labVizStyles.nodeSub}>new Pool(…)</span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && (hard ? labVizStyles.nodeErr : labVizStyles.nodeOk),
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
            doneOn && !hard && labVizStyles.nodeOk,
            doneOn && !hard && labVizStyles.nodeActive,
            doneOn && hard && labVizStyles.nodeErr,
            !doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>итог</span>
          <span className={labVizStyles.nodeSub}>
            {!doneOn
              ? 'ещё нет'
              : hard
                ? 'утечка / одна среда'
                : 'localhost | prod-db'}
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

export function NodejsDbAsyncConfigLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('store')
  const [caseId, setCaseId] = useState<CaseId>('sql')
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
          if (caseId === 'sql') {
            log('ok', 'rows · users')
            setHint('SQL вернул строку таблицы по схеме')
          } else if (caseId === 'nosql') {
            log('ok', 'document · users')
            setHint('драйвер вернул документ коллекции')
          } else if (caseId === 'block') {
            log('err', 'loop blocked')
            setHint('пока A в sync-ожидании, B не стартует')
          } else if (caseId === 'await') {
            log('ok', 'loop free')
            setHint('await отпустил цикл — B успел ответить')
          } else if (caseId === 'hardcoded') {
            log('err', 'secret in source')
            setHint('литерал в коде — одна среда и риск утечки')
          } else {
            log('ok', 'DATABASE_URL from env')
            setHint('dev и prod подставляют разные URL')
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
        focusRef={focusRef}
      />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
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
      lead="Модель данных, await к пулу и DATABASE_URL из среды — три слоя одного сервиса."
      problem={problem}
      code={code}
    />
  )
}
