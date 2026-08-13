import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function ScopeChainLab() {
  const { lines, log, clear } = useLabLog()
  const [globalX] = useState(1)

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Функция вернула «внутренний» колбэк. Вызвали его снаружи — ожидали глобальный{' '}
        <code>x = 1</code>, а получили <code>2</code> из родителя.
      </p>
      <ol className={shell.steps}>
        <li>Объявите внешнюю функцию с своим <code>x</code>.</li>
        <li>Внутренняя функция читает имя по цепочке областей.</li>
        <li>Место вызова не подменяет лексическую цепочку.</li>
      </ol>
      <div className={shell.row}>
        <LabButton
          variant="primary"
          onClick={() => {
            const x = 2
            const inner = () => x
            log('ok', `inner() снаружи → ${inner()} (глобальный был ${globalX})`)
          }}
        >
          Показать поиск по цепочке
        </LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>Сравните: свободная переменная из родителя vs параметр.</p>
      <div className={shell.row}>
        <LabButton
          onClick={() => {
            let outer = 'outer'
            function mid() {
              const midVal = 'mid'
              return function inner() {
                return `${outer} / ${midVal}`
              }
            }
            log('info', mid()())
          }}
        >
          outer → mid → inner
        </LabButton>
        <LabButton
          onClick={() => {
            const x = 'shadow'
            function f() {
              const x = 'local'
              return x
            }
            log('info', `shadowing → ${f()} (снаружи «${x}»)`)
          }}
        >
          Shadowing
        </LabButton>
        <LabButton onClick={clear}>Очистить</LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      snippets={[
        {
          label: 'Поиск имени изнутри наружу',
          code: `let x = 1;
function outer() {
  let x = 2;
  return function inner() { return x; };
}
outer()(); // 2`,
        },
        {
          label: 'Цепочка',
          code: `// inner → mid → outer → global
// первое найденное имя побеждает`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Где движок ищет переменную"
      lead="Имя ищут по лексической цепочке от текущего окружения наружу."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
