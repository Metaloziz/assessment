import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'

const TOPIC_ID = '234-ts-template-literal-types'

type CaseId = 'cartesian' | 'getters'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'cartesian', label: 'Union × union' },
  { id: 'getters', label: 'Новые ключи' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  cartesian: (
    <>
      Два union в слотах шаблона раскрываются в все комбинации строковых литералов.
    </>
  ),
  getters: (
    <>
      Mapped + <code>{'`get${Capitalize<K>}`'}</code> строит <code>getId</code> /{' '}
      <code>getName</code> из ключей объекта.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  cartesian: 'Два union → конечный union всех строковых комбинаций.',
  getters: 'Key remapping: новые имена ключей через template и Capitalize.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
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

export function TsTemplateLiteralTypesLab() {
  const [caseId, setCaseId] = useState<CaseId>('cartesian')

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} onChange={setCaseId} />

      <p className={shell.pain}>
        Шаблон <code>{'`…${T}…`'}</code> собирает строковый тип в checker&apos;е; unions в слотах
        дают все комбинации, mapped + <code>as</code> — новые ключи.
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
      title="Template Literal Types"
      lead="Комбинации литералов и remap ключей — смотрите файлы на вкладке Код."
      problem={problem}
      code={code}
    />
  )
}
