import { useEffect, useRef, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

function fillHost(host: HTMLDivElement | null, count = 3) {
  if (!host) return
  host.innerHTML = ''
  for (let i = 1; i <= count; i++) {
    const el = document.createElement('div')
    el.className = 'live-item'
    el.textContent = `Элемент ${i}`
    host.appendChild(el)
  }
}

export function LiveCollectionsLab() {
  const { lines, log, clear } = useLabLog()
  const problemHost = useRef<HTMLDivElement>(null)
  const sandboxHost = useRef<HTMLDivElement>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    fillHost(problemHost.current)
    fillHost(sandboxHost.current)
  }, [version])

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Сохранили список элементов в переменную, удалили узел — длина «старого» списка уже другая.
        С <code>querySelectorAll</code> так не бывает.
      </p>
      <ol className={shell.steps}>
        <li>Возьмите живую коллекцию и статичный NodeList.</li>
        <li>Удалите один элемент из DOM.</li>
        <li>Сравните <code>.length</code>.</li>
      </ol>
      <div className={shell.stage} ref={problemHost} />
      <div className={shell.row}>
        <LabButton
          variant="primary"
          onClick={() => {
            const host = problemHost.current
            if (!host) return
            const live = host.getElementsByClassName('live-item')
            const staticList = host.querySelectorAll('.live-item')
            const before = `live=${live.length}, static=${staticList.length}`
            live[0]?.remove()
            log('ok', `${before} → после remove: live=${live.length}, static=${staticList.length}`)
          }}
        >
          Удалить и сравнить
        </LabButton>
        <LabButton onClick={() => setVersion((v) => v + 1)}>Сбросить DOM</LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>Добавляйте узлы и смотрите живую коллекцию.</p>
      <div className={shell.stage} ref={sandboxHost} />
      <div className={shell.row}>
        <LabButton
          onClick={() => {
            const host = sandboxHost.current
            if (!host) return
            const el = document.createElement('div')
            el.className = 'live-item'
            el.textContent = `Элемент ${host.children.length + 1}`
            host.appendChild(el)
            log('info', `live.length=${host.getElementsByClassName('live-item').length}`)
          }}
        >
          Добавить
        </LabButton>
        <LabButton
          onClick={() => {
            const host = sandboxHost.current
            if (!host) return
            log(
              'info',
              `live=${host.getElementsByClassName('live-item').length}, children=${host.children.length}`,
            )
          }}
        >
          Длина
        </LabButton>
        <LabButton onClick={clear}>Очистить лог</LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      snippets={[
        {
          label: 'Живая vs статичная',
          code: `const live = root.getElementsByClassName('item');
const staticList = root.querySelectorAll('.item');
live[0].remove();
live.length; // меньше
staticList.length; // как была`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Список изменился сам"
      lead="HTMLCollection обычно живая; NodeList из querySelectorAll — снимок."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
