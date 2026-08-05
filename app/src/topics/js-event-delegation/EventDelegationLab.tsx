import { useState, type MouseEvent } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

type Task = { id: number; text: string }

const INITIAL: Task[] = [
  { id: 1, text: 'Купить хлеб' },
  { id: 2, text: 'Оплатить счёт' },
  { id: 3, text: 'Позвонить' },
]

export function EventDelegationLab() {
  const { lines, log, clear } = useLabLog(50)
  const [tasks, setTasks] = useState<Task[]>(INITIAL)
  const [nextId, setNextId] = useState(4)
  const [stopOnIcon, setStopOnIcon] = useState(false)
  const [mode, setMode] = useState<'delegate' | 'each'>('delegate')

  const removeTask = (id: number, via: string) => {
    setTasks((prev) => {
      const found = prev.find((t) => t.id === id)
      if (found) log('ok', `${via}: убрали «${found.text}» (id=${id})`)
      return prev.filter((t) => t.id !== id)
    })
  }

  const onDelegateClick = (e: MouseEvent<HTMLUListElement>) => {
    const list = e.currentTarget
    const target = e.target as HTMLElement

    if (stopOnIcon && target.dataset.role === 'icon') {
      e.stopPropagation()
      log('err', 'stopPropagation на иконке — делегирование выше не сработало')
      return
    }

    const button = target.closest('button[data-action="remove"]') as HTMLButtonElement | null
    if (!button || !list.contains(button)) {
      log('info', `клик мимо кнопки: target=<${target.tagName.toLowerCase()}>`)
      return
    }

    const row = button.closest('[data-task-id]') as HTMLElement | null
    const id = Number(row?.dataset.taskId)
    if (!Number.isFinite(id)) return

    log(
      'info',
      `target=<${target.tagName.toLowerCase()}${target.dataset.role ? ` data-role=${target.dataset.role}` : ''}> → closest(button) → task ${id}`,
    )
    removeTask(id, 'делегирование')
  }

  const addTask = () => {
    const id = nextId
    setNextId((n) => n + 1)
    setTasks((prev) => [...prev, { id, text: `Новая задача ${id}` }])
    log('info', `добавили задачу id=${id} — слушатель на списке уже есть`)
  }

  const taskList = (variant: 'problem' | 'sandbox') => (
    <ul
      className={shell.list}
      onClick={mode === 'delegate' ? onDelegateClick : undefined}
      data-lab={variant}
    >
      {tasks.map((task) => (
        <li key={`${variant}-${task.id}`} className={shell.listItem} data-task-id={String(task.id)}>
          <span>{task.text}</span>
          <button
            type="button"
            className={shell.btn}
            data-action="remove"
            onClick={
              mode === 'each'
                ? (ev) => {
                    ev.stopPropagation()
                    removeTask(task.id, 'свой слушатель')
                  }
                : undefined
            }
          >
            <span data-role="icon" aria-hidden>
              ✕
            </span>
            <span> Удалить</span>
          </button>
        </li>
      ))}
    </ul>
  )

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        В списке дел кнопки то появляются, то пропадают. Вешать клик на каждую — неудобно: забыли на
        новой — не работает. Один слушатель на весь список должен ловить и старые, и новые кнопки.
      </p>
      <ol className={shell.steps}>
        <li>Слушатель стоит на <code>&lt;ul&gt;</code>, не на каждой кнопке.</li>
        <li>
          Клик может попасть в иконку <code>✕</code> внутри кнопки — ищем кнопку через{' '}
          <code>closest</code>.
        </li>
        <li>Добавьте задачу и сразу удалите её тем же способом.</li>
      </ol>

      {taskList('problem')}

      <div className={shell.row}>
        <button type="button" className={shell.btnPrimary} onClick={addTask}>
          Добавить задачу
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            setTasks(INITIAL)
            setNextId(4)
            log('info', 'список сброшен')
          }}
        >
          Сбросить список
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>
        Сравните делегирование и «свой слушатель на кнопку». Включите stopPropagation на иконке —
        делегирование сломается.
      </p>

      <div className={shell.row}>
        <button
          type="button"
          className={mode === 'delegate' ? shell.btnPrimary : shell.btn}
          onClick={() => {
            setMode('delegate')
            log('info', 'режим: один слушатель на ul')
          }}
        >
          Режим: делегирование
        </button>
        <button
          type="button"
          className={mode === 'each' ? shell.btnPrimary : shell.btn}
          onClick={() => {
            setMode('each')
            log('info', 'режим: onClick на каждой кнопке')
          }}
        >
          Режим: на каждой кнопке
        </button>
      </div>

      <div className={shell.row}>
        <label className={shell.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
          <input
            type="checkbox"
            checked={stopOnIcon}
            onChange={(e) => setStopOnIcon(e.target.checked)}
            disabled={mode !== 'delegate'}
          />
          <span>stopPropagation на иконке ✕</span>
        </label>
      </div>

      {taskList('sandbox')}

      <div className={shell.row}>
        <button type="button" className={shell.btn} onClick={addTask}>
          Добавить
        </button>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            setTasks(INITIAL)
            setNextId(4)
          }}
        >
          Сбросить
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
      intro="Делегирование = всплытие + фильтр на предке. Новый потомок не требует нового addEventListener."
      snippets={[
        {
          label: 'Разметка списка',
          code: `<ul id="tasks">
  <li data-task-id="1">
    <button data-action="remove">
      <span data-role="icon">✕</span> Удалить
    </button>
  </li>
</ul>`,
        },
        {
          label: 'Один слушатель на контейнер',
          code: `const tasks = document.querySelector('#tasks');

tasks.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="remove"]');
  if (!button || !tasks.contains(button)) return;

  const row = button.closest('[data-task-id]');
  row?.remove();
});`,
        },
        {
          label: 'Почему нужен closest, а не ===',
          note: 'Клик по ✕ даёт target = span, не button.',
          code: `// плохо: сработает только если кликнули ровно в button
if (event.target.matches('[data-action="remove"]')) { ... }

// хорошо: поднимемся от span/текста до кнопки
const button = event.target.closest('[data-action="remove"]');`,
        },
        {
          label: 'Проверка принадлежности контейнеру',
          code: `if (!button || !tasks.contains(button)) return;
// иначе можно поймать кнопку из другого списка внутри tasks`,
        },
        {
          label: 'Ловушка: stopPropagation',
          code: `icon.addEventListener('click', (e) => {
  e.stopPropagation(); // клик не всплывёт к #tasks
});
// делегированный обработчик на ul молчит`,
        },
        {
          label: 'Альтернатива без делегирования',
          note: 'Для каждой новой кнопки нужен свой слушатель.',
          code: `function addTask(text) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.textContent = 'Удалить';
  btn.addEventListener('click', () => li.remove()); // снова и снова
  li.append(text, btn);
  tasks.append(li);
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Один слушатель на весь список"
      lead="Обработчик на предке ловит всплытие; closest находит кнопку даже если кликнули в иконку внутри."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
