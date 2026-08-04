# 1. Тема

**Redux Toolkit (RTK) — официальный способ писать Redux**

---

# 2. Главное в одну фразу

Redux Toolkit сокращает boilerplate классического Redux через `configureStore`, `createSlice`, `createAsyncThunk` и встроенный Immer, сохраняя те же принципы одного store и предсказуемых обновлений.

---

# 3. Суть

> «**Redux Toolkit** — рекомендуемый официальный API для Redux: вместо ручной сборки store, switch-case reducer'ов и строковых констант action types используются высокоуровневые утилиты. **`configureStore`** настраивает store с DevTools, thunk-middleware и проверками на мутации. **`createSlice`** генерирует reducer и action creators из объекта `reducers` с «мутациями» через Immer — под капотом создаётся иммутабельный state. **`createAsyncThunk`** стандартизирует pending/fulfilled/rejected для async-операций. RTK не меняет архитектуру Redux — один store, actions → reducers — но убирает повторяющийся код и типичные ошибки (accidental mutation, забытый middleware).»

---

# 4. Самое главное запомнить

- RTK — **официальный** и рекомендуемый способ Redux с 2019 года.
- **`configureStore`** — store + DevTools + thunk + проверки из коробки.
- **`createSlice`** — имя, initialState, reducers → actions + reducer.
- **Immer** внутри `createSlice`: пишем «мутацию», получаем immutable update.
- **`createAsyncThunk`** — lifecycle async: `pending` / `fulfilled` / `rejected`.
- **`createSelector`** (reselect) — мемоизированные селекторы, часть RTK.
- Классический Redux без RTK сегодня — legacy или учебный контекст.

---

# 5. Описание

## Зачем RTK

Классический Redux требовал много повторяющегося кода:

```javascript
// Классика — вручную
const ADD_TODO = 'todos/ADD_TODO';
const addTodo = (text) => ({ type: ADD_TODO, payload: text });

function todosReducer(state = [], action) {
  switch (action.type) {
    case ADD_TODO:
      return [...state, { id: Date.now(), text: action.payload, done: false }];
    default:
      return state;
  }
}

import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
const store = createStore(todosReducer, applyMiddleware(thunk));
```

RTK сводит это к:

```javascript
import { configureStore, createSlice } from '@reduxjs/toolkit';

const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    addTodo: (state, action) => {
      state.push({ id: Date.now(), text: action.payload, done: false });
    },
    toggleTodo: (state, action) => {
      const todo = state.find((t) => t.id === action.payload);
      if (todo) todo.done = !todo.done;
    },
  },
});

export const { addTodo, toggleTodo } = todosSlice.actions;

const store = configureStore({
  reducer: { todos: todosSlice.reducer },
});
```

## Ключевые API

### configureStore

```javascript
import { configureStore } from '@reduxjs/toolkit';

const store = configureStore({
  reducer: {
    auth: authReducer,
    todos: todosReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});
```

По умолчанию включает:
- **redux-thunk** middleware;
- **Redux DevTools**;
- проверки на случайные мутации state и несериализуемые значения.

### createSlice

| Поле | Роль |
|------|------|
| `name` | Префикс action types (`todos/addTodo`) |
| `initialState` | Начальный state slice |
| `reducers` | Обработчики → action creators |
| `extraReducers` | Реакция на внешние actions (в т.ч. `createAsyncThunk`) |

Action types генерируются автоматически: `sliceName/reducerName`.

### Immer

Внутри `reducers` можно «мутировать» draft state — Immer создаёт новый immutable state:

```javascript
reducers: {
  updateUser: (state, action) => {
    state.profile.name = action.payload.name; // выглядит как мутация
    // фактически — immutable update
  },
}
```

Вне `createSlice` (обычный reducer) Immer не активен — нужен spread или `produce` из Immer.

### createAsyncThunk

```javascript
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchPosts = createAsyncThunk(
  'posts/fetchAll',
  async (_, { rejectWithValue }) => {
    const res = await fetch('/api/posts');
    if (!res.ok) return rejectWithValue('Network error');
    return res.json();
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});
```

Генерирует три action type: `posts/fetchAll/pending`, `/fulfilled`, `/rejected`.

### createSelector (reselect)

```javascript
import { createSelector } from '@reduxjs/toolkit';

const selectTodos = (state) => state.todos;
const selectDoneTodos = createSelector(
  [selectTodos],
  (todos) => todos.filter((t) => t.done)
);
// Пересчёт только при изменении todos
```

## Классический Redux vs RTK

| Аспект | Классический Redux | Redux Toolkit |
|--------|-------------------|---------------|
| Store | `createStore` + ручной middleware | `configureStore` |
| Actions | Строковые константы + creators | Авто из `createSlice` |
| Reducer | `switch (action.type)` | Объект функций в `reducers` |
| Immutability | Spread / ручной код | Immer в `createSlice` |
| Async | Ручной thunk | `createAsyncThunk` + `extraReducers` |
| DevTools / thunk | Подключать вручную | Из коробки |
| Boilerplate | Много | Минимальный |
| Рекомендация docs | Legacy | **Стандарт** |

## RTK Query (кратко)

`@reduxjs/toolkit/query` — слой для data fetching поверх RTK: кэш, invalidation, polling, loading states без ручного `createAsyncThunk` для каждого endpoint. Часто используют вместе с `createSlice` для UI-state.

## Типичные ошибки

1. **Мутация state вне `createSlice`** — в `extraReducers` Immer тоже работает, но в standalone reducer — нет.
2. **Несериализуемые значения** — RTK предупреждает о `Date`, `Map`, функциях в state (можно отключить проверку, но лучше хранить serializable data).
3. **Один giant slice** — лучше разбивать по feature, а не складывать всё в один `createSlice`.

## Типичные вопросы на собеседовании

- RTK заменяет Redux? — Нет, это официальный высокоуровневый API поверх Redux.
- Почему в reducer можно писать `state.push()`? — Immer создаёт draft; итоговый state immutable.
- Когда `extraReducers` vs `reducers`? — `reducers` для sync actions slice; `extraReducers` для async thunk или cross-slice reactions.

---

# 6. Ссылки

- [Redux Toolkit — Official Documentation](https://redux-toolkit.js.org/)
- [Redux Toolkit — Quick Start Tutorial](https://redux-toolkit.js.org/tutorials/quick-start)
