import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '130-algorithms-sorting'

type Kind = 'random' | 'nearly'

function makeArray(n: number, kind: Kind): number[] {
  if (kind === 'nearly') {
    const a = Array.from({ length: n }, (_, i) => i)
    // пара соседних обменов — почти отсортировано
    for (let k = 0; k < Math.max(1, Math.floor(n / 20)); k++) {
      const i = (k * 7) % (n - 1)
      ;[a[i], a[i + 1]] = [a[i + 1]!, a[i]!]
    }
    return a
  }
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function bubbleSortCounted(src: number[]) {
  const a = src.slice()
  let cmp = 0
  const n = a.length
  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    for (let j = 0; j < n - i - 1; j++) {
      cmp++
      if (a[j]! > a[j + 1]!) {
        ;[a[j], a[j + 1]] = [a[j + 1]!, a[j]!]
        swapped = true
      }
    }
    if (!swapped) break
  }
  return { cmp, sorted: a }
}

function insertionSortCounted(src: number[]) {
  const a = src.slice()
  let cmp = 0
  for (let i = 1; i < a.length; i++) {
    const key = a[i]!
    let j = i - 1
    while (j >= 0) {
      cmp++
      if (a[j]! <= key) break
      a[j + 1] = a[j]!
      j--
    }
    a[j + 1] = key
  }
  return { cmp, sorted: a }
}

function mergeSortCounted(src: number[]) {
  let cmp = 0

  function merge(left: number[], right: number[]) {
    const out: number[] = []
    let i = 0
    let j = 0
    while (i < left.length && j < right.length) {
      cmp++
      if (left[i]! <= right[j]!) out.push(left[i++]!)
      else out.push(right[j++]!)
    }
    return out.concat(left.slice(i), right.slice(j))
  }

  function sort(arr: number[]): number[] {
    if (arr.length <= 1) return arr
    const mid = Math.floor(arr.length / 2)
    return merge(sort(arr.slice(0, mid)), sort(arr.slice(mid)))
  }

  return { cmp, sorted: sort(src.slice()) }
}

type Counts = { bubble: number; insertion: number; merge: number }

export function AlgorithmsSortingLab() {
  const { lines, log, clear } = useLabLog()
  const [n, setN] = useState(80)
  const [kind, setKind] = useState<Kind>('random')
  const [last, setLast] = useState<Counts | null>(null)

  const runCompare = () => {
    const size = Math.min(400, Math.max(8, Math.floor(n)))
    const src = makeArray(size, kind)
    const bubble = bubbleSortCounted(src)
    const insertion = insertionSortCounted(src)
    const merge = mergeSortCounted(src)

    const ok =
      JSON.stringify(bubble.sorted) === JSON.stringify(insertion.sorted) &&
      JSON.stringify(insertion.sorted) === JSON.stringify(merge.sorted)

    setLast({ bubble: bubble.cmp, insertion: insertion.cmp, merge: merge.cmp })
    log('info', `n=${size}, данные: ${kind === 'random' ? 'случайные' : 'почти отсортированные'}`)
    log('err', `Bubble ≈ O(n²) → ${bubble.cmp} сравнений`)
    log(
      kind === 'nearly' ? 'ok' : 'info',
      `Insertion → ${insertion.cmp} сравнений${kind === 'nearly' ? ' (почти отсортировано — дёшево)' : ''}`,
    )
    log('ok', `Merge ≈ O(n log n) → ${merge.cmp} сравнений`)
    if (ok) log('ok', 'Все три дали одинаковый результат')
    else log('err', 'Результаты разошлись — баг в учебной реализации')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        На глаз неочевидно, чем <code>Merge</code> лучше <code>Bubble</code>: посчитайте сравнения
        на одном массиве. На почти отсортированных данных <code>Insertion</code> часто выигрывает у
        квадратичных «соседей».
      </p>
      <ol className={shell.steps}>
        <li>
          Выберите размер <code>n</code> и тип данных: случайные или почти отсортированные.
        </li>
        <li>
          Запустите сравнение: смотрите, как растут сравнения у <code>Bubble</code> /{' '}
          <code>Insertion</code> vs <code>Merge</code>.
        </li>
        <li>
          Переключите тип данных на почти отсортированные — у <code>Insertion</code> число
          сравнений должно заметно упасть.
        </li>
      </ol>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>n (8…400)</span>
          <input
            type="number"
            min={8}
            max={400}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>
        <LabButton
          variant="ghost"
          size="sm"
          active={kind === 'random'}
          onClick={() => setKind('random')}
        >
          Случайные
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={kind === 'nearly'}
          onClick={() => setKind('nearly')}
        >
          Почти отсортированные
        </LabButton>
        <LabButton variant="primary" onClick={runCompare}>
          Сравнить сортировки
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            setN(80)
            setKind('random')
            setLast(null)
            clear()
          }}
        >
          Сброс
        </LabButton>
      </div>

      {last ? (
        <p className={shell.hint}>
          Последний замер: Bubble <code>{last.bubble}</code> · Insertion{' '}
          <code>{last.insertion}</code> · Merge <code>{last.merge}</code>
        </p>
      ) : (
        <p className={shell.hint}>Нажмите «Сравнить сортировки», чтобы заполнить лог.</p>
      )}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Учебные реализации сортировок. В проде чаще `Array.prototype.sort` (Timsort в V8)."
      snippets={[
        {
          id: 'bubble',
          label: 'Bubble',
          note: 'Соседи меняются местами; максимум «всплывает». С флагом `swapped` лучший случай близок к O(n).',
          code: `function bubbleSort(arr) {
  const a = arr.slice();
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}

console.log(bubbleSort([3, 1, 4, 1, 5, 9, 2]));`,
        },
        {
          id: 'insertion',
          label: 'Insertion',
          note: 'Вставляем элемент в отсортированный префикс. На почти упорядоченных данных почти O(n).',
          code: `function insertionSort(arr) {
  const a = arr.slice();
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return a;
}

console.log(insertionSort([3, 1, 4, 1, 5, 9, 2]));`,
        },
        {
          id: 'merge',
          label: 'Merge',
          note: 'Делим пополам, сливаем. Гарантия O(n log n), доп. память O(n), стабильный.',
          code: `function merge(left, right) {
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) out.push(left[i++]);
    else out.push(right[j++]);
  }
  return out.concat(left.slice(i), right.slice(j));
}

function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  return merge(mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid)));
}

console.log(mergeSort([3, 1, 4, 1, 5, 9, 2]));`,
        },
        {
          id: 'builtin-sort',
          label: '.sort()',
          note: 'В V8 — Timsort. Для чисел всегда передавайте `compareFn`, иначе будет лексикография.',
          code: `const nums = [10, 2, 1, 20];
console.log('без компаратора:', [...nums].sort()); // ['1','10','2','20'] как строки
console.log('с компаратором:', [...nums].sort((a, b) => a - b));

const users = [
  { name: 'Bob', age: 30 },
  { name: 'Alice', age: 25 },
  { name: 'Charlie', age: 30 },
];
users.sort((a, b) => a.age - b.age || a.name.localeCompare(b.name));
console.log(users.map((u) => u.name + '(' + u.age + ')').join(', '));`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Сортировки: считаем сравнения"
      lead="Bubble и Insertion — квадратичные; Merge держит O(n log n). На почти отсортированных данных Insertion часто резко дешевеет."
      problem={problem}
      code={code}
    />
  )
}
