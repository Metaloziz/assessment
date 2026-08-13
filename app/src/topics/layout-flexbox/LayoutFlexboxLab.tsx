import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutFlexboxLab.module.css'

const TOPIC_ID = '169-layout-flexbox'

type CaseId = 'row' | 'column' | 'between' | 'center' | 'wrap' | 'grow' | 'order'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'row', label: 'Row' },
  { id: 'column', label: 'Column' },
  { id: 'between', label: 'Space-between' },
  { id: 'center', label: 'Center' },
  { id: 'wrap', label: 'Wrap' },
  { id: 'grow', label: 'Grow' },
  { id: 'order', label: 'Order' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  row: (
    <>
      <code>flex-direction: row</code> — главная ось горизонталь, A→B→C→D в одну линию.
    </>
  ),
  column: (
    <>
      <code>flex-direction: column</code> — та же разметка становится вертикальным стеком.
    </>
  ),
  between: (
    <>
      <code>justify-content: space-between</code> + <code>align-items: center</code> — края и середина поперечной оси.
    </>
  ),
  center: (
    <>
      <code>justify-content</code> и <code>align-items: center</code> — группа по центру контейнера.
    </>
  ),
  wrap: (
    <>
      <code>flex-wrap: wrap</code> — при нехватке ширины появляются две flex-линии (A B / C D).
    </>
  ),
  grow: (
    <>
      У B стоит <code>flex: 1 1 0%</code> — забирает всё свободное место по главной оси.
    </>
  ),
  order: (
    <>
      Визуально C→A→B→D, но DOM и Tab по-прежнему A→B→C→D.
    </>
  ),
}

const CASE_META: Record<CaseId, string> = {
  row: 'flex-direction: row',
  column: 'flex-direction: column',
  between: 'justify-content: space-between',
  center: 'justify + align: center',
  wrap: 'flex-wrap: wrap',
  grow: 'flex: 1 на B',
  order: 'order ≠ DOM',
}

const CASE_CSS: Record<CaseId, string> = {
  row: `flex-direction: row;`,
  column: `flex-direction: column;`,
  between: `justify-content: space-between;
align-items: center;`,
  center: `justify-content: center;
align-items: center;`,
  wrap: `flex-wrap: wrap;
/* A B / C D */`,
  grow: `.b { flex: 1 1 0%; }`,
  order: `.c { order: 1; }
.a { order: 2; }
.b { order: 3; }
/* Tab всё ещё A→B→C→D */`,
}

const FRAME_CLASS: Record<CaseId, string> = {
  row: styles.row,
  column: styles.column,
  between: styles.between,
  center: styles.center,
  wrap: styles.wrap,
  grow: styles.grow,
  order: styles.order,
}

const WARN_CASES: Partial<Record<CaseId, true>> = {
  order: true,
}

type CellId = 'a' | 'b' | 'c' | 'd'

const CELLS: Array<{ id: CellId; label: string; role: Record<CaseId, string>; className: string }> = [
  {
    id: 'a',
    label: 'A',
    className: styles.cellA,
    role: {
      row: '1-й',
      column: 'верх',
      between: 'левый край',
      center: 'в группе',
      wrap: 'линия 1',
      grow: 'auto',
      order: 'order 2',
    },
  },
  {
    id: 'b',
    label: 'B',
    className: styles.cellB,
    role: {
      row: '2-й',
      column: 'ниже',
      between: '…',
      center: 'в группе',
      wrap: 'линия 1',
      grow: 'flex: 1',
      order: 'order 3',
    },
  },
  {
    id: 'c',
    label: 'C',
    className: styles.cellC,
    role: {
      row: '3-й',
      column: 'ниже',
      between: '…',
      center: 'в группе',
      wrap: 'линия 2',
      grow: 'auto',
      order: 'order 1 · Tab 3-й',
    },
  },
  {
    id: 'd',
    label: 'D',
    className: styles.cellD,
    role: {
      row: '4-й',
      column: 'низ',
      between: 'правый край',
      center: 'в группе',
      wrap: 'линия 2',
      grow: 'auto',
      order: 'order 4',
    },
  },
]

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'toolbar',
    label: 'toolbar.css',
    note: 'Ряд по умолчанию: ось, gap, выравнивание по поперечной.',
    executable: false,
    languageLabel: 'css',
    code: `.toolbar {
  display: flex;
  flex-direction: row;       /* ← главная ось */
  align-items: center;       /* ← поперечная */
  gap: 0.5rem;
}

.stack {
  display: flex;
  flex-direction: column;    /* ← justify уже сверху вниз */
  gap: 0.75rem;
}`,
  },
  {
    id: 'distribute',
    label: 'distribute.css',
    note: 'Свободное место на контейнере и у ребёнка через flex.',
    executable: false,
    languageLabel: 'css',
    code: `.bar {
  display: flex;
  justify-content: space-between; /* ← края */
  align-items: center;
}

.grow {
  flex: 1 1 0%; /* ← забрать остаток; часто + min-width: 0 */
}

.chips {
  display: flex;
  flex-wrap: wrap; /* ← несколько линий */
  gap: 0.5rem;
}`,
  },
  {
    id: 'order',
    label: 'order.css',
    note: 'order меняет только картинку. Tab и screen reader идут по DOM.',
    executable: false,
    languageLabel: 'css',
    code: `/* DOM: A B C D  →  визуал: C A B D */
.c { order: 1; } /* ← WARN: фокус всё ещё 3-й */
.a { order: 2; }
.b { order: 3; }
.d { order: 4; }

/* Лучше поменять порядок в JSX, если так задумана a11y */`,
  },
]

function warnCell(caseId: CaseId, id: CellId) {
  return caseId === 'order' && id === 'c'
}

function FlexViz({ caseId }: { caseId: CaseId }) {
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
          {CELLS.map((cell) => (
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

export function LayoutFlexboxLab() {
  const [caseId, setCaseId] = useState<CaseId>('row')

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
        Один и тот же набор блоков A–D. Меняются свойства Flex — меняются ось, свободное место и
        визуальный порядок.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <FlexViz caseId={caseId} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Ось и wrap на контейнере; `flex` и `order` на детях. Grid — для 2D-каркаса, Flex — для ряда и стека."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Flexbox"
      lead="Переключай свойства — flex сразу показывает, как легли блоки."
      problem={problem}
      code={code}
    />
  )
}
