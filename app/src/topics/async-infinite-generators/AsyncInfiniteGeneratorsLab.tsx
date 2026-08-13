import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncInfiniteGeneratorsLab.module.css'

const TOPIC_ID = '222-async-infinite-generators'
const STEP = 0.6
type CaseId = 'runaway' | 'take'
type Phase = 'idle' | 'run' | 'done'
const CASES: Array<{ id: CaseId; label: string }> = [{ id: 'runaway', label: 'Без stop' }, { id: 'take', label: 'take(3)' }]
const CASE_BRIEF: Record<CaseId, ReactNode> = {
  runaway: <><code>for...of</code> ждёт следующий элемент бесконечно: у источника нет естественного <code>done</code>.</>,
  take: <>Ограничение <code>take(3)</code> или <code>break</code> делает бесконечный источник конечным для потребителя.</>,
}
const SNIPPETS: InteractiveSnippet[] = [
  { id: 'ids', label: 'src/iter/ids.js', note: 'Бесконечный источник сам не сообщает об окончании.', executable: false, code: `export function* ids() {
  let id = 1;
  while (true) {
    yield id++; // ← бесконечный source
  }
}

for (const id of ids()) {
  save(id); // ← без break цикл не завершится
}` },
  { id: 'take', label: 'src/iter/take.js', note: 'Потребитель задаёт границу чтения, не меняя генератор-источник.', executable: false, code: `export function* take(iterable, count) {
  let seen = 0;
  for (const value of iterable) {
    yield value;
    if (++seen === count) break; // ← stop source
  }
}

const firstThree = [...take(ids(), 3)];` },
]
function reducedMotion() { return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function nodeCls(...mods: Array<string | false | undefined>) { return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ') }
function playTimeline(tlRef: MutableRefObject<gsap.core.Timeline | null>, steps: Array<() => void>, onDone: () => void) { tlRef.current?.kill(); if (reducedMotion()) { steps.forEach((x) => x()); onDone(); return }; const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power2.inOut' }, onComplete: onDone }); tlRef.current = tl; steps.forEach((x, i) => tl.call(x, undefined, i * STEP)) }
function InfiniteViz({ caseId, phase, active }: { caseId: CaseId; phase: Phase; active: number }) {
  const stopped = caseId === 'take' && phase === 'done'
  return <LabVizPanel title="Бесконечный источник" meta={caseId === 'take' ? 'consumer ограничивает поток' : 'consumer без границы'}><div className={styles.flow}>
    <div className={nodeCls(active >= 0 && labVizStyles.nodeActive, stopped && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>while (true)</span><span className={labVizStyles.nodeSub}>{active < 0 ? 'id = 1' : `yield ${active + 1}`}</span></div><span className={styles.arrow} aria-hidden>→</span><div className={styles.queue}>{[1, 2, 3].map((id, i) => <div key={id} className={nodeCls(active === i && labVizStyles.nodeActive, stopped && labVizStyles.nodeOk, active < i && styles.nodeDim)}><span className={labVizStyles.nodeLabel}>id {id}</span><span className={labVizStyles.nodeSub}>yield</span></div>)}</div><span className={styles.arrow} aria-hidden>→</span><div className={nodeCls(active >= 0 && labVizStyles.nodeActive, stopped ? labVizStyles.nodeOk : phase === 'done' && labVizStyles.nodeErr)}><span className={labVizStyles.nodeLabel}>consumer</span><span className={labVizStyles.nodeSub}>{stopped ? 'break · done' : phase === 'done' ? 'ждёт дальше' : 'for...of'}</span></div>
  </div></LabVizPanel>
}
export function AsyncInfiniteGeneratorsLab() {
  const { lines, log, clear } = useLabLog(); const [caseId, setCaseId] = useState<CaseId>('runaway'); const [phase, setPhase] = useState<Phase>('idle'); const [active, setActive] = useState(-1); const [hint, setHint] = useState<string | null>(null); const [busy, setBusy] = useState(false); const tlRef = useRef<gsap.core.Timeline | null>(null)
  const reset = () => { setPhase('idle'); setActive(-1); setHint(null) }
  const select = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => { clear(); reset(); setBusy(true); const take = caseId === 'take'; playTimeline(tlRef, [0, 1, 2].map((i) => () => { setActive(i); setPhase(i === 2 ? 'done' : 'run'); log(i === 2 ? (take ? 'ok' : 'warn') : 'info', i < 2 ? `source: yield id ${i + 1}` : take ? 'consumer: break after 3' : 'consumer: ждёт id 4 и дальше') }), () => { setBusy(false); setHint(take ? 'Итог: бесконечность безопасна, когда потребитель владеет явной границей чтения.' : 'Итог: без `break` или лимита бесконечный iterator удерживает цикл в работе.') }) }
  const problem = <div className={shell.panel}><div className={shell.row}>{CASES.map((c) => <LabButton key={c.id} variant="ghost" size="sm" active={caseId === c.id} disabled={busy} onClick={() => select(c.id)}>{c.label}</LabButton>)}<LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton><LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('runaway'); reset() }}>Сброс</LabButton></div><p className={shell.pain}>Бесконечный генератор полезен как источник значений, но не должен сам определять длину обработки. Границу задаёт потребитель через <code>break</code> или адаптер <code>take</code>.</p><p className={shell.hint}>{CASE_BRIEF[caseId]}</p><InfiniteViz caseId={caseId} phase={phase} active={active} />{hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} /></div>
  return <JsLabShell title="Бесконечный генератор · stop" lead="Источник может работать всегда, а потребитель обязан ограничивать чтение." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="Бесконечный `yield` и конечный consumer через `take`." snippets={SNIPPETS} />} />
}
