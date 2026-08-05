import { useRef, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

type Timer = { id: number; label: string; stop: () => void }

export function BindCallApplyLab() {
  const { lines, log, clear } = useLabLog()
  const [label, setLabel] = useState('Таймер оплаты')
  const timerRef = useRef<Timer | null>(null)

  const api = {
    label,
    tick() {
      log('ok', `${this.label}: tick`)
    },
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Передали <code>api.tick</code> в <code>setInterval</code> — внутри <code>this</code> пропал,
        в логе ошибка или «undefined».
      </p>
      <ol className={shell.steps}>
        <li>Сломайте: передайте метод без привязки.</li>
        <li>Почините через <code>bind</code> или стрелку-обёртку.</li>
        <li>Сравните <code>call</code>/<code>apply</code> для разового вызова.</li>
      </ol>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const detached = api.tick
            try {
              detached()
            } catch (e) {
              log('err', e instanceof Error ? e.message : String(e))
            }
            log('info', 'метод оторван от api — this больше не таймер')
          }}
        >
          Сломать (потерять this)
        </button>
        <button
          type="button"
          className={shell.btnPrimary}
          onClick={() => {
            if (timerRef.current) timerRef.current.stop()
            const bound = api.tick.bind(api)
            const id = window.setInterval(() => bound(), 800)
            timerRef.current = {
              id,
              label: api.label,
              stop: () => clearInterval(id),
            }
            log('ok', `interval с bind(${api.label})`)
          }}
        >
          Починить bind + interval
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            timerRef.current?.stop()
            timerRef.current = null
            log('info', 'interval остановлен')
          }}
        >
          Стоп
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <div className={shell.field}>
        <span>label объекта</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className={shell.row}>
        <button type="button" className={shell.btn} onClick={() => api.tick.call({ label: 'call-other' })}>
          call(other)
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => api.tick.apply({ label: 'apply-other' })}
        >
          apply(other)
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const f = api.tick.bind({ label: 'bound-once' })
            f()
          }}
        >
          bind(once)
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
          label: 'bind закрепляет this',
          code: `const tick = api.tick.bind(api);
setInterval(tick, 1000);`,
        },
        {
          label: 'call / apply — сразу',
          code: `api.tick.call({ label: 'x' });
api.tick.apply({ label: 'y' });`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Метод потерял объект"
      lead="call/apply вызывают сразу с this, bind создаёт функцию с закреплённым контекстом."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
