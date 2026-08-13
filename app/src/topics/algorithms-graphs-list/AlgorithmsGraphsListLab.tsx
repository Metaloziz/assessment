import { useEffect, useMemo, useRef, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import viz from './AlgorithmsGraphsListLab.module.css'

const TOPIC_ID = '134-algorithms-graphs-list'

type ListNode = { value: number; next: ListNode | null }
type Graph = Map<string, string[]>

function fromArray(arr: number[]): ListNode | null {
  let head: ListNode | null = null
  for (let i = arr.length - 1; i >= 0; i--) head = { value: arr[i]!, next: head }
  return head
}

function reverse(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null
  let cur = head
  while (cur) {
    const next = cur.next
    cur.next = prev
    prev = cur
    cur = next
  }
  return prev
}

function listToArray(head: ListNode | null): number[] {
  const out: number[] = []
  let cur = head
  while (cur) {
    out.push(cur.value)
    cur = cur.next
  }
  return out
}

function hasCycle(head: ListNode | null): boolean {
  let slow = head
  let fast = head
  while (fast && fast.next) {
    slow = slow!.next
    fast = fast.next.next
    if (slow === fast) return true
  }
  return false
}

function bfs(graph: Graph, start: string): string[] {
  const seen = new Set<string>([start])
  const q = [start]
  const order: string[] = []
  while (q.length) {
    const v = q.shift()!
    order.push(v)
    for (const to of graph.get(v) ?? []) {
      if (!seen.has(to)) {
        seen.add(to)
        q.push(to)
      }
    }
  }
  return order
}

function dfs(graph: Graph, start: string): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  function go(v: string) {
    seen.add(v)
    order.push(v)
    for (const to of graph.get(v) ?? []) {
      if (!seen.has(to)) go(to)
    }
  }
  go(start)
  return order
}

function parseListInput(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x))
    .slice(0, 8)
}

const undirected: Graph = new Map([
  ['A', ['B', 'C']],
  ['B', ['A', 'D']],
  ['C', ['A', 'D']],
  ['D', ['B', 'C']],
])

const directed: Graph = new Map([
  ['A', ['B']],
  ['B', ['C']],
  ['C', ['A']],
  ['D', ['A']],
])

/** Layout in viewBox 0..100 */
const POS: Record<string, { x: number; y: number }> = {
  A: { x: 28, y: 28 },
  B: { x: 72, y: 28 },
  C: { x: 28, y: 72 },
  D: { x: 72, y: 72 },
}

type Mode = 'list' | 'graph'
type GraphKind = 'undirected' | 'directed'
type TraverseKind = 'bfs' | 'dfs'

function ListChain({
  values,
  label,
  cycleToIndex,
  highlight,
}: {
  values: number[]
  label: string
  cycleToIndex?: number | null
  highlight?: boolean
}) {
  return (
    <div className={viz.listRow}>
      <span className={viz.listLabel}>{label}</span>
      {values.length === 0 ? (
        <span className={viz.nullMark}>null</span>
      ) : (
        values.map((v, i) => {
          const isCycleEnd = cycleToIndex != null && i === values.length - 1
          return (
            <span key={`${label}-${i}-${v}`} style={{ display: 'contents' }}>
              <div
                className={[
                  viz.node,
                  highlight ? viz.nodeHL : '',
                  isCycleEnd ? viz.nodeCycle : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <span className={viz.nodeValue}>{v}</span>
                <span className={viz.nodeNext}>•</span>
              </div>
              {i < values.length - 1 ? (
                <span className={viz.arrow} style={{ animationDelay: `${i * 45 + 20}ms` }}>
                  →
                </span>
              ) : cycleToIndex == null ? (
                <>
                  <span className={viz.arrow}>→</span>
                  <span className={viz.nullMark}>null</span>
                </>
              ) : (
                <>
                  <span className={viz.arrow}>↷</span>
                  <span className={viz.cycleHint}>
                    next → [{cycleToIndex}] ({values[cycleToIndex]})
                  </span>
                </>
              )}
            </span>
          )
        })
      )}
    </div>
  )
}

function GraphCanvas({
  kind,
  order,
  step,
}: {
  kind: GraphKind
  order: string[]
  step: number
}) {
  const graph = kind === 'undirected' ? undirected : directed
  const visited = new Set(order.slice(0, Math.max(0, step)))
  const current = step > 0 ? order[step - 1] : null

  const edges: Array<{ from: string; to: string; key: string }> = []
  for (const [from, tos] of graph) {
    for (const to of tos) {
      if (kind === 'undirected' && from > to) continue
      edges.push({ from, to, key: `${from}-${to}` })
    }
  }

  const activeEdgeKeys = new Set<string>()
  if (step >= 2) {
    const a = order[step - 2]!
    const b = order[step - 1]!
    activeEdgeKeys.add(a < b || kind === 'directed' ? `${a}-${b}` : `${b}-${a}`)
    if (kind === 'directed') activeEdgeKeys.add(`${a}-${b}`)
  }

  return (
    <div className={viz.graphWrap}>
      <svg className={viz.graphSvg} viewBox="0 0 100 100" role="img" aria-label="Граф">
        <defs>
          <marker
            id="arrowHead"
            markerWidth="5"
            markerHeight="5"
            refX="4.2"
            refY="2.5"
            orient="auto"
          >
            <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(139, 194, 255, 0.85)" />
          </marker>
          <marker
            id="arrowHeadActive"
            markerWidth="5"
            markerHeight="5"
            refX="4.2"
            refY="2.5"
            orient="auto"
          >
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#8bc2ff" />
          </marker>
        </defs>

        {edges.map(({ from, to, key }) => {
          const a = POS[from]!
          const b = POS[to]!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const len = Math.hypot(dx, dy) || 1
          const shrink = 12
          const x1 = a.x + (dx / len) * shrink
          const y1 = a.y + (dy / len) * shrink
          const x2 = b.x - (dx / len) * shrink
          const y2 = b.y - (dy / len) * shrink
          const isActive = activeEdgeKeys.has(key) || activeEdgeKeys.has(`${from}-${to}`)
          const muted = step > 0 && !isActive

          // self-ish cycle A←C uses slight curve for directed A-B-C triangle readability
          const curved = kind === 'directed' && from === 'C' && to === 'A'
          const d = curved
            ? `M ${x1} ${y1} Q 18 50 ${x2} ${y2}`
            : `M ${x1} ${y1} L ${x2} ${y2}`

          return (
            <path
              key={key}
              d={d}
              className={[viz.edge, isActive ? viz.edgeActive : '', muted ? viz.edgeMuted : '']
                .filter(Boolean)
                .join(' ')}
              markerEnd={kind === 'directed' ? (isActive ? 'url(#arrowHeadActive)' : 'url(#arrowHead)') : undefined}
            />
          )
        })}

        {Object.entries(POS).map(([id, p]) => {
          const isCurrent = current === id
          const isVisited = visited.has(id)
          return (
            <g
              key={id}
              className={[
                viz.vertex,
                isVisited ? viz.vertexVisited : '',
                isCurrent ? viz.vertexCurrent : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <circle className={viz.vertexCircle} cx={p.x} cy={p.y} r={11} />
              <text className={viz.vertexLabel} x={p.x} y={p.y}>
                {id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function AlgorithmsGraphsListLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('list')
  const [codeMode, setCodeMode] = useState<Mode>('list')
  const [listInput, setListInput] = useState('1,2,3,4')
  const [graphKind, setGraphKind] = useState<GraphKind>('undirected')
  const [traverse, setTraverse] = useState<TraverseKind>('bfs')
  const [hint, setHint] = useState<string | null>(null)

  const [listBefore, setListBefore] = useState<number[]>([1, 2, 3, 4])
  const [listAfter, setListAfter] = useState<number[] | null>(null)
  const [showCycle, setShowCycle] = useState(false)

  const [visitOrder, setVisitOrder] = useState<string[]>([])
  const [visitStep, setVisitStep] = useState(0)
  const timerRef = useRef<number | null>(null)

  const liveValues = useMemo(() => parseListInput(listInput), [listInput])

  const codePreviewValues = [1, 2, 3, 4]
  const codeGraphPreviewOrder = ['A', 'B', 'C', 'D']

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current)
    }
  }, [])

  const stopAnim = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const playVisit = (order: string[]) => {
    stopAnim()
    setVisitOrder(order)
    setVisitStep(0)
    let i = 0
    timerRef.current = window.setInterval(() => {
      i += 1
      setVisitStep(i)
      if (i >= order.length) stopAnim()
    }, 520)
  }

  const run = () => {
    if (mode === 'list') {
      const nums = liveValues.length ? liveValues : [1, 2, 3, 4]
      const reversed = listToArray(reverse(fromArray(nums)))
      const cycled = fromArray(nums)
      if (cycled && cycled.next) {
        let tail = cycled
        while (tail.next) tail = tail.next
        tail.next = cycled.next
      }
      const cycle = hasCycle(cycled)
      const noCycle = hasCycle(fromArray(nums))

      setListBefore(nums)
      setListAfter(reversed)
      setShowCycle(true)
      setHint(`reverse → [${reversed.join(', ')}]`)
      log('info', `список: [${nums.join(', ')}]`)
      log('ok', `разворот: [${reversed.join(', ')}]`)
      log('ok', `цикл (slow/fast) на ацикличном: ${noCycle}`)
      log('err', `цикл после замыкания хвост→второй: ${cycle}`)
      return
    }

    const g = graphKind === 'undirected' ? undirected : directed
    const order = traverse === 'bfs' ? bfs(g, 'A') : dfs(g, 'A')
    setHint(`${graphKind} · ${traverse.toUpperCase()}: ${order.join('→')}`)
    log(
      'info',
      graphKind === 'undirected'
        ? 'ненаправленный квадрат A–B–D–C'
        : 'направленный цикл A→B→C→A, плюс D→A',
    )
    log('ok', `${traverse.toUpperCase()} от A: ${order.join(' → ')}`)
    log('info', 'подсветка на схеме идёт по порядку обхода')
    playVisit(order)
  }

  const displayBefore = listAfter ? listBefore : liveValues.length ? liveValues : listBefore

  const listSnippets = [
    {
      id: 'reverse',
      label: 'Reverse list',
      note: 'Три указателя: `prev`, `cur`, `next`. Перекидываем ссылки. На схеме — цепочка `next`.',
      code: `function reverse(head) {
  let prev = null, cur = head;
  while (cur) {
    const next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  return prev;
}

const n3 = { value: 3, next: null };
const n2 = { value: 2, next: n3 };
const n1 = { value: 1, next: n2 };
let h = reverse(n1);
const out = [];
while (h) { out.push(h.value); h = h.next; }
console.log(out);`,
    },
    {
      id: 'cycle',
      label: 'Цикл',
      note: 'Slow +1, fast +2. Встретились — есть цикл. В списке у каждого узла один `next`.',
      code: `function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

const a = { value: 1, next: null };
const b = { value: 2, next: null };
a.next = b; b.next = a;
console.log(hasCycle(a));`,
    },
  ]

  const graphSnippets = [
    {
      id: 'bfs',
      label: 'BFS',
      note: 'Очередь + `Set` visited. На схеме — вершины и рёбра, не цепочка.',
      code: `function bfs(graph, start) {
  const seen = new Set([start]);
  const q = [start];
  const order = [];
  while (q.length) {
    const v = q.shift();
    order.push(v);
    for (const to of graph.get(v) ?? []) {
      if (!seen.has(to)) { seen.add(to); q.push(to); }
    }
  }
  return order;
}

const g = new Map([
  ['A', ['B', 'C']],
  ['B', ['A', 'D']],
  ['C', ['A']],
  ['D', ['B']],
]);
console.log(bfs(g, 'A'));`,
    },
    {
      id: 'dfs',
      label: 'DFS',
      note: 'Рекурсия или стек. Тот же `seen`, другой порядок по графу.',
      code: `function dfs(graph, start, seen = new Set(), order = []) {
  seen.add(start);
  order.push(start);
  for (const to of graph.get(start) ?? []) {
    if (!seen.has(to)) dfs(graph, to, seen, order);
  }
  return order;
}

const g = new Map([
  ['A', ['B']],
  ['B', ['C']],
  ['C', ['A']],
]);
console.log(dfs(g, 'A'));`,
    },
  ]

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Список — цепочка <code>next</code>; граф — вершины и рёбра. На схеме видно разворот и цикл,
        а также шаги <code>BFS</code>/<code>DFS</code>.
      </p>
      <ol className={shell.steps}>
        <li>Выберите режим Список или Граф.</li>
        <li>Задайте значения / тип графа и обход.</li>
        <li>Нажмите «Запустить» — смотрите картинку и лог.</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'list'}
          onClick={() => {
            stopAnim()
            setMode('list')
            setHint(null)
            setListAfter(null)
            setShowCycle(false)
          }}
        >
          Список
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'graph'}
          onClick={() => {
            stopAnim()
            setMode('graph')
            setHint(null)
            setVisitOrder([])
            setVisitStep(0)
          }}
        >
          Граф
        </LabButton>
      </div>

      <div className={shell.row}>
        {mode === 'list' ? (
          <label className={shell.field}>
            <span>значения (до 8)</span>
            <input value={listInput} onChange={(e) => setListInput(e.target.value)} />
          </label>
        ) : (
          <>
            <LabButton
              variant="ghost"
              size="sm"
              active={graphKind === 'undirected'}
              onClick={() => {
                stopAnim()
                setGraphKind('undirected')
                setVisitOrder([])
                setVisitStep(0)
              }}
            >
              Ненаправленный
            </LabButton>
            <LabButton
              variant="ghost"
              size="sm"
              active={graphKind === 'directed'}
              onClick={() => {
                stopAnim()
                setGraphKind('directed')
                setVisitOrder([])
                setVisitStep(0)
              }}
            >
              Направленный
            </LabButton>
            <LabButton
              variant="ghost"
              size="sm"
              active={traverse === 'bfs'}
              onClick={() => {
                stopAnim()
                setTraverse('bfs')
                setVisitOrder([])
                setVisitStep(0)
              }}
            >
              BFS
            </LabButton>
            <LabButton
              variant="ghost"
              size="sm"
              active={traverse === 'dfs'}
              onClick={() => {
                stopAnim()
                setTraverse('dfs')
                setVisitOrder([])
                setVisitStep(0)
              }}
            >
              DFS
            </LabButton>
          </>
        )}
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            stopAnim()
            setMode('list')
            setListInput('1,2,3,4')
            setGraphKind('undirected')
            setTraverse('bfs')
            setHint(null)
            setListBefore([1, 2, 3, 4])
            setListAfter(null)
            setShowCycle(false)
            setVisitOrder([])
            setVisitStep(0)
            clear()
          }}
        >
          Сброс
        </LabButton>
      </div>

      <LabVizPanel
        aria-live="polite"
        title={mode === 'list' ? 'Связный список' : `Граф · ${traverse.toUpperCase()}`}
        meta={
          mode === 'list'
            ? showCycle
              ? 'разворот + замыкание хвоста'
              : 'редактруйте значения → live'
            : graphKind === 'undirected'
              ? 'рёбра без стрелок'
              : 'рёбра со стрелками'
        }
      >
        {mode === 'list' ? (
          <div className={viz.listScene}>
            <ListChain values={displayBefore} label="до" />
            {listAfter ? (
              <ListChain values={listAfter} label="после reverse" highlight />
            ) : null}
            {showCycle && displayBefore.length >= 2 ? (
              <ListChain
                values={displayBefore}
                label="с циклом (хвост → второй)"
                cycleToIndex={1}
              />
            ) : null}
          </div>
        ) : (
          <>
            <GraphCanvas kind={graphKind} order={visitOrder} step={visitStep} />
            {visitOrder.length > 0 ? (
              <div className={viz.orderStrip}>
                {visitOrder.map((id, i) => (
                  <span key={`${id}-${i}`} style={{ display: 'contents' }}>
                    {i > 0 ? <span className={viz.orderSep}>→</span> : null}
                    <span
                      className={viz.orderChip}
                      style={{
                        animationDelay: `${i * 40}ms`,
                        opacity: i < visitStep ? 1 : 0.35,
                      }}
                    >
                      {id}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className={shell.hint}>Нажмите «Запустить», чтобы проиграть обход.</p>
            )}
          </>
        )}
      </LabVizPanel>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Картинка обновляется после «Запустить» (список — ещё и при вводе).</p>
      )}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={viz.codePane}>
      <div className={viz.codeSwitch}>
        <LabButton
          variant="ghost"
          size="sm"
          active={codeMode === 'list'}
          onClick={() => setCodeMode('list')}
        >
          Связный список
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={codeMode === 'graph'}
          onClick={() => setCodeMode('graph')}
        >
          Граф
        </LabButton>
      </div>

      <LabVizPanel
        compact
        className={viz.compactScene}
        title={codeMode === 'list' ? 'Цепочка узлов' : 'Вершины и рёбра'}
        meta={
          codeMode === 'list'
            ? 'value + next → … → null'
            : 'список смежности, ветвления и циклы'
        }
      >
        {codeMode === 'list' ? (
          <div className={viz.listScene}>
            <ListChain values={codePreviewValues} label="пример" />
            <ListChain
              values={codePreviewValues}
              label="с циклом"
              cycleToIndex={1}
            />
          </div>
        ) : (
          <>
            <GraphCanvas
              kind="undirected"
              order={codeGraphPreviewOrder}
              step={codeGraphPreviewOrder.length}
            />
            <div className={viz.orderStrip}>
              {codeGraphPreviewOrder.map((id, i) => (
                <span key={`code-${id}`} style={{ display: 'contents' }}>
                  {i > 0 ? <span className={viz.orderSep}>→</span> : null}
                  <span className={viz.orderChip}>{id}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </LabVizPanel>

      <InteractiveCodePanel
        key={codeMode}
        topicId={TOPIC_ID}
        intro={
          codeMode === 'list'
            ? 'Связный список: узлы с `next`. Сниппеты — разворот и поиск цикла.'
            : 'Граф: вершины и рёбра. Сниппеты — `BFS` и `DFS` со `visited`.'
        }
        snippets={codeMode === 'list' ? listSnippets : graphSnippets}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Список и граф: ссылки и обходы"
      lead="В «Код» и в «Решении» переключайте Список / Граф — схемы разные: цепочка next против вершин и рёбер."
      problem={problem}
      code={code}
    />
  )
}
