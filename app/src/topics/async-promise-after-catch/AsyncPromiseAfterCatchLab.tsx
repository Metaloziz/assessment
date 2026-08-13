import { Fragment, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncPromiseAfterCatchLab.module.css'

const TOPIC_ID = '220-async-promise-after-catch'
const STEP = 0.6
type CaseId = 'recover' | 'rethrow'
type Phase = 'idle' | 'run' | 'done'
const CASES: Array<{ id: CaseId; label: string }> = [{ id: 'recover', label: 'Восстановить' }, { id: 'rethrow', label: 'Пробросить' }]
const CASE_BRIEF: Record<CaseId, ReactNode> = {
  recover: <><code>catch</code> возвращает запасное значение, поэтому следующий <code>then</code> получает успешный результат.</>,
  rethrow: <><code>catch</code> бросает ошибку снова, и цепочка остаётся в состоянии <code>rejected</code>.</>,
}
const SNIPPETS: InteractiveSnippet[] = [
  { id: 'recover', label: 'src/errors/recover.js', note: 'Возвращённое из `catch` значение превращает цепочку в fulfilled.', executable: false, code: `loadSettings()
  .catch((error) => {
    report(error);
    return defaultSettings; // ← recover: Promise fulfilled
  })
  .then((settings) => render(settings)); // ← выполняется` },
  { id: 'rethrow', label: 'src/errors/rethrow.js', note: 'Новая ошибка из `catch` передаётся следующему обработчику ошибки.', executable: false, code: `loadSettings()
  .catch((error) => {
    report(error);
    throw new SettingsError(error); // ← rethrow: Promise rejected
  })
  .then(render)
  .catch(showSettingsFailure); // ← выполняется` },
]
function reducedMotion() { return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function nodeCls(...mods: Array<string | false | undefined>) { return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ') }
function playTimeline(tlRef: MutableRefObject<gsap.core.Timeline | null>, steps: Array<() => void>, onDone: () => void) { tlRef.current?.kill(); if (reducedMotion()) { steps.forEach((x) => x()); onDone(); return }; const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power2.inOut' }, onComplete: onDone }); tlRef.current = tl; steps.forEach((x, i) => tl.call(x, undefined, i * STEP)) }
function CatchViz({ caseId, phase, active }: { caseId: CaseId; phase: Phase; active: number }) {
  const recover = caseId === 'recover'
  const end = recover ? 'then · render' : 'catch · show failure'
  return <LabVizPanel title="Состояние цепочки" meta={recover ? 'rejected → fulfilled' : 'rejected → rejected'}><div className={styles.flow}>
    {['reject · load', 'catch · report', end].map((label, i) => <Fragment key={label}><div className={nodeCls(active === i && labVizStyles.nodeActive, phase === 'done' && i === 2 && (recover ? labVizStyles.nodeOk : labVizStyles.nodeErr), phase === 'done' && i < 2 && styles.nodeDim)}><span className={labVizStyles.nodeLabel}>{label}</span><span className={labVizStyles.nodeSub}>{i === 0 ? 'error' : i === 1 ? recover ? 'return value' : 'throw error' : recover ? 'ok' : 'error'}</span></div>{i < 2 ? <span className={styles.arrow} aria-hidden>→</span> : null}</Fragment>)}
  </div></LabVizPanel>
}
export function AsyncPromiseAfterCatchLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('recover'); const [phase, setPhase] = useState<Phase>('idle'); const [active, setActive] = useState(-1); const [hint, setHint] = useState<string | null>(null); const [busy, setBusy] = useState(false); const tlRef = useRef<gsap.core.Timeline | null>(null)
  const reset = () => { setPhase('idle'); setActive(-1); setHint(null) }
  const select = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => { clear(); reset(); setBusy(true); const recover = caseId === 'recover'; playTimeline(tlRef, [0, 1, 2].map((i) => () => { setActive(i); setPhase(i === 2 ? 'done' : 'run'); log(i === 0 ? 'err' : i === 2 && recover ? 'ok' : 'warn', i === 0 ? 'load: rejected' : i === 1 ? recover ? 'catch: return defaultSettings' : 'catch: throw SettingsError' : recover ? 'then: render defaultSettings' : 'catch: showSettingsFailure') }), () => { setBusy(false); setHint(recover ? 'Итог: значение из `catch` продолжает успешную ветку.' : 'Итог: `throw` из `catch` переносит ошибку к следующему `catch`.') }) }
  const problem = <div className={shell.panel}><div className={shell.row}>{CASES.map((c) => <LabButton key={c.id} variant="ghost" size="sm" active={caseId === c.id} disabled={busy} onClick={() => select(c.id)}>{c.label}</LabButton>)}<LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton><LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('recover'); reset() }}>Сброс</LabButton></div><p className={shell.pain}><code>catch</code> не завершает цепочку сам по себе: его <code>return</code> или <code>throw</code> выбирает состояние следующего шага.</p><p className={shell.hint}>{CASE_BRIEF[caseId]}</p><CatchViz caseId={caseId} phase={phase} active={active} />{hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} /></div>
  return <JsLabShell title="Что после catch" lead="Обработчик ошибки либо возвращает данные, либо отправляет ошибку дальше." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="Два выхода из `catch`: `return` для восстановления и `throw` для проброса." snippets={SNIPPETS} />} />
}
