import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import styles from './TsTemplateLiteralTypesLab.module.css'

const TOPIC_ID = '234-ts-template-literal-types'

type PatternId = 'interpolate' | 'intrinsic' | 'remap'
type CaseId = 'greeting' | 'cartesian' | 'upper' | 'capitalize' | 'getters' | 'path-head'

const PATTERNS: Array<{ id: PatternId; label: string }> = [
  { id: 'interpolate', label: 'Interpolate' },
  { id: 'intrinsic', label: 'Intrinsic' },
  { id: 'remap', label: 'infer / remap' },
]

const CASES: Record<PatternId, Array<{ id: CaseId; label: string }>> = {
  interpolate: [
    { id: 'greeting', label: '`hello-${T}`' },
    { id: 'cartesian', label: 'union × union' },
  ],
  intrinsic: [
    { id: 'upper', label: 'Uppercase' },
    { id: 'capitalize', label: 'Capitalize' },
  ],
  remap: [
    { id: 'getters', label: '`get${…}`' },
    { id: 'path-head', label: 'infer path' },
  ],
}

const PATTERN_PAIN: Record<PatternId, ReactNode> = {
  interpolate: (
    <>
      Шаблон <code>{'`…${T}…`'}</code> собирает строковый тип; unions в слотах дают все
      комбинации.
    </>
  ),
  intrinsic: (
    <>
      Intrinsic меняют регистр литералов: <code>Uppercase</code>, <code>Capitalize</code> и др.
    </>
  ),
  remap: (
    <>
      <code>infer</code> в шаблоне разбирает строку; mapped + <code>as</code> переименовывает ключи.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  greeting: (
    <>
      <code>{'`hello-${string}`'}</code> принимает любой хвост после префикса{' '}
      <code>hello-</code>.
    </>
  ),
  cartesian: (
    <>
      Два union в слотах раскрываются в декартово произведение литералов.
    </>
  ),
  upper: (
    <>
      <code>Uppercase&lt;&quot;id&quot;&gt;</code> даёт литерал <code>&quot;ID&quot;</code>.
    </>
  ),
  capitalize: (
    <>
      <code>Capitalize&lt;&quot;name&quot;&gt;</code> поднимает только первый символ.
    </>
  ),
  getters: (
    <>
      Mapped + <code>{'`get${Capitalize<K>}`'}</code> строит <code>getId</code> /{' '}
      <code>getName</code> из ключей.
    </>
  ),
  'path-head': (
    <>
      <code>{'`${infer Head}/${infer Rest}`'}</code> вытаскивает первый сегмент пути.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  greeting: 'Шаблон с широким string: любой хвост после префикса.',
  cartesian: 'Два union → все комбинации строковых литералов.',
  upper: 'Intrinsic Uppercase на литерале и на union.',
  capitalize: 'Capitalize — база для имён вроде getName.',
  getters: 'Key remapping: новые ключи из старых через template.',
  'path-head': '`infer` внутри шаблона разбирает путь на сегменты.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  greeting: [
    {
      id: 'greeting-ts',
      label: 'src/greeting.ts',
      note: 'Префикс зафиксирован; хвост — любой string.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// TEMPLATE ← \`hello-\${T}\`
// ═══════════════════════════════════════════
export type Greeting = \`hello-\${string}\`; // ← SLOT: любой хвост

const ok: Greeting = "hello-world";
// const bad: Greeting = "hi-world"; // ошибка: нет префикса
`,
    },
  ],
  cartesian: [
    {
      id: 'point-ts',
      label: 'src/point.ts',
      note: 'Каждая ветка × каждая ветка → конечный union литералов.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// CARTESIAN ← union × union
// ═══════════════════════════════════════════
type Axis = "x" | "y";
type Sign = "+" | "-";

export type Point = \`\${Axis}\${Sign}\`;
// ← "x+" | "x-" | "y+" | "y-"
`,
    },
  ],
  upper: [
    {
      id: 'upper-ts',
      label: 'src/upper.ts',
      note: 'Uppercase работает по каждой ветке union.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// INTRINSIC ← Uppercase
// ═══════════════════════════════════════════
export type U = Uppercase<"id">; // ← "ID"
export type Flags = Uppercase<"on" | "off">; // "ON" | "OFF"
`,
    },
  ],
  capitalize: [
    {
      id: 'capitalize-ts',
      label: 'src/capitalize.ts',
      note: 'Только первая буква — типичный шаг перед remap.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// INTRINSIC ← Capitalize
// ═══════════════════════════════════════════
export type C = Capitalize<"name">; // ← "Name"
export type Props = Capitalize<"id" | "name">; // "Id" | "Name"
`,
    },
  ],
  getters: [
    {
      id: 'user-ts',
      label: 'src/user.ts',
      note: 'Исходные ключи — база для новых имён.',
      executable: false,
      languageLabel: 'ts',
      code: `export type User = {
  id: string;
  name: string;
};
`,
    },
    {
      id: 'getters-ts',
      label: 'src/getters.ts',
      note: '`as` + template + Capitalize → getId / getName.',
      executable: false,
      languageLabel: 'ts',
      code: `import type { User } from './user';

// ═══════════════════════════════════════════
// REMAP ← get\${Capitalize<K>}
// ═══════════════════════════════════════════
export type Getters<T> = {
  [K in keyof T & string as \`get\${Capitalize<K>}\`]: () => T[K];
  // ← id → getId, name → getName
};

type UserGetters = Getters<User>;
// { getId: () => string; getName: () => string }
`,
    },
  ],
  'path-head': [
    {
      id: 'path-ts',
      label: 'src/pathHead.ts',
      note: 'Два infer в шаблоне: голова и остаток пути.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// INFER ← \${infer Head}/\${infer Rest}
// ═══════════════════════════════════════════
export type PathHead<T extends string> = T extends \`\${infer Head}/\${infer Rest}\`
  ? Head // ← первый сегмент
  : T;

type H = PathHead<"users/42/profile">; // "users"
type Leaf = PathHead<"users">; // "users" — без /
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

export function TsTemplateLiteralTypesLab() {
  const [patternId, setPatternId] = useState<PatternId>('interpolate')
  const [caseId, setCaseId] = useState<CaseId>('greeting')

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
      title="Template Literal Types"
      lead="Интерполяция, intrinsic и remap ключей — смотрите файлы на вкладке Код."
      problem={problem}
      code={code}
    />
  )
}
