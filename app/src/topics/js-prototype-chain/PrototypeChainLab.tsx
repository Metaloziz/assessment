import { useMemo, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function PrototypeChainLab() {
  const { lines, log, clear } = useLabLog()
  const [ownColor, setOwnColor] = useState('')

  const proto = useMemo(() => ({ color: 'green', kind: 'shape' }), [])
  const obj = useMemo(() => Object.create(proto) as { color?: string; kind?: string }, [proto])

  const refresh = () => {
    if (ownColor) obj.color = ownColor
    else delete obj.color
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        У объекта нет своего <code>color</code>, но в UI цвет есть — он пришёл с прототипа. Нужно
        понять, своё это свойство или унаследованное.
      </p>
      <ol className={shell.steps}>
        <li>Прочитайте <code>obj.color</code> — значение с прототипа.</li>
        <li>Проверьте <code>hasOwnProperty</code> / <code>Object.hasOwn</code>.</li>
        <li>Запишите своё свойство — оно заслонит прототип.</li>
      </ol>
      <div className={shell.row}>
        <LabButton
          variant="primary"
          onClick={() => {
            refresh()
            log('ok', `obj.color=${String(obj.color)}, own=${Object.hasOwn(obj, 'color')}, proto=${proto.color}`)
          }}
        >
          Проверить цепочку
        </LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <div className={shell.field}>
        <span>Свой color (пусто = только прототип)</span>
        <input value={ownColor} onChange={(e) => setOwnColor(e.target.value)} placeholder="например red" />
      </div>
      <div className={shell.row}>
        <span className={shell.badge} style={{ background: obj.color ?? proto.color, color: '#111' }}>
          {obj.color ?? proto.color}
        </span>
        <LabButton
          onClick={() => {
            refresh()
            log('info', `read color → ${obj.color}`)
          }}
        >
          Прочитать
        </LabButton>
        <LabButton
          onClick={() => {
            let p: object | null = obj
            const chain: string[] = []
            while (p) {
              chain.push(Object.prototype.toString.call(p))
              p = Object.getPrototypeOf(p)
            }
            log('info', chain.join(' → '))
          }}
        >
          Показать цепочку
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
          label: 'Поиск по прототипу',
          code: `const proto = { color: 'green' };
const obj = Object.create(proto);
obj.color; // 'green'
Object.hasOwn(obj, 'color'); // false`,
        },
        {
          label: 'Своё свойство перекрывает',
          code: `obj.color = 'red';
obj.color; // 'red' — уже own`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Цвет не на объекте"
      lead="Если свойства нет у объекта, JavaScript идёт по цепочке прототипов."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
