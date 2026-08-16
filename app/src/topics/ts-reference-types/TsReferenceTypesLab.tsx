import { useState, type ReactNode } from "react";
import { JsLabShell } from "../../components/lab/JsLabShell";
import { LabButton } from "../../components/lab/LabButton";
import shell from "../../components/lab/JsLabShell.module.css";
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from "../../components/lab/InteractiveCodePanel";
import styles from "./TsReferenceTypesLab.module.css";

const TOPIC_ID = "236-ts-reference-types";

type CaseId = "types" | "path" | "lib";

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: "types", label: "reference types" },
  { id: "path", label: "reference path" },
  { id: "lib", label: "reference lib" },
];

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  types: (
    <>
      <code>types=&quot;vite/client&quot;</code> подтягивает ambient-типы Vite без{" "}
      <code>import</code>.
    </>
  ),
  path: (
    <>
      <code>path</code> включает конкретный <code>.d.ts</code> в компиляцию по
      относительному пути.
    </>
  ),
  lib: (
    <>
      <code>lib=&quot;es2017.string&quot;</code> даёт встроенные методы строки
      автору деклараций.
    </>
  ),
};

const CODE_INTRO: Record<CaseId, string> = {
  types: "Пакет деклараций в контекст: как import для @types / types пакета.",
  path: "Файловая зависимость: локальный .d.ts без модульного import.",
  lib: "Встроенная lib.*.d.ts — тот же смысл, что compilerOptions.lib.",
};

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  types: [
    {
      id: "vite-env-dts",
      label: "src/vite-env.d.ts",
      note: "Entry окружения: директива вверху файла подключает типы Vite.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// REFERENCE TYPES ← пакет деклараций
// ═══════════════════════════════════════════
/// <reference types="vite/client" />
// ← TYPES: ambient Vite (import.meta.env, ассеты)

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
`,
    },
    {
      id: "app-ts",
      label: "src/app.ts",
      note: "Модуль пользуется глобалами/ambient из vite/client без импорта типов.",
      executable: false,
      languageLabel: "ts",
      code: `const url = import.meta.env.VITE_API_URL; // ← из vite/client + env.d.ts
const mode = import.meta.env.MODE;
`,
    },
  ],
  path: [
    {
      id: "globals-dts",
      label: "types/globals.d.ts",
      note: "Локальный ambient: имена доступны после reference path.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// GLOBALS ← файл для path-ссылки
// ═══════════════════════════════════════════
type AppName = "desk" | "mobile";

declare const APP_BUILD: string;
`,
    },
    {
      id: "shim-dts",
      label: "types/shim.d.ts",
      note: "path относительно этого файла — подтянуть globals в компиляцию.",
      executable: false,
      languageLabel: "ts",
      code: `/// <reference path="./globals.d.ts" />
// ← PATH: включить файл в контекст checker’а

declare function boot(name: AppName): void; // ← AppName из globals.d.ts
`,
    },
  ],
  lib: [
    {
      id: "pad-dts",
      label: "types/pad.d.ts",
      note: "Автору .d.ts нужен padStart без ручного объявления метода.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// REFERENCE LIB ← встроенная библиотека
// ═══════════════════════════════════════════
/// <reference lib="es2017.string" />
// ← LIB: как "lib": ["es2017.string"] в tsconfig

export declare function padId(raw: string): string;
`,
    },
    {
      id: "pad-impl-ts",
      label: "src/pad.ts",
      note: "Реализация опирается на типы из lib; emit — обычный JS.",
      executable: false,
      languageLabel: "ts",
      code: `export function padId(raw: string): string {
  return raw.padStart(4, "0"); // ← метод из es2017.string
}
`,
    },
  ],
};

function CaseSwitch({
  value,
  onChange,
}: {
  value: CaseId;
  onChange: (id: CaseId) => void;
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
  );
}

export function TsReferenceTypesLab() {
  const [caseId, setCaseId] = useState<CaseId>("types");

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} onChange={setCaseId} />

      <p className={shell.pain}>
        <code>/// &lt;reference … /&gt;</code> подключает декларации в checker:
        пакет, файл или встроенную <code>lib</code> — без runtime-import.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
    </div>
  );

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
  );

  return (
    <JsLabShell
      title="Reference types"
      lead="`types`, `path` и `lib` — три способа подтянуть декларации; смотрите файлы на вкладке Код."
      problem={problem}
      code={code}
    />
  );
}
