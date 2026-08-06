import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '112-js-v8-pipeline'

type Shape = { x: number; y?: number; z?: string }

export function V8PipelineLab() {
  const { lines, log, clear } = useLabLog()
  const [hits, setHits] = useState(0)
  const [lastKind, setLastKind] = useState<'number' | 'string' | 'mixed' | null>(null)

  const runHot = (kind: 'number' | 'string' | 'mixed') => {
    const n = 5000
    if (kind === 'number') {
      let acc = 0
      for (let i = 0; i < n; i++) acc = acc + 1
      log('ok', `${n}× сложение чисел — стабильный сценарий (удобнее для TurboFan)`)
      log('info', `acc=${acc}`)
    } else if (kind === 'string') {
      let acc = ''
      for (let i = 0; i < n; i++) acc = acc + 'x'
      log('ok', `${n}× конкатенация строк — другой стабильный мономорфный сценарий`)
      log('info', `длина строки=${acc.length}`)
    } else {
      let acc: number | string = 0
      for (let i = 0; i < n; i++) {
        acc = i % 2 === 0 ? (acc as number) + 1 : String(acc) + 'x'
      }
      log('err', `${n}× смешанные типы — чаще общий путь / риск деопта после спец. кода`)
      log('info', `последнее значение: ${String(acc).slice(0, 32)}`)
    }
    setHits((h) => h + n)
    setLastKind(kind)
    log('info', `всего итераций в лабе: ${hits + n}`)
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Горячая функция то считает числа, то склеивает строки. V8 сначала гоняет байткод (Ignition),
        потом может заточить машинный код под наблюдаемые типы (TurboFan). Резкая смена типов —
        повод сбросить оптимизацию (deopt), а не «ошибку приложения».
      </p>
      <ol className={shell.steps}>
        <li>Парсер → AST → байткод Ignition — быстрый старт.</li>
        <li>Горячий код профилируют; TurboFan спекулирует на типах/формах.</li>
        <li>Другой тип или форма объекта — деоптимизация до более общего пути.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={() => runHot('number')}>
          Горячий путь: числа
        </LabButton>
        <LabButton variant="secondary" onClick={() => runHot('string')}>
          Горячий путь: строки
        </LabButton>
        <LabButton variant="secondary" onClick={() => runHot('mixed')}>
          Смешать типы
        </LabButton>
        <LabButton variant="secondary" onClick={() => {
            const a: Shape = { x: 1 }
            const b: Shape = { x: 1, y: 2 }
            const c: Shape = { x: 1, z: 'meta' }
            const readX = (o: Shape) => o.x
            readX(a)
            readX(b)
            readX(c)
            log(
              'err',
              'разные формы {x} / {x,y} / {x,z} — полиморфизм форм (megamorphic риск в горячем месте)',
            )
          }}
        >
          Разные формы объекта
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <p className={shell.hint}>
        В браузере лаба не показывает байткод Ignition — только идею стабильности типов. Последний
        режим: <code>{lastKind ?? '—'}</code>, вызовов add: <code>{hits}</code>.
      </p>

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Пайплайн V8: токены/`AST` → `Ignition` → `TurboFan` → `deopt`. Пороги `JIT` не хардкодьте — смотрите профиль."
      snippets={[
        {
          id: 'pipeline',
          label: 'Пайплайн (схема)',
          code: `// исходник
//   → лексический анализ (токены)
//   → парсер → AST
//   → байткод
//   → Ignition (интерпретация) + профиль
//   → TurboFan (JIT) → при сломе допущений → deopt

console.log('AST — синтаксическое дерево, не машинный код');
console.log('Ignition — интерпретатор байткода (быстрый старт)');
console.log('TurboFan — оптимизирующий JIT-компилятор');
console.log('deopt — откат к общему пути, семантика сохраняется');`,
        },
        {
          id: 'parse',
          label: 'Pre-parse vs full parse',
          note: 'Упрощённая модель: внутренние функции можно «легко» отметить заранее (`pre`) и полностью разобрать при первом вызове (`full`).',
          code: `const script = {
  functions: [
    { name: 'boot', parsed: 'full' },
    { name: 'rarelyUsed', parsed: 'pre' },
  ],
};

function ensureFullParse(fn) {
  if (fn.parsed === 'pre') {
    fn.parsed = 'full';
    console.log(fn.name + ': полный разбор перед исполнением');
  }
  return fn;
}

ensureFullParse(script.functions[1]);
console.log(script.functions);`,
        },
        {
          id: 'types',
          label: 'Стабильные типы vs смесь',
          code: `function add(a, b) {
  return a + b;
}

for (let i = 0; i < 1000; i++) add(1, 2);
console.log('длинная серия number+number — удобный профиль для JIT');

console.log(add('1', '2')); // другой тип аргументов
console.log('смена типов может вызвать deopt узкого машинного кода');`,
        },
        {
          id: 'shapes',
          label: 'Формы объектов',
          note: 'Одинаковые поля в одном порядке — одна форма; прыжки по разным формам в горячем цикле дороже.',
          code: `function readX(o) {
  return o.x;
}

const sameShape = [];
for (let i = 0; i < 100; i++) {
  sameShape.push(readX({ x: i, y: 0 }));
}
console.log('одна форма {x,y}:', sameShape[99]);

const mixed = [
  readX({ x: 1 }),
  readX({ x: 1, y: 2 }),
  readX({ x: 1, z: 'n' }),
];
console.log('разные формы:', mixed);`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="От исходника до машинного кода — и deopt при смене допущений"
      lead="Лексика и AST → байткод Ignition → JIT TurboFan. Стабильные типы помогают оптимизации; смесь типов может вызвать деоптимизацию."
      problem={problem}
      code={code}
    />
  )
}
