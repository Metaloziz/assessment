import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './ReactReconciliationLab.module.css'

const TOPIC_ID = '196-react-reconciliation'
const STEP = 0.7

type CaseId = 'counter' | 'move' | 'index'
type Phase = 'idle' | 'compare' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'counter', label: 'Счётчик · 0→1' },
  { id: 'move', label: 'Список · id' },
  { id: 'index', label: 'Список · индекс' },
]

const CODE_INTRO: Record<CaseId, string> = {
  counter:
    'Render в обоих случаях уже был — разница в том, что попадает в Real DOM: `innerHTML` всего блока или точечный UPDATE.',
  move: 'С `key={item.id}` React двигает строки; наивно часто пересобирают весь `<ul>`.',
  index: 'С `key={i}` React сравнивает слоты; наивно тоже полная пересборка, но без осмысленного MOVE.',
}

const SNIPPET_NAIVE: InteractiveSnippet = {
  id: 'naive-innerhtml',
  label: 'src/ui/naiveCounter.ts',
  note: 'Без reconcile: любой setCount сносит card целиком через innerHTML.',
  executable: false,
  languageLabel: 'ts',
  code: `export function mountNaive(root: HTMLElement) {
  let count = 0;

  function paint() {
    // ═══════════════════════════════════════════
    // NAIVE ← без reconcile: весь блок новый
    // ═══════════════════════════════════════════
    root.innerHTML = \`
      <div class="card">
        <h1>Счётчик</h1>
        <span>\${count}</span>
        <button type="button">+1</button>
      </div>
    \`; // ← div, h1, span, button пересозданы
    root.querySelector('button')!.onclick = () => {
      count += 1;
      paint(); // render был — DOM переписали целиком
    };
  }

  paint();
}`,
}

const SNIPPET_RECONCILE_COUNTER: InteractiveSnippet = {
  id: 'reconcile-counter',
  label: 'src/vdom/patch.ts',
  note: 'После render reconcile сравнивает снимки — в DOM уходит одна правка.',
  executable: false,
  languageLabel: 'ts',
  code: `// render уже вернул новое дерево (count = 1)
const prev = treeWithSpan('0');
const next = treeWithSpan('1');

// ═══════════════════════════════════════════
// RECONCILE ← type + key совпали у span
// ═══════════════════════════════════════════
const patch = diff(prev, next);
// [{ op: 'UPDATE', node: 'span', text: '1' }] ← только span

commit(domRoot, patch); // div, h1, button не трогаем`,
}

const SNIPPET_LIST_ID: InteractiveSnippet = {
  id: 'list-id-keys',
  label: 'src/TaskList.tsx',
  note: 'id в key — React узнаёт строку; наивный innerHTML списка пересоздал бы все li.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Item = { id: string; title: string };

export const TaskList = ({ items }: { items: Item[] }) => (
  <ul>
    {items.map((item) => (
      <li key={item.id}>{item.title}</li> {/* ← MOVE, не новый li */}
    ))}
  </ul>
);`,
}

const SNIPPET_LIST_INDEX: InteractiveSnippet = {
  id: 'list-index-keys',
  label: 'src/TaskListIndex.tsx',
  note: 'key = индекс слота; после reorder React думает, что содержимое заменилось.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Item = { id: string; title: string };

export const TaskListIndex = ({ items }: { items: Item[] }) => (
  <ul>
    {items.map((item, i) => (
      <li key={i}>{item.title}</li> {/* ← slot 0: ждали A, стало B → REPLACE */}
    ))}
  </ul>
);`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  counter: [SNIPPET_NAIVE, SNIPPET_RECONCILE_COUNTER],
  move: [SNIPPET_LIST_ID, SNIPPET_NAIVE],
  index: [SNIPPET_LIST_INDEX, SNIPPET_NAIVE],
}

const PAIN =
  'Render после setState всё равно идёт. Reconciliation решает, переписать ли Real DOM целиком (как innerHTML) или точечно — UPDATE, MOVE, REPLACE.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  counter: (
    <>
      <code>count: 0 → 1</code> — render в обоих путях уже был; слева <code>innerHTML</code> пересоздаёт
      весь card, справа reconcile меняет только текст <code>span</code>.
    </>
  ),
  move: (
    <>
      Reorder <code>[A,B,C] → [B,A,C]</code> с <code>key={'{item.id}'}</code> — React{' '}
      <strong>MOVE</strong>; наивно снесли бы весь список.
    </>
  ),
  index: (
    <>
      Тот же reorder с <code>key={'{i}'}</code> — React <strong>REPLACE</strong> в слотах 0 и 1; наивно
      тоже полная пересборка, но без «узнать строку по id».
    </>
  ),
}

type CounterNodeId = 'div' | 'h1' | 'span' | 'button'

type CounterNode = {
  id: CounterNodeId
  label: string
  sub: (count: number) => string
  indent?: boolean
}

const COUNTER_NODES: CounterNode[] = [
  { id: 'div', label: 'div.card', sub: () => 'корень' },
  { id: 'h1', label: 'h1', sub: () => 'Счётчик', indent: true },
  { id: 'span', label: 'span', sub: (c) => String(c), indent: true },
  { id: 'button', label: 'button', sub: () => '+1', indent: true },
]

type ListRow = { slot: number; label: string; entity: string }

const LIST_BEFORE: ListRow[] = [
  { slot: 0, label: 'Задача A', entity: 'a' },
  { slot: 1, label: 'Задача B', entity: 'b' },
  { slot: 2, label: 'Задача C', entity: 'c' },
]

const LIST_AFTER: ListRow[] = [
  { slot: 0, label: 'Задача B', entity: 'b' },
  { slot: 1, label: 'Задача A', entity: 'a' },
  { slot: 2, label: 'Задача C', entity: 'c' },
]

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, styles.treeNode, ...mods.filter(Boolean)].join(' ')
}

function slotCls(phase: Phase, kind: 'ok' | 'active' | 'warn' | 'muted' | 'idle') {
  if (phase === 'idle') return styles.slot
  if (kind === 'idle') return styles.slot
  return [
    styles.slot,
    kind === 'ok' && styles.slotOk,
    kind === 'active' && styles.slotActive,
    kind === 'warn' && styles.slotWarn,
    kind === 'muted' && styles.slotMuted,
  ]
    .filter(Boolean)
    .join(' ')
}

type NodeVisual = 'idle' | 'ok' | 'active' | 'warn'

function counterNodeVisual(phase: Phase, side: 'naive' | 'reconcile', id: CounterNodeId): NodeVisual {
  if (phase === 'idle') return 'idle'
  if (phase === 'compare') return side === 'naive' ? 'warn' : 'ok'
  if (side === 'naive') return 'warn'
  return id === 'span' ? 'active' : 'ok'
}

function counterNodeClass(v: NodeVisual) {
  if (v === 'active') return labVizStyles.nodeActive
  if (v === 'ok') return labVizStyles.nodeOk
  if (v === 'warn') return styles.nodeWarn
  return undefined
}

function CounterTrack({
  side,
  phase,
  count,
}: {
  side: 'naive' | 'reconcile'
  phase: Phase
  count: number
}) {
  const isNaive = side === 'naive'
  const pipeline =
    phase === 'idle'
      ? 'ожидание setCount'
      : phase === 'compare'
        ? 'render · count = 1'
        : isNaive
          ? 'innerHTML(card)'
          : 'reconcile → UPDATE span'

  return (
    <div className={styles.col}>
      <p className={[styles.colHead, isNaive ? styles.colHeadWarn : styles.colHeadOk].join(' ')}>
        {isNaive ? 'Без reconciliation' : 'С reconciliation'}
      </p>
      <p className={[styles.pipeline, phase !== 'idle' && styles.pipelineActive].join(' ')}>{pipeline}</p>
      <div className={styles.tree}>
        {COUNTER_NODES.map((n) => {
          const v = counterNodeVisual(phase, side, n.id)
          return (
            <div
              key={n.id}
              className={nodeCls(counterNodeClass(v), n.indent && styles.treeIndent)}
            >
              <span className={labVizStyles.nodeLabel}>{n.label}</span>
              <span className={labVizStyles.nodeSub}>{n.sub(count)}</span>
              {phase === 'done' ? (
                <span className={labVizStyles.nodeSub}>
                  {isNaive ? 'новый DOM-узел' : n.id === 'span' ? 'UPDATE текст' : 'тот же узел'}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CounterCompareViz({ phase }: { phase: Phase }) {
  const count = phase === 'idle' ? 0 : 1
  const showVerdict = phase === 'done'

  return (
    <LabVizPanel
      title="Счётчик: наивно vs reconcile"
      meta={phase === 'idle' ? 'шаг 1 · count=0' : phase === 'compare' ? 'шаг 2 · render' : 'шаг 3 · Real DOM'}
    >
      <p className={styles.dualNote}>
        Render уже был в обоих столбцах — reconciliation не отменяет вызов компонента, он экономит правки
        Real DOM.
      </p>
      <div className={styles.layout}>
        <CounterTrack side="naive" phase={phase} count={count} />
        <div className={styles.mid}>
          <span className={styles.midArrow} aria-hidden>
            {phase === 'idle' ? '→' : '⇅'}
          </span>
          <p className={styles.midLabel}>
            {phase === 'idle' ? 'setCount(1)' : phase === 'compare' ? 'новый снимок' : 'commit'}
          </p>
        </div>
        <CounterTrack side="reconcile" phase={phase} count={count} />
      </div>

      {showVerdict ? (
        <div className={styles.verdictRow}>
          <div className={[styles.verdict, styles.verdictActive, styles.verdictWarn, styles.verdictHalf].join(' ')}>
            <p className={styles.verdictTitle}>Наивно</p>
            <p className={styles.verdictText}>
              div, h1, span, button — все новые. Фокус и listeners на кнопке потеряны.
            </p>
          </div>
          <div className={[styles.verdict, styles.verdictActive, styles.verdictOk, styles.verdictHalf].join(' ')}>
            <p className={styles.verdictTitle}>Reconcile</p>
            <p className={styles.verdictText}>
              UPDATE только span: 0→1. Остальное дерево Real DOM не трогаем.
            </p>
          </div>
        </div>
      ) : (
        <div className={[styles.verdict, styles.verdictIdle].join(' ')}>
          <p className={styles.verdictText}>«Запустить» — setCount, render и два разных исхода для DOM.</p>
        </div>
      )}
    </LabVizPanel>
  )
}

function ListSlot({
  row,
  keyMode,
  phase,
  side,
}: {
  row: ListRow
  keyMode: 'id' | 'index'
  phase: Phase
  side: 'before' | 'after'
}) {
  const keyLabel = keyMode === 'id' ? `key = "${row.entity}"` : `key = ${row.slot}`

  let kind: 'ok' | 'active' | 'warn' | 'muted' | 'idle' = 'idle'
  if (phase === 'compare') {
    kind = side === 'before' ? 'active' : 'muted'
  } else if (phase === 'done') {
    if (keyMode === 'id') kind = 'ok'
    else kind = row.slot < 2 ? 'warn' : 'ok'
  }

  const beforeRow = LIST_BEFORE[row.slot]!
  const indexMismatch = keyMode === 'index' && phase === 'done' && side === 'after' && row.slot < 2

  return (
    <div className={slotCls(phase, kind)}>
      <span className={styles.slotPos}>место {row.slot + 1}</span>
      <span className={styles.slotKey}>{keyLabel}</span>
      <span className={styles.slotBody}>{row.label}</span>
      {indexMismatch ? (
        <span className={styles.slotKey}>
          React ждал «{beforeRow.label}» — увидел «{row.label}»
        </span>
      ) : null}
    </div>
  )
}

function ListViz({ phase, keyMode }: { phase: Phase; keyMode: 'id' | 'index' }) {
  const showAfter = phase !== 'idle'
  const isId = keyMode === 'id'

  const matchLabel = (slot: number) => {
    if (phase === 'idle') return '—'
    if (isId) return phase === 'done' ? `тот же ${LIST_AFTER[slot]!.entity}` : 'id?'
    return phase === 'done' ? (slot < 2 ? '≠' : '=') : 'слот?'
  }

  const matchCls = (slot: number) => {
    if (phase !== 'done') return styles.matchLine
    if (isId) return [styles.matchLine, styles.matchOk].join(' ')
    return [styles.matchLine, slot < 2 ? styles.matchWarn : styles.matchOk].join(' ')
  }

  return (
    <LabVizPanel
      title={isId ? 'Список · stable id' : 'Список · key = индекс'}
      meta={phase === 'idle' ? 'шаг 1 · было' : phase === 'compare' ? 'шаг 2 · render' : 'шаг 3 · Real DOM'}
    >
      <p className={styles.dualNote}>
        Render списка уже был. Вопрос — пересобрать весь <code>ul</code> (наивно) или сопоставить строки
        по key.
      </p>
      <div className={styles.layout}>
        <div className={styles.col}>
          <p className={styles.colHead}>Прошлый render</p>
          <p className={styles.colSub}>[A, B, C]</p>
          <div className={styles.slots}>
            {LIST_BEFORE.map((row) => (
              <ListSlot key={`b-${row.entity}`} row={row} keyMode={keyMode} phase={phase} side="before" />
            ))}
          </div>
        </div>

        <div className={styles.mid}>
          {phase !== 'idle' ? (
            <div className={styles.matchLines} aria-hidden>
              {[0, 1, 2].map((slot) => (
                <span key={slot} className={matchCls(slot)}>
                  {matchLabel(slot)}
                </span>
              ))}
            </div>
          ) : (
            <>
              <span className={styles.midArrow}>→</span>
              <p className={styles.midLabel}>reorder</p>
            </>
          )}
        </div>

        <div className={styles.col}>
          <p className={styles.colHead}>Новый render</p>
          <p className={styles.colSub}>[B, A, C]</p>
          {showAfter ? (
            <div className={styles.slots}>
              {LIST_AFTER.map((row, i) => (
                <ListSlot
                  key={`a-${row.entity}`}
                  row={{ ...row, slot: i }}
                  keyMode={keyMode}
                  phase={phase}
                  side="after"
                />
              ))}
            </div>
          ) : (
            <div className={styles.slots}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={slotCls('idle', 'muted')} style={{ opacity: 0.45 }}>
                  <span className={styles.slotBody}>появится после render</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className={[
          styles.verdict,
          phase === 'done' ? styles.verdictActive : styles.verdictIdle,
          phase === 'done' && (isId ? styles.verdictOk : styles.verdictWarn),
        ].join(' ')}
      >
        {phase === 'done' ? (
          isId ? (
            <>
              <p className={styles.verdictTitle}>Reconcile: MOVE</p>
              <p className={styles.verdictText}>
                key=a, b, c — те же строки, другой порядок. Наивный innerHTML пересоздал бы все три{' '}
                <code>li</code>.
              </p>
            </>
          ) : (
            <>
              <p className={styles.verdictTitle}>Reconcile: REPLACE</p>
              <p className={styles.verdictText}>
                key=0 и key=1 — слоты, не задачи. React пересоздаёт узлы; наивно тоже полная пересборка,
                но без попытки «узнать» строку по id.
              </p>
            </>
          )
        ) : (
          <p className={styles.verdictText}>Сначала прошлый render, затем новый — и сравнение с наивным путём.</p>
        )}
      </div>
    </LabVizPanel>
  )
}

export function ReactReconciliationLab() {
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
      log('ok', 'reconcile: UPDATE span · 0→1')
      setHint('render был — в DOM только текст span')
    } else if (id === 'move') {
      log('ok', 'reconcile: MOVE · не innerHTML ul')
      setHint('строки узнаны по id — не пересоздавали')
    } else {
      log('warn', 'reconcile: REPLACE · слоты 0,1')
      setHint('key=индекс — React сравнил места')
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    playTimeline(
      tlRef,
      [
        () => setPhase('compare'),
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
        <CounterCompareViz phase={phase} />
      ) : (
        <ListViz phase={phase} keyMode={caseId === 'move' ? 'id' : 'index'} />
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
    <div className={styles.codePane}>
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
      lead="Render всё равно идёт — reconciliation решает: переписать DOM целиком (innerHTML) или точечно."
      problem={problem}
      code={code}
    />
  )
}
