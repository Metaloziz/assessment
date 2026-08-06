import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '107-js-iife'

export function IifeLab() {
  const { lines, log, clear } = useLabLog()
  const [leaked, setLeaked] = useState<number | null>(null)
  const [privateCount, setPrivateCount] = useState<{
    inc: () => number
    value: () => number
  } | null>(null)

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Нужен счётчик кликов, но переменная <code>value</code> не должна торчать в глобальной
        области — иначе другой скрипт её затрёт. Спрячем состояние внутри сразу вызванной функции.
      </p>
      <ol className={shell.steps}>
        <li>Плохой путь: глобальный <code>let value</code> — любой код может его изменить.</li>
        <li>
          IIFE: объявили функцию-выражение и сразу вызвали — внутри свой <code>value</code>.
        </li>
        <li>Наружу вернули только методы; счётчик живёт в замыкании.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="secondary" onClick={() => {
            // имитация утечки в «глобаль»
            const g = window as unknown as { __labValue?: number }
            g.__labValue = (g.__labValue ?? 0) + 1
            setLeaked(g.__labValue)
            log('err', `глобальный value → ${g.__labValue} (любой скрипт может записать сюда)`)
          }}
        >
          Плохо: глобальный value++
        </LabButton>
        <LabButton variant="primary" onClick={() => {
            const api = (() => {
              let value = 0
              return {
                inc: () => ++value,
                value: () => value,
              }
            })()
            setPrivateCount(api)
            log('ok', `IIFE: создали API, снаружи value не видно; inc → ${api.inc()}`)
          }}
        >
          Хорошо: IIFE-счётчик
        </LabButton>
        <LabButton variant="secondary" disabled={!privateCount}
          onClick={() => {
            if (!privateCount) return
            log('ok', `inc → ${privateCount.inc()}, value() → ${privateCount.value()}`)
          }}
        >
          Ещё +1 через API
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      {leaked != null ? (
        <p className={shell.hint}>
          Сейчас на <code>window.__labValue</code> = {leaked}
        </p>
      ) : null}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Правите код — через ~0.4 с он выполнится; черновик пишется в `localStorage`. Сброс вернёт пример."
      snippets={[
        {
          id: 'counter',
          label: 'Счётчик в IIFE',
          code: `const counter = (() => {
  let value = 0;
  return {
    increment: () => ++value,
    getValue: () => value,
  };
})();

console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.getValue());  // 2
// value снаружи недоступен`,
        },
        {
          id: 'deps',
          label: 'Передача зависимостей',
          note: 'Раньше так явно передавали `window`/`jQuery` и упрощения для минификации.',
          code: `((global) => {
  const secret = 42;
  global.labAnswer = () => secret;
})(window);

console.log(typeof secret);      // undefined
console.log(window.labAnswer()); // 42`,
        },
        {
          id: 'parens',
          label: 'Зачем скобки',
          note: 'Без скобок `function` — declaration, а не выражение; `IIFE` не собрать.',
          code: `// Работает: function превратили в выражение
const result = (function () {
  return 'ok';
})();
console.log(result);

// То же со стрелкой:
console.log((() => 'also ok')());`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Счётчик без глобальной утечки"
      lead="IIFE создаёт область видимости и сразу выполняется — наружу отдаём только нужный API."
      problem={problem}
      code={code}
    />
  )
}
