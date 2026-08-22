import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'

const TOPIC_ID = '233-ts-conditional-mapped-infer'

type PatternId = 'conditional' | 'mapped' | 'infer'
type CaseId = 'exclude' | 'distribute' | 'key-remap' | 'modifiers' | 'awaited-deep' | 'parameters'

const PATTERNS: Array<{ id: PatternId; label: string }> = [
  { id: 'conditional', label: 'Conditional' },
  { id: 'mapped', label: 'Mapped' },
  { id: 'infer', label: 'infer' },
]

const CASES: Record<PatternId, Array<{ id: CaseId; label: string }>> = {
  conditional: [
    { id: 'exclude', label: 'Exclude / Extract' },
    { id: 'distribute', label: 'distributivity' },
  ],
  mapped: [
    { id: 'key-remap', label: 'Фильтр ключей' },
    { id: 'modifiers', label: '-readonly / -?' },
  ],
  ['infer']: [
    { id: 'awaited-deep', label: 'Рекурсивный Awaited' },
    { id: 'parameters', label: 'Parameters' },
  ],
}

const PATTERN_PAIN: Record<PatternId, ReactNode> = {
  conditional: (
    <>
      <code>T extends U ? X : Y</code> выбирает ветку типов по совместимости — не{' '}
      <code>if</code> в рантайме; на union distributivity применяет условие к каждой ветке.
    </>
  ),
  mapped: (
    <>
      Mapped type проходит по ключам и собирает новую форму; <code>as</code> фильтрует или
      переименовывает ключи.
    </>
  ),
  ['infer']: (
    <>
      <code>infer R</code> в паттерне <code>extends</code> вытаскивает кусок типа — возврат,
      аргументы, вложенный Promise.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  exclude: (
    <>
      <code>Exclude</code> и <code>Extract</code> — conditional + <code>never</code>: distributivity
      выкидывает или оставляет ветки union.
    </>
  ),
  distribute: (
    <>
      Голый <code>T</code> + union → условие на каждой ветке;{' '}
      <code>[T] extends …</code> обрабатывает union целиком.
    </>
  ),
  'key-remap': (
    <>
      <code>as T[K] extends string ? K : never</code> оставляет в mapped только строковые поля.
    </>
  ),
  modifiers: (
    <>
      <code>-readonly</code> и <code>-?</code> снимают модификаторы с каждого ключа.
    </>
  ),
  'awaited-deep': (
    <>
      Рекурсивный <code>Awaited</code> снова вызывает себя на вложенном{' '}
      <code>Promise</code> — разворачивает цепочку промисов.
    </>
  ),
  parameters: (
    <>
      <code>infer P</code> в сигнатуре функции даёт tuple аргументов без вызова — как встроенный{' '}
      <code>Parameters</code>.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  exclude: 'Exclude / Extract: conditional + never отфильтровывает union по совместимости.',
  distribute: 'Distributivity vs `[T] extends`: union по веткам или union целиком.',
  'key-remap': 'Key remapping + conditional: оставить только ключи с нужным типом значения.',
  modifiers: 'Снятие readonly и опциональности через `-` у модификаторов.',
  'awaited-deep': 'Рекурсивный conditional + infer: развернуть вложенные Promise.',
  parameters: 'infer из args: tuple параметров функции, как Parameters<F>.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  exclude: [
    {
      id: 'exclude-extract',
      label: 'src/excludeExtract.ts',
      note: 'never в True-ветке выкидывает член union; Extract — обратная логика.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// EXCLUDE / EXTRACT ← conditional + never
// ═══════════════════════════════════════════
export type Exclude<T, U> = T extends U ? never : T;
export type Extract<T, U> = T extends U ? T : never;

type Mix = string | number | boolean;
type OnlyStr = Exclude<Mix, number | boolean>; // string
type OnlyNum = Extract<Mix, number>; // number
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
  'key-remap': [
    {
      id: 'row',
      label: 'src/row.ts',
      note: 'Исходная форма — база для фильтра ключей.',
      executable: false,
      languageLabel: 'ts',
      code: `export type Row = {
  id: string;
  age: number;
  tag: string;
};
`,
    },
    {
      id: 'strings-only',
      label: 'src/stringsOnly.ts',
      note: '`as` + conditional: ключ попадает в результат только если значение — string.',
      executable: false,
      languageLabel: 'ts',
      code: `import type { Row } from './row';

// ═══════════════════════════════════════════
// KEY REMAP ← фильтр через as … ? K : never
// ═══════════════════════════════════════════
export type StringsOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
  // ← id, tag; age отфильтрован
};

type S = StringsOnly<Row>; // { id: string; tag: string }
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
  'awaited-deep': [
    {
      id: 'awaited-deep',
      label: 'src/awaitedDeep.ts',
      note: 'True-ветка снова вызывает Awaited — цепочка Promise разворачивается.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// RECURSIVE ← infer + снова Awaited<V>
// ═══════════════════════════════════════════
export type Awaited<T> = T extends null | undefined
  ? T
  : T extends Promise<infer V>
    ? Awaited<V> // ← RECURSE: вложенный Promise
    : T;

type Deep = Awaited<Promise<Promise<string>>>; // string
`,
    },
  ],
  parameters: [
    {
      id: 'parameters',
      label: 'src/parameters.ts',
      note: 'infer P в args — tuple параметров, как встроенный Parameters<F>.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// INFER ARGS ← как Parameters<F>
// ═══════════════════════════════════════════
export type Params<F> = F extends (...args: infer P) => unknown ? P : never;

type P = Params<(id: string, limit: number) => void>;
// [string, number]
`,
    },
    {
      id: 'return-of',
      label: 'src/returnOf.ts',
      note: 'Пара infer + conditional: возврат функции без вызова.',
      executable: false,
      languageLabel: 'ts',
      code: `export type ReturnOf<F> = F extends (...args: never[]) => infer R
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
  const [caseId, setCaseId] = useState<CaseId>('exclude')

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
    <div className={shell.codePane}>
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
      lead="Exclude, key remapping, рекурсивный Awaited и infer из args — смотрите файлы на вкладке Код."
      problem={problem}
      code={code}
    />
  )
}
