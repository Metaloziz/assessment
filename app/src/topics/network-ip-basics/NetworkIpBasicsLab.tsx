import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './NetworkIpBasicsLab.module.css'

const TOPIC_ID = '261-network-ip-basics'
const STEP = 0.55

type Pattern = 'cidr' | 'nat'
type CidrCase = 'same' | 'other'
type NatCase = 'out' | 'in'
type CaseId = CidrCase | NatCase
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'cidr', label: 'Своя сеть' },
  { id: 'nat', label: 'Подмена адреса' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  cidr: [
    { id: 'same', label: 'сосед рядом' },
    { id: 'other', label: 'чужой адрес' },
  ],
  nat: [
    { id: 'out', label: 'выход в интернет' },
    { id: 'in', label: 'стук с улицы' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  cidr: (
    <>
      Число после <code>/</code> говорит, кто в одной сети с компьютером. Сосед — пакет идёт
      напрямую; чужой адрес — сначала на роутер.
    </>
  ),
  nat: (
    <>
      Домашний адрес вроде <code>10.0.2.15</code> в интернете «не существует». Роутер на выходе
      подставляет свой интернет-адрес; если с улицы стучатся без проброса — пакет выбрасывают.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  same: (
    <>
      <code>10.0.2.40</code> живёт в той же сети <code>10.0.2.0/24</code> — роутер не нужен.
    </>
  ),
  other: (
    <>
      <code>203.0.113.10</code> не из нашей <code>/24</code> — пакет отдаём роутеру.
    </>
  ),
  out: (
    <>
      Компьютер <code>10.0.2.15</code> в интернет выходит уже как <code>203.0.113.8</code> — роутер
      запоминает, кому вернуть ответ.
    </>
  ),
  in: (
    <>
      С улицы стучатся на домашний адрес без проброса — роутер отбрасывает пакет, это не ошибка
      сайта.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  cidr: 'Число после `/24` — кто сосед. Сосед — напрямую, иначе пакет на роутер.',
  nat: 'На выходе роутер подставляет свой адрес. С улицы без проброса — отказ.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  cidr: [
    {
      id: 'cidr-match',
      label: 'lab/cidrMatch.ts',
      note: 'Число после `/` — граница сети, не «похожесть» цифр.',
      executable: false,
      languageLabel: 'ts',
      code: `export function parseIpv4(ip: string): number {
  const [a, b, c, d] = ip.split('.').map(Number);
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

export function inPrefix(ip: string, cidr: string): boolean {
  const [net, bits] = cidr.split('/');
  const n = Number(bits);
  const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0; // ← граница сети
  return (parseIpv4(ip) & mask) === (parseIpv4(net!) & mask);
}

// inPrefix('10.0.2.40', '10.0.2.0/24') === true
// inPrefix('10.0.3.40', '10.0.2.0/24') === false`,
    },
    {
      id: 'next-hop',
      label: 'lab/nextHop.ts',
      note: 'Чужой адрес отдаём роутеру, не шлём напрямую.',
      executable: false,
      languageLabel: 'ts',
      code: `import { inPrefix } from './cidrMatch.ts';

type Hop = { via: 'on-link' | 'gateway'; next: string };

export function nextHop(
  dst: string,
  iface: { cidr: string; gw: string },
): Hop {
  if (inPrefix(dst, iface.cidr)) {
    return { via: 'on-link', next: dst }; // ← сосед, напрямую
  }
  return { via: 'gateway', next: iface.gw }; // ← чужой — на роутер
}

// nextHop('10.0.2.40', { cidr: '10.0.2.0/24', gw: '10.0.2.1' })
// nextHop('203.0.113.10', { cidr: '10.0.2.0/24', gw: '10.0.2.1' })`,
    },
  ],
  nat: [
    {
      id: 'snat-out',
      label: 'lab/snatOut.ts',
      note: 'Домашний адрес на выходе становится адресом роутера.',
      executable: false,
      languageLabel: 'ts',
      code: `type Tuple = { src: string; dst: string; sport: number };

const table = new Map<string, Tuple>();

export function snatOut(pkt: Tuple, wanIp: string) {
  const extPort = 40000 + (pkt.sport % 1000);
  const ext = { src: wanIp, dst: pkt.dst, sport: extPort }; // ← подмена адреса
  table.set(\`\${wanIp}:\${extPort}\`, pkt); // ← запомнил, кому ответ
  return ext;
}

// snatOut({ src: '10.0.2.15', dst: '203.0.113.10', sport: 52311 },
//         '203.0.113.8')`,
    },
    {
      id: 'inbound-drop',
      label: 'lab/inboundDrop.ts',
      note: 'С улицы без проброса пакет внутрь не пускают.',
      executable: false,
      languageLabel: 'ts',
      code: `type Mapping = { wan: string; port: number; lan: string };

export function inbound(
  wanDst: { ip: string; port: number },
  maps: Mapping[],
) {
  const hit = maps.find(
    (m) => m.wan === wanDst.ip && m.port === wanDst.port,
  );
  if (!hit) return { action: 'drop' as const }; // ← проброса нет
  return { action: 'dnat' as const, to: hit.lan }; // ← пустить внутрь
}

// inbound({ ip: '203.0.113.8', port: 443 }, []) → drop
// с улицы до 10.x без проброса не достучаться`,
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
    defaults: { duration: STEP, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

function nodeCls(...parts: Array<string | false | undefined>) {
  return [labVizStyles.node, ...parts.filter(Boolean)].join(' ')
}

type CidrVizProps = {
  caseId: CidrCase
  phase: Phase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function CidrViz({ caseId, phase, packetRef }: CidrVizProps) {
  const same = caseId === 'same'
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'c' || phase === 'done'
  const cOn = phase === 'c' || phase === 'done'
  const doneOn = phase === 'done'
  const onLink = same && (cOn || doneOn)
  const viaGw = !same && (cOn || doneOn)
  const moving = phase !== 'idle'

  const meta =
    phase === 'idle'
      ? 'сосед или нет?'
      : doneOn
        ? same
          ? 'напрямую'
          : 'через роутер'
        : phase === 'a'
          ? 'пакет'
          : 'одна сеть?'

  return (
    <LabVizPanel title="своя сеть?" meta={meta}>
      <div className={styles.scheme}>
        <div
          ref={packetRef}
          className={styles.packet}
          style={{ opacity: moving ? 1 : 0.45 }}
        >
          {same ? 'кому: 10.0.2.40' : 'кому: 203.0.113.10'}
        </div>
        <div
          className={`${styles.schemeTop} ${nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>компьютер</span>
          <span className={labVizStyles.nodeSub}>10.0.2.15/24</span>
        </div>
        <div
          className={`${styles.schemeMid} ${nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && labVizStyles.nodeOk,
            !bOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>одна сеть?</span>
          <span className={labVizStyles.nodeSub}>
            {!bOn ? '10.0.2.0/24' : same ? 'да' : 'нет'}
          </span>
        </div>
        <div className={styles.schemeFork} aria-hidden>
          <span
            className={`${styles.schemeForkHit}${onLink || (same && bOn) ? ` ${styles.schemeForkHitActive}` : ` ${styles.schemeForkIdle}`}`}
          >
            ↙ напрямую
          </span>
          <span />
          <span
            className={`${styles.schemeForkMiss}${viaGw || (!same && bOn) ? ` ${styles.schemeForkMissActive}` : ` ${styles.schemeForkIdle}`}`}
          >
            через роутер ↘
          </span>
        </div>
        <div
          className={`${styles.schemeBranch}${!same && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
        >
          <div
            className={nodeCls(
              same && cOn && !doneOn && labVizStyles.nodeActive,
              same && doneOn && labVizStyles.nodeOk,
              (!same || !bOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>напрямую</span>
            <span className={labVizStyles.nodeSub}>
              {same && doneOn ? '10.0.2.40' : 'сосед рядом'}
            </span>
          </div>
        </div>
        <span className={styles.schemeBranchArrow} aria-hidden>
          {doneOn ? '↓' : ''}
        </span>
        <div
          className={`${styles.schemeBranch}${same && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
        >
          <div
            className={nodeCls(
              !same && cOn && !doneOn && labVizStyles.nodeActive,
              !same && doneOn && labVizStyles.nodeOk,
              (same || !bOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>роутер</span>
            <span className={labVizStyles.nodeSub}>
              {!same && doneOn ? '10.0.2.1' : 'выход наружу'}
            </span>
          </div>
        </div>
        <div
          className={`${styles.schemeOut} ${nodeCls(
            doneOn && labVizStyles.nodeOk,
            doneOn && labVizStyles.nodeActive,
            !doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>дальше сюда</span>
          <span className={labVizStyles.nodeSub}>
            {doneOn ? (same ? 'к соседу' : 'сначала роутер') : '—'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

type NatVizProps = {
  caseId: NatCase
  phase: Phase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function NatViz({ caseId, phase, packetRef }: NatVizProps) {
  const outbound = caseId === 'out'
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'c' || phase === 'done'
  const cOn = phase === 'c' || phase === 'done'
  const doneOn = phase === 'done'
  const drop = !outbound && (cOn || doneOn)
  const moving = phase !== 'idle'

  const lanOn = outbound ? aOn : doneOn && !drop ? cOn : false
  const wanOn = outbound ? cOn : aOn

  const meta =
    phase === 'idle'
      ? 'проброс есть?'
      : doneOn
        ? outbound
          ? 'вышел'
          : 'отбой'
        : phase === 'b'
          ? 'роутер'
          : 'пакет'

  return (
    <LabVizPanel title="подмена адреса" meta={meta}>
      <div className={styles.natWrap}>
        <div ref={packetRef} className={styles.packet} style={{ opacity: moving ? 1 : 0.45 }}>
          {drop ? 'отбой' : outbound ? 'из дома в интернет' : 'с улицы домой'}
        </div>
        <div className={styles.writeRow}>
          <div
            className={nodeCls(
              lanOn && !doneOn && labVizStyles.nodeActive,
              outbound && doneOn && labVizStyles.nodeOk,
              !lanOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>дом</span>
            <span className={labVizStyles.nodeSub}>10.0.2.15</span>
          </div>
          <span
            className={`${styles.writeArrow} ${
              outbound && bOn ? styles.writeArrowActive : styles.writeArrowIdle
            }`}
          >
            {outbound ? '→' : '·'}
          </span>
          <div
            className={nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              outbound && doneOn && labVizStyles.nodeOk,
              drop && labVizStyles.nodeErr,
              !bOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>роутер</span>
            <span className={labVizStyles.nodeSub}>
              {!bOn
                ? 'запоминает кто куда'
                : outbound
                  ? doneOn
                    ? 'вышел как 203.0.113.8'
                    : 'меняет адрес'
                  : 'проброса нет'}
            </span>
          </div>
          <span
            className={`${styles.writeArrow} ${
              outbound && cOn
                ? styles.writeArrowActive
                : !outbound && aOn
                  ? styles.writeArrowActive
                  : styles.writeArrowIdle
            }`}
          >
            {outbound ? '→' : '←'}
          </span>
          <div
            className={nodeCls(
              wanOn && !doneOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !wanOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>интернет</span>
            <span className={labVizStyles.nodeSub}>203.0.113.8</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [pattern, setPattern] = useState<Pattern>('cidr')
  const [caseId, setCaseId] = useState<CaseId>('same')
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const packetRef = useRef<HTMLDivElement | null>(null)

  const cases = CASES[pattern]

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
    if (packetRef.current) gsap.set(packetRef.current, { x: 0, clearProps: 'x' })
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

  const runCidr = () => {
    const same = caseId === 'same'
    setRunning(true)
    setFinished(false)
    clear()
    log('info', same ? 'кому: сосед 10.0.2.40' : 'кому: 203.0.113.10')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('a')
          log('info', 'наш адрес 10.0.2.15/24')
        },
        () => {
          setPhase('b')
          log(same ? 'ok' : 'warn', same ? 'одна сеть' : 'другая сеть')
        },
        () => {
          setPhase('c')
          log('info', same ? 'напрямую' : 'на роутер 10.0.2.1')
        },
        () => {
          setPhase('done')
          log('ok', same ? 'дошло до соседа' : 'дальше решает роутер')
        },
      ],
      (tl) => {
        if (!packetRef.current) return
        tl.fromTo(packetRef.current, { x: -12 }, { x: 0 }, 0)
      },
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runNat = () => {
    const outbound = caseId === 'out'
    setRunning(true)
    setFinished(false)
    clear()
    log('info', outbound ? 'из дома 10.0.2.15' : 'стук с улицы')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('a')
          log('info', outbound ? 'домашний адрес' : 'пришло с интернета')
        },
        () => {
          setPhase('b')
          log(outbound ? 'info' : 'warn', outbound ? 'роутер меняет адрес' : 'проброса нет')
        },
        () => {
          setPhase('c')
          if (outbound) log('info', 'в интернет как 203.0.113.8')
          else log('err', 'внутрь не пускаем')
        },
        () => {
          setPhase('done')
          log(outbound ? 'ok' : 'err', outbound ? 'запомнил, кому ответ' : 'пакет выброшен')
        },
      ],
      (tl) => {
        if (!packetRef.current) return
        tl.fromTo(packetRef.current, { x: outbound ? -16 : 16 }, { x: 0 }, 0)
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
    if (pattern === 'cidr') runCidr()
    else runNat()
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    pattern === 'cidr'
      ? caseId === 'same'
        ? 'Итог: сосед в той же сети — шлём напрямую, роутер не трогаем.'
        : 'Итог: адрес не наш — пакет на роутер, он знает выход дальше.'
      : caseId === 'out'
        ? 'Итог: роутер подменил домашний адрес на свой и запомнил, кому вернуть ответ.'
        : 'Итог: без проброса с улицы до домашнего адреса не достучаться.'

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

      {pattern === 'cidr' ? (
        <CidrViz phase={phase} caseId={caseId as CidrCase} packetRef={packetRef} />
      ) : (
        <NatViz phase={phase} caseId={caseId as NatCase} packetRef={packetRef} />
      )}

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  const [pattern, setPattern] = useState<Pattern>('cidr')

  return (
    <div className={shell.codePane}>
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

export function NetworkIpBasicsLab() {
  return (
    <JsLabShell
      title="Базовое понимание IP"
      lead="Сначала: сосед это или нет. Потом: как домашний адрес выходит в интернет."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
