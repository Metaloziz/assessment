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
import styles from './LoggingServerDebugBrowserLab.module.css'

const TOPIC_ID = '147-logging-server-debug-browser'
const STEP = 0.6

type CaseId = 'inspect' | 'breakpoint' | 'danger'
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'

type ProcessPayload = {
  kind: 'process'
  ok: boolean
  summary: string
  debugPort: number
  listening: boolean
}

type ScopePayload = {
  kind: 'scope'
  ok: boolean
  summary: string
  networkBody: { ok: boolean; chargeId: string }
  scopeLocals: Record<string, string>
}

type DangerPayload = {
  kind: 'danger'
  ok: boolean
  summary: string
  debugPort: number
  safe: boolean
}

type ScenarioPayload = ProcessPayload | ScopePayload | DangerPayload

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'inspect', label: 'Inspect' },
  { id: 'breakpoint', label: 'Scope' },
  { id: 'danger', label: 'Danger' },
]

const PAIN = (
  <>
    На GitHub Pages — только схема. Реальный attach: <code>cd server && npm run inspect:demo</code>,
    затем <code>chrome://inspect</code> и файлы <code>inspect-demo.mjs</code> на вкладке «Код».
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  inspect: (
    <>
      <code>npm run inspect:demo</code> → <code>127.0.0.1:3333</code> и inspector на{' '}
      <code>9229</code> → <code>chrome://inspect</code> → attach к Node.
    </>
  ),
  breakpoint: (
    <>
      В <code>inspect-demo.mjs</code> — <code>POST /pay</code> и <code>debugger;</code>: Network страницы
      видит <code>chargeId</code>, Scope Node — <code>cartId</code>, <code>token</code>.
    </>
  ),
  danger: (
    <>
      В демо <code>HOST = 127.0.0.1</code>; плохой пример — <code>--inspect=0.0.0.0:9229</code> и publish{' '}
      <code>9229</code> в интернет.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  inspect: 'Скрипты и запуск `server/inspect-demo.mjs` с `--inspect`.',
  breakpoint: 'Handler `POST /pay` в inspect-demo — пауза в Node DevTools, не в Network вкладки.',
  danger: 'localhost в демо vs проброс inspect-порта наружу в docker.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  inspect: [
    {
      id: 'pkg-inspect-demo',
      label: 'server/package.json',
      note: 'Локальный стенд темы 147; без Postgres.',
      executable: false,
      languageLabel: 'json',
      code: `{
  "scripts": {
    "inspect:demo": "node --inspect inspect-demo.mjs",
    "inspect:demo:break": "node --inspect-brk inspect-demo.mjs"
  }
}`,
    },
    {
      id: 'inspect-demo-start',
      label: 'server/inspect-demo.mjs · listen',
      note: 'После npm run inspect:demo — chrome://inspect → Remote Target.',
      executable: false,
      code: `const PORT = Number(process.env.INSPECT_DEMO_PORT ?? 3333);
const HOST = '127.0.0.1'; // ← только localhost

server.listen(PORT, HOST, () => {
  console.log(\`HTTP   http://\${HOST}:\${PORT}/\`);
  console.log(\`POST   http://\${HOST}:\${PORT}/pay\`);
  console.log(
    \`Debug  ws://127.0.0.1:\${process.debugPort} → chrome://inspect\`,
  );
});`,
    },
  ],
  breakpoint: [
    {
      id: 'inspect-demo-pay',
      label: 'server/inspect-demo.mjs · POST /pay',
      note: 'debugger срабатывает, когда DevTools attach к процессу Node.',
      executable: false,
      code: `if (req.method === 'POST' && url.pathname === '/pay') {
  const body = await readJson(req);
  const cartId = typeof body.cartId === 'string' ? body.cartId : 'cart-demo';
  const token = typeof body.token === 'string' ? body.token : 'tok-demo';
  const userId = 'user-42';

  debugger; // ← BREAKPOINT · Scope: cartId, token, userId

  const result = charge({ cartId, token });
  res.end(JSON.stringify({ ok: true, chargeId: result.id, userId }));
}

// Триггер: http://127.0.0.1:3333/ → «Оплатить» или curl POST /pay`,
    },
    {
      id: 'inspect-demo-trigger',
      label: 'terminal · триггер',
      note: 'Запрос уходит в Node; пауза — в inspect DevTools, не F12 страницы.',
      executable: false,
      code: `# cd server && npm run inspect:demo
# chrome://inspect → inspect → Sources → inspect-demo.mjs

curl -X POST http://127.0.0.1:3333/pay \\
  -H "Content-Type: application/json" \\
  -d '{"cartId":"c1","token":"secret"}'`,
    },
  ],
  danger: [
    {
      id: 'inspect-demo-host',
      label: 'server/inspect-demo.mjs · bind',
      note: 'Демо слушает только 127.0.0.1 — не 0.0.0.0.',
      executable: false,
      code: `const HOST = '127.0.0.1'; // ← inspect только с вашей машины
const PORT = 3333;

// Плохо в интернете:
// node --inspect=0.0.0.0:9229 …
// ports: ["9229:9229"] без VPN/firewall`,
    },
    {
      id: 'docker-note',
      label: 'docker-compose.dev.yml',
      note: '9229 наружу — только dev-машина / VPN.',
      executable: false,
      languageLabel: 'yaml',
      code: `services:
  api:
    command: node --inspect=0.0.0.0:9229 dist/server.js
    ports:
      - "9229:9229" # ← не prod в интернет
`,
    },
  ],
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function nodeCls(...parts: Array<string | false | undefined>) {
  return [labVizStyles.node, ...parts.filter(Boolean)].join(' ')
}

function CaseSwitch({
  value,
  disabled,
  onChange,
}: {
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          disabled={disabled}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

function scenarioFor(caseId: CaseId): ScenarioPayload {
  if (caseId === 'inspect') {
    return {
      kind: 'process',
      ok: true,
      summary: 'Inspector on :9229',
      debugPort: 9229,
      listening: true,
    }
  }
  if (caseId === 'breakpoint') {
    return {
      kind: 'scope',
      ok: true,
      summary: 'charge ch_demo',
      networkBody: { ok: true, chargeId: 'ch_demo' },
      scopeLocals: {
        cartId: 'cart-live',
        token: 'to…<<hidden>>',
        userId: 'user-42',
      },
    }
  }
  return {
    kind: 'danger',
    ok: true,
    summary: 'Порт 9229 наружу',
    debugPort: 9229,
    safe: false,
  }
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  data: ScenarioPayload | null
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function ServerDebugViz({ caseId, phase, data, focusRef }: VizProps) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'c' || phase === 'done'
  const cOn = phase === 'c' || phase === 'done'
  const doneOn = phase === 'done'

  const meta = !doneOn
    ? phase === 'idle'
      ? 'ожидание'
      : phase === 'a'
        ? caseId === 'inspect'
          ? 'node --inspect…'
          : caseId === 'breakpoint'
            ? 'POST /pay…'
            : 'docker…'
        : phase === 'b'
          ? caseId === 'breakpoint'
            ? 'Network…'
            : 'debugPort…'
          : caseId === 'breakpoint'
            ? 'Scope…'
            : 'итог…'
    : data?.ok
      ? 'ok'
      : 'err'

  if (caseId === 'inspect') {
    const processData = data?.kind === 'process' ? data : null
    const portSub = !bOn
      ? '9229?'
      : processData?.listening
        ? `:${processData.debugPort}`
        : '0 · off'
    const devtoolsSub = !cOn
      ? 'chrome://inspect'
      : processData?.listening
        ? 'attach ok'
        : 'нет порта'

    return (
      <LabVizPanel title="inspect · dev" meta={meta}>
        <div className={styles.linear}>
          <div
            className={`${styles.linearNode} ${nodeCls(aOn && !doneOn && labVizStyles.nodeActive, doneOn && styles.dim)}`}
          >
            <span className={labVizStyles.nodeLabel}>Terminal</span>
            <span className={labVizStyles.nodeSub}>
              {!aOn ? 'node --inspect' : doneOn ? (processData?.summary ?? '—') : 'запуск…'}
            </span>
          </div>
          <span className={styles.linearArrow} aria-hidden>
            ↓
          </span>
          <div
            className={`${styles.linearNode} ${nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !bOn && styles.dim,
            )}`}
          >
            <span className={labVizStyles.nodeLabel}>inspector</span>
            <span className={labVizStyles.nodeSub}>{portSub}</span>
          </div>
          <span className={styles.linearArrow} aria-hidden>
            ↓
          </span>
          <div
            ref={focusRef}
            className={`${styles.linearNode} ${nodeCls(
              cOn && !doneOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              doneOn && labVizStyles.nodeActive,
              !cOn && styles.dim,
            )}`}
          >
            <span className={labVizStyles.nodeLabel}>Chrome DevTools</span>
            <span className={labVizStyles.nodeSub}>{devtoolsSub}</span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  if (caseId === 'danger') {
    const dangerData = data?.kind === 'danger' ? data : null
    const checkSub = !bOn
      ? '0.0.0.0:9229?'
      : dangerData?.safe
        ? '0 · безопасно'
        : `:${dangerData?.debugPort ?? 9229} · риск`
    const outSub = !doneOn
      ? 'ещё нет'
      : dangerData?.safe
        ? 'prod: inspector off'
        : 'порт в интернет'

    return (
      <LabVizPanel title="danger · exposure" meta={meta}>
        <div className={styles.linear}>
          <div
            className={`${styles.linearNode} ${nodeCls(aOn && !doneOn && labVizStyles.nodeActive, doneOn && styles.dim)}`}
          >
            <span className={labVizStyles.nodeLabel}>контейнер</span>
            <span className={labVizStyles.nodeSub}>
              {!aOn ? 'publish 9229' : doneOn ? (dangerData?.summary ?? '—') : 'docker…'}
            </span>
          </div>
          <span className={styles.linearArrow} aria-hidden>
            ↓
          </span>
          <div
            className={`${styles.linearNode} ${nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && dangerData?.safe && labVizStyles.nodeOk,
              doneOn && dangerData && !dangerData.safe && labVizStyles.nodeErr,
              !bOn && styles.dim,
            )}`}
          >
            <span className={labVizStyles.nodeLabel}>debugPort</span>
            <span className={labVizStyles.nodeSub}>{checkSub}</span>
          </div>
          <span className={styles.linearArrow} aria-hidden>
            ↓
          </span>
          <div
            ref={focusRef}
            className={`${styles.linearNode} ${nodeCls(
              doneOn && dangerData?.safe && labVizStyles.nodeOk,
              doneOn && dangerData && !dangerData.safe && labVizStyles.nodeErr,
              doneOn && dangerData && !dangerData.safe && labVizStyles.nodeActive,
              !doneOn && styles.dim,
            )}`}
          >
            <span className={labVizStyles.nodeLabel}>интернет</span>
            <span className={labVizStyles.nodeSub}>{outSub}</span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const scopeData = data?.kind === 'scope' ? data : null
  const networkSub = !bOn
    ? '200 · body?'
    : scopeData
      ? `{ chargeId: ${scopeData.networkBody.chargeId} }`
      : '—'
  const scopeSub = !cOn
    ? 'locals?'
    : scopeData
      ? 'cartId · token · stack'
      : '—'
  const outSub = !doneOn ? 'ещё нет' : (scopeData?.summary ?? '—')

  return (
    <LabVizPanel title="scope · Network vs Node" meta={meta}>
      <div className={styles.fork}>
        <div
          className={`${styles.forkTop} ${nodeCls(aOn && !doneOn && labVizStyles.nodeActive, doneOn && styles.dim)}`}
        >
          <span className={labVizStyles.nodeLabel}>handler · POST /pay</span>
          <span className={labVizStyles.nodeSub}>{!aOn ? 'ожидание' : doneOn ? outSub : 'запрос…'}</span>
        </div>

        <div className={styles.forkLabels}>
          <span className={bOn ? styles.forkLabelsActive : styles.dim}>Network (сайт)</span>
          <span aria-hidden>↔</span>
          <span className={cOn ? styles.forkLabelsActive : styles.dim}>Scope (Node inspect)</span>
        </div>

        <div className={`${styles.forkBranch}${!bOn ? ` ${styles.pathOff}` : ''}`}>
          <div
            className={nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !bOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>HTTP Response</span>
            <span className={labVizStyles.nodeSub}>{networkSub}</span>
          </div>
        </div>

        <span className={styles.forkArrow} aria-hidden>
          {bOn && cOn ? '↔' : ''}
        </span>

        <div className={`${styles.forkBranch}${!cOn ? ` ${styles.pathOff}` : ''}`}>
          <div
            className={nodeCls(
              cOn && !doneOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !cOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Scope · Call Stack</span>
            <span className={labVizStyles.nodeSub}>{scopeSub}</span>
          </div>
        </div>

        <div
          ref={focusRef}
          className={`${styles.forkOut} ${nodeCls(
            doneOn && labVizStyles.nodeOk,
            doneOn && labVizStyles.nodeActive,
            !doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>контраст</span>
          <span className={labVizStyles.nodeSub}>{outSub}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LoggingServerDebugBrowserLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('inspect')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState<ScenarioPayload | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setData(null)
    if (focusRef.current)
      gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const finish = (payload: ScenarioPayload, hintText: string, logLine: string) => {
    setData(payload)
    setPhase('done')
    log('ok', logLine)
    setHint(hintText)
  }

  const runScenario = async () => {
    setPhase('a')
    const payload = scenarioFor(caseId)

    if (caseId === 'breakpoint') {
      log('info', 'POST http://127.0.0.1:3333/pay · inspect-demo.mjs')
      setPhase('b')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 280))
      setPhase('c')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 280))
      finish(
        payload,
        'Network — chargeId; Scope — cartId, token в inspect-demo.mjs',
        'Network vs Scope · ch_demo',
      )
    } else if (caseId === 'inspect') {
      log('info', 'cd server && npm run inspect:demo')
      setPhase('b')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 250))
      log('ok', 'http://127.0.0.1:3333 · ws://127.0.0.1:9229')
      setPhase('c')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 250))
      finish(
        payload,
        'chrome://inspect → Sources → inspect-demo.mjs',
        'inspect :9229 · DevTools attach',
      )
    } else {
      log('err', '--inspect=0.0.0.0:9229 в публичной сети')
      setPhase('b')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 250))
      setPhase('c')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 250))
      finish(
        payload,
        '9229 наружу — только dev-машина / VPN',
        'danger · порт 9229 опубликован',
      )
    }

    if (focusRef.current && !reducedMotion()) {
      gsap.fromTo(
        focusRef.current,
        { scale: 0.94, opacity: 0.45 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.inOut' },
      )
    }
    setBusy(false)
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    void runScenario()
  }

  const reset = () => {
    setBusy(false)
    clear()
    setCaseId('inspect')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} disabled={busy} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ServerDebugViz caseId={caseId} phase={phase} data={data} focusRef={focusRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <CaseSwitch value={caseId} onChange={selectCase} />
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Дебаг сервера через Chrome"
      lead="Схема на Pages; реальный стенд — server/inspect-demo.mjs и npm run inspect:demo."
      problem={problem}
      code={code}
    />
  )
}
