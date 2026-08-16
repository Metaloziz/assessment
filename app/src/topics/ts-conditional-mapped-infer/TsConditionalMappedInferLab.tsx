import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import styles from './TsConditionalMappedInferLab.module.css'

const TOPIC_ID = '233-ts-conditional-mapped-infer'

type PatternId = 'conditional' | 'mapped' | 'infer'
type CaseId = 'branch' | 'distribute' | 'readonly-map' | 'modifiers' | 'awaited' | 'return-of'

const PATTERNS: Array<{ id: PatternId; label: string }> = [
  { id: 'conditional', label: 'Conditional' },
  { id: 'mapped', label: 'Mapped' },
  { id: 'infer', label: 'infer' },
]

const CASES: Record<PatternId, Array<{ id: CaseId; label: string }>> = {
  conditional: [
    { id: 'branch', label: 'T extends ?' },
    { id: 'distribute', label: 'distributivity' },
  ],
  mapped: [
    { id: 'readonly-map', label: '[K in keyof T]' },
    { id: 'modifiers', label: '-readonly / -?' },
  ],
  ['infer']: [
    { id: 'awaited', label: 'Promise infer' },
    { id: 'return-of', label: 'Return infer' },
  ],
}

const PATTERN_PAIN: Record<PatternId, ReactNode> = {
  conditional: (
    <>
      <code>T extends U ? X : Y</code> выбирает ветку типов по совместимости — не{' '}
      <code>if</code> в рантайме.
    </>
  ),
  mapped: (
    <>
      Mapped type проходит по ключам и собирает новую объектную форму для checker’а.
    </>
  ),
  ['infer']: (
    <>
      <code>infer R</code> в паттерне <code>extends</code> вытаскивает кусок типа из формы.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  branch: (
    <>
      <code>IsString&lt;T&gt;</code> даёт <code>true</code> или <code>false</code> в зависимости от{' '}
      <code>T extends string</code>.
    </>
  ),
  distribute: (
    <>
      На голом <code>T</code> условие раскрывается по веткам union →{' '}
      <code>string[] | number[]</code>.
    </>
  ),
  'readonly-map': (
    <>
      Mapped по <code>keyof User</code> с <code>readonly</code> на каждом ключе.
    </>
  ),
  modifiers: (
    <>
      <code>-readonly</code> и <code>-?</code> снимают модификаторы с каждого ключа.
    </>
  ),
  awaited: (
    <>
      <code>T extends Promise&lt;infer V&gt;</code> вытаскивает <code>V</code> из промиса.
    </>
  ),
  'return-of': (
    <>
      <code>infer R</code> в сигнатуре функции даёт тип возврата без вызова.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  branch: 'Условный тип: ветка True / False по extends.',
  distribute: 'Distributivity: условие на каждой ветке union.',
  'readonly-map': 'Mapped type: новый объект по keyof.',
  modifiers: 'Снятие readonly и опциональности через -.',
  awaited: '`infer` внутри Promise-паттерна.',
  'return-of': '`infer` из возвращаемого типа функции.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  branch: [
    {
      id: 'is-string',
      label: 'src/isString.ts',
      note: 'Ветка типов по совместимости — только checker.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// CONDITIONAL ← T extends U ? X : Y
// ═══════════════════════════════════════════
export type IsString<T> = T extends string ? true : false;

type A = IsString<"hi">; // ← true
type B = IsString<42>; // ← false
`,
    },
    {
      id: 'non-nullable',
      label: 'src/nonNullable.ts',
      note: 'Ветка never выкидывает null | undefined из union.',
      executable: false,
      languageLabel: 'ts',
      code: `export type NonNullable<T> = T extends null | undefined
  ? never // ← отбросить ветку
  : T;

type Clean = NonNullable<string | null>; // string
`,
    },
  ],
  distribute: [
    {
      id: 'to-array',
      label: 'src/toArray.ts',
      note: 'Голый T + union → условие на каждой ветке.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// DISTRIBUTE ← по веткам union
// ═══════════════════════════════════════════
export type ToArray<T> = T extends unknown ? T[] : never;

type R = ToArray<string | number>;
// ← string[] | number[]  (не (string | number)[])
`,
    },
    {
      id: 'to-array-whole',
      label: 'src/toArrayWhole.ts',
      note: 'Tuple `[T]` отключает distributivity — union целиком.',
      executable: false,
      languageLabel: 'ts',
      code: `export type ToArrayWhole<T> = [T] extends [unknown]
  ? T[] // ← WHOLE: union как один тип
  : never;

type R = ToArrayWhole<string | number>;
// (string | number)[]
`,
    },
  ],
  'readonly-map': [
    {
      id: 'user',
      label: 'src/user.ts',
      note: 'Исходная форма — база для mapped.',
      executable: false,
      languageLabel: 'ts',
      code: `export type User = {
  id: string;
  name: string;
};
`,
    },
    {
      id: 'readonly-user',
      label: 'src/readonlyUser.ts',
      note: '`[K in keyof T]` — пройти по всем ключам.',
      executable: false,
      languageLabel: 'ts',
      code: `import type { User } from './user';

// ═══════════════════════════════════════════
// MAPPED ← объект по ключам
// ═══════════════════════════════════════════
export type ReadonlyUser = {
  readonly [K in keyof User]: User[K]; // ← MAPPED
};

// { readonly id: string; readonly name: string }
`,
    },
  ],
  modifiers: [
    {
      id: 'mutable',
      label: 'src/mutable.ts',
      note: '`-readonly` снимает readonly с каждого поля.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// MODIFIERS ← + / - у ключей
// ═══════════════════════════════════════════
export type Mutable<T> = {
  -readonly [K in keyof T]: T[K]; // ← снять readonly
};

type Frozen = { readonly id: string };
type Soft = Mutable<Frozen>; // { id: string }
`,
    },
    {
      id: 'required-keys',
      label: 'src/requiredKeys.ts',
      note: '`-?` делает все ключи обязательными.',
      executable: false,
      languageLabel: 'ts',
      code: `export type RequiredKeys<T> = {
  [K in keyof T]-?: T[K]; // ← снять ?
};

type Draft = { id?: string; name?: string };
type Ready = RequiredKeys<Draft>;
// { id: string; name: string }
`,
    },
  ],
  awaited: [
    {
      id: 'awaited',
      label: 'src/awaited.ts',
      note: '`infer V` — карман для типа внутри Promise.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// INFER ← вытащить из Promise
// ═══════════════════════════════════════════
export type Awaited<T> = T extends Promise<infer V>
  ? V // ← V из паттерна
  : T;

type A = Awaited<Promise<string>>; // string
type B = Awaited<number>; // number
`,
    },
  ],
  'return-of': [
    {
      id: 'return-of',
      label: 'src/returnOf.ts',
      note: '`infer R` в сигнатуре — тип возврата без вызова.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// INFER ← возврат функции
// ═══════════════════════════════════════════
export type ReturnOf<F> = F extends (...args: never[]) => infer R
  ? R // ← R из паттерна
  : never;

type N = ReturnOf<() => number>; // number
type S = ReturnOf<(x: string) => string>; // string
`,
    },
  ],
}

function PatternSwitch({
  value,
  onChange,
}: {
  value: PatternId
  onChange: (id: PatternId) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
}

function CaseSwitch({
  patternId,
  value,
  onChange,
}: {
  patternId: PatternId
  value: CaseId
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES[patternId].map((c) => (
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

export function TsConditionalMappedInferLab() {
  const [patternId, setPatternId] = useState<PatternId>('conditional')
  const [caseId, setCaseId] = useState<CaseId>('branch')

  const selectPattern = (id: PatternId) => {
    setPatternId(id)
    setCaseId(CASES[id][0].id)
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={patternId} onChange={selectPattern} />
      <CaseSwitch patternId={patternId} value={caseId} onChange={setCaseId} />

      <p className={shell.pain}>{PATTERN_PAIN[patternId]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <PatternSwitch value={patternId} onChange={selectPattern} />
      <CaseSwitch patternId={patternId} value={caseId} onChange={setCaseId} />
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
      title="Conditional · mapped · infer"
      lead="Ветки, проход по ключам и извлечение типа — смотрите файлы на вкладке Код."
      problem={problem}
      code={code}
    />
  )
}
