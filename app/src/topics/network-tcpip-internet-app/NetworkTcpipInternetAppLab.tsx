import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './NetworkTcpipInternetAppLab.module.css'

const TOPIC_ID = '253-network-tcpip-internet-app'
const STEP = 0.55

type Pattern = 'app' | 'internet'
type AppCase = 'dns' | 'http'
type NetCase = 'route' | 'icmp'
type CaseId = AppCase | NetCase

type AppPhase = 'idle' | 'app' | 'ip' | 'done'
type NetPhase = 'idle' | 'pkt' | 'hop' | 'done' | 'err'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'app', label: 'Прикладной' },
  { id: 'internet', label: 'Межсетевой' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  app: [
    { id: 'dns', label: 'DNS → IP' },
    { id: 'http', label: 'HTTP-сообщение' },
  ],
  internet: [
    { id: 'route', label: 'маршрут OK' },
    { id: 'icmp', label: 'ICMP unreachable' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  app: (
    <>
      Прикладной уровень задаёт смысл: DNS отдаёт адрес, HTTP несёт метод и путь. Ниже — транспорт и
      IP; на схеме они приглушены.
    </>
  ),
  internet: (
    <>
      Межсетевой уровень ведёт датаграмму по IP: роутеры смотрят next hop и TTL. Прикладной payload
      для них непрозрачен.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  dns: (
    <>
      Запрос A-записи для <code>api.example.com</code> даёт IP — без него пакету некуда идти.
    </>
  ),
  http: (
    <>
      Сообщение <code>GET /v1</code> живёт на прикладном уровне; в IP оно уже просто полезная нагрузка.
    </>
  ),
  route: (
    <>
      Датаграмма идёт host → R1 → R2; на каждом хопе TTL уменьшается, HTTP не разбирают.
    </>
  ),
  icmp: (
    <>
      Нет маршрута к назначению — ICMP unreachable, не HTTP <code>404</code>.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  app: 'DNS и HTTP на прикладном уровне: имя → IP, затем смысловой запрос.',
  internet: 'IP-датаграмма и ICMP: адреса, TTL, unreachable без разбора HTTP.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  app: [
    {
      id: 'dns-lookup',
      label: 'lab/dnsLookup.ts',
      note: 'DNS (прикладной) кормит IP для соединения.',
      executable: false,
      languageLabel: 'ts',
      code: `import dns from 'node:dns/promises';

// ═══════════════════════════════════════════
// DNS ← прикладной: имя → адрес
// ═══════════════════════════════════════════
export async function resolveApiHost(hostname: string) {
  const { address, family } = await dns.lookup(hostname); // ← A / AAAA
  return { hostname, address, family };
}

// await resolveApiHost('api.example.com');
// → { address: '203.0.113.10', family: 4 }`,
    },
    {
      id: 'http-message',
      label: 'lab/httpMessage.ts',
      note: 'HTTP — прикладной PDU; транспорт и IP под ним не меняют семантику метода.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// HTTP ← прикладной: смысл запроса
// ═══════════════════════════════════════════
export function buildGet(path: string, host: string) {
  return [
    \`GET \${path} HTTP/1.1\`, // ← метод + путь
    \`Host: \${host}\`,
    'Accept: application/json',
    '',
  ].join('\\r\\n');
}

// buildGet('/v1', 'api.example.com');
// Дальше TCP:443 и IP src→dst — другие уровни`,
    },
  ],
  internet: [
    {
      id: 'ip-datagram',
      label: 'lab/ipDatagram.ts',
      note: 'Заголовок IP: кто кому и сколько hops осталось.',
      executable: false,
      languageLabel: 'ts',
      code: `type IpDatagram = {
  src: string;
  dst: string;
  ttl: number;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  payload: Uint8Array; // ← для роутера непрозрачен
};

// ═══════════════════════════════════════════
// IP ← межсетевой: датаграмма между сетями
// ═══════════════════════════════════════════
export function forwardHop(pkt: IpDatagram): IpDatagram | null {
  if (pkt.ttl <= 1) return null; // ← TTL exceeded → ICMP
  return { ...pkt, ttl: pkt.ttl - 1 }; // ← next hop
}

// forwardHop({ src: '10.0.0.2', dst: '203.0.113.10', ttl: 64, … });`,
    },
    {
      id: 'icmp-unreachable',
      label: 'lab/icmpUnreachable.ts',
      note: 'Нет маршрута — ICMP, не статус HTTP.',
      executable: false,
      languageLabel: 'ts',
      code: `type IcmpMessage = {
  type: 'destination_unreachable';
  code: 'net_unreachable' | 'host_unreachable';
  about: { dst: string };
};

// ═══════════════════════════════════════════
// ICMP ← служебный протокол межсетевого уровня
// ═══════════════════════════════════════════
export function noRoute(dst: string): IcmpMessage {
  return {
    type: 'destination_unreachable', // ← не HTTP 404
    code: 'net_unreachable',
    about: { dst },
  };
}

// Сигнал ОС: ENETUNREACH / EHOSTUNREACH`,
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

type AppVizProps = {
  phase: AppPhase
  caseId: AppCase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function AppViz({ phase, caseId, packetRef }: AppVizProps) {
  const dns = caseId === 'dns'
  const appLabel = dns ? 'DNS query' : 'HTTP GET /v1'
  const packetText = dns ? 'DNS' : 'HTTP'
  const appState =
    phase === 'app' ? 'active' : phase === 'ip' || phase === 'done' ? 'ok' : 'idle'
  const ipState = phase === 'ip' ? 'active' : phase === 'done' ? 'ok' : phase === 'idle' ? 'idle' : 'dim'
  const moving = phase !== 'idle'

  return (
    <LabVizPanel
      title="Стек TCP/IP (фрагмент)"
      meta={dns ? 'имя → адрес' : 'смысл сообщения'}
    >
      <div className={styles.stackWrap}>
        <div ref={packetRef} className={styles.packet} style={{ opacity: moving ? 1 : 0.5 }}>
          {packetText}
        </div>
        <div className={layerClass(appState)}>
          <span className={labVizStyles.nodeLabel}>Прикладной</span>
          <span className={labVizStyles.nodeSub}>
            {phase === 'idle' ? 'HTTP / DNS' : appLabel}
          </span>
        </div>
        <div className={layerClass('dim')}>
          <span className={labVizStyles.nodeLabel}>Транспорт</span>
          <span className={labVizStyles.nodeSub}>TCP/UDP · др. тема</span>
        </div>
        <div className={layerClass(ipState === 'idle' && phase === 'app' ? 'dim' : ipState)}>
          <span className={labVizStyles.nodeLabel}>Межсетевой</span>
          <span className={labVizStyles.nodeSub}>
            {phase === 'done' || phase === 'ip'
              ? dns
                ? 'dst 203.0.113.10'
                : 'IP src → dst'
              : 'IP'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

type NetVizProps = {
  phase: NetPhase
  caseId: NetCase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function NetViz({ phase, caseId, packetRef }: NetVizProps) {
  const fail = caseId === 'icmp'
  const moving = phase !== 'idle'
  const pktState =
    phase === 'pkt' ? 'active' : phase === 'hop' || phase === 'done' || phase === 'err' ? 'ok' : 'idle'
  const hopShown = phase === 'hop' || phase === 'done' || phase === 'err'
  const hopOk = !fail && (phase === 'hop' || phase === 'done')
  const hopErr = fail && (phase === 'hop' || phase === 'err')

  return (
    <LabVizPanel
      title="IP-датаграмма"
      meta={fail ? 'нет маршрута' : 'TTL −1 на хопе'}
    >
      <div className={styles.stackWrap}>
        <div
          ref={packetRef}
          className={styles.packet}
          style={{ opacity: moving ? 1 : 0.5 }}
        >
          {phase === 'err' ? 'ICMP' : 'IP pkt'}
        </div>
        <div className={layerClass('dim')}>
          <span className={labVizStyles.nodeLabel}>Прикладной</span>
          <span className={labVizStyles.nodeSub}>payload opaque</span>
        </div>
        <div className={layerClass('dim')}>
          <span className={labVizStyles.nodeLabel}>Транспорт</span>
          <span className={labVizStyles.nodeSub}>порты · др. тема</span>
        </div>
        <div
          className={layerClass(
            phase === 'err' ? 'err' : pktState === 'idle' ? 'idle' : pktState === 'active' ? 'active' : 'ok',
          )}
        >
          <span className={labVizStyles.nodeLabel}>Межсетевой</span>
          <span className={labVizStyles.nodeSub}>
            {phase === 'err' ? 'unreachable' : 'src 10.0.0.2 → dst 203.0.113.10'}
          </span>
        </div>
        <div className={styles.hopRow}>
          <div
            className={`${labVizStyles.node} ${styles.hop}${hopShown ? ` ${labVizStyles.nodeOk}` : ''}`}
          >
            <span className={labVizStyles.nodeLabel}>host</span>
            <span className={labVizStyles.nodeSub}>TTL 64</span>
          </div>
          <span className={styles.hopArrow}>→</span>
          <div
            className={`${labVizStyles.node} ${styles.hop}${
              hopOk ? ` ${labVizStyles.nodeActive}` : hopErr ? ` ${labVizStyles.nodeErr}` : ''
            }`}
          >
            <span className={labVizStyles.nodeLabel}>R1</span>
            <span className={labVizStyles.nodeSub}>{hopErr ? 'no route' : hopOk ? 'TTL 63' : '…'}</span>
          </div>
          <span className={styles.hopArrow}>→</span>
          <div
            className={`${labVizStyles.node} ${styles.hop}${
              !fail && phase === 'done' ? ` ${labVizStyles.nodeOk}` : styles.nodeDim
            }`}
          >
            <span className={labVizStyles.nodeLabel}>R2</span>
            <span className={labVizStyles.nodeSub}>{!fail && phase === 'done' ? 'TTL 62' : '—'}</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [pattern, setPattern] = useState<Pattern>('app')
  const [caseId, setCaseId] = useState<CaseId>('dns')
  const [appPhase, setAppPhase] = useState<AppPhase>('idle')
  const [netPhase, setNetPhase] = useState<NetPhase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const packetRef = useRef<HTMLDivElement | null>(null)

  const cases = CASES[pattern]
  const appCase = caseId as AppCase
  const netCase = caseId as NetCase

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setAppPhase('idle')
    setNetPhase('idle')
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

  const runApp = () => {
    const dns = appCase === 'dns'
    setRunning(true)
    setFinished(false)
    clear()
    log('info', dns ? 'DNS query A api.example.com' : 'HTTP GET /v1')

    const steps = [
      () => {
        setAppPhase('app')
        log('info', dns ? 'прикладной: resolver' : 'прикладной: сообщение')
      },
      () => {
        setAppPhase('ip')
        log('info', dns ? 'IP dst = 203.0.113.10' : 'ниже — IP src→dst')
      },
      () => {
        setAppPhase('done')
        log('ok', dns ? 'имя резолвнуто' : 'смысл на app-уровне')
      },
    ]

    playTimeline(
      tlRef,
      steps,
      (tl) => {
        if (!packetRef.current) return
        tl.fromTo(packetRef.current, { y: 0 }, { y: 52 }, 0)
        tl.to(packetRef.current, { y: 118 }, STEP)
      },
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runNet = () => {
    const fail = netCase === 'icmp'
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'IP 10.0.0.2 → 203.0.113.10')

    const steps = [
      () => {
        setNetPhase('pkt')
        log('info', 'датаграмма на межсетевом')
      },
      () => {
        setNetPhase('hop')
        log(fail ? 'warn' : 'info', fail ? 'R1: no route' : 'R1: forward, TTL 63')
      },
      () => {
        if (fail) {
          setNetPhase('err')
          log('err', 'ICMP destination unreachable')
        } else {
          setNetPhase('done')
          log('ok', 'R2: forward, TTL 62')
        }
      },
    ]

    playTimeline(
      tlRef,
      steps,
      (tl) => {
        if (!packetRef.current) return
        tl.fromTo(packetRef.current, { y: 0 }, { y: 72 }, 0)
        tl.to(packetRef.current, { y: 72 }, STEP)
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
    if (pattern === 'app') runApp()
    else runNet()
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    pattern === 'app'
      ? appCase === 'dns'
        ? 'Итог: DNS (прикладной) даёт IP для маршрутизации.'
        : 'Итог: HTTP — смысл на прикладном; IP несёт пакет, не «читает» GET.'
      : netCase === 'route'
        ? 'Итог: роутеры ведут датаграмму по IP и TTL, payload не разбирают.'
        : 'Итог: unreachable — ICMP/IP-уровень, не HTTP 404.'

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

      {pattern === 'app' ? (
        <AppViz phase={appPhase} caseId={appCase} packetRef={packetRef} />
      ) : (
        <NetViz phase={netPhase} caseId={netCase} packetRef={packetRef} />
      )}

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [pattern, setPattern] = useState<Pattern>('app')

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

export function NetworkTcpipInternetAppLab() {
  return (
    <JsLabShell
      title="TCP/IP: межсетевой и прикладной"
      lead="Прикладной: DNS и HTTP. Межсетевой: маршрут IP и ICMP unreachable."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
