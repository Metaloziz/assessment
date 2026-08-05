import { useEffect, useRef, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function MutationObserverLab() {
  const { lines, log, clear } = useLabLog()
  const boxRef = useRef<HTMLDivElement>(null)
  const [watching, setWatching] = useState(false)
  const observerRef = useRef<MutationObserver | null>(null)

  useEffect(() => {
    return () => observerRef.current?.disconnect()
  }, [])

  const start = () => {
    const box = boxRef.current
    if (!box) return
    observerRef.current?.disconnect()
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        log('ok', `${r.type}: added=${r.addedNodes.length}, removed=${r.removedNodes.length}`)
      }
    })
    obs.observe(box, { childList: true, subtree: true })
    observerRef.current = obs
    setWatching(true)
    log('info', 'observe(childList) включён')
  }

  const stop = () => {
    observerRef.current?.disconnect()
    observerRef.current = null
    setWatching(false)
    log('info', 'disconnect()')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Виджет дорисовывает пункты в список. Постоянно опрашивать DOM нельзя — нужно узнать, когда
        узлы реально добавили.
      </p>
      <ol className={shell.steps}>
        <li>Включите наблюдение за контейнером.</li>
        <li>Добавьте или удалите дочерний узел.</li>
        <li>Смотрите пачку записей в логе (не на каждый кадр опрос).</li>
      </ol>
      <div className={shell.stage} ref={boxRef}>
        <em>контейнер</em>
      </div>
      <div className={shell.row}>
        <button type="button" className={shell.btnPrimary} onClick={start} disabled={watching}>
          Смотреть DOM
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const el = document.createElement('div')
            el.textContent = `item ${boxRef.current?.children.length ?? 0}`
            boxRef.current?.appendChild(el)
          }}
        >
          Добавить узел
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => boxRef.current?.lastElementChild?.remove()}
        >
          Удалить последний
        </button>
        <button type="button" className={shell.btn} onClick={stop}>
          Стоп
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>
        {watching ? 'Наблюдение активно' : 'Сначала включите observe на вкладке «Решение» или здесь'}
      </p>
      <div className={shell.row}>
        <button type="button" className={shell.btn} onClick={start}>
          observe
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            boxRef.current?.setAttribute('data-v', String(Date.now()))
            log('info', 'атрибут изменён — увидите только если observe({ attributes: true })')
          }}
        >
          Сменить атрибут
        </button>
        <button type="button" className={shell.btn} onClick={clear}>
          Очистить лог
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      snippets={[
        {
          label: 'observe',
          code: `const obs = new MutationObserver((records) => { ... });
obs.observe(root, { childList: true, subtree: true });
obs.disconnect();`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="DOM изменился — без опроса"
      lead="MutationObserver асинхронно отдаёт пачки изменений DOM."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
