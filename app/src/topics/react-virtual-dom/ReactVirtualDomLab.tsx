import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactVirtualDomLab.module.css'

const TOPIC_ID = '185-react-virtual-dom'
const STEP = 0.65

type CaseId = 'naive' | 'diff' | 'skip'
type Phase = 'idle' | 'focus' | 'apply' | 'done'
type FocusOutcome = 'idle' | 'lost' | 'kept' | 'untouched'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'naive', label: 'Без снимка' },
  { id: 'diff', label: 'Точечный patch' },
  { id: 'skip', label: 'Снимок тот же' },
]

const CODE_INTRO: Record<CaseId, string> = {
  naive: 'Каждый апдейт — полный `innerHTML`: узлы новые, фокус в поле пропадает.',
  diff: 'Снимок → `diff` → в DOM пишем только текст числа; поле остаётся с фокусом.',
  skip: 'Новый снимок равен старому — `commit` ничего не пишет, фокус на месте.',
}

const SNIPPET_NAIVE: InteractiveSnippet = {
  id: 'naive-innerhtml',
  label: 'src/ui/naiveCounter.ts',
  note: 'Без снимка: любой апдейт сносит и собирает разметку заново.',
  executable: false,
  languageLabel: 'ts',
  code: `export const mountNaive = (root: HTMLElement) => {
  let count = 0;
  let name = 'Анна';

  const paint = () => {
    // ═══════════════════════════════════════════
    // NAIVE ← полный rewrite Real DOM
    // ═══════════════════════════════════════════
    root.innerHTML = \`
      <div class="card">
        <h1>Счётчик</h1>
        <input value="\${name}" />
        <span>\${count}</span>
        <button type="button">+1</button>
      </div>
    \`; // ← все узлы новые: фокус теряется
    const input = root.querySelector('input')!;
    input.oninput = () => {
      name = input.value;
    };
    root.querySelector('button')!.onclick = () => {
      count += 1;
      paint();
    };
  };

  paint();
};`,
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
export const createElement = (
  type: string,
  props: Record<string, unknown> | null,
  ...children: Array<VNode | string>
): VNode => ({ type, props: props ?? {}, children }); // ← ещё не DOM

export const renderCounter = (count: number, name: string): VNode =>
  createElement(
    'div',
    { className: 'card' },
    createElement('h1', null, 'Счётчик'),
    createElement('input', { value: name }),
    createElement('span', null, String(count)), // ← меняется текст
  );`,
}

const SNIPPET_DIFF: InteractiveSnippet = {
  id: 'vdom-diff-patch',
  label: 'src/vdom/diff.ts',
  note: '`diff` решает, что трогать; `patch` пишет в Real DOM только это.',
  executable: false,
  languageLabel: 'ts',
  code: `import type { VNode } from './createElement';

type Patch =
  | { op: 'text'; value: string }
  | { op: 'none' };

// ═══════════════════════════════════════════
// DIFF ← сравнить снимки до DOM
// ═══════════════════════════════════════════
export const diff = (prev: VNode, next: VNode): Patch => {
  const prevText = String(prev.children[2]);
  const nextText = String(next.children[2]);
  if (prevText === nextText) return { op: 'none' }; // ← skip commit
  return { op: 'text', value: nextText }; // ← patch
};

export const commit = (root: HTMLElement, patch: Patch) => {
  if (patch.op === 'none') return; // ← Real DOM не трогаем
  root.querySelector('span')!.textContent = patch.value; // ← одна запись
};`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  naive: [SNIPPET_NAIVE, SNIPPET_VNODE],
  diff: [SNIPPET_VNODE, SNIPPET_DIFF],
  skip: [SNIPPET_VNODE, SNIPPET_DIFF],
}

const PAIN =
  'Настоящий DOM дорогой: лишний rewrite сносит фокус и слушатели. Снимок в JS сравнивают сначала — в браузер пишут только отличия или ничего.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  naive: (
    <>
      После клика карточка собирается заново через <code>innerHTML</code> — курсор из поля пропадает.
    </>
  ),
  diff: (
    <>
      Меняется только число в <code>span</code>; поле с именем остаётся с фокусом.
    </>
  ),
  skip: (
    <>
      Число не менялось — снимки совпали, в Real DOM ничего не пишем.
    </>
  ),
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) => {
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
    tl.call(step, [], i * STEP)
  })
  motion?.(tl)
}

type StandState = {
  count: number
  name: string
}

const paintCard = (root: HTMLElement, state: StandState, flash: 'none' | 'warn' | 'ok') => {
  const flashCls =
    flash === 'warn' ? styles.cardWarn : flash === 'ok' ? styles.cardOk : ''
  root.innerHTML = `
    <div data-card class="${styles.card} ${flashCls}">
      <p class="${styles.cardEyebrow}">мини-UI</p>
      <h2 class="${styles.cardTitle}">Счётчик</h2>
      <label class="${styles.field}">
        <span class="${styles.fieldLabel}">Имя</span>
        <input class="${styles.input}" data-name type="text" value="${state.name.replace(/"/g, '&quot;')}" />
      </label>
      <p class="${styles.countRow}">
        Кликов: <span class="${styles.count}" data-count>${state.count}</span>
      </p>
      <p class="${styles.cardHint}">Фокус в поле «Имя» — смотри, останется ли после апдейта</p>
    </div>
  `
  const input = root.querySelector<HTMLInputElement>('[data-name]')
  if (input) {
    input.oninput = () => {
      state.name = input.value
    }
  }
}

const focusName = (root: HTMLElement | null) => {
  const input = root?.querySelector<HTMLInputElement>('[data-name]')
  if (!input) return false
  input.focus()
  input.select()
  return document.activeElement === input
}

const isNameFocused = (root: HTMLElement | null) => {
  const input = root?.querySelector<HTMLInputElement>('[data-name]')
  return Boolean(input && document.activeElement === input)
}

type VizProps = {
  phase: Phase
  caseId: CaseId
  focusOutcome: FocusOutcome
  hostRef: MutableRefObject<HTMLDivElement | null>
  flashRef: MutableRefObject<HTMLDivElement | null>
}

const VdomLiveViz = ({ phase, caseId, focusOutcome, hostRef, flashRef }: VizProps) => {
  const meta =
    phase === 'idle'
      ? 'до апдейта'
      : phase === 'focus'
        ? 'фокус в поле'
        : phase === 'apply'
          ? caseId === 'naive'
            ? 'полный rewrite'
            : caseId === 'diff'
              ? 'пишем только число'
              : 'commit пропущен'
          : focusOutcome === 'lost'
            ? 'фокус сброшен'
            : focusOutcome === 'untouched'
              ? 'DOM не трогали'
              : 'фокус на месте'

  return (
    <LabVizPanel title="Счётчик в браузере" meta={meta}>
      <div className={styles.stage} ref={flashRef}>
        <div ref={hostRef} className={styles.host} />
        <p className={styles.receipt} data-tone={focusOutcome}>
          {focusOutcome === 'idle' && 'Запусти прогон — увидишь, что стало с фокусом'}
          {focusOutcome === 'lost' && 'Поле пересоздали · курсор пропал'}
          {focusOutcome === 'kept' && 'Поле то же · курсор на месте'}
          {focusOutcome === 'untouched' && 'Запись в DOM не нужна · фокус как был'}
        </p>
      </div>
    </LabVizPanel>
  )
}

export const ReactVirtualDomLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('naive')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [focusOutcome, setFocusOutcome] = useState<FocusOutcome>('idle')
  const [paintTick, setPaintTick] = useState(0)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const flashRef = useRef<HTMLDivElement | null>(null)
  const standRef = useRef<StandState>({ count: 0, name: 'Анна' })
  const runGenRef = useRef(0)

  useEffect(() => {
    const root = hostRef.current
    if (!root) return
    standRef.current = { count: 0, name: 'Анна' }
    paintCard(root, standRef.current, 'none')
  }, [caseId, paintTick])

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setFocusOutcome('idle')
    setPaintTick((n) => n + 1)
    if (flashRef.current) gsap.set(flashRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    runGenRef.current += 1
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    const activeCase = caseId
    const gen = ++runGenRef.current
    tlRef.current?.kill()
    clear()
    setHint(null)
    setFocusOutcome('idle')
    setPhase('idle')
    setBusy(true)

    const root = hostRef.current
    if (root) {
      standRef.current = { count: 0, name: standRef.current.name || 'Анна' }
      paintCard(root, standRef.current, 'none')
    }

    // после paint — следующий кадр, чтобы input уже был в DOM
    requestAnimationFrame(() => {
      if (gen !== runGenRef.current) return
      playTimeline(
        tlRef,
        [
          () => {
            if (gen !== runGenRef.current) return
            setPhase('focus')
            focusName(hostRef.current)
          },
          () => {
            if (gen !== runGenRef.current) return
            setPhase('apply')
            const host = hostRef.current
            const state = standRef.current
            if (!host) return

            if (activeCase === 'naive') {
              state.count += 1
              paintCard(host, state, 'warn')
              log('warn', 'innerHTML: карточка целиком новая')
            } else if (activeCase === 'diff') {
              state.count += 1
              const span = host.querySelector<HTMLElement>('[data-count]')
              if (span) span.textContent = String(state.count)
              const card = host.querySelector('[data-card]')
              card?.classList.add(styles.cardOk)
              card?.classList.remove(styles.cardWarn)
              log('ok', 'в DOM записали только число в span')
            } else {
              log('ok', 'снимки равны — commit пропущен')
            }
          },
          () => {
            if (gen !== runGenRef.current) return
            setPhase('done')
            const kept = isNameFocused(hostRef.current)
            if (activeCase === 'naive') {
              setFocusOutcome('lost')
              setHint('всё поддерево Real DOM новое — фокус сброшен')
            } else if (activeCase === 'diff') {
              setFocusOutcome(kept ? 'kept' : 'lost')
              setHint(
                kept
                  ? 'точечный patch: поле то же, число обновлено'
                  : 'ожидали сохранить фокус — проверь поле «Имя»',
              )
            } else {
              setFocusOutcome(kept ? 'untouched' : 'lost')
              setHint(
                kept
                  ? 'снимки совпали — браузерный DOM не трогали'
                  : 'DOM не писали, но фокус уже не в поле',
              )
            }
          },
        ],
        (tl) => {
          if (!flashRef.current) return
          gsap.set(flashRef.current, { opacity: 0.7, y: 6 })
          tl.to(flashRef.current, { opacity: 1, y: 0 }, STEP * 2)
        },
        () => {
          if (gen === runGenRef.current) setBusy(false)
        },
      )
    })
  }

  const reset = () => {
    runGenRef.current += 1
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

      <VdomLiveViz
        phase={phase}
        caseId={caseId}
        focusOutcome={focusOutcome}
        hostRef={hostRef}
        flashRef={flashRef}
      />

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
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
      title="Virtual DOM"
      lead="Снимок UI в JS, diff и точечный commit в Real DOM — против полного `innerHTML`."
      problem={problem}
      code={code}
    />
  )
}
