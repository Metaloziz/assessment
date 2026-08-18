import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './PrototypeChainLab.module.css'

const TOPIC_ID = '96-js-prototype-chain'
const STEP = 0.65

type CaseId = 'read' | 'shadow' | 'miss'
type Phase = 'idle' | 'obj' | 'proto' | 'objectProto' | 'null' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'read', label: 'Читать с прототипа' },
  { id: 'shadow', label: 'Своё перекрывает' },
  { id: 'miss', label: 'Нигде нет' },
]

const PAIN = (
  <>
    У объекта есть свои поля и ссылка «смотри в прототип». При чтении движок идёт по цепочке, пока
    имя не найдётся или не дойдёт до <code>null</code>.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  read: (
    <>
      У <code>dog</code> нет <code>move</code>, метод нашли на <code>animal</code> —{' '}
      <code>Object.hasOwn(dog, 'move')</code> ложно, <code>'move' in dog</code> истинно.
    </>
  ),
  shadow: (
    <>
      Запись <code>dog.color = 'red'</code> создала своё поле — чтение остановилось на{' '}
      <code>dog</code>, прототип с <code>green</code> не менялся.
    </>
  ),
  miss: (
    <>
      <code>wings</code> нет ни у <code>dog</code>, ни у <code>animal</code>, ни у{' '}
      <code>Object.prototype</code> — результат <code>undefined</code>.
    </>
  ),
}

const CODE_INTRO =
  '`Object.create` задаёт прототип; `getPrototypeOf` и `hasOwn` / `in` показывают, где искали имя.'

const CODE_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'animal-dog',
    label: 'src/proto/animalDog.js',
    note: 'Прототип — ссылка на объект; метод на animal, `this` при вызове — dog.',
    executable: false,
    languageLabel: 'js',
    code: `const animal = {
  color: 'green',
  move() {
    return \`\${this.name} движется\`;
  },
};

const dog = Object.create(animal); // ← [[Prototype]] = animal
dog.name = 'Бобик';

dog.move(); // ← читаем move на animal, this = dog
Object.hasOwn(dog, 'move'); // false
'move' in dog; // true`,
  },
  {
    id: 'shadow-write',
    label: 'src/proto/shadowOwn.js',
    note: 'Запись создаёт own-свойство и заслоняет одноимённое в прототипе.',
    executable: false,
    languageLabel: 'js',
    code: `dog.color = 'red'; // ← own color на dog

dog.color; // 'red'
animal.color; // 'green' — прототип не трогали
Object.hasOwn(dog, 'color'); // true`,
  },
  {
    id: 'constructor-proto',
    label: 'src/proto/userConstructor.js',
    note: '`User.prototype` — объект для экземпляров после `new`, не путать с [[Prototype]] функции.',
    executable: false,
    languageLabel: 'js',
    code: `function User(name) {
  this.name = name;
}
User.prototype.greet = function () {
  return \`Привет, \${this.name}\`;
};

const user = new User('Ира');
Object.getPrototypeOf(user) === User.prototype; // ← цепочка экземпляра
Object.getPrototypeOf(User) === Function.prototype; // ← цепочка функции`,
  },
]

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: STEP, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function nodeCls(active: boolean, ok = false, miss = false, dim = false) {
  return [
    styles.chainNode,
    active && styles.chainNodeActive,
    ok && styles.chainNodeOk,
    miss && styles.chainNodeMiss,
    dim && styles.chainNodeDim,
  ]
    .filter(Boolean)
    .join(' ')
}

type ChainVizProps = {
  caseId: CaseId
  phase: Phase
}

function ChainViz({ caseId, phase }: ChainVizProps) {
  const query =
    caseId === 'read' ? 'dog.move' : caseId === 'shadow' ? 'dog.color' : 'dog.wings'

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'done'
        ? caseId === 'read'
          ? 'найдено на animal'
          : caseId === 'shadow'
            ? 'own на dog'
            : 'undefined'
        : 'поиск…'

  const objActive = phase === 'obj'
  const protoActive = phase === 'proto'
  const objectProtoActive = phase === 'objectProto'
  const nullActive = phase === 'null'

  const objOk = caseId === 'shadow' && (phase === 'obj' || phase === 'done')
  const objMiss = caseId !== 'shadow' && phase === 'obj'
  const protoOk = caseId === 'read' && (phase === 'proto' || phase === 'done')
  const protoMiss = caseId === 'read' && phase === 'obj'

  const dogProps =
    caseId === 'shadow'
      ? phase === 'done' || phase === 'obj'
        ? "name: 'Бобик', color: 'red'"
        : "name: 'Бобик'"
      : "name: 'Бобик'"

  return (
    <LabVizPanel title="поиск по цепочке" meta={meta}>
      <div className={styles.chainScene}>
        <div
          className={`${styles.queryBadge} ${phase !== 'idle' && phase !== 'done' ? styles.queryBadgeActive : ''}`}
        >
          читаем {query}
        </div>

        <div
          className={nodeCls(
            objActive,
            objOk,
            objMiss,
            phase !== 'idle' && phase !== 'obj' && caseId !== 'shadow',
          )}
        >
          <span className={styles.chainTitle}>dog</span>
          <span className={styles.chainProp}>{dogProps}</span>
        </div>

        <span className={styles.chainLink}>↓ прототип</span>

        <div
          className={nodeCls(
            protoActive,
            protoOk,
            protoMiss,
            caseId === 'shadow' && (phase === 'obj' || phase === 'done'),
          )}
        >
          <span className={styles.chainTitle}>animal</span>
          <span className={styles.chainProp}>color: 'green', move()</span>
        </div>

        <span className={styles.chainLink}>↓ прототип</span>

        <div
          className={nodeCls(
            objectProtoActive,
            false,
            false,
            phase === 'done' && caseId !== 'miss',
          )}
        >
          <span className={styles.chainTitle}>Object.prototype</span>
          <span className={styles.chainProp}>toString(), …</span>
        </div>

        <span className={styles.chainLink}>↓ прототип</span>

        <div className={nodeCls(nullActive, false, phase === 'done' && caseId === 'miss', false)}>
          <span className={styles.chainTitle}>null</span>
          <span className={styles.chainProp}>
            {phase === 'done' && caseId === 'miss' ? '→ undefined' : 'конец цепочки'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function ProblemPanel() {
  const { lines, log, clear } = useLabLog()
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const [caseId, setCaseId] = useState<CaseId>('read')
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  const resetVisual = () => {
    tlRef.current?.kill()
    tlRef.current = null
    setPhase('idle')
    setFinished(false)
    setRunning(false)
  }

  const onCase = (id: CaseId) => {
    if (running) return
    setCaseId(id)
    clear()
    resetVisual()
  }

  const runRead = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'dog.move — своего метода нет')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('obj')
          log('info', 'dog: move? → нет')
        },
        () => {
          setPhase('proto')
          log('ok', 'animal: move() → найдено')
        },
        () => {
          setPhase('done')
          log('ok', 'hasOwn=false, in=true')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runShadow = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'dog.color = red')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('obj')
          log('ok', 'own color на dog → red')
        },
        () => {
          setPhase('done')
          log('info', 'animal.color остался green')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const runMiss = () => {
    setRunning(true)
    setFinished(false)
    clear()
    log('info', 'dog.wings — ищем по цепочке')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('obj')
          log('info', 'dog: нет')
        },
        () => {
          setPhase('proto')
          log('info', 'animal: нет')
        },
        () => {
          setPhase('objectProto')
          log('info', 'Object.prototype: нет')
        },
        () => {
          setPhase('null')
          log('warn', 'null — конец')
        },
        () => {
          setPhase('done')
          log('err', 'результат undefined')
        },
      ],
      () => {
        setRunning(false)
        setFinished(true)
      },
    )
  }

  const onRun = () => {
    if (running) return
    resetVisual()
    if (caseId === 'read') runRead()
    else if (caseId === 'shadow') runShadow()
    else runMiss()
  }

  const onReset = () => {
    clear()
    resetVisual()
  }

  const hint: Record<CaseId, string> = {
    read: 'Итог: метод лежит на прототипе, но вызывается с this = dog.',
    shadow: 'Итог: запись создала своё поле — прототип с green больше не участвует в чтении.',
    miss: 'Итог: цепочка дошла до null — свойство undefined, ошибки нет.',
  }

  return (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={running}
            onClick={() => onCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
      <div className={shell.row}>
        <LabButton variant="primary" size="sm" disabled={running} onClick={onRun}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" size="sm" disabled={running} onClick={onReset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ChainViz caseId={caseId} phase={phase} />

      {finished ? <p className={shell.hint}>{hint[caseId]}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

export function PrototypeChainLab() {
  return (
    <JsLabShell
      title="Где движок ищет свойство"
      lead="Прототип — ссылка на другой объект; чтение идёт по цепочке, запись обычно создаёт своё поле."
      problem={<ProblemPanel />}
      code={
        <div className={shell.codePane}>
          <InteractiveCodePanel topicId={TOPIC_ID} intro={CODE_INTRO} snippets={CODE_SNIPPETS} />
        </div>
      }
    />
  )
}
