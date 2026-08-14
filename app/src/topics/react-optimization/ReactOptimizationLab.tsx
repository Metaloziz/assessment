import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, LabNode, labVizStyles } from '../../components/lab/LabViz'
import styles from './ReactOptimizationLab.module.css'

const TOPIC_ID = '186-react-optimization'
const STEP = 0.6

type Pattern = 'memo' | 'lazy' | 'keys'
type MemoCase = 'churn' | 'skip'
type LazyCase = 'eager' | 'split'
type KeysCase = 'index' | 'id'
type CaseId = MemoCase | LazyCase | KeysCase

type MemoPhase = 'idle' | 'tick' | 'kids' | 'done'
type LazyPhase = 'idle' | 'nav' | 'load' | 'done'
type KeysPhase = 'idle' | 'order' | 'match' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'memo', label: 'memo' },
  { id: 'lazy', label: 'lazy' },
  { id: 'keys', label: 'key' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  memo: [
    { id: 'churn', label: 'Без memo' },
    { id: 'skip', label: 'С memo' },
  ],
  lazy: [
    { id: 'eager', label: 'Весь бандл' },
    { id: 'split', label: 'lazy + Suspense' },
  ],
  keys: [
    { id: 'index', label: 'key = index' },
    { id: 'id', label: 'key = id' },
  ],
}

const CODE_INTRO: Record<Pattern, string> = {
  memo: 'Родитель тикает `clock`; без `memo` Row перерисовывается, с `memo` — только при смене `label`.',
  lazy: '`lazy(() => import(…))` выносит страницу в чанк; `Suspense` держит fallback, пока грузится.',
  keys: 'При сортировке `key={index}` ломает соответствие «данные → инстанс»; `key={id}` сохраняет.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  memo: [
    {
      id: 'dashboard-parent',
      label: 'src/dashboard/Dashboard.tsx',
      note: 'Тик родителя не обязан трогать список, если props Row те же.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { useState } from 'react';
import { Row } from './Row';

export function Dashboard({ items }: { items: string[] }) {
  const [clock, setClock] = useState(0);

  return (
    <div>
      <button type="button" onClick={() => setClock((c) => c + 1)}>
        tick {clock} {/* ← state родителя */}
      </button>
      <ul>
        {items.map((label) => (
          <Row key={label} label={label} />
        ))}
      </ul>
    </div>
  );
}`,
    },
    {
      id: 'row-memo',
      label: 'src/dashboard/Row.tsx',
      note: '`memo` сравнивает props; новый inline-объект с родителя снова включает render.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { memo } from 'react';

// ═══════════════════════════════════════════
// MEMO ← skip render при тех же props
// ═══════════════════════════════════════════
export const Row = memo(function Row({ label }: { label: string }) {
  // тяжёлая разметка / расчёт
  return <li>{label}</li>; // ← не вызовется, если label тот же
});

// без memo: каждый tick Dashboard → render всех Row`,
    },
  ],
  lazy: [
    {
      id: 'app-lazy',
      label: 'src/App.tsx',
      note: 'Маршрут Settings — отдельный чанк, не в initial bundle.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { lazy, Suspense } from 'react';

// ═══════════════════════════════════════════
// LAZY ← code split по import()
// ═══════════════════════════════════════════
const Settings = lazy(() => import('./SettingsPage')); // ← отдельный .js

export function App({ page }: { page: 'home' | 'settings' }) {
  if (page === 'home') return <Home />;

  return (
    <Suspense fallback={<p>Загрузка…</p>}> {/* ← пока чанк качается */}
      <Settings />
    </Suspense>
  );
}`,
    },
    {
      id: 'settings-page',
      label: 'src/SettingsPage.tsx',
      note: 'Тяжёлая страница попадает в бандл только после `import()`.',
      executable: false,
      languageLabel: 'tsx',
      code: `export default function SettingsPage() {
  return <section className="settings">…</section>;
}`,
    },
  ],
  keys: [
    {
      id: 'list-keys',
      label: 'src/list/SortedList.tsx',
      note: '`key` говорит React, какой инстанс соответствует какой записи.',
      executable: false,
      languageLabel: 'tsx',
      code: `type Item = { id: string; title: string };

export function SortedList({ items }: { items: Item[] }) {
  // ═══════════════════════════════════════════
  // KEY ← стабильная идентичность в списке
  // ═══════════════════════════════════════════
  return (
    <ul>
      {items.map((item, index) => (
        // key={index} ← при sort индекс «переезжает» на другой item
        // key={item.id} ← тот же компонент остаётся на своих данных
        <Row key={item.id} item={item} />
      ))}
    </ul>
  );
}`,
    },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  memo: (
    <>
      Тик родителя гоняет детей. <code>memo</code> пропускает <code>render</code>, если props не
      изменились.
    </>
  ),
  lazy: (
    <>
      Тяжёлая страница в entry раздувает старт. <code>lazy</code> + <code>Suspense</code> грузят чанк
      по запросу.
    </>
  ),
  keys: (
    <>
      При перестановке списка React сверяет детей по <code>key</code>: id сохраняет инстанс, index —
      remount.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  churn: (
    <>
      Без <code>memo</code> после tick вспыхивают все Row — даже с тем же <code>label</code>.
    </>
  ),
  skip: (
    <>
      С <code>memo</code> после tick Row остаются холодными: props совпали, <code>render</code> не
      вызван.
    </>
  ),
  eager: <>Settings уже в main-бандле — навигация не качает отдельный чанк, старт тяжелее.</>,
  split: (
    <>
      Навигация → fallback → чанк Settings: initial bundle без этой страницы.
    </>
  ),
  index: (
    <>
      После sort <code>key=index</code> цепляет state/DOM к «чужим» данным — remount по ощущению списка.
    </>
  ),
  id: (
    <>
      <code>key=id</code>: карточки меняют порядок, инстансы остаются на своих item.
    </>
  ),
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (p: Pattern) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
}

function MemoViz({
  phase,
  caseId,
  pulseRef,
}: {
  phase: MemoPhase
  caseId: MemoCase
  pulseRef: MutableRefObject<HTMLDivElement | null>
}) {
  const ticking = phase === 'tick' || phase === 'kids' || phase === 'done'
  const kidsHot = caseId === 'churn' && (phase === 'kids' || phase === 'done')
  const kidsSkip = caseId === 'skip' && phase === 'done'
  const meta =
    phase === 'idle'
      ? 'до tick'
      : phase === 'tick'
        ? 'setState родителя'
        : caseId === 'churn'
          ? 'все Row → render'
          : 'props равны → skip'

  return (
    <LabVizPanel title="Parent → children" meta={meta}>
      <div className={styles.memoLayout} ref={pulseRef}>
        <LabNode
          label="Dashboard"
          sub={`clock ${ticking ? '+1' : '0'}`}
          state={ticking ? (phase === 'done' ? 'ok' : 'active') : 'idle'}
        />
        <span className={styles.arrow}>↓</span>
        <div className={styles.rowStrip}>
          {['Alpha', 'Beta', 'Gamma'].map((label) => (
            <div
              key={label}
              className={[
                labVizStyles.node,
                kidsHot ? labVizStyles.nodeErr : '',
                kidsSkip ? labVizStyles.nodeOk : '',
                phase === 'kids' && caseId === 'churn' ? labVizStyles.nodeActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={labVizStyles.nodeLabel}>Row</span>
              <span className={labVizStyles.nodeSub}>
                {kidsHot ? 'render' : kidsSkip ? 'skip' : label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </LabVizPanel>
  )
}

function LazyViz({
  phase,
  caseId,
  chunkRef,
}: {
  phase: LazyPhase
  caseId: LazyCase
  chunkRef: MutableRefObject<HTMLDivElement | null>
}) {
  const eager = caseId === 'eager'
  const showFallback = !eager && phase === 'load'
  const showPage = eager ? phase !== 'idle' : phase === 'done'
  const meta =
    phase === 'idle'
      ? eager
        ? 'Settings уже в main'
        : 'Settings ещё не грузили'
      : phase === 'nav'
        ? 'открыли /settings'
        : showFallback
          ? 'Suspense fallback'
          : eager
            ? 'страница из main'
            : 'чанк подключён'

  return (
    <LabVizPanel title="Bundle → route" meta={meta}>
      <div className={styles.lazyLayout}>
        <LabNode
          label="main.js"
          sub={eager ? 'Home + Settings' : 'Home'}
          state={phase === 'idle' ? 'idle' : 'ok'}
        />
        <span className={styles.arrow}>→</span>
        <div className={styles.routeCol} ref={chunkRef}>
          <LabNode
            label={showFallback ? 'fallback…' : 'Settings'}
            sub={
              showFallback
                ? 'ждём чанк'
                : showPage
                  ? eager
                    ? 'из main'
                    : 'settings.chunk.js'
                  : 'пусто'
            }
            state={
              showFallback ? 'active' : showPage ? 'ok' : phase === 'nav' ? 'active' : 'idle'
            }
          />
          {!eager ? (
            <LabNode
              label="settings.chunk.js"
              sub={phase === 'done' ? 'loaded' : phase === 'load' ? 'fetch…' : 'ожидает'}
              state={phase === 'load' ? 'active' : phase === 'done' ? 'ok' : 'idle'}
            />
          ) : null}
        </div>
      </div>
    </LabVizPanel>
  )
}

const LIST_BEFORE = [
  { id: 'a', title: 'A', draft: 'черн.' },
  { id: 'b', title: 'B', draft: 'ок' },
  { id: 'c', title: 'C', draft: '…' },
]
const LIST_AFTER = [
  { id: 'c', title: 'C', draft: '…' },
  { id: 'a', title: 'A', draft: 'черн.' },
  { id: 'b', title: 'B', draft: 'ок' },
]

function KeysViz({
  phase,
  caseId,
  listRef,
}: {
  phase: KeysPhase
  caseId: KeysCase
  listRef: MutableRefObject<HTMLDivElement | null>
}) {
  const sorted = phase === 'order' || phase === 'match' || phase === 'done'
  const items = sorted ? LIST_AFTER : LIST_BEFORE
  const bad = caseId === 'index' && phase === 'done'
  const good = caseId === 'id' && phase === 'done'
  const meta =
    phase === 'idle'
      ? 'порядок A B C'
      : phase === 'order'
        ? 'sort → C A B'
        : caseId === 'index'
          ? 'index «переехал»'
          : 'id сохранил инстансы'

  return (
    <LabVizPanel title="Список после sort" meta={meta}>
      <div className={styles.keysLayout} ref={listRef}>
        {items.map((item, index) => {
          const keyLabel = caseId === 'index' ? `key=${index}` : `key=${item.id}`
          const warn =
            bad &&
            ((index === 0 && item.id === 'c') ||
              (index === 1 && item.id === 'a') ||
              (index === 2 && item.id === 'b'))
          return (
            <div
              key={`${caseId}-${item.id}-${phase}`}
              className={[
                labVizStyles.node,
                warn ? labVizStyles.nodeErr : '',
                good ? labVizStyles.nodeOk : '',
                phase === 'match' ? labVizStyles.nodeActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={labVizStyles.nodeLabel}>
                {item.title} · draft «{item.draft}»
              </span>
              <span className={labVizStyles.nodeSub}>
                {bad ? `${keyLabel} → remount?` : good ? `${keyLabel} · reuse` : keyLabel}
              </span>
            </div>
          )
        })}
      </div>
    </LabVizPanel>
  )
}

export function ReactOptimizationLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('memo')
  const [caseId, setCaseId] = useState<CaseId>('churn')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [memoPhase, setMemoPhase] = useState<MemoPhase>('idle')
  const [lazyPhase, setLazyPhase] = useState<LazyPhase>('idle')
  const [keysPhase, setKeysPhase] = useState<KeysPhase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const pulseRef = useRef<HTMLDivElement | null>(null)
  const chunkRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setMemoPhase('idle')
    setLazyPhase('idle')
    setKeysPhase('idle')
    setHint(null)
    for (const el of [pulseRef.current, chunkRef.current, listRef.current]) {
      if (el) gsap.set(el, { clearProps: 'transform,opacity' })
    }
  }

  const selectPattern = (next: Pattern) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
    setCaseId(CASES[next][0]!.id)
    clear()
    resetViz()
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

    if (pattern === 'memo') {
      const skip = caseId === 'skip'
      playTimeline(
        tlRef,
        [
          () => setMemoPhase('tick'),
          () => setMemoPhase('kids'),
          () => {
            setMemoPhase('done')
            if (skip) {
              log('ok', 'tick → memo: props равны, Row skip')
              setHint('memo отсёк лишние render')
            } else {
              log('warn', 'tick → все Row снова в render')
              setHint('без memo дети вспыхивают вместе с родителем')
            }
          },
        ],
        (tl) => {
          if (!pulseRef.current) return
          gsap.set(pulseRef.current, { opacity: 0.55, y: 6 })
          tl.to(pulseRef.current, { opacity: 1, y: 0 }, 0)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'lazy') {
      const split = caseId === 'split'
      playTimeline(
        tlRef,
        [
          () => setLazyPhase('nav'),
          () => setLazyPhase(split ? 'load' : 'done'),
          () => {
            setLazyPhase('done')
            if (split) {
              log('ok', 'nav → fallback → settings.chunk.js')
              setHint('страница не в initial bundle')
            } else {
              log('warn', 'Settings уже в main.js — старт тяжелее')
              setHint('eager import раздувает entry')
            }
          },
        ],
        (tl) => {
          if (!chunkRef.current || !split) return
          gsap.set(chunkRef.current, { scale: 0.94, opacity: 0.5 })
          tl.to(chunkRef.current, { scale: 1, opacity: 1 }, STEP)
        },
        () => setBusy(false),
      )
      return
    }

    const byId = caseId === 'id'
    playTimeline(
      tlRef,
      [
        () => setKeysPhase('order'),
        () => setKeysPhase('match'),
        () => {
          setKeysPhase('done')
          if (byId) {
            log('ok', 'sort + key=id → reuse инстансов')
            setHint('draft остался на своих item')
          } else {
            log('warn', 'sort + key=index → путаница идентичности')
            setHint('index переехал вместе с позицией')
          }
        },
      ],
      (tl) => {
        if (!listRef.current) return
        gsap.set(listRef.current, { opacity: 0.5, y: 8 })
        tl.to(listRef.current, { opacity: 1, y: 0 }, 0)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('memo')
    setCaseId('churn')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES[pattern].map((c) => (
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

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {pattern === 'memo' ? (
        <MemoViz phase={memoPhase} caseId={caseId as MemoCase} pulseRef={pulseRef} />
      ) : null}
      {pattern === 'lazy' ? (
        <LazyViz phase={lazyPhase} caseId={caseId as LazyCase} chunkRef={chunkRef} />
      ) : null}
      {pattern === 'keys' ? (
        <KeysViz phase={keysPhase} caseId={caseId as KeysCase} listRef={listRef} />
      ) : null}

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
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="memo · lazy · key"
      lead="Три рычага: пропуск лишних render, отложенный чанк, стабильная идентичность в списке."
      problem={problem}
      code={code}
    />
  )
}
