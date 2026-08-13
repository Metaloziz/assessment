import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncGeneratorsLab.module.css'

const TOPIC_ID = '221-async-generators'
const STEP = 0.6
type CaseId = 'range' | 'dialog'
type Phase = 'idle' | 'run' | 'done'
const CASES: Array<{ id: CaseId; label: string }> = [{ id: 'range', label: 'range()' }, { id: 'dialog', label: 'next(arg)' }]
const CASE_BRIEF: Record<CaseId, ReactNode> = {
  range: <><code>next()</code> возобновляет тело генератора до следующего <code>yield</code> и возвращает <code>{'{ value, done }'}</code>.</>,
  dialog: <>Аргумент из <code>next(arg)</code> становится результатом приостановленного <code>yield</code> внутри генератора.</>,
}
const SNIPPETS: InteractiveSnippet[] = [
  { id: 'range', label: 'src/iter/range.js', note: 'Синхронный генератор отдаёт значение порциями через iterator protocol.', executable: false, code: `export function* range() {
  yield 1; // ← next() => { value: 1, done: false }
  yield 2;
  yield 3;
  return 'done'; // ← { value: 'done', done: true }
}

const iterator = range();
iterator.next();` },
  { id: 'dialog', label: 'src/iter/dialog.js', note: 'Аргумент следующего `next` возвращается туда, где генератор остановился.', executable: false, code: `export function* dialog() {
  const name = yield 'Как вас зовут?'; // ← pause
  return \`Привет, \${name}\`;
}

const iterator = dialog();
iterator.next(); // { value: 'Как вас зовут?', done: false }
iterator.next('Анна'); // ← feeds yield
` },
]
function reducedMotion() { return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function nodeCls(...mods: Array<string | false | undefined>) { return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ') }
function playTimeline(tlRef: MutableRefObject<gsap.core.Timeline | null>, steps: Array<() => void>, onDone: () => void) { tlRef.current?.kill(); if (reducedMotion()) { steps.forEach((x) => x()); onDone(); return }; const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power2.inOut' }, onComplete: onDone }); tlRef.current = tl; steps.forEach((x, i) => tl.call(x, undefined, i * STEP)) }
function GeneratorViz({ caseId, phase, active }: { caseId: CaseId; phase: Phase; active: number }) {
  const dialog = caseId === 'dialog'
  const value = dialog ? (active < 1 ? 'Как вас зовут?' : active === 1 ? 'Анна → name' : 'Привет, Анна') : active < 0 ? '—' : active < 3 ? String(active + 1) : 'done'
  return <LabVizPanel title="Пауза генератора" meta={dialog ? 'yield ⇄ next(arg)' : 'yield 1 · 2 · 3'}><div className={styles.flow}>
    <div className={nodeCls(active >= 0 && labVizStyles.nodeActive, phase === 'done' && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>function*</span><span className={labVizStyles.nodeSub}>{active < 0 ? 'готов' : active === 2 ? 'завершён' : 'paused at yield'}</span></div><span className={styles.arrow} aria-hidden>→</span><div className={nodeCls(active >= 0 && labVizStyles.nodeActive)}><span className={labVizStyles.nodeLabel}>yield</span><span className={labVizStyles.nodeSub}>{value}</span></div><span className={styles.arrow} aria-hidden>→</span><div className={nodeCls(phase === 'done' && labVizStyles.nodeOk)}><span className={labVizStyles.nodeLabel}>{'{ value, done }'}</span><span className={labVizStyles.nodeSub}>{phase === 'done' ? 'iterator result' : 'ожидание'}</span></div>
  </div></LabVizPanel>
}
export function AsyncGeneratorsLab() {
  const { lines, log, clear } = useLabLog(); const [caseId, setCaseId] = useState<CaseId>('range'); const [phase, setPhase] = useState<Phase>('idle'); const [active, setActive] = useState(-1); const [hint, setHint] = useState<string | null>(null); const [busy, setBusy] = useState(false); const tlRef = useRef<gsap.core.Timeline | null>(null)
  const reset = () => { setPhase('idle'); setActive(-1); setHint(null) }
  const select = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => { clear(); reset(); setBusy(true); const dialog = caseId === 'dialog'; playTimeline(tlRef, [0, 1, 2].map((i) => () => { setActive(i); setPhase(i === 2 ? 'done' : 'run'); log(i === 2 ? 'ok' : 'info', dialog ? i === 0 ? 'next(): вопрос из yield' : i === 1 ? 'next("Анна"): аргумент вошёл в yield' : 'return: iterator.done = true' : i < 2 ? `next(): value ${i + 1}, done false` : 'next(): value 3, done false') }), () => { setBusy(false); setHint(dialog ? 'Итог: генератор — двусторонний диалог между телом и итератором.' : 'Итог: `yield` делит вычисление на возобновляемые шаги. Асинхронные генераторы используют другой протокол `asyncIterator`.') }) }
  const problem = <div className={shell.panel}><div className={shell.row}>{CASES.map((c) => <LabButton key={c.id} variant="ghost" size="sm" active={caseId === c.id} disabled={busy} onClick={() => select(c.id)}>{c.label}</LabButton>)}<LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton><LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('range'); reset() }}>Сброс</LabButton></div><p className={shell.pain}>Синхронный генератор сохраняет место выполнения на <code>yield</code> и продолжает работу только по вызову итератора. Асинхронные генераторы похожи по форме, но возвращают промисы.</p><p className={shell.hint}>{CASE_BRIEF[caseId]}</p><GeneratorViz caseId={caseId} phase={phase} active={active} />{hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} /></div>
  return <JsLabShell title="Генератор · пауза и next()" lead="Синхронный iterator отдаёт значения и принимает данные на границе yield." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="Синхронные `function*`, `yield` и двусторонний `next(arg)`." snippets={SNIPPETS} />} />
}
