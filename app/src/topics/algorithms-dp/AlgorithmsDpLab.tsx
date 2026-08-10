import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '131-algorithms-dp'

function fibNaive(n: number, counter: { calls: number }): number {
  counter.calls++
  if (n <= 1) return n
  return fibNaive(n - 1, counter) + fibNaive(n - 2, counter)
}

function fibMemo(
  n: number,
  memo: Map<number, number>,
  counter: { calls: number },
): number {
  counter.calls++
  if (n <= 1) return n
  const hit = memo.get(n)
  if (hit !== undefined) return hit
  const value = fibMemo(n - 1, memo, counter) + fibMemo(n - 2, memo, counter)
  memo.set(n, value)
  return value
}

function fibTable(n: number, counter: { steps: number }): number {
  if (n <= 1) {
    counter.steps++
    return n
  }
  let a = 0
  let b = 1
  for (let i = 2; i <= n; i++) {
    counter.steps++
    const next = a + b
    a = b
    b = next
  }
  return b
}

export function AlgorithmsDpLab() {
  const { lines, log, clear } = useLabLog()
  const [n, setN] = useState(12)
  const [last, setLast] = useState<{
    naive: number
    memo: number
    table: number
    value: number
  } | null>(null)

  const runCompare = () => {
    const size = Math.min(20, Math.max(2, Math.floor(n)))
    const naiveCounter = { calls: 0 }
    const memoCounter = { calls: 0 }
    const tableCounter = { steps: 0 }

    // naive выше ~20 уже тяжело для UI — режем
    const naiveN = Math.min(size, 18)
    const naiveValue = fibNaive(naiveN, naiveCounter)
    const memoValue = fibMemo(size, new Map(), memoCounter)
    const tableValue = fibTable(size, tableCounter)

    if (memoValue !== tableValue) {
      log('err', 'memo и table разошлись — ошибка в учебной реализации')
      return
    }

    setLast({
      naive: naiveCounter.calls,
      memo: memoCounter.calls,
      table: tableCounter.steps,
      value: memoValue,
    })

    log('info', `fib(${size}) = ${memoValue}`)
    if (naiveN < size) {
      log('info', `naive считали на n=${naiveN} (для больших n дерево взрывается)`)
    }
    log('err', `naive: ${naiveCounter.calls} вызовов (на n=${naiveN})`)
    log('ok', `memo: ${memoCounter.calls} вызовов`)
    log('ok', `table: ${tableCounter.steps} шагов цикла`)
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Без кэша <code>fib(n)</code> пересчитывает одни и те же хвосты снова и снова — дерево
        вызовов растёт как степень двойки. Мемоизация и таблица считают каждое состояние по сути
        один раз. Сравните счётчики на одном <code>n</code>.
      </p>
      <ol className={shell.steps}>
        <li>
          Задайте <code>n</code> (для naive сверху ограничим, чтобы вкладка не зависла).
        </li>
        <li>
          Запустите сравнение: смотрите вызовы naive vs <code>memo</code> и шаги{' '}
          <code>table</code>.
        </li>
        <li>
          Увеличьте <code>n</code> — разрыв должен резко вырасти.
        </li>
      </ol>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>n (2…20)</span>
          <input
            type="number"
            min={2}
            max={20}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        <LabButton variant="primary" onClick={runCompare}>
          Сравнить fib
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            setN(12)
            setLast(null)
            clear()
          }}
        >
          Сброс
        </LabButton>
      </div>

      {last ? (
        <p className={shell.hint}>
          fib = <code>{last.value}</code> · naive calls <code>{last.naive}</code> · memo{' '}
          <code>{last.memo}</code> · table <code>{last.table}</code>
        </p>
      ) : (
        <p className={shell.hint}>Нажмите «Сравнить fib», чтобы заполнить лог.</p>
      )}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="DP: сначала состояние и переход, потом код. Ниже — naive, `memo` и таблица на Фибоначчи и лестнице."
      snippets={[
        {
          id: 'fib-naive',
          label: 'Naive fib',
          note: 'Каждый вызов ветвится на два. Без кэша — взрыв по `n`.',
          code: `function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

console.log(fib(10));
// Попробуйте fib(35) — уже заметно медленнее.`,
        },
        {
          id: 'fib-memo',
          label: 'Memo',
          note: 'Top-down: тот же переход, но ответ на `n` кладём в `Map`.',
          code: `function fibMemo(n, memo = new Map()) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n);
  const value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, value);
  return value;
}

console.log(fibMemo(40));`,
        },
        {
          id: 'fib-table',
          label: 'Table',
          note: 'Bottom-up: идём от базы к `n`. Здесь хватает двух переменных — O(1) памяти.',
          code: `function fibTable(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

console.log(fibTable(40));`,
        },
        {
          id: 'climb',
          label: 'Лестница',
          note: '`dp[i]` — способов дойти до ступени `i` шагами 1 или 2. Тот же каркас, другое состояние.',
          code: `function climbWays(n) {
  if (n <= 1) return 1;
  const dp = Array(n + 1).fill(0);
  dp[0] = 1;
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}

console.log(climbWays(5)); // 8`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="DP: naive против memo и таблицы"
      lead="Одни и те же подзадачи без кэша считаются многократно. Мемоизация и bottom-up убирают повторную работу — сравните счётчики на fib(n)."
      problem={problem}
      code={code}
    />
  )
}
