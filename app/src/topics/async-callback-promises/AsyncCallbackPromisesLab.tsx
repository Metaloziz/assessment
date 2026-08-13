import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncCallbackPromisesLab.module.css'

const TOPIC_ID = '217-async-callback-promises'
const STEP = 0.6
type CaseId = 'cb' | 'promise'
type Phase = 'idle' | 'pending' | 'handoff' | 'done'
const CASES: Array<{ id: CaseId; label: string }> = [{ id: 'cb', label: 'err-first callback' }, { id: 'promise', label: 'Promise chain' }]
const CASE_BRIEF: Record<CaseId, ReactNode> = {
  cb: <>Callback получает результат как <code>(err, value)</code>; обработчик должен развести обе ветки сам.</>,
  promise: <>Executor запускается синхронно, а результат проходит из <code>pending</code> в <code>fulfilled</code> или <code>rejected</code>.</>,
}
const SNIPPETS: InteractiveSnippet[] = [
  { id: 'load-user-callback', label: 'src/data/loadUserCb.js', note: 'Node-style callback передаёт ошибку первым аргументом и результат вторым.', executable: false, code: `export function loadUserCb(id, done) {
  fetch(\`/api/users/\${id}\`)
    .then((res) => {
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return res.json();
    })
    .then((user) => done(null, user)) // ← err-first: успех
    .catch((err) => done(err)); // ← err-first: ошибка
}

loadUserCb('42', (err, user) => {
  if (err) return showError(err);
  renderUser(user);
});` },
  { id: 'load-user-promise', label: 'src/data/loadUserPromise.js', note: 'Executor стартует сразу, а `then` и `catch` подписываются на состояние promise.', executable: false, code: `export function loadUser(id) {
  return new Promise((resolve, reject) => {
    // ← executor выполняется синхронно
    fetch(\`/api/users/\${id}\`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(res.status)))
      .then(resolve, reject);
  });
}

loadUser('42')
  .then(renderUser) // ← fulfilled
  .catch(showError); // ← rejected` },
]
function reducedMotion() { return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function nodeCls(...mods: Array<string | false | undefined>) { return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ') }
function playTimeline(tlRef: MutableRefObject<gsap.core.Timeline | null>, steps: Array<() => void>, motion: ((tl: gsap.core.Timeline) => void) | null, onDone: () => void) {
  tlRef.current?.kill()
  if (reducedMotion()) { steps.forEach((step) => step()); onDone(); return }
  const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power2.inOut' }, onComplete: onDone })
  tlRef.current = tl; steps.forEach((step, index) => tl.call(step, undefined, index * STEP)); motion?.(tl)
}
function HandoffViz({ caseId, phase, panelRef }: { caseId: CaseId; phase: Phase; panelRef: MutableRefObject<HTMLDivElement | null> }) {
  const promise = caseId === 'promise'; const started = phase !== 'idle'; const done = phase === 'done'
  return <LabVizPanel title={promise ? 'Состояния Promise' : 'Передача callback'} meta={promise ? (done ? 'pending → fulfilled' : 'результат ожидается') : (done ? 'callback получил value' : 'ожидание I/O')}>
    <div ref={panelRef} className={styles.flow}>
      <div className={nodeCls(started && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>{promise ? 'executor' : 'loadUserCb'}</span><span className={labVizStyles.nodeSub}>{promise ? 'sync start' : 'I/O'}</span></div>
      <span className={styles.arrow}>→</span>
      <div className={nodeCls(phase === 'pending' && labVizStyles.nodeActive, phase === 'handoff' && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>{promise ? (done ? 'Fulfilled' : 'Pending') : '(err, value)'}</span><span className={labVizStyles.nodeSub}>{promise ? (done ? 'user' : 'state') : done ? 'null, user' : 'callback'}</span></div>
      <span className={styles.arrow}>→</span>
      <div className={nodeCls(phase === 'handoff' && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>{promise ? '.then()' : 'renderUser'}</span><span className={labVizStyles.nodeSub}>{done ? 'результат' : 'обработчик'}</span></div>
    </div>
  </LabVizPanel>
}
export function AsyncCallbackPromisesLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('cb'); const [phase, setPhase] = useState<Phase>('idle'); const [hint, setHint] = useState<ReactNode | null>(null); const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null); const panelRef = useRef<HTMLDivElement | null>(null)
  const reset = () => { setPhase('idle'); setHint(null) }
  const selectCase = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => {
    const promise = caseId === 'promise'; clear(); reset(); setBusy(true)
    playTimeline(tlRef, [
      () => { setPhase('pending'); log('info', promise ? 'executor: запущен синхронно' : 'loadUserCb: I/O начат') },
      () => { setPhase('handoff'); log('info', promise ? 'Promise: pending' : 'callback: (null, user)') },
      () => { setPhase('done'); log('ok', promise ? 'then: user получен' : 'renderUser: user получен') },
    ], (tl) => { if (panelRef.current) tl.to(panelRef.current, { x: 4, duration: 0.4 }, STEP) },
    () => { setBusy(false); setHint(promise ? <>Итог: executor уже завершил синхронную часть, а <code>then</code> получил значение после перехода <code>fulfilled</code>.</> : <>Итог: err-first callback передал <code>null</code> и значение в один обработчик; ветка ошибки была бы в <code>err</code>.</>) })
  }
  const problem = <div className={shell.panel}><div className={shell.row}>
    {CASES.map((item) => <LabButton key={item.id} variant="ghost" size="sm" active={caseId === item.id} disabled={busy} onClick={() => selectCase(item.id)}>{item.label}</LabButton>)}
    <LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton><LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('cb'); reset() }}>Сброс</LabButton>
  </div><p className={shell.pain}>Callback передаёт продолжение работы вручную, а <code>Promise</code> хранит состояние результата и направляет его в цепочку обработчиков.</p><p className={shell.hint}>{CASE_BRIEF[caseId]}</p><HandoffViz caseId={caseId} phase={phase} panelRef={panelRef} />{hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} /></div>
  return <JsLabShell title="Callbacks · Promise" lead="Два способа передать будущий результат: аргументом callback или состоянием promise." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="err-first callback, синхронный executor и цепочки `then` / `catch`." snippets={SNIPPETS} />} />
}
