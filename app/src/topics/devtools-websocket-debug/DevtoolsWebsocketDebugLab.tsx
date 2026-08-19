import { useEffect, useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import { useLabLog } from '../../components/lab/useLabLog'
import { apiWsUrl } from '../../lib/apiBase'
import styles from './DevtoolsWebsocketDebugLab.module.css'

const TOPIC_ID = '267-devtools-websocket-debug'

type CaseId = 'inspect' | 'auth' | 'idle'
type Conn = 'closed' | 'connecting' | 'open'
type FeedItem = { id: string; tag: string; body: string }

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'inspect', label: 'Handshake + frames' },
  { id: 'auth', label: 'Auth close' },
  { id: 'idle', label: 'Heartbeat' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  inspect: (
    <>
      Открываем живой канал, шлём кадр <code>subscribe</code> и смотрим реальную цепочку{' '}
      <code>ready → subscribed → presence:update</code>.
    </>
  ),
  auth: (
    <>
      Сервер отвечает <code>auth_error</code> и закрывает сокет кодом <code>4401</code>, чтобы это
      было видно в браузерных кадрах и в событии <code>close</code>.
    </>
  ),
  idle: (
    <>
      Без heartbeat канал сам умирает по <code>idle_timeout</code>; с <code>ping</code> приходит{' '}
      <code>pong</code> и таймер продлевается.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  inspect:
    'Живой `wss`-канал: `ready`, `subscribe`, `presence:update`. Смотрите порядок кадров в `Network → WS`.',
  auth:
    '`auth_error` и `close(4401, "auth_expired")` показывают, где кончается auth и начинается reconnect.',
  idle:
    '`ping/pong` и `close(4408, "idle_timeout")` помогают отлаживать heartbeat и таймауты прокси.',
}

const SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  inspect: [
    {
      id: 'inspect-client',
      label: 'src/live/debugSocket.ts',
      note: 'После `open` сразу шлём первый кадр и сверяем его во вкладке `Frames`.',
      executable: false,
      languageLabel: 'ts',
      code: `const socket = new WebSocket('wss://api.example.com/api/lab/ws-debug?scenario=inspect');

socket.addEventListener('open', () => {
  socket.send(
    JSON.stringify({
      type: 'subscribe', // ← OUTGOING FRAME
      room: 'orders',
    }),
  );
});

socket.addEventListener('message', (event) => {
  const packet = JSON.parse(event.data); // ← READY / SUBSCRIBED / PRESENCE
  console.log(packet.type);
});`,
    },
    {
      id: 'inspect-route',
      label: 'server/routes/wsDebugLab.ts',
      note: 'Сервер шлёт несколько предсказуемых кадров, чтобы их было удобно читать в DevTools.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/api/lab/ws-debug', { websocket: true }, (socket, req) => {
  socket.send(JSON.stringify({ type: 'ready', scenario: 'inspect' }));

  socket.on('message', (raw) => {
    const packet = JSON.parse(String(raw));
    if (packet.type === 'subscribe') {
      socket.send(JSON.stringify({ type: 'subscribed', traceId: 'dbg-sub-1' }));
      socket.send(JSON.stringify({ type: 'presence:update', users: [{ id: 'u-17' }] }));
    }
  });
});`,
    },
  ],
  auth: [
    {
      id: 'auth-client',
      label: 'src/live/authSocket.ts',
      note: 'Во `Frames` видно, какой токен реально ушёл до `auth_error` и закрытия канала.',
      executable: false,
      languageLabel: 'ts',
      code: `const socket = new WebSocket('wss://api.example.com/api/lab/ws-debug?scenario=auth');

socket.addEventListener('open', () => {
  socket.send(
    JSON.stringify({
      type: 'auth', // ← AUTH FRAME
      token: 'expired-demo',
    }),
  );
});

socket.addEventListener('close', (event) => {
  console.log(event.code, event.reason); // ← 4401 / auth_expired
});`,
    },
    {
      id: 'auth-route',
      label: 'server/routes/wsDebugLab.ts',
      note: 'Сервер отдаёт и frame, и `close`, чтобы можно было проверить их порядок в отладке.',
      executable: false,
      languageLabel: 'ts',
      code: `if (packet.type !== 'auth') {
  socket.send(JSON.stringify({ type: 'auth_required' }));
  return;
}

socket.send(
  JSON.stringify({
    type: 'auth_error',
    code: 'token_expired',
  }),
);
socket.close(4401, 'auth_expired'); // ← CLOSE CODE`,
    },
  ],
  idle: [
    {
      id: 'heartbeat-client',
      label: 'src/live/heartbeatSocket.ts',
      note: 'Heartbeat проверяют по паре `ping → pong` и по последнему кадру перед обрывом.',
      executable: false,
      languageLabel: 'ts',
      code: `const socket = new WebSocket('wss://api.example.com/api/lab/ws-debug?scenario=idle');

const timer = window.setInterval(() => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'ping' })); // ← HEARTBEAT FRAME
}, 1200);

socket.addEventListener('message', (event) => {
  const packet = JSON.parse(event.data);
  if (packet.type === 'pong') console.log('alive');
});`,
    },
    {
      id: 'idle-route',
      label: 'server/routes/wsDebugLab.ts',
      note: 'Сценарий сам закрывает сокет, если браузер не прислал heartbeat вовремя.',
      executable: false,
      languageLabel: 'ts',
      code: `const armIdleTimeout = () => {
  idleTimer = setTimeout(() => {
    socket.send(JSON.stringify({ type: 'server_notice', note: 'idle timeout reached' }));
    socket.close(4408, 'idle_timeout'); // ← TIMEOUT CLOSE
  }, 1800);
};

if (packet.type === 'ping') {
  armIdleTimeout();
  socket.send(JSON.stringify({ type: 'pong', at: Date.now() }));
}`,
    },
  ],
}

function nodeState(active: boolean, done: boolean, err: boolean): LabNodeState {
  if (err && done) return 'err'
  if (done) return 'ok'
  if (active) return 'active'
  return 'idle'
}

function DebugViz({
  caseId,
  conn,
  feed,
  closeCode,
  closeReason,
  lastFrame,
}: {
  caseId: CaseId
  conn: Conn
  feed: FeedItem[]
  closeCode: number | null
  closeReason: string | null
  lastFrame: string | null
}) {
  const open = conn === 'open'
  const done = conn === 'closed' && (feed.length > 0 || closeCode != null)
  const err = closeCode != null && closeCode !== 1000
  const meta =
    caseId === 'inspect'
      ? 'Network → WS: 101, ready, subscribed, presence:update'
      : caseId === 'auth'
        ? 'Network → WS: auth_error, затем close 4401'
        : 'Network → WS: pong или close 4408'

  return (
    <LabVizPanel title="Живой WebSocket-канал" meta={meta}>
      <div className={styles.stand}>
        <div className={styles.flow}>
          <LabNode
            label="Браузер"
            sub={caseId === 'inspect' ? 'subscribe' : caseId === 'auth' ? 'auth' : 'ping'}
            state={nodeState(conn === 'connecting' || open, done && !open, err)}
          />
          <span className={`${styles.arrow} ${open ? styles.arrowActive : done ? styles.arrowOk : ''}`}>
            ↔
          </span>
          <LabNode
            label="Канал"
            sub={open ? 'OPEN' : done ? 'CLOSED' : 'upgrade'}
            state={nodeState(open, done && !err, err)}
          />
          <span className={`${styles.arrow} ${open ? styles.arrowActive : done ? styles.arrowOk : ''}`}>
            ↔
          </span>
          <LabNode
            label="API"
            sub="/api/lab/ws-debug"
            state={nodeState(conn === 'connecting' || open, done && !err, err)}
          />
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Соединение</p>
            <p className={styles.statValue}>
              <code>{conn.toUpperCase()}</code>
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Последний кадр</p>
            <p className={styles.statValue}>
              <code>{lastFrame ?? 'нет'}</code>
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Закрытие</p>
            <p className={styles.statValue}>
              <code>{closeCode != null ? `${closeCode} ${closeReason ?? ''}` : 'ещё нет'}</code>
            </p>
          </div>
        </div>

        <ul className={styles.feed} aria-live="polite">
          {feed.length === 0 ? (
            <li className={styles.feedEmpty}>кадров ещё нет</li>
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

function CaseSwitch({
  value,
  onChange,
}: {
  value: CaseId
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES.map((item) => (
        <LabButton
          key={item.id}
          variant="ghost"
          size="sm"
          active={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </LabButton>
      ))}
    </div>
  )
}

export function DevtoolsWebsocketDebugLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('inspect')
  const [conn, setConn] = useState<Conn>('closed')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [hint, setHint] = useState<ReactNode>(
    <>
      После открытия смотрите <code>101</code> в <code>Network</code>, а потом реальные кадры во{' '}
      <code>WS</code>.
    </>,
  )
  const [closeCode, setCloseCode] = useState<number | null>(null)
  const [closeReason, setCloseReason] = useState<string | null>(null)
  const [lastFrame, setLastFrame] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const seqRef = useRef(0)
  const connected = conn === 'open' || conn === 'connecting'

  useEffect(
    () => () => {
      if (!wsRef.current) return
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
    },
    [],
  )

  const pushFeed = (tag: string, body: string) => {
    seqRef.current += 1
    setFeed((prev) => [...prev, { id: `${seqRef.current}`, tag, body }])
    setLastFrame(tag)
  }

  const clearSocket = () => {
    if (!wsRef.current) return
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

  const resetState = (nextCase: CaseId = caseId) => {
    setConn('closed')
    setFeed([])
    seqRef.current = 0
    setCloseCode(null)
    setCloseReason(null)
    setLastFrame(null)
    if (nextCase === 'inspect') {
      setHint(
        <>
          После открытия смотрите <code>101</code> в <code>Network</code>, а затем кадры{' '}
          <code>ready</code> и <code>subscribe</code>.
        </>,
      )
    } else if (nextCase === 'auth') {
      setHint(
        <>
          Откройте канал и отправьте <code>auth</code>, чтобы увидеть <code>auth_error</code> рядом с{' '}
          <code>close 4401</code>.
        </>,
      )
    } else {
      setHint(
        <>
          Откройте канал и либо дождитесь <code>idle_timeout</code>, либо шлите <code>ping</code> для{' '}
          <code>pong</code>.
        </>,
      )
    }
  }

  const selectCase = (next: CaseId) => {
    clearSocket()
    clear()
    setCaseId(next)
    resetState(next)
  }

  const openConn = () => {
    if (connected) return
    clear()
    setFeed([])
    seqRef.current = 0
    setCloseCode(null)
    setCloseReason(null)
    setLastFrame(null)
    setConn('connecting')

    const ws = new WebSocket(apiWsUrl(`/api/lab/ws-debug?scenario=${caseId}`))
    wsRef.current = ws

    ws.onopen = () => {
      setConn('open')
      log('ok', `ws open · ${caseId}`)
    }

    ws.onmessage = (event) => {
      const text = String(event.data)
      let tag = 'message'
      try {
        const parsed = JSON.parse(text) as { type?: string }
        tag = parsed.type ?? 'message'
      } catch {
        /* keep raw */
      }
      pushFeed(tag, text)
      if (tag === 'ready') log('info', 'ready frame')
      if (tag === 'subscribed' || tag === 'presence:update' || tag === 'pong') log('ok', tag)
      if (tag === 'auth_error') log('warn', 'auth_error frame')
    }

    ws.onerror = () => {
      setConn('closed')
      log('err', 'WebSocket error')
      setHint(
        <>
          Канал не открылся. Для Pages и удалённого стенда нужен деплой нового роута на{' '}
          <code>assessment-api</code>.
        </>,
      )
    }

    ws.onclose = (event) => {
      setConn('closed')
      setCloseCode(event.code)
      setCloseReason(event.reason || null)
      wsRef.current = null
      log('info', `close ${event.code} ${event.reason || ''}`.trim())

      if (event.code === 4401) {
        setHint(
          <>
            Во <code>Frames</code> сначала придёт <code>auth_error</code>, а затем закрытие{' '}
            <code>4401</code>: это auth-проблема, а не handshake.
          </>,
        )
      } else if (event.code === 4408) {
        setHint(
          <>
            Смотрите на последний <code>pong</code> перед <code>idle_timeout</code>: так проще понять,
            умер ли heartbeat.
          </>,
        )
      }
    }
  }

  const sendFrame = () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const payload =
      caseId === 'inspect'
        ? { type: 'subscribe', room: 'orders' }
        : caseId === 'auth'
          ? { type: 'auth', token: 'expired-demo' }
          : { type: 'ping' }

    ws.send(JSON.stringify(payload))
    pushFeed('send', JSON.stringify(payload))
    log('info', `send ${payload.type}`)
  }

  const closeConn = () => {
    if (!wsRef.current) return
    wsRef.current.close(1000, 'manual_close')
    log('info', 'manual close')
  }

  const reset = () => {
    clearSocket()
    clear()
    resetState(caseId)
  }

  const sendLabel =
    caseId === 'inspect'
      ? 'Отправить subscribe'
      : caseId === 'auth'
        ? 'Отправить auth'
        : 'Отправить ping'

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={connected} onClick={openConn}>
          Открыть соединение
        </LabButton>
        <LabButton variant="secondary" disabled={conn !== 'open'} onClick={sendFrame}>
          {sendLabel}
        </LabButton>
        <LabButton variant="secondary" disabled={conn === 'closed'} onClick={closeConn}>
          Закрыть соединение
        </LabButton>
        <LabButton variant="ghost" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        WebSocket в браузере отлаживают по реальному каналу: сначала подтверждают{' '}
        <code>101 Switching Protocols</code> в <code>Network</code>, потом читают кадры и код
        закрытия. Лаба открывает настоящий <code>wss</code>-канал и даёт предсказуемые сценарии,
        которые можно поймать в <code>DevTools</code>.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <DebugViz
        caseId={caseId}
        conn={conn}
        feed={feed}
        closeCode={closeCode}
        closeReason={closeReason}
        lastFrame={lastFrame}
      />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <CaseSwitch value={caseId} onChange={selectCase} />
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Отладка WebSocket в браузере"
      lead="Живой `wss`-канал с `auth_error`, `pong` и `idle_timeout`: ловите их в `Network → WS` и сверяйте с кодом."
      problem={problem}
      code={code}
    />
  )
}
