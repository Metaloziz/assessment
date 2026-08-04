# 1. Тема

**action, dispatch**

---

# 2. Главное в одну фразу

Action — plain object с полем `type` (и опциональным `payload`); `dispatch` — единственный способ сообщить store об изменении и запустить цепочку reducer → новый state.

---

# 3. Суть

> **Action** описывает *что произошло*, а не *как* обновить state. Минимальный контракт — объект с обязательным строковым полем `type`. Дополнительные поля (часто `payload`, `meta`, `error`) несут данные для reducer. **Action creator** — функция, возвращающая action: `const addTodo = (text) => ({ type: 'todos/add', payload: text })`.
>
> **`dispatch(action)`** — единственный легальный способ изменить state в Redux. Reducer не вызывают напрямую: store получает action, прогоняет через reducer(s), сохраняет новый state и уведомляет подписчиков (React-Redux).
>
> Поток данных односторонний: **UI → dispatch → action → reducer → state → UI**. Синхронные actions обрабатывает reducer сразу; асинхронность выносят в **middleware** (redux-thunk: `dispatch` может принимать функцию `(dispatch, getState) => { ... }`).

---

# 4. Самое главное запомнить

- Action = plain object, обязательно **`type`**.
- **`dispatch`** — единственный вход для изменения store.
- **Action creators** убирают дублирование и типизируют payload.
- Reducer решает *как* менять state по `action.type`.
- Async — через middleware (thunk/saga), не внутри reducer.

---

# 5. Описание

## Односторонний поток

```
Пользователь кликает
    → компонент вызывает dispatch(actionCreator(...))
    → store передаёт action в reducer
    → reducer возвращает новый state
    → подписчики (useSelector) получают обновление
    → UI перерисовывается
```

## Структура action

```javascript
// Минимальный action
{ type: 'counter/increment' }

// С payload
{ type: 'todos/add', payload: { id: 1, text: 'Buy milk' } }

// FSA-подобный стиль (Flux Standard Action)
{ type: 'users/fetchRejected', payload: error, error: true }
```

| Поле | Назначение |
| --- | --- |
| `type` | Идентификатор события (строка, уникальна в приложении) |
| `payload` | Данные для reducer |
| `meta` | Служебная информация (id запроса, timestamp) |
| `error` | Флаг ошибки (опционально) |

## Action creators

```javascript
// Ручной creator
export const increment = () => ({ type: 'counter/increment' });
export const addBy = (amount) => ({
  type: 'counter/addBy',
  payload: amount,
});

// В компоненте
dispatch(addBy(10));
```

### RTK createSlice — creators генерируются автоматически

```typescript
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },
    addBy: (state, action) => { state.value += action.payload; },
  },
});

export const { increment, addBy } = counterSlice.actions;
// increment() → { type: 'counter/increment', payload: undefined }
// addBy(5)   → { type: 'counter/addBy', payload: 5 }
```

## dispatch

```javascript
const store = configureStore({ reducer });

// Синхронно
store.dispatch(increment());

// В React
const dispatch = useAppDispatch();
dispatch(addBy(3));
```

Store API:

| Метод | Роль |
| --- | --- |
| `dispatch(action)` | Отправить action (или thunk) |
| `getState()` | Текущий snapshot state |
| `subscribe(listener)` | Callback при каждом dispatch |
| `replaceReducer(nextReducer)` | Hot reload / code splitting |

## Reducer обрабатывает action

```javascript
function counterReducer(state = { value: 0 }, action) {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, value: state.value + 1 };
    case 'counter/addBy':
      return { ...state, value: state.value + action.payload };
    default:
      return state; // неизвестный type — вернуть state без изменений
  }
}
```

## Асинхронность: redux-thunk

Reducer остаётся синхронным. Thunk middleware перехватывает функцию вместо объекта:

```javascript
// action creator — thunk
export const fetchUser = (userId) => async (dispatch, getState) => {
  dispatch({ type: 'users/fetchPending' });
  try {
    const res = await fetch(`/api/users/${userId}`);
    const data = await res.json();
    dispatch({ type: 'users/fetchFulfilled', payload: data });
  } catch (err) {
    dispatch({ type: 'users/fetchRejected', payload: err.message, error: true });
  }
};

// использование
dispatch(fetchUser(42));
```

RTK **`createAsyncThunk`** генерирует pending/fulfilled/rejected actions автоматически:

```typescript
export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (userId: number) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  },
);
```

## Снижение boilerplate

| Подход | Что даёт |
| --- | --- |
| Константы `types.js` | Один источник строк `type` |
| Action creators | Единый формат actions |
| `createSlice` (RTK) | type + creator + reducer в одном месте |
| `createAsyncThunk` | Стандартный async lifecycle |

---

# 6. Ссылки

- [Redux Fundamentals: Data Flow](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow)
- [Redux: Reducing Boilerplate](https://redux.js.org/usage/reducing-boilerplate)
