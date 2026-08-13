import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncEventLoopLab.module.css'

const TOPIC_ID = '215-async-event-loop'
const STEP = 0.6
type CaseId = 'busy' | 'idle'
type Phase = 'idle' | 'stack' | 'queued' | 'done'
const CASES: Array<{ id: CaseId; label: string }> = [{ id: 'busy', label: 'Стек занят' }, { id: 'idle', label: 'Стек свободен' }]
const CASE_BRIEF: Record<CaseId, ReactNode> = {
  busy: <>Пока синхронная работа держит <code>call stack</code>, callback таймера ждёт в очереди задач.</>,
  idle: <>Пустой <code>call stack</code> позволяет event loop взять готовый callback <code>setTimeout</code>.</>,
}
const SNIPPETS: InteractiveSnippet[] = [
  { id: 'demo-order', label: 'src/runtime/demoOrder.js', note: '`setTimeout` добавляет callback в task queue, но не запускает его прямо из таймера.', executable: false, code: `console.log('sync: start');

setTimeout(() => {
  console.log('timeout callback'); // ← task queue → stack
}, 0);

console.log('sync: end'); // ← исполняется первым
` },
  { id: 'long-task', label: 'src/runtime/longTask.js', note: 'Долгий synchronous код не даёт event loop забрать уже готовую задачу.', executable: false, code: `export function blockMainThread(ms) {
  const started = performance.now();
  while (performance.now() - started < ms) {
    // ← call stack занят: timeout ждёт
  }
}

setTimeout(renderStatus, 0);
blockMainThread(800);
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
function LoopViz({ caseId, phase, panelRef }: { caseId: CaseId; phase: Phase; panelRef: MutableRefObject<HTMLDivElement | null> }) {
  const busy = caseId === 'busy'
  const queued = phase === 'queued' || phase === 'done'
  const done = phase === 'done'
  return <LabVizPanel title="Event loop" meta={busy && done ? 'очередь ждёт стек' : done ? 'callback взят в стек' : 'одна задача за обход'}>
    <div ref={panelRef} className={styles.flow}>
      <div className={styles.col}><p className={styles.label}>call stack</p><div className={styles.stack}>
        <div className={nodeCls(phase === 'stack' && labVizStyles.nodeActive, busy && done && labVizStyles.nodeErr, !busy && done && labVizStyles.nodeOk)}>
          <span className={labVizStyles.nodeLabel}>{busy && phase !== 'idle' ? 'longTask()' : !busy && done ? 'timeout()' : '∅'}</span><span className={labVizStyles.nodeSub}>{busy && done ? 'занят' : 'stack'}</span>
        </div>
      </div></div>
      <span className={styles.arrow}>↔</span>
      <div className={nodeCls(queued && labVizStyles.nodeActive, !busy && done && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>event loop</span><span className={labVizStyles.nodeSub}>{busy && done ? 'проверяет' : done ? 'перенёс' : 'ожидает'}</span></div>
      <span className={styles.arrow}>↔</span>
      <div className={styles.queue}><p className={styles.label}>task queue</p><div className={nodeCls(queued && labVizStyles.nodeActive, busy && done && labVizStyles.nodeErr, !busy && done && styles.nodeDim)}><span className={labVizStyles.nodeLabel}>timeout callback</span><span className={labVizStyles.nodeSub}>{busy && done ? 'ждёт' : done ? 'снят' : 'готовится'}</span></div></div>
    </div>
  </LabVizPanel>
}
export function AsyncEventLoopLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('busy'); const [phase, setPhase] = useState<Phase>('idle'); const [hint, setHint] = useState<ReactNode | null>(null); const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null); const panelRef = useRef<HTMLDivElement | null>(null)
  const reset = () => { setPhase('idle'); setHint(null) }
  const selectCase = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => {
    const blocked = caseId === 'busy'; clear(); reset(); setBusy(true)
    playTimeline(tlRef, [
      () => { setPhase('stack'); log('info', blocked ? 'stack: longTask выполняется' : 'stack: sync завершён') },
      () => { setPhase('queued'); log('info', 'task queue: timeout callback готов') },
      () => { setPhase('done'); log(blocked ? 'warn' : 'ok', blocked ? 'event loop: callback ждёт' : 'event loop: callback перенесён в stack') },
    ], (tl) => { if (panelRef.current) tl.to(panelRef.current, { x: 4, duration: 0.4 }, STEP) },
    () => { setBusy(false); setHint(blocked ? <>Итог: таймер истёк, но <code>call stack</code> ещё занят — очередь не исполняется параллельно.</> : <>Итог: event loop увидел пустой стек и передал callback из task queue.</>) })
  }
  const problem = <div className={shell.panel}><div className={shell.row}>
    {CASES.map((item) => <LabButton key={item.id} variant="ghost" size="sm" active={caseId === item.id} disabled={busy} onClick={() => selectCase(item.id)}>{item.label}</LabButton>)}
    <LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton><LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('busy'); reset() }}>Сброс</LabButton>
  </div><p className={shell.pain}>Event loop переносит задачу в <code>call stack</code> только между синхронными работами. Готовый таймер не прерывает текущую функцию.</p><p className={shell.hint}>{CASE_BRIEF[caseId]}</p><LoopViz caseId={caseId} phase={phase} panelRef={panelRef} />{hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} /></div>
  return <JsLabShell title="Event loop · task queue" lead="Стек и очередь задач работают по очереди, а не одновременно." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="`setTimeout`, task queue и долгий sync-код на main thread." snippets={SNIPPETS} />} />
}
