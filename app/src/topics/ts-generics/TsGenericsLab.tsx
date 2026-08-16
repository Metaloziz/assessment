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
import styles from "./TsGenericsLab.module.css";

const TOPIC_ID = "230-ts-generics";
const STEP = 0.6;

type CaseId = "identity" | "constraint" | "default";
type Phase = "idle" | "slot" | "fill" | "done";

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: "identity", label: "identity<T>" },
  { id: "constraint", label: "T extends" },
  { id: "default", label: "T = unknown" },
];

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  identity: (
    <>
      Вызов <code>identity(&quot;hi&quot;)</code> подставляет{" "}
      <code>T = string</code> — вход и выход связаны.
    </>
  ),
  constraint: (
    <>
      <code>T extends {"{ id: string }"}</code> разрешает только объекты с{" "}
      <code>id</code>; внутри поле доступно.
    </>
  ),
  default: (
    <>
      Без аргумента типа <code>Response</code> берёт <code>T = unknown</code>; с{" "}
      <code>Response&lt;User&gt;</code> — конкретную форму.
    </>
  ),
};

const CODE_INTRO: Record<CaseId, string> = {
  identity: "Слот T: вывод из аргумента сохраняет тип результата.",
  constraint: "Constraint сужает кандидатов: без id вызов не соберётся.",
  default: "Default parameter: запасной тип, если вывести не из чего.",
};

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  identity: [
    {
      id: "identity-ts",
      label: "src/identity.ts",
      note: "T связывает аргумент и возврат — без any и копипасты.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// IDENTITY ← параметр типа T
// ═══════════════════════════════════════════
export function identity<T>(value: T): T {
  return value; // ← SLOT: вход и выход одного T
}

const a = identity("hi"); // ← INFER: T = string
const b = identity<number>(42); // ← EXPLICIT: T = number
`,
    },
  ],
  constraint: [
    {
      id: "pluck-ts",
      label: "src/pluck.ts",
      note: "extends обещает форму: внутри функции id точно есть.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// CONSTRAINT ← T extends форма
// ═══════════════════════════════════════════
export function pluckId<T extends { id: string }>(row: T): string {
  return row.id; // ← id доступен благодаря constraint
}

pluckId({ id: "1", name: "Ann" }); // ок
// pluckId({ name: "Ann" }); // ошибка: нет id
`,
    },
  ],
  default: [
    {
      id: "response-ts",
      label: "src/response.ts",
      note: "T = unknown — запасной тип, пока не передали свой.",
      executable: false,
      languageLabel: "ts",
      code: `// ═══════════════════════════════════════════
// DEFAULT ← T = unknown
// ═══════════════════════════════════════════
type User = { id: string; name: string };

type Response<T = unknown> = {
  // ← DEFAULT
  data: T;
  ok: boolean;
};

type AnyResponse = Response; // Response<unknown>
type UserResponse = Response<User>; // ← явный T
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

function GenericsViz({ caseId, phase, focusRef }: VizProps) {
  const slotOn = phase !== "idle";
  const fillOn = phase === "fill" || phase === "done";
  const doneOn = phase === "done";

  if (caseId === "identity") {
    return (
      <LabVizPanel
        title={"identity<T>"}
        meta={doneOn ? "T = string" : "слот T"}
      >
        <div className={styles.stage}>
          <div
            className={nodeCls(
              slotOn && labVizStyles.nodeActive,
              doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>объявление</span>
            <span className={labVizStyles.nodeSub}>{"fn<T>(x: T): T"}</span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            className={nodeCls(
              fillOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !fillOn && phase !== "idle" && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>вызов</span>
            <span className={labVizStyles.nodeSub}>
              {fillOn ? 'identity("hi")' : "ждём аргумент"}
            </span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            ref={focusRef}
            className={nodeCls(
              doneOn && labVizStyles.nodeOk,
              doneOn && labVizStyles.nodeActive,
              !doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>подстановка</span>
            <span className={labVizStyles.nodeSub}>
              {doneOn ? "T = string · return string" : "T ещё пуст"}
            </span>
          </div>
        </div>
      </LabVizPanel>
    );
  }

  if (caseId === "constraint") {
    return (
      <LabVizPanel
        title={"pluckId<T>"}
        meta={doneOn ? "T ⊇ { id }" : "constraint"}
      >
        <div className={styles.stage}>
          <div
            className={nodeCls(
              slotOn && labVizStyles.nodeActive,
              doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>ограничение</span>
            <span className={labVizStyles.nodeSub}>
              T extends {"{ id: string }"}
            </span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            className={nodeCls(
              fillOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeOk,
              !fillOn && phase !== "idle" && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>кандидат</span>
            <span className={labVizStyles.nodeSub}>
              {fillOn ? "{ id, name } · подходит" : "проверка формы…"}
            </span>
          </div>
          <span className={styles.flowArrow}>↓</span>
          <div
            ref={focusRef}
            className={nodeCls(
              doneOn && labVizStyles.nodeOk,
              doneOn && labVizStyles.nodeActive,
              !doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>внутри fn</span>
            <span className={labVizStyles.nodeSub}>
              {doneOn ? "row.id → string" : "id ещё не гарантирован"}
            </span>
          </div>
        </div>
      </LabVizPanel>
    );
  }

  return (
    <LabVizPanel
      title={"Response<T>"}
      meta={doneOn ? "T = User" : "T = unknown"}
    >
      <div className={styles.stage}>
        <div
          className={nodeCls(
            slotOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>default</span>
          <span className={labVizStyles.nodeSub}>
            {"type Response<T = unknown>"}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          className={nodeCls(
            fillOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
            !fillOn && phase !== "idle" && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>без аргумента</span>
          <span className={labVizStyles.nodeSub}>
            {fillOn ? "Response → T = unknown" : "запасной тип"}
          </span>
        </div>
        <span className={styles.flowArrow}>↓</span>
        <div
          ref={focusRef}
          className={nodeCls(
            doneOn && labVizStyles.nodeOk,
            doneOn && labVizStyles.nodeActive,
            !doneOn && styles.dim,
          )}
        >
          <span className={labVizStyles.nodeLabel}>явный T</span>
          <span className={labVizStyles.nodeSub}>
            {doneOn ? "Response<User> · data: User" : "ещё default"}
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

export function TsGenericsLab() {
  const { lines, log, clear } = useLabLog();
  const [caseId, setCaseId] = useState<CaseId>("identity");
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
        () => setPhase("slot"),
        () => setPhase("fill"),
        () => {
          setPhase("done");
          if (caseId === "identity") {
            log("ok", "T = string из аргумента");
            setHint("слот T заполняется на вызове; в JS параметра типа нет");
          } else if (caseId === "constraint") {
            log("ok", "constraint ок · id доступен");
            setHint("без extends у T не было бы поля id");
          } else {
            log("ok", "default → явный User");
            setHint("T = unknown, пока не передали Response<User>");
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
    setCaseId("identity");
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
        Generics — слот типа <code>T</code>: одна реализация, точный тип на
        каждом вызове без <code>any</code>.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <GenericsViz caseId={caseId} phase={phase} focusRef={focusRef} />

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
      title="Generics"
      lead="Слот T, constraint и default — одна картина на кейс."
      problem={problem}
      code={code}
    />
  );
}
