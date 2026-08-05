import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function ArrowSyntaxLab() {
  const { lines, log, clear } = useLabLog()
  const [name, setName] = useState('Anna')

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Хотели вернуть объект из стрелки <code>() =&gt; {'{ name }'}</code> — получили{' '}
        <code>undefined</code>. Нужна обёртка в скобки.
      </p>
      <ol className={shell.steps}>
        <li>Покажите «сломанный» неявный return с фигурными скобками.</li>
        <li>Почините: <code>() =&gt; ({'{ name }'})</code>.</li>
        <li>Сравните с блоком и явным <code>return</code>.</li>
      </ol>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const broken = () => {
              // выглядит как объект, но это блок
              name
            }
            log('err', `() => { name } → ${String(broken())}`)
          }}
        >
          Сломанный return объекта
        </button>
        <button
          type="button"
          className={shell.btnPrimary}
          onClick={() => {
            const ok = () => ({ name })
            log('ok', `() => ({ name }) → ${JSON.stringify(ok())}`)
          }}
        >
          Правильно со скобками
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <div className={shell.field}>
        <span>name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => log('info', `x => x*2 → ${(x => x * 2)(21)}`)}
        >
          Короткий return
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const f = (n: string) => {
              return n.toUpperCase()
            }
            log('info', `блок + return → ${f(name)}`)
          }}
        >
          Блок + return
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
          label: 'Вернуть объект',
          code: `const broken = () => { name }; // undefined
const ok = () => ({ name });`,
        },
        {
          label: 'Формы',
          code: `n => n * 2
(n) => { return n * 2 }`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Стрелка вернула undefined"
      lead="Фигурные скобки у стрелки — блок; объект нужно обернуть в ()."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
