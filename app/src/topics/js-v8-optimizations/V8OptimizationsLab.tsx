import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '116-js-v8-optimizations'

type Point = { x: number; y?: number; label?: string }

export function V8OptimizationsLab() {
  const { lines, log, clear } = useLabLog()
  const [sum, setSum] = useState(0)

  const runStable = () => {
    const n = 20_000
    let acc = 0
    for (let i = 0; i < n; i++) {
      const p: Point = { x: i, y: i + 1 }
      acc += p.x * p.x + (p.y ?? 0) * (p.y ?? 0)
    }
    setSum(acc)
    log('ok', `${n}× Point {x,y} в одном порядке — стабильная форма (удобнее для IC)`)
    log('info', `acc=${acc}`)
  }

  const runMixed = () => {
    const n = 20_000
    let acc = 0
    for (let i = 0; i < n; i++) {
      const p: Point = { x: i }
      if (i % 2 === 0) p.y = i
      else p.label = 'A'
      acc += p.x + (p.y ?? 0) + (p.label ? 1 : 0)
    }
    setSum(acc)
    log('err', `${n}× разные формы {x,y} / {x,label} — polymorphic/megamorphic риск`)
    log('info', `acc=${acc}`)
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Горячий цикл торопит объекты с полями. Если у всех одна форма — V8 легче кэширует доступ. Если
        формы пляшут — inline cache дорожает. Сравним стабильный и смешанный сценарий (идея, не
        микробенчмарк «истины»).
      </p>
      <ol className={shell.steps}>
        <li>Одинаковый порядок полей → одна shape.</li>
        <li>То <code>y</code>, то <code>label</code> → разные shapes на одном call site.</li>
        <li>Выводы только после профиля в реальном hot path.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={runStable}>
          Стабильные {`{x,y}`}
        </LabButton>
        <LabButton variant="secondary" onClick={runMixed}>
          Смешанные формы
        </LabButton>
        <LabButton variant="secondary" onClick={() => {
            const a = [1, 2, 3]
            const b = [1, , 3]
            log('info', `dense length=${a.length}; holey has hole? ${!(1 in b)}`)
            log('ok', 'elements kinds: дырки/смесь типов меняют представление массива')
          }}
        >
          Массив dense vs holey
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <p className={shell.hint}>
        Последний acc: <code>{sum}</code>
      </p>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="`Shapes` и предсказуемые поля. Это эвристики `V8` — не переписывайте архитектуру без профиля."
      snippets={[
        {
          id: 'stable',
          label: 'Один порядок полей',
          code: `function make(x, y) {
  return { x, y };
}

function sumXY(p) {
  return p.x + p.y;
}

let s = 0;
for (let i = 0; i < 5000; i++) s += sumXY(make(i, i + 1));
console.log('stable shapes sum', s);`,
        },
        {
          id: 'mixed',
          label: 'Разные формы',
          code: `function sumX(p) {
  return p.x + (p.y || 0) + (p.label ? 1 : 0);
}

let s = 0;
for (let i = 0; i < 5000; i++) {
  const p = { x: i };
  if (i % 2) p.y = 1;
  else p.label = 'n';
  s += sumX(p);
}
console.log('mixed shapes sum', s);`,
        },
        {
          id: 'delete',
          label: 'delete ломает форму',
          code: `const o = { a: 1, b: 2 };
console.log('keys', Object.keys(o));
delete o.b;
o.c = 3;
console.log('после delete/add', Object.keys(o));
console.log('для hot path лучше не delete, а оставлять поля стабильными');`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Стабильные формы — проще оптимизировать"
      lead="Hidden classes и inline caches любят одинаковый порядок полей и предсказуемые типы на горячем пути."
      problem={problem}
      code={code}
    />
  )
}
