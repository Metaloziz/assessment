import { useState, type MouseEvent } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function EventDelegationLab() {
  const { lines, log, clear } = useLabLog()
  const [items, setItems] = useState(['Купить хлеб', 'Оплатить счёт', 'Позвонить'])

  const onListClick = (e: MouseEvent<HTMLUListElement>) => {
    const btn = (e.target as HTMLElement).closest('button[data-action]')
    if (!btn || !e.currentTarget.contains(btn)) return
    const action = btn.getAttribute('data-action')
    const id = btn.getAttribute('data-id')
    if (action === 'done' && id != null) {
      log('ok', `готово: «${items[Number(id)]}» (один слушатель на список)`)
      setItems((prev) => prev.filter((_, i) => i !== Number(id)))
    }
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        В списке задач кнопки появляются и исчезают. Вешать слушатель на каждую — муторно. Один
        слушатель на список должен ловить клики по новым кнопкам.
      </p>
      <ol className={shell.steps}>
        <li>Поставьте обработчик на контейнер.</li>
        <li>Через <code>closest</code> найдите кнопку.</li>
        <li>Добавьте пункт — он тоже должен работать.</li>
      </ol>
      <ul className={shell.list} onClick={onListClick}>
        {items.map((text, i) => (
          <li key={`${text}-${i}`} className={shell.listItem}>
            <span>{text}</span>
            <button type="button" className={shell.btn} data-action="done" data-id={String(i)}>
              Готово
            </button>
          </li>
        ))}
      </ul>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btnPrimary}
          onClick={() => setItems((prev) => [...prev, `Новая задача ${prev.length + 1}`])}
        >
          Добавить задачу
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>Кликайте по кнопкам и смотрите, что в логе — target vs closest.</p>
      <ul className={shell.list} onClick={onListClick}>
        {items.map((text, i) => (
          <li key={`s-${text}-${i}`} className={shell.listItem}>
            <span>
              {text} <small>(иконка →)</small>
            </span>
            <button type="button" className={shell.btn} data-action="done" data-id={String(i)}>
              ✓
            </button>
          </li>
        ))}
      </ul>
      <div className={shell.row}>
        <button type="button" className={shell.btn} onClick={() => setItems(['A', 'B', 'C'])}>
          Сбросить список
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
          label: 'Один слушатель',
          code: `list.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn || !list.contains(btn)) return;
  // обработка
});`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Один слушатель на весь список"
      lead="Делегирование: обработчик на предке ловит всплытие от потомков."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
