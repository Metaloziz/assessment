import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncTasksMicrotasksLab.module.css'

const TOPIC_ID = '216-async-tasks-microtasks'
const STEP = 0.6
type CaseId = 'order' | 'drain'
type Phase = 'idle' | 'sync' | 'micro' | 'done'
const CASES: Array<{ id: CaseId; label: string }> = [{ id: 'order', label: 'then раньше timeout' }, { id: 'drain', label: 'Вложенный then' }]
const CASE_BRIEF: Record<CaseId, ReactNode> = {
  order: <>После синхронного кода <code>Promise.then</code> из microtask queue выполнится раньше <code>setTimeout(0)</code>.</>,
  drain: <>Новый <code>then</code>, добавленный внутри microtask, тоже будет выполнен до следующей task.</>,
}
const SNIPPETS: InteractiveSnippet[] = [
  { id: 'order', label: 'src/runtime/order.js', note: '`Promise.then` кладёт работу в microtask queue, а `setTimeout` — в task queue.', executable: false, code: `console.log('sync');

Promise.resolve().then(() => {
  console.log('microtask'); // ← перед timer
});

setTimeout(() => {
  console.log('timeout'); // ← следующая task
}, 0);
` },
  { id: 'nested-micro', label: 'src/runtime/nestedMicro.js', note: 'Очередь microtask дренируется полностью перед возвратом к task queue.', executable: false, code: `Promise.resolve().then(() => {
  console.log('first then');
  return Promise.resolve();
}).then(() => {
  console.log('nested then'); // ← всё ещё до timeout
});

setTimeout(() => console.log('timeout'), 0);
` },
]
function reducedMotion() { return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function nodeCls(...mods: Array<string | false | undefined>) { return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ') }
function playTimeline(tlRef: MutableRefObject<gsap.core.Timeline | null>, steps: Array<() => void>, motion: ((tl: gsap.core.Timeline) => void) | null, onDone: () => void) {
  tlRef.current?.kill()
  if (reducedMotion()) { steps.forEach((step) => step()); onDone(); return }
  const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power2.inOut' }, onComplete: onDone })
  tlRef.current = tl; steps.forEach((step, index) => tl.call(step, undefined, index * STEP)); motion?.(tl)
}
function QueuesViz({ caseId, phase, panelRef }: { caseId: CaseId; phase: Phase; panelRef: MutableRefObject<HTMLDivElement | null> }) {
  const micro = phase === 'micro' || phase === 'done'; const done = phase === 'done'; const nested = caseId === 'drain'
  return <LabVizPanel title="Две очереди" meta={done ? 'microtask queue очищена первой' : 'sync → microtask → task'}>
    <div ref={panelRef} className={styles.flow}>
      <div className={nodeCls(phase === 'sync' && labVizStyles.nodeActive, phase !== 'idle' && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>sync</span><span className={labVizStyles.nodeSub}>{phase === 'idle' ? 'script' : 'завершён'}</span></div>
      <span className={styles.arrow}>→</span>
      <div className={styles.queue}><p className={styles.label}>microtask queue</p><div className={nodeCls(micro && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>{nested ? 'then → then' : 'Promise.then'}</span><span className={labVizStyles.nodeSub}>{done ? 'выполнено' : 'ожидает'}</span></div></div>
      <span className={styles.arrow}>→</span>
      <div className={styles.queue}><p className={styles.label}>task queue</p><div className={nodeCls(done && labVizStyles.nodeActive, done && labVizStyles.nodeOk, micro && !done && styles.nodeDim)}><span className={labVizStyles.nodeLabel}>setTimeout</span><span className={labVizStyles.nodeSub}>{done ? 'после microtask' : 'ожидает'}</span></div></div>
    </div>
  </LabVizPanel>
}
export function AsyncTasksMicrotasksLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('order'); const [phase, setPhase] = useState<Phase>('idle'); const [hint, setHint] = useState<ReactNode | null>(null); const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null); const panelRef = useRef<HTMLDivElement | null>(null)
  const reset = () => { setPhase('idle'); setHint(null) }
  const selectCase = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => {
    const nested = caseId === 'drain'; clear(); reset(); setBusy(true)
    playTimeline(tlRef, [
      () => { setPhase('sync'); log('info', 'sync: script завершён') },
      () => { setPhase('micro'); log('ok', nested ? 'microtask: first then → nested then' : 'microtask: Promise.then') },
      () => { setPhase('done'); log('info', 'task: setTimeout callback') },
    ], (tl) => { if (panelRef.current) tl.to(panelRef.current, { y: -4, duration: 0.4 }, STEP) },
    () => { setBusy(false); setHint(nested ? <>Итог: очередь microtask дренируется, включая добавленный <code>then</code>, прежде чем начнётся <code>setTimeout</code>.</> : <>Итог: после sync-кода runtime сначала обработал <code>Promise.then</code>, затем task таймера.</>) })
  }
  const problem = <div className={shell.panel}><div className={shell.row}>
    {CASES.map((item) => <LabButton key={item.id} variant="ghost" size="sm" active={caseId === item.id} disabled={busy} onClick={() => selectCase(item.id)}>{item.label}</LabButton>)}
    <LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton><LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('order'); reset() }}>Сброс</LabButton>
  </div><p className={shell.pain}>После окончания текущего скрипта runtime сначала очищает <code>microtask queue</code>, и только потом берёт следующую <code>task</code>.</p><p className={shell.hint}>{CASE_BRIEF[caseId]}</p><QueuesViz caseId={caseId} phase={phase} panelRef={panelRef} />{hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} /></div>
  return <JsLabShell title="Tasks · microtasks" lead="Promise-обработчики имеют приоритет над следующей задачей таймера." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="Порядок `Promise.then`, `setTimeout(0)` и вложенных microtask." snippets={SNIPPETS} />} />
}
