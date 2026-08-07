import { useMemo, useState } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '126-redux-feature-first-ducks'

type Todo = { id: number; text: string; done: boolean }

/** Классический ducks: default reducer + named action creators. */
const ADD_TODO = 'ADD_TODO'
const TOGGLE_TODO = 'TOGGLE_TODO'

type DucksAction =
  | { type: typeof ADD_TODO; payload: string }
  | { type: typeof TOGGLE_TODO; payload: number }

function ducksReducer(state: Todo[] = [], action: DucksAction | { type: string }): Todo[] {
  switch (action.type) {
    case ADD_TODO:
      return [
        ...state,
        { id: Date.now(), text: (action as { payload: string }).payload, done: false },
      ]
    case TOGGLE_TODO:
      return state.map((t) =>
        t.id === (action as { payload: number }).payload ? { ...t, done: !t.done } : t,
      )
    default:
      return state
  }
}

export function addTodoDuck(text: string): DucksAction {
  return { type: ADD_TODO, payload: text }
}

export function toggleTodoDuck(id: number): DucksAction {
  return { type: TOGGLE_TODO, payload: id }
}

/** RTK createSlice = ducks «на стероидах». */
const todosSlice = createSlice({
  name: 'todos',
  initialState: [] as Todo[],
  reducers: {
    addTodo(state, action: PayloadAction<string>) {
      state.push({ id: Date.now(), text: action.payload, done: false })
    },
    toggleTodo(state, action: PayloadAction<number>) {
      const todo = state.find((t) => t.id === action.payload)
      if (todo) todo.done = !todo.done
    },
  },
})

const { addTodo, toggleTodo } = todosSlice.actions

type LayoutMode = 'type-based' | 'feature-first'

const TYPE_BASED_FILES = [
  'actions/todos.ts',
  'reducers/todos.ts',
  'constants/todos.ts',
  'components/TodoList.tsx',
] as const

const FEATURE_FILES = [
  'features/todos/todosSlice.ts',
  'features/todos/TodoList.tsx',
  'features/todos/selectors.ts',
] as const

function createLabStore() {
  return configureStore({
    reducer: {
      todos: todosSlice.reducer,
      ducks: ducksReducer,
    },
  })
}

type LabStore = ReturnType<typeof createLabStore>
type RootState = ReturnType<LabStore['getState']>
type AppDispatch = LabStore['dispatch']

function useAppDispatch() {
  return useDispatch<AppDispatch>()
}

function useAppSelector<T>(sel: (s: RootState) => T) {
  return useSelector(sel)
}

function FeatureProblem() {
  const { lines, log, clear } = useLabLog()
  const dispatch = useAppDispatch()
  const rtkTodos = useAppSelector((s) => s.todos)
  const duckTodos = useAppSelector((s) => s.ducks)
  const [layout, setLayout] = useState<LayoutMode>('type-based')
  const [opened, setOpened] = useState<string[]>([])
  const [text, setText] = useState('купить молоко')
  const [engine, setEngine] = useState<'ducks' | 'slice'>('slice')

  const files = layout === 'type-based' ? TYPE_BASED_FILES : FEATURE_FILES

  const openFile = (file: string) => {
    if (opened.includes(file)) return
    const next = [...opened, file]
    setOpened(next)
    log('info', `открыли ${file} (${next.length}/${files.length})`)
    if (next.length === files.length) {
      log(
        layout === 'type-based' ? 'err' : 'ok',
        layout === 'type-based'
          ? 'type-based: прыжки по 4 папкам ради одной фичи'
          : 'feature-first: всё рядом в features/todos/',
      )
    }
  }

  const add = () => {
    const value = text.trim()
    if (!value) {
      log('err', 'введите текст todo')
      return
    }
    if (engine === 'slice') {
      dispatch(addTodo(value))
      log('ok', `createSlice: dispatch(addTodo('${value}')) → type todos/addTodo`)
    } else {
      dispatch(addTodoDuck(value))
      log('ok', `ducks: dispatch(addTodoDuck('${value}')) → type ADD_TODO`)
    }
  }

  const list = engine === 'slice' ? rtkTodos : duckTodos

  return (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Нужно добавить поле в todos. В <code>type-based</code> структуре правите{' '}
        <code>actions/</code>, <code>reducers/</code>, <code>constants/</code> по отдельности.
        В <code>feature-first</code> / <code>ducks</code> / <code>createSlice</code> — код фичи
        лежит вместе.
      </p>
      <ol className={shell.steps}>
        <li>Сравните, сколько файлов открыть, чтобы «дотронуться» до фичи.</li>
        <li>
          Добавьте todo через классический <code>ducks</code> (default reducer + named creators).
        </li>
        <li>
          Или через <code>createSlice</code> — тот же ducks-паттерн с prefix и Immer.
        </li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant={layout === 'type-based' ? 'primary' : 'ghost'}
          size="sm"
          active={layout === 'type-based'}
          onClick={() => {
            setLayout('type-based')
            setOpened([])
            log('info', 'layout → type-based')
          }}
        >
          type-based
        </LabButton>
        <LabButton
          variant={layout === 'feature-first' ? 'primary' : 'ghost'}
          size="sm"
          active={layout === 'feature-first'}
          onClick={() => {
            setLayout('feature-first')
            setOpened([])
            log('info', 'layout → feature-first')
          }}
        >
          feature-first
        </LabButton>
      </div>

      <div className={shell.row}>
        {files.map((file) => (
          <LabButton
            key={file}
            variant={opened.includes(file) ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => openFile(file)}
          >
            {opened.includes(file) ? '✓ ' : ''}
            {file}
          </LabButton>
        ))}
        <LabButton
          variant="secondary"
          onClick={() => {
            setOpened([])
            log('info', 'сбросили открытые файлы')
          }}
        >
          Сбросить файлы
        </LabButton>
      </div>

      <p className={shell.hint}>
        Открыто: <code>{opened.length}</code> / <code>{files.length}</code> (
        {layout === 'type-based' ? 'разные папки' : 'одна feature-папка'})
      </p>

      <div className={shell.row}>
        <LabButton
          variant={engine === 'ducks' ? 'primary' : 'ghost'}
          size="sm"
          active={engine === 'ducks'}
          onClick={() => setEngine('ducks')}
        >
          ducks reducer
        </LabButton>
        <LabButton
          variant={engine === 'slice' ? 'primary' : 'ghost'}
          size="sm"
          active={engine === 'slice'}
          onClick={() => setEngine('slice')}
        >
          createSlice
        </LabButton>
      </div>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>todo</span>
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <LabButton variant="primary" onClick={add}>
          Добавить
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <ul className={shell.steps}>
        {list.length === 0 ? (
          <li>Список пуст — добавьте задачу.</li>
        ) : (
          list.map((t) => (
            <li key={t.id}>
              <LabButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (engine === 'slice') {
                    dispatch(toggleTodo(t.id))
                    log('ok', `toggleTodo(${t.id}) → todos/toggleTodo`)
                  } else {
                    dispatch(toggleTodoDuck(t.id))
                    log('ok', `toggleTodoDuck(${t.id}) → TOGGLE_TODO`)
                  }
                }}
              >
                {t.done ? '☑' : '☐'} {t.text}
              </LabButton>
            </li>
          ))
        )}
      </ul>

      <LabLogView lines={lines} />
    </div>
  )
}

export function ReduxFeatureFirstDucksLab() {
  const store = useMemo(() => createLabStore(), [])

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      languageLabel="typescript"
      intro="Эталоны структуры store на React + TypeScript. Живое сравнение и todos — во вкладке «Решение проблемы»."
      snippets={[
        {
          id: 'trees',
          label: 'type-based vs feature',
          executable: false,
          note: 'Официальный style guide Redux: feature folders или ducks, не папки по типу файла.',
          code: `// type-based (legacy) — правка фичи = 3–4 директории
// src/actions/todos.ts
// src/reducers/todos.ts
// src/constants/todos.ts
// src/components/TodoList.tsx

// feature-first
// src/features/todos/todosSlice.ts
// src/features/todos/TodoList.tsx
// src/features/todos/selectors.ts
// src/app/store.ts          // configureStore
// src/shared/ui/Button.tsx  // общее, не домен`,
        },
        {
          id: 'ducks',
          label: 'redux-ducks модуль',
          executable: false,
          note: 'Default export — reducer; named — action creators; types короткие и глобально уникальные.',
          code: `// features/todos/todos.duck.ts
const ADD_TODO = 'ADD_TODO';
const TOGGLE_TODO = 'TOGGLE_TODO';

export type Todo = { id: number; text: string; done: boolean };

type TodosAction =
  | { type: typeof ADD_TODO; payload: string }
  | { type: typeof TOGGLE_TODO; payload: number };

export default function todosReducer(
  state: Todo[] = [],
  action: TodosAction,
): Todo[] {
  switch (action.type) {
    case ADD_TODO:
      return [...state, { id: Date.now(), text: action.payload, done: false }];
    case TOGGLE_TODO:
      return state.map((t) =>
        t.id === action.payload ? { ...t, done: !t.done } : t,
      );
    default:
      return state;
  }
}

export function addTodo(text: string): TodosAction {
  return { type: ADD_TODO, payload: text };
}

export function toggleTodo(id: number): TodosAction {
  return { type: TOGGLE_TODO, payload: id };
}`,
        },
        {
          id: 'slice',
          label: 'createSlice = ducks+',
          executable: false,
          note: 'Автоprefix `todos/addTodo`, Immer, named exports actions + default reducer — эволюция ducks.',
          code: `import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type Todo = { id: number; text: string; done: boolean };

const todosSlice = createSlice({
  name: 'todos',
  initialState: [] as Todo[],
  reducers: {
    addTodo(state, action: PayloadAction<string>) {
      state.push({ id: Date.now(), text: action.payload, done: false });
    },
    toggleTodo(state, action: PayloadAction<number>) {
      const todo = state.find((t) => t.id === action.payload);
      if (todo) todo.done = !todo.done;
    },
  },
});

export const { addTodo, toggleTodo } = todosSlice.actions;
export default todosSlice.reducer;`,
        },
        {
          id: 'store',
          label: 'app/store.ts',
          executable: false,
          note: 'Фичи не знают друг о друге: root reducer собирается в `app/store`.',
          code: `import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import todosReducer from '../features/todos/todosSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    todos: todosReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Feature-first и ducks вместо папок actions/reducers"
      lead="React + TypeScript: код, который меняется вместе, лежит вместе. createSlice — ducks с Immer и auto types."
      problem={
        <Provider store={store}>
          <FeatureProblem />
        </Provider>
      }
      code={code}
    />
  )
}
