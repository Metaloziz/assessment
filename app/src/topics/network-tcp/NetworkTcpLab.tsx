import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import styles from './NetworkTcpLab.module.css'

const TOPIC_ID = '262-network-tcp'
const STEP_MS = 0.58

type CaseId = 'handshake' | 'rtx' | 'rst'
type HostState = LabNodeState
type PacketKind = 'idle' | 'live' | 'lost' | 'err' | 'ok'

type Frame = {
  client: HostState
  server: HostState
  clientSub: string
  serverSub: string
  packetName: string
  packetAbbr: string
  packetKind: PacketKind
  dir: 'mid' | 'toServer' | 'toClient'
  log: { kind: 'ok' | 'err' | 'info' | 'warn'; text: string }
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'handshake', label: 'Synchronize' },
  { id: 'rtx', label: 'Повтор' },
  { id: 'rst', label: 'Reset' },
]

const PAIN = (
  <>
    TCP поднимает сессию между сокетами, нумерует байты и чинит потери. HTTP и TLS появляются только
    после <code>ESTABLISHED</code>.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  handshake: (
    <>
      <code>Synchronize</code> → <code>Synchronize+Acknowledgment</code> → <code>Acknowledgment</code>
      : обе стороны входят в <code>ESTABLISHED</code>.
    </>
  ),
  rtx: (
    <>
      Сегмент потерян: нет <code>Acknowledgment</code>, по <code>RTO</code> уходит повтор с тем же{' '}
      <code>seq</code>.
    </>
  ),
  rst: (
    <>
      На порту нет <code>LISTEN</code>: хост отвечает <code>Reset</code>, в Node это{' '}
      <code>ECONNREFUSED</code>.
    </>
  ),
}

const HINT: Record<CaseId, string> = {
  handshake:
    'Итог: без Synchronize, Synchronize+Acknowledgment и Acknowledgment потока байт ещё нет.',
  rtx: 'Итог: приложение видит целый поток; дыру закрывает повтор TCP, не HTTP.',
  rst: 'Итог: Reset — явный отказ порта; это не таймаут и не 404.',
}

const FRAMES: Record<CaseId, Frame[]> = {
  handshake: [
    {
      client: 'active',
      server: 'idle',
      clientSub: 'SYN_SENT',
      serverSub: 'LISTEN',
      packetName: 'Synchronize',
      packetAbbr: 'SYN seq=100',
      packetKind: 'live',
      dir: 'toServer',
      log: { kind: 'info', text: 'Synchronize (SYN) seq=100' },
    },
    {
      client: 'active',
      server: 'active',
      clientSub: 'SYN_SENT',
      serverSub: 'SYN_RCVD',
      packetName: 'Synchronize + Acknowledgment',
      packetAbbr: 'SYN-ACK ack=101',
      packetKind: 'live',
      dir: 'toClient',
      log: { kind: 'info', text: 'Synchronize+Acknowledgment (SYN-ACK)' },
    },
    {
      client: 'active',
      server: 'active',
      clientSub: 'ESTABLISHED',
      serverSub: 'ESTABLISHED',
      packetName: 'Acknowledgment',
      packetAbbr: 'ACK',
      packetKind: 'live',
      dir: 'toServer',
      log: { kind: 'info', text: 'Acknowledgment (ACK)' },
    },
    {
      client: 'ok',
      server: 'ok',
      clientSub: 'ESTABLISHED',
      serverSub: 'ESTABLISHED',
      packetName: 'byte stream',
      packetAbbr: 'ESTABLISHED',
      packetKind: 'ok',
      dir: 'mid',
      log: { kind: 'ok', text: 'ESTABLISHED' },
    },
  ],
  rtx: [
    {
      client: 'active',
      server: 'ok',
      clientSub: 'ESTABLISHED',
      serverSub: 'ESTABLISHED',
      packetName: 'Data',
      packetAbbr: 'seq=200',
      packetKind: 'live',
      dir: 'toServer',
      log: { kind: 'info', text: 'DATA seq=200' },
    },
    {
      client: 'active',
      server: 'ok',
      clientSub: 'wait ACK',
      serverSub: 'ESTABLISHED',
      packetName: 'lost',
      packetAbbr: 'no Acknowledgment',
      packetKind: 'lost',
      dir: 'mid',
      log: { kind: 'warn', text: 'no Acknowledgment · RTO' },
    },
    {
      client: 'active',
      server: 'active',
      clientSub: 'retransmit',
      serverSub: 'ESTABLISHED',
      packetName: 'Data rtx',
      packetAbbr: 'seq=200',
      packetKind: 'live',
      dir: 'toServer',
      log: { kind: 'info', text: 'rtx DATA seq=200' },
    },
    {
      client: 'ok',
      server: 'ok',
      clientSub: 'ESTABLISHED',
      serverSub: 'ESTABLISHED',
      packetName: 'Acknowledgment',
      packetAbbr: 'ACK ack=250',
      packetKind: 'ok',
      dir: 'toClient',
      log: { kind: 'ok', text: 'Acknowledgment (ACK) ack=250' },
    },
  ],
  rst: [
    {
      client: 'active',
      server: 'idle',
      clientSub: 'SYN_SENT',
      serverSub: 'CLOSED',
      packetName: 'Synchronize',
      packetAbbr: 'SYN seq=100',
      packetKind: 'live',
      dir: 'toServer',
      log: { kind: 'info', text: 'Synchronize (SYN) seq=100' },
    },
    {
      client: 'active',
      server: 'err',
      clientSub: 'SYN_SENT',
      serverSub: 'no LISTEN',
      packetName: 'Reset',
      packetAbbr: 'RST',
      packetKind: 'err',
      dir: 'toClient',
      log: { kind: 'err', text: 'Reset (RST)' },
    },
    {
      client: 'err',
      server: 'err',
      clientSub: 'CLOSED',
      serverSub: 'CLOSED',
      packetName: 'Reset',
      packetAbbr: 'ECONNREFUSED',
      packetKind: 'err',
      dir: 'mid',
      log: { kind: 'err', text: 'ECONNREFUSED' },
    },
  ],
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'listen',
    label: 'lab/tcpListen.ts',
    note: '`listen` ставит сокет в `LISTEN`; данные — после handshake (Synchronize → Acknowledgment).',
    executable: false,
    languageLabel: 'ts',
    code: `import net from 'node:net';

// ═══════════════════════════════════════════
// LISTEN ← сервер ждёт Synchronize (SYN)
// ═══════════════════════════════════════════
export function listenApi(port = 443) {
  const server = net.createServer((socket) => {
    // ← ESTABLISHED: поток байт, не HTTP
    socket.write('ok');
  });

  server.listen(port); // ← SYN сюда; иначе клиент получит Reset (RST)
  return server;
}

// listenApi(443);
// netstat: 0.0.0.0:443 LISTEN`,
  },
  {
    id: 'connect',
    label: 'lab/tcpConnect.ts',
    note: '`connect` шлёт Synchronize (`SYN`); событие connect — уже ESTABLISHED.',
    executable: false,
    languageLabel: 'ts',
    code: `import net from 'node:net';

// ═══════════════════════════════════════════
// CONNECT ← Synchronize → Synchronize+Acknowledgment → Acknowledgment
// ═══════════════════════════════════════════
export function connectApi(host: string, port = 443) {
  const socket = net.connect({ host, port }); // ← Synchronize (SYN)

  socket.once('connect', () => {
    socket.write('GET / HTTP/1.1\\r\\nHost: api\\r\\n\\r\\n'); // ← после ESTABLISHED
  });

  return socket;
}

// connectApi('203.0.113.10', 443);`,
  },
  {
    id: 'errors',
    label: 'lab/tcpErrors.ts',
    note: '`ECONNREFUSED` — Reset (`RST`); таймаут — тишина, не 404.',
    executable: false,
    languageLabel: 'ts',
    code: `type TcpFail = 'refused' | 'timeout' | 'reset';

// ═══════════════════════════════════════════
// Reset / timeout ← не HTTP-статус
// ═══════════════════════════════════════════
export function classify(err: NodeJS.ErrnoException): TcpFail {
  if (err.code === 'ECONNREFUSED') return 'refused'; // ← Reset (RST), нет LISTEN
  if (err.code === 'ETIMEDOUT') return 'timeout'; // ← Synchronize без ответа
  return 'reset'; // ← ECONNRESET / EPIPE на живой сессии
}

// socket.on('error', (e) => classify(e));`,
  },
]

const PACKET_X: Record<Frame['dir'], number> = {
  mid: 0,
  toServer: 56,
  toClient: -56,
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
    defaults: { duration: STEP_MS, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP_MS)
  })
  motion?.(tl)
}

function packetClass(kind: PacketKind) {
  const base = styles.packet
  if (kind === 'lost') return `${base} ${styles.packetLost}`
  if (kind === 'err') return `${base} ${styles.packetErr}`
  if (kind === 'ok') return `${base} ${styles.packetOk}`
  if (kind === 'live') return `${base} ${styles.packetLive}`
  return base
}

type VizProps = {
  frame: Frame | null
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function TcpViz({ frame, packetRef }: VizProps) {
  const clientState = frame?.client ?? 'idle'
  const serverState = frame?.server ?? 'idle'
  const packetKind = frame?.packetKind ?? 'idle'
  const packetName = frame?.packetName ?? 'TCP'
  const packetAbbr = frame?.packetAbbr ?? 'segment'
  const meta =
    packetKind === 'idle'
      ? 'сессия'
      : packetKind === 'lost'
        ? 'RTO'
        : packetKind === 'err'
          ? 'Reset'
          : packetKind === 'ok'
            ? 'ESTABLISHED'
            : packetName

  return (
    <LabVizPanel title="Сессия TCP" meta={meta}>
      <div className={styles.session}>
        <LabNode
          className={styles.endpoint}
          label="Клиент"
          sub={frame?.clientSub ?? ':ephemeral'}
          state={clientState}
        />
        <div className={styles.wire}>
          <div className={styles.wireLine} />
          <div ref={packetRef} className={packetClass(packetKind)}>
            <span className={styles.packetName}>{packetName}</span>
            <span className={styles.packetAbbr}>{packetAbbr}</span>
          </div>
        </div>
        <LabNode
          className={styles.endpoint}
          label="Сервер"
          sub={frame?.serverSub ?? ':443'}
          state={serverState}
        />
      </div>
    </LabVizPanel>
  )
}

function placePacket(el: HTMLDivElement | null, dir: Frame['dir']) {
  if (!el) return
  gsap.set(el, { x: PACKET_X[dir] })
}

function ProblemPanel() {
  const [caseId, setCaseId] = useState<CaseId>('handshake')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const packetRef = useRef<HTMLDivElement | null>(null)

  const frames = FRAMES[caseId]

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setFrame(null)
    setCursor(-1)
    setFinished(false)
    setRunning(false)
    if (packetRef.current) gsap.set(packetRef.current, { x: 0, clearProps: 'x' })
  }

  const applyFrame = (i: number) => {
    const f = frames[i]!
    setFrame(f)
    setCursor(i)
    log(f.log.kind, f.log.text)
    placePacket(packetRef.current, f.dir)
    if (i === frames.length - 1) setFinished(true)
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  const onStep = () => {
    if (running || finished) return
    tlRef.current?.kill()
    const next = cursor + 1
    if (next >= frames.length) return
    if (cursor < 0) {
      clear()
      setFinished(false)
    }
    applyFrame(next)
  }

  const onRun = () => {
    if (running) return
    resetVisual()
    clear()
    setRunning(true)

    playTimeline(
      tlRef,
      frames.map((f, i) => () => {
        setFrame(f)
        setCursor(i)
        log(f.log.kind, f.log.text)
        if (i === frames.length - 1) setFinished(true)
      }),
      (tl) => {
        const el = packetRef.current
        if (!el) return
        frames.forEach((f, i) => {
          tl.to(el, { x: PACKET_X[f.dir] }, i * STEP_MS)
        })
      },
      () => {
        setRunning(false)
      },
    )
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  return (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={running}
            onClick={() => onCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
      <div className={shell.row}>
        <LabButton variant="primary" size="sm" disabled={running} onClick={onRun}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" size="sm" disabled={running || finished} onClick={onStep}>
          Шаг
        </LabButton>
        <LabButton variant="secondary" size="sm" disabled={running} onClick={onReset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <TcpViz frame={frame} packetRef={packetRef} />

      {finished ? <p className={shell.hint}>{HINT[caseId]}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  return (
    <div className={shell.codePane}>
      <InteractiveCodePanel
        topicId={TOPIC_ID}
        intro="Сокеты Node `net`: `LISTEN`, handshake Synchronize → Acknowledgment до `write`, `ECONNREFUSED` vs таймаут."
        snippets={SNIPPETS}
      />
    </div>
  )
}

export function NetworkTcpLab() {
  return (
    <JsLabShell
      title="Базовое понимание TCP"
      lead="Сессия TCP: Synchronize → Acknowledgment, повтор сегмента, Reset вместо LISTEN."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
