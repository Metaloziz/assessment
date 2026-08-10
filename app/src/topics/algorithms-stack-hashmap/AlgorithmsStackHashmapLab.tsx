import { useEffect, useRef, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import viz from './AlgorithmsStackHashmapLab.module.css'

const TOPIC_ID = '133-algorithms-stack-hashmap'

const PAIR: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
const DEMO_NUMS = [2, 7, 11, 15]
const DEMO_TARGET = 9

type Mode = 'stack' | 'hash'

type StackFrame = {
  stack: string[]
  cursor: string | null
  action: string
  status: 'run' | 'ok' | 'err'
}

type HashFrame = {
  index: number
  mapEntries: Array<[number, number]>
  need: number | null
  hitKey: number | null
  action: string
  status: 'run' | 'ok'
}

function buildStackFrames(s: string): StackFrame[] {
  const frames: StackFrame[] = [
    { stack: [], cursor: null, action: 'старт: стек пуст', status: 'run' },
  ]
  const stack: string[] = []
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch)
      frames.push({
        stack: [...stack],
        cursor: ch,
        action: `push ${ch}`,
        status: 'run',
      })
    } else if (ch in PAIR) {
      const opened = stack.pop()
      const ok = opened === PAIR[ch]
      frames.push({
        stack: [...stack],
        cursor: ch,
        action: ok ? `pop ${opened} ↔ ${ch}` : `pop ${opened ?? '∅'} ≠ ${ch}`,
        status: ok ? 'run' : 'err',
      })
      if (!ok) {
        frames.push({
          stack: [...stack],
          cursor: ch,
          action: 'неверная пара — стоп',
          status: 'err',
        })
        return frames
      }
    }
  }
  const empty = stack.length === 0
  frames.push({
    stack: [...stack],
    cursor: null,
    action: empty ? 'стек пуст — скобки OK' : `хвост в стеке: [${stack.join(' ')}]`,
    status: empty ? 'ok' : 'err',
  })
  return frames
}

function buildHashFrames(nums: number[], target: number): HashFrame[] {
  const frames: HashFrame[] = [
    {
      index: -1,
      mapEntries: [],
      need: null,
      hitKey: null,
      action: `target = ${target}, Map пуст`,
      status: 'run',
    },
  ]
  const seen = new Map<number, number>()
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]!
    if (seen.has(need)) {
      frames.push({
        index: i,
        mapEntries: [...seen.entries()],
        need,
        hitKey: need,
        action: `nums[${i}]=${nums[i]} · need ${need} — hit в Map`,
        status: 'ok',
      })
      return frames
    }
    seen.set(nums[i]!, i)
    frames.push({
      index: i,
      mapEntries: [...seen.entries()],
      need,
      hitKey: null,
      action: `nums[${i}]=${nums[i]} · need ${need} нет → set(${nums[i]} → ${i})`,
      status: 'run',
    })
  }
  frames.push({
    index: nums.length - 1,
    mapEntries: [...seen.entries()],
    need: null,
    hitKey: null,
    action: 'пара не найдена',
    status: 'run',
  })
  return frames
}

function twoSumNested(nums: number[], target: number) {
  let steps = 0
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      steps++
      if (nums[i]! + nums[j]! === target) return { steps, ok: true }
    }
  }
  return { steps, ok: false }
}

function twoSumMap(nums: number[], target: number) {
  let steps = 0
  const seen = new Map<number, number>()
  for (let i = 0; i < nums.length; i++) {
    steps++
    const need = target - nums[i]!
    if (seen.has(need)) return { steps, ok: true }
    seen.set(nums[i]!, i)
  }
  return { steps, ok: false }
}

function StackViz({
  stack,
  cursor,
  action,
  status,
}: {
  stack: string[]
  cursor: string | null
  action: string
  status: 'run' | 'ok' | 'err'
}) {
  return (
    <div className={viz.stackScene}>
      <div className={viz.stackWell} aria-label="Стек">
        <div className={viz.stackBase} />
        {stack.length === 0 ? (
          <span className={viz.stackEmpty}>empty</span>
        ) : (
          stack.map((ch, i) => (
            <div
              key={`${ch}-${i}-${stack.length}`}
              className={`${viz.plate} ${i === stack.length - 1 ? viz.plateTop : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {ch}
            </div>
          ))
        )}
      </div>
      <div className={viz.stackSide}>
        {cursor != null ? (
          <span className={viz.cursorChip}>
            char <strong>{cursor}</strong>
          </span>
        ) : (
          <span className={viz.cursorChip}>LIFO · верх светится</span>
        )}
        <p
          className={[
            viz.actionText,
            status === 'ok' ? viz.actionOk : '',
            status === 'err' ? viz.actionErr : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {action}
        </p>
      </div>
    </div>
  )
}

function HashViz({
  nums,
  frame,
}: {
  nums: number[]
  frame: HashFrame
}) {
  return (
    <div className={viz.hashScene}>
      <div className={viz.arrayRow}>
        {nums.map((v, i) => (
          <div key={i} className={viz.arrayCell}>
            <span className={viz.arrayIdx}>{i}</span>
            <span
              className={[
                viz.arrayVal,
                frame.index === i ? viz.arrayValActive : '',
                frame.index > i ? viz.arrayValDone : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
      <div className={viz.buckets}>
        {frame.mapEntries.length === 0 ? (
          <div className={viz.bucketEmpty}>Map пуст</div>
        ) : (
          frame.mapEntries.map(([key, idx], i) => (
            <div
              key={`${key}-${idx}`}
              className={`${viz.bucket} ${frame.hitKey === key ? viz.bucketHit : ''}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={viz.bucketKey}>key → index</span>
              <span className={viz.bucketPair}>
                {key} → {idx}
              </span>
            </div>
          ))
        )}
      </div>
      <p
        className={[
          viz.actionText,
          frame.status === 'ok' ? viz.actionOk : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {frame.action}
      </p>
    </div>
  )
}

export function AlgorithmsStackHashmapLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('stack')
  const [codeMode, setCodeMode] = useState<Mode>('stack')
  const [brackets, setBrackets] = useState('{[()]}')
  const [n, setN] = useState(120)
  const [hint, setHint] = useState<string | null>(null)

  const [stackFrames, setStackFrames] = useState<StackFrame[]>(() =>
    buildStackFrames('{[()]}'),
  )
  const [stackStep, setStackStep] = useState(0)
  const [hashFrames, setHashFrames] = useState<HashFrame[]>(() =>
    buildHashFrames(DEMO_NUMS, DEMO_TARGET),
  )
  const [hashStep, setHashStep] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current)
    }
  }, [])

  const stopAnim = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const playFrames = (count: number, setStep: (n: number) => void) => {
    stopAnim()
    setStep(0)
    let i = 0
    timerRef.current = window.setInterval(() => {
      i += 1
      setStep(i)
      if (i >= count - 1) stopAnim()
    }, 480)
  }

  const run = () => {
    if (mode === 'stack') {
      const frames = buildStackFrames(brackets)
      const ok = frames[frames.length - 1]?.status === 'ok'
      setStackFrames(frames)
      setHint(ok ? 'скобки сбалансированы' : 'скобки не сбалансированы')
      log('info', `вход: ${brackets}`)
      for (const f of frames.slice(1)) {
        if (f.status === 'err') log('err', f.action)
        else if (f.status === 'ok') log('ok', f.action)
        else log('info', f.action)
      }
      playFrames(frames.length, setStackStep)
      return
    }

    const size = Math.min(2000, Math.max(10, Math.floor(n)))
    const nums = Array.from({ length: size }, (_, i) => i)
    const target = size - 1
    const nested = twoSumNested(nums, target)
    const mapped = twoSumMap(nums, target)
    setHint(`n=${size}: nested ${nested.steps} · Map ${mapped.steps}`)
    log('info', `сравнение на n=${size}, target = первый + последний`)
    log('err', `двойной цикл → ${nested.steps} сравнений`)
    log('ok', `один проход + Map → ${mapped.steps} шагов`)
    log('info', `визуализация — демо [${DEMO_NUMS.join(', ')}], target ${DEMO_TARGET}`)

    const frames = buildHashFrames(DEMO_NUMS, DEMO_TARGET)
    setHashFrames(frames)
    playFrames(frames.length, setHashStep)
  }

  const stackFrame = stackFrames[Math.min(stackStep, stackFrames.length - 1)]!
  const hashFrame = hashFrames[Math.min(hashStep, hashFrames.length - 1)]!

  const stackSnippets = [
    {
      id: 'brackets',
      label: 'Скобки',
      note: 'Открывающую — `push`; закрывающую — `pop` и сверка. Стек = LIFO.',
      code: `function isValid(s) {
  const stack = [];
  const pair = { ')': '(', ']': '[', '}': '{' };
  for (const ch of s) {
    if ('([{'.includes(ch)) stack.push(ch);
    else if (stack.pop() !== pair[ch]) return false;
  }
  return stack.length === 0;
}

console.log(isValid('{[()]}'), isValid('{[(])}'));`,
    },
    {
      id: 'stack-vs-queue',
      label: 'LIFO vs FIFO',
      note: 'Массив: `push`/`pop` — стек; `push`/`shift` — очередь.',
      code: `const stack = [];
stack.push('A', 'B');
console.log('stack pop', stack.pop()); // B

const queue = [];
queue.push('A', 'B');
console.log('queue shift', queue.shift()); // A`,
    },
  ]

  const hashSnippets = [
    {
      id: 'two-sum',
      label: 'Two-sum Map',
      note: '`Map` хранит уже виденные числа → индекс. Один проход.',
      code: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return null;
}

console.log(twoSum([2, 7, 11, 15], 9));`,
    },
    {
      id: 'freq',
      label: 'Частоты',
      note: 'Счётчик на `Map`: ключ → сколько раз встретили.',
      code: `function frequencies(items) {
  const map = new Map();
  for (const x of items) map.set(x, (map.get(x) ?? 0) + 1);
  return map;
}

console.log([...frequencies(['a', 'b', 'a', 'c', 'b', 'a'])]);`,
    },
  ]

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Стек помнит вложенность (скобки). <code>Map</code> убирает внутренний поиск — один проход
        вместо O(n²). На схеме видно LIFO и наполнение словаря.
      </p>
      <ol className={shell.steps}>
        <li>Выберите <code>Стек</code> или <code>Hash-map</code>.</li>
        <li>Для стека — строка скобок; для Map — <code>n</code> для замера + демо-схема.</li>
        <li>Запустите: анимация схемы и лог со счётчиками.</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'stack'}
          onClick={() => {
            stopAnim()
            setMode('stack')
            setHint(null)
          }}
        >
          Стек
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'hash'}
          onClick={() => {
            stopAnim()
            setMode('hash')
            setHint(null)
          }}
        >
          Hash-map
        </LabButton>
      </div>

      <div className={shell.row}>
        {mode === 'stack' ? (
          <label className={shell.field}>
            <span>строка скобок</span>
            <input
              value={brackets}
              onChange={(e) => setBrackets(e.target.value)}
              spellCheck={false}
            />
          </label>
        ) : (
          <label className={shell.field}>
            <span>n для замера (10…2000)</span>
            <input
              type="number"
              min={10}
              max={2000}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
            />
          </label>
        )}
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            stopAnim()
            setMode('stack')
            setBrackets('{[()]}')
            setN(120)
            setHint(null)
            setStackFrames(buildStackFrames('{[()]}'))
            setStackStep(0)
            setHashFrames(buildHashFrames(DEMO_NUMS, DEMO_TARGET))
            setHashStep(0)
            clear()
          }}
        >
          Сброс
        </LabButton>
      </div>

      <div className={viz.viz} aria-live="polite">
        <div className={viz.vizHead}>
          <p className={viz.vizTitle}>{mode === 'stack' ? 'Стек (LIFO)' : 'Hash-map'}</p>
          <p className={viz.vizMeta}>
            {mode === 'stack' ? 'верхняя тарелка = peek' : `демо [${DEMO_NUMS.join(', ')}] → ${DEMO_TARGET}`}
          </p>
        </div>
        {mode === 'stack' ? (
          <StackViz
            stack={stackFrame.stack}
            cursor={stackFrame.cursor}
            action={stackFrame.action}
            status={stackFrame.status}
          />
        ) : (
          <HashViz nums={DEMO_NUMS} frame={hashFrame} />
        )}
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Нажмите «Запустить», чтобы проиграть схему.</p>
      )}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={viz.codePane}>
      <div className={viz.codeSwitch}>
        <LabButton
          variant="ghost"
          size="sm"
          active={codeMode === 'stack'}
          onClick={() => setCodeMode('stack')}
        >
          Стек
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={codeMode === 'hash'}
          onClick={() => setCodeMode('hash')}
        >
          Hash-map
        </LabButton>
      </div>

      <div className={`${viz.viz} ${viz.vizCompact}`}>
        <div className={viz.vizHead}>
          <p className={viz.vizTitle}>
            {codeMode === 'stack' ? 'Стопка LIFO' : 'Ключ → значение'}
          </p>
          <p className={viz.vizMeta}>
            {codeMode === 'stack' ? 'push / pop с вершины' : 'корзины Map ≈ O(1)'}
          </p>
        </div>
        {codeMode === 'stack' ? (
          <StackViz stack={['{', '[', '(']} cursor=")" action="пример: сейчас pop ↔ )" status="run" />
        ) : (
          <HashViz
            nums={DEMO_NUMS}
            frame={{
              index: 1,
              mapEntries: [[2, 0]],
              need: 2,
              hitKey: 2,
              action: 'nums[1]=7 · need 2 — hit',
              status: 'ok',
            }}
          />
        )}
      </div>

      <InteractiveCodePanel
        key={codeMode}
        topicId={TOPIC_ID}
        intro={
          codeMode === 'stack'
            ? 'Стек — LIFO. Сниппеты: скобки и отличие от очереди.'
            : '`Map` — ключ→значение. Сниппеты: two-sum и частоты.'
        }
        snippets={codeMode === 'stack' ? stackSnippets : hashSnippets}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Стек и Hash-map в деле"
      lead="На схеме — стопка скобок (LIFO) и наполнение Map в two-sum; в «Код» — тот же переключатель сущностей."
      problem={problem}
      code={code}
    />
  )
}
