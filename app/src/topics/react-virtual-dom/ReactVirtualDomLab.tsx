import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './ReactVirtualDomLab.module.css'

const TOPIC_ID = '185-react-virtual-dom'
const STEP = 0.65

type CaseId = 'naive' | 'diff' | 'skip'
type Phase = 'idle' | 'render' | 'compare' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'naive', label: 'Без VDOM' },
  { id: 'diff', label: 'Diff → patch' },
  { id: 'skip', label: 'Снимок тот же' },
]

const CODE_INTRO: Record<CaseId, string> = {
  naive: 'Каждый клик — `innerHTML` всего списка: Real DOM пересоздаётся целиком.',
  diff: '`createElement` → снимок → `diff` → точечный `patch` текста.',
  skip: 'Новый снимок равен старому — `commit` в Real DOM не пишет.',
}

const SNIPPET_NAIVE: InteractiveSnippet = {
  id: 'naive-innerhtml',
  label: 'src/ui/naiveCounter.ts',
  note: 'Без снимка: любой `setCount` сносит и собирает разметку заново.',
  executable: false,
  languageLabel: 'ts',
  code: `export function mountNaive(root: HTMLElement) {
  let count = 0;

  function paint() {
    // ═══════════════════════════════════════════
    // NAIVE ← полный rewrite Real DOM
    // ═══════════════════════════════════════════
    root.innerHTML = \`
      <div class="card">
        <h1>Счётчик</h1>
        <span>\${count}</span>
        <button type="button">+1</button>
      </div>
    \`; // ← все узлы новые: фокус / listeners теряются
    root.querySelector('button')!.onclick = () => {
      count += 1;
      paint();
    };
  }

  paint();
}`,
}

const SNIPPET_VNODE: InteractiveSnippet = {
  id: 'vnode-create',
  label: 'src/vdom/createElement.ts',
  note: 'Снимок UI — JS-объект, не `HTMLElement`.',
  executable: false,
  languageLabel: 'ts',
  code: `export type VNode = {
  type: string;
  props: Record<string, unknown>;
  children: Array<VNode | string>;
};

// ═══════════════════════════════════════════
// VDOM ← описание узла в JS
// ═══════════════════════════════════════════
export function createElement(
  type: string,
  props: Record<string, unknown> | null,
  ...children: Array<VNode | string>
): VNode {
  return { type, props: props ?? {}, children }; // ← ещё не DOM
}

export function renderCounter(count: number): VNode {
  return createElement('div', { className: 'card' },
    createElement('h1', null, 'Счётчик'),
    createElement('span', null, String(count)), // ← меняется текст
    createElement('button', { type: 'button' }, '+1'),
  );
}`,
}

const SNIPPET_DIFF: InteractiveSnippet = {
  id: 'vdom-diff-patch',
  label: 'src/vdom/diff.ts',
  note: '`diff` решает, что трогать; `patch` пишет в Real DOM только это.',
  executable: false,
  languageLabel: 'ts',
  code: `import type { VNode } from './createElement';

type Patch =
  | { op: 'text'; path: string; value: string }
  | { op: 'none' };

// ═══════════════════════════════════════════
// DIFF ← сравнить снимки до DOM
// ═══════════════════════════════════════════
export function diff(prev: VNode, next: VNode): Patch {
  // упрощение: деревья одной формы, смотрим текст span
  const prevText = String(prev.children[1]);
  const nextText = String(next.children[1]);
  if (prevText === nextText) return { op: 'none' }; // ← skip commit
  return { op: 'text', path: 'div>span', value: nextText }; // ← patch
}

export function commit(root: HTMLElement, patch: Patch) {
  if (patch.op === 'none') return; // ← Real DOM не трогаем
  root.querySelector('span')!.textContent = patch.value; // ← одна запись
}`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  naive: [SNIPPET_NAIVE],
  diff: [SNIPPET_VNODE, SNIPPET_DIFF],
  skip: [SNIPPET_VNODE, SNIPPET_DIFF],
}

const PAIN =
  'Real DOM дорог. Virtual DOM — снимок в JS: сравнили деревья и пишем в браузер только отличия (или ничего).'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  naive: (
    <>
      Без снимка каждый апдейт пересоздаёт <code>card</code>, <code>h1</code>, <code>span</code> и{' '}
      <code>button</code> через <code>innerHTML</code>.
    </>
  ),
  diff: (
    <>
      Новый VDOM отличается только текстом <code>span</code> — в Real DOM уходит один{' '}
      <code>patch</code>.
    </>
  ),
  skip: (
    <>
      Снимки совпали (<code>diff → none</code>) — колонка Real DOM остаётся без записи.
    </>
  ),
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, ...mods.filter(Boolean)].join(' ')
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
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
  motion?.(tl)
}

type NodeKind = 'card' | 'h1' | 'span' | 'button'
type NodeState = 'idle' | 'active' | 'ok' | 'warn'

type TreeState = Record<NodeKind, NodeState> & {
  meta: string
  spanText: string
}

type VizProps = {
  phase: Phase
  caseId: CaseId
  patchRef: MutableRefObject<HTMLDivElement | null>
}

function treeState(phase: Phase, caseId: CaseId, side: 'vdom' | 'dom'): TreeState {
  const done = phase === 'done'
  const comparing = phase === 'compare' || done
  const rendering = phase !== 'idle'

  if (caseId === 'naive') {
    return {
      card: done ? 'warn' : rendering ? 'active' : 'idle',
      h1: done ? 'warn' : rendering ? 'active' : 'idle',
      span: done ? 'warn' : rendering ? 'active' : 'idle',
      button: done ? 'warn' : rendering ? 'active' : 'idle',
      meta: done ? 'все узлы новые' : rendering ? 'innerHTML…' : 'до клика',
      spanText: done ? '1' : '0',
    }
  }

  if (side === 'vdom') {
    return {
      card: comparing ? 'ok' : rendering ? 'active' : 'idle',
      h1: comparing ? 'ok' : rendering ? 'active' : 'idle',
      span: done
        ? caseId === 'diff'
          ? 'active'
          : 'ok'
        : comparing
          ? 'active'
          : rendering
            ? 'active'
            : 'idle',
      button: comparing ? 'ok' : rendering ? 'active' : 'idle',
      meta:
        phase === 'idle'
          ? 'старый снимок'
          : phase === 'render'
            ? 'новый снимок'
            : caseId === 'skip'
              ? 'equal'
              : 'span ≠',
      spanText: caseId === 'diff' && comparing ? '1' : '0',
    }
  }

  // Real DOM
  if (caseId === 'skip') {
    return {
      card: done ? 'ok' : 'idle',
      h1: done ? 'ok' : 'idle',
      span: done ? 'ok' : 'idle',
      button: done ? 'ok' : 'idle',
      meta: done ? 'commit: none' : 'ждёт diff',
      spanText: '0',
    }
  }

  return {
    card: done ? 'ok' : 'idle',
    h1: done ? 'ok' : 'idle',
    span: done ? 'active' : comparing ? 'active' : 'idle',
    button: done ? 'ok' : 'idle',
    meta: done ? 'patch text' : comparing ? 'готов к patch' : 'ждёт diff',
    spanText: done ? '1' : '0',
  }
}

function stateClass(s: 'idle' | 'active' | 'ok' | 'warn') {
  if (s === 'active') return labVizStyles.nodeActive
  if (s === 'ok') return labVizStyles.nodeOk
  if (s === 'warn') return styles.nodeWarn
  return undefined
}

function TreeColumn({
  title,
  phase,
  caseId,
  side,
  highlightRef,
}: {
  title: string
  phase: Phase
  caseId: CaseId
  side: 'vdom' | 'dom'
  highlightRef?: MutableRefObject<HTMLDivElement | null>
}) {
  const st = treeState(phase, caseId, side)
  const nodes: Array<{ id: NodeKind; label: string; sub: string }> = [
    { id: 'card', label: side === 'vdom' ? "div.card" : '<div>', sub: 'root' },
    { id: 'h1', label: side === 'vdom' ? "h1" : '<h1>', sub: 'Счётчик' },
    {
      id: 'span',
      label: side === 'vdom' ? 'span' : '<span>',
      sub: st.spanText,
    },
    { id: 'button', label: side === 'vdom' ? 'button' : '<button>', sub: '+1' },
  ]

  return (
    <div className={styles.col}>
      <p className={styles.colTitle}>{title}</p>
      <p className={styles.colMeta}>{st.meta}</p>
      <div className={styles.tree}>
        {nodes.map((n, i) => (
          <div
            key={n.id}
            ref={n.id === 'span' && side === 'dom' ? highlightRef : undefined}
            className={nodeCls(stateClass(st[n.id]), styles.leaf, i > 0 && styles.indent)}
          >
            <span className={labVizStyles.nodeLabel}>{n.label}</span>
            <span className={labVizStyles.nodeSub}>{n.sub}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VdomViz({ phase, caseId, patchRef }: VizProps) {
  const naive = caseId === 'naive'
  const meta =
    phase === 'idle'
      ? 'до апдейта'
      : phase === 'render'
        ? 'render'
        : phase === 'compare'
          ? 'diff'
          : caseId === 'naive'
            ? 'full rewrite'
            : caseId === 'skip'
              ? 'commit skipped'
              : 'patched'

  return (
    <LabVizPanel title="Снимок vs Real DOM" meta={meta}>
      <div className={styles.layout}>
        {naive ? (
          <TreeColumn title="Real DOM" phase={phase} caseId={caseId} side="dom" highlightRef={patchRef} />
        ) : (
          <>
            <TreeColumn title="Virtual DOM" phase={phase} caseId={caseId} side="vdom" />
            <div className={styles.arrow} aria-hidden>
              {phase === 'compare' || phase === 'done' ? 'diff' : '→'}
            </div>
            <TreeColumn
              title="Real DOM"
              phase={phase}
              caseId={caseId}
              side="dom"
              highlightRef={patchRef}
            />
          </>
        )}
      </div>
    </LabVizPanel>
  )
}

export function ReactVirtualDomLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('naive')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const patchRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (patchRef.current) gsap.set(patchRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    playTimeline(
      tlRef,
      [
        () => setPhase('render'),
        () => setPhase('compare'),
        () => {
          setPhase('done')
          if (caseId === 'naive') {
            log('warn', 'innerHTML: card + h1 + span + button пересозданы')
            setHint('весь поддерево Real DOM новое — VDOM не участвовал')
          } else if (caseId === 'diff') {
            log('ok', 'diff: text span 0→1; commit: один textContent')
            setHint('в Real DOM записали только span')
          } else {
            log('ok', 'diff: none — commit пропущен')
            setHint('снимки равны, браузерный DOM не трогали')
          }
        },
      ],
      (tl) => {
        if (!patchRef.current) return
        if (caseId === 'skip') return
        gsap.set(patchRef.current, { opacity: 0.55, y: caseId === 'naive' ? 0 : 6 })
        tl.to(patchRef.current, { opacity: 1, y: 0 }, STEP * 2)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('naive')
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

      <VdomViz phase={phase} caseId={caseId} patchRef={patchRef} />

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
      title="Virtual DOM"
      lead="Снимок UI в JS, diff и точечный commit в Real DOM — против полного `innerHTML`."
      problem={problem}
      code={code}
    />
  )
}
