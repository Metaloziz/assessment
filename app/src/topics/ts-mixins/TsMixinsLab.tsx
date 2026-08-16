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
import styles from "./TsMixinsLab.module.css";

const TOPIC_ID = "239-ts-mixins";
const STEP = 0.6;

type CaseId = "factory" | "stack" | "constraint";
type Phase = "idle" | "base" | "mix1" | "mix2" | "done";

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: "factory", label: "Timestamped(User)" },
  { id: "stack", label: "Activatable(…)" },
  { id: "constraint", label: "Named constraint" },
];

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  factory: (
    <>
      Factory <code>Timestamped(User)</code> даёт подкласс с{" "}
      <code>getTimestamp</code> на цепочке <code>extends</code>.
    </>
  ),
  stack: (
    <>
      Стек <code>Activatable(Timestamped(User))</code> — внешний mixin ближе к
      экземпляру.
    </>
  ),
  constraint: (
    <>
      <code>TBase extends Named</code> разрешает только классы с{" "}
      <code>name</code> — иначе ошибка типов.
    </>
  ),
};

const CODE_INTRO: Record<CaseId, string> = {
  factory: "Constructor + factory: подмешать поле и метод к User.",
  stack: "Вложенные factory: две примеси на одной цепочке extends.",
  constraint: "Constrained mixin: база обязана дать Shape.",
};

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  factory: [
    {
      id: "timestamped-ts",
      label: "src/timestamped.ts",
      note: "TBase extends Constructor — аргумент factory это класс.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// FACTORY ← Timestamped(Base)
// ═══════════════════════════════════════════
type Constructor = new (...args: any[]) => object;

export function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = Date.now(); // ← MIXIN field
    getTimestamp() {
      return this.timestamp;
    }
  };
}
`,
    },
    {
      id: "user-ts",
      label: "src/user.ts",
      note: "Применение: Timestamped(User) → подкласс с типами и рантаймом.",
      executable: false,
      languageLabel: "ts",
      code: `import { Timestamped } from "./timestamped";

export class User {
  name = "";
}

export const TimestampedUser = Timestamped(User); // ← APPLY

const u = new TimestampedUser();
u.name;
u.getTimestamp(); // ← типы сходятся
`,
    },
  ],
  stack: [
    {
      id: "stack-ts",
      label: "src/richUser.ts",
      note: "Внешний Activatable — ближайший предок экземпляра.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// STACK ← Activatable(Timestamped(User))
// ═══════════════════════════════════════════
type Constructor = new (...args: any[]) => object;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = Date.now();
    getTimestamp() {
      return this.timestamp; // ← INNER mixin
    }
  };
}

function Activatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    isActive = false;
    activate() {
      this.isActive = true; // ← OUTER mixin
    }
  };
}

class User {
  name = "";
}

export const RichUser = Activatable(Timestamped(User));
// RichUser → Activatable → Timestamped → User
`,
    },
  ],
  constraint: [
    {
      id: "greeter-ts",
      label: "src/greeter.ts",
      note: "Named сужает конструктор: внутри this.name доступен.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// CONSTRAINT ← Named shape
// ═══════════════════════════════════════════
type Named = new (...args: any[]) => { name: string };

export function Greeter<TBase extends Named>(Base: TBase) {
  return class extends Base {
    greet() {
      return \`hi, \${this.name}\`; // ← CONSTRAINT: name есть
    }
  };
}
`,
    },
    {
      id: "apply-ts",
      label: "src/apply.ts",
      note: "User с name подходит; пустой класс — ошибка checker’а.",
      executable: false,
      languageLabel: "ts",
      code: `import { Greeter } from "./greeter";

class User {
  name = "";
}

export const HelloUser = Greeter(User); // ок

// Greeter(class {}); // ошибка: нет name
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

function MixinsViz({ caseId, phase, focusRef }: VizProps) {
  const baseOn = phase !== "idle";
  const mix1On = phase === "mix1" || phase === "mix2" || phase === "done";
  const mix2On = phase === "mix2" || phase === "done";
  const doneOn = phase === "done";

  if (caseId === "factory") {
    return (
      <LabVizPanel
        title="Timestamped(User)"
        meta={doneOn ? "User → Timestamped" : "factory"}
      >
        <div className={styles.stage}>
          <div
            className={nodeCls(
              baseOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !baseOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>User</span>
            <span className={labVizStyles.nodeSub}>name</span>
          </div>
          <div className={styles.flowArrow}>↓ extends</div>
          <div
            ref={focusRef}
            className={nodeCls(
              mix1On && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !mix1On && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Timestamped(User)</span>
            <span className={labVizStyles.nodeSub}>
              {mix1On ? "getTimestamp" : "ждём factory"}
            </span>
          </div>
        </div>
      </LabVizPanel>
    );
  }

  if (caseId === "stack") {
    return (
      <LabVizPanel
        title="RichUser"
        meta={doneOn ? "Activatable → Timestamped → User" : "стек"}
      >
        <div className={styles.stage}>
          <div
            className={nodeCls(
              baseOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !baseOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>User</span>
            <span className={labVizStyles.nodeSub}>name</span>
          </div>
          <div className={styles.flowArrow}>↓</div>
          <div
            className={nodeCls(
              mix1On && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !mix1On && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Timestamped(…)</span>
            <span className={labVizStyles.nodeSub}>
              {mix1On ? "getTimestamp" : "inner"}
            </span>
          </div>
          <div className={styles.flowArrow}>↓</div>
          <div
            ref={focusRef}
            className={nodeCls(
              mix2On && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !mix2On && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Activatable(…)</span>
            <span className={labVizStyles.nodeSub}>
              {mix2On ? "activate · outer" : "outer"}
            </span>
          </div>
        </div>
      </LabVizPanel>
    );
  }

  return (
    <LabVizPanel
      title="Greeter(Base)"
      meta={doneOn ? "Named ✓ → greet" : "constraint"}
    >
      <div className={styles.stage}>
        <div
          className={nodeCls(
            baseOn && labVizStyles.nodeActive,
            doneOn && labVizStyles.nodeOk,
            !baseOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Named</span>
          <span className={labVizStyles.nodeSub}>{"{ name: string }"}</span>
        </div>
        <div className={styles.flowArrow}>↓ TBase extends</div>
        <div
          ref={focusRef}
          className={nodeCls(
            mix1On && labVizStyles.nodeActive,
            doneOn && labVizStyles.nodeOk,
            !mix1On && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Greeter(User)</span>
          <span className={labVizStyles.nodeSub}>
            {mix1On ? "greet → hi, name" : "ждём shape"}
          </span>
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

export function TsMixinsLab() {
  const { lines, log, clear } = useLabLog();
  const [caseId, setCaseId] = useState<CaseId>("factory");
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
            () => setPhase("base"),
            () => setPhase("mix1"),
            () => setPhase("mix2"),
            () => {
              setPhase("done");
              log("ok", "Activatable → Timestamped → User");
              setHint("внешний mixin — ближайший предок экземпляра");
            },
          ]
        : [
            () => setPhase("base"),
            () => setPhase("mix1"),
            () => {
              setPhase("done");
              if (caseId === "factory") {
                log("ok", "Timestamped(User) → getTimestamp");
                setHint("factory вернула class extends Base с новыми членами");
              } else {
                log("ok", "Named ✓ → Greeter(User)");
                setHint("constraint ловит базу без name до рантайма");
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
    setCaseId("factory");
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
        Mixin в TS — class factory с <code>TBase extends Constructor</code>:
        поведение через <code>extends</code>, типы — у результата factory.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <MixinsViz caseId={caseId} phase={phase} focusRef={focusRef} />

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
      title="Mixins"
      lead="Factory, стек примесей и Named-constraint — цепочка extends на кейс."
      problem={problem}
      code={code}
    />
  );
}
