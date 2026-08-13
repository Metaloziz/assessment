import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncCallbackHellLab.module.css'

const TOPIC_ID = '218-async-callback-hell'
const STEP = 0.6
type CaseId = 'pyramid' | 'flat'
type Phase = 'idle' | 'run' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'pyramid', label: 'Пирамида callback' },
  { id: 'flat', label: 'Promise chain' },
]
const CASE_BRIEF: Record<CaseId, ReactNode> = {
  pyramid: <>Три зависимости уходят вправо и вниз: обработка ошибки и контекст расползаются по вложенным функциям.</>,
  flat: <>Каждый <code>then</code> возвращает следующий шаг, поэтому цепочка читается сверху вниз.</>,
}
const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'nested-load',
    label: 'src/flows/nestedLoad.js',
    note: 'Вложенные callbacks быстро превращают последовательность загрузок в пирамиду.',
    executable: false,
    code: `export function nestedLoad(userId, done) {
  loadUser(userId, (userErr, user) => {
    if (userErr) return done(userErr); // ← ошибка на каждом уровне
    loadOrders(user.id, (ordersErr, orders) => {
      if (ordersErr) return done(ordersErr);
      loadInvoice(orders[0].id, (invoiceErr, invoice) => {
        if (invoiceErr) return done(invoiceErr);
        done(null, invoice); // ← третий уровень вложенности
      });
    });
  });
}`,
  },
  {
    id: 'flat-chain',
    label: 'src/flows/flatChain.js',
    note: '`return` передаёт результат шага дальше по одной линии.',
    executable: false,
    code: `export function flatChain(userId) {
  return loadUser(userId)
    .then((user) => loadOrders(user.id)) // ← результат в следующем then
    .then((orders) => loadInvoice(orders[0].id))
    .then((invoice) => saveInvoice(invoice))
    .catch(reportLoadError); // ← одна граница ошибки
}`,
  },
]
function reducedMotion() { return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches }
function nodeCls(...mods: Array<string | false | undefined>) { return [labVizStyles.node, styles.nodeGrow, ...mods.filter(Boolean)].join(' ') }
function playTimeline(tlRef: MutableRefObject<gsap.core.Timeline | null>, steps: Array<() => void>, onDone: () => void) {
  tlRef.current?.kill()
  if (reducedMotion()) { steps.forEach((step) => step()); onDone(); return }
  const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power2.inOut' }, onComplete: onDone })
  tlRef.current = tl
  steps.forEach((step, i) => tl.call(step, undefined, i * STEP))
}
function FlowViz({ caseId, phase, active }: { caseId: CaseId; phase: Phase; active: number }) {
  const pyramid = caseId === 'pyramid'
  const labels = ['loadUser', 'loadOrders', 'loadInvoice']
  return (
    <LabVizPanel title="Последовательность загрузки" meta={pyramid ? 'вложенные callback' : 'возврат Promise'}>
      <div className={styles.flow}>
        <div className={pyramid ? styles.stack : styles.row}>
          {labels.map((label, index) => (
            <div key={label} className={nodeCls(active === index && labVizStyles.nodeActive, phase === 'done' && labVizStyles.nodeOk, pyramid && index < active && styles.nodeDim)}>
              <span className={labVizStyles.nodeLabel}>{label}</span>
              <span className={labVizStyles.nodeSub}>{pyramid ? `level ${index + 1}` : index === 0 ? 'start' : 'then'}</span>
            </div>
          ))}
        </div>
        {!pyramid ? <span className={styles.arrow} aria-hidden>→ then → then</span> : null}
      </div>
    </LabVizPanel>
  )
}
export function AsyncCallbackHellLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('pyramid')
  const [phase, setPhase] = useState<Phase>('idle')
  const [active, setActive] = useState(-1)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const reset = () => { setPhase('idle'); setActive(-1); setHint(null) }
  const select = (next: CaseId) => { tlRef.current?.kill(); setBusy(false); setCaseId(next); clear(); reset() }
  const run = () => {
    clear(); reset(); setBusy(true)
    const pyramid = caseId === 'pyramid'
    playTimeline(tlRef, [0, 1, 2].map((index) => () => {
      setPhase(index === 2 ? 'done' : 'run'); setActive(index)
      log(index === 2 ? 'ok' : 'info', pyramid ? `callback level ${index + 1}` : index === 0 ? 'Promise создан' : `then ${index}`)
    }), () => { setBusy(false); setHint(pyramid ? 'Вложенность скрывает линейный порядок работы; Promise-цепочка держит его на одной оси.' : 'Итог: `return` из `then` связывает шаги без пирамиды функций.') })
  }
  const problem = <div className={shell.panel}>
    <div className={shell.row}>{CASES.map((c) => <LabButton key={c.id} variant="ghost" size="sm" active={caseId === c.id} disabled={busy} onClick={() => select(c.id)}>{c.label}</LabButton>)}<LabButton variant="primary" disabled={busy} onClick={run}>Запустить</LabButton><LabButton variant="secondary" disabled={busy} onClick={() => { tlRef.current?.kill(); setBusy(false); clear(); setCaseId('pyramid'); reset() }}>Сброс</LabButton></div>
    <p className={shell.pain}>Вложенные callbacks прячут последовательность работы и заставляют дублировать границы ошибок. <code>Promise</code> возвращает каждый шаг в общую цепочку.</p>
    <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
    <FlowViz caseId={caseId} phase={phase} active={active} />
    {hint ? <p className={shell.hint}>{hint}</p> : null}<LabLogView lines={lines} />
  </div>
  return <JsLabShell title="Callback hell → Promise chain" lead="Две формы одной последовательности асинхронных загрузок." problem={problem} code={<InteractiveCodePanel topicId={TOPIC_ID} intro="Вложенные callbacks и возврат `Promise` из каждого шага." snippets={SNIPPETS} />} />
}
