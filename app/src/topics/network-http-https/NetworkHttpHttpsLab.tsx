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
import { LabNode, LabVizPanel, labVizStyles, type LabNodeState } from '../../components/lab/LabViz'
import { apiUrl } from '../../lib/apiBase'
import styles from './NetworkHttpHttpsLab.module.css'

const TOPIC_ID = '250-network-http-https'
const STEP = 0.55

type Pattern = 'http' | 'http2' | 'https'
type HttpCase = 'getOk' | 'postCreated' | 'notFound'
type H2Case = 'hol' | 'mux'
type TlsCase = 'plain' | 'tls'
type CaseId = HttpCase | H2Case | TlsCase

type HttpPhase = 'idle' | 'client' | 'request' | 'server' | 'done'
type H2Phase = 'idle' | 'a' | 'b' | 'done'
type TlsPhase = 'idle' | 'tcp' | 'wrap' | 'done'

type LiveHttp = {
  method: string
  status: number
  path: string
  cacheControl: string | null
  contentType: string | null
  ok: boolean
  summary: string
}

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'http', label: 'HTTP' },
  { id: 'http2', label: 'HTTP/2' },
  { id: 'https', label: 'HTTPS' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  http: [
    { id: 'getOk', label: 'GET 200' },
    { id: 'postCreated', label: 'POST 201' },
    { id: 'notFound', label: 'GET 404' },
  ],
  http2: [
    { id: 'hol', label: 'HTTP/1.1 очередь' },
    { id: 'mux', label: 'h2 мультиплекс' },
  ],
  https: [
    { id: 'plain', label: 'без TLS' },
    { id: 'tls', label: 'поверх TLS' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  http: (
    <>
      Клиент и сервер договариваются через метод, статус и заголовки. Живой{' '}
      <code>fetch</code> к <code>/api/http-lab/*</code> показывает реальный ответ API.
    </>
  ),
  http2: (
    <>
      Семантика HTTP та же, меняется доставка: в HTTP/1.1 ответы на соединении ждут друг друга;
      в HTTP/2 потоки идут параллельно по одному TCP.
    </>
  ),
  https: (
    <>
      HTTPS — HTTP поверх TLS: шифрование и проверка сертификата. Без TLS заголовки и тело видны
      в сети; <code>Secure</code>-cookie и «замочек» опираются на TLS.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  getOk: (
    <>
      Живой <code>GET /api/http-lab/item</code> — статус <code>200</code> и{' '}
      <code>Cache-Control</code>.
    </>
  ),
  postCreated: (
    <>
      Живой <code>POST /api/http-lab/item</code> — <code>201 Created</code> и тело с{' '}
      <code>id</code>.
    </>
  ),
  notFound: (
    <>
      Живой <code>GET /api/http-lab/missing</code> — класс <code>4xx</code> (
      <code>404</code>), не сбой сети.
    </>
  ),
  hol: (
    <>
      Одно соединение HTTP/1.1: длинный ответ A блокирует B и C (head-of-line).
    </>
  ),
  mux: (
    <>
      HTTP/2: кадры потоков перемешаны — короткий ответ не ждёт длинный на соседнем stream.
    </>
  ),
  plain: (
    <>
      HTTP без TLS: стартовая строка и заголовки идут открытым текстом по TCP.
    </>
  ),
  tls: (
    <>
      Сначала рукопожатие TLS и сертификат, затем те же HTTP-сообщения уже в защищённом канале.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  http: 'Учебные роуты `/api/http-lab/*`: метод, статус и заголовки ответа.',
  http2: 'Метафора доставки: очередь HTTP/1.1 vs мультиплекс потоков HTTP/2.',
  https: 'Стек канала: HTTP-сообщения поверх TLS поверх TCP.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  http: [
    {
      id: 'http-lab-routes',
      label: 'server/src/routes/httpLab.ts',
      note: 'GET 200, POST 201, GET 404 — живые статусы и заголовки.',
      executable: false,
      languageLabel: 'ts',
      code: `app.get('/api/http-lab/item', async (_req, reply) => {
  reply.header('Cache-Control', 'private, max-age=60'); // ← ответный заголовок
  return reply.status(200).send({ ok: true, method: 'GET', status: 200 });
});

app.post('/api/http-lab/item', async (req, reply) => {
  reply.header('Location', '/api/http-lab/item/1');
  return reply.status(201).send({ ok: true, id: 1 }); // ← Created
});

app.get('/api/http-lab/missing', async (_req, reply) => {
  return reply.status(404).send({ ok: false, error: 'not_found' }); // ← 4xx
});`,
    },
    {
      id: 'client-fetch',
      label: 'lab/fetchHttpLab.ts',
      note: 'Клиент читает status и Cache-Control из реального ответа.',
      executable: false,
      languageLabel: 'ts',
      code: `const res = await fetch('/api/http-lab/item');
const cache = res.headers.get('Cache-Control'); // ← метаданные ответа
const body = await res.json();

// res.status === 200
// cache === 'private, max-age=60'
return { status: res.status, cache, body };`,
    },
  ],
  http2: [
    {
      id: 'h2-hol',
      label: 'notes/http1-hol.txt',
      note: 'HTTP/1.1: на одном соединении ответы выстраиваются в очередь.',
      executable: false,
      languageLabel: 'text',
      code: `HTTP/1.1 · одно TCP-соединение
  req A (большой файл)  ──►  …ждём ответ A…
  req B (CSS)           ──►  ждёт A          ← HOL
  req C (JSON)          ──►  ждёт A и B`,
    },
    {
      id: 'h2-mux',
      label: 'notes/http2-mux.txt',
      note: 'HTTP/2: бинарные фреймы, несколько streams сразу.',
      executable: false,
      languageLabel: 'text',
      code: `HTTP/2 · одно TCP, несколько streams
  stream 1: HTML  ████░░░░
  stream 3: CSS   ███░░░░░   ← кадры перемешаны
  stream 5: JSON  ██░░░░░░

// Protocol в DevTools: h2 (часто после ALPN в TLS)`,
    },
  ],
  https: [
    {
      id: 'tls-stack',
      label: 'notes/https-stack.txt',
      note: 'HTTPS = HTTP messages внутри TLS handshake.',
      executable: false,
      languageLabel: 'text',
      code: `[ HTTP request / response ]
[ TLS  · handshake · certificate · encrypt ]  ← слой HTTPS
[ TCP ]
[ IP ]

// cookie Secure → только по HTTPS
// без TLS: Authorization и тело видны снифферу`,
    },
    {
      id: 'tls-fetch',
      label: 'lab/secureContext.ts',
      note: 'В браузере HTTPS — secure context; localhost — исключение для DX.',
      executable: false,
      languageLabel: 'ts',
      code: `// production
fetch('https://api.example.com/item', {
  headers: { Authorization: 'Bearer …' }, // ← канал шифрует TLS
});

// DevTools → Security: сертификат + протокол (часто h2 поверх TLS)`,
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
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.5, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
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

async function fetchHttpLive(caseId: HttpCase): Promise<LiveHttp> {
  if (caseId === 'getOk') {
    const res = await fetch(apiUrl('/api/http-lab/item'), {
      headers: { Accept: 'application/json' },
    })
    const cacheControl = res.headers.get('Cache-Control')
    const contentType = res.headers.get('Content-Type')
    await res.json().catch(() => null)
    return {
      method: 'GET',
      status: res.status,
      path: '/api/http-lab/item',
      cacheControl,
      contentType,
      ok: res.status === 200,
      summary: `GET ${res.status} · Cache-Control: ${cacheControl ?? '—'}`,
    }
  }

  if (caseId === 'postCreated') {
    const res = await fetch(apiUrl('/api/http-lab/item'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note: 'http-lab' }),
    })
    const contentType = res.headers.get('Content-Type')
    const body = (await res.json().catch(() => null)) as { id?: number } | null
    return {
      method: 'POST',
      status: res.status,
      path: '/api/http-lab/item',
      cacheControl: null,
      contentType,
      ok: res.status === 201,
      summary: `POST ${res.status} · id ${body?.id ?? '—'}`,
    }
  }

  const res = await fetch(apiUrl('/api/http-lab/missing'), {
    headers: { Accept: 'application/json' },
  })
  await res.json().catch(() => null)
  return {
    method: 'GET',
    status: res.status,
    path: '/api/http-lab/missing',
    cacheControl: null,
    contentType: res.headers.get('Content-Type'),
    ok: res.status === 404,
    summary: `GET ${res.status} · not_found`,
  }
}

function HttpViz({
  phase,
  caseId,
  live,
}: {
  phase: HttpPhase
  caseId: HttpCase
  live: LiveHttp | null
}) {
  const method =
    live?.method ??
    (caseId === 'postCreated' ? 'POST' : 'GET')
  const path =
    live?.path ??
    (caseId === 'notFound' ? '/api/http-lab/missing' : '/api/http-lab/item')
  const expectStatus =
    caseId === 'getOk' ? 200 : caseId === 'postCreated' ? 201 : 404

  const clientState: LabNodeState =
    phase === 'idle' ? 'idle' : phase === 'done' ? (live?.ok ? 'ok' : 'err') : 'active'
  const reqState: LabNodeState =
    phase === 'request' || phase === 'server'
      ? 'active'
      : phase === 'done'
        ? 'ok'
        : 'idle'
  const srvState: LabNodeState =
    phase === 'server' ? 'active' : phase === 'done' ? (live?.ok ? 'ok' : 'err') : 'idle'
  const resState: LabNodeState =
    phase === 'done' ? (live?.ok ? 'ok' : 'err') : 'idle'

  const meta =
    phase === 'done' && live
      ? live.summary
      : phase === 'idle'
        ? 'ожидание'
        : `${method} …`

  const arrow = (on: boolean, err = false) =>
    `${styles.arrow}${err ? ` ${styles.arrowErr}` : on ? ` ${styles.arrowActive}` : ''}`

  return (
    <LabVizPanel title="HTTP сообщение" meta={meta}>
      <div className={styles.flow}>
        <LabNode label="Client" sub="fetch" state={clientState} />
        <span className={arrow(phase !== 'idle', phase === 'done' && !live?.ok)}>→</span>
        <LabNode
          label="Request"
          sub={`${method} ${path.replace('/api/http-lab/', '…/')}`}
          state={reqState}
        />
        <span className={arrow(phase === 'request' || phase === 'server' || phase === 'done')}>
          →
        </span>
        <LabNode label="Server" sub="http-lab" state={srvState} />
        <span
          className={arrow(
            phase === 'done',
            phase === 'done' && live != null && !live.ok && caseId !== 'notFound',
          )}
        >
          {phase === 'done' && live && !live.ok && caseId !== 'notFound' ? '✗' : '→'}
        </span>
        <LabNode
          label="Response"
          sub={
            phase === 'done' && live
              ? `${live.status}${live.cacheControl ? ` · cache` : ''}`
              : `${expectStatus}?`
          }
          state={resState}
        />
      </div>
    </LabVizPanel>
  )
}

function H2Viz({
  phase,
  caseId,
  focusRef,
}: {
  phase: H2Phase
  caseId: H2Case
  focusRef: MutableRefObject<HTMLDivElement | null>
}) {
  const mux = caseId === 'mux'
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const done = phase === 'done'

  const barCls = (lane: 1 | 2 | 3, kind: 'wide' | 'mid' | 'short') => {
    const size =
      kind === 'wide' ? styles.h2BarWide : kind === 'mid' ? styles.h2BarMid : styles.h2BarShort
    if (!aOn) return `${styles.h2Bar} ${size}`
    if (mux) {
      if (!bOn) return `${styles.h2Bar} ${size} ${styles.h2BarActive}`
      return `${styles.h2Bar} ${size} ${styles.h2BarOk}`
    }
    // HOL: lane 1 goes first; 2 and 3 wait until done
    if (lane === 1) {
      if (done) return `${styles.h2Bar} ${size} ${styles.h2BarOk}`
      return `${styles.h2Bar} ${size} ${styles.h2BarActive}`
    }
    if (!done && aOn) return `${styles.h2Bar} ${size} ${styles.h2BarWait}`
    if (done && bOn) return `${styles.h2Bar} ${size} ${styles.h2BarBlocked}`
    return `${styles.h2Bar} ${size}`
  }

  return (
    <LabVizPanel
      title={mux ? 'HTTP/2 streams' : 'HTTP/1.1 очередь'}
      meta={mux ? 'мультиплекс на одном TCP' : 'head-of-line blocking'}
    >
      <div className={styles.h2Layout} ref={focusRef}>
        <div
          className={[
            labVizStyles.node,
            aOn && !done ? labVizStyles.nodeActive : '',
            done ? labVizStyles.nodeOk : '',
            styles.h2Conn,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={labVizStyles.nodeLabel}>TCP connection</span>
          <span className={labVizStyles.nodeSub}>{mux ? 'h2 framing' : 'HTTP/1.1 text'}</span>
        </div>
        <div className={styles.h2Lanes}>
          <div className={styles.h2Lane}>
            <span className={styles.h2LaneLabel}>{mux ? 'stream 1' : 'req A'}</span>
            <div className={styles.h2Bars}>
              <div className={barCls(1, 'wide')} />
            </div>
          </div>
          <div className={styles.h2Lane}>
            <span className={styles.h2LaneLabel}>{mux ? 'stream 3' : 'req B'}</span>
            <div className={styles.h2Bars}>
              <div className={barCls(2, 'mid')} />
            </div>
          </div>
          <div className={styles.h2Lane}>
            <span className={styles.h2LaneLabel}>{mux ? 'stream 5' : 'req C'}</span>
            <div className={styles.h2Bars}>
              <div className={barCls(3, 'short')} />
            </div>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function TlsViz({
  phase,
  caseId,
  focusRef,
}: {
  phase: TlsPhase
  caseId: TlsCase
  focusRef: MutableRefObject<HTMLDivElement | null>
}) {
  const secure = caseId === 'tls'
  const tcpOn = phase !== 'idle'
  const wrapOn = phase === 'wrap' || phase === 'done'
  const done = phase === 'done'
  const plainRisk = !secure && done

  return (
    <LabVizPanel
      title={secure ? 'HTTPS канал' : 'HTTP без TLS'}
      meta={secure ? 'encrypt + certificate' : 'открытый текст'}
    >
      <div className={styles.tlsStack} ref={focusRef}>
        <div
          className={[
            labVizStyles.node,
            styles.tlsLayer,
            wrapOn && secure ? labVizStyles.nodeActive : '',
            done && secure ? labVizStyles.nodeOk : '',
            plainRisk ? styles.tlsWarn : '',
            !wrapOn ? styles.tlsDim : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={labVizStyles.nodeLabel}>HTTP messages</span>
          <span className={labVizStyles.nodeSub}>
            {done ? (secure ? 'в TLS record' : 'открытый текст') : 'метод · заголовки · тело'}
          </span>
        </div>
        <div
          className={[
            labVizStyles.node,
            styles.tlsLayer,
            wrapOn && secure ? labVizStyles.nodeActive : '',
            done && secure ? labVizStyles.nodeOk : '',
            !secure ? styles.tlsDim : '',
            plainRisk ? styles.tlsDim : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={labVizStyles.nodeLabel}>TLS</span>
          <span className={labVizStyles.nodeSub}>
            {secure
              ? wrapOn
                ? done
                  ? 'handshake ok'
                  : 'handshake…'
                : 'ожидание'
              : 'нет слоя'}
          </span>
        </div>
        <div
          className={[
            labVizStyles.node,
            styles.tlsLayer,
            tcpOn && !done ? labVizStyles.nodeActive : '',
            done ? labVizStyles.nodeOk : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={labVizStyles.nodeLabel}>TCP</span>
          <span className={labVizStyles.nodeSub}>{tcpOn ? 'connected' : '…'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function NetworkHttpHttpsLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('http')
  const [caseId, setCaseId] = useState<CaseId>('getOk')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [httpPhase, setHttpPhase] = useState<HttpPhase>('idle')
  const [h2Phase, setH2Phase] = useState<H2Phase>('idle')
  const [tlsPhase, setTlsPhase] = useState<TlsPhase>('idle')
  const [live, setLive] = useState<LiveHttp | null>(null)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const h2Ref = useRef<HTMLDivElement | null>(null)
  const tlsRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setHttpPhase('idle')
    setH2Phase('idle')
    setTlsPhase('idle')
    setHint(null)
    setLive(null)
    for (const el of [h2Ref.current, tlsRef.current]) {
      if (el) gsap.set(el, { clearProps: 'transform,opacity' })
    }
  }

  const selectPattern = (next: Pattern) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
    setCaseId(CASES[next][0]!.id)
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

  const runHttp = async () => {
    clear()
    resetViz()
    setBusy(true)
    setHttpPhase('client')
    const httpCase = caseId as HttpCase

    try {
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 220))
      setHttpPhase('request')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 180))
      setHttpPhase('server')

      const payload = await fetchHttpLive(httpCase)
      setLive(payload)
      setHttpPhase('done')

      if (httpCase === 'notFound') {
        log('warn', payload.summary)
        setHint('404 — ошибка клиента по статусу, fetch не «упал» как сеть')
      } else if (payload.ok) {
        log('ok', payload.summary)
        setHint(
          httpCase === 'getOk'
            ? '200 + Cache-Control с живого API'
            : '201 Created — метод POST, статус создания',
        )
      } else {
        log('err', payload.summary)
        setHint('неожиданный статус — смотрите Network')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setHttpPhase('done')
      setHint('сеть / API недоступны — поднимите assessment-server')
    } finally {
      setBusy(false)
    }
  }

  const runH2 = () => {
    clear()
    resetViz()
    setBusy(true)
    const mux = caseId === 'mux'
    playTimeline(
      tlRef,
      [
        () => setH2Phase('a'),
        () => setH2Phase('b'),
        () => {
          setH2Phase('done')
          if (mux) {
            log('ok', 'streams 1/3/5 параллельно на одном TCP')
            setHint('короткий JSON не ждёт большой HTML')
          } else {
            log('warn', 'B и C ждут завершения A — HOL')
            setHint('очередь на соединении HTTP/1.1')
          }
        },
      ],
      (tl) => {
        if (!h2Ref.current) return
        gsap.set(h2Ref.current, { opacity: 0.55, y: 6 })
        tl.to(h2Ref.current, { opacity: 1, y: 0 }, 0)
      },
      () => setBusy(false),
    )
  }

  const runTls = () => {
    clear()
    resetViz()
    setBusy(true)
    const secure = caseId === 'tls'
    playTimeline(
      tlRef,
      [
        () => setTlsPhase('tcp'),
        () => setTlsPhase(secure ? 'wrap' : 'done'),
        () => {
          setTlsPhase('done')
          if (secure) {
            log('ok', 'TCP → TLS handshake → HTTP')
            setHint('сообщения HTTP уже в зашифрованном канале')
          } else {
            log('warn', 'TCP → HTTP открытым текстом')
            setHint('без TLS заголовки и тело читаются в сети')
          }
        },
      ],
      (tl) => {
        if (!tlsRef.current || !secure) return
        gsap.set(tlsRef.current, { opacity: 0.55, y: 6 })
        tl.to(tlsRef.current, { opacity: 1, y: 0 }, STEP)
      },
      () => setBusy(false),
    )
  }

  const run = () => {
    if (pattern === 'http') void runHttp()
    else if (pattern === 'http2') runH2()
    else runTls()
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('http')
    setCaseId('getOk')
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

      {pattern === 'http' ? (
        <HttpViz phase={httpPhase} caseId={caseId as HttpCase} live={live} />
      ) : null}
      {pattern === 'http2' ? (
        <H2Viz phase={h2Phase} caseId={caseId as H2Case} focusRef={h2Ref} />
      ) : null}
      {pattern === 'https' ? (
        <TlsViz phase={tlsPhase} caseId={caseId as TlsCase} focusRef={tlsRef} />
      ) : null}

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
      title="HTTP · HTTP/2 · HTTPS"
      lead="Живые метод/статус/заголовки; схемы мультиплекса и TLS-канала."
      problem={problem}
      code={code}
    />
  )
}
