import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'

const TOPIC_ID = '235-ts-function-overloads'

type CaseId = 'mapping' | 'arity' | 'same-return'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'mapping', label: 'Вход→выход' },
  { id: 'arity', label: 'Число аргументов' },
  { id: 'same-return', label: 'Одинаковый return' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  mapping: (
    <>
      Одна <code>el</code>: у union после <code>el(&quot;div&quot;)</code> тип{' '}
      <code>string | number</code>, у overload — <code>string</code>.
    </>
  ),
  arity: (
    <>
      Одна <code>score</code>: с <code>?</code> проходит вызов из 2 аргументов, с
      overload — только 1 или 3.
    </>
  ),
  'same-return': (
    <>
      У <code>len</code> всегда <code>number</code> — union хватает, overload ничего не
      уточняет.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  mapping: 'Одна el: union даёт string|number, overload — точный тип по тегу.',
  arity: 'Одна score: optional пропускает 2 аргумента, overload — нет.',
  'same-return': 'Одинаковый return: union проще; overload рядом для сравнения.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  mapping: [
    {
      id: 'el-union-ts',
      label: 'src/el.union.ts',
      note: 'Передали "div", а тип всё равно string | number.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// UNION ← связь потеряна
// ═══════════════════════════════════════════
export function el(tag: "div" | "span"): string | number {
  if (tag === "div") return "1111";
  return 2222;
}

const fromDiv = el("div");
// fromDiv: string | number
// fromDiv.toUpperCase(); // ошибка
`,
    },
    {
      id: 'el-overload-ts',
      label: 'src/el.overload.ts',
      note: 'Та же логика: "div" → string, "span" → number.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// OVERLOAD ← связь сохранена
// ═══════════════════════════════════════════
export function el(tag: "div"): string;
export function el(tag: "span"): number;
export function el(tag: "div" | "span"): string | number {
  // ← IMPL: только тело
  if (tag === "span") return 2222;
  return "1111";
}

const fromDiv = el("div"); // string
fromDiv.toUpperCase(); // ок

const fromSpan = el("span"); // number
`,
    },
  ],
  arity: [
    {
      id: 'score-union-ts',
      label: 'src/score.union.ts',
      note: 'Опциональные аргументы: вызов из двух чисел проходит типы.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// UNION ← 2 аргумента тоже ок
// ═══════════════════════════════════════════
export function score(
  points: number,
  bonus?: number,
  mult?: number,
): number {
  return points + (bonus ?? 0) * (mult ?? 1);
}

score(10);
score(10, 2, 3);
score(10, 2); // типы ок — формула «обрезана»
`,
    },
    {
      id: 'score-overload-ts',
      label: 'src/score.overload.ts',
      note: 'Только 1 аргумент или сразу 3 — середины нет.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// OVERLOAD ← только 1 или 3 аргумента
// ═══════════════════════════════════════════
export function score(points: number): number;
export function score(
  points: number,
  bonus: number,
  mult: number,
): number;
export function score(
  points: number,
  bonus?: number,
  mult?: number,
): number {
  // ← IMPL
  return points + (bonus ?? 0) * (mult ?? 1);
}

score(10);
score(10, 2, 3);
// score(10, 2); // ошибка
`,
    },
  ],
  'same-return': [
    {
      id: 'len-union-ts',
      label: 'src/len.union.ts',
      note: 'Return всегда number — одного union хватает.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// UNION ← достаточно
// ═══════════════════════════════════════════
export function len(x: string | number[]): number {
  return x.length;
}

len("hi");
len([1, 2, 3]);
`,
    },
    {
      id: 'len-overload-ts',
      label: 'src/len.overload.ts',
      note: 'Те же вызовы через overload — тип результата не стал точнее.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// OVERLOAD ← лишний при одном return
// ═══════════════════════════════════════════
export function len(s: string): number;
export function len(arr: number[]): number;
export function len(x: string | number[]): number {
  return x.length;
}

len("hi");
len([1, 2, 3]);
`,
    },
  ],
}

function CaseSwitch({
  value,
  onChange,
}: {
  value: CaseId
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

export function TsFunctionOverloadsLab() {
  const [caseId, setCaseId] = useState<CaseId>('mapping')

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} onChange={setCaseId} />

      <p className={shell.pain}>
        Одна и та же функция через union и через overload — смотрите, какой тип
        получается после вызова.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <CaseSwitch value={caseId} onChange={setCaseId} />
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
      title="Перегрузка функций"
      lead="На каждый кейс два файла: union и overload."
      problem={problem}
      code={code}
    />
  )
}
