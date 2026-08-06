import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '108-js-currying'

export function CurryingLab() {
  const { lines, log, clear } = useLabLog()
  const [double, setDouble] = useState<((n: number) => number) | null>(null)
  const [input, setInput] = useState('21')

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Нужно много раз умножать числа на 2. Каждый раз писать{' '}
        <code>multiply(2, x)</code> неудобно — сначала зафиксируем множитель, потом только число.
      </p>
      <ol className={shell.steps}>
        <li>
          Каррирование: <code>multiply(a)(b)</code> вместо <code>multiply(a, b)</code>.
        </li>
        <li>
          <code>const double = multiply(2)</code> — частичная настройка.
        </li>
        <li>Гоняйте разные числа через один и тот же <code>double</code>.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={() => {
            const multiply = (a: number) => (b: number) => a * b
            const d = multiply(2)
            setDouble(() => d)
            log('ok', 'создали double = multiply(2)')
            log('ok', `double(21) → ${d(21)}`)
          }}
        >
          Создать double = multiply(2)
        </LabButton>
        <label className={shell.field}>
          <span>число</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} />
        </label>
        <LabButton variant="secondary" disabled={!double}
          onClick={() => {
            if (!double) return
            const n = Number(input)
            if (!Number.isFinite(n)) {
              log('err', 'введите число')
              return
            }
            log('ok', `double(${n}) → ${double(n)}`)
          }}
        >
          Вызвать double(n)
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Правите каррированные примеры — результат и `console.log` появятся в консоли внизу."
      snippets={[
        {
          id: 'multiply',
          label: 'multiply(a)(b)',
          code: `const multiply = (a) => (b) => a * b;

console.log(multiply(2)(21)); // 42

const double = multiply(2);
console.log(double(10)); // 20
console.log(double(7));  // 14`,
        },
        {
          id: 'format',
          label: 'Настройка форматтера',
          code: `const formatPrice = (currency) => (locale) => (amount) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);

const rubRu = formatPrice('RUB')('ru-RU');
console.log(rubRu(1500));
console.log(rubRu(99.5));`,
        },
        {
          id: 'curry2',
          label: 'Мини-curry на 2 аргумента',
          note: 'Упрощённо: не универсальный `curry`, а идея накопления аргументов.',
          code: `function curry2(fn) {
  return (a) => (b) => fn(a, b);
}

const add = (x, y) => x + y;
const curriedAdd = curry2(add);

console.log(curriedAdd(2)(3)); // 5

const add10 = curriedAdd(10);
console.log(add10(5)); // 15`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Сначала множитель, потом число"
      lead="Каррирование превращает f(a, b) в f(a)(b): можно заранее зафиксировать часть аргументов."
      problem={problem}
      code={code}
    />
  )
}
