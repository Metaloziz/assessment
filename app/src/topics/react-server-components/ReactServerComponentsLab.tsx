import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, LabNode, type LabNodeState } from '../../components/lab/LabViz'
import styles from './ReactServerComponentsLab.module.css'

const TOPIC_ID = '199-react-server-components'
const STEP = 0.6

type CaseId = 'server' | 'island' | 'broken'
type Phase = 'idle' | 'render' | 'flight' | 'hydrate' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'server', label: 'Server tree' },
  { id: 'island', label: 'Client island' },
  { id: 'broken', label: 'useState на сервере' },
]

const CODE_INTRO: Record<CaseId, string> = {
  server: 'Server Components: fetch на сервере, в клиентский бандл JS не попадает.',
  island: '`use client` — граница: только AddToCart уезжает в бандл и гидратируется.',
  broken: "useState в Server Component — ошибка: нужен 'use client'.",
}

const SNIPPET_PAGE: InteractiveSnippet = {
  id: 'page-server',
  label: 'app/products/page.tsx',
  note: 'Server Component: async fetch и статическая разметка.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { ProductList } from './ProductList';
import { AddToCart } from './AddToCart';

export default async function ProductsPage() {
  const products = await db.products.findMany(); // ← только сервер

  return (
    <main>
      <h1>Каталог</h1>
      <ProductList items={products} />
      <AddToCart productId={products[0].id} />
    </main>
  );
}`,
}

const SNIPPET_LIST: InteractiveSnippet = {
  id: 'product-list',
  label: 'ProductList.tsx',
  note: 'Server Component без директивы — не попадает в client bundle.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Item = { id: string; title: string; price: number };
type Props = { items: Item[] };

export const ProductList = ({ items }: Props) => (
  <ul>
    {items.map((p) => (
      <li key={p.id}>
        {p.title} — {p.price} ₽
      </li>
    ))}
  </ul>
); // ← server-only, без 'use client'`,
}

const SNIPPET_CLIENT: InteractiveSnippet = {
  id: 'add-to-cart',
  label: 'AddToCart.tsx',
  note: 'Client Component: хуки и обработчики — JS в бандле.',
  executable: false,
  languageLabel: 'tsx',
  code: `'use client';

import { useState } from 'react';

type Props = { productId: string };

export const AddToCart = ({ productId }: Props) => {
  const [added, setAdded] = useState(false);

  return (
    <button type="button" onClick={() => setAdded(true)}>
      {added ? 'В корзине' : 'Добавить'} · {productId}
    </button>
  ); // ← client island · hydrate
};`,
}

const SNIPPET_BROKEN: InteractiveSnippet = {
  id: 'broken-counter',
  label: 'Counter.tsx',
  note: 'Server Component не может вызывать useState.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState } from 'react';

export const Counter = () => {
  const [n, setN] = useState(0); // ← ошибка: нет 'use client'

  return (
    <button type="button" onClick={() => setN(n + 1)}>
      {n}
    </button>
  );
};`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  server: [SNIPPET_PAGE, SNIPPET_LIST],
  island: [SNIPPET_PAGE, SNIPPET_CLIENT],
  broken: [SNIPPET_BROKEN],
}

const PAIN = (
  <>
    Server Components рендерятся на сервере и не попадают в клиентский бандл. Client Components с{' '}
    <code>'use client'</code> гидратируются в браузере как «острова» внутри серверного дерева.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  server: (
    <>
      <code>ProductList</code> и <code>page.tsx</code> — только сервер; Flight отдаёт разметку без их
      JS.
    </>
  ),
  island: (
    <>
      Список — server-only; <code>AddToCart</code> с <code>'use client'</code> попадает в бандл и
      получает listeners после гидратации.
    </>
  ),
  broken: (
    <>
      <code>useState</code> в файле без <code>'use client'</code> — сборка/рантайм ругается на
      Server Component.
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
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

const nodeState = (active: boolean, done: boolean, err = false): LabNodeState => {
  if (err && done) return 'err'
  if (active) return 'active'
  if (done) return 'ok'
  return 'idle'
}

type TreeRow = { name: string; kind: 'server' | 'client' | 'err'; indent?: number }

const TREE: Record<CaseId, TreeRow[]> = {
  server: [
    { name: 'ProductsPage', kind: 'server' },
    { name: 'ProductList', kind: 'server', indent: 1 },
  ],
  island: [
    { name: 'ProductsPage', kind: 'server' },
    { name: 'ProductList', kind: 'server', indent: 1 },
    { name: 'AddToCart', kind: 'client', indent: 1 },
  ],
  broken: [{ name: 'Counter', kind: 'err' }],
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  focusRef: MutableRefObject<HTMLDivElement | null>
}

const ComponentTree = ({ caseId, phase }: { caseId: CaseId; phase: Phase }) => {
  const activeIdx =
    phase === 'render'
      ? 0
      : phase === 'flight' || phase === 'hydrate'
        ? caseId === 'broken'
          ? 0
          : 1
        : phase === 'done'
          ? caseId === 'island'
            ? 2
            : 0
          : -1

  return (
    <div className={styles.tree} aria-label="Дерево компонентов">
      {TREE[caseId].map((row, i) => (
        <div
          key={row.name}
          className={`${styles.treeRow}${activeIdx === i ? ` ${styles.treeRowActive}` : ''}`}
          style={{ paddingLeft: `${(row.indent ?? 0) * 0.85}rem` }}
        >
          <span
            className={
              row.kind === 'client'
                ? styles.badgeClient
                : row.kind === 'err'
                  ? styles.badgeErr
                  : styles.badgeServer
            }
          >
            {row.kind === 'client' ? 'client' : row.kind === 'err' ? 'ошибка' : 'server'}
          </span>
          <span>{row.name}</span>
        </div>
      ))}
    </div>
  )
}

const RscViz = ({ caseId, phase, focusRef }: VizProps) => {
  const renderOn = phase === 'render' || phase === 'flight' || phase === 'hydrate' || phase === 'done'
  const flightOn = phase === 'flight' || phase === 'hydrate' || phase === 'done'
  const done = phase === 'done'
  const isBroken = caseId === 'broken'
  const hasClient = caseId === 'island'

  const serverSub = !renderOn
    ? 'ожидание'
    : isBroken
      ? 'useState ✗'
      : caseId === 'server'
        ? 'fetch + list'
        : 'fetch + list + slot'
  const flightSub = !flightOn
    ? '—'
    : isBroken
      ? 'build error'
      : 'RSC payload'
  const bundleSub = !done
    ? hasClient
      ? 'ожидание'
      : '0 client modules'
    : hasClient
      ? 'AddToCart.tsx'
      : '0 client modules'
  const browserSub = !done
    ? '—'
    : isBroken
      ? 'сборка упала'
      : hasClient
        ? 'list + hydrate island'
        : 'list без JS'

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'render'
        ? 'RSC render'
        : phase === 'flight'
          ? 'Flight'
          : phase === 'hydrate'
            ? hasClient
              ? 'hydrate island'
              : 'skip hydrate'
            : isBroken
              ? 'ошибка'
              : hasClient
                ? 'остров живой'
                : 'server-only'

  return (
    <LabVizPanel title="RSC на запрос" meta={meta}>
      <ComponentTree caseId={caseId} phase={phase} />
      <div className={styles.stack}>
        <LabNode
          className={styles.node}
          label="сервер"
          sub={serverSub}
          state={nodeState(phase === 'render', renderOn && phase !== 'render', isBroken && done)}
        />
        <span className={styles.arrow} aria-hidden>
          ↓
        </span>
        <LabNode
          className={styles.node}
          label="Flight"
          sub={flightSub}
          state={nodeState(phase === 'flight', flightOn && phase !== 'flight', isBroken && done)}
        />
        <span className={styles.arrow} aria-hidden>
          ↓
        </span>
        <LabNode
          className={styles.node}
          label="client bundle"
          sub={bundleSub}
          state={nodeState(phase === 'hydrate', done && hasClient, isBroken && done)}
        />
        <span className={styles.arrow} aria-hidden>
          ↓
        </span>
        <LabNode
          ref={focusRef}
          className={styles.node}
          label="браузер"
          sub={browserSub}
          state={nodeState(false, done && !isBroken, isBroken && done)}
        />
      </div>
    </LabVizPanel>
  )
}

export const ReactServerComponentsLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('server')
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

    const hasClient = caseId === 'island'
    const isBroken = caseId === 'broken'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('render')
          if (isBroken) log('warn', 'Counter: useState без use client')
          else log('ok', 'RSC render · fetch на сервере')
        },
        () => {
          setPhase('flight')
          if (isBroken) log('err', 'Flight не собран · build error')
          else log('info', 'Flight → серверные узлы')
        },
        () => {
          if (hasClient) {
            setPhase('hydrate')
            log('info', 'AddToCart.tsx → client bundle')
          } else if (!isBroken) {
            setPhase('hydrate')
            log('info', 'client bundle: 0 server modules')
          }
        },
        () => {
          setPhase('done')
          if (isBroken) {
            log('err', 'сборка: useState in Server Component')
            setHint('нужен use client')
          } else if (hasClient) {
            log('ok', 'hydrate AddToCart · listeners')
            setHint('остров гидратирован')
          } else {
            log('ok', 'ProductList без client JS')
            setHint('server-only дерево')
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
              { opacity: 0.55, y: 6 },
              { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
            )
          },
          undefined,
          STEP * 3 + 0.08,
        )
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('server')
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

      <RscViz caseId={caseId} phase={phase} focusRef={focusRef} />

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
      title="Server components"
      lead="Server Components — сервер и Flight без client JS; `'use client'` — остров с бандлом и гидратацией."
      problem={problem}
      code={code}
    />
  )
}
