import { useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import { apiUrl } from '../../lib/apiBase'
import styles from './FetchAdvancedXhrLab.module.css'

const TOPIC_ID = '272-fetch-advanced-xhr'

type CaseId = 'echo' | 'http404' | 'abort'
type Phase = 'idle' | 'send' | 'done'
type LaneOutcome = {
  kind: 'ok' | 'http' | 'reject' | 'abort' | 'idle'
  detail: string
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'echo', label: '200 echo' },
  { id: 'http404', label: 'HTTP 404' },
  { id: 'abort', label: 'abort' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  echo: (
    <>
      Оба API ходят на живой <code>/api/demo/echo</code> и получают 200 с телом.
    </>
  ),
  http404: (
    <>
      Один и тот же отсутствующий URL: у <code>fetch</code> промис обычно fulfill, у XHR —{' '}
      <code>load</code> со статусом 404.
    </>
  ),
  abort: (
    <>
      Отмена сразу после старта: <code>AbortController</code> у <code>fetch</code> и{' '}
      <code>xhr.abort()</code>.
    </>
  ),
}

const SNIPPET_FETCH: InteractiveSnippet = {
  id: 'fetch-client',
  label: 'src/api/fetchClient.js',
  note: '`fetch` отдаёт Promise с Response; HTTP-ошибка ≠ reject.',
  executable: false,
  code: `export async function getEcho(url, { signal } = {}) {
  const res = await fetch(url, { signal }); // ← сеть / CORS / abort → reject
  // ← 404/500 обычно fulfill с ok === false
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json(); // ← тело читаем отдельно
}

const ctrl = new AbortController();
ctrl.abort(); // ← AbortError
`,
}

const SNIPPET_XHR: InteractiveSnippet = {
  id: 'xhr-client',
  label: 'src/api/xhrClient.js',
  note: 'XHR сообщает результат событиями; статус смотрят в `onload`.',
  executable: false,
  code: `export function getEchoXhr(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () => {
      // ← load пришёл и при 404 — смотрите status
      resolve({ status: xhr.status, body: xhr.responseText });
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
    xhr.send();
  });
}

const xhr = new XMLHttpRequest();
xhr.open('GET', url);
xhr.send();
xhr.abort(); // ← onabort
`,
}

const CODE_BY_CASE: Record<CaseId, InteractiveSnippet[]> = {
  echo: [SNIPPET_FETCH, SNIPPET_XHR],
  http404: [SNIPPET_FETCH, SNIPPET_XHR],
  abort: [SNIPPET_FETCH, SNIPPET_XHR],
}

function laneNodeState(outcome: LaneOutcome, phase: Phase): LabNodeState {
  if (phase === 'idle') return 'idle'
  if (phase === 'send') return 'active'
  if (outcome.kind === 'ok') return 'ok'
  if (outcome.kind === 'http') return 'err'
  if (outcome.kind === 'reject' || outcome.kind === 'abort') return 'err'
  return 'idle'
}

function outcomeLabel(outcome: LaneOutcome): { label: string; sub: string } {
  switch (outcome.kind) {
    case 'ok':
      return { label: 'успех', sub: outcome.detail }
    case 'http':
      return { label: 'HTTP ответ', sub: outcome.detail }
    case 'reject':
      return { label: 'reject', sub: outcome.detail }
    case 'abort':
      return { label: 'abort', sub: outcome.detail }
    default:
      return { label: 'ожидание', sub: '—' }
  }
}

type VizProps = {
  phase: Phase
  fetchOut: LaneOutcome
  xhrOut: LaneOutcome
  apiMeta: string
}

function DualLaneViz({ phase, fetchOut, xhrOut, apiMeta }: VizProps) {
  const fetchEnd = outcomeLabel(fetchOut)
  const xhrEnd = outcomeLabel(xhrOut)
  const sending = phase === 'send'
  const done = phase === 'done'

  return (
    <LabVizPanel title="fetch и XHR рядом" meta={apiMeta}>
      <div className={styles.apiRow}>
        <LabNode
          label="API"
          sub={apiMeta}
          state={sending ? 'active' : done ? 'ok' : 'idle'}
        />
      </div>
      <div className={styles.lanes}>
        <div className={`${styles.lane}${done && fetchOut.kind === 'idle' ? ` ${styles.laneDim}` : ''}`}>
          <p className={styles.laneTitle}>fetch</p>
          <div className={styles.stack}>
            <LabNode
              label="Promise"
              sub={sending ? 'ждём Response' : done ? 'settled' : 'idle'}
              state={laneNodeState(fetchOut, phase)}
            />
            <span className={`${styles.arrowDown}${sending || done ? ` ${styles.arrowActive}` : ''}`}>
              ↓
            </span>
            <LabNode label={fetchEnd.label} sub={fetchEnd.sub} state={laneNodeState(fetchOut, phase)} />
          </div>
        </div>
        <div className={`${styles.lane}${done && xhrOut.kind === 'idle' ? ` ${styles.laneDim}` : ''}`}>
          <p className={styles.laneTitle}>XMLHttpRequest</p>
          <div className={styles.stack}>
            <LabNode
              label="события"
              sub={sending ? 'send…' : done ? 'load / abort' : 'idle'}
              state={laneNodeState(xhrOut, phase)}
            />
            <span className={`${styles.arrowDown}${sending || done ? ` ${styles.arrowActive}` : ''}`}>
              ↓
            </span>
            <LabNode label={xhrEnd.label} sub={xhrEnd.sub} state={laneNodeState(xhrOut, phase)} />
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function runXhrGet(
  url: string,
  opts?: { abortImmediately?: boolean },
): Promise<{ status: number; body: string; aborted: boolean }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.onload = () => {
      resolve({ status: xhr.status, body: xhr.responseText, aborted: false })
    }
    xhr.onerror = () => reject(new Error('network'))
    xhr.onabort = () => {
      resolve({ status: 0, body: '', aborted: true })
    }
    xhr.send()
    if (opts?.abortImmediately) {
      xhr.abort()
    }
  })
}

const IDLE: LaneOutcome = { kind: 'idle', detail: '—' }

export function FetchAdvancedXhrLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('echo')
  const [phase, setPhase] = useState<Phase>('idle')
  const [fetchOut, setFetchOut] = useState<LaneOutcome>(IDLE)
  const [xhrOut, setXhrOut] = useState<LaneOutcome>(IDLE)
  const [hint, setHint] = useState<ReactNode | null>(null)
  const [busy, setBusy] = useState(false)
  const runIdRef = useRef(0)

  const targetUrl =
    caseId === 'echo'
      ? apiUrl('/api/demo/echo?message=fetch-lab')
      : caseId === 'http404'
        ? apiUrl('/api/demo/__missing_fetch_lab__')
        : apiUrl('/api/demo/echo?message=abort')

  const apiMeta =
    caseId === 'echo' ? '/api/demo/echo' : caseId === 'http404' ? 'нет такого URL' : 'abort mid-flight'

  const selectCase = (next: CaseId) => {
    if (busy) return
    runIdRef.current += 1
    setCaseId(next)
    setPhase('idle')
    setFetchOut(IDLE)
    setXhrOut(IDLE)
    setHint(null)
    clear()
  }

  const reset = () => {
    runIdRef.current += 1
    setBusy(false)
    setCaseId('echo')
    setPhase('idle')
    setFetchOut(IDLE)
    setXhrOut(IDLE)
    setHint(null)
    clear()
  }

  const run = async () => {
    const runId = ++runIdRef.current
    clear()
    setBusy(true)
    setHint(null)
    setFetchOut(IDLE)
    setXhrOut(IDLE)
    setPhase('send')

    try {
      if (caseId === 'abort') {
        const ctrl = new AbortController()
        const fetchP = fetch(targetUrl, { signal: ctrl.signal }).then(
          () => ({ tag: 'ok' as const }),
          (err: unknown) => ({
            tag: 'err' as const,
            name: err instanceof Error ? err.name : 'Error',
            message: err instanceof Error ? err.message : String(err),
          }),
        )
        ctrl.abort()
        const xhrP = runXhrGet(targetUrl, { abortImmediately: true })

        const [f, x] = await Promise.all([fetchP, xhrP])
        if (runId !== runIdRef.current) return

        if (f.tag === 'err' && (f.name === 'AbortError' || /abort/i.test(f.message))) {
          setFetchOut({ kind: 'abort', detail: 'AbortError' })
          log('warn', 'fetch: AbortError (reject)')
        } else if (f.tag === 'err') {
          setFetchOut({ kind: 'reject', detail: f.name })
          log('err', `fetch: ${f.name}`)
        } else {
          setFetchOut({ kind: 'ok', detail: 'не успели отменить' })
          log('warn', 'fetch: ответ пришёл раньше abort')
        }

        if (x.aborted) {
          setXhrOut({ kind: 'abort', detail: 'onabort' })
          log('warn', 'xhr: abort()')
        } else {
          setXhrOut({ kind: 'http', detail: `status ${x.status}` })
          log('info', `xhr: status ${x.status}`)
        }

        setPhase('done')
        setHint(
          <>
            Итог: отмена у обоих API — но сигнал разный: reject <code>AbortError</code> против события{' '}
            <code>abort</code>.
          </>,
        )
        return
      }

      const fetchP = fetch(targetUrl).then(async (res) => {
        const text = await res.text()
        let echo = ''
        try {
          const json = JSON.parse(text) as { echo?: string }
          echo = json.echo ?? ''
        } catch {
          echo = text.slice(0, 40)
        }
        return { status: res.status, ok: res.ok, echo }
      })

      const xhrP = runXhrGet(targetUrl)

      const [f, x] = await Promise.all([fetchP, xhrP])
      if (runId !== runIdRef.current) return

      if (f.ok) {
        setFetchOut({ kind: 'ok', detail: `200 · ${f.echo || 'json'}` })
        log('ok', `fetch: ${f.status} ok · echo=${f.echo || '—'}`)
      } else {
        setFetchOut({ kind: 'http', detail: `${f.status} · ok=false` })
        log('warn', `fetch: fulfilled · status ${f.status} · ok=false`)
      }

      if (x.status >= 200 && x.status < 300) {
        let echo = ''
        try {
          echo = (JSON.parse(x.body) as { echo?: string }).echo ?? ''
        } catch {
          echo = ''
        }
        setXhrOut({ kind: 'ok', detail: `${x.status} · ${echo || 'body'}` })
        log('ok', `xhr: load · status ${x.status}`)
      } else {
        setXhrOut({ kind: 'http', detail: `load · ${x.status}` })
        log('warn', `xhr: load · status ${x.status}`)
      }

      setPhase('done')
      if (caseId === 'echo') {
        setHint(
          <>
            Итог: на 200 оба пути сходятся — промис с <code>ok</code> и событие <code>load</code> со
            статусом.
          </>,
        )
      } else {
        setHint(
          <>
            Итог: 404 не ломает промис <code>fetch</code> — смотрите <code>ok</code>; у XHR тот же
            статус в <code>onload</code>.
          </>,
        )
      }
    } catch (e) {
      if (runId !== runIdRef.current) return
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setFetchOut({ kind: 'reject', detail: msg.slice(0, 28) })
      setXhrOut({ kind: 'reject', detail: 'ошибка' })
      setPhase('done')
      setHint(<>Итог: сеть или CORS — смотрите Network в DevTools.</>)
    } finally {
      if (runId === runIdRef.current) setBusy(false)
    }
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
        <LabButton variant="primary" disabled={busy} onClick={() => void run()}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>
        Один HTTP-запрос можно сделать через <code>fetch</code> или <code>XMLHttpRequest</code> —
        расходятся модель результата, ошибки и отмена.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
      <DualLaneViz phase={phase} fetchOut={fetchOut} xhrOut={xhrOut} apiMeta={apiMeta} />
      {hint ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <div className={shell.row} style={{ marginBottom: '0.55rem' }}>
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
        topicId={TOPIC_ID}
        intro="Живой стенд бьёт в remote `/api/demo/echo` и в заведомо отсутствующий URL."
        snippets={CODE_BY_CASE[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Fetch · XMLHttpRequest"
      lead="Один URL — два клиента: промис `Response` против событий XHR."
      problem={problem}
      code={code}
    />
  )
}
