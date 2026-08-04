# 1. Тема

**Redux, область применения**

---

# 2. Главное в одну фразу

Redux — предсказуемый контейнер состояния по архитектуре Flux: один store, изменения только через actions и чистые reducers; нужен при сложном общем состоянии, а не в простых формах с локальным `useState`.

---

# 3. Суть

> Redux — библиотека для централизованного управления состоянием JavaScript-приложений, основанная на паттерне Flux. Три принципа: **единый store** — всё глобальное состояние в одном дереве; **state read-only** — менять можно только через plain-object **actions**; **reducers — чистые функции** — `(state, action) => newState`, без побочных эффектов и мутаций.
>
> Redux оправдан, когда состояние **сложное**, **разделено между далёкими компонентами**, нужен **кэш серверных данных**, важна **предсказуемость и отладка** (DevTools, time-travel), есть **сложная асинхронная логика** (middleware) или **SSR/hydration**. Для простых приложений, форм и UI-only состояния достаточно `useState`, `useReducer` или React Context без глобального store.
>
> Современный стандарт — **Redux Toolkit (RTK)**: `configureStore`, `createSlice`, встроенный Immer, DevTools и thunk. Экосистема: React-Redux, redux-thunk, redux-saga, redux-observable.

---

# 4. Самое главное запомнить

- **Три принципа Redux:** один store, state только через actions, чистые reducers.
- **Когда нужен:** сложное shared state, кэш API, отладка, async, SSR.
- **Когда не нужен:** простое локальное UI — `useState` / Context.
- **RTK** — рекомендуемый способ писать Redux сегодня (меньше boilerplate).
- **Middleware** — место для side effects (запросы, логирование), не в reducer.

---

# 5. Описание

## Архитектура одним потоком

```
UI → dispatch(action) → reducer → новый state → UI (подписка через React-Redux)
```

Reducer не делает fetch, не пишет в localStorage и не мутирует `state` — только возвращает новое дерево.

## Три принципа Redux

| Принцип | Смысл |
| --- | --- |
| Single source of truth | Один объект `store.getState()` — единая точка правды |
| State is read-only | Единственный способ изменить state — `dispatch({ type, ... })` |
| Changes via pure reducers | Reducer синхронный, детерминированный, без мутаций |

## Когда Redux уместен

| Сценарий | Почему Redux |
| --- | --- |
| Данные нужны в несвязанных частях дерева | Один store вместо prop drilling |
| Кэш ответов API, пагинация, нормализация | Предсказуемые обновления и DevTools |
| Сложные async-цепочки | Middleware (thunk, saga) |
| SSR + клиент | Один snapshot state для гидрации |
| Отладка в проде | Action log, time-travel |

## Когда Redux избыточен

- Форма на одной странице, модалка, табы — локальный state.
- Редкий shared state между 2–3 компонентами — поднять state или Context.
- Серверные компоненты / React Query покрывают кэш без ручного Redux.

## Минимальный пример на RTK

```typescript
// features/counter/counterSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; }, // Immer под капотом
    addBy: (state, action) => { state.value += action.payload; },
  },
});

export const { increment, addBy } = counterSlice.actions;
export default counterSlice.reducer;
```

```typescript
// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '../features/counter/counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```tsx
// main.tsx
import { Provider } from 'react-redux';
import { store } from './app/store';

<Provider store={store}>
  <App />
</Provider>
```

## Экосистема

| Инструмент | Роль |
| --- | --- |
| **Redux Toolkit** | Store, slices, async thunks, Immer |
| **React-Redux** | `Provider`, `useSelector`, `useDispatch` |
| **Redux DevTools** | История actions, diff state, time-travel |
| **redux-thunk** | Async через `dispatch(function)` |
| **redux-saga / redux-observable** | Сложные async-потоки |

---

# 6. Ссылки

- [Redux — официальная документация](https://redux.js.org/)
- [Three Principles of Redux](https://redux.js.org/understanding/thinking-in-redux/three-principles)
- [Redux Toolkit](https://redux-toolkit.js.org/)
