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
  { id: 'echo', label: 'Всё ок' },
  { id: 'http404', label: 'Страницы нет' },
  { id: 'abort', label: 'Отменили' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  echo: <>Сервер отвечает нормально. Смотрим, как это выглядит у <code>fetch</code> и у XHR.</>,
  http404: (
    <>
      Сервер говорит «такого адреса нет». Важно: у <code>fetch</code> это часто <strong>не</strong>{' '}
      исключение.
    </>
  ),
  abort: <>Запрос прерываем сразу после старта — у каждого API своя «кнопка стоп».</>,
}

const SNIPPET_FETCH: InteractiveSnippet = {
  id: 'fetch-client',
  label: 'src/api/fetchClient.js',
  note: 'Сначала ждём ответ, потом проверяем статус, потом читаем JSON.',
  executable: false,
  code: `export async function loadUser(url) {
  const res = await fetch(url);
  // ← «письмо доставили» — даже если внутри 404
  if (!res.ok) {
    throw new Error('Сервер ответил ' + res.status); // ← сами проверяем
  }
  return res.json(); // ← тело читаем отдельно
}
`,
}

const SNIPPET_XHR: InteractiveSnippet = {
  id: 'xhr-client',
  label: 'src/api/xhrClient.js',
  note: 'XHR сообщает о конце загрузки событием; статус смотрите сами.',
  executable: false,
  code: `export function loadUserXhr(url, onDone) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.onload = () => {
    // ← onload бывает и при 404
    onDone(xhr.status, xhr.responseText);
  };
  xhr.onerror = () => onDone(0, ''); // ← сеть не достучалась
  xhr.send();
}
`,
}

const SNIPPET_ABORT: InteractiveSnippet = {
  id: 'abort-both',
  label: 'src/api/abort.js',
  note: 'Одна идея — «стоп», два разных вызова.',
  executable: false,
  code: `// fetch
const ctrl = new AbortController();
fetch(url, { signal: ctrl.signal });
ctrl.abort(); // ← стоп для fetch

// XHR
const xhr = new XMLHttpRequest();
xhr.open('GET', url);
xhr.send();
xhr.abort(); // ← стоп для XHR
`,
}

const CODE_BY_CASE: Record<CaseId, InteractiveSnippet[]> = {
  echo: [SNIPPET_FETCH, SNIPPET_XHR],
  http404: [SNIPPET_FETCH, SNIPPET_XHR],
  abort: [SNIPPET_ABORT],
}

function laneNodeState(outcome: LaneOutcome, phase: Phase): LabNodeState {
  if (phase === 'idle') return 'idle'
  if (phase === 'send') return 'active'
  if (outcome.kind === 'ok') return 'ok'
  if (outcome.kind === 'http' || outcome.kind === 'reject' || outcome.kind === 'abort') return 'err'
  return 'idle'
}

function outcomeLabel(outcome: LaneOutcome): { label: string; sub: string } {
  switch (outcome.kind) {
    case 'ok':
      return { label: 'всё хорошо', sub: outcome.detail }
    case 'http':
      return { label: 'ответ с ошибкой', sub: outcome.detail }
    case 'reject':
      return { label: 'не достучались', sub: outcome.detail }
    case 'abort':
      return { label: 'остановили', sub: outcome.detail }
    default:
      return { label: 'ждём', sub: '—' }
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
    <LabVizPanel title="Два способа спросить сервер" meta={apiMeta}>
      <div className={styles.apiRow}>
        <LabNode
          label="сервер"
          sub={apiMeta}
          state={sending ? 'active' : done ? 'ok' : 'idle'}
        />
      </div>
      <div className={styles.lanes}>
        <div className={`${styles.lane}${done && fetchOut.kind === 'idle' ? ` ${styles.laneDim}` : ''}`}>
          <p className={styles.laneTitle}>через fetch</p>
          <div className={styles.stack}>
            <LabNode
              label="ждём ответ"
              sub={sending ? 'запрос ушёл' : done ? 'промис завершён' : 'ещё не запускали'}
              state={laneNodeState(fetchOut, phase)}
            />
            <span className={`${styles.arrowDown}${sending || done ? ` ${styles.arrowActive}` : ''}`}>
              ↓
            </span>
            <LabNode label={fetchEnd.label} sub={fetchEnd.sub} state={laneNodeState(fetchOut, phase)} />
          </div>
        </div>
        <div className={`${styles.lane}${done && xhrOut.kind === 'idle' ? ` ${styles.laneDim}` : ''}`}>
          <p className={styles.laneTitle}>через XHR</p>
          <div className={styles.stack}>
            <LabNode
              label="ждём событие"
              sub={sending ? 'запрос ушёл' : done ? 'событие пришло' : 'ещё не запускали'}
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
    caseId === 'echo' ? 'живой ответ' : caseId === 'http404' ? 'адреса нет' : 'стоп сразу'

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
          setFetchOut({ kind: 'abort', detail: 'abort()' })
          log('warn', 'fetch: остановили запрос')
        } else if (f.tag === 'err') {
          setFetchOut({ kind: 'reject', detail: f.name })
          log('err', `fetch: ${f.name}`)
        } else {
          setFetchOut({ kind: 'ok', detail: 'не успели остановить' })
          log('warn', 'fetch: ответ пришёл раньше стопа')
        }

        if (x.aborted) {
          setXhrOut({ kind: 'abort', detail: 'abort()' })
          log('warn', 'XHR: остановили запрос')
        } else {
          setXhrOut({ kind: 'http', detail: `код ${x.status}` })
          log('info', `XHR: код ${x.status}`)
        }

        setPhase('done')
        setHint(<>Итог: оба умеют остановить запрос — только вызовы разные.</>)
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
        setFetchOut({ kind: 'ok', detail: echoOrStatus(f.echo, f.status) })
        log('ok', `fetch: всё хорошо, код ${f.status}`)
      } else {
        setFetchOut({ kind: 'http', detail: `код ${f.status}` })
        log('warn', `fetch: письмо пришло, но код ${f.status} (это не исключение)`)
      }

      if (x.status >= 200 && x.status < 300) {
        let echo = ''
        try {
          echo = (JSON.parse(x.body) as { echo?: string }).echo ?? ''
        } catch {
          echo = ''
        }
        setXhrOut({ kind: 'ok', detail: echoOrStatus(echo, x.status) })
        log('ok', `XHR: всё хорошо, код ${x.status}`)
      } else {
        setXhrOut({ kind: 'http', detail: `код ${x.status}` })
        log('warn', `XHR: загрузка закончилась, код ${x.status}`)
      }

      setPhase('done')
      if (caseId === 'echo') {
        setHint(<>Итог: когда сервер доволен, оба пути показывают успех — просто разными словами.</>)
      } else {
        setHint(
          <>
            Итог: «страницы нет» у <code>fetch</code> — это ответ с плохим кодом, а не обязательно
            падение промиса. Смотрите <code>ok</code>.
          </>,
        )
      }
    } catch (e) {
      if (runId !== runIdRef.current) return
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setFetchOut({ kind: 'reject', detail: 'сеть / CORS' })
      setXhrOut({ kind: 'reject', detail: 'сеть / CORS' })
      setPhase('done')
      setHint(<>Итог: до сервера не достучались — это уже другая ошибка, не «плохой код ответа».</>)
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
        Один и тот же сервер можно спросить через <code>fetch</code> или через XHR. Разница — в том,
        как вам расскажут про ответ и ошибку.
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
        intro="Короткий пример: проверить статус у fetch и прочитать ответ у XHR."
        snippets={CODE_BY_CASE[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Fetch и XHR"
      lead="Два пульта к одному серверу: смотрим, чем отличаются ответы «ок», «нет страницы» и «стоп»."
      problem={problem}
      code={code}
    />
  )
}

function echoOrStatus(echo: string, status: number): string {
  return echo ? echo : `код ${status}`
}
