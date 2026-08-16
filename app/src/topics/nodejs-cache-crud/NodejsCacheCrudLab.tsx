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
import styles from './NodejsCacheCrudLab.module.css'

const TOPIC_ID = '245-nodejs-cache-crud'
const STEP = 0.6

type CaseId = 'miss' | 'hit' | 'write'
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'miss', label: 'cache miss' },
  { id: 'hit', label: 'cache hit' },
  { id: 'write', label: 'UPDATE + del' },
]

const PAIN = (
  <>
    Чтения идут через кеш перед БД; после мутации ключ сбрасывают, иначе клиент
    получит устаревший снимок.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  miss: (
    <>
      <code>GET item:42</code> — промах, <code>SELECT</code> в БД, затем{' '}
      <code>cache.set</code>.
    </>
  ),
  hit: (
    <>
      Тот же ключ уже в кеше — ответ сразу, пул БД не трогают.
    </>
  ),
  write: (
    <>
      <code>UPDATE</code> в БД, затем <code>cache.del</code> — следующий Read снова
      через хранилище.
    </>
  ),
}

const CODE_INTRO =
  'Пул к БД, cache-aside на Read и сброс ключа после Update.'

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  miss: [
    {
      id: 'db-pool',
      label: 'db.js',
      note: 'Один пул на процесс, строка из env.',
      executable: false,
      languageLabel: 'js',
      code: `import pg from 'pg';

// ═══════════════════════════════════════════
// POOL ← переиспользование соединений
// ═══════════════════════════════════════════
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL, // ← env
  max: 10,
});

export function query(text, params) {
  return pool.query(text, params);
}
`,
    },
    {
      id: 'get-miss',
      label: 'items.js',
      note: 'Miss: БД → заполнение кеша.',
      executable: false,
      languageLabel: 'js',
      code: `import { query } from './db.js';
import { cache } from './cache.js';

export async function getItem(id) {
  const key = \`item:\${id}\`;
  const hit = await cache.get(key);
  if (hit) return hit;

  const { rows } = await query(
    'SELECT id, title FROM items WHERE id = $1',
    [id],
  ); // ← miss → DB
  const row = rows[0] ?? null;
  if (row) await cache.set(key, row, { ttlSec: 60 }); // ← fill
  return row;
}
`,
    },
  ],
  hit: [
    {
      id: 'cache-map',
      label: 'cache.js',
      note: 'Простой in-process слой с тем же контрактом, что Redis.',
      executable: false,
      languageLabel: 'js',
      code: `const store = new Map();

export const cache = {
  async get(key) {
    return store.get(key) ?? null; // ← hit | null
  },
  async set(key, value, _opts) {
    store.set(key, value);
  },
  async del(key) {
    store.delete(key);
  },
};
`,
    },
    {
      id: 'get-hit',
      label: 'items.js',
      note: 'Hit: ранний return без query.',
      executable: false,
      languageLabel: 'js',
      code: `import { cache } from './cache.js';
import { query } from './db.js';

export async function getItem(id) {
  const key = \`item:\${id}\`;
  const cached = await cache.get(key);
  if (cached) return cached; // ← hit, без DB

  const { rows } = await query(
    'SELECT id, title FROM items WHERE id = $1',
    [id],
  );
  const row = rows[0] ?? null;
  if (row) await cache.set(key, row, { ttlSec: 60 });
  return row;
}
`,
    },
  ],
  write: [
    {
      id: 'update-item',
      label: 'items.js',
      note: 'После UPDATE ключ кеша удаляют.',
      executable: false,
      languageLabel: 'js',
      code: `import { query } from './db.js';
import { cache } from './cache.js';

export async function updateItem(id, title) {
  await query(
    'UPDATE items SET title = $1 WHERE id = $2',
    [title, id],
  ); // ← CRUD Update
  await cache.del(\`item:\${id}\`); // ← invalidate
}
`,
    },
    {
      id: 'route-put',
      label: 'routes.js',
      note: 'HTTP PUT вызывает update и отдаёт 200.',
      executable: false,
      languageLabel: 'js',
      code: `import { updateItem, getItem } from './items.js';

export async function putItem(req, res) {
  const id = Number(req.params.id);
  const { title } = req.body;
  await updateItem(id, title); // ← DB + del
  const fresh = await getItem(id); // ← miss → новый title
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(fresh));
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

function CacheCrudViz({ caseId, phase, focusRef }: VizProps) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'c' || phase === 'done'
  const cOn = phase === 'c' || phase === 'done'
  const doneOn = phase === 'done'

  const title =
    caseId === 'miss'
      ? 'read · miss'
      : caseId === 'hit'
        ? 'read · hit'
        : 'write · invalidate'

  const meta = !doneOn
    ? phase === 'idle'
      ? 'ожидание'
      : phase === 'a'
        ? 'запрос принят'
        : phase === 'b'
          ? caseId === 'write'
            ? 'UPDATE в БД…'
            : 'смотрим кеш…'
          : caseId === 'miss'
            ? 'читаем БД…'
            : caseId === 'hit'
              ? 'отдаём из кеша…'
              : 'сбрасываем ключ…'
    : caseId === 'miss'
      ? '200 · после fill'
      : caseId === 'hit'
        ? '200 · без DB'
        : '200 · ключ сброшен'

  const cacheSub = !bOn
    ? 'item:42'
    : caseId === 'hit'
      ? doneOn || cOn
        ? 'HIT · { title }'
        : 'get…'
      : caseId === 'miss'
        ? doneOn
          ? 'SET после DB'
          : bOn && !cOn
            ? 'MISS'
            : 'set…'
        : doneOn
          ? 'DEL · пусто'
          : cOn
            ? 'del…'
            : 'ещё полный'

  const dbSub = !cOn && caseId !== 'hit'
    ? caseId === 'write' && bOn
      ? 'UPDATE…'
      : 'ещё нет'
    : caseId === 'hit'
      ? doneOn
        ? 'не вызывали'
        : '—'
      : caseId === 'miss'
        ? doneOn
          ? 'SELECT ok'
          : 'SELECT…'
        : doneOn
          ? 'UPDATE ok'
          : 'UPDATE…'

  const dbActive =
    (caseId === 'miss' && (phase === 'c' || doneOn)) ||
    (caseId === 'write' && (phase === 'b' || phase === 'c' || doneOn))
  const dbOk = doneOn && caseId !== 'hit'

  const cacheActive =
    (caseId === 'hit' && (bOn || doneOn)) ||
    (caseId === 'miss' && (bOn || doneOn)) ||
    (caseId === 'write' && (cOn || doneOn))
  const cacheOk = doneOn && caseId !== 'write'
  const cacheWarn = doneOn && caseId === 'write'

  const outSub = !doneOn
    ? 'ещё нет'
    : caseId === 'write'
      ? '{ title: new }'
      : '{ id: 42, title }'

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
          <span className={labVizStyles.nodeSub}>
            {caseId === 'write' ? 'PUT /items/42' : 'GET /items/42'}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            cacheActive && !doneOn && labVizStyles.nodeActive,
            cacheOk && labVizStyles.nodeOk,
            cacheWarn && labVizStyles.nodeErr,
            !bOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>cache</span>
          <span className={labVizStyles.nodeSub}>{cacheSub}</span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            dbActive && !doneOn && labVizStyles.nodeActive,
            dbOk && labVizStyles.nodeOk,
            (caseId === 'hit' || !dbActive) && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>БД · pool</span>
          <span className={labVizStyles.nodeSub}>{dbSub}</span>
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
          <span className={labVizStyles.nodeLabel}>ответ</span>
          <span className={labVizStyles.nodeSub}>{outSub}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function NodejsCacheCrudLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('miss')
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

    const steps: Array<() => void> =
      caseId === 'hit'
        ? [
            () => setPhase('a'),
            () => setPhase('b'),
            () => {
              setPhase('done')
              log('ok', 'hit · без query')
              setHint('повторный Read закрыт кешем')
            },
          ]
        : caseId === 'miss'
          ? [
              () => setPhase('a'),
              () => setPhase('b'),
              () => setPhase('c'),
              () => {
                setPhase('done')
                log('ok', 'miss · SELECT + set')
                setHint('после fill следующий запрос может дать hit')
              },
            ]
          : [
              () => setPhase('a'),
              () => setPhase('b'),
              () => setPhase('c'),
              () => {
                setPhase('done')
                log('ok', 'UPDATE + cache.del')
                setHint('без del клиент видел бы старый title')
              },
            ]

    playTimeline(
      tlRef,
      steps,
      (tl) => {
        if (!focusRef.current) return
        const at = (steps.length - 1) * STEP
        gsap.set(focusRef.current, { scale: 0.94, opacity: 0.45 })
        tl.to(focusRef.current, { scale: 1, opacity: 1 }, at)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('miss')
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

      <CacheCrudViz caseId={caseId} phase={phase} focusRef={focusRef} />

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
      title="Кеш и CRUD"
      lead="Пул к БД, cache-aside на чтении и сброс ключа после записи."
      problem={problem}
      code={code}
    />
  )
}
