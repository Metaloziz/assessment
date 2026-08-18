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
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './NetworkDnsBasicsLab.module.css'

const TOPIC_ID = '263-network-dns-basics'
const STEP = 0.55

type CaseId = 'ok' | 'missing' | 'stale'
type Phase = 'idle' | 'a' | 'b' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'ok', label: 'имя → IP' },
  { id: 'missing', label: 'имени нет' },
  { id: 'stale', label: 'ещё старый IP' },
]

const PAIN = (
  <>
    Чтобы открыть сайт по имени, сначала спрашивают DNS: какой <code>IP</code>. Пока нет адреса,
    HTTP ещё не начался.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ok: (
    <>
      Имя есть — DNS отдал <code>203.0.113.10</code>, можно соединяться.
    </>
  ),
  missing: (
    <>
      Такого имени нет — адреса не будет, это не «сайт лёг».
    </>
  ),
  stale: (
    <>
      Адрес уже сменили, но DNS ещё помнит старый <code>IP</code>.
    </>
  ),
}

const CODE_INTRO =
  '`dns.lookup` переводит имя в IP. `fetch` по hostname сам спрашивает DNS. Файл hosts может подменить имя локально.'

const CODE_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'lookup',
    label: 'lab/lookup.ts',
    note: 'Имя становится адресом до соединения.',
    executable: false,
    languageLabel: 'ts',
    code: `import dns from 'node:dns/promises';

export async function resolveHost(hostname: string) {
  const { address } = await dns.lookup(hostname); // ← имя → IP
  return address;
}

// resolveHost('api.example.com') → '203.0.113.10'
// нет имени → ENOTFOUND, HTTP ещё не начинался`,
  },
  {
    id: 'fetch',
    label: 'lab/fetch.ts',
    note: 'В URL — имя; резолв происходит сам.',
    executable: false,
    languageLabel: 'ts',
    code: `export async function loadUsers() {
  const res = await fetch('https://api.example.com/v1/users'); // ← DNS внутри
  return res.json();
}

// сначала имя → IP, потом уже GET
// опечатка в host → ошибка DNS, не 404`,
  },
  {
    id: 'hosts',
    label: 'hosts',
    note: 'Локальная подмена имени без опроса DNS.',
    executable: false,
    languageLabel: 'text',
    code: `# /etc/hosts  (Windows: drivers\\etc\\hosts)
127.0.0.1        localhost
203.0.113.10     api.example.com   # ← подмена для отладки

# строку легко забыть: «у меня другой IP, чем у всех»`,
  },
]

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

type DnsVizProps = {
  caseId: CaseId
  phase: Phase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function DnsViz({ caseId, phase, packetRef }: DnsVizProps) {
  const missing = caseId === 'missing'
  const stale = caseId === 'stale'
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'done'
  const doneOn = phase === 'done'
  const moving = phase !== 'idle'

  const name = missing ? 'no-such.example' : 'api.example.com'
  const ip = missing ? '—' : stale ? '198.51.100.8' : '203.0.113.10'

  const meta =
    phase === 'idle'
      ? 'имя → ?'
      : doneOn
        ? missing
          ? 'нет адреса'
          : stale
            ? 'старый IP'
            : 'есть IP'
        : phase === 'a'
          ? 'спрашиваем'
          : 'DNS'

  return (
    <LabVizPanel title="имя → адрес" meta={meta}>
      <div className={styles.row}>
        <div
          ref={packetRef}
          className={styles.packet}
          style={{ opacity: moving ? 1 : 0.45 }}
        >
          {name}
        </div>
        <div
          className={nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
            !aOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>клиент</span>
          <span className={labVizStyles.nodeSub}>hostname</span>
        </div>
        <span
          className={`${styles.arrow} ${bOn ? styles.arrowActive : styles.arrowIdle}`}
        >
          →
        </span>
        <div
          className={nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && !missing && labVizStyles.nodeOk,
            doneOn && missing && labVizStyles.nodeErr,
            !bOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>DNS</span>
          <span className={labVizStyles.nodeSub}>
            {!bOn ? 'кто это?' : missing ? 'не знаю' : stale ? 'помню старое' : 'нашёл'}
          </span>
        </div>
        <span
          className={`${styles.arrow} ${doneOn ? styles.arrowActive : styles.arrowIdle}`}
        >
          →
        </span>
        <div
          className={nodeCls(
            doneOn && !missing && labVizStyles.nodeOk,
            doneOn && missing && labVizStyles.nodeErr,
            doneOn && labVizStyles.nodeActive,
            !doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>адрес</span>
          <span className={labVizStyles.nodeSub}>{doneOn ? ip : '—'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const [caseId, setCaseId] = useState<CaseId>('ok')
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const packetRef = useRef<HTMLDivElement | null>(null)

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
    if (packetRef.current) gsap.set(packetRef.current, { x: 0, clearProps: 'x' })
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  const onRun = () => {
    if (running) return
    resetVisual()
    const missing = caseId === 'missing'
    const stale = caseId === 'stale'
    setRunning(true)
    setFinished(false)
    clear()
    log('info', missing ? 'no-such.example' : 'api.example.com')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('a')
          log('info', 'спрашиваем DNS')
        },
        () => {
          setPhase('b')
          if (missing) log('warn', 'имени нет')
          else if (stale) log('warn', 'ещё старый ответ')
          else log('ok', 'имя найдено')
        },
        () => {
          setPhase('done')
          if (missing) log('err', 'нет IP')
          else if (stale) log('ok', 'IP 198.51.100.8')
          else log('ok', 'IP 203.0.113.10')
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

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint =
    caseId === 'ok'
      ? 'Итог: имя стало IP — дальше можно соединяться.'
      : caseId === 'missing'
        ? 'Итог: имени нет, адреса не будет — это не «сайт лёг».'
        : 'Итог: DNS ещё помнит старый IP после смены адреса.'

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
        <LabButton variant="secondary" size="sm" disabled={running} onClick={onReset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <DnsViz phase={phase} caseId={caseId} packetRef={packetRef} />

      {finished ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

function CodePanel() {
  return (
    <div className={shell.codePane}>
      <InteractiveCodePanel topicId={TOPIC_ID} intro={CODE_INTRO} snippets={CODE_SNIPPETS} />
    </div>
  )
}

export function NetworkDnsBasicsLab() {
  return (
    <JsLabShell
      title="Базовое понимание DNS"
      lead="Имя → DNS → IP. Без адреса соединение не начнётся."
      code={<CodePanel />}
      problem={<ProblemPanel />}
    />
  )
}
