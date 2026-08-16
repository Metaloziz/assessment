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

type Conn = 'closed' | 'connecting' | 'open' | 'waiting'
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
      <code>GET /api/lab/realtime/long-poll</code>; publish —{' '}
      <code>POST /api/lab/realtime/event</code>.
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
      Poll ждёт в room, пока <code>POST /event</code> не разбудит waiter — ответ с{' '}
      <code>events[]</code>.
    </>
  ),
  timeout: (
    <>
      Hold ~1.2&nbsp;s без publish: пустой <code>events</code> и <code>reason: timeout</code>.
    </>
  ),
  stream: (
    <>
      Поток живёт до «Закрыть»; <code>POST /event</code> пишет кадры в открытый SSE.
    </>
  ),
  drop: (
    <>
      После <code>hello</code>/<code>ping</code> сервер рвёт stream — сигнал к reconnect.
    </>
  ),
  echo: (
    <>
      «Отправить событие» идёт через <code>ws.send</code>; сервер отвечает{' '}
      <code>type: echo</code>.
    </>
  ),
  push: (
    <>
      «Отправить событие» — <code>POST /event</code> в room; кадр приходит в открытый сокет.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  longPoll: 'Long-poll + room hub: hold до publish или таймаута.',
  sse: 'SSE: открытый `event-stream` и publish в room.',
  ws: 'WebSocket: echo по сокету или server push через POST /event.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  longPoll: [
    {
      id: 'lp-route',
      label: 'routes/realtimeLab.ts · long-poll',
      note: 'Waiter в room; publish резолвит висящий GET.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/api/lab/realtime/long-poll', async (req, reply) => {
  const room = getRoom(req.query.room);
  if (req.query.mode === 'timeout') {
    await sleep(1200); // ← hold без publish
    return reply.send({ events: [], reason: 'timeout' });
  }
  const event = await waitForPublish(room); // ← ждёт POST /event
  return reply.send({ events: event ? [event] : [] });
});
`,
    },
    {
      id: 'lp-publish',
      label: 'client · open + publish',
      note: 'Открыть poll, затем разбудить через POST.',
      executable: false,
      languageLabel: 'ts',
      code: `const room = crypto.randomUUID();
const poll = fetch(\`/api/lab/realtime/long-poll?room=\${room}&mode=event\`);
await fetch('/api/lab/realtime/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ room, payload: { type: 'order' } }), // ← будит waiter
});
const res = await poll;
`,
    },
  ],
  sse: [
    {
      id: 'sse-route',
      label: 'routes/realtimeLab.ts · sse + event',
      note: 'Клиент в room.sse; publish пишет data:-кадр.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/api/lab/realtime/sse', (req, reply) => {
  reply.hijack();
  // Content-Type: text/event-stream
  room.sse.add({ write }); // ← держим поток
  write({ note: 'stream open' }, 'hello');
});

app.post('/api/lab/realtime/event', async (req) => {
  publishToRoom(req.body.room, req.body.payload); // ← кадр всем SSE в room
});
`,
    },
    {
      id: 'sse-client',
      label: 'client · EventSource',
      note: 'Открыть поток, слушать event, закрыть вручную.',
      executable: false,
      languageLabel: 'ts',
      code: `const es = new EventSource(\`/api/lab/realtime/sse?room=\${room}&mode=stream\`);
es.addEventListener('event', (e) => {
  console.log(JSON.parse(e.data)); // ← server → client
});
es.close(); // ← Закрыть соединение
`,
    },
  ],
  ws: [
    {
      id: 'ws-route',
      label: 'routes/realtimeLab.ts · ws',
      note: 'Echo по message; push — через publish в room.ws.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/api/lab/realtime/ws', { websocket: true }, (socket, req) => {
  room.ws.add(socket);
  socket.on('message', (raw) => {
    socket.send(JSON.stringify({ type: 'echo', got: JSON.parse(String(raw)) })); // ← duplex
  });
});
// POST /event → socket.send({ type: 'event', … }) для mode=push
`,
    },
    {
      id: 'ws-client',
      label: 'client · open / send / close',
      note: 'Управление живым сокетом.',
      executable: false,
      languageLabel: 'ts',
      code: `const ws = new WebSocket(\`wss://…/ws?room=\${room}&mode=echo\`);
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'ping' })); // ← Отправить событие
});
ws.close(); // ← Закрыть соединение
`,
    },
  ],
}

function newRoomId() {
  return crypto.randomUUID()
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
  const live = phase === 'wait' || phase === 'data' || phase === 'open'

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
        ? live
          ? 'text/event-stream'
          : 'EventSource'
        : live
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
            state={nodeState(live, done && !live, err)}
          />
          <span className={arrowCls}>{duplex ? '↔' : '→'}</span>
          <LabNode
            label="Channel"
            sub={channelSub}
            state={nodeState(waiting || hasData || live, done && !err && !live, err)}
          />
          <span className={arrowCls}>{duplex ? '↔' : '→'}</span>
          <LabNode
            label="Server"
            sub="realtime-lab"
            state={nodeState(waiting || live, done && !live, err)}
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
  const [conn, setConn] = useState<Conn>('closed')
  const [phase, setPhase] = useState<Phase>('idle')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [meta, setMeta] = useState('ожидание')
  const [hint, setHint] = useState<string | null>(null)

  const roomRef = useRef(newRoomId())
  const abortRef = useRef<AbortController | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const feedN = useRef(0)
  const sessionRef = useRef(0)

  const connected = conn === 'open' || conn === 'waiting' || conn === 'connecting'
  const canOpen = conn === 'closed'
  const canSend =
    (pattern === 'longPoll' && conn === 'waiting' && caseId === 'event') ||
    (pattern === 'sse' && conn === 'open' && caseId === 'stream') ||
    (pattern === 'ws' && conn === 'open')
  const canClose = connected

  const pushFeed = (tag: string, body: string) => {
    feedN.current += 1
    const id = `${feedN.current}`
    setFeed((prev) => [...prev, { id, tag, body }])
  }

  const tearDown = () => {
    abortRef.current?.abort()
    abortRef.current = null
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
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
    setConn('closed')
  }

  const bumpSession = () => {
    sessionRef.current += 1
    return sessionRef.current
  }

  const selectPattern = (next: Pattern) => {
    tearDown()
    bumpSession()
    roomRef.current = newRoomId()
    setPattern(next)
    setCaseId(CASES[next][0]!.id)
    clear()
    resetViz()
  }

  const selectCase = (next: CaseId) => {
    tearDown()
    bumpSession()
    roomRef.current = newRoomId()
    setCaseId(next)
    clear()
    resetViz()
  }

  const openLongPoll = async () => {
    const sid = bumpSession()
    const mode = caseId === 'timeout' ? 'timeout' : 'event'
    const room = roomRef.current
    const ac = new AbortController()
    abortRef.current = ac
    setConn('connecting')
    setPhase('open')
    setMeta(`GET long-poll · ${mode}`)
    setConn('waiting')
    setPhase('wait')
    log('info', `long-poll open · room ${room.slice(0, 8)}…`)

    try {
      const res = await fetch(
        apiUrl(`/api/lab/realtime/long-poll?room=${encodeURIComponent(room)}&mode=${mode}`),
        { headers: { Accept: 'application/json' }, signal: ac.signal },
      )
      if (sid !== sessionRef.current) return
      const body = (await res.json()) as {
        events?: unknown[]
        reason?: string
        heldMs?: number
      }
      setPhase('data')
      const held = body.heldMs ?? '—'
      if (mode === 'timeout' || body.reason === 'timeout') {
        pushFeed('timeout', `events: [] · held ${held}ms`)
        setMeta(`200 · timeout · ${held}ms`)
        log('warn', `timeout · held ${held}ms`)
        setHint('hold без события — следующий цикл снова Открыть')
      } else if (body.events?.length) {
        pushFeed('event', JSON.stringify(body.events[0]))
        setMeta(`200 · event · held ${held}ms`)
        log('ok', `event · held ${held}ms`)
        setHint('publish разбудил висящий GET')
      } else {
        pushFeed('idle', body.reason ?? 'empty')
        setMeta(`200 · ${body.reason ?? 'empty'}`)
        log('warn', body.reason ?? 'empty')
        setHint('poll закрыт без события')
      }
      setPhase('done')
      setConn('closed')
      abortRef.current = null
    } catch (e) {
      if (ac.signal.aborted || sid !== sessionRef.current) {
        if (sid === sessionRef.current) {
          setConn('closed')
          setPhase('idle')
          setMeta('закрыто')
          log('info', 'long-poll aborted')
        }
        return
      }
      const msg = e instanceof Error ? e.message : String(e)
      setPhase('err')
      setConn('closed')
      setMeta('ошибка сети')
      log('err', msg)
      setHint('API недоступен — поднимите assessment-server')
    }
  }

  const openSse = () => {
    const sid = bumpSession()
    const mode = caseId === 'drop' ? 'drop' : 'stream'
    const room = roomRef.current
    const url = apiUrl(
      `/api/lab/realtime/sse?room=${encodeURIComponent(room)}&mode=${mode}`,
    )
    setConn('connecting')
    setPhase('open')
    setMeta(`EventSource · ${mode}`)

    const es = new EventSource(url)
    esRef.current = es
    let got = 0

    es.addEventListener('open', () => {
      if (sid !== sessionRef.current) return
      setConn(mode === 'drop' ? 'connecting' : 'open')
      setPhase('wait')
      setMeta('stream open')
      log('ok', `sse open · ${mode}`)
    })

    const onPayload = (tag: string, data: string) => {
      if (sid !== sessionRef.current) return
      got += 1
      setPhase('data')
      pushFeed(tag, data)
      setMeta(`${tag} · #${got}`)
      if (mode === 'stream' && tag !== 'hello') {
        setConn('open')
        setHint('кадр в живом потоке')
      }
      if (mode === 'drop' && (tag === 'ping' || tag === 'hello')) {
        /* wait for close */
      }
    }

    es.addEventListener('hello', (e) => onPayload('hello', String((e as MessageEvent).data)))
    es.addEventListener('event', (e) => onPayload('event', String((e as MessageEvent).data)))
    es.addEventListener('ping', (e) => onPayload('ping', String((e as MessageEvent).data)))
    es.addEventListener('tick', (e) => onPayload('tick', String((e as MessageEvent).data)))
    es.onmessage = (e) => onPayload('message', String(e.data))

    es.onerror = () => {
      if (sid !== sessionRef.current) return
      if (mode === 'drop') {
        setPhase('done')
        setConn('closed')
        setMeta('stream dropped')
        log('warn', 'sse drop / close')
        setHint('поток оборван — типичный сигнал к reconnect')
        es.close()
        esRef.current = null
        return
      }
      if (got === 0) {
        setPhase('err')
        setConn('closed')
        setMeta('SSE error')
        log('err', 'EventSource failed')
        setHint('API недоступен или CORS/прокси режет stream')
        es.close()
        esRef.current = null
      }
    }
  }

  const openWs = () => {
    const sid = bumpSession()
    const mode = caseId === 'push' ? 'push' : 'echo'
    const room = roomRef.current
    const url = apiWsUrl(
      `/api/lab/realtime/ws?room=${encodeURIComponent(room)}&mode=${mode}`,
    )
    setConn('connecting')
    setPhase('open')
    setMeta(`WS · ${mode}`)

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (sid !== sessionRef.current) return
      setConn('open')
      setPhase('wait')
      setMeta('OPEN')
      log('ok', `ws open · ${mode}`)
      setHint(mode === 'echo' ? 'можно слать по сокету' : 'publish через POST /event')
    }

    ws.onmessage = (e) => {
      if (sid !== sessionRef.current) return
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
      if (tag === 'echo' || tag === 'event') {
        setHint(tag === 'echo' ? 'echo на том же сокете' : 'server push в room')
        log('ok', tag)
      }
    }

    ws.onerror = () => {
      if (sid !== sessionRef.current) return
      setPhase('err')
      setConn('closed')
      setMeta('ws error')
      log('err', 'WebSocket error')
      setHint('проверьте API и ws-прокси')
    }

    ws.onclose = () => {
      if (sid !== sessionRef.current) return
      setConn('closed')
      setPhase((prev) => (prev === 'err' ? prev : 'done'))
      setMeta('CLOSED')
      log('info', 'ws closed')
      wsRef.current = null
    }
  }

  const openConn = () => {
    if (!canOpen) return
    clear()
    setFeed([])
    feedN.current = 0
    setHint(null)
    if (pattern === 'longPoll') void openLongPoll()
    else if (pattern === 'sse') openSse()
    else openWs()
  }

  const sendEvent = async () => {
    if (!canSend) return
    const room = roomRef.current

    if (pattern === 'ws' && caseId === 'echo') {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      const payload = { type: 'ping', from: 'lab', n: feedN.current + 1 }
      ws.send(JSON.stringify(payload))
      pushFeed('send', JSON.stringify(payload))
      setMeta('→ ping')
      log('info', 'ws.send ping')
      return
    }

    try {
      const res = await fetch(apiUrl('/api/lab/realtime/event'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room,
          payload: { type: 'lab', note: 'manual event', via: pattern },
        }),
      })
      const body = (await res.json()) as {
        ok?: boolean
        delivered?: { longPoll?: number; sse?: number; ws?: number }
        id?: number
      }
      if (!res.ok || !body.ok) {
        log('err', `publish ${res.status}`)
        setHint('publish не принят')
        return
      }
      const d = body.delivered
      log(
        'ok',
        `publish #${body.id ?? '—'} · lp ${d?.longPoll ?? 0} / sse ${d?.sse ?? 0} / ws ${d?.ws ?? 0}`,
      )
      if (pattern === 'longPoll') {
        setMeta('publish → waiter')
      } else if (pattern === 'sse') {
        setMeta('publish → stream')
      } else {
        setMeta('publish → socket')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setHint('API недоступен')
    }
  }

  const closeConn = () => {
    if (!canClose) return
    const sid = bumpSession()
    tearDown()
    if (sid) {
      setConn('closed')
      setPhase('done')
      setMeta('закрыто')
      log('info', 'connection closed')
      setHint('канал закрыт вручную')
    }
  }

  const reset = () => {
    tearDown()
    bumpSession()
    roomRef.current = newRoomId()
    clear()
    setPattern('longPoll')
    setCaseId('event')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={connected} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES[pattern].map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={connected}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={!canOpen} onClick={openConn}>
          Открыть соединение
        </LabButton>
        <LabButton variant="secondary" disabled={!canSend} onClick={() => void sendEvent()}>
          Отправить событие
        </LabButton>
        <LabButton variant="secondary" disabled={!canClose} onClick={closeConn}>
          Закрыть соединение
        </LabButton>
        <LabButton variant="ghost" onClick={reset}>
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
      lead="Управление живым соединением: open / publish / close на assessment-api."
      problem={problem}
      code={code}
    />
  )
}
