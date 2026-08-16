import { useEffect, useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import { apiUrl, apiWsUrl } from '../../lib/apiBase'
import styles from './NetworkLongPollingWsSseLab.module.css'

const TOPIC_ID = '252-network-long-polling-ws-sse'

type Pattern = 'longPoll' | 'sse' | 'ws'
type LongPollCase = 'event' | 'timeout'
type SseCase = 'stream' | 'drop'
type WsCase = 'echo' | 'push'
type CaseId = LongPollCase | SseCase | WsCase

type Phase = 'idle' | 'open' | 'wait' | 'data' | 'done' | 'err'

type FeedItem = { id: string; tag: string; body: string }

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'longPoll', label: 'Long-poll' },
  { id: 'sse', label: 'SSE' },
  { id: 'ws', label: 'WebSocket' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  longPoll: [
    { id: 'event', label: 'событие' },
    { id: 'timeout', label: 'таймаут' },
  ],
  sse: [
    { id: 'stream', label: 'поток' },
    { id: 'drop', label: 'обрыв' },
  ],
  ws: [
    { id: 'echo', label: 'echo' },
    { id: 'push', label: 'server push' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  longPoll: (
    <>
      HTTP-запрос висит, пока сервер не отдаст событие или не истечёт hold. Живой{' '}
      <code>GET /api/lab/realtime/long-poll</code>.
    </>
  ),
  sse: (
    <>
      Один ответ <code>text/event-stream</code>: сервер пишет кадры, клиент —{' '}
      <code>EventSource</code>. Только server → client.
    </>
  ),
  ws: (
    <>
      После upgrade — full-duplex фреймы. Живой <code>ws</code> на{' '}
      <code>/api/lab/realtime/ws</code>.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  event: (
    <>
      Сервер держит запрос ~700&nbsp;ms и отвечает JSON с <code>events[]</code>.
    </>
  ),
  timeout: (
    <>
      Hold без события: пустой <code>events</code> и <code>reason: timeout</code> — клиент
      открыл бы следующий poll.
    </>
  ),
  stream: (
    <>
      Три <code>tick</code> и <code>done</code> в одном потоке, затем сервер закрывает stream.
    </>
  ),
  drop: (
    <>
      Один <code>ping</code>, соединение рвётся — типичный сигнал к reconnect.
    </>
  ),
  echo: (
    <>
      Клиент шлёт JSON, сервер отвечает <code>type: echo</code> — оба направления на одном
      канале.
    </>
  ),
  push: (
    <>
      Сервер сам пушит <code>hello</code> / <code>push</code> без исходящего сообщения клиента.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  longPoll: 'Учебный long-poll: hold HTTP до события или таймаута.',
  sse: 'SSE: `text/event-stream` и браузерный `EventSource`.',
  ws: 'WebSocket: upgrade и двусторонние JSON-фреймы.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  longPoll: [
    {
      id: 'lp-route',
      label: 'routes/realtimeLab.ts · long-poll',
      note: 'Сервер ждёт, затем отдаёт events или пустой timeout.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/api/lab/realtime/long-poll', async (req, reply) => {
  const mode = req.query.mode === 'timeout' ? 'timeout' : 'event';
  if (mode === 'timeout') {
    await sleep(1200); // ← hold без события
    return reply.send({ ok: true, events: [], reason: 'timeout' });
  }
  await sleep(700); // ← hold до события
  return reply.send({
    ok: true,
    events: [{ id: 1, type: 'order', status: 'shipped' }], // ← push через HTTP
  });
});
`,
    },
    {
      id: 'lp-client',
      label: 'client · longPoll',
      note: 'После ответа сразу открывают следующий GET.',
      executable: false,
      languageLabel: 'ts',
      code: `async function longPoll(url: string, onEvent: (e: unknown) => void) {
  for (;;) {
    const res = await fetch(url);
    const body = await res.json();
    if (body.events?.length) onEvent(body.events); // ← событие
    // ← следующий запрос сразу (и после timeout)
  }
}
`,
    },
  ],
  sse: [
    {
      id: 'sse-route',
      label: 'routes/realtimeLab.ts · sse',
      note: 'Один HTTP-ответ, много data:-кадров.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/api/lab/realtime/sse', (req, reply) => {
  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8', // ← SSE
    'Cache-Control': 'no-cache',
  });
  reply.raw.write('event: tick\\ndata: {"n":1}\\n\\n'); // ← кадр
});
`,
    },
    {
      id: 'sse-client',
      label: 'client · EventSource',
      note: 'Браузер сам переподключается при обрыве.',
      executable: false,
      languageLabel: 'ts',
      code: `const es = new EventSource('/api/lab/realtime/sse?mode=stream');
es.addEventListener('tick', (e) => {
  console.log(JSON.parse(e.data)); // ← server → client
});
es.onerror = () => {
  /* EventSource reconnect */ // ← обрыв
};
`,
    },
  ],
  ws: [
    {
      id: 'ws-route',
      label: 'routes/realtimeLab.ts · ws',
      note: 'После upgrade — message / send в обе стороны.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/api/lab/realtime/ws', { websocket: true }, (socket) => {
  socket.send(JSON.stringify({ type: 'ready' }));
  socket.on('message', (raw) => {
    const got = JSON.parse(String(raw));
    socket.send(JSON.stringify({ type: 'echo', got })); // ← duplex
  });
});
`,
    },
    {
      id: 'ws-client',
      label: 'client · WebSocket',
      note: 'Клиент шлёт и слушает один канал.',
      executable: false,
      languageLabel: 'ts',
      code: `const ws = new WebSocket('wss://…/api/lab/realtime/ws?mode=echo');
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'ping' })); // ← client → server
});
ws.addEventListener('message', (e) => {
  console.log(JSON.parse(String(e.data))); // ← server → client
});
`,
    },
  ],
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

function nodeState(active: boolean, done: boolean, err: boolean): LabNodeState {
  if (err && done) return 'err'
  if (done) return 'ok'
  if (active) return 'active'
  return 'idle'
}

function RealtimeViz({
  pattern,
  phase,
  feed,
  meta,
}: {
  pattern: Pattern
  phase: Phase
  feed: FeedItem[]
  meta: string
}) {
  const open = phase !== 'idle'
  const waiting = phase === 'wait' || phase === 'open'
  const hasData = phase === 'data' || phase === 'done'
  const done = phase === 'done' || phase === 'err'
  const err = phase === 'err'
  const duplex = pattern === 'ws'

  const title =
    pattern === 'longPoll' ? 'Long-poll' : pattern === 'sse' ? 'SSE stream' : 'WebSocket'

  const channelSub =
    pattern === 'longPoll'
      ? waiting
        ? 'HTTP pending…'
        : hasData
          ? 'response'
          : 'GET'
      : pattern === 'sse'
        ? waiting || hasData
          ? 'text/event-stream'
          : 'EventSource'
        : waiting || hasData
          ? 'frames'
          : 'upgrade'

  const arrowCls = [
    styles.arrow,
    open ? (duplex && hasData ? styles.arrowDuplex : styles.arrowActive) : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.stand}>
        <div className={styles.flow}>
          <LabNode
            label="Client"
            sub={pattern === 'ws' ? 'WebSocket' : pattern === 'sse' ? 'EventSource' : 'fetch'}
            state={nodeState(open && !done, done, err)}
          />
          <span className={arrowCls}>{duplex ? '↔' : '→'}</span>
          <LabNode
            label="Channel"
            sub={channelSub}
            state={nodeState(waiting || hasData, done && !err, err)}
          />
          <span className={arrowCls}>{duplex ? '↔' : '→'}</span>
          <LabNode
            label="Server"
            sub="realtime-lab"
            state={nodeState(waiting || (hasData && !done), done, err)}
          />
        </div>
        <ul className={styles.feed} aria-live="polite">
          {feed.length === 0 ? (
            <li className={styles.feedEmpty}>нет кадров</li>
          ) : (
            feed.map((item) => (
              <li key={item.id} className={styles.feedItem}>
                <span className={styles.feedTag}>{item.tag}</span>
                <span className={styles.feedBody}>{item.body}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </LabVizPanel>
  )
}

export function NetworkLongPollingWsSseLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('longPoll')
  const [caseId, setCaseId] = useState<CaseId>('event')
  const [phase, setPhase] = useState<Phase>('idle')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [meta, setMeta] = useState('ожидание')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const feedN = useRef(0)
  const runId = useRef(0)

  const pushFeed = (tag: string, body: string) => {
    feedN.current += 1
    const id = `${feedN.current}`
    setFeed((prev) => [...prev, { id, tag, body }])
  }

  const tearDown = () => {
    abortRef.current?.abort()
    abortRef.current = null
    esRef.current?.close()
    esRef.current = null
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onerror = null
      wsRef.current.onclose = null
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }

  useEffect(() => () => tearDown(), [])

  const resetViz = () => {
    setPhase('idle')
    setFeed([])
    feedN.current = 0
    setMeta('ожидание')
    setHint(null)
  }

  const selectPattern = (next: Pattern) => {
    tearDown()
    runId.current += 1
    setBusy(false)
    setPattern(next)
    setCaseId(CASES[next][0]!.id)
    clear()
    resetViz()
  }

  const selectCase = (next: CaseId) => {
    tearDown()
    runId.current += 1
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const runLongPoll = async () => {
    const id = ++runId.current
    const mode = caseId === 'timeout' ? 'timeout' : 'event'
    const ac = new AbortController()
    abortRef.current = ac
    setPhase('open')
    setMeta(`GET …/long-poll?mode=${mode}`)
    setPhase('wait')

    try {
      const res = await fetch(apiUrl(`/api/lab/realtime/long-poll?mode=${mode}`), {
        headers: { Accept: 'application/json' },
        signal: ac.signal,
      })
      if (id !== runId.current) return
      const body = (await res.json()) as {
        events?: unknown[]
        reason?: string
        heldMs?: number
      }
      setPhase('data')
      const held = body.heldMs ?? '—'
      if (mode === 'timeout') {
        pushFeed('timeout', `events: [] · held ${held}ms`)
        setMeta(`200 · timeout · ${held}ms`)
        log('warn', `long-poll timeout · held ${held}ms`)
        setHint('пустой ответ — цикл откроет следующий GET')
      } else {
        pushFeed('event', JSON.stringify(body.events?.[0] ?? body))
        setMeta(`200 · event · held ${held}ms`)
        log('ok', `long-poll event · held ${held}ms`)
        setHint('событие пришло после hold, не коротким polling')
      }
      setPhase('done')
    } catch (e) {
      if (ac.signal.aborted || id !== runId.current) return
      const msg = e instanceof Error ? e.message : String(e)
      setPhase('err')
      setMeta('ошибка сети')
      log('err', msg)
      setHint('API недоступен — поднимите assessment-server')
    } finally {
      if (id === runId.current) setBusy(false)
    }
  }

  const runSse = () => {
    const id = ++runId.current
    const mode = caseId === 'drop' ? 'drop' : 'stream'
    const url = apiUrl(`/api/lab/realtime/sse?mode=${mode}`)
    setPhase('open')
    setMeta(`EventSource · mode=${mode}`)

    const es = new EventSource(url)
    esRef.current = es
    let got = 0
    let finished = false

    const finishOk = (hintText: string, logMsg: string) => {
      if (finished || id !== runId.current) return
      finished = true
      setPhase('done')
      log(mode === 'drop' ? 'warn' : 'ok', logMsg)
      setHint(hintText)
      setBusy(false)
      es.close()
      esRef.current = null
    }

    es.addEventListener('open', () => {
      if (id !== runId.current) return
      setPhase('wait')
      setMeta('stream open')
    })

    const onPayload = (tag: string, data: string) => {
      if (id !== runId.current) return
      got += 1
      setPhase('data')
      pushFeed(tag, data)
      setMeta(`${tag} · #${got}`)
      if (tag === 'done' || (mode === 'drop' && tag === 'ping')) {
        finishOk(
          mode === 'drop' ? 'поток оборван после одного кадра' : 'три tick и done в одном ответе',
          mode === 'drop' ? 'sse drop after ping' : `sse stream · ${got} frames`,
        )
      }
    }

    es.addEventListener('tick', (e) => onPayload('tick', String((e as MessageEvent).data)))
    es.addEventListener('ping', (e) => onPayload('ping', String((e as MessageEvent).data)))
    es.addEventListener('done', (e) => onPayload('done', String((e as MessageEvent).data)))
    es.onmessage = (e) => onPayload('message', String(e.data))

    es.onerror = () => {
      if (id !== runId.current || finished) return
      if (mode === 'drop' && got > 0) {
        finishOk('поток оборван — EventSource ушёл бы в reconnect', 'sse connection closed')
        return
      }
      if (got === 0) {
        finished = true
        setPhase('err')
        setMeta('SSE error')
        log('err', 'EventSource failed')
        setHint('API недоступен или CORS/прокси режет stream')
        setBusy(false)
        es.close()
        esRef.current = null
      }
    }
  }

  const runWs = () => {
    const id = ++runId.current
    const mode = caseId === 'push' ? 'push' : 'echo'
    const url = apiWsUrl(`/api/lab/realtime/ws?mode=${mode}`)
    setPhase('open')
    setMeta(`WS · mode=${mode}`)

    const ws = new WebSocket(url)
    wsRef.current = ws
    let finished = false

    const finish = (ok: boolean, hintText: string, logMsg: string) => {
      if (finished || id !== runId.current) return
      finished = true
      setPhase(ok ? 'done' : 'err')
      log(ok ? 'ok' : 'err', logMsg)
      setHint(hintText)
      setBusy(false)
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      wsRef.current = null
    }

    ws.onopen = () => {
      if (id !== runId.current) return
      setPhase('wait')
      setMeta('OPEN')
      if (mode === 'echo') {
        ws.send(JSON.stringify({ type: 'ping', from: 'lab' }))
        pushFeed('send', '{"type":"ping"}')
      }
    }

    ws.onmessage = (e) => {
      if (id !== runId.current) return
      setPhase('data')
      const text = String(e.data)
      let tag = 'msg'
      try {
        const parsed = JSON.parse(text) as { type?: string }
        tag = parsed.type ?? 'msg'
      } catch {
        /* raw */
      }
      pushFeed(tag, text)
      setMeta(`← ${tag}`)
      if (mode === 'echo' && tag === 'echo') {
        finish(true, 'клиент → сервер → echo на том же сокете', 'ws echo ok')
      }
      if (mode === 'push' && tag === 'done') {
        finish(true, 'сервер пушил без исходящих от клиента', 'ws server push done')
      }
    }

    ws.onerror = () => {
      if (id !== runId.current || finished) return
      finish(false, 'WebSocket не открылся — проверьте API и ws-прокси', 'ws error')
    }

    ws.onclose = () => {
      if (id !== runId.current || finished) return
      if (mode === 'push') {
        finish(true, 'сервер закрыл канал после push', 'ws closed after push')
        return
      }
      finish(false, 'сокет закрыт до echo', 'ws closed early')
    }
  }

  const run = () => {
    tearDown()
    clear()
    resetViz()
    setBusy(true)
    if (pattern === 'longPoll') void runLongPoll()
    else if (pattern === 'sse') runSse()
    else runWs()
  }

  const reset = () => {
    tearDown()
    runId.current += 1
    setBusy(false)
    clear()
    setPattern('longPoll')
    setCaseId('event')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES[pattern].map((c) => (
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
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <RealtimeViz pattern={pattern} phase={phase} feed={feed} meta={meta} />

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <PatternSwitch value={pattern} onChange={selectPattern} />
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
      title="Long-poll · SSE · WebSocket"
      lead="Живые hold HTTP, event-stream и duplex WS на assessment-api."
      problem={problem}
      code={code}
    />
  )
}
