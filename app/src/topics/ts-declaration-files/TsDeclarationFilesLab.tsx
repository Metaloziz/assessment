import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'

const TOPIC_ID = '227-ts-declaration-files'

type CaseId = 'ambient' | 'bundled'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'ambient', label: 'Свой паспорт' },
  { id: 'bundled', label: 'types в package' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ambient: (
    <>
      В проекте пишем <code>declare module</code> — TypeScript узнаёт форму JS-пакета без своих{' '}
      <code>.d.ts</code>.
    </>
  ),
  bundled: (
    <>
      Автор пакета указывает <code>"types"</code> на свой <code>.d.ts</code> рядом с{' '}
      <code>.js</code>.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  ambient: 'Локальный паспорт для чужого JS: `declare module` и обычный импорт в приложении.',
  bundled: 'Публикация библиотеки: в `package.json` поле `types` ведёт на `dist/*.d.ts`.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  ambient: [
    {
      id: 'slugify-dts',
      label: 'types/slugify.d.ts',
      note: 'Паспорт без реализации: рантайм по-прежнему берёт JS пакета.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// AMBIENT ← типы для JS-пакета
// ═══════════════════════════════════════════
declare module 'slugify' {
  export default function slugify(
    text: string,
    options?: { lower?: boolean }, // ← DTS: форма API
  ): string;
}
`,
    },
    {
      id: 'app-ts',
      label: 'src/app.ts',
      note: 'Импорт обычный: checker читает `.d.ts`, Node/бандлер — JS `slugify`.',
      executable: false,
      languageLabel: 'ts',
      code: `import slugify from 'slugify'; // ← RESOLVE: типы из .d.ts

const path = slugify('Hello World', { lower: true });
// path: string
`,
    },
  ],
  bundled: [
    {
      id: 'pkg-json',
      label: 'package.json',
      note: '`main` — куда за JS; `types` — куда за паспорт для TypeScript.',
      executable: false,
      languageLabel: 'json',
      code: `{
  "name": "greet-lib",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
`,
    },
    {
      id: 'index-dts',
      label: 'dist/index.d.ts',
      note: '`declare` — только описание API; тела функции в этом файле нет.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// BUNDLED DTS ← рядом с dist/index.js
// ═══════════════════════════════════════════
export declare function greet(name: string): string; // ← TYPES ONLY
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

export function TsDeclarationFilesLab() {
  const [caseId, setCaseId] = useState<CaseId>('ambient')

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} onChange={setCaseId} />

      <p className={shell.pain}>
        <code>.d.ts</code> — паспорт API без реализации: checker смотрит типы, браузер и Node
        исполняют JS.
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
      title="Файлы декларации .d.ts"
      lead="Свой `declare module` или `types` в package — смотрите файлы на вкладке Код."
      problem={problem}
      code={code}
    />
  )
}
