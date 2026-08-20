import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactServerComponentsLab.module.css'

const TOPIC_ID = '199-react-server-components'
const STEP = 0.6

type CaseId = 'server' | 'island' | 'broken'
type Phase = 'idle' | 'render' | 'flight' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'server', label: 'Только сервер' },
  { id: 'island', label: 'Остров кнопки' },
  { id: 'broken', label: 'Хук без границы' },
]

const CODE_INTRO: Record<CaseId, string> = {
  server: 'Список и страница живут на сервере — в клиентский бандл их JS не попадает.',
  island: "Кнопка с `'use client'` — островок: только она едет в бандл и получает клики.",
  broken: "`useState` в файле без `'use client'` — серверный компонент так нельзя.",
}

const SNIPPET_PAGE: InteractiveSnippet = {
  id: 'page-server',
  label: 'app/products/page.tsx',
  note: 'Серверная страница: async fetch и разметка каталога.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { ProductList } from './ProductList';
import { AddToCart } from './AddToCart';

const ProductsPage = async () => {
  const products = await db.products.findMany(); // ← только сервер

  return (
    <main>
      <h1>Каталог</h1>
      <ProductList items={products} />
      <AddToCart productId={products[0].id} />
    </main>
  );
};

export default ProductsPage;`,
}

const SNIPPET_LIST: InteractiveSnippet = {
  id: 'product-list',
  label: 'ProductList.tsx',
  note: 'Без директивы — серверный список, в бандл не едет.',
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
); // ← server-only`,
}

const SNIPPET_CLIENT: InteractiveSnippet = {
  id: 'add-to-cart',
  label: 'AddToCart.tsx',
  note: 'Островок: хук и клик — JS в бандле.',
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
  ); // ← остров · гидратация
};`,
}

const SNIPPET_BROKEN: InteractiveSnippet = {
  id: 'broken-counter',
  label: 'Counter.tsx',
  note: 'Серверный файл не может вызывать useState.',
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
    Страница — серверная рама: список рисуется на сервере и не раздувает бандл. Клики и{' '}
    <code>useState</code> живут только в островках с <code>'use client'</code>.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  server: (
    <>
      Каталог без кнопки: в бандл не уходит ни одного client-модуля — только разметка с сервера.
    </>
  ),
  island: (
    <>
      Список остаётся на сервере; кнопка «Добавить» — островок, который гидратируют в браузере.
    </>
  ),
  broken: (
    <>
      Счётчик с <code>useState</code> без <code>'use client'</code> — сборка останавливается на
      серверном файле.
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

type VizProps = {
  caseId: CaseId
  phase: Phase
  frameRef: MutableRefObject<HTMLDivElement | null>
  islandRef: MutableRefObject<HTMLDivElement | null>
  added: boolean
  onAdd: () => void
}

const RscViz = ({ caseId, phase, frameRef, islandRef, added, onAdd }: VizProps) => {
  const renderOn = phase === 'render' || phase === 'flight' || phase === 'done'
  const flightOn = phase === 'flight' || phase === 'done'
  const done = phase === 'done'
  const isBroken = caseId === 'broken'
  const hasIsland = caseId === 'island'

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'render'
        ? isBroken
          ? 'сервер · ошибка хука'
          : 'сервер рисует раму'
        : phase === 'flight'
          ? isBroken
            ? 'Flight не собран'
            : 'Flight → браузер'
          : isBroken
            ? 'сборка упала'
            : hasIsland
              ? 'островок живой'
              : 'бандл пуст'

  const bundleLine = !done
    ? 'бандл: —'
    : isBroken
      ? 'бандл: сборка не прошла'
      : hasIsland
        ? 'бандл: AddToCart.tsx'
        : 'бандл: 0 client-модулей'

  return (
    <LabVizPanel title="Каталог: рама и остров" meta={meta}>
      <div className={styles.stage}>
        <div
          ref={frameRef}
          className={`${styles.frame}${renderOn ? ` ${styles.frameOn}` : ''}${
            isBroken && done ? ` ${styles.frameErr}` : ''
          }`}
        >
          <div className={styles.frameHead}>
            <span className={styles.badgeServer}>сервер</span>
            <span className={styles.frameTitle}>
              {isBroken ? 'Counter.tsx' : 'Каталог'}
            </span>
          </div>

          {isBroken ? (
            <div className={styles.brokenBody}>
              <p className={styles.brokenText}>
                <code>useState</code> без <code>'use client'</code>
              </p>
              {done ? <p className={styles.errNote}>сборка остановилась</p> : null}
            </div>
          ) : (
            <>
              <ul
                className={`${styles.list}${renderOn ? ` ${styles.listOn}` : ''}`}
                aria-label="Список с сервера"
              >
                <li>Багет — 80 ₽</li>
                <li>Чиабатта — 90 ₽</li>
              </ul>

              {hasIsland ? (
                <div
                  ref={islandRef}
                  className={`${styles.island}${flightOn ? ` ${styles.islandOn}` : ''}${
                    done ? ` ${styles.islandLive}` : ''
                  }`}
                >
                  <span className={styles.badgeClient}>остров</span>
                  <button
                    type="button"
                    className={styles.demoBtn}
                    disabled={!done}
                    onClick={onAdd}
                  >
                    {done ? (added ? 'В корзине · p1' : 'Добавить · p1') : 'Добавить'}
                  </button>
                  <span className={styles.islandMeta}>
                    {done ? 'клики работают' : flightOn ? 'ждёт JS' : 'слот'}
                  </span>
                </div>
              ) : (
                <p className={styles.noIsland}>
                  {renderOn ? 'кнопки-острова нет — только серверная разметка' : '…'}
                </p>
              )}
            </>
          )}
        </div>

        <div className={styles.receipt}>
          <span className={flightOn || done ? styles.receiptOn : undefined}>
            {flightOn || done
              ? isBroken
                ? 'Flight: ошибка'
                : 'Flight: рама + ссылки на острова'
              : 'Flight: —'}
          </span>
          <span className={done ? (isBroken ? styles.receiptErr : styles.receiptOn) : undefined}>
            {bundleLine}
          </span>
        </div>
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
  const [added, setAdded] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const islandRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setAdded(false)
    if (frameRef.current) gsap.set(frameRef.current, { clearProps: 'transform,opacity' })
    if (islandRef.current) gsap.set(islandRef.current, { clearProps: 'transform,opacity' })
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

    const hasIsland = caseId === 'island'
    const isBroken = caseId === 'broken'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('render')
          if (isBroken) log('warn', 'сервер: useState без границы')
          else log('ok', 'сервер: fetch и список')
        },
        () => {
          setPhase('flight')
          if (isBroken) log('err', 'Flight не собран')
          else log('info', 'Flight: рама ушла в браузер')
        },
        () => {
          setPhase('done')
          if (isBroken) {
            log('err', 'сборка: хук в Server Component')
            setHint('нужен use client')
          } else if (hasIsland) {
            log('ok', 'островок AddToCart гидратирован')
            setHint('клики только у островка')
          } else {
            log('ok', 'бандл пуст — список без client JS')
            setHint('вся рама осталась на сервере')
          }
        },
      ],
      (tl) => {
        tl.call(
          () => {
            const el = frameRef.current
            if (!el) return
            gsap.fromTo(
              el,
              { opacity: 0.55, y: 6 },
              { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
            )
          },
          undefined,
          0.08,
        )
        if (hasIsland) {
          tl.call(
            () => {
              const el = islandRef.current
              if (!el) return
              gsap.fromTo(
                el,
                { opacity: 0.45, y: 5 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
              )
            },
            undefined,
            STEP * 2 + 0.08,
          )
        }
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

      <RscViz
        caseId={caseId}
        phase={phase}
        frameRef={frameRef}
        islandRef={islandRef}
        added={added}
        onAdd={() => setAdded(true)}
      />

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
      title="Server components"
      lead="Рама страницы на сервере без лишнего JS; `'use client'` — островок с бандлом и кликами."
      problem={problem}
      code={code}
    />
  )
}
