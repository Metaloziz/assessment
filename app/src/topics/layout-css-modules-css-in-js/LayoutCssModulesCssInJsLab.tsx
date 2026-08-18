import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutCssModulesCssInJsLab.module.css'

const TOPIC_ID = '172-layout-css-modules-css-in-js'
const STEP = 0.6

type Pattern = 'modules' | 'cssInJs'
type CaseId = 'scoped' | 'global' | 'props' | 'runtime'
type Phase = 'idle' | 'paint' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'modules', label: 'CSS Modules' },
  { id: 'cssInJs', label: 'CSS-in-JS' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  modules: [
    { id: 'scoped', label: 'Свои стили' },
    { id: 'global', label: 'Общий .title' },
  ],
  cssInJs: [
    { id: 'props', label: 'Вид от props' },
    { id: 'runtime', label: 'Сначала без CSS' },
  ],
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  scoped: (
    <>
      Товар и новость оба пишут <code>.title</code>, но после хеша это разные классы — заголовки
      остаются своими.
    </>
  ),
  global: (
    <>
      Оба файла объявили один <code>.title</code> на всю страницу — заголовок новости становится
      как у карточки товара.
    </>
  ),
  props: (
    <>
      Одна бирка, два <code>kind</code>: скидка красная, новинка — акцент, без отдельных CSS-файлов.
    </>
  ),
  runtime: (
    <>
      Стили появляются только когда JS вставляет <code>style</code> — до этого бирки «голые».
    </>
  ),
}

const PAIN: Record<Pattern, ReactNode> = {
  modules: (
    <>
      Сборщик делает из локального класса уникальное имя. Общий <code>.title</code> снова смешивает
      два экрана.
    </>
  ),
  cssInJs: (
    <>
      Стили живут рядом с компонентом и легко зависят от <code>props</code>. Если CSS вставляется
      только в браузере — сначала виден голый текст.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  modules: '`ProductTitle.module.css`: локальный `.title` → хеш. Глобальный `.title` — коллизия.',
  cssInJs: '`Tag.tsx`: вид от `kind`. Runtime — `<style>` после загрузки JS.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  modules: [
    {
      id: 'product-title-css',
      label: 'ProductTitle.module.css',
      note: 'Локальный `.title` станет `ProductTitle_title_…`.',
      executable: false,
      languageLabel: 'css',
      code: `.title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--accent);
} /* ← styles.title → ProductTitle_title_a3f2 */

/* Антипример: выход из изоляции
:global(.title) { color: navy; }
*/`,
    },
    {
      id: 'product-title-tsx',
      label: 'ProductTitle.tsx',
      note: 'Импорт объекта styles, не строки «title».',
      executable: false,
      code: `import styles from './ProductTitle.module.css';

type Props = { children: React.ReactNode };

export const ProductTitle = ({ children }: Props) => (
  <h2 className={styles.title}>{children}</h2> // ← хеш уже внутри
);`,
    },
  ],
  cssInJs: [
    {
      id: 'tag-tsx',
      label: 'Tag.tsx',
      note: 'Правила зависят от kind; класс выдаёт библиотека.',
      executable: false,
      code: `import styled from 'styled-components';

export const Tag = styled.span<{ $kind: 'sale' | 'new' }>\`
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  /* ← вид от props, без Tag.sale.css */
  background: \${(p) =>
    p.$kind === 'sale' ? 'var(--danger)' : 'var(--accent)'};
  color: var(--bg-deep);
\`;

// <Tag $kind="sale">Скидка</Tag>
// <Tag $kind="new">Новинка</Tag>`,
    },
    {
      id: 'runtime-inject',
      label: 'injectTag.ts',
      note: 'Упрощённая модель runtime: стиль есть только после JS.',
      executable: false,
      languageLabel: 'ts',
      code: `export const ensureTagStyles = () => {
  if (document.getElementById('sc-tag')) return;

  const el = document.createElement('style'); // ← FOUC, если поздно
  el.id = 'sc-tag';
  el.textContent = '.sc-tag { background: var(--accent); }';
  document.head.appendChild(el);
};`,
    },
  ],
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

type VizProps = {
  pattern: Pattern
  caseId: CaseId
  phase: Phase
  stageRef: MutableRefObject<HTMLDivElement | null>
}

function StyleOrgViz({ pattern, caseId, phase, stageRef }: VizProps) {
  const painted = phase === 'paint' || phase === 'done'
  const done = phase === 'done'
  const leak = done && caseId === 'global'
  const fouc = caseId === 'runtime' && phase === 'paint'
  const tagsOn = caseId === 'props' ? painted : caseId === 'runtime' ? done : painted

  if (pattern === 'modules') {
    return (
      <LabVizPanel
        title="Товар и новость"
        meta={caseId === 'scoped' ? 'у каждого свой .title' : 'один .title на страницу'}
      >
        <div ref={stageRef} className={styles.stage}>
          <article
            className={[
              styles.scene,
              painted && styles.sceneOn,
              done && caseId === 'scoped' && styles.sceneOk,
              leak && styles.sceneWarn,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.sceneKicker}>Каталог</span>
            <h3
              data-paint
              className={[
                styles.heading,
                painted ? styles.productTitle : styles.headingGhost,
              ].join(' ')}
            >
              Наушники
            </h3>
            <span className={styles.sceneMeta}>{painted ? '4 990 ₽' : '—'}</span>
            <span className={styles.receipt}>
              {painted ? (leak ? '.title' : 'Product_title_a3') : 'ещё нет'}
            </span>
          </article>
          <article
            className={[
              styles.scene,
              painted && styles.sceneOn,
              done && caseId === 'scoped' && styles.sceneOk,
              leak && styles.sceneWarn,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.sceneKicker}>Блог</span>
            <h3
              data-paint
              className={[
                styles.heading,
                !painted
                  ? styles.headingGhost
                  : leak
                    ? styles.productTitle
                    : styles.newsTitle,
              ].join(' ')}
            >
              Как выбрать
            </h3>
            <span className={styles.sceneMeta}>{painted ? '12 авг' : '—'}</span>
            <span className={styles.receipt}>
              {painted ? (leak ? '.title' : 'News_title_b9') : 'ещё нет'}
            </span>
          </article>
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel
      title="Бирки на карточке"
      meta={caseId === 'props' ? 'скидка и новинка из props' : 'style после загрузки JS'}
    >
      <div ref={stageRef} className={styles.stage}>
        <div
          className={[
            styles.scene,
            painted && styles.sceneOn,
            done && caseId === 'props' && styles.sceneOk,
            done && caseId === 'runtime' && styles.sceneWarn,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.sceneKicker}>Скидка</span>
          <span
            data-paint
            className={[
              styles.tag,
              tagsOn && !fouc
                ? caseId === 'props'
                  ? styles.tagSale
                  : styles.tagNew
                : styles.tagGhost,
            ].join(' ')}
          >
            −30%
          </span>
          <span className={styles.receipt}>
            {!painted ? 'ещё нет' : fouc ? 'нет style' : caseId === 'props' ? 'sc-sale' : 'style в head'}
          </span>
        </div>
        <div
          className={[
            styles.scene,
            painted && styles.sceneOn,
            done && caseId === 'props' && styles.sceneOk,
            done && caseId === 'runtime' && styles.sceneWarn,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.sceneKicker}>Новинка</span>
          <span
            data-paint
            className={[
              styles.tag,
              tagsOn && !fouc ? styles.tagNew : styles.tagGhost,
            ].join(' ')}
          >
            New
          </span>
          <span className={styles.receipt}>
            {!painted ? 'ещё нет' : fouc ? 'нет style' : caseId === 'props' ? 'sc-new' : 'тот же sc-tag'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutCssModulesCssInJsLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('modules')
  const [caseId, setCaseId] = useState<CaseId>('scoped')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (stageRef.current) {
      gsap.set(stageRef.current.querySelectorAll('[data-paint]'), { clearProps: 'opacity,transform' })
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

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('paint')
          if (pattern === 'modules') {
            log(
              'info',
              caseId === 'scoped'
                ? 'сборщик даёт товару и новости разные имена классов'
                : 'оба файла пишут один .title в документ',
            )
          } else {
            log(
              'info',
              caseId === 'props'
                ? 'рисую бирки из kind: sale и new'
                : 'JS ещё вставляет style — бирки пока без окраски',
            )
          }
        },
        () => {
          setPhase('done')
          if (pattern === 'modules') {
            if (caseId === 'scoped') {
              log('ok', 'наушники крупные, новость спокойная — стили не смешались')
            } else {
              log('err', 'заголовок блога стал как у товара')
            }
          } else if (caseId === 'props') {
            log('ok', 'скидка красная, новинка — акцент')
          } else {
            log('warn', 'бирки окрасились только после style в head')
          }
        },
      ],
      (tl) => {
        const nodes = stageRef.current?.querySelectorAll('[data-paint]')
        if (nodes?.length) {
          tl.fromTo(
            nodes,
            { opacity: 0.35, y: 4 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08 },
            0,
          )
        }
      },
      () => {
        setBusy(false)
        if (pattern === 'modules') {
          setHint(
            caseId === 'scoped'
              ? 'Два заголовка выглядят по-разному — у каждого свой класс.'
              : 'Общий .title перекрасил новость под каталог.',
          )
        } else {
          setHint(
            caseId === 'props'
              ? 'Один компонент, два вида — правила из props.'
              : 'Пока JS не вставил CSS, бирки были просто текстом.',
          )
        }
      },
    )
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {PATTERNS.map((p) => (
          <LabButton
            key={p.id}
            variant="ghost"
            size="sm"
            active={pattern === p.id}
            disabled={busy}
            onClick={() => selectPattern(p.id)}
          >
            {p.label}
          </LabButton>
        ))}
      </div>
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
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => {
            tlRef.current?.kill()
            setBusy(false)
            clear()
            resetViz()
            setPattern('modules')
            setCaseId('scoped')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <StyleOrgViz pattern={pattern} caseId={caseId} phase={phase} stageRef={stageRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <div className={styles.codeSwitch}>
        {PATTERNS.map((p) => (
          <LabButton
            key={p.id}
            variant="ghost"
            size="sm"
            active={pattern === p.id}
            onClick={() => selectPattern(p.id)}
          >
            {p.label}
          </LabButton>
        ))}
      </div>
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
      title="CSS Modules и CSS-in-JS"
      lead="Товар и новость делят имя .title. Хеш или стили в JS не дают им перекрасить друг друга."
      problem={problem}
      code={code}
    />
  )
}
