# 1. Тема

**Альтернативные подходы к организации store: Feature-first и redux-ducks**

---

# 2. Главное в одну фразу

Вместо разнесения reducer'ов, actions и constants по типам файлов store группируют по доменным фичам (feature-first) или сворачивают slice в один модуль по паттерну ducks — а RTK `createSlice` фактически является ducks «на стероидах».

---

# 3. Суть

> «Классическая **type-based** структура (`/actions`, `/reducers`, `/constants`) быстро превращается в «папку-зоопарк»: чтобы изменить одну фичу, приходится прыгать между тремя директориями. **Feature-first** (feature folders) группирует всё, что относится к домену (`/features/todos/`), рядом с компонентами и селекторами. **Redux-ducks** — соглашение внутри модуля: default export — reducer, named exports — action creators; action types без префикса файла, с коротким уникальным именем. **RTK `createSlice`** объединяет reducer + actions + типы в одном файле с автогенерацией type prefix — это эволюция ducks с Immer и меньшим boilerplate. Оба подхода решают колocation: код, который меняется вместе, лежит вместе.»

---

# 4. Самое главное запомнить

- **Type-based** — по роли файла (`actions/`, `reducers/`); плохо масштабируется.
- **Feature-first** — по домену/фиче (`features/auth/`, `features/cart/`).
- **Ducks** — один файл: `export default reducer` + named action creators.
- Action types в ducks — **глобально уникальные** короткие строки (`ADD_TODO`).
- **`createSlice`** = ducks + auto action types + Immer.
- Официальный style guide Redux рекомендует **feature folders** или ducks.
- Shared-код (`/app/store`, `/shared/ui`) — отдельно от feature-модулей.

---

# 5. Описание

## Проблема type-based структуры

```
src/
  actions/
    todos.js
    auth.js
  reducers/
    todos.js
    auth.js
  constants/
    todos.js
    auth.js
  components/
    TodoList.jsx
```

При добавлении поля в todo открываются 3–4 файла в разных папках. Связь между action type, creator и reducer неочевидна новому разработчику. Конфликты при merge в monorepo-командах.

## Feature-first (feature folders)

Всё по домену в одной папке:

```
src/
  features/
    todos/
      todosSlice.js      # или ducks-модуль
      TodoList.jsx
      TodoItem.jsx
      selectors.js
      api.js
    auth/
      authSlice.js
      LoginForm.jsx
      selectors.js
  app/
    store.js             # configureStore, root reducer
    App.jsx
  shared/
    ui/
      Button.jsx
```

**Принципы:**
- фича владеет своим state, UI и side effects;
- импорт между фичами — через public API (селекторы, actions), не через внутренние файлы;
- общий store собирается в `app/store.js`.

```javascript
// app/store.js
import { configureStore } from '@reduxjs/toolkit';
import todosReducer from '../features/todos/todosSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    todos: todosReducer,
    auth: authReducer,
  },
});
```

## Паттерн redux-ducks

[ducks-modular-redux](https://github.com/erikras/ducks-modular-redux) — соглашение от Erik Rasmussen:

1. Module **должен** экспортировать reducer как **default**.
2. Action creators — **named exports**.
3. Action types — константы внутри модуля, **≤ 3 слов**, **глобально уникальные**.

```javascript
// features/todos/todos.duck.js

const ADD_TODO = 'ADD_TODO';
const TOGGLE_TODO = 'TOGGLE_TODO';

const initialState = [];

export default function todosReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_TODO:
      return [...state, { id: Date.now(), text: action.payload, done: false }];
    case TOGGLE_TODO:
      return state.map((t) =>
        t.id === action.payload ? { ...t, done: !t.done } : t
      );
    default:
      return state;
  }
}

export function addTodo(text) {
  return { type: ADD_TODO, payload: text };
}

export function toggleTodo(id) {
  return { type: TOGGLE_TODO, payload: id };
}
```

**Плюсы ducks:** colocation, один файл = одна фича, проще code review.

**Минусы классических ducks:** всё ещё switch-case, ручные action types, риск collision имён без namespace.

## RTK createSlice = ducks на стероидах

```javascript
// features/todos/todosSlice.js
import { createSlice } from '@reduxjs/toolkit';

const todosSlice = createSlice({
  name: 'todos',                    // namespace: todos/addTodo
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
export default todosSlice.reducer;
```

RTK добавляет к ducks:
- автоматический prefix action types (`todos/addTodo`);
- Immer вместо spread;
- интеграция с `createAsyncThunk` через `extraReducers`.

## Сравнение подходов

| Критерий | Type-based | Feature-first | Ducks | RTK createSlice |
|----------|------------|---------------|-------|-----------------|
| Группировка | По типу файла | По домену | По модулю | По slice/фиче |
| Colocation | Плохая | Хорошая | Хорошая | Хорошая |
| Action types | Ручные константы | Ручные / slice | Короткие, риск collision | Auto-prefixed |
| Reducer | Отдельный файл | Рядом с фичей | Default export | `slice.reducer` |
| Boilerplate | Высокий | Средний | Средний | Низкий |
| Immer | Нет | Опционально | Нет | Встроен |
| Рекомендация 2020+ | Legacy | ✅ | ✅ (идея) | ✅ **стандарт** |

## Практические правила

1. **Одна фича — одна папка**, внутри slice + компоненты + селекторы.
2. **Не импортировать** внутренности чужой фичи — только публичные actions/selectors.
3. **`/app`** — store, routing, providers; **`/shared`** — переиспользуемый UI/utils.
4. При росте slice — **разбивать** на sub-slices внутри feature (`cart/itemsSlice`, `cart/checkoutSlice`).
5. Нормализация данных — отдельный slice или entity adapter (`createEntityAdapter` в RTK).

## Структура с RTK Query

```
features/
  posts/
    postsApi.js        # RTK Query endpoints
    postsSlice.js      # UI-state (filters, selectedId)
    PostList.jsx
```

Server cache (RTK Query) и client UI-state (slice) живут в одной feature-папке.

## Типичные вопросы на собеседовании

- Чем feature-first лучше type-based? — Colocation: изменения фичи локализованы, проще удалять/переносить модули.
- Ducks vs createSlice? — Ducks — соглашение об экспортах; createSlice реализует ту же идею с меньшим кодом.
- Как избежать циклических импортов между фичами? — Cross-feature communication через actions/selectors верхнего уровня или event bus; не импортировать компоненты соседней фичи напрямую.

---

# 6. Ссылки

- [Redux Style Guide — Structure files as feature folders or ducks](https://redux.js.org/style-guide/style-guide#structure-files-as-feature-folders-or-ducks)
- [ducks-modular-redux — GitHub](https://github.com/erikras/ducks-modular-redux)
