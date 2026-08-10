import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '129-algorithms-big-o'

function makeArray(n: number) {
  return Array.from({ length: n }, (_, i) => i)
}

/** Наивный поиск пары с суммой target — O(n²) сравнений. */
function pairSumNaive(arr: number[], target: number) {
  let steps = 0
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      steps++
      if (arr[i] + arr[j] === target) return { found: true, steps }
    }
  }
  return { found: false, steps }
}

/** Один проход + Set — O(n) шагов. */
function pairSumLinear(arr: number[], target: number) {
  let steps = 0
  const seen = new Set<number>()
  for (const x of arr) {
    steps++
    if (seen.has(target - x)) return { found: true, steps }
    seen.add(x)
  }
  return { found: false, steps }
}

export function AlgorithmsBigOLab() {
  const { lines, log, clear } = useLabLog()
  const [n, setN] = useState(200)
  const [last, setLast] = useState<{ naive: number; linear: number } | null>(null)

  const runCompare = () => {
    const size = Math.min(2000, Math.max(10, Math.floor(n)))
    const arr = makeArray(size)
    // цель заведомо существует: 0 + (size-1)
    const target = size - 1
    const naive = pairSumNaive(arr, target)
    const linear = pairSumLinear(arr, target)
    setLast({ naive: naive.steps, linear: linear.steps })
    log('err', `n=${size}: naive O(n²) → ${naive.steps} сравнений`)
    log('ok', `n=${size}: Set O(n) → ${linear.steps} шагов`)
    if (naive.steps > 0) {
      log(
        'info',
        `отношение naive/linear ≈ ${(naive.steps / Math.max(1, linear.steps)).toFixed(1)}×`,
      )
    }
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Нужно понять, «насколько подорожает» код при росте <code>n</code>. Два алгоритма ищут пару
        чисел с заданной суммой: вложенные циклы vs один проход с <code>Set</code>. Считаем шаги —
        это и есть интуиция Big O.
      </p>
      <ol className={shell.steps}>
        <li>
          Задайте размер массива <code>n</code> (чем больше — тем яснее разница).
        </li>
        <li>
          Запустите сравнение: naive растёт примерно как <code>n²</code>, вариант с{' '}
          <code>Set</code> — как <code>n</code>.
        </li>
        <li>
          Смените <code>n</code> и снова запустите — смотрите, как разъезжается число шагов.
        </li>
      </ol>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>n (10…2000)</span>
          <input
            type="number"
            min={10}
            max={2000}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        <LabButton variant="primary" onClick={runCompare}>
          Сравнить шаги
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            setN(200)
            setLast(null)
            clear()
          }}
        >
          Сброс
        </LabButton>
      </div>

      {last ? (
        <p className={shell.hint}>
          Последний замер: naive <code>{last.naive}</code> · linear <code>{last.linear}</code>
        </p>
      ) : (
        <p className={shell.hint}>Нажмите «Сравнить шаги», чтобы заполнить лог.</p>
      )}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Считайте шаги циклов — так оценивают Big O на глаз. Правите примеры и смотрите `console.log`."
      snippets={[
        {
          id: 'count-loops',
          label: 'Счётчик шагов',
          note: 'Число итераций ≈ модель времени. Вложенность даёт произведение.',
          code: `function countNested(n) {
  let steps = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) steps++;
  }
  return steps; // n * n → O(n²)
}

console.log('n=10 →', countNested(10));
console.log('n=100 →', countNested(100));`,
        },
        {
          id: 'pair-sum',
          label: 'O(n²) vs O(n)',
          note: '`Set` заменяет внутренний поиск: снимаем один множитель n.',
          code: `function pairSumNaive(arr, target) {
  let steps = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      steps++;
      if (arr[i] + arr[j] === target) return { ok: true, steps };
    }
  }
  return { ok: false, steps };
}

function pairSumLinear(arr, target) {
  let steps = 0;
  const seen = new Set();
  for (const x of arr) {
    steps++;
    if (seen.has(target - x)) return { ok: true, steps };
    seen.add(x);
  }
  return { ok: false, steps };
}

const arr = Array.from({ length: 200 }, (_, i) => i);
console.log('naive', pairSumNaive(arr, 199));
console.log('linear', pairSumLinear(arr, 199));`,
        },
        {
          id: 'drop-constants',
          label: 'Отбросить константы',
          note: 'Big O смотрит на доминирующий член: 3n + 100 и n — оба O(n).',
          code: `function classify(expr) {
  // учебная подсказка, не парсер
  const table = {
    '5': 'O(1)',
    '3*n + 100': 'O(n)',
    'n*n + 2*n': 'O(n²)',
    'n * Math.log2(n)': 'O(n log n)',
  };
  return table[expr] ?? '?';
}

for (const e of ['5', '3*n + 100', 'n*n + 2*n', 'n * Math.log2(n)']) {
  console.log(e, '→', classify(e));
}`,
        },
        {
          id: 'scale',
          label: 'Шкала уровней',
          note: 'Запомните порядок: константа < логарифм < линейная < n log n < квадрат.',
          code: `const scale = [
  ['O(1)', 'доступ по индексу, Map.get'],
  ['O(log n)', 'бинарный поиск'],
  ['O(n)', 'один проход массива'],
  ['O(n log n)', 'хорошая сортировка'],
  ['O(n²)', 'двойной цикл по n'],
];

for (const [bigO, example] of scale) {
  console.log(bigO.padEnd(12), '—', example);
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Считаем шаги: n² против n"
      lead="Big O — про рост числа операций. Сравните вложенные циклы и один проход с Set на одном и том же n."
      problem={problem}
      code={code}
    />
  )
}
