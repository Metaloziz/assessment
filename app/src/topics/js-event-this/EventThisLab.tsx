import { useEffect, useRef } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

function useClickCompare(
  fnRef: React.RefObject<HTMLButtonElement | null>,
  arrowRef: React.RefObject<HTMLButtonElement | null>,
  log: (kind: 'ok' | 'err' | 'info', text: string) => void,
) {
  useEffect(() => {
    const box = fnRef.current
    const arrowBtn = arrowRef.current
    if (!box || !arrowBtn) return

    const normal = function (this: HTMLElement, e: Event) {
      const ev = e as MouseEvent
      log(
        'ok',
        `function: this=${this.id}, currentTarget=${(ev.currentTarget as HTMLElement).id}, target=${(ev.target as HTMLElement).id}`,
      )
    }
    const arrow = (e: Event) => {
      const ev = e as MouseEvent
      log(
        'info',
        `arrow: берите currentTarget=${(ev.currentTarget as HTMLElement).id} (лексический this ≠ кнопка)`,
      )
    }
    box.addEventListener('click', normal)
    arrowBtn.addEventListener('click', arrow)
    return () => {
      box.removeEventListener('click', normal)
      arrowBtn.removeEventListener('click', arrow)
    }
  }, [fnRef, arrowRef, log])
}

export function EventThisLab() {
  const { lines, log, clear } = useLabLog()
  const pFn = useRef<HTMLButtonElement>(null)
  const pArrow = useRef<HTMLButtonElement>(null)
  const sFn = useRef<HTMLButtonElement>(null)
  const sArrow = useRef<HTMLButtonElement>(null)
  useClickCompare(pFn, pArrow, log)
  useClickCompare(sFn, sArrow, log)

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        В обработчике ждали <code>this === кнопка</code>, повесили стрелку — контекст «не тот».
      </p>
      <ol className={shell.steps}>
        <li>Кликните обычную функцию — <code>this</code> совпадёт с currentTarget.</li>
        <li>Кликните стрелку — элемент берите из <code>event.currentTarget</code>.</li>
      </ol>
      <div className={shell.row}>
        <button type="button" id="p-btn-fn" className={shell.btnPrimary} ref={pFn}>
          Обычная function
        </button>
        <button type="button" id="p-btn-arrow" className={shell.btn} ref={pArrow}>
          Стрелка
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>Сравните this / currentTarget / target ещё раз.</p>
      <div className={shell.row}>
        <button type="button" id="s-btn-fn" className={shell.btnPrimary} ref={sFn}>
          Обычная function
        </button>
        <button type="button" id="s-btn-arrow" className={shell.btn} ref={sArrow}>
          Стрелка
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
          label: 'Обычная функция',
          code: `el.addEventListener('click', function () {
  console.log(this === el); // true
});`,
        },
        {
          label: 'Стрелка',
          code: `el.addEventListener('click', (e) => {
  console.log(e.currentTarget); // элемент
});`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="this в обработчике клика"
      lead="У function в addEventListener this = currentTarget; у стрелки — лексический this."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
