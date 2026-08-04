# 1. Тема

**redux-saga и redux-thunk — middleware для асинхронной логики**

---

# 2. Главное в одну фразу

redux-thunk позволяет диспатчить функции с `dispatch`/`getState` и простым async/await, а redux-saga описывает побочные эффекты через генераторы с явным контролем отмены, гонок и сложных сценариев.

---

# 3. Суть

> «Оба подхода решают одну задачу — вынести асинхронную логику из reducer'ов, которые должны оставаться чистыми и синхронными. **Thunk** — функция, которую middleware перехватывает и вызывает с `dispatch` и `getState`; внутри — обычный JavaScript: `fetch`, `async/await`, условные ветки. **Saga** — middleware, который запускает **генераторы**: эффекты `call`, `put`, `take`, `fork`, `cancel` описывают, *что* делать, а не *как* (тестируемо и декларативно). Thunk проще и по умолчанию в Redux Toolkit; saga сильнее там, где нужны отмена запросов, debounce через `takeLatest`, параллельные гонки (`race`), долгоживущие фоновые процессы и оркестрация нескольких API. Для типичного CRUD достаточно thunk/`createAsyncThunk`; saga оправдана при сложных бизнес-процессах.»

---

# 4. Самое главное запомнить

- **Reducer** — только синхронное обновление state; async — в middleware.
- **Thunk** = `dispatch((dispatch, getState) => { ... })`; в RTK — `createAsyncThunk`.
- **Saga** = генератор + эффекты (`takeEvery`, `takeLatest`, `call`, `put`).
- **`takeLatest`** отменяет предыдущую задачу при новом action (поиск, автокомплит).
- **`race` / `cancel`** — сильная сторона saga; в thunk отмену делают вручную (`AbortController`).
- CRUD и простые запросы → **thunk**; сложная оркестрация → **saga**.

---

# 5. Описание

## Как работает middleware

Redux dispatch проходит цепочку middleware до reducer. Middleware может перехватить action, выполнить побочный эффект и задиспатчить новые actions.

```
action → middleware₁ → middleware₂ → … → reducer → new state
              ↓
         async / saga
```

## redux-thunk

Thunk — функция `(dispatch, getState) => void | Promise`. Middleware видит функцию вместо plain object и вызывает её.

```javascript
// Классический thunk
function fetchUser(userId) {
  return async (dispatch, getState) => {
    dispatch({ type: 'user/loading' });
    try {
      const res = await fetch(`/api/users/${userId}`);
      const user = await res.json();
      dispatch({ type: 'user/loaded', payload: user });
    } catch (err) {
      dispatch({ type: 'user/error', error: err.message });
    }
  };
}

// Использование
dispatch(fetchUser(42));
```

**RTK — `createAsyncThunk`** (рекомендуемый thunk-подход):

```javascript
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk(
  'user/fetch',
  async (userId, { rejectWithValue }) => {
    const res = await fetch(`/api/users/${userId}`);
    if (!res.ok) return rejectWithValue(await res.text());
    return res.json();
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, status: 'idle', error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});
```

**Плюсы thunk:** минимальный порог входа, нативный async/await, встроен в RTK, мало абстракций.

**Минусы thunk:** отмена и конкурентные сценарии — ручная работа; сложные цепочки быстро разрастаются.

## redux-saga

Saga — middleware на **генераторах** (`function*`). Эффекты описывают намерения; middleware выполняет их.

```javascript
import { call, put, takeEvery, takeLatest, delay, race, cancelled } from 'redux-saga/effects';

function* fetchUserSaga(action) {
  try {
    const user = yield call(fetch, `/api/users/${action.payload}`);
    const data = yield call([user, 'json']);
    yield put({ type: 'user/loaded', payload: data });
  } catch (err) {
    yield put({ type: 'user/error', error: err.message });
  }
}

// Каждый SEARCH запускает новую задачу; предыдущая отменяется
function* watchSearch() {
  yield takeLatest('SEARCH', function* (action) {
    yield delay(300); // debounce
    yield call(searchApi, action.query);
  });
}

function* rootSaga() {
  yield takeEvery('user/fetch', fetchUserSaga);
  yield fork(watchSearch);
}
```

**Ключевые эффекты:**

| Эффект | Назначение |
|--------|------------|
| `call(fn, ...args)` | Вызвать функцию/Promise (тестируемо) |
| `put(action)` | Задиспатчить action (= `dispatch`) |
| `take(type)` | Ждать action |
| `takeEvery` | Запускать saga на каждый action |
| `takeLatest` | Отменять предыдущую при новом |
| `fork` | Запустить неблокирующую задачу |
| `cancel` | Отменить forked-задачу |
| `race` | Первый завершившийся побеждает |

**Пример отмены при unmount (saga):**

```javascript
function* fetchWithCancel(action) {
  const { response, timeout } = yield race({
    response: call(api.get, action.url),
    timeout: delay(5000),
  });
  if (timeout) yield put({ type: 'fetch/timeout' });
  else yield put({ type: 'fetch/success', payload: response });
}
```

**Плюсы saga:** декларативная оркестрация, встроенная отмена, `takeLatest`/`race`, удобное unit-тестирование эффектов.

**Минусы saga:** кривая обучения, генераторы, больше boilerplate для простых кейсов.

## Сравнение

| Критерий | redux-thunk | redux-saga |
|----------|-------------|------------|
| Модель | Функция с `dispatch` | Генератор + эффекты |
| Порог входа | Низкий | Выше |
| RTK по умолчанию | Да (`createAsyncThunk`) | Нет, подключать отдельно |
| Отмена запросов | Вручную (`AbortController`) | `takeLatest`, `cancel`, `race` |
| Debounce / throttle | Вручную | `takeLatest` + `delay` |
| Сложные цепочки | Разрастается | `call`/`fork`/`all` |
| Тестирование | Mock `dispatch` | `redux-saga-test-plan`, assert effects |
| Типичный кейс | CRUD, одиночные запросы | Поиск, wizard, polling, multi-step |

## Когда что выбирать

**Thunk / `createAsyncThunk`:**
- загрузка списка, деталей, формы;
- простые POST/PUT/DELETE;
- проект на RTK без тяжёлой async-оркестрации.

**Saga:**
- debounced-поиск с отменой предыдущего запроса;
- checkout из нескольких шагов с rollback;
- фоновый polling с паузой/возобновлением;
- параллельные запросы с таймаутом (`race`).

## Типичные вопросы на собеседовании

- Почему async не пишут прямо в reducer? — Reducer должен быть чистой синхронной функцией; side effects — в middleware.
- Чем `takeEvery` отличается от `takeLatest`? — `takeEvery` запускает все экземпляры; `takeLatest` отменяет предыдущий.
- Можно ли saga и thunk вместе? — Да, но обычно выбирают один основной подход для единообразия.

---

# 6. Ссылки

- [Redux — Writing Logic with Thunks](https://redux.js.org/usage/writing-logic-thunks)
- [redux-saga — Official Documentation](https://redux-saga.js.org/)
