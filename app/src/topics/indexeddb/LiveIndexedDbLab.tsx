import { useCallback, useEffect, useState } from 'react'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import styles from './LiveIndexedDbLab.module.css'

type LogLine = { kind: 'ok' | 'err' | 'info'; text: string }

export type Draft = {
  id: string
  title: string
  body: string
  tag: string
  updatedAt: number
}

const DB_NAME = 'assessment-idb-lab'
const DB_VERSION = 1
const STORE = 'drafts'

type LogFn = (line: LogLine) => void

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IDB request failed'))
  })
}

function idbTxDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IDB transaction aborted'))
  })
}

async function openDb(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('tag', 'tag', { unique: false })
      store.createIndex('updatedAt', 'updatedAt', { unique: false })
    }
  }
  return idbRequest(request)
}

async function putDraft(draft: Draft): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(draft)
    await idbTxDone(tx)
  } finally {
    db.close()
  }
}

async function getAllDrafts(): Promise<Draft[]> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const rows = await idbRequest(tx.objectStore(STORE).getAll())
    await idbTxDone(tx)
    return (rows as Draft[]).slice().sort((a, b) => b.updatedAt - a.updatedAt)
  } finally {
    db.close()
  }
}

async function getByTag(tag: string): Promise<Draft[]> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const index = tx.objectStore(STORE).index('tag')
    const rows = await idbRequest(index.getAll(tag))
    await idbTxDone(tx)
    return rows as Draft[]
  } finally {
    db.close()
  }
}

async function getDraft(id: string): Promise<Draft | undefined> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const row = await idbRequest(tx.objectStore(STORE).get(id))
    await idbTxDone(tx)
    return row as Draft | undefined
  } finally {
    db.close()
  }
}

async function deleteDraft(id: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    await idbTxDone(tx)
  } finally {
    db.close()
  }
}

async function clearStore(): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    await idbTxDone(tx)
  } finally {
    db.close()
  }
}

async function deleteDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('deleteDatabase failed'))
    req.onblocked = () => reject(new Error('deleteDatabase blocked — закрой другие вкладки'))
  })
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function newId() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export type IndexedDbLabApi = ReturnType<typeof useIndexedDbLab>

export function useIndexedDbLab() {
  const [supported] = useState(() => typeof indexedDB !== 'undefined')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [title, setTitle] = useState('Черновик заметки')
  const [body, setBody] = useState('Текст, который переживёт reload…')
  const [tag, setTag] = useState('work')
  const [filterTag, setFilterTag] = useState('')
  const [lookupId, setLookupId] = useState('')

  const pushLog = useCallback<LogFn>((line) => {
    setLog((prev) => [...prev.slice(-12), line])
  }, [])

  const reloadList = useCallback(async () => {
    const rows = filterTag.trim()
      ? await getByTag(filterTag.trim())
      : await getAllDrafts()
    setDrafts(rows)
    return rows
  }, [filterTag])

  useEffect(() => {
    if (!supported) return
    void (async () => {
      try {
        await reloadList()
      } catch (err) {
        pushLog({
          kind: 'err',
          text: err instanceof Error ? err.message : 'Не удалось открыть IndexedDB',
        })
      }
    })()
  }, [supported, reloadList, pushLog])

  const run = async (label: string, fn: () => Promise<void>) => {
    if (!supported) {
      pushLog({ kind: 'err', text: 'IndexedDB недоступен в этом браузере' })
      return
    }
    setBusy(true)
    try {
      await fn()
      pushLog({ kind: 'ok', text: label })
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = () =>
    run('put() в object store drafts', async () => {
      const draft: Draft = {
        id: newId(),
        title: title.trim() || 'Без названия',
        body: body.trim(),
        tag: tag.trim() || 'general',
        updatedAt: Date.now(),
      }
      await putDraft(draft)
      setLookupId(draft.id)
      await reloadList()
      pushLog({
        kind: 'info',
        text: `id=${draft.id} · смотри Application → IndexedDB → ${DB_NAME}`,
      })
    })

  const refreshFromDb = () =>
    run('getAll() / index.getAll(tag)', async () => {
      const rows = await reloadList()
      pushLog({ kind: 'info', text: `записей: ${rows.length}` })
    })

  const removeDraft = (id: string) =>
    run(`delete(${id})`, async () => {
      await deleteDraft(id)
      await reloadList()
    })

  const clearAll = () =>
    run('clear() store', async () => {
      await clearStore()
      await reloadList()
    })

  const dropDb = () =>
    run(`deleteDatabase(${DB_NAME})`, async () => {
      await deleteDatabase()
      setDrafts([])
      pushLog({ kind: 'info', text: 'Схема создастся снова при следующем open (onupgradeneeded)' })
    })

  const lookup = () =>
    run(`get(${lookupId || '—'})`, async () => {
      if (!lookupId.trim()) throw new Error('Укажи id записи')
      const row = await getDraft(lookupId.trim())
      if (!row) {
        pushLog({ kind: 'info', text: 'null — записи нет' })
        return
      }
      setTitle(row.title)
      setBody(row.body)
      setTag(row.tag)
      pushLog({ kind: 'info', text: JSON.stringify(row) })
    })

  const seedSamples = () =>
    run('seed 3 drafts', async () => {
      const samples: Draft[] = [
        {
          id: newId(),
          title: 'Офлайн-корзина',
          body: 'Кэш позиций заказа',
          tag: 'shop',
          updatedAt: Date.now() - 3000,
        },
        {
          id: newId(),
          title: 'Черновик PR',
          body: 'Описание рефакторинга IDB',
          tag: 'work',
          updatedAt: Date.now() - 2000,
        },
        {
          id: newId(),
          title: 'Идея лабы',
          body: 'Сравнить localStorage vs IndexedDB',
          tag: 'ideas',
          updatedAt: Date.now() - 1000,
        },
      ]
      for (const sample of samples) await putDraft(sample)
      await reloadList()
    })

  return {
    supported,
    busy,
    log,
    drafts,
    title,
    body,
    tag,
    filterTag,
    lookupId,
    setTitle,
    setBody,
    setTag,
    setFilterTag,
    setLookupId,
    saveDraft,
    refreshFromDb,
    removeDraft,
    clearAll,
    dropDb,
    lookup,
    seedSamples,
  }
}

function LabLog({ log }: { log: LogLine[] }) {
  return (
    <pre className={styles.log} aria-live="polite">
      {log.length === 0 ? 'лог пуст' : null}
      {log.map((line, i) => (
        <span key={`${i}-${line.text}`} className={styles[line.kind]}>
          {line.text}
          {'\n'}
        </span>
      ))}
    </pre>
  )
}

function DraftList({
  drafts,
  busy,
  onDelete,
}: {
  drafts: Draft[]
  busy: boolean
  onDelete: (id: string) => void
}) {
  if (drafts.length === 0) {
    return <p className={styles.empty}>В store пока пусто</p>
  }

  return (
    <ul className={styles.list}>
      {drafts.map((d) => (
        <li key={d.id} className={styles.item}>
          <div className={styles.itemBody}>
            <div className={styles.itemTitle}>{d.title}</div>
            <div className={styles.itemMeta}>
              <span className={styles.tag}>{d.tag}</span>
              <span>{formatTime(d.updatedAt)}</span>
            </div>
            <p className={styles.itemText}>{d.body || '—'}</p>
            <code className={styles.id}>{d.id}</code>
          </div>
          <button
            type="button"
            className="uiBtn uiBtnGhost"
            disabled={busy}
            onClick={() => onDelete(d.id)}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  )
}

export function IndexedDbProblemPanel({ lab }: { lab: IndexedDbLabApi }) {
  const {
    supported,
    busy,
    log,
    drafts,
    title,
    body,
    tag,
    setTitle,
    setBody,
    setTag,
    saveDraft,
    refreshFromDb,
    removeDraft,
  } = lab

  if (!supported) {
    return <p className={styles.warn}>IndexedDB в этом браузере недоступен.</p>
  }

  return (
    <div className={styles.root}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          Написал текст заметки, обновил страницу — всё пропало. Хочется, чтобы черновик оставался
          в браузере и открывался снова.
        </p>
        <div className={styles.problemLabel}>Решение</div>
        <p>
          Сохраняем заметку в базу внутри браузера (IndexedDB). После reload список читается оттуда
          же — без сервера.
        </p>
      </div>

      <label className={styles.field}>
        <span>Заголовок</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
      </label>
      <label className={styles.field}>
        <span>Текст</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} disabled={busy} />
      </label>
      <label className={styles.field}>
        <span>Тег</span>
        <input value={tag} onChange={(e) => setTag(e.target.value)} disabled={busy} />
      </label>

      <div className={styles.actions}>
        <button type="button" className="uiBtn uiBtnPrimary" disabled={busy} onClick={() => void saveDraft()}>
          Сохранить черновик
        </button>
        <button
          type="button"
          className="uiBtn uiBtnGhost"
          disabled={busy}
          onClick={() => void refreshFromDb()}
        >
          Показать сохранённые
        </button>
      </div>

      <DraftList drafts={drafts} busy={busy} onDelete={(id) => void removeDraft(id)} />

      <p className={styles.tip}>
        Сохрани → обнови страницу (F5) → список должен остаться. В DevTools: Application →
        IndexedDB → <code>{DB_NAME}</code>.
      </p>

      <LabLog log={log} />
    </div>
  )
}

export function IndexedDbSandboxPanel({ lab }: { lab: IndexedDbLabApi }) {
  const {
    supported,
    busy,
    log,
    drafts,
    title,
    body,
    tag,
    filterTag,
    lookupId,
    setTitle,
    setBody,
    setTag,
    setFilterTag,
    setLookupId,
    saveDraft,
    refreshFromDb,
    removeDraft,
    clearAll,
    dropDb,
    lookup,
    seedSamples,
  } = lab

  if (!supported) {
    return <p className={styles.warn}>IndexedDB в этом браузере недоступен.</p>
  }

  return (
    <div className={styles.root}>
      <p className={styles.tip}>
        Крути записи как хочешь: сохранить, найти по id/тегу, очистить базу. В DevTools смотри
        Application → IndexedDB.
      </p>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
        </label>
        <label className={styles.field}>
          <span>tag</span>
          <input value={tag} onChange={(e) => setTag(e.target.value)} disabled={busy} />
        </label>
      </div>
      <label className={styles.field}>
        <span>body</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} disabled={busy} />
      </label>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>filter tag</span>
          <input
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            placeholder="пусто = getAll"
            disabled={busy}
          />
        </label>
        <label className={styles.field}>
          <span>get by id</span>
          <input value={lookupId} onChange={(e) => setLookupId(e.target.value)} disabled={busy} />
        </label>
      </div>

      <div className={styles.actions}>
        <button type="button" className="uiBtn uiBtnPrimary" disabled={busy} onClick={() => void saveDraft()}>
          put
        </button>
        <button type="button" className="uiBtn uiBtnGhost" disabled={busy} onClick={() => void lookup()}>
          get
        </button>
        <button
          type="button"
          className="uiBtn uiBtnGhost"
          disabled={busy}
          onClick={() => void refreshFromDb()}
        >
          list / index
        </button>
        <button type="button" className="uiBtn uiBtnGhost" disabled={busy} onClick={() => void seedSamples()}>
          seed
        </button>
        <button type="button" className="uiBtn uiBtnGhost" disabled={busy} onClick={() => void clearAll()}>
          clear
        </button>
        <button type="button" className="uiBtn uiBtnDanger" disabled={busy} onClick={() => void dropDb()}>
          delete DB
        </button>
      </div>

      <DraftList drafts={drafts} busy={busy} onDelete={(id) => void removeDraft(id)} />
      <LabLog log={log} />
    </div>
  )
}

export function IndexedDbCodePanel() {
  return (
    <LabCodePanel
      intro="Минимальный цикл: открыть базу → записать → прочитать. Событийный API удобно оборачивать в Promise."
      snippets={[
        {
          label: 'Открыть базу и создать store',
          note: 'Схема меняется только при повышении version — в onupgradeneeded.',
          code: `const request = indexedDB.open('assessment-idb-lab', 1)

request.onupgradeneeded = () => {
  const db = request.result
  if (!db.objectStoreNames.contains('drafts')) {
    const store = db.createObjectStore('drafts', { keyPath: 'id' })
    store.createIndex('tag', 'tag', { unique: false })
  }
}

request.onsuccess = () => {
  const db = request.result
  // дальше — transaction + put/get
}`,
        },
        {
          label: 'Записать черновик',
          code: `const tx = db.transaction('drafts', 'readwrite')
tx.objectStore('drafts').put({
  id: 'draft-1',
  title: 'Заметка',
  body: 'Текст',
  tag: 'work',
  updatedAt: Date.now(),
})
tx.oncomplete = () => console.log('saved')`,
        },
        {
          label: 'Прочитать все / по тегу',
          code: `// все записи
const tx = db.transaction('drafts', 'readonly')
const all = tx.objectStore('drafts').getAll()
all.onsuccess = () => console.log(all.result)

// по индексу tag
const byTag = tx.objectStore('drafts').index('tag').getAll('work')
byTag.onsuccess = () => console.log(byTag.result)`,
        },
        {
          label: 'Promise-обёртка над IDBRequest',
          note: 'Так проще писать async/await в приложении.',
          code: `function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const db = await idbRequest(indexedDB.open('assessment-idb-lab', 1))`,
        },
      ]}
    />
  )
}

