import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '132-algorithms-patterns'

function makeSorted(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i * 2)
}

/** Наивный поиск пары с суммой — O(n²) сравнений. */
function pairSumNested(arr: number[], target: number) {
  let steps = 0
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      steps++
      if (arr[i]! + arr[j]! === target) return { found: true, steps }
    }
  }
  return { found: false, steps }
}

/** Two pointers на отсортированном массиве. */
function pairSumPointers(arr: number[], target: number) {
  let steps = 0
  let left = 0
  let right = arr.length - 1
  while (left < right) {
    steps++
    const sum = arr[left]! + arr[right]!
    if (sum === target) return { found: true, steps }
    if (sum < target) left++
    else right--
  }
  return { found: false, steps }
}

function linearFind(arr: number[], target: number) {
  let steps = 0
  for (let i = 0; i < arr.length; i++) {
    steps++
    if (arr[i] === target) return { index: i, steps }
  }
  return { index: -1, steps }
}

function binaryFind(arr: number[], target: number) {
  let steps = 0
  let lo = 0
  let hi = arr.length - 1
  while (lo <= hi) {
    steps++
    const mid = (lo + hi) >> 1
    if (arr[mid] === target) return { index: mid, steps }
    if (arr[mid]! < target) lo = mid + 1
    else hi = mid - 1
  }
  return { index: -1, steps }
}

/** Число листьев дерева перестановок vs вызовов bt с used. */
function permStats(n: number) {
  const nums = Array.from({ length: n }, (_, i) => i)
  let calls = 0
  let leaves = 0
  const used = new Array(n).fill(false)
  const path: number[] = []

  function bt() {
    calls++
    if (path.length === n) {
      leaves++
      return
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue
      used[i] = true
      path.push(nums[i]!)
      bt()
      path.pop()
      used[i] = false
    }
  }

  bt()
  return { calls, leaves }
}

type Mode = 'pointers' | 'binary' | 'backtrack'

export function AlgorithmsPatternsLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('pointers')
  const [n, setN] = useState(80)
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    if (mode === 'pointers') {
      const size = Math.min(500, Math.max(8, Math.floor(n)))
      const arr = makeSorted(size)
      const target = arr[0]! + arr[size - 1]!
      const nested = pairSumNested(arr, target)
      const pointers = pairSumPointers(arr, target)
      setHint(
        `n=${size}: nested ${nested.steps} · pointers ${pointers.steps}`,
      )
      log('info', `отсортированный массив, target = первый + последний`)
      log('err', `вложенные циклы → ${nested.steps} сравнений`)
      log('ok', `two pointers → ${pointers.steps} шагов`)
      return
    }

    if (mode === 'binary') {
      const size = Math.min(5000, Math.max(8, Math.floor(n)))
      const arr = makeSorted(size)
      const target = arr[Math.floor(size * 0.7)]!
      const lin = linearFind(arr, target)
      const bin = binaryFind(arr, target)
      setHint(`n=${size}: linear ${lin.steps} · binary ${bin.steps}`)
      log('info', `ищем значение на ~70% позиции`)
      log('err', `линейный проход → ${lin.steps} сравнений`)
      log('ok', `binary search → ${bin.steps} сравнений`)
      return
    }

    const size = Math.min(7, Math.max(2, Math.floor(n)))
    const { calls, leaves } = permStats(size)
    setHint(`n=${size}: bt-вызовов ${calls} · перестановок ${leaves}`)
    log('info', `перестановки 0…${size - 1}`)
    log('ok', `листьев (n!) = ${leaves}`)
    log('info', `вызовов bt (узлы дерева) = ${calls}`)
    log(
      'info',
      'каждый шаг: apply → recurse → undo — без undo ветки испортили бы used/path',
    )
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Три шаблона решают разное. Здесь можно руками сравнить цену:{' '}
        <code>two pointers</code> против двойного цикла, бинпоиск против линейного
        прохода, и увидеть дерево <code>backtracking</code> на перестановках.
      </p>
      <ol className={shell.steps}>
        <li>Выберите шаблон вкладкой.</li>
        <li>
          Задайте <code>n</code> и запустите — в логе счётчики шагов / вызовов.
        </li>
        <li>Смените <code>n</code>: у pointers и binary разрыв растёт с размером.</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'pointers'}
          onClick={() => {
            setMode('pointers')
            setN(80)
            setHint(null)
          }}
        >
          Two pointers
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'binary'}
          onClick={() => {
            setMode('binary')
            setN(500)
            setHint(null)
          }}
        >
          Binary search
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'backtrack'}
          onClick={() => {
            setMode('backtrack')
            setN(4)
            setHint(null)
          }}
        >
          Backtracking
        </LabButton>
      </div>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>
            {mode === 'backtrack' ? 'n (2…7)' : mode === 'binary' ? 'n (8…5000)' : 'n (8…500)'}
          </span>
          <input
            type="number"
            min={mode === 'backtrack' ? 2 : 8}
            max={mode === 'backtrack' ? 7 : mode === 'binary' ? 5000 : 500}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            setMode('pointers')
            setN(80)
            setHint(null)
            clear()
          }}
        >
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Последний замер: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите шаблон и нажмите «Запустить».</p>
      )}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Три каркаса. В `note` — когда какой уместен; правьте примеры и смотрите `console.log`."
      snippets={[
        {
          id: 'two-pointers',
          label: 'Two pointers',
          note: 'Отсортированный массив: двигаем тот конец, который чинит сумму. O(n) после сортировки.',
          code: `function twoSumSorted(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return null;
}

console.log(twoSumSorted([1, 2, 4, 7, 11], 9));`,
        },
        {
          id: 'binary',
          label: 'Binary search',
          note: 'Монотонность обязательна. Инвариант: ответ в [lo, hi], пока отрезок не пуст.',
          code: `function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

const a = [0, 2, 4, 6, 8, 10];
console.log(binarySearch(a, 6), binarySearch(a, 5));`,
        },
        {
          id: 'backtrack',
          label: 'Backtracking',
          note: 'apply → recurse → undo. Без `undo` состояние протечёт в соседние ветки.',
          code: `function permutations(nums) {
  const res = [];
  const used = Array(nums.length).fill(false);
  const path = [];

  function bt() {
    if (path.length === nums.length) {
      res.push(path.slice());
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(nums[i]);
      bt();
      path.pop();
      used[i] = false;
    }
  }

  bt();
  return res;
}

console.log(permutations([1, 2, 3]));`,
        },
        {
          id: 'choose',
          label: 'Что выбрать',
          note: 'Краткая таблица по сигналам в условии — старт, не догма.',
          code: `const hints = [
  ['отсортировано + пара/окно', 'two pointers'],
  ['монотонный ok(x) / sorted find', 'binary search'],
  ['расстановки / пути с откатом', 'backtracking'],
  ['перекрывающиеся подзадачи', 'DP'],
];

for (const [signal, pattern] of hints) {
  console.log(signal.padEnd(34), '→', pattern);
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Шаблоны: указатели, бинпоиск, откат"
      lead="Сравните стоимость двух указателей и двойного цикла, бинпоиска и линейного прохода; посмотрите дерево backtracking на перестановках."
      problem={problem}
      code={code}
    />
  )
}
