import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function NullPrototypeLab() {
  const { lines, log, clear } = useLabLog()
  const [key, setKey] = useState('toString')

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Словарь настроек: ключ пользователя совпал с <code>toString</code> — обычный объект врёт,
        будто значение уже есть (это метод с прототипа).
      </p>
      <ol className={shell.steps}>
        <li>Проверьте ключ на <code>{'{}'}</code>.</li>
        <li>Создайте словарь через <code>Object.create(null)</code>.</li>
        <li>Сравните <code>key in map</code> / чтение.</li>
      </ol>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const plain: Record<string, unknown> = {}
            log(
              'err',
              `{}: key="${key}" in obj → ${key in plain}, typeof obj[key]=${typeof plain[key]}`,
            )
          }}
        >
          Обычный объект
        </button>
        <button
          type="button"
          className={shell.btnPrimary}
          onClick={() => {
            const dict = Object.create(null) as Record<string, unknown>
            log(
              'ok',
              `null-proto: key="${key}" in dict → ${key in dict}, typeof=${typeof dict[key]}`,
            )
          }}
        >
          Object.create(null)
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <div className={shell.field}>
        <span>ключ</span>
        <input value={key} onChange={(e) => setKey(e.target.value)} />
      </div>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const dict = Object.create(null) as Record<string, string>
            dict[key] = 'user-value'
            log('info', `записали dict[${key}]=${dict[key]}`)
          }}
        >
          Записать в null-proto
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const dict = Object.create(null)
            log('info', `getPrototypeOf → ${Object.getPrototypeOf(dict)}`)
          }}
        >
          getPrototypeOf
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
          label: 'Словарь без прототипа',
          code: `const dict = Object.create(null);
'toString' in dict; // false
dict.toString = 'ok'; // своё значение`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Ключ столкнулся с toString"
      lead="Object.create(null) — карта без унаследованных свойств."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
