import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutGridLab.module.css'

const TOPIC_ID = '173-layout-grid'

type CaseId = 'areas' | 'auto' | 'span' | 'fr' | 'stack' | 'dense'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'areas', label: 'Areas' },
  { id: 'auto', label: 'Авто-поток' },
  { id: 'span', label: 'Span' },
  { id: 'fr', label: '1fr 2fr' },
  { id: 'stack', label: '1 колонка' },
  { id: 'dense', label: 'Dense' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  areas: (
    <>
      <code>grid-template-areas</code>: A и D на всю ширину, B | C в середине.
    </>
  ),
  auto: (
    <>
      Только <code>grid-template-columns</code> — тот же DOM заполняет ячейки по порядку: D не внизу.
    </>
  ),
  span: (
    <>
      A и D с <code>grid-column: 1 / -1</code>; B и C делят средний ряд.
    </>
  ),
  fr: (
    <>
      Колонки <code>1fr 2fr</code>: B узкий, C забирает две доли свободного места.
    </>
  ),
  stack: (
    <>
      Одна колонка — блоки идут столбиком в порядке DOM (как узкий брейкпоинт).
    </>
  ),
  dense: (
    <>
      <code>grid-auto-flow: dense</code> + span: C тянется на два ряда, дыры закрываются.
    </>
  ),
}

const CASE_META: Record<CaseId, string> = {
  areas: 'template-areas',
  auto: 'auto-flow · row',
  span: 'grid-column: 1 / -1',
  fr: 'columns: 1fr 2fr',
  stack: 'columns: 1fr',
  dense: 'auto-flow: dense',
}

const CASE_CSS: Record<CaseId, string> = {
  areas: `grid-template-areas:
  "a a"
  "b c"
  "d d"`,
  auto: `grid-template-columns: 5.5rem 1fr;
/* без areas → A|B , C|D */`,
  span: `.a, .d { grid-column: 1 / -1; }`,
  fr: `grid-template-columns: 1fr 2fr;`,
  stack: `grid-template-columns: 1fr;`,
  dense: `grid-auto-flow: dense;
.a { grid-column: span 2; }
.c { grid-row: span 2; }`,
}

const FRAME_CLASS: Record<CaseId, string> = {
  areas: styles.areas,
  auto: styles.auto,
  span: styles.span,
  fr: styles.fr,
  stack: styles.stack,
  dense: styles.dense,
}

const WARN_CASES: Partial<Record<CaseId, true>> = {
  auto: true,
}

type CellId = 'a' | 'b' | 'c' | 'd'

const CELLS: Array<{ id: CellId; label: string; role: Record<CaseId, string>; className: string }> = [
  {
    id: 'a',
    label: 'A',
    className: styles.cellA,
    role: {
      areas: 'header',
      auto: 'ячейка 1',
      span: 'hero · span',
      fr: 'header',
      stack: '1-й',
      dense: 'span 2 col',
    },
  },
  {
    id: 'b',
    label: 'B',
    className: styles.cellB,
    role: {
      areas: 'nav',
      auto: 'ячейка 2',
      span: 'left',
      fr: 'nav · 1fr',
      stack: '2-й',
      dense: 'auto',
    },
  },
  {
    id: 'c',
    label: 'C',
    className: styles.cellC,
    role: {
      areas: 'main',
      auto: 'ячейка 3',
      span: 'right',
      fr: 'main · 2fr',
      stack: '3-й',
      dense: 'span 2 row',
    },
  },
  {
    id: 'd',
    label: 'D',
    className: styles.cellD,
    role: {
      areas: 'footer',
      auto: 'ячейка 4',
      span: 'footer · span',
      fr: '—',
      stack: '4-й',
      dense: 'в дыру',
    },
  },
]

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'page-areas',
    label: 'areas.css',
    note: 'Карта имён = каркас. Тот же DOM на узком экране — другая карта в одну колонку.',
    executable: false,
    languageLabel: 'css',
    code: `.layout {
  display: grid;
  grid-template-columns: 12rem 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 0.75rem;

  /* ← AREAS */
  grid-template-areas:
    "a a"
    "b c"
    "d d";
}

.a { grid-area: a; } /* header */
.b { grid-area: b; } /* nav */
.c { grid-area: c; } /* main */
.d { grid-area: d; } /* footer */`,
  },
  {
    id: 'span-fr',
    label: 'span-fr.css',
    note: 'Span тянет блок через линии; fr делит свободное место после gap.',
    executable: false,
    languageLabel: 'css',
    code: `.spanLayout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.hero,
.footer {
  grid-column: 1 / -1; /* ← SPAN на всю ширину */
}

.frLayout {
  display: grid;
  grid-template-columns: 1fr 2fr; /* ← узкий | широкий */
  grid-template-areas:
    "a a"
    "b c";
}`,
  },
  {
    id: 'auto-dense',
    label: 'auto-dense.css',
    note: 'Авто-поток без карты ломает каркас. dense закрывает дыры после span.',
    executable: false,
    languageLabel: 'css',
    code: `/* AUTO: только колонки — DOM A B C D → A|B , C|D */
.auto {
  display: grid;
  grid-template-columns: 12rem 1fr;
}

/* DENSE: после span браузер пытается заполнить дыры */
.dense {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-flow: dense; /* ← осторожно с a11y / порядком */
}

.dense .a { grid-column: span 2; }
.dense .c { grid-row: span 2; }`,
  },
]

function cellVisible(caseId: CaseId, id: CellId) {
  return !(caseId === 'fr' && id === 'd')
}

function warnCell(caseId: CaseId, id: CellId) {
  if (caseId === 'auto') return id === 'c' || id === 'd'
  return false
}

function GridViz({ caseId }: { caseId: CaseId }) {
  const warn = Boolean(WARN_CASES[caseId])

  return (
    <LabVizPanel title="Раскладка блоков" meta={CASE_META[caseId]}>
      <div className={styles.stage}>
        <div
          className={[
            styles.frame,
            FRAME_CLASS[caseId],
            warn ? styles.frameWarn : styles.frameOk,
          ].join(' ')}
        >
          {CELLS.filter((cell) => cellVisible(caseId, cell.id)).map((cell) => (
            <div
              key={cell.id}
              className={[
                styles.cell,
                cell.className,
                warnCell(caseId, cell.id) && styles.cellWarn,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{cell.label}</span>
              <span className={styles.cellRole}>{cell.role[caseId]}</span>
            </div>
          ))}
        </div>
        <div className={styles.metaRow}>
          <code className={styles.metaCode}>{CASE_CSS[caseId]}</code>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutGridLab() {
  const [caseId, setCaseId] = useState<CaseId>('areas')

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => setCaseId(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <p className={shell.pain}>
        Один и тот же набор блоков A–D. Меняются свойства Grid — меняется, куда браузер кладёт
        каждый блок.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <GridViz caseId={caseId} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Areas и span для каркаса; fr для долей; авто-поток и dense — когда порядок DOM и дыры начинают влиять на картинку."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="CSS Grid"
      lead="Переключай свойства — сетка сразу показывает, куда легли блоки."
      problem={problem}
      code={code}
    />
  )
}
