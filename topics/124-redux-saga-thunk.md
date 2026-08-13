# 1. Тема

**redux-saga и redux-thunk — middleware для асинхронной логики**

---

# 2. Главное в одну фразу

Thunk — `dispatch` функции с обычным `async/await`; saga — генераторы и эффекты с явной отменой, гонками и оркестрацией.

---

# 3. Суть

> Reducer в Redux обязан оставаться чистым и синхронным: принять action и вернуть новый state. Сеть, таймеры и отмена запросов туда не кладут — их выносят в **middleware**. Два распространённых пути — **redux-thunk** и **redux-saga**.
>
> **Thunk** — функция `(dispatch, getState) => …`, которую middleware вызывает вместо plain object. Внутри обычный JavaScript: `fetch`, `async/await`, ветки. В Redux Toolkit тот же подход оформляют как `createAsyncThunk` (pending / fulfilled / rejected). Порог входа низкий: типичный CRUD закрывается без отдельной библиотеки эффектов.
>
> **Saga** слушает actions генераторами и описывает побочные эффекты декларативно: `call`, `put`, `take`, `fork`, `cancel`, `race`. Middleware исполняет эффекты. Сильная сторона — конкурентность из коробки: `takeLatest` гасит предыдущую задачу, `race` выбирает победителя, удобно тестировать «что хотели сделать», а не мокать весь `fetch`.
>
> Ловушка: тащить saga на каждый `GET /users` — лишняя кривая обучения и boilerplate. Для одиночных запросов хватает thunk; saga оправдана, когда нужны отмена, debounce, multi-step и фоновые процессы. Отмену в thunk делают вручную через `AbortController` / `promise.abort()`.

---

# 4. Самое главное запомнить

- **Reducer** — только синхронный state; async — в middleware.
- **Thunk** = `dispatch((dispatch, getState) => { … })`; в RTK — `createAsyncThunk`.
- **Saga** = генератор + эффекты (`takeEvery`, `takeLatest`, `call`, `put`).
- **`takeLatest`** отменяет предыдущую задачу при новом action (поиск, автокомплит).
- **`race` / `cancel`** — сильная сторона saga; в thunk отмену собирают вручную.
- CRUD и простые запросы → **thunk**; сложная оркестрация → **saga**.

---

# 5. Описание

```text
UI ──dispatch──► middleware (thunk / saga) ──► side effects
                      │
                      └── put / dispatch ──► reducer ──► state ──► UI
```

## Как работает middleware

`dispatch` проходит цепочку middleware до reducer. Middleware может перехватить action (или функцию-thunk), выполнить побочный эффект и задиспатчить новые actions. Reducer по-прежнему только считает следующий state.

## redux-thunk

Thunk — функция `(dispatch, getState) => void | Promise`. Middleware видит функцию вместо plain object и вызывает её.

```javascript
function fetchUser(userId) {
  return async (dispatch) => {
    dispatch({ type: 'user/loading' });
    try {
      const res = await fetch(`/api/users/${userId}`);
      dispatch({ type: 'user/loaded', payload: await res.json() });
    } catch (err) {
      dispatch({ type: 'user/error', error: err.message });
    }
  };
}

dispatch(fetchUser(42));
```

**RTK — `createAsyncThunk`:**

```javascript
export const fetchUser = createAsyncThunk('user/fetch', async (userId, { rejectWithValue }) => {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) return rejectWithValue(await res.text());
  return res.json();
});
```

Slice слушает `pending` / `fulfilled` / `rejected`. Отмена: передать `signal` в `fetch` и вызвать `promise.abort()` у результата `dispatch(fetchUser(…))`.

**Плюсы:** низкий порог, нативный async/await, встроен в RTK.  
**Минусы:** гонки и сложные цепочки — ручная сборка.

## redux-saga

Saga — middleware на генераторах. Эффекты описывают намерение; runtime их выполняет.

```javascript
function* fetchUserSaga(action) {
  try {
    const res = yield call(fetch, `/api/users/${action.payload}`);
    const data = yield call([res, 'json']);
    yield put({ type: 'user/loaded', payload: data });
  } catch (err) {
    yield put({ type: 'user/error', error: err.message });
  }
}

function* watchSearch() {
  yield takeLatest('SEARCH', function* (action) {
    yield delay(300);
    yield call(searchApi, action.query);
  });
}
```

| Эффект | Назначение |
|--------|------------|
| `call` | Вызвать fn / Promise |
| `put` | Задиспатчить action |
| `take` / `takeEvery` / `takeLatest` | Ждать / на каждый / с отменой предыдущего |
| `fork` / `cancel` | Фоновая задача и отмена |
| `race` | Первый завершившийся побеждает |

**Плюсы:** оркестрация, отмена, тестируемые эффекты.  
**Минусы:** генераторы и больше кода на простые кейсы.

## Сравнение

| Критерий | redux-thunk | redux-saga |
|----------|-------------|------------|
| Модель | Функция с `dispatch` | Генератор + эффекты |
| RTK по умолчанию | Да (`createAsyncThunk`) | Нет, подключать отдельно |
| Отмена | `AbortController` / `.abort()` | `takeLatest`, `cancel`, `race` |
| Типичный кейс | CRUD, одиночные запросы | Поиск, wizard, polling, multi-step |

## Когда что выбирать

**Thunk / `createAsyncThunk`:** список, детали, форма, простые POST/PUT/DELETE, проект на RTK без тяжёлой оркестрации.

**Saga:** debounced-поиск с отменой, checkout из нескольких шагов, polling, параллельные запросы с таймаутом (`race`).

---

# 6. Ссылки

- [Redux — Writing Logic with Thunks](https://redux.js.org/usage/writing-logic-thunks)
- [Redux Toolkit — createAsyncThunk](https://redux-toolkit.js.org/api/createAsyncThunk)
- [redux-saga — Official Documentation](https://redux-saga.js.org/)
- [MDN — AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
