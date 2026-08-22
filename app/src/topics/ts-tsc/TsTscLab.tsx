import { useRef, useState, type MutableRefObject, type ReactNode } from "react";
import gsap from "gsap";
import { JsLabShell } from "../../components/lab/JsLabShell";
import { LabButton } from "../../components/lab/LabButton";
import shell from "../../components/lab/JsLabShell.module.css";
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from "../../components/lab/InteractiveCodePanel";
import { LabLogView } from "../../components/lab/LabLogView";
import { useLabLog } from "../../components/lab/useLabLog";
import { LabVizPanel, labVizStyles } from "../../components/lab/LabViz";
import styles from "./TsTscLab.module.css";

const TOPIC_ID = "237-ts-tsc";
const STEP = 0.6;

type CaseId = "emit" | "noEmit" | "error";
type Phase = "idle" | "read" | "check" | "done";

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: "emit", label: "Сборка в dist" },
  { id: "noEmit", label: "Только проверка" },
  { id: "error", label: "Ошибка типов" },
];

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  emit: (
    <>
      После проверки <code>tsc</code> пишет <code>dist/*.js</code> (и при{" "}
      <code>declaration</code> — <code>.d.ts</code>).
    </>
  ),
  noEmit: (
    <>
      <code>tsc --noEmit</code> только проверяет типы — папку{" "}
      <code>dist</code> не трогает (типичный CI + Vite).
    </>
  ),
  error: (
    <>
      Ошибка проверки даёт exit ≠ 0; при <code>noEmitOnError</code> выходные
      файлы не обновляются.
    </>
  ),
};

const CODE_INTRO: Record<CaseId, string> = {
  emit: "Сборка библиотеки или Node: `tsc -p` пишет JS в `outDir`.",
  noEmit: "Проверка типов отдельно от бандлера: `noEmit` в tsconfig, сборку делает arui-scripts/webpack.",
  error: "Падение проверки останавливает запись — `dist` не обновляется.",
};

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  emit: [
    {
      id: "tsconfig-build",
      label: "tsconfig.build.json",
      note: "`outDir` + `declaration` — куда писать JS и `.d.ts`.",
      executable: false,
      languageLabel: "json",
      code: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "declaration": true
  },
  "include": ["src"]
}
`,
    },
    {
      id: "pkg-build",
      label: "package.json",
      note: "Скрипт `build` запускает emit через `-p`.",
      executable: false,
      languageLabel: "json",
      code: `{
  "scripts": {
    "build": "tsc -p tsconfig.build.json"
  }
}
`,
    },
    {
      id: "src-index",
      label: "src/index.ts",
      note: "После `tsc` появится `dist/index.js` (+ `index.d.ts`).",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// SOURCE ← вход tsc
// ═══════════════════════════════════════════
export function greet(name: string): string {
  return \`Hi, \${name}\`; // ← EMIT: типы сотрутся в .js
}
`,
    },
  ],
  noEmit: [
    {
      id: "tsconfig-arui",
      label: "tsconfig.json",
      note: "Реальный конфиг приложения: extends arui-scripts, алиасы FSD, `noEmit` — tsc только проверяет.",
      executable: false,
      languageLabel: "jsonc",
      code: `{
  // EXTENDS ← базовый tsconfig из arui-scripts (target, module, strict…)
  "extends": "./node_modules/arui-scripts/tsconfig.json",

  "compilerOptions": {
    // PATHS ← алиасы импортов вместо длинных относительных путей
    "paths": {
      // assets/* → ./src/assets/*
      "assets/*": ["./src/assets/*"],
      // components/* → ./src/components/*
      "components/*": ["./src/components/*"],
      // config/* → ./src/config/*
      "config/*": ["./src/config/*"],
      // entities/* → ./src/entities/*
      "entities/*": ["./src/entities/*"],
      // features/* → ./src/features/*
      "features/*": ["./src/features/*"],
      // pages/* → ./src/pages/*
      "pages/*": ["./src/pages/*"],
      // redux/* → ./src/redux/*
      "redux/*": ["./src/redux/*"],
      // server/* → ./src/server/*
      "server/*": ["./src/server/*"],
      // shared/* → ./src/shared/*
      "shared/*": ["./src/shared/*"]
    },

    // SKIP_LIB_CHECK ← не перепроверять все .d.ts в node_modules (быстрее CI)
    "skipLibCheck": true,

    // NO_FALLTHROUGH ← ошибка, если case проваливается без break
    "noFallthroughCasesInSwitch": true,

    // NO_UNUSED_PARAMS ← предупреждение о неиспользуемых параметрах функций
    "noUnusedParameters": true,

    // ISOLATED_MODULES ← каждый файл можно транспилировать отдельно (babel/swc)
    "isolatedModules": true,

    // NO_EMIT ← tsc только проверяет типы; JS пишет webpack из arui-scripts
    "noEmit": true,

    // JSX ← React 17+ без import React в каждом файле
    "jsx": "react-jsx",

    // PLUGINS ← типы для CSS Modules в import styles from './x.module.css'
    "plugins": [{ "name": "typescript-plugin-css-modules" }],

    // TYPES ← какие @types подключить глобально (jest, node, webpack-env)
    "types": ["jest", "node", "webpack-env"]
  },

  // INCLUDE ← какие файлы входят в программу tsc
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts"]
}
`,
    },
    {
      id: "pkg-typecheck",
      label: "package.json",
      note: "CI: `tsc --noEmit` или `tsc -p`; сборку запускает arui-scripts, не tsc.",
      executable: false,
      languageLabel: "json",
      code: `{
  "scripts": {
    "start": "arui-scripts start",
    "build": "arui-scripts build",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
`,
    },
  ],
  error: [
    {
      id: "bad-src",
      label: "src/app.ts",
      note: "Несовпадение типов — диагностика `TS2322`, emit не проходит.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// CHECK ← ошибка до emit
// ═══════════════════════════════════════════
function add(a: number, b: number): number {
  return a + b;
}

const total: number = add(1, "2"); // ← TS2322: string ≠ number
`,
    },
    {
      id: "tsconfig-strict",
      label: "tsconfig.json",
      note: "`noEmitOnError` не обновляет `dist` при красной проверке.",
      executable: false,
      languageLabel: "json",
      code: `{
  "compilerOptions": {
    "strict": true,
    "outDir": "dist",
    "noEmitOnError": true
  },
  "include": ["src"]
}
`,
    },
  ],
};

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, ...mods.filter(Boolean)].join(" ");
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) {
  tlRef.current?.kill();
  if (reducedMotion()) {
    for (const step of steps) step();
    onDone();
    return;
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: "power2.inOut" },
    onComplete: onDone,
  });
  tlRef.current = tl;
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP);
  });
  motion?.(tl);
}

type VizProps = {
  caseId: CaseId;
  phase: Phase;
  focusRef: MutableRefObject<HTMLDivElement | null>;
};

function TscViz({ caseId, phase, focusRef }: VizProps) {
  const readOn = phase !== "idle";
  const checkOn = phase === "check" || phase === "done";
  const doneOn = phase === "done";
  const failed = caseId === "error" && doneOn;

  const title =
    caseId === "emit"
      ? "tsc · сборка"
      : caseId === "noEmit"
        ? "tsc · только проверка"
        : "tsc · ошибка";

  const meta = !doneOn
    ? phase === "idle"
      ? "ожидание"
      : phase === "read"
        ? "читает tsconfig и исходники"
        : "проверяет типы…"
    : failed
      ? "exit 1"
      : caseId === "noEmit"
        ? "exit 0 · файлов нет"
        : "exit 0 · dist/";

  const outLabel =
    caseId === "emit"
      ? doneOn
        ? "dist/index.js (+ .d.ts)"
        : "outDir пока пуст"
      : caseId === "noEmit"
        ? doneOn
          ? "файлов нет · только сообщения"
          : "запись выключена"
        : failed
          ? "запись отменена · dist без изменений"
          : "ждём результат проверки";

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.stage}>
        <div
          className={nodeCls(
            readOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>вход</span>
          <span className={labVizStyles.nodeSub}>src/*.ts + tsconfig</span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            checkOn && !doneOn && labVizStyles.nodeActive,
            doneOn && !failed && labVizStyles.nodeOk,
            failed && labVizStyles.nodeErr,
            !checkOn && phase !== "idle" && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>проверка</span>
          <span className={labVizStyles.nodeSub}>
            {failed
              ? "TS2322 · типы не сходятся"
              : checkOn
                ? "вызовы и присваивания"
                : "ещё не запускали"}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          ref={focusRef}
          className={nodeCls(
            doneOn && !failed && labVizStyles.nodeOk,
            doneOn && !failed && labVizStyles.nodeActive,
            failed && labVizStyles.nodeErr,
            !doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>выход</span>
          <span className={labVizStyles.nodeSub}>{outLabel}</span>
        </div>
      </div>
    </LabVizPanel>
  );
}

function CaseSwitch({
  value,
  disabled,
  onChange,
}: {
  value: CaseId;
  disabled?: boolean;
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
          disabled={disabled}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  );
}

export function TsTscLab() {
  const { lines, log, clear } = useLabLog();
  const [caseId, setCaseId] = useState<CaseId>("emit");
  const [phase, setPhase] = useState<Phase>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);

  const resetViz = () => {
    setPhase("idle");
    setHint(null);
    if (focusRef.current)
      gsap.set(focusRef.current, { clearProps: "transform,opacity" });
  };

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill();
    setBusy(false);
    setCaseId(next);
    clear();
    resetViz();
  };

  const run = () => {
    clear();
    resetViz();
    setBusy(true);

    playTimeline(
      tlRef,
      [
        () => setPhase("read"),
        () => setPhase("check"),
        () => {
          setPhase("done");
          if (caseId === "emit") {
            log("ok", "записал dist/*.js");
            setHint("проверка прошла; tsc записал JS (и .d.ts при declaration)");
          } else if (caseId === "noEmit") {
            log("ok", "типы ок · noEmit");
            setHint(
              "типы зелёные; бандлер сам транспилирует, dist от tsc пуст",
            );
          } else {
            log("err", "TS2322 · exit 1");
            setHint("ошибка проверки; noEmitOnError не обновляет dist");
          }
        },
      ],
      (tl) => {
        if (!focusRef.current) return;
        gsap.set(focusRef.current, { scale: 0.94, opacity: 0.45 });
        tl.to(focusRef.current, { scale: 1, opacity: 1 }, STEP * 2);
      },
      () => setBusy(false),
    );
  };

  const reset = () => {
    tlRef.current?.kill();
    setBusy(false);
    clear();
    setCaseId("emit");
    resetViz();
  };

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} disabled={busy} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        <code>tsc</code> читает проект, проверяет типы и либо пишет JS в{" "}
        <code>dist</code>, либо только отдаёт сообщения об ошибках (
        <code>--noEmit</code>).
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <TscViz caseId={caseId} phase={phase} focusRef={focusRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  );

  const code = (
    <div className={shell.codePane}>
      <CaseSwitch value={caseId} onChange={selectCase} />
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
      title="Использование tsc"
      lead="Сборка, --noEmit и ошибка типов — три режима одного пайплайна."
      problem={problem}
      code={code}
    />
  );
}
