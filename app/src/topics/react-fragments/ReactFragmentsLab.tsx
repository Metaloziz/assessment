import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './ReactFragmentsLab.module.css'

const TOPIC_ID = '187-react-fragments'
const STEP = 0.6

type CaseId = 'wrapper' | 'fragment' | 'keyed'
type Phase = 'idle' | 'build' | 'mount' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'wrapper', label: 'Обёртка div' },
  { id: 'fragment', label: 'Fragment' },
  { id: 'keyed', label: 'key на Fragment' },
]

const CODE_INTRO: Record<CaseId, string> = {
  wrapper: 'Лишний `div` вокруг `dt`/`dd` попадает в DOM и ломает `<dl>`.',
  fragment: '`<>…</>` группирует детей в React, в DOM узла фрагмента нет.',
  keyed: 'В `map` для пары узлов нужен `<Fragment key={…}>` — у `<>` нет `key`.',
}

const SNIPPET_WRAPPER: InteractiveSnippet = {
  id: 'glossary-wrapper',
  label: 'src/ui/Glossary.tsx',
  note: '`div` — валидный JSX-корень, но лишний узел в `<dl>`.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Entry = { term: string; definition: string };

export function GlossaryEntry({ term, definition }: Entry) {
  // ═══════════════════════════════════════════
  // WRAPPER ← лишний DOM-узел
  // ═══════════════════════════════════════════
  return (
    <div className="pair"> {/* ← попадает в <dl> */}
      <dt>{term}</dt>
      <dd>{definition}</dd>
    </div>
  );
}

// <dl><GlossaryEntry … /></dl>
// DOM: dl > div.pair > dt, dd  — семантика и CSS :nth-child съезжают`,
}

const SNIPPET_DL: InteractiveSnippet = {
  id: 'page-dl',
  label: 'src/pages/Terms.tsx',
  note: 'Родитель — `<dl>`; дети должны быть `dt`/`dd`, не обёртки.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { GlossaryEntry } from '../ui/Glossary';

export function TermsPage() {
  return (
    <dl className="glossary">
      <GlossaryEntry term="HMR" definition="Hot Module Replacement" />
      {/* ← ожидает прямых dt/dd */}
    </dl>
  );
}`,
}

const SNIPPET_FRAGMENT: InteractiveSnippet = {
  id: 'glossary-fragment',
  label: 'src/ui/Glossary.tsx',
  note: 'Короткий Fragment — дети `dl` без лишнего узла.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Entry = { term: string; definition: string };

export function GlossaryEntry({ term, definition }: Entry) {
  // ═══════════════════════════════════════════
  // FRAGMENT ← группа без DOM-узла
  // ═══════════════════════════════════════════
  return (
    <>
      <dt>{term}</dt>   {/* ← прямой ребёнок <dl> */}
      <dd>{definition}</dd>
    </>
  );
}`,
}

const SNIPPET_KEYED: InteractiveSnippet = {
  id: 'glossary-keyed',
  label: 'src/ui/GlossaryList.tsx',
  note: 'Список пар: `key` только у полной формы `Fragment`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Fragment } from 'react';

type Entry = { id: string; term: string; definition: string };

export function GlossaryList({ entries }: { entries: Entry[] }) {
  return (
    <dl>
      {entries.map((e) => (
        // ═══════════════════════════════════════════
        // KEYED ← <> не принимает key
        // ═══════════════════════════════════════════
        <Fragment key={e.id}> {/* ← стабильный key для пары */}
          <dt>{e.term}</dt>
          <dd>{e.definition}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

// <>…</> здесь нельзя: нет prop key`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  wrapper: [SNIPPET_WRAPPER, SNIPPET_DL],
  fragment: [SNIPPET_FRAGMENT, SNIPPET_DL],
  keyed: [SNIPPET_KEYED, SNIPPET_DL],
}

const PAIN =
  'Несколько соседних узлов из компонента часто оборачивают в `div`. В таблицах, flex и `<dl>` лишний узел ломает разметку — Fragment группирует без DOM.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  wrapper: (
    <>
      Пара <code>dt</code>/<code>dd</code> внутри <code>div</code> — в DOM обёртка остаётся и ломает{' '}
      <code>dl</code>.
    </>
  ),
  fragment: (
    <>
      <code>{'<>…</>'}</code> есть в React-дереве, в DOM дети ложатся прямо в <code>dl</code>.
    </>
  ),
  keyed: (
    <>
      В <code>map</code> парам нужен <code>{'<Fragment key={…}>'}</code> — короткая форма key не
      принимает.
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

type VizProps = {
  phase: Phase
  caseId: CaseId
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function FragmentsViz({ phase, caseId, focusRef }: VizProps) {
  const built = phase !== 'idle'
  const mounted = phase === 'mount' || phase === 'done'
  const done = phase === 'done'

  const isWrapper = caseId === 'wrapper'
  const isKeyed = caseId === 'keyed'
  const broken = isWrapper && done
  const ok = !isWrapper && done

  const meta =
    phase === 'idle'
      ? 'до return'
      : phase === 'build'
        ? 'React-дерево'
        : phase === 'mount'
          ? '→ DOM'
          : isWrapper
            ? 'лишний div'
            : isKeyed
              ? 'key на Fragment'
              : 'без узла'

  return (
    <LabVizPanel title="React-дерево vs DOM" meta={meta}>
      <div className={styles.layout}>
        <div className={styles.col}>
          <p className={styles.colTitle}>React</p>
          <div className={styles.tree}>
            <div className={nodeCls(styles.leaf, built ? labVizStyles.nodeActive : undefined)}>
              Glossary
            </div>
            {built ? (
              <>
                {isWrapper ? (
                  <div
                    ref={focusRef}
                    className={nodeCls(
                      styles.leaf,
                      styles.indent,
                      styles.ghost,
                      broken ? styles.nodeWarn : labVizStyles.nodeActive,
                    )}
                  >
                    div.pair
                  </div>
                ) : (
                  <div
                    ref={focusRef}
                    className={nodeCls(
                      styles.leaf,
                      styles.indent,
                      styles.ghost,
                      done ? labVizStyles.nodeOk : labVizStyles.nodeActive,
                    )}
                  >
                    {isKeyed ? 'Fragment key=…' : 'Fragment <>'}
                  </div>
                )}
                <div className={nodeCls(styles.leaf, styles.indent2, built && styles.nodeDim)}>
                  dt · HMR
                </div>
                <div className={nodeCls(styles.leaf, styles.indent2, built && styles.nodeDim)}>
                  dd · Hot Module…
                </div>
                {isKeyed && built ? (
                  <>
                    <div
                      className={nodeCls(
                        styles.leaf,
                        styles.indent,
                        styles.ghost,
                        done ? labVizStyles.nodeOk : undefined,
                      )}
                    >
                      Fragment key=…
                    </div>
                    <div className={nodeCls(styles.leaf, styles.indent2, styles.nodeDim)}>
                      dt · JSX
                    </div>
                    <div className={nodeCls(styles.leaf, styles.indent2, styles.nodeDim)}>
                      dd · markup…
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <div className={styles.slotEmpty}>ещё не собрали</div>
            )}
          </div>
        </div>

        <div className={styles.arrow} aria-hidden>
          {isWrapper ? 'div → DOM' : 'прозрачно'}
        </div>

        <div className={styles.col}>
          <p className={styles.colTitle}>DOM · dl</p>
          <div
            className={[styles.tree, broken ? styles.treeBroken : '', ok ? styles.treeOk : '']
              .filter(Boolean)
              .join(' ')}
          >
            <div className={nodeCls(styles.leaf, mounted ? labVizStyles.nodeActive : undefined)}>
              dl.glossary
            </div>
            {mounted ? (
              isWrapper ? (
                <>
                  <div
                    className={nodeCls(
                      styles.leaf,
                      styles.indent,
                      broken ? labVizStyles.nodeErr : styles.nodeWarn,
                    )}
                  >
                    div.pair
                  </div>
                  <div className={nodeCls(styles.leaf, styles.indent2, styles.nodeDim)}>dt</div>
                  <div className={nodeCls(styles.leaf, styles.indent2, styles.nodeDim)}>dd</div>
                </>
              ) : (
                <>
                  <div
                    className={nodeCls(
                      styles.leaf,
                      styles.indent,
                      done ? labVizStyles.nodeOk : labVizStyles.nodeActive,
                    )}
                  >
                    dt · HMR
                  </div>
                  <div
                    className={nodeCls(
                      styles.leaf,
                      styles.indent,
                      done ? labVizStyles.nodeOk : undefined,
                    )}
                  >
                    dd · Hot Module…
                  </div>
                  {isKeyed ? (
                    <>
                      <div
                        className={nodeCls(
                          styles.leaf,
                          styles.indent,
                          done ? labVizStyles.nodeOk : undefined,
                        )}
                      >
                        dt · JSX
                      </div>
                      <div
                        className={nodeCls(
                          styles.leaf,
                          styles.indent,
                          done ? labVizStyles.nodeOk : undefined,
                        )}
                      >
                        dd · markup…
                      </div>
                    </>
                  ) : null}
                </>
              )
            ) : (
              <div className={styles.slotEmpty}>host пуст</div>
            )}
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function ReactFragmentsLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('wrapper')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (focusRef.current) gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
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
        () => setPhase('build'),
        () => setPhase('mount'),
        () => {
          setPhase('done')
          if (caseId === 'wrapper') {
            log('err', 'dl > div.pair > dt, dd — лишний узел')
            setHint('обёртка попала в DOM и ломает dl')
          } else if (caseId === 'fragment') {
            log('ok', 'dl > dt, dd — Fragment в DOM нет')
            setHint('в Elements только dt/dd, без узла фрагмента')
          } else {
            log('ok', 'Fragment key → пары в map без обёртки')
            setHint('key на полной форме; <> key не принимает')
          }
        },
      ],
      (tl) => {
        tl.call(
          () => {
            const el = focusRef.current
            if (!el) return
            gsap.fromTo(
              el,
              { opacity: 0.5, y: 6 },
              { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
            )
          },
          undefined,
          0.05,
        )
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('wrapper')
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

      <FragmentsViz phase={phase} caseId={caseId} focusRef={focusRef} />

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
      title="Фрагменты"
      lead="`Fragment` группирует детей без DOM-узла — таблицы, flex и `<dl>` не получают лишнюю обёртку."
      problem={problem}
      code={code}
    />
  )
}
