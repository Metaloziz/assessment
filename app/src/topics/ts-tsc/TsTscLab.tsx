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
  { id: "emit", label: "tsc emit" },
  { id: "noEmit", label: "--noEmit" },
  { id: "error", label: "ошибка типов" },
];

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  emit: (
    <>
      После check <code>tsc</code> пишет <code>dist/*.js</code> (и при{" "}
      <code>declaration</code> — <code>.d.ts</code>).
    </>
  ),
  noEmit: (
    <>
      <code>tsc --noEmit</code> только проверяет типы — файлы в{" "}
      <code>dist</code> не трогает (типичный CI + Vite).
    </>
  ),
  error: (
    <>
      Ошибка check даёт exit ≠ 0; при <code>noEmitOnError</code> выходные файлы
      не пишутся.
    </>
  ),
};

const CODE_INTRO: Record<CaseId, string> = {
  emit: "Сборка библиотеки/Node: `tsc -p` эмитит JS в `outDir`.",
  noEmit: "Проверка типов отдельно от бандлера: `tsc --noEmit`.",
  error: "Падение check останавливает emit — `dist` не обновляется.",
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
      id: "tsconfig-app",
      label: "tsconfig.json",
      note: "Часто `noEmit: true` в самом конфиге приложения.",
      executable: false,
      languageLabel: "json",
      code: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
`,
    },
    {
      id: "pkg-typecheck",
      label: "package.json",
      note: "CI: typecheck отдельно; Vite/esbuild транспилируют сами.",
      executable: false,
      languageLabel: "json",
      code: `{
  "scripts": {
    "dev": "vite",
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
      note: "`noEmitOnError` не обновляет `dist` при красном check.",
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
      ? "tsc · emit"
      : caseId === "noEmit"
        ? "tsc --noEmit"
        : "tsc · error";

  const meta = !doneOn
    ? phase === "idle"
      ? "ожидание"
      : phase === "read"
        ? "чтение проекта"
        : "check…"
    : failed
      ? "exit 1"
      : caseId === "noEmit"
        ? "exit 0 · без файлов"
        : "exit 0 · dist/";

  const outLabel =
    caseId === "emit"
      ? doneOn
        ? "dist/index.js (+ .d.ts)"
        : "outDir пуст"
      : caseId === "noEmit"
        ? doneOn
          ? "файлов нет · только диагностика"
          : "emit выключен"
        : failed
          ? "emit отменён · dist без изменений"
          : "ждём результат check";

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
          <span className={labVizStyles.nodeLabel}>check</span>
          <span className={labVizStyles.nodeSub}>
            {failed
              ? "TS2322 · типы не сходятся"
              : checkOn
                ? "семантика / присваивания"
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
            log("ok", "emit → dist/*.js");
            setHint("check прошёл; tsc записал JS (и .d.ts при declaration)");
          } else if (caseId === "noEmit") {
            log("ok", "check ok · noEmit");
            setHint(
              "типы зелёные; бандлер сам транспилирует, dist от tsc пуст",
            );
          } else {
            log("err", "TS2322 · exit 1");
            setHint("ошибка check; noEmitOnError не обновляет dist");
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
        <code>tsc</code> читает проект, проверяет типы и либо эмитит JS, либо
        только отдаёт диагностику (<code>--noEmit</code>).
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <TscViz caseId={caseId} phase={phase} focusRef={focusRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  );

  const code = (
    <div className={styles.codePane}>
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
      lead="Emit, --noEmit и ошибка типов — один пайплайн на кейс."
      problem={problem}
      code={code}
    />
  );
}
