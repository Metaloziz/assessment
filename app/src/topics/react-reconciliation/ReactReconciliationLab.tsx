import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactReconciliationLab.module.css'

const TOPIC_ID = '196-react-reconciliation'
const STEP = 0.65

type CaseId = 'counter' | 'move' | 'index'
type Phase = 'idle' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'counter', label: 'Витрина · 0→1' },
  { id: 'move', label: 'Очередь · id' },
  { id: 'index', label: 'Очередь · индекс' },
]

const CODE_INTRO: Record<CaseId, string> = {
  counter: 'Клик «ещё»: снести всю карточку или поменять только цифру.',
  move: '`key={order.id}` — те же талоны, другой порядок.',
  index: '`key={i}` — React смотрит на окна, не на заказы.',
}

const SNIPPET_NAIVE: InteractiveSnippet = {
  id: 'naive-innerhtml',
  label: 'src/bakery/naiveDisplay.ts',
  note: 'Без reconcile: setCount сносит витрину через innerHTML.',
  executable: false,
  languageLabel: 'ts',
  code: `export const mountNaiveDisplay = (root: HTMLElement) => {
  let count = 0;

  const paint = () => {
    // ═══════════════════════════════════════════
    // NAIVE ← вся витрина новая
    // ═══════════════════════════════════════════
    root.innerHTML = \`
      <div class="display">
        <h1>Булочки на витрине</h1>
        <span>\${count}</span>
        <button type="button">ещё</button>
      </div>
    \`; // ← всё пересоздано
    root.querySelector('button')!.onclick = () => {
      count += 1;
      paint();
    };
  };

  paint();
};`,
}

const SNIPPET_RECONCILE_COUNTER: InteractiveSnippet = {
  id: 'reconcile-counter',
  label: 'src/bakery/patchDisplay.ts',
  note: 'Reconcile: в DOM уходит одна правка цифры.',
  executable: false,
  languageLabel: 'ts',
  code: `const prev = displayWithCount('0');
const next = displayWithCount('1');

// ═══════════════════════════════════════════
// RECONCILE ← только цифра
// ═══════════════════════════════════════════
const patch = diff(prev, next);
// [{ op: 'UPDATE', node: 'span', text: '1' }] ←

commit(domRoot, patch);`,
}

const SNIPPET_LIST_ID: InteractiveSnippet = {
  id: 'list-id-keys',
  label: 'src/bakery/OrderBoard.tsx',
  note: 'id в key — заказ узнан, талон двигают.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Order = { id: string; title: string };

export const OrderBoard = ({ orders }: { orders: Order[] }) => (
  <ul>
    {orders.map((order) => (
      <li key={order.id}>{order.title}</li> {/* ← MOVE */}
    ))}
  </ul>
);`,
}

const SNIPPET_LIST_INDEX: InteractiveSnippet = {
  id: 'list-index-keys',
  label: 'src/bakery/OrderBoardIndex.tsx',
  note: 'key = окно очереди — после сдвига REPLACE.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Order = { id: string; title: string };

export const OrderBoardIndex = ({ orders }: { orders: Order[] }) => (
  <ul>
    {orders.map((order, i) => (
      <li key={i}>{order.title}</li> {/* ← REPLACE */}
    ))}
  </ul>
);`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  counter: [SNIPPET_NAIVE, SNIPPET_RECONCILE_COUNTER],
  move: [SNIPPET_LIST_ID, SNIPPET_NAIVE],
  index: [SNIPPET_LIST_INDEX, SNIPPET_NAIVE],
}

const PAIN = 'Render после клика идёт всегда. Reconciliation решает: переписать экран целиком или точечно.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  counter: (
    <>
      Витрина <code>0 → 1</code>: слева всё новое, справа только цифра.
    </>
  ),
  move: (
    <>
      Очередь с <code>key=id</code>: те же талоны, другой порядок.
    </>
  ),
  index: (
    <>
      Очередь с <code>key=индекс</code>: в окнах 1–2 талоны новые.
    </>
  ),
}

type OrderRow = { id: string; label: string; short: string }

const ORDERS_BEFORE: OrderRow[] = [
  { id: 'croissant', label: 'Круассан', short: 'A' },
  { id: 'baguette', label: 'Багет', short: 'B' },
  { id: 'poppy', label: 'Мак', short: 'C' },
]

const ORDERS_AFTER: OrderRow[] = [
  { id: 'baguette', label: 'Багет', short: 'B' },
  { id: 'croissant', label: 'Круассан', short: 'A' },
  { id: 'poppy', label: 'Мак', short: 'C' },
]

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  onDone: () => void,
) => {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.5, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

const DisplayScreen = ({
  count,
  mode,
  flash,
}: {
  count: number
  mode: 'naive' | 'reconcile'
  flash: boolean
}) => {
  const allNew = flash && mode === 'naive'
  const countOnly = flash && mode === 'reconcile'

  return (
    <div className={styles.col}>
      <p className={[styles.colHead, mode === 'naive' ? styles.colHeadWarn : styles.colHeadOk].join(' ')}>
        {mode === 'naive' ? 'Без согласования' : 'С согласованием'}
      </p>
      <div
        className={[
          styles.shopScreen,
          allNew && styles.shopFlashWarn,
          countOnly && styles.shopFlashOk,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p className={[styles.shopLine, allNew && styles.lineFlash].filter(Boolean).join(' ')}>
          Булочная «Корица»
        </p>
        <p className={[styles.shopTitle, allNew && styles.lineFlash].filter(Boolean).join(' ')}>
          Булочки на витрине
        </p>
        <p
          className={[
            styles.shopCount,
            (allNew || countOnly) && styles.countFlash,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {count} шт.
        </p>
        <span className={[styles.shopBtn, allNew && styles.lineFlash].filter(Boolean).join(' ')}>ещё</span>
      </div>
      {flash ? (
        <p className={[styles.tag, mode === 'naive' ? styles.tagWarn : styles.tagOk].join(' ')}>
          {mode === 'naive' ? 'всё новое' : 'только цифра'}
        </p>
      ) : (
        <p className={styles.tagMuted}>—</p>
      )}
    </div>
  )
}

const DisplayCompareViz = ({ phase }: { phase: Phase }) => {
  const count = phase === 'idle' ? 0 : 1
  const flash = phase === 'done'

  return (
    <LabVizPanel title="Витрина" meta={flash ? 'после клика' : 'до клика'}>
      <div className={styles.layout}>
        <DisplayScreen count={count} mode="naive" flash={flash} />
        <div className={styles.mid}>
          <span className={styles.midArrow} aria-hidden>
            →
          </span>
        </div>
        <DisplayScreen count={count} mode="reconcile" flash={flash} />
      </div>
    </LabVizPanel>
  )
}

const OrderBoardViz = ({ phase, keyMode }: { phase: Phase; keyMode: 'id' | 'index' }) => {
  const isId = keyMode === 'id'
  const showAfter = phase === 'done'
  const rows = showAfter ? ORDERS_AFTER : ORDERS_BEFORE

  return (
    <LabVizPanel title="Очередь" meta={isId ? 'key = id' : 'key = индекс'}>
      <div className={styles.board}>
        {rows.map((row, i) => {
          const moved = showAfter && isId && i < 2
          const replaced = showAfter && !isId && i < 2
          return (
            <div
              key={`${row.id}-${i}-${showAfter ? 'a' : 'b'}`}
              className={[
                styles.ticket,
                moved && styles.ticketMove,
                replaced && styles.ticketNew,
                showAfter && !moved && !replaced && styles.ticketSame,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.ticketMark}>{row.short}</span>
              <span className={styles.ticketBody}>{row.label}</span>
              {showAfter ? (
                <span className={styles.ticketTag}>
                  {moved ? 'сдвиг' : replaced ? 'новый' : 'как был'}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
      {showAfter ? (
        <p className={[styles.tag, isId ? styles.tagOk : styles.tagWarn].join(' ')}>
          {isId ? 'те же талоны · другой порядок' : 'окна 1–2 · талоны новые'}
        </p>
      ) : (
        <p className={styles.tagMuted}>A → B → C</p>
      )}
    </LabVizPanel>
  )
}

export const ReactReconciliationLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('counter')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const finishCase = (id: CaseId) => {
    if (id === 'counter') {
      log('ok', 'только цифра')
      setHint('слева всё новое · справа только «шт.»')
    } else if (id === 'move') {
      log('ok', 'сдвиг')
      setHint('те же талоны · другой порядок')
    } else {
      log('warn', 'новые талоны')
      setHint('key=индекс · окна 1–2 новые')
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('done')
          finishCase(caseId)
        },
      ],
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('counter')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {caseId === 'counter' ? (
        <DisplayCompareViz phase={phase} />
      ) : (
        <OrderBoardViz phase={phase} keyMode={caseId === 'move' ? 'id' : 'index'} />
      )}

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
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
  )

  return (
    <JsLabShell
      title="Reconciliation"
      lead="Булочная: render идёт всегда — согласование решает, что трогать в DOM."
      problem={problem}
      code={code}
    />
  )
}
