# 1. Тема

**Иммутабельность store**

---

# 2. Главное в одну фразу

Reducer и любой код, обновляющий Redux state, никогда не мутирует текущий объект — возвращает новую копию; RTK с Immer позволяет писать «мутирующий» синтаксис, который под капотом превращается в иммутабельное обновление.

---

# 3. Суть

> В Redux **state store read-only**: reducer получает предыдущий `state` и **возвращает новый объект**, не изменяя аргументы. Прямая мутация (`state.items.push(...)`, `state.user.name = 'x'`) ломает контракт Redux.
>
> Иммутабельность нужна по трём причинам: **React** сравнивает ссылки для ререндера (`useSelector`, `memo`); **Redux DevTools** хранит историю snapshots и делает time-travel; **чистые reducers** остаются детерминированными и тестируемыми.
>
> Вручную: spread для объектов, `map` / `filter` / `[...arr]` для массивов, копирование вложенных уровней. **Redux Toolkit** включает **Immer**: в `createSlice` можно писать `state.count += 1`, Immer создаст новый immutable draft.

---

# 4. Самое главное запомнить

- **Никогда не мутировать** `state` в reducer — только return нового дерева.
- **Shallow copy** (`{...obj}`) не клонирует вложенные объекты — их тоже копировать.
- Иммутабельность → корректные ререндеры, DevTools, чистые функции.
- **RTK + Immer** — «мутирующий» синтаксис безопасен внутри `createSlice`.
- Вне reducer (селекторы, компоненты) `getState()` тоже не мутировать.

---

# 5. Описание

## Правило reducer

```javascript
// ❌ Мутация — запрещено
function badReducer(state, action) {
  state.value += 1;
  return state; // та же ссылка → Redux/React могут не заметить изменение
}

// ✅ Иммутабельное обновление
function goodReducer(state, action) {
  return { ...state, value: state.value + 1 };
}
```

## Зачем иммутабельность

| Причина | Механизм |
| --- | --- |
| React re-render | `prevState === nextState` → skip update; новая ссылка → update |
| Redux DevTools | Каждый action = новый snapshot; time-travel |
| Pure reducers | Один `(state, action)` → один результат, проще тесты |
| Middleware | Сравнение «до/после» для логов и optimistic UI |

## Техники обновления без Immer

### Объект верхнего уровня

```javascript
return { ...state, username: action.payload };
```

### Массив: добавить элемент

```javascript
return {
  ...state,
  todos: [...state.todos, { id: nextId, text: action.payload }],
};
```

### Массив: удалить / обновить элемент

```javascript
// удалить
todos: state.todos.filter((t) => t.id !== action.payload),

// обновить один элемент
todos: state.todos.map((t) =>
  t.id === action.payload.id ? { ...t, done: true } : t,
),
```

### Вложенный объект

```javascript
// ❌ Shallow copy недостаточен
return { ...state, user: state.user }; // user — та же ссылка

// ✅ Копируем и вложенный уровень
return {
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      name: action.payload,
    },
  },
};
```

## RTK + Immer в createSlice

```typescript
const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [] as Todo[], filter: 'all' },
  reducers: {
    addTodo: (state, action) => {
      // Выглядит как мутация — Immer записывает в draft и возвращает новый state
      state.items.push(action.payload);
    },
    toggleTodo: (state, action) => {
      const todo = state.items.find((t) => t.id === action.payload);
      if (todo) todo.done = !todo.done;
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
  },
});
```

Immer отслеживает изменения draft и производит **structural sharing** — переиспользует неизменённые части дерева.

## Когда Immer не помогает автоматически

| Ситуация | Решение |
| --- | --- |
| Возврат нового значения из reducer callback | `return newState` — заменяет state целиком |
| Non-serializable (Map, Set, class instances) | Избегать или использовать `createEntityAdapter` |
| Код вне `createSlice` (ручной reducer) | Явный spread / Immer `produce()` |

```javascript
import { produce } from 'immer';

const nextState = produce(state, (draft) => {
  draft.items[0].done = true;
});
```

## Типичные ошибки

1. **`state.items.sort()`** — mutates массив; использовать `[...state.items].sort()`.
2. **Мутация внутри `getState()`** в thunk — ломает store для всех подписчиков.
3. **Селектор возвращает мутируемую ссылку** из state и компонент её меняет.
4. **Забытый `default`** в switch — вернуть `state` без изменений.

## Style Guide Redux

> Do not mutate state — официальная рекомендация. Нарушение может «работать» с Immer в slice, но сломает DevTools, тесты и предсказуемость в чистых reducers.

---

# 6. Ссылки

- [Redux Style Guide: Do Not Mutate State](https://redux.js.org/style-guide/style-guide#do-not-mutate-state)
- [Immer — Introduction](https://immerjs.github.io/immer/)
