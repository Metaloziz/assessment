import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncXhrFetchLab.module.css'

const TOPIC_ID = '214-async-xhr-fetch'
const STEP = 0.6
type CaseId = 'ok404' | 'net'
type Phase = 'idle' | 'request' | 'response' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'ok404', label: 'HTTP 404' },
  { id: 'net', label: 'Сеть недоступна' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ok404: <>Сервер ответил <code>404</code>, поэтому <code>fetch</code> выполнил promise, но <code>res.ok</code> равно <code>false</code>.</>,
  net: <>Запрос не дошёл до сервера: сбой сети переводит promise <code>fetch</code> в <code>reject</code>.</>,
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'client-fetch',
    label: 'src/api/clientFetch.js',
    note: '`fetch` отвергает promise при сетевой ошибке, а HTTP-статус проверяет код клиента.',
    executable: false,
    code: `export async function loadProfile(id) {
  const res = await fetch(\`/api/users/\${id}\`);

  // ← HTTP-ответ есть даже при 404 / 500
  if (!res.ok) {
    throw new Error(\`HTTP \${res.status}\`);
  }

  return res.json();
}

loadProfile('42').catch(showError);`,
  },
  {
    id: 'legacy-xhr',
    label: 'src/api/legacyXhr.js',
    note: '`XMLHttpRequest` сообщает о завершении отдельно от проверки `status`.',
    executable: false,
    code: `export function loadLegacy(url, done) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url);

  xhr.onload = () => {
    // ← onload: HTTP-ответ получен, включая 404
    if (xhr.status >= 200 && xhr.status < 300) {
      done(null, JSON.parse(xhr.responseText));
    } else {
      done(new Error(\`HTTP \${xhr.status}\`));
    }
  };

  xhr.onerror = () => done(new Error('network failed')); // ← сеть
  xhr.send();
}`,
  },
]

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ')
}
function playTimeline(tlRef: MutableRefObject<gsap.core.Timeline | null>, steps: Array<() => void>, motion: ((tl: gsap.core.Timeline) => void) | null, onDone: () => void) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    steps.forEach((step) => step())
    onDone()
    return
  }
  const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power2.inOut' }, onComplete: onDone })
  tlRef.current = tl
  steps.forEach((step, index) => tl.call(step, undefined, index * STEP))
  motion?.(tl)
}

function FetchViz({ caseId, phase, panelRef }: { caseId: CaseId; phase: Phase; panelRef: MutableRefObject<HTMLDivElement | null> }) {
  const requested = phase !== 'idle'
  const settled = phase === 'response' || phase === 'done'
  const done = phase === 'done'
  const networkFailed = caseId === 'net' && done
  return (
    <LabVizPanel title="Билет запроса" meta={networkFailed ? 'сеть оборвала маршрут' : 'HTTP-ответ вернулся'}>
      <div ref={panelRef} className={styles.flow}>
        <div className={nodeCls(requested && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
          <span className={labVizStyles.nodeLabel}>fetch()</span><span className={labVizStyles.nodeSub}>JS создаёт request</span>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={nodeCls(requested && labVizStyles.nodeActive, networkFailed && labVizStyles.nodeErr, done && !networkFailed && labVizStyles.nodeOk)}>
          <span className={labVizStyles.nodeLabel}>network</span><span className={labVizStyles.nodeSub}>{networkFailed ? 'offline' : 'маршрут'}</span>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={nodeCls(settled && labVizStyles.nodeActive, done && (networkFailed ? labVizStyles.nodeErr : labVizStyles.nodeOk))}>
          <span className={labVizStyles.nodeLabel}>{networkFailed ? 'reject' : 'Response'}</span>
          <span className={labVizStyles.nodeSub}>{networkFailed ? 'TypeError' : done ? '404 · ok: false' : 'ожидает'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function AsyncXhrFetchLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('ok404')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<ReactNode | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const reset = () => { setPhase('idle'); setHint(null) }
  const selectCase = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => {
    const networkFailed = caseId === 'net'
    clear(); reset(); setBusy(true)
    playTimeline(tlRef, [
      () => { setPhase('request'); log('info', 'fetch: request отправлен') },
      () => { setPhase('response'); log(networkFailed ? 'err' : 'warn', networkFailed ? 'network: соединение не установлено' : 'Response: HTTP 404') },
      () => { setPhase('done'); log(networkFailed ? 'err' : 'warn', networkFailed ? 'promise: rejected' : 'res.ok: false') },
    ], (tl) => { if (panelRef.current) tl.to(panelRef.current, { y: -4, duration: 0.4 }, STEP) },
    () => { setBusy(false); setHint(networkFailed ? <>Итог: <code>catch</code> нужен для отказа сети; HTTP-статус здесь не появился.</> : <>Итог: <code>fetch</code> получил <code>Response</code>; проверка <code>res.ok</code> превращает <code>404</code> в ошибку приложения.</>) })
  }
  const problem = <div className={shell.panel}>
    <div className={shell.row}>
      {CASES.map((item) => <LabButton key={item.id} variant="ghost" size="sm" active={caseId === item.id} disabled={busy} onClick={() => selectCase(item.id)}>{item.label}</LabButton>)}
      <LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton>
      <LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('ok404'); reset() }}>Сброс</LabButton>
    </div>
    <p className={shell.pain}><code>fetch</code> различает доставку HTTP-ответа и успех приложения: <code>404</code> — это ответ, а разрыв сети — отказ promise.</p>
    <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
    <FetchViz caseId={caseId} phase={phase} panelRef={panelRef} />
    {hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} />
  </div>
  return <JsLabShell title="fetch · HTTP и сеть" lead="Ответ сервера и сбой соединения завершают `fetch` по разным веткам." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="`fetch`, `Response.ok` и legacy `XMLHttpRequest`: где отделять HTTP от сети." snippets={SNIPPETS} />} />
}
