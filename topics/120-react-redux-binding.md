# 1. Тема

**Связывание React с Redux**

---

# 2. Главное в одну фразу

React-Redux соединяет store с компонентами через `Provider` на корне и хуки `useSelector` / `useDispatch`; `connect` — устаревший HOC-подход.

---

# 3. Суть

> **React-Redux** — официальная связка Redux и React. Store создаётся один раз (`configureStore`), оборачивается в `<Provider store={store}>` — контекст даёт доступ ко всему дереву. Компоненты **читают** state через `useSelector(selector)` и **отправляют** actions через `useDispatch()`.
>
> `useSelector` подписывает компонент на выбранный фрагмент state: при изменении результата селектора (строгое сравнение `===`) React перерисовывает компонент. Селектор должен быть чистым и возвращать стабильные ссылки, если данные не менялись.
>
> Для TypeScript типизируют store и экспортируют обёртки `useAppDispatch` / `useAppSelector` с `RootState` и `AppDispatch`. API **`connect(mapStateToProps, mapDispatchToProps)`** — legacy; в новом коде используют только хуки.

---

# 4. Самое главное запомнить

- **`Provider`** — один раз на корне, передаёт `store` через React Context.
- **`useSelector`** — читает кусок state; перерисовка при изменении результата селектора.
- **`useDispatch`** — возвращает функцию `dispatch` для actions / thunks.
- **Typed hooks** — `useAppSelector`, `useAppDispatch` для TypeScript.
- **`connect`** — устарел; хуки проще и совместимы с функциональными компонентами.

---

# 5. Описание

## Схема связки

```
configureStore → store
       ↓
<Provider store={store}>
       ↓
  useSelector / useDispatch в любом потомке
```

## Настройка store и Provider

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
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
```

## Typed hooks (рекомендуемый паттерн)

```typescript
// app/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

```tsx
// Counter.tsx
import { increment, addBy } from '../features/counter/counterSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';

export function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(addBy(5))}>+5</button>
    </div>
  );
}
```

## useSelector: правила

| Правило | Зачем |
| --- | --- |
| Селектор — чистая функция | Предсказуемость и мемоизация |
| Не создавать новый объект без нужды | `{ ...state.user }` каждый раз → лишние рендеры |
| Для сложных выборок — `createSelector` (reselect) | Мемоизация производных данных |
| Equality check по умолчанию `===` | Можно передать `shallowEqual` вторым аргументом |

```tsx
// Плохо: новый объект на каждый вызов → вечные ререндеры
const user = useSelector((state) => ({ name: state.user.name }));

// Лучше: примитив или мемоизированный селектор
const name = useAppSelector((state) => state.user.name);
```

## useDispatch

- Синхронные actions: `dispatch(increment())`.
- Async thunks (RTK): `dispatch(fetchUserById(42))` — thunk возвращает Promise.
- `dispatch` стабилен по ссылке — можно не добавлять в deps `useEffect`.

## connect vs hooks

| | `connect` (legacy) | Hooks |
| --- | --- | --- |
| Стиль | HOC, class components | Функциональные компоненты |
| Читаемость | mapState/mapDispatch отдельно | Логика рядом с JSX |
| Статус | Поддерживается, не рекомендуется для нового кода | Стандарт с React 16.8+ |

```tsx
// Legacy — только для поддержки старого кода
export default connect(
  (state: RootState) => ({ count: state.counter.value }),
  { increment },
)(CounterClass);
```

---

# 6. Ссылки

- [React-Redux — документация](https://react-redux.js.org/)
- [React-Redux API: Hooks](https://react-redux.js.org/api/hooks)
