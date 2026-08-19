import { useMemo, useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { LabVizPanel } from '../../components/lab/LabViz'
import { useLabLog } from '../../components/lab/useLabLog'
import styles from './LiveCollectionsLab.module.css'

const TOPIC_ID = '98-js-live-collections'

type CaseId = 'live' | 'safe-remove' | 'array'

type Task = {
  id: string
  title: string
  done: boolean
}

const INITIAL_TASKS: Task[] = [
  { id: 'draft', title: 'Черновик письма', done: false },
  { id: 'upload', title: 'Загрузить отчёт', done: true },
  { id: 'review', title: 'Проверить комментарии', done: false },
  { id: 'archive', title: 'Архив за июль', done: true },
]

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'live', label: 'Живая длина' },
  { id: 'safe-remove', label: 'Безопасный обход' },
  { id: 'array', label: 'Преобразовать в массив' },
]

const PAIN = (
  <>
    DOM-коллекция выглядит как массив, но ведёт себя по своим правилам. Ошибки начинаются в момент,
    когда мы одновременно меняем DOM, обходим живой список и ждём от него методов вроде{' '}
    <code>map()</code>.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  live: (
    <>
      Одна и та же <code>HTMLCollection</code> сразу видит новую карточку после вставки в DOM.
    </>
  ),
  'safe-remove': (
    <>
      Сначала делаем снимок через <code>Array.from()</code>, потом спокойно удаляем завершённые узлы.
    </>
  ),
  array: (
    <>
      После преобразования в массив можно запустить <code>map()</code> и получить список текстов.
    </>
  ),
}

const CASE_HINT: Record<CaseId, string> = {
  live: 'живая коллекция читает текущее дерево DOM, а не старый снимок',
  'safe-remove': 'снимок массива не перескакивает по индексам во время remove',
  array: 'после Array.from доступна вся цепочка методов массива',
}

const CODE_INTRO: Record<CaseId, string> = {
  live: 'Живая длина: `getElementsByClassName()` держит ссылку на текущее дерево DOM.',
  'safe-remove':
    'Безопасное удаление: `Array.from(liveCollection)` даёт снимок, по которому удобно мутировать DOM.',
  array:
    'Преобразование в массив: `querySelectorAll()` или `children` превращаем в `Array`, затем делаем `map()` и `filter()`.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  live: [
    {
      id: 'toolbar-host',
      label: 'src/toolbar/registerActions.ts',
      note: '`HTMLCollection` остаётся живой ссылкой: после `append()` длина уже новая.',
      executable: false,
      languageLabel: 'ts',
      code: `export function registerActions(toolbar: HTMLElement) {
  const items = toolbar.getElementsByClassName('action'); // ← LIVE HTMLCollection

  const addButton = toolbar.querySelector('[data-add="true"]');
  addButton?.addEventListener('click', () => {
    const el = document.createElement('button');
    el.className = 'action';
    el.textContent = 'Новая кнопка';
    toolbar.append(el);

    console.log(items.length); // ← уже новое значение
  });
}`,
    },
    {
      id: 'toolbar-view',
      label: 'src/toolbar/Toolbar.tsx',
      note: '`children` тоже живая коллекция прямых потомков контейнера.',
      executable: false,
      languageLabel: 'tsx',
      code: `type Props = { hostRef: React.RefObject<HTMLDivElement | null> };

export const Toolbar = ({ hostRef }: Props) => (
  <div ref={hostRef} className="toolbar">
    <button className="action">Сохранить</button>
    <button className="action">Поделиться</button>
    <button data-add="true">Добавить</button> {/* ← меняет DOM */}
  </div>
);`,
    },
  ],
  'safe-remove': [
    {
      id: 'cleanup-done',
      label: 'src/tasks/cleanupDone.ts',
      note: 'Снимок массива защищает обход от сдвига индексов в живой коллекции.',
      executable: false,
      languageLabel: 'ts',
      code: `export function cleanupDone(list: HTMLElement) {
  const live = list.getElementsByClassName('task'); // ← LIVE

  Array.from(live).forEach((item) => {
    if (item instanceof HTMLElement && item.dataset.done === 'true') {
      item.remove(); // ← DOM меняется, но массив уже стабилен
    }
  });
}`,
    },
    {
      id: 'task-item',
      label: 'src/tasks/renderTask.ts',
      note: 'Флаг в `data-done` удобно читать и в DOM, и при фильтрации массива.',
      executable: false,
      languageLabel: 'ts',
      code: `export function renderTask(title: string, done: boolean) {
  const item = document.createElement('li');
  item.className = 'task';
  item.dataset.done = String(done); // ← источник для cleanup
  item.textContent = title;
  return item;
}`,
    },
  ],
  array: [
    {
      id: 'extract-labels',
      label: 'src/tasks/extractVisibleTitles.ts',
      note: '`Array.from()` даёт массив, после чего доступны `map()` и `filter()`.',
      executable: false,
      languageLabel: 'ts',
      code: `export function extractVisibleTitles(root: HTMLElement) {
  return Array.from(root.querySelectorAll('.task'))
    .map((node) => node.textContent?.trim() ?? '') // ← MAP
    .filter(Boolean); // ← FILTER
}`,
    },
    {
      id: 'list-view',
      label: 'src/tasks/TaskList.tsx',
      note: '`querySelectorAll()` удобен для стабильного снимка; дальше работаем уже как с массивом.',
      executable: false,
      languageLabel: 'tsx',
      code: `export const TaskList = () => (
  <ul className="tasks">
    <li className="task">Черновик письма</li>
    <li className="task">Загрузить отчёт</li>
    <li className="task">Проверить комментарии</li>
  </ul>
);`,
    },
  ],
}

const buildSnapshot = (tasks: Task[]) =>
  tasks.map((task) => ({ ...task, subtitle: task.done ? 'готово' : 'в работе' }))

const CaseSwitch = ({
  value,
  disabled,
  onChange,
}: {
  value: CaseId
  disabled: boolean
  onChange: (id: CaseId) => void
}) => (
  <div className={shell.row}>
    {CASES.map((item) => (
      <LabButton
        key={item.id}
        variant="ghost"
        size="sm"
        active={value === item.id}
        disabled={disabled}
        onClick={() => onChange(item.id)}
      >
        {item.label}
      </LabButton>
    ))}
  </div>
)

const LiveCollectionsViz = ({
  tasks,
  highlightedId,
  liveLength,
  staticLength,
  arrayResult,
  caseId,
}: {
  tasks: Task[]
  highlightedId: string | null
  liveLength: number | null
  staticLength: number | null
  arrayResult: string[]
  caseId: CaseId
}) => {
  const meta =
    caseId === 'live'
      ? 'HTMLCollection live'
      : caseId === 'safe-remove'
        ? 'Array.from before remove'
        : 'Array snapshot + map'

  return (
    <LabVizPanel title="Список задач" meta={meta}>
      <div className={styles.scene}>
        <section className={styles.listCard}>
          <div className={styles.cardHead}>
            <strong>DOM</strong>
            <span>{tasks.length} узла(ов) в списке</span>
          </div>

          <div className={styles.todoList}>
            {tasks.map((task, index) => {
              const isActive = highlightedId === task.id
              const isMuted = highlightedId !== null && highlightedId !== task.id
              return (
                <div
                  key={task.id}
                  className={[
                    styles.todoItem,
                    isActive ? styles.todoItemActive : '',
                    isMuted ? styles.todoItemMuted : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.badge}>{index}</span>
                  <div className={styles.label}>
                    <strong>{task.title}</strong>
                    <span>{task.done ? 'готово' : 'нужно сделать'}</span>
                  </div>
                  <span className={styles.doneMark}>{task.done ? 'done' : 'todo'}</span>
                </div>
              )
            })}
          </div>
        </section>

        <aside className={styles.inspectCard}>
          <div className={styles.cardHead}>
            <strong>Inspect</strong>
            <span>что хранит переменная</span>
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <span>live.length</span>
              <code>{liveLength ?? '—'}</code>
            </div>

            <div className={styles.metric}>
              <span>static.length</span>
              <code>{staticLength ?? '—'}</code>
            </div>

            <div className={styles.metric}>
              <span>Array result</span>
              <div className={styles.chips}>
                {arrayResult.length ? (
                  arrayResult.map((item) => (
                    <span
                      key={item}
                      className={[
                        styles.chip,
                        caseId === 'array' || caseId === 'safe-remove' ? styles.chipAccent : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <code>—</code>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </LabVizPanel>
  )
}

export const LiveCollectionsLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('live')
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [liveLength, setLiveLength] = useState<number | null>(INITIAL_TASKS.length)
  const [staticLength, setStaticLength] = useState<number | null>(INITIAL_TASKS.length)
  const [arrayResult, setArrayResult] = useState<string[]>([])
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)

  const domSnapshot = useMemo(() => buildSnapshot(tasks), [tasks])

  const resetViz = (nextTasks = INITIAL_TASKS) => {
    setTasks(nextTasks)
    setLiveLength(nextTasks.length)
    setStaticLength(nextTasks.length)
    setArrayResult([])
    setHighlightedId(null)
    setHint(null)
  }

  const selectCase = (next: CaseId) => {
    clear()
    setCaseId(next)
    resetViz()
  }

  const run = () => {
    clear()
    const source = INITIAL_TASKS
    const host = hostRef.current

    const liveCollection = host?.children
    const liveBefore = liveCollection?.length ?? source.length
    const staticBefore = host?.querySelectorAll('[data-task-card="true"]').length ?? source.length

    if (caseId === 'live') {
      const nextTask: Task = { id: 'invoice', title: 'Подписать акт', done: false }
      const nextTasks = [...source, nextTask]
      setTasks(nextTasks)
      setHighlightedId(nextTask.id)
      setArrayResult([])
      setLiveLength(nextTasks.length)
      setStaticLength(staticBefore)
      setHint(CASE_HINT.live)
      log('info', `до вставки: live=${liveBefore}, static=${staticBefore}`)
      log('ok', `после append: live=${nextTasks.length}, static=${staticBefore}`)
      return
    }

    if (caseId === 'safe-remove') {
      const doneIds = source.filter((task) => task.done).map((task) => task.id)
      const safeArray = Array.from(source)
      const nextTasks = safeArray.filter((task) => !task.done)
      setTasks(nextTasks)
      setHighlightedId(doneIds[0] ?? null)
      setArrayResult(doneIds)
      setLiveLength(nextTasks.length)
      setStaticLength(staticBefore)
      setHint(CASE_HINT['safe-remove'])
      log('info', `снимок для обхода: ${doneIds.join(', ')}`)
      log('ok', `удалили done-элементы: live=${nextTasks.length}, static=${staticBefore}`)
      return
    }

    const titles = Array.from(source)
      .map((task) => task.title.toUpperCase())
      .filter(Boolean)
    setTasks(source)
    setHighlightedId(source[0]?.id ?? null)
    setArrayResult(titles)
    setLiveLength(liveBefore)
    setStaticLength(staticBefore)
    setHint(CASE_HINT.array)
    log('info', 'DOM-коллекция не умеет map напрямую')
    log('ok', `Array.from(...) → ${titles.join(' | ')}`)
  }

  const reset = () => {
    clear()
    setCaseId('live')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} disabled={false} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <div ref={hostRef} hidden aria-hidden="true">
        {domSnapshot.map((task) => (
          <div key={task.id} data-task-card="true" data-done={String(task.done)}>
            {task.title}
          </div>
        ))}
      </div>

      <LiveCollectionsViz
        tasks={tasks}
        highlightedId={highlightedId}
        liveLength={liveLength}
        staticLength={staticLength}
        arrayResult={arrayResult}
        caseId={caseId}
      />

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <CaseSwitch value={caseId} disabled={false} onChange={selectCase} />
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Живые коллекции и массив"
      lead="Живой DOM-стенд: `HTMLCollection` меняется вместе с деревом, а `Array.from()` даёт безопасный снимок для обработки."
      problem={problem}
      code={code}
    />
  )
}
