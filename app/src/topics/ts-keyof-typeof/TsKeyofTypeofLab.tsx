import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import styles from './TsKeyofTypeofLab.module.css'

const TOPIC_ID = '231-ts-keyof-typeof'

type CaseId = 'keyof' | 'typeof'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'keyof', label: 'keyof' },
  { id: 'typeof', label: 'typeof · keyof typeof' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  keyof: (
    <>
      <code>keyof User</code> даёт <code>&quot;id&quot; | &quot;name&quot;</code>;{' '}
      <code>K extends keyof T</code> делает доступ к полю типобезопасным.
    </>
  ),
  typeof: (
    <>
      <code>typeof ROUTES</code> берёт тип константы;{' '}
      <code>keyof typeof ROUTES</code> — допустимые имена маршрутов.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  keyof: '`keyof` и indexed access: ключ объекта связан с типом поля.',
  typeof: 'Type query `typeof` и связка `keyof typeof` для константы.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  keyof: [
    {
      id: 'user-types',
      label: 'src/user.ts',
      note: '`keyof` — union ключей типа; без значения в рантайме.',
      executable: false,
      languageLabel: 'ts',
      code: `export type User = {
  id: string;
  name: string;
};

export type UserKey = keyof User; // ← KEYOF: "id" | "name"
`,
    },
    {
      id: 'pick-field',
      label: 'src/pickField.ts',
      note: '`K extends keyof T` + `T[K]` — поле и его тип связаны.',
      executable: false,
      languageLabel: 'ts',
      code: `import type { User } from './user';

export function pickField<T, K extends keyof T>(
  obj: T,
  key: K,
): T[K] {
  return obj[key]; // ← INDEXED: тип поля по ключу
}

const user: User = { id: '1', name: 'Ada' };
const name = pickField(user, 'name'); // string
// pickField(user, 'email'); // ← ошибка: нет такого ключа
`,
    },
  ],
  typeof: [
    {
      id: 'routes',
      label: 'src/routes.ts',
      note: '`as const` сужает литералы; `typeof` читает тип значения.',
      executable: false,
      languageLabel: 'ts',
      code: `export const ROUTES = {
  home: '/',
  about: '/about',
  profile: '/me',
} as const;

export type Routes = typeof ROUTES;
// ← TYPEOF: { readonly home: "/"; … }
`,
    },
    {
      id: 'path',
      label: 'src/path.ts',
      note: '`keyof typeof` — имена ключей константы без ручного union.',
      executable: false,
      languageLabel: 'ts',
      code: `import { ROUTES } from './routes';

export type RouteName = keyof typeof ROUTES;
// ← KEYOF TYPEOF: "home" | "about" | "profile"

export function path(name: RouteName): string {
  return ROUTES[name]; // ← безопасный доступ
}

path('home');
// path('settings'); // ← ошибка: нет ключа
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

export function TsKeyofTypeofLab() {
  const [caseId, setCaseId] = useState<CaseId>('keyof')

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} onChange={setCaseId} />

      <p className={shell.pain}>
        <code>keyof</code> и type-level <code>typeof</code> строят типы из формы объекта или
        значения — без дублирования списка ключей вручную.
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
      title="keyof и typeof"
      lead="Ключи типа и тип значения — смотрите файлы на вкладке Код."
      problem={problem}
      code={code}
    />
  )
}
