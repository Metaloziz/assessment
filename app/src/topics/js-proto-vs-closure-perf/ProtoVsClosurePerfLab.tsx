import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '117-js-proto-vs-closure-perf'

class ProtoCounter {
  #value = 0
  increment() {
    return ++this.#value
  }
}

function ClosureCounter() {
  let value = 0
  return {
    increment: () => ++value,
  }
}

export function ProtoVsClosurePerfLab() {
  const { lines, log, clear } = useLabLog()
  const [protoFns, setProtoFns] = useState(0)
  const [closureFns, setClosureFns] = useState(0)

  const makeMany = (kind: 'proto' | 'closure') => {
    const n = 3000
    if (kind === 'proto') {
      const arr = Array.from({ length: n }, () => new ProtoCounter())
      const sample = arr[0].increment
      const same = arr.every((c) => c.increment === sample)
      setProtoFns(same ? 1 : n)
      log('ok', `${n} ProtoCounter: increment одна функция на всех? ${same}`)
      log('info', `sample() → ${arr[0].increment()}, ${arr[1].increment()}`)
    } else {
      const arr = Array.from({ length: n }, () => ClosureCounter())
      const unique = new Set(arr.map((c) => c.increment))
      setClosureFns(unique.size)
      log('err', `${n} ClosureCounter: уникальных increment = ${unique.size}`)
      log('info', `sample() → ${arr[0].increment()}, ${arr[1].increment()}`)
    }
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Тысячи счётчиков: если каждый несёт свою функцию-замыкание — размножаем функции в heap. Метод
        на прототипе один. Сравним «сколько разных increment» получили.
      </p>
      <ol className={shell.steps}>
        <li>Прототип + <code>#value</code> — одна функция, приватное состояние.</li>
        <li>Замыкание в фабрике — новая функция на экземпляр.</li>
        <li>Скорость вызова меряют профилем; здесь смотрим модель памяти функций.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={() => makeMany('proto')}>
          3000× прототип
        </LabButton>
        <LabButton variant="secondary" onClick={() => makeMany('closure')}>
          3000× замыкание
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <p className={shell.hint}>
        Уникальных increment: proto≈<code>{protoFns || '—'}</code>, closure≈
        <code>{closureFns || '—'}</code>
      </p>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Сравните shared method и per-instance closure. `#private` часто заменяет замыкание для состояния."
      snippets={[
        {
          id: 'proto',
          label: 'Метод на прототипе',
          code: `class ProtoCounter {
  #value = 0;
  increment() {
    return ++this.#value;
  }
}

const a = new ProtoCounter();
const b = new ProtoCounter();
console.log(a.increment === b.increment); // true — одна функция
console.log(a.increment(), b.increment());`,
        },
        {
          id: 'closure',
          label: 'Функция на экземпляр',
          code: `function ClosureCounter() {
  let value = 0;
  return {
    increment: () => ++value,
  };
}

const a = ClosureCounter();
const b = ClosureCounter();
console.log(a.increment === b.increment); // false
console.log(a.increment(), b.increment());`,
        },
        {
          id: 'leak',
          label: 'Замыкание держит данные',
          code: `function makeHandler(huge) {
  return () => huge.length; // держит huge, пока жив handler
}

const huge = new Array(10_000).fill(0);
const handler = makeHandler(huge);
console.log(handler());
console.log('пока handler достижим — huge тоже');`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Одна функция на всех — или по функции на каждый new"
      lead="Прототип экономит память на методах; замыкание даёт лексическую приватность ценой N функций."
      problem={problem}
      code={code}
    />
  )
}
