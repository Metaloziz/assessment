import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncAwaitLab.module.css'

const TOPIC_ID = '219-async-await'
const STEP = 0.6
type CaseId = 'serial' | 'parallel'
type Phase = 'idle' | 'run' | 'done'
const CASES: Array<{ id: CaseId; label: string }> = [{ id: 'serial', label: 'Последовательно' }, { id: 'parallel', label: 'Promise.all' }]
const CASE_BRIEF: Record<CaseId, ReactNode> = {
  serial: <><code>await a()</code> завершится раньше, чем начнётся <code>b()</code>: время ожидания складывается.</>,
  parallel: <><code>Promise.all</code> запускает независимые операции вместе и собирает результаты в одной точке.</>,
}
const SNIPPETS: InteractiveSnippet[] = [
  { id: 'serial', label: 'src/api/loadSerial.js', note: 'Вторая операция зависит от первого `await` только по времени, а не по данным.', executable: false, code: `export async function loadSerial() {
  const profile = await loadProfile(); // ← ждём A
  const feed = await loadFeed(); // ← B стартует после A
  return { profile, feed };
}` },
  { id: 'parallel', label: 'src/api/loadParallel.js', note: 'Промисы создаются до ожидания, поэтому сеть работает параллельно.', executable: false, code: `export async function loadParallel() {
  const profilePromise = loadProfile(); // ← A стартует
  const feedPromise = loadFeed(); // ← B стартует рядом
  const [profile, feed] = await Promise.all([profilePromise, feedPromise]);
  return { profile, feed }; // ← join
}` },
]
function reducedMotion() { return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function nodeCls(...mods: Array<string | false | undefined>) { return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ') }
function playTimeline(tlRef: MutableRefObject<gsap.core.Timeline | null>, steps: Array<() => void>, onDone: () => void) {
  tlRef.current?.kill()
  if (reducedMotion()) { steps.forEach((step) => step()); onDone(); return }
  const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power2.inOut' }, onComplete: onDone }); tlRef.current = tl
  steps.forEach((step, i) => tl.call(step, undefined, i * STEP))
}
function AwaitViz({ caseId, phase, active }: { caseId: CaseId; phase: Phase; active: number }) {
  const parallel = caseId === 'parallel'
  return <LabVizPanel title="Время ожидания" meta={parallel ? 'A ∥ B → join' : 'A → B'}>
    <div className={styles.flow}>
      <div className={parallel ? styles.col : styles.row}>
        {['A · profile', 'B · feed'].map((name, i) => <div key={name} className={nodeCls(active === i && labVizStyles.nodeActive, phase === 'done' && labVizStyles.nodeOk, !parallel && active === 1 && i === 0 && styles.nodeDim)}><span className={labVizStyles.nodeLabel}>{name}</span><span className={labVizStyles.nodeSub}>{active < i ? 'ждёт старт' : 'request'}</span></div>)}
      </div>
      <span className={styles.arrow} aria-hidden>→</span>
      <div className={nodeCls(active === 2 && labVizStyles.nodeActive, phase === 'done' && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>join</span><span className={labVizStyles.nodeSub}>результаты</span></div>
    </div>
  </LabVizPanel>
}
export function AsyncAwaitLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('serial'); const [phase, setPhase] = useState<Phase>('idle'); const [active, setActive] = useState(-1); const [hint, setHint] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const reset = () => { setPhase('idle'); setActive(-1); setHint(null) }
  const select = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => {
    clear(); reset(); setBusy(true); const parallel = caseId === 'parallel'
    playTimeline(tlRef, [0, 1, 2].map((i) => () => { setActive(i); setPhase(i === 2 ? 'done' : 'run'); log(i === 2 ? 'ok' : 'info', i === 0 ? 'A: request started' : i === 1 ? `${parallel ? 'B: request started параллельно' : 'A: готово, B: request started'}` : 'join: оба результата готовы') }), () => { setBusy(false); setHint(parallel ? 'Итог: независимые запросы должны стартовать до общего `await Promise.all`.' : 'Итог: последовательный `await` нужен, когда B использует результат A.') })
  }
  const problem = <div className={shell.panel}><div className={shell.row}>{CASES.map((c) => <LabButton key={c.id} variant="ghost" size="sm" active={caseId === c.id} disabled={busy} onClick={() => select(c.id)}>{c.label}</LabButton>)}<LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton><LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('serial'); reset() }}>Сброс</LabButton></div>
    <p className={shell.pain}><code>await</code> делает код линейным, но не определяет стратегию запуска: независимые операции можно начать вместе.</p><p className={shell.hint}>{CASE_BRIEF[caseId]}</p><AwaitViz caseId={caseId} phase={phase} active={active} />{hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} /></div>
  return <JsLabShell title="await · последовательно или вместе" lead="Ожидание результата и запуск работы — разные решения." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="Последовательный `await` и параллельный запуск через `Promise.all`." snippets={SNIPPETS} />} />
}
