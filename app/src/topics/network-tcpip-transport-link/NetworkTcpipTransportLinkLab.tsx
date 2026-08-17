import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './NetworkTcpipTransportLinkLab.module.css'

const TOPIC_ID = '254-network-tcpip-transport-link'
const STEP = 0.55

type Pattern = 'transport' | 'link'
type TransportCase = 'tcp' | 'udp'
type LinkCase = 'frame' | 'drop'
type CaseId = TransportCase | LinkCase

type TransportPhase = 'idle' | 'hs' | 'ports' | 'done'
type LinkPhase = 'idle' | 'pkt' | 'frame' | 'done' | 'err'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'transport', label: 'Транспорт' },
  { id: 'link', label: 'Канал' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  transport: [
    { id: 'tcp', label: 'TCP handshake' },
    { id: 'udp', label: 'UDP датаграмма' },
  ],
  link: [
    { id: 'frame', label: 'кадр OK' },
    { id: 'drop', label: 'FCS drop' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  transport: (
    <>
      Транспорт даёт порты и способ доставки на хост: TCP поднимает соединение, UDP шлёт датаграмму.
      IP и кадр на схеме приглушены.
    </>
  ),
  link: (
    <>
      Канал несёт кадр до соседа по MAC: IP-пакет внутри, FCS проверяет целостность. Транспорт для NIC
      непрозрачен.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  tcp: (
    <>
      Трёхсторонний handshake, затем поток на порты клиента и <code>:443</code>.
    </>
  ),
  udp: (
    <>
      Одна датаграмма с портами — без SYN/ACK и без гарантии доставки в самом UDP.
    </>
  ),
  frame: (
    <>
      Пакет IP упаковывается в Ethernet: MAC src → MAC dst (next hop).
    </>
  ),
  drop: (
    <>
      FCS не сходится — кадр отбрасывают на L2, до IP/TCP он не доходит.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  transport: 'TCP и UDP на транспорте: handshake и порты vs лёгкая датаграмма.',
  link: 'Кадр Ethernet и FCS: MAC next hop или drop до IP.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  transport: [
    {
      id: 'tcp-connect',
      label: 'lab/tcpConnect.ts',
      note: 'TCP: порты и соединение до обмена данными.',
      executable: false,
      languageLabel: 'ts',
      code: `import net from 'node:net';

// ═══════════════════════════════════════════
// TCP ← транспорт: handshake + поток
// ═══════════════════════════════════════════
export function connectApi(host: string, port = 443) {
  const socket = net.connect({ host, port }); // ← SYN…
  socket.once('connect', () => {
    // ← handshake done: порты заняты, можно писать
  });
  return socket;
}

// connectApi('203.0.113.10', 443);
// Локальный ephemeral port ↔ remote :443`,
    },
    {
      id: 'udp-send',
      label: 'lab/udpSend.ts',
      note: 'UDP: датаграмма без состояния сессии в протоколе.',
      executable: false,
      languageLabel: 'ts',
      code: `import dgram from 'node:dgram';

// ═══════════════════════════════════════════
// UDP ← транспорт: одна датаграмма
// ═══════════════════════════════════════════
export function sendQuery(host: string, port: number, buf: Buffer) {
  const sock = dgram.createSocket('udp4');
  sock.send(buf, port, host, (err) => {
    sock.close();
    if (err) throw err; // ← нет retry в самом UDP
  });
}

// sendQuery('203.0.113.53', 53, dnsQueryBytes);
// Без SYN/ACK — «отправил» ≠ «доставили»`,
    },
  ],
  link: [
    {
      id: 'eth-frame',
      label: 'lab/ethFrame.ts',
      note: 'Кадр канала: MAC и тип полезной нагрузки.',
      executable: false,
      languageLabel: 'ts',
      code: `type EthFrame = {
  dstMac: string;
  srcMac: string;
  etherType: 'IPv4' | 'ARP';
  payload: Uint8Array; // ← IP-пакет внутри
  fcs: number;
};

// ═══════════════════════════════════════════
// Ethernet ← канал: кадр до next hop
// ═══════════════════════════════════════════
export function wrapIp(pkt: Uint8Array, dstMac: string, srcMac: string): EthFrame {
  return {
    dstMac, // ← MAC шлюза / peer в сегменте
    srcMac,
    etherType: 'IPv4',
    payload: pkt,
    fcs: 0xdeadbeef, // ← упрощённо
  };
}

// wrapIp(ipBytes, 'aa:bb:…:01', 'aa:bb:…:02');`,
    },
    {
      id: 'fcs-check',
      label: 'lab/fcsCheck.ts',
      note: 'Битый кадр не поднимают на IP.',
      executable: false,
      languageLabel: 'ts',
      code: `type RxFrame = { fcsOk: boolean; etherType: string };

// ═══════════════════════════════════════════
// FCS ← целостность кадра на L2
// ═══════════════════════════════════════════
export function acceptFrame(frame: RxFrame): 'pass' | 'drop' {
  if (!frame.fcsOk) return 'drop'; // ← до IP не доходит
  return 'pass';
}

// acceptFrame({ fcsOk: false, etherType: 'IPv4' }) → 'drop'
// Сигнал NIC: discarded / FCS errors`,
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
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

function layerClass(state: 'idle' | 'active' | 'ok' | 'err' | 'dim') {
  const base = `${labVizStyles.node} ${styles.layer}`
  if (state === 'dim') return `${base} ${styles.nodeDim}`
  if (state === 'active') return `${base} ${labVizStyles.nodeActive}`
  if (state === 'ok') return `${base} ${labVizStyles.nodeOk}`
  if (state === 'err') return `${base} ${labVizStyles.nodeErr}`
  return base
}

type TransportVizProps = {
  phase: TransportPhase
  caseId: TransportCase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function TransportViz({ phase, caseId, packetRef }: TransportVizProps) {
  const tcp = caseId === 'tcp'
  const packetText = tcp ? (phase === 'hs' ? 'SYN' : 'TCP') : 'UDP'
  const trState =
    phase === 'hs' || phase === 'ports'
      ? 'active'
      : phase === 'done'
        ? 'ok'
        : 'idle'
  const moving = phase !== 'idle'

  return (
    <LabVizPanel
      title="Стек TCP/IP (фрагмент)"
      meta={tcp ? 'handshake → порты' : 'датаграмма'}
    >
      <div className={styles.stackWrap}>
        <div ref={packetRef} className={styles.packet} style={{ opacity: moving ? 1 : 0.5 }}>
          {packetText}
        </div>
        <div className={layerClass('dim')}>
          <span className={labVizStyles.nodeLabel}>Прикладной</span>
          <span className={labVizStyles.nodeSub}>др. тема</span>
        </div>
        <div className={layerClass(trState)}>
          <span className={labVizStyles.nodeLabel}>Транспорт</span>
          <span className={labVizStyles.nodeSub}>
            {phase === 'idle'
              ? 'TCP / UDP'
              : tcp
                ? phase === 'hs'
                  ? 'SYN → SYN-ACK → ACK'
                  : 'ephemeral ↔ :443'
                : 'src:5353 → dst:53'}
          </span>
        </div>
        <div className={layerClass('dim')}>
          <span className={labVizStyles.nodeLabel}>Межсетевой</span>
          <span className={labVizStyles.nodeSub}>IP · др. тема</span>
        </div>
        <div className={layerClass('dim')}>
          <span className={labVizStyles.nodeLabel}>Канал</span>
          <span className={labVizStyles.nodeSub}>кадр · др. тема</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

type LinkVizProps = {
  phase: LinkPhase
  caseId: LinkCase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function LinkViz({ phase, caseId, packetRef }: LinkVizProps) {
  const fail = caseId === 'drop'
  const moving = phase !== 'idle'
  const frameState =
    phase === 'frame'
      ? 'active'
      : phase === 'done'
        ? 'ok'
        : phase === 'err'
          ? 'err'
          : phase === 'pkt'
            ? 'idle'
            : 'idle'
  const hopShown = phase === 'frame' || phase === 'done' || phase === 'err'
  const hopOk = !fail && (phase === 'frame' || phase === 'done')
  const hopErr = fail && (phase === 'frame' || phase === 'err')

  return (
    <LabVizPanel title="Кадр канала" meta={fail ? 'FCS mismatch' : 'MAC → next hop'}>
      <div className={styles.stackWrap}>
        <div ref={packetRef} className={styles.packet} style={{ opacity: moving ? 1 : 0.5 }}>
          {phase === 'err' ? 'drop' : phase === 'pkt' ? 'IP' : 'frame'}
        </div>
        <div className={layerClass('dim')}>
          <span className={labVizStyles.nodeLabel}>Транспорт</span>
          <span className={labVizStyles.nodeSub}>порты · opaque</span>
        </div>
        <div className={layerClass(phase === 'pkt' ? 'active' : phase === 'idle' ? 'idle' : 'dim')}>
          <span className={labVizStyles.nodeLabel}>Межсетевой</span>
          <span className={labVizStyles.nodeSub}>IP payload</span>
        </div>
        <div
          className={layerClass(
            phase === 'err'
              ? 'err'
              : phase === 'pkt'
                ? 'dim'
                : frameState === 'active'
                  ? 'active'
                  : frameState === 'ok'
                    ? 'ok'
                    : 'idle',
          )}
        >
          <span className={labVizStyles.nodeLabel}>Канал</span>
          <span className={labVizStyles.nodeSub}>
            {phase === 'err'
              ? 'FCS fail'
              : phase === 'done' || phase === 'frame'
                ? 'MAC aa:…02 → aa:…01'
                : 'Ethernet'}
          </span>
        </div>
        <div className={styles.hopRow}>
          <div
            className={`${labVizStyles.node} ${styles.hop}${hopShown ? ` ${labVizStyles.nodeOk}` : ''}`}
          >
            <span className={labVizStyles.nodeLabel}>NIC</span>
            <span className={labVizStyles.nodeSub}>tx</span>
          </div>
          <span className={styles.hopArrow}>→</span>
          <div
            className={`${labVizStyles.node} ${styles.hop}${
              hopOk ? ` ${labVizStyles.nodeActive}` : hopErr ? ` ${labVizStyles.nodeErr}` : ''
            }`}
          >
            <span className={labVizStyles.nodeLabel}>wire</span>
            <span className={labVizStyles.nodeSub}>{hopErr ? 'corrupt' : hopOk ? 'ok' : '…'}</span>
          </div>
          <span className={styles.hopArrow}>→</span>
          <div
            className={`${labVizStyles.node} ${styles.hop}${
              !fail && phase === 'done' ? ` ${labVizStyles.nodeOk}` : styles.nodeDim
            }`}
          >
            <span className={labVizStyles.nodeLabel}>peer</span>
            <span className={labVizStyles.nodeSub}>{!fail && phase === 'done' ? 'rx' : '—'}</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [pattern, setPattern] = useState<Pattern>('transport')
  const [caseId, setCaseId] = useState<CaseId>('tcp')
  const [trPhase, setTrPhase] = useState<TransportPhase>('idle')
  const [linkPhase, setLinkPhase] = useState<LinkPhase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const packetRef = useRef<HTMLDivElement | null>(null)

  const cases = CASES[pattern]
  const trCase = caseId as TransportCase
  const linkCase = caseId as LinkCase

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setTrPhase('idle')
    setLinkPhase('idle')
    setFinished(false)
    setRunning(false)
    if (packetRef.current) gsap.set(packetRef.current, { y: 0, clearProps: 'y' })
  }

  const onPattern = (id: Pattern) => {
    if (running) return
    setPattern(id)
    setCaseId(CASES[id][0]!.id)
    clear()
    resetVisual()
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  const runTransport = () => {
    const tcp = trCase === 'tcp'
    setRunning(true)
    setFinished(false)
    clear()
    log('info', tcp ? 'TCP connect :443' : 'UDP send :53')

    const steps = tcp
      ? [
          () => {
            setTrPhase('hs')
            log('info', 'SYN → SYN-ACK → ACK')
          },
          () => {
            setTrPhase('ports')
            log('info', 'порты: ephemeral ↔ 443')
          },
          () => {
            setTrPhase('done')
            log('ok', 'соединение готово')
          },
        ]
      : [
          () => {
            setTrPhase('hs')
            log('info', 'датаграмма UDP')
          },
          () => {
            setTrPhase('ports')
            log('info', 'порты: 5353 → 53')
          },
          () => {
            setTrPhase('done')
            log('ok', 'отправлено (без ACK в UDP)')
          },
        ]

    playTimeline(
      tlRef,
      steps,
      (tl) => {
        if (!packetRef.current) return
        tl.fromTo(packetRef.current, { y: 0 }, { y: 52 }, 0)
        tl.to(packetRef.current, { y: 52 }, STEP)
      },
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runLink = () => {
    const fail = linkCase === 'drop'
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'IP → Ethernet frame')

    const steps = [
      () => {
        setLinkPhase('pkt')
        log('info', 'IP-пакет готов')
      },
      () => {
        setLinkPhase('frame')
        log(fail ? 'warn' : 'info', fail ? 'wire: bit errors' : 'MAC → next hop')
      },
      () => {
        if (fail) {
          setLinkPhase('err')
          log('err', 'FCS fail → drop')
        } else {
          setLinkPhase('done')
          log('ok', 'peer: кадр принят')
        }
      },
    ]

    playTimeline(
      tlRef,
      steps,
      (tl) => {
        if (!packetRef.current) return
        tl.fromTo(packetRef.current, { y: 0 }, { y: 72 }, 0)
        tl.to(packetRef.current, { y: 118 }, STEP)
      },
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const onRun = () => {
    if (running) return
    resetVisual()
    if (pattern === 'transport') runTransport()
    else runLink()
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    pattern === 'transport'
      ? trCase === 'tcp'
        ? 'Итог: TCP поднимает сессию и порты до обмена данными.'
        : 'Итог: UDP — датаграмма с портами без handshake и ACK в протоколе.'
      : linkCase === 'frame'
        ? 'Итог: кадр несёт IP до соседа по MAC; вышележащее opaque.'
        : 'Итог: FCS drop — отказ на канале, не ECONNREFUSED и не HTTP.'

  return (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={running} onChange={onPattern} />
      <div className={shell.row}>
        {cases.map((c) => (
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
        <LabButton variant="secondary" size="sm" disabled={running} onClick={onReset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {pattern === 'transport' ? (
        <TransportViz phase={trPhase} caseId={trCase} packetRef={packetRef} />
      ) : (
        <LinkViz phase={linkPhase} caseId={linkCase} packetRef={packetRef} />
      )}

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [pattern, setPattern] = useState<Pattern>('transport')

  return (
    <div className={styles.codePane}>
      <PatternSwitch value={pattern} onChange={setPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )
}

export function NetworkTcpipTransportLinkLab() {
  return (
    <JsLabShell
      title="TCP/IP: транспортный и канальный"
      lead="Транспорт: TCP handshake и UDP. Канал: кадр Ethernet и FCS drop."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
