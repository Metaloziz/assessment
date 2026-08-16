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
import styles from "./TsDecoratorsLab.module.css";

const TOPIC_ID = "238-ts-decorators";
const STEP = 0.6;

type CaseId = "method" | "stack" | "factory";
type Phase = "idle" | "outer" | "inner" | "core" | "done";

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: "method", label: "@logged" },
  { id: "stack", label: "@auth @logged" },
  { id: "factory", label: "@retry(3)" },
];

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  method: (
    <>
      Один <code>@logged</code> оборачивает <code>save</code>: вызов идёт через слой, затем в
      core.
    </>
  ),
  stack: (
    <>
      Стек <code>@auth</code> над <code>@logged</code>: снаружи внутрь —{" "}
      <code>auth → logged → checkout</code>.
    </>
  ),
  factory: (
    <>
      <code>@retry(3)</code> — фабрика: вызов с аргументом возвращает декоратор с параметром.
    </>
  ),
};

const CODE_INTRO: Record<CaseId, string> = {
  method: "Stage 3: декоратор метода возвращает обёртку с тем же API.",
  stack: "Два @: верхний слой — первый на входе вызова.",
  factory: "Фабрика retry(n) возвращает декоратор с числом попыток.",
};

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  method: [
    {
      id: "logged-ts",
      label: "src/logged.ts",
      note: "Декоратор получает original + context и возвращает обёртку.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// LOGGED ← Stage 3 method decorator
// ═══════════════════════════════════════════
export function logged(
  original: (...args: unknown[]) => unknown,
  context: ClassMethodDecoratorContext,
) {
  const name = String(context.name);
  return function (this: unknown, ...args: unknown[]) {
    console.log(\`call \${name}\`); // ← WRAP: до core
    return original.call(this, ...args);
  };
}
`,
    },
    {
      id: "user-service-ts",
      label: "src/userService.ts",
      note: "`@logged` у save: call-site тот же, слой добавлен при init класса.",
      executable: false,
      languageLabel: "ts",
      code: `import { logged } from "./logged";

export class UserService {
  @logged // ← APPLY при инициализации класса
  save(id: string) {
    return id; // ← CORE
  }
}

const svc = new UserService();
svc.save("u1"); // call save → core
`,
    },
  ],
  stack: [
    {
      id: "stack-ts",
      label: "src/checkout.ts",
      note: "Выражения сверху вниз; применение снизу вверх — auth снаружи.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// STACK ← auth снаружи, logged внутри
// ═══════════════════════════════════════════
function logged(
  original: (...args: unknown[]) => unknown,
  _ctx: ClassMethodDecoratorContext,
) {
  return function (this: unknown, ...args: unknown[]) {
    console.log("logged"); // ← INNER
    return original.call(this, ...args);
  };
}

function auth(
  original: (...args: unknown[]) => unknown,
  _ctx: ClassMethodDecoratorContext,
) {
  return function (this: unknown, ...args: unknown[]) {
    console.log("auth"); // ← OUTER
    return original.call(this, ...args);
  };
}

export class Cart {
  @auth
  @logged
  checkout() {
    return "ok"; // ← CORE
  }
}

// вызов: auth → logged → checkout
`,
    },
  ],
  factory: [
    {
      id: "retry-ts",
      label: "src/retry.ts",
      note: "`retry(3)` возвращает декоратор; `@retry(3)` — вызов фабрики.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// FACTORY ← retry(times) → decorator
// ═══════════════════════════════════════════
export function retry(times: number) {
  return function (
    original: (...args: unknown[]) => unknown,
    _ctx: ClassMethodDecoratorContext,
  ) {
    return function (this: unknown, ...args: unknown[]) {
      let last: unknown;
      for (let i = 0; i < times; i++) {
        try {
          return original.call(this, ...args); // ← RETRY
        } catch (e) {
          last = e;
        }
      }
      throw last;
    };
  };
}
`,
    },
    {
      id: "api-ts",
      label: "src/api.ts",
      note: "Параметр times зашит в обёртку на этапе init.",
      executable: false,
      languageLabel: "ts",
      code: `import { retry } from "./retry";

export class Api {
  @retry(3) // ← FACTORY: times = 3
  fetch() {
    /* сеть */
  }
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

function DecoratorsViz({ caseId, phase, focusRef }: VizProps) {
  const outerOn = phase === "outer" || phase === "inner" || phase === "core" || phase === "done";
  const innerOn = phase === "inner" || phase === "core" || phase === "done";
  const coreOn = phase === "core" || phase === "done";
  const doneOn = phase === "done";

  if (caseId === "method") {
    return (
      <LabVizPanel title="UserService.save" meta={doneOn ? "logged → core" : "@logged"}>
        <div className={styles.onion}>
          <div
            ref={focusRef}
            className={`${styles.ring}${outerOn ? ` ${styles.ringActive}` : ""}${
              doneOn ? ` ${styles.ringOk}` : ""
            }`}
          >
            <span className={styles.ringCaption}>@logged</span>
            <div
              className={nodeCls(
                coreOn && labVizStyles.nodeActive,
                doneOn && labVizStyles.nodeOk,
                !coreOn && styles.dim,
              )}
            >
              <span className={labVizStyles.nodeLabel}>save</span>
              <span className={labVizStyles.nodeSub}>
                {coreOn ? "core" : "ждём вызов"}
              </span>
            </div>
          </div>
        </div>
      </LabVizPanel>
    );
  }

  if (caseId === "stack") {
    return (
      <LabVizPanel
        title="Cart.checkout"
        meta={doneOn ? "auth → logged → core" : "стек @"}
      >
        <div className={styles.onion}>
          <div
            ref={focusRef}
            className={`${styles.ring}${outerOn ? ` ${styles.ringActive}` : ""}${
              doneOn ? ` ${styles.ringOk}` : ""
            }`}
          >
            <span className={styles.ringCaption}>@auth</span>
            <div
              className={`${styles.ring}${innerOn ? ` ${styles.ringActive}` : ""}${
                !innerOn && phase !== "idle" ? ` ${styles.dim}` : ""
              }`}
            >
              <span className={styles.ringCaption}>@logged</span>
              <div
                className={nodeCls(
                  coreOn && labVizStyles.nodeActive,
                  doneOn && labVizStyles.nodeOk,
                  !coreOn && styles.dim,
                )}
              >
                <span className={labVizStyles.nodeLabel}>checkout</span>
                <span className={labVizStyles.nodeSub}>
                  {coreOn ? "core" : "внутри слоёв"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </LabVizPanel>
    );
  }

  return (
    <LabVizPanel title="Api.fetch" meta={doneOn ? "retry×3 → core" : "@retry(3)"}>
      <div className={styles.onion}>
        <div
          ref={focusRef}
          className={`${styles.ring}${outerOn ? ` ${styles.ringActive}` : ""}${
            doneOn ? ` ${styles.ringOk}` : ""
          }`}
        >
          <span className={styles.ringCaption}>@retry(3)</span>
          <div
            className={nodeCls(
              coreOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !coreOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>fetch</span>
            <span className={labVizStyles.nodeSub}>
              {coreOn ? "попытка → ok" : "times = 3"}
            </span>
          </div>
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

export function TsDecoratorsLab() {
  const { lines, log, clear } = useLabLog();
  const [caseId, setCaseId] = useState<CaseId>("method");
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

    const steps: Array<() => void> =
      caseId === "stack"
        ? [
            () => setPhase("outer"),
            () => setPhase("inner"),
            () => setPhase("core"),
            () => {
              setPhase("done");
              log("ok", "auth → logged → checkout");
              setHint("верхний @ — внешняя оболочка вызова");
            },
          ]
        : [
            () => setPhase("outer"),
            () => setPhase("core"),
            () => {
              setPhase("done");
              if (caseId === "method") {
                log("ok", "logged → save");
                setHint("обёртка добавлена при init класса, call-site тот же");
              } else {
                log("ok", "retry(3) → fetch");
                setHint("фабрика зашила times=3 в обёртку");
              }
            },
          ];

    playTimeline(
      tlRef,
      steps,
      (tl) => {
        if (!focusRef.current) return;
        gsap.set(focusRef.current, { scale: 0.94, opacity: 0.45 });
        tl.to(
          focusRef.current,
          { scale: 1, opacity: 1 },
          STEP * (caseId === "stack" ? 3 : 2),
        );
      },
      () => setBusy(false),
    );
  };

  const reset = () => {
    tlRef.current?.kill();
    setBusy(false);
    clear();
    setCaseId("method");
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
        Декоратор <code>@…</code> оборачивает член класса при init: тот же API вызова, плюс
        слой до и после core.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <DecoratorsViz caseId={caseId} phase={phase} focusRef={focusRef} />

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
      title="Декораторы"
      lead="Обёртка метода, стек @ и фабрика — луковица слоёв на кейс."
      problem={problem}
      code={code}
    />
  );
}
