import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import styles from './TsDeclarationFilesLab.module.css'

const TOPIC_ID = '227-ts-declaration-files'

type CaseId = 'ambient' | 'bundled'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'ambient', label: 'Ambient module' },
  { id: 'bundled', label: 'types в package' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ambient: (
    <>
      Локальный <code>declare module</code> даёт типы JS-пакету без своих <code>.d.ts</code>.
    </>
  ),
  bundled: (
    <>
      Пакет указывает <code>"types"</code> на свой <code>.d.ts</code> рядом с <code>.js</code>.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  ambient: 'Shim для legacy JS: `declare module` + импорт в приложении.',
  bundled: 'Публикация библиотеки: `package.json` → `types` → `dist/*.d.ts`.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  ambient: [
    {
      id: 'slugify-dts',
      label: 'types/slugify.d.ts',
      note: '`declare module` — контракт без реализации; рантайм всё ещё JS пакета.',
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
      note: 'Импорт обычный; checker читает `.d.ts`, Node/бандлер — `slugify` JS.',
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
      note: '`main` — JS; `types` — точка входа деклараций для TypeScript.',
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
      note: '`declare` — описание emit’нутого API, тела функции здесь нет.',
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
        <code>.d.ts</code> описывает API без реализации: checker берёт типы, рантайм — JS.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
    </div>
  )

  const code = (
    <div className={styles.codePane}>
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
      lead="Ambient module и `types` в package — смотрите файлы на вкладке Код."
      problem={problem}
      code={code}
    />
  )
}
