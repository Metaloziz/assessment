import { useState, type ReactNode } from "react";
import { JsLabShell } from "../../components/lab/JsLabShell";
import { LabButton } from "../../components/lab/LabButton";
import shell from "../../components/lab/JsLabShell.module.css";
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from "../../components/lab/InteractiveCodePanel";

const TOPIC_ID = "236-ts-reference-types";

type CaseId = "types" | "path" | "lib";

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: "types", label: "types — пакет" },
  { id: "path", label: "path — файл" },
  { id: "lib", label: "lib — встроенное" },
];

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  types: (
    <>
      В <code>vite-env.d.ts</code> одна строка подключает типы Vite —{" "}
      <code>import.meta.env</code> перестаёт быть «неизвестным полем».
    </>
  ),
  path: (
    <>
      <code>path</code> подтягивает соседний <code>.d.ts</code>, чтобы имена из
      него были видны в этом файле.
    </>
  ),
  lib: (
    <>
      <code>lib</code> даёт встроенные типы стандарта — например,{" "}
      <code>padStart</code> у строки без ручного <code>declare</code>.
    </>
  ),
};

const CODE_INTRO: Record<CaseId, string> = {
  types: "Пакет типов по имени — типичный пример env-файла в Vite.",
  path: "Локальный .d.ts по относительному пути — legacy-склейка без import.",
  lib: "Встроенная библиотека типов — тот же смысл, что `lib` в tsconfig.",
};

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  types: [
    {
      id: "vite-env-dts",
      label: "src/vite-env.d.ts",
      note: "Строка вверху файла — TypeScript подключает типы Vite ко всему проекту.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// REFERENCE TYPES ← пакет типов Vite
// ═══════════════════════════════════════════
/// <reference types="vite/client" />
// ← TYPES: import.meta.env, импорт ассетов

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
`,
    },
    {
      id: "app-ts",
      label: "src/app.ts",
      note: "Обычный код пользуется типами из vite/client без import типов.",
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
      note: "Локальные имена — их подключат через reference path.",
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
      note: "path относительно этого файла — подтянуть globals.d.ts.",
      executable: false,
      languageLabel: "ts",
      code: `/// <reference path="./globals.d.ts" />
// ← PATH: TypeScript видит типы из соседнего файла

declare function boot(name: AppName): void; // ← AppName из globals.d.ts
`,
    },
  ],
  lib: [
    {
      id: "pad-dts",
      label: "types/pad.d.ts",
      note: "Автору .d.ts нужен padStart — lib подключает встроенные типы строки.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// REFERENCE LIB ← встроенная библиотека типов
// ═══════════════════════════════════════════
/// <reference lib="es2017.string" />
// ← LIB: как "lib": ["es2017.string"] в tsconfig

export declare function padId(raw: string): string;
`,
    },
    {
      id: "pad-impl-ts",
      label: "src/pad.ts",
      note: "Реализация опирается на типы из lib; в браузер уходит обычный JS.",
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
        Строка <code>/// &lt;reference … /&gt;</code> в начале файла подсказывает
        TypeScript, откуда взять типы — в JavaScript она не попадает.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>
    </div>
  );

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
  );

  return (
    <JsLabShell
      title="Reference types"
      lead="Три формы директивы — `types`, `path`, `lib`; примеры файлов на вкладке Код."
      problem={problem}
      code={code}
    />
  );
}
