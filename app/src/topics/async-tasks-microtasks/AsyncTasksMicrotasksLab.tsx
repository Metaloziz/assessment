import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './AsyncTasksMicrotasksLab.module.css'

const TOPIC_ID = '216-async-tasks-microtasks'

type CaseId = 'order' | 'drain'
type Phase = 'idle' | 'running' | 'done'
type Slot = 'empty' | 'waiting' | 'active' | 'done'

type OrderItem = {
  id: string
  label: string
  kind: 'sync' | 'micro' | 'macro'
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'order', label: 'then раньше timeout' },
  { id: 'drain', label: 'Вложенный then' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  order: (
    <>
      После sync runtime сначала дренирует <code>microtask queue</code> (
      <code>Promise.then</code>), и только потом берёт <code>setTimeout(0)</code>.
    </>
  ),
  drain: (
    <>
      <code>then</code>, поставленный внутри другого microtask, тоже успевает до следующей task.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  order: '`Promise.then` — microtask; `setTimeout(0)` — следующая macrotask после drain.',
  drain: 'Вложенный `then` попадает в ту же microtask queue и выполняется в этом же раунде.',
}

const SNIPPET_ORDER: InteractiveSnippet = {
  id: 'order',
  label: 'src/runtime/order.js',
  note: '`Promise.then` кладёт работу в microtask queue, а `setTimeout` — в task queue.',
  executable: false,
  code: `console.log('sync');

// ═══════════════════════════════════════════
// MICRO ← раньше следующего timeout
// ═══════════════════════════════════════════
Promise.resolve().then(() => {
  console.log('microtask'); // ← перед timer
});

setTimeout(() => {
  console.log('timeout'); // ← следующая task
}, 0);
`,
}

const SNIPPET_DRAIN: InteractiveSnippet = {
  id: 'nested-micro',
  label: 'src/runtime/nestedMicro.js',
  note: 'Очередь microtask дренируется полностью, включая вновь добавленные `then`.',
  executable: false,
  code: `// ═══════════════════════════════════════════
// DRAIN ← вложенный then в том же раунде
// ═══════════════════════════════════════════
Promise.resolve().then(() => {
  console.log('first then');
  return Promise.resolve();
}).then(() => {
  console.log('nested then'); // ← всё ещё до timeout
});

setTimeout(() => console.log('timeout'), 0);
`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  order: [SNIPPET_ORDER],
  drain: [SNIPPET_DRAIN],
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, styles.slot, ...mods.filter(Boolean)].join(' ')
}

function slotState(slot: Slot) {
  return {
    active: slot === 'active' && labVizStyles.nodeActive,
    ok: slot === 'done' && labVizStyles.nodeOk,
    dim: slot === 'empty' && styles.slotDim,
  }
}

type QueuesVizProps = {
  phase: Phase
  caseId: CaseId
  sync: Slot
  micro: Slot
  nested: Slot
  macro: Slot
  order: OrderItem[]
}

const QueuesViz = ({ phase, caseId, sync, micro, nested, macro, order }: QueuesVizProps) => {
  const showNested = caseId === 'drain'
  const done = phase === 'done'

  const meta =
    phase === 'idle'
      ? 'sync → microtask drain → task'
      : done
        ? 'microtask queue очищена раньше task'
        : micro === 'active' || nested === 'active'
          ? 'drain microtask queue'
          : macro === 'active'
            ? 'следующая macrotask'
            : 'script на call stack'

  const microLabel = showNested
    ? nested === 'done'
      ? 'then → then'
      : micro === 'done'
        ? 'first then'
        : 'then…'
    : 'Promise.then'

  const microSub =
    micro === 'active' || nested === 'active'
      ? 'выполняется'
      : micro === 'done' && (!showNested || nested === 'done')
        ? 'drain ок'
        : micro === 'waiting' || nested === 'waiting'
          ? 'в очереди'
          : 'очередь'

  return (
    <LabVizPanel title="Tasks · microtasks" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.lanes}>
          <div className={styles.lane}>
            <p className={styles.label}>sync</p>
            <div
              className={nodeCls(
                slotState(sync).active,
                slotState(sync).ok,
                phase !== 'idle' && sync === 'empty' && styles.slotDim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>script</span>
              <span className={labVizStyles.nodeSub}>
                {sync === 'active' ? 'идёт' : sync === 'done' ? 'завершён' : '—'}
              </span>
            </div>
          </div>

          <span className={styles.arrow} aria-hidden>
            →
          </span>

          <div className={styles.lane}>
            <p className={styles.label}>microtask queue</p>
            <div className={nodeCls(slotState(micro).active || slotState(nested).active, (micro === 'done' && (!showNested || nested === 'done')) && labVizStyles.nodeOk, slotState(micro).dim)}>
              <span className={labVizStyles.nodeLabel}>{microLabel}</span>
              <span className={labVizStyles.nodeSub}>{microSub}</span>
            </div>
            {showNested ? (
              <div
                className={nodeCls(
                  nested === 'active' && labVizStyles.nodeActive,
                  nested === 'done' && labVizStyles.nodeOk,
                  nested === 'empty' && styles.slotDim,
                  nested === 'waiting' && labVizStyles.nodeActive,
                )}
              >
                <span className={labVizStyles.nodeLabel}>nested then</span>
                <span className={labVizStyles.nodeSub}>
                  {nested === 'active'
                    ? 'выполняется'
                    : nested === 'done'
                      ? 'в том же drain'
                      : nested === 'waiting'
                        ? 'добавлен'
                        : '—'}
                </span>
              </div>
            ) : null}
          </div>

          <span className={styles.arrow} aria-hidden>
            →
          </span>

          <div className={styles.lane}>
            <p className={styles.label}>task queue</p>
            <div
              className={nodeCls(
                slotState(macro).active,
                slotState(macro).ok,
                (micro === 'active' || nested === 'active' || micro === 'waiting') && macro !== 'done' && styles.slotDim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>setTimeout</span>
              <span className={labVizStyles.nodeSub}>
                {macro === 'active' ? 'выполняется' : macro === 'done' ? 'после micro' : macro === 'waiting' ? 'ждёт drain' : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.orderRow} aria-live="polite">
          <span className={styles.orderLabel}>порядок</span>
          {order.length === 0 ? (
            <span className={styles.orderEmpty}>—</span>
          ) : (
            <ol className={styles.orderList}>
              {order.map((item, index) => (
                <li
                  key={item.id}
                  className={[
                    styles.orderChip,
                    item.kind === 'sync' && styles.orderSync,
                    item.kind === 'micro' && styles.orderMicro,
                    item.kind === 'macro' && styles.orderMacro,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.orderIndex}>{index + 1}</span>
                  {item.label}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </LabVizPanel>
  )
}

export function AsyncTasksMicrotasksLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('order')
  const [phase, setPhase] = useState<Phase>('idle')
  const [sync, setSync] = useState<Slot>('empty')
  const [micro, setMicro] = useState<Slot>('empty')
  const [nested, setNested] = useState<Slot>('empty')
  const [macro, setMacro] = useState<Slot>('empty')
  const [order, setOrder] = useState<OrderItem[]>([])
  const [hint, setHint] = useState<ReactNode | null>(null)
  const [busy, setBusy] = useState(false)

  const runIdRef = useRef(0)
  const seqRef = useRef(0)

  useEffect(() => () => {
    runIdRef.current += 1
  }, [])

  const pushOrder = (label: string, kind: OrderItem['kind']) => {
    seqRef.current += 1
    const item: OrderItem = { id: `o-${seqRef.current}`, label, kind }
    setOrder((prev) => [...prev, item])
  }

  const resetVisual = () => {
    setPhase('idle')
    setSync('empty')
    setMicro('empty')
    setNested('empty')
    setMacro('empty')
    setOrder([])
    setHint(null)
  }

  const selectCase = (next: CaseId) => {
    runIdRef.current += 1
    setBusy(false)
    setCaseId(next)
    clear()
    resetVisual()
  }

  const resetAll = () => {
    runIdRef.current += 1
    setBusy(false)
    clear()
    setCaseId('order')
    resetVisual()
  }

  const run = () => {
    const drain = caseId === 'drain'
    const runId = ++runIdRef.current
    seqRef.current = 0

    clear()
    resetVisual()
    setBusy(true)

    flushSync(() => {
      setPhase('running')
      setSync('active')
      setMicro('empty')
      setNested('empty')
      setMacro('empty')
      setOrder([])
    })
    log('info', 'sync: script стартовал')

    flushSync(() => {
      setSync('done')
      pushOrder('sync', 'sync')
      setMicro('waiting')
      setMacro('waiting')
      if (drain) setNested('empty')
    })
    log('info', 'sync: завершён — schedule then + setTimeout(0)')

    const finish = () => {
      if (runId !== runIdRef.current) return
      setPhase('done')
      setBusy(false)
      setHint(
        drain ? (
          <>
            Итог: оба <code>then</code> ушли в одном drain microtask queue; <code>setTimeout</code>{' '}
            стартовал только после этого.
          </>
        ) : (
          <>
            Итог: <code>Promise.then</code> из microtask queue выполнился раньше task таймера.
          </>
        ),
      )
    }

    if (drain) {
      Promise.resolve()
        .then(() => {
          if (runId !== runIdRef.current) return
          flushSync(() => {
            setMicro('active')
            pushOrder('first then', 'micro')
            setNested('waiting')
          })
          log('ok', 'microtask: first then')
          return Promise.resolve().then(() => {
            if (runId !== runIdRef.current) return
            flushSync(() => {
              setMicro('done')
              setNested('active')
              pushOrder('nested then', 'micro')
            })
            log('ok', 'microtask: nested then (тот же drain)')
          })
        })
        .then(() => {
          if (runId !== runIdRef.current) return
          flushSync(() => {
            setNested('done')
          })
        })

      window.setTimeout(() => {
        if (runId !== runIdRef.current) return
        flushSync(() => {
          setMacro('active')
          pushOrder('timeout', 'macro')
        })
        log('info', 'task: setTimeout callback')
        flushSync(() => {
          setMacro('done')
        })
        finish()
      }, 0)
      return
    }

    Promise.resolve().then(() => {
      if (runId !== runIdRef.current) return
      flushSync(() => {
        setMicro('active')
        pushOrder('then', 'micro')
      })
      log('ok', 'microtask: Promise.then')
      flushSync(() => {
        setMicro('done')
      })
    })

    window.setTimeout(() => {
      if (runId !== runIdRef.current) return
      flushSync(() => {
        setMacro('active')
        pushOrder('timeout', 'macro')
      })
      log('info', 'task: setTimeout callback')
      flushSync(() => {
        setMacro('done')
      })
      finish()
    }, 0)
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            disabled={busy}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={resetAll}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        После sync runtime сначала полностью очищает <code>microtask queue</code>, и только потом берёт
        следующую <code>task</code> — это видно в живом порядке колбэков.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <QueuesViz
        phase={phase}
        caseId={caseId}
        sync={sync}
        micro={micro}
        nested={nested}
        macro={macro}
        order={order}
      />

      {hint ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  return (
    <JsLabShell
      title="Tasks · microtasks"
      lead="Microtask из Promise обгоняет следующий setTimeout — даже с нулевой задержкой."
      problem={problem}
      code={
        <div className={styles.codePane}>
          <div className={styles.codeSwitch}>
            {CASES.map((item) => (
              <LabButton
                key={item.id}
                variant="ghost"
                size="sm"
                active={caseId === item.id}
                onClick={() => selectCase(item.id)}
              >
                {item.label}
              </LabButton>
            ))}
          </div>
          <InteractiveCodePanel
            key={caseId}
            topicId={TOPIC_ID}
            intro={CODE_INTRO[caseId]}
            snippets={CODE_SNIPPETS[caseId]}
          />
        </div>
      }
    />
  )
}
