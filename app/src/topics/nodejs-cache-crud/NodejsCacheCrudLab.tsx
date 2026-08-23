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
import styles from './NodejsCacheCrudLab.module.css'

const TOPIC_ID = '245-nodejs-cache-crud'
const STEP = 0.6
const ITEM_ID = 1

type CaseId = 'miss' | 'hit' | 'write'
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'

type LivePayload = {
  path: string
  latencyMs?: number
  summary: string
  ok: boolean
  source?: 'cache' | 'db'
  invalidated?: boolean
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'miss', label: 'cache miss' },
  { id: 'hit', label: 'cache hit' },
  { id: 'write', label: 'UPDATE + del' },
]

const PAIN = (
  <>
    Живой cache-aside на Render: чтения идут через <code>node-cache</code> перед Postgres; после{' '}
    <code>PUT</code> ключ сбрасывают, иначе клиент получит устаревший снимок.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  miss: (
    <>
      Сброс ключа → живой <code>GET /api/lab/cache/item</code> — промах,{' '}
      <code>SELECT</code>, затем <code>cache.set</code> (<code>source: db</code>).
    </>
  ),
  hit: (
    <>
      Прогрев кеша → повторный <code>GET</code> — ответ из node-cache, БД не трогают (
      <code>source: cache</code>).
    </>
  ),
  write: (
    <>
      Живой <code>PUT /api/lab/cache/item</code> — <code>UPDATE</code> в{' '}
      <code>lab_items</code> и <code>cache.del</code>.
    </>
  ),
}

const CODE_INTRO =
  'Учебные роуты `/api/lab/cache/*`: пул к Postgres, node-cache на чтении и invalidate после PUT.'

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  miss: [
    {
      id: 'cache-get-miss',
      label: 'routes/cacheLab.ts · GET',
      note: 'Miss: БД → заполнение node-cache.',
      executable: false,
      languageLabel: 'ts',
      code: `// GET /api/lab/cache/item?id=1
const key = \`item:\${id}\`;
const cached = itemCache.get(key);
if (cached) return { source: 'cache', item: cached };

const rows = await db.execute(sql\`
  SELECT id, title FROM lab_items WHERE id = \${id}
\`); // ← miss → DB
const item = rows[0];
itemCache.set(key, item); // ← fill
return { ok: true, source: 'db', item };
`,
    },
    {
      id: 'del-key',
      label: 'routes/cacheLab.ts · DEL key',
      note: 'Перед miss-кейсом сбрасываем ключ.',
      executable: false,
      languageLabel: 'ts',
      code: `// DELETE /api/lab/cache/key?id=1
itemCache.del(\`item:\${id}\`); // ← cold key
return { ok: true, deleted: true };
`,
    },
  ],
  hit: [
    {
      id: 'cache-node-cache',
      label: 'routes/cacheLab.ts · node-cache',
      note: 'In-process слой с TTL; тот же контракт, что у Redis.',
      executable: false,
      languageLabel: 'ts',
      code: `import NodeCache from 'node-cache';

const itemCache = new NodeCache({ stdTTL: 60 }); // ← lab stand

// hit: ранний return без query
const cached = itemCache.get<CacheItem>(\`item:\${id}\`);
if (cached !== undefined) {
  return { ok: true, source: 'cache', item: cached }; // ← без DB
}
`,
    },
    {
      id: 'get-hit',
      label: 'routes/cacheLab.ts · GET',
      note: 'Повторный GET после прогрева.',
      executable: false,
      languageLabel: 'ts',
      code: `// 1) GET — miss → set
// 2) GET — hit из node-cache
return {
  ok: true,
  source: 'cache', // ← второй запрос
  latencyMs,
  item: { id: 1, title: 'widget' },
};
`,
    },
  ],
  write: [
    {
      id: 'update-item',
      label: 'routes/cacheLab.ts · PUT',
      note: 'После UPDATE ключ кеша удаляют.',
      executable: false,
      languageLabel: 'ts',
      code: `// PUT /api/lab/cache/item  { id, title }
await db.execute(sql\`
  INSERT INTO lab_items (id, title) VALUES (\${id}, \${title})
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
\`); // ← CRUD Update
itemCache.del(\`item:\${id}\`); // ← invalidate
return { ok: true, invalidated: true, item: { id, title } };
`,
    },
    {
      id: 'pool-env',
      label: 'db.ts · pool',
      note: 'Один пул на процесс, строка из env.',
      executable: false,
      languageLabel: 'ts',
      code: `// connectionString из DATABASE_URL (Render)
export const db = drizzle(sqlClient); // ← пул процесса
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
  live: LivePayload | null
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function CacheCrudViz({ caseId, phase, live, focusRef }: VizProps) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'c' || phase === 'done'
  const cOn = phase === 'c' || phase === 'done'
  const doneOn = phase === 'done'
  const bad = doneOn && live != null && !live.ok

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
        ? 'fetch…'
        : phase === 'b'
          ? caseId === 'write'
            ? 'UPDATE…'
            : 'cache.get…'
          : caseId === 'miss'
            ? 'SELECT + set…'
            : caseId === 'hit'
              ? 'hit → ответ…'
              : 'cache.del…'
    : live
      ? `${live.ok ? 'ok' : 'err'} · ${live.latencyMs ?? '—'} ms`
      : 'done'

  if (caseId === 'write') {
    const labOn = aOn && !doneOn
    const dbOn = bOn && !doneOn
    const delOn = cOn && !doneOn
    const outSub = !doneOn ? 'ещё нет' : (live?.summary ?? '—')

    return (
      <LabVizPanel title={title} meta={meta}>
        <div className={styles.writeRow}>
          <div
            className={nodeCls(
              labOn && labVizStyles.nodeActive,
              doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>lab</span>
            <span className={labVizStyles.nodeSub}>PUT …/cache/item</span>
          </div>
          <span
            className={`${styles.writeArrow}${bOn ? ` ${styles.writeArrowActive}` : ` ${styles.writeArrowIdle}`}`}
            aria-hidden
          >
            →
          </span>
          <div
            className={nodeCls(
              dbOn && labVizStyles.nodeActive,
              doneOn && !bad && labVizStyles.nodeOk,
              !bOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>БД · lab_items</span>
            <span className={labVizStyles.nodeSub}>
              {!bOn ? '—' : doneOn ? 'UPDATE ok' : 'UPDATE…'}
            </span>
          </div>
          <span
            className={`${styles.writeArrow}${cOn ? ` ${styles.writeArrowActive}` : ` ${styles.writeArrowIdle}`}`}
            aria-hidden
          >
            →
          </span>
          <div
            className={nodeCls(
              delOn && labVizStyles.nodeActive,
              doneOn && !bad && labVizStyles.nodeErr,
              !cOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>cache · node-cache</span>
            <span className={labVizStyles.nodeSub}>
              {!cOn ? 'item:1' : doneOn ? 'DEL · пусто' : 'del…'}
            </span>
          </div>
          <span
            className={`${styles.writeArrow}${doneOn && !bad ? ` ${styles.writeArrowActive}` : ` ${styles.writeArrowIdle}`}`}
            aria-hidden
          >
            →
          </span>
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

  const isHit = caseId === 'hit'
  const hitPath =
    isHit && (bOn || doneOn)
  const missPath =
    !isHit && (bOn || doneOn)
  const hitStrong = isHit && (cOn || doneOn)
  const missStrong = !isHit && (cOn || doneOn)
  const outSub = !doneOn ? 'ещё нет' : (live?.summary ?? '—')

  const cacheSub = !bOn
    ? 'item:1 · get?'
    : isHit
      ? doneOn
        ? live?.source === 'cache'
          ? 'HIT'
          : (live?.summary ?? '—')
        : 'HIT?'
      : doneOn
        ? live?.source === 'db'
          ? 'MISS → set'
          : (live?.summary ?? '—')
        : bOn && !cOn
          ? 'MISS'
          : 'set…'

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.scheme}>
        <div
          className={`${styles.schemeTop} ${nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>lab</span>
          <span className={labVizStyles.nodeSub}>GET …/cache/item</span>
        </div>

        <div
          className={`${styles.schemeMid} ${nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && !bad && labVizStyles.nodeOk,
            !bOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>cache · node-cache</span>
          <span className={labVizStyles.nodeSub}>{cacheSub}</span>
        </div>

        <div className={styles.schemeFork} aria-hidden>
          <span
            className={`${styles.schemeForkHit}${hitPath ? ` ${styles.schemeForkHitActive}` : ` ${styles.schemeForkIdle}`}`}
          >
            ↙ hit
          </span>
          <span />
          <span
            className={`${styles.schemeForkMiss}${missPath ? ` ${styles.schemeForkMissActive}` : ` ${styles.schemeForkIdle}`}`}
          >
            miss ↘
          </span>
        </div>

        <div
          className={`${styles.schemeBranch}${!hitPath && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
        >
          <div
            className={nodeCls(
              hitStrong && !doneOn && labVizStyles.nodeActive,
              doneOn && isHit && !bad && labVizStyles.nodeOk,
              (!hitPath || !bOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>без БД</span>
            <span className={labVizStyles.nodeSub}>
              {isHit && doneOn ? 'ранний return' : '—'}
            </span>
          </div>
        </div>

        <span className={styles.schemeBranchArrow} aria-hidden>
          {doneOn ? '↓' : ''}
        </span>

        <div
          className={`${styles.schemeBranch}${!missPath && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
        >
          <div
            className={nodeCls(
              missStrong && !doneOn && labVizStyles.nodeActive,
              doneOn && !isHit && !bad && labVizStyles.nodeOk,
              (!missPath || !bOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>БД · lab_items</span>
            <span className={labVizStyles.nodeSub}>
              {!missPath
                ? 'не трогаем'
                : doneOn
                  ? 'SELECT ok'
                  : cOn
                    ? 'SELECT…'
                    : '—'}
            </span>
          </div>
          <span className={styles.schemeBranchArrow} aria-hidden>
            ↓
          </span>
          <div
            className={nodeCls(
              missStrong && doneOn && !bad && labVizStyles.nodeOk,
              (!missPath || !doneOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>cache.set</span>
            <span className={labVizStyles.nodeSub}>
              {!isHit && doneOn ? 'fill cache' : '—'}
            </span>
          </div>
        </div>

        <div
          ref={focusRef}
          className={`${styles.schemeOut} ${nodeCls(
            doneOn && !bad && labVizStyles.nodeOk,
            doneOn && !bad && labVizStyles.nodeActive,
            doneOn && bad && labVizStyles.nodeErr,
            !doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>ответ</span>
          <span className={labVizStyles.nodeSub}>{outSub}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

async function fetchLive(caseId: CaseId): Promise<LivePayload> {
  if (caseId === 'miss') {
    await apiJson(`/api/lab/cache/key?id=${ITEM_ID}`, { method: 'DELETE' })
    const data = await apiJson<{
      ok: boolean
      source?: 'cache' | 'db'
      latencyMs?: number
      item?: { id?: number; title?: string }
    }>(`/api/lab/cache/item?id=${ITEM_ID}`)
    return {
      path: '/api/lab/cache/item',
      ok: data.ok && data.source === 'db',
      source: data.source,
      latencyMs: data.latencyMs,
      summary: `${data.source ?? '?'} · ${data.item?.title ?? '—'}`,
    }
  }

  if (caseId === 'hit') {
    await apiJson(`/api/lab/cache/item?id=${ITEM_ID}`)
    const data = await apiJson<{
      ok: boolean
      source?: 'cache' | 'db'
      latencyMs?: number
      item?: { id?: number; title?: string }
    }>(`/api/lab/cache/item?id=${ITEM_ID}`)
    return {
      path: '/api/lab/cache/item',
      ok: data.ok && data.source === 'cache',
      source: data.source,
      latencyMs: data.latencyMs,
      summary: `${data.source ?? '?'} · ${data.item?.title ?? '—'}`,
    }
  }

  const title = `live-${Date.now().toString(36).slice(-4)}`
  const data = await apiJson<{
    ok: boolean
    invalidated?: boolean
    latencyMs?: number
    item?: { id?: number; title?: string }
  }>('/api/lab/cache/item', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: ITEM_ID, title }),
  })
  return {
    path: 'PUT /api/lab/cache/item',
    ok: data.ok && Boolean(data.invalidated),
    invalidated: data.invalidated,
    latencyMs: data.latencyMs,
    summary: `del · ${data.item?.title ?? title}`,
  }
}

export function NodejsCacheCrudLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('miss')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState<LivePayload | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setLive(null)
    if (focusRef.current)
      gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const finishLive = (payload: LivePayload, hintText: string) => {
    setLive(payload)
    setPhase('done')
    if (payload.ok) {
      log('ok', `${payload.path} · ${payload.summary}`)
      setHint(hintText)
    } else {
      log('err', `${payload.path} · ${payload.summary}`)
      setHint(hintText)
    }
  }

  const runLive = async () => {
    setPhase('a')
    try {
      if (caseId === 'write') {
        setPhase('b')
        await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 300))
        setPhase('c')
        const payload = await fetchLive(caseId)
        finishLive(payload, 'UPDATE в lab_items и cache.del — следующий Read снова через БД')
      } else if (caseId === 'miss') {
        setPhase('b')
        await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 250))
        setPhase('c')
        const payload = await fetchLive(caseId)
        finishLive(payload, 'miss: SELECT lab_items + cache.set')
      } else {
        setPhase('b')
        const payload = await fetchLive(caseId)
        setPhase('c')
        await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 250))
        finishLive(payload, 'hit: повторный GET закрыт кешем без query')
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
      finishLive(
        { path: 'API', ok: false, summary: message },
        'API недоступен — дождитесь деплоя Render или поднимите server',
      )
    } finally {
      setBusy(false)
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    void runLive()
  }

  const reset = () => {
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

      <CacheCrudViz caseId={caseId} phase={phase} live={live} focusRef={focusRef} />

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
      title="Кеширование. CRUD"
      lead="Живой cache-aside: пул к Postgres, node-cache на чтении и сброс ключа после PUT."
      problem={problem}
      code={code}
    />
  )
}
