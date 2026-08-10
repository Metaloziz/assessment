import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '135-algorithms-complexity-notations'

/** Insertion sort with best/worst shaped inputs — count comparisons. */
function insertionCounted(arr: number[]) {
  const a = arr.slice()
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
  return cmp
}

function classify(label: string): string {
  const table: Record<string, string> = {
    '3*n+5 vs n': 'Θ(n) — и верх, и низ одного порядка',
    'n vs n² (верх)': 'n = O(n²) — верно, но потолок завышен',
    'n vs n² (плотно)': 'n ≠ Θ(n²)',
    'n vs n² (строго)': 'n = o(n²) — отношение → 0',
    'сортировка сравнениями': 'worst Ω(n log n) — нижняя оценка класса',
  }
  return table[label] ?? '?'
}

type Mode = 'cases' | 'lands'

export function AlgorithmsComplexityNotationsLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('cases')
  const [n, setN] = useState(80)
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    if (mode === 'cases') {
      const size = Math.min(400, Math.max(8, Math.floor(n)))
      const sorted = Array.from({ length: size }, (_, i) => i)
      const reversed = Array.from({ length: size }, (_, i) => size - 1 - i)
      const best = insertionCounted(sorted)
      const worst = insertionCounted(reversed)
      setHint(`n=${size}: best ${best} · worst ${worst}`)
      log('info', 'Insertion Sort: сравнения на разных входах')
      log('ok', `best (уже отсортирован) → ${best} ≈ Θ(n)`)
      log('err', `worst (обратный порядок) → ${worst} ≈ Θ(n²)`)
      log('info', 'Одна буква O без случая скрывает эту вилку')
      return
    }

    const rows = [
      '3*n+5 vs n',
      'n vs n² (верх)',
      'n vs n² (плотно)',
      'n vs n² (строго)',
      'сортировка сравнениями',
    ] as const
    setHint('сводка O / Θ / Ω / o')
    for (const row of rows) {
      log('info', `${row} → ${classify(row)}`)
    }
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Big O — потолок. На Insertion Sort best и worst различаются на порядок; рядом — смысл{' '}
        <code>Θ</code>, <code>Ω</code>, <code>o</code> на коротких примерах.
      </p>
      <ol className={shell.steps}>
        <li>
          Режим <code>Best/Worst</code> — сравните число сравнений на разном входе.
        </li>
        <li>
          Режим <code>O Θ Ω o</code> — проговорите вслух каждую строку лога.
        </li>
        <li>Увеличьте <code>n</code> в первом режиме — разрыв best/worst растёт.</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'cases'}
          onClick={() => {
            setMode('cases')
            setHint(null)
          }}
        >
          Best / Worst
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'lands'}
          onClick={() => {
            setMode('lands')
            setHint(null)
          }}
        >
          O Θ Ω o
        </LabButton>
      </div>

      <div className={shell.row}>
        {mode === 'cases' ? (
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
        ) : null}
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            setMode('cases')
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
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Нажмите «Запустить».</p>
      )}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="O — верх, Ω — низ, Θ — оба, o — строго медленнее. Best/average/worst уточняют вход."
      snippets={[
        {
          id: 'family',
          label: 'Семейство',
          note: '`Θ` ⇒ и `O`, и `Ω`. Из одного `O` не следует `Θ`.',
          code: `const notes = [
  ['O(g)', 'f не выше порядка g (потолок)'],
  ['Ω(g)', 'f не ниже порядка g (пол)'],
  ['Θ(g)', 'и пол, и потолок одного порядка'],
  ['o(g)', 'строго медленнее g (f/g → 0)'],
  ['ω(g)', 'строго быстрее порядка g'],
];
for (const [sym, meaning] of notes) {
  console.log(sym.padEnd(6), '—', meaning);
}`,
        },
        {
          id: 'insertion-cases',
          label: 'Best vs Worst',
          note: 'Insertion: почти готовый вход → мало сдвигов; обратный → много.',
          code: `function insertionCmp(arr) {
  const a = arr.slice();
  let cmp = 0;
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      cmp++;
      if (a[j] <= key) break;
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return cmp;
}

const n = 100;
const best = insertionCmp(Array.from({ length: n }, (_, i) => i));
const worst = insertionCmp(Array.from({ length: n }, (_, i) => n - i));
console.log({ best, worst });`,
        },
        {
          id: 'tight',
          label: 'Тесный потолок',
          note: 'Формально n = O(n²), но обычно пишут самый тесный простой порядок.',
          code: `function looseOrTight(fName) {
  const options = {
    '3*n+5': ['O(n)', 'O(n²)', 'Θ(n)'],
    'n*n': ['O(n²)', 'Θ(n²)', 'Ω(n²)'],
  };
  return options[fName];
}

console.log('3*n+5', looseOrTight('3*n+5'));
console.log('n*n', looseOrTight('n*n'));`,
        },
        {
          id: 'say',
          label: 'Как говорить',
          note: 'В ревью чаще Big O + случай; Θ — когда доказали обе границы.',
          code: `const say = [
  ['код-ревью', 'worst-case O(n log n), extra O(1)'],
  ['доказали обе границы', 'Θ(n)'],
  ['нижняя оценка класса', 'Ω(n log n) для comparison sort'],
];
for (const [ctx, phrase] of say) {
  console.log(ctx.padEnd(28), '→', phrase);
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="O, Θ, Ω и случаи входа"
      lead="Best/worst на Insertion Sort и краткие формулировки Landau — чтобы Big O не путали с «ровно порядок»."
      problem={problem}
      code={code}
    />
  )
}
