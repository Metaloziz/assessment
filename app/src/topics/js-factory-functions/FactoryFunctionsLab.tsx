import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

function createUser(name: string) {
  let score = 0
  return {
    name,
    bump: () => ++score,
    getScore: () => score,
  }
}

export function FactoryFunctionsLab() {
  const { lines, log, clear } = useLabLog()
  const [users, setUsers] = useState(() => [createUser('Alice'), createUser('Bob')])

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Нужны два независимых профиля без <code>new</code> и классов — у каждого свой счётчик очков.
      </p>
      <ol className={shell.steps}>
        <li>Фабрика возвращает объект с методами.</li>
        <li>Состояние прячется в замыкании.</li>
        <li>Проверьте: bump у Alice не трогает Bob.</li>
      </ol>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btnPrimary}
          onClick={() => {
            const a = users[0].bump()
            log('ok', `${users[0].name}=${a}, ${users[1].name}=${users[1].getScore()}`)
          }}
        >
          Alice bump
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const b = users[1].bump()
            log('ok', `${users[1].name}=${b}, ${users[0].name}=${users[0].getScore()}`)
          }}
        >
          Bob bump
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const u = createUser(`User${users.length + 1}`)
            setUsers((prev) => [...prev, u])
            log('info', `создан ${u.name}`)
          }}
        >
          Новая фабрика
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() =>
            log(
              'info',
              users.map((u) => `${u.name}:${u.getScore()}`).join(', '),
            )
          }
        >
          Все scores
        </button>
        <button type="button" className={shell.btn} onClick={clear}>
          Очистить
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      snippets={[
        {
          label: 'Фабрика',
          code: `function createUser(name) {
  let score = 0;
  return {
    name,
    bump: () => ++score,
    getScore: () => score,
  };
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Два профиля без new"
      lead="Фабрика — обычная функция, которая возвращает готовый объект."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
