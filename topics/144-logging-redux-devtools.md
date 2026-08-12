# 1. Тема

**Redux DevTools**

---

# 2. Главное в одну фразу

Redux DevTools показывает историю actions и снимки state: можно разобрать, какой action изменил данные, и откатить время через time-travel.

---

# 3. Суть

> **Redux DevTools** — расширение браузера (и опционально remote) для стора Redux / RTK. Пока приложение диспатчит actions, расширение пишет журнал: тип action, payload, state **до** и **после**. Можно раскрыть diff, найти лишний ререндер-повод или экшен, который затёр поле. **Time travel** — прыжок к прошлому снимку state без перезагрузки страницы: проверяете гипотезу «сломалось после ADD_ITEM».
>
> Зачем: без DevTools отладка Redux сводится к `console.log` в каждом reducer. С панелью видно цепочку «UI → action → новый state» и ловите мутации, неправильный payload, пропущенный case в `extraReducers`.
>
> Как подключают. В RTK `configureStore` уже включает DevTools в development (`devTools: true` по умолчанию). Для классического `createStore` — enhancer `window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__`. В проде расширение обычно выключают (`devTools: false` или только `import.meta.env.DEV`), чтобы не светить state и не тащить overhead. Полезны фильтры по типу action, skip/jump, export/import сессии для баг-репорта.
>
> Ловушка: мутировать state в reducer «работает» в UI, но DevTools и time-travel ломаются — Redux ожидает иммутабельные обновления. Другая — логировать секреты в payload (токены): на shared машине или в записи сессии они утекут. Не путать с React DevTools: тот про дерево компонентов, этот — про action/state.

---

# 4. Самое главное запомнить

- Журнал actions + state before/after + diff.
- Time travel = прыжок по истории снимков.
- RTK: `configureStore` → DevTools в dev из коробки.
- Прод: `devTools: false` (или только DEV).
- Мутации в reducer ломают предсказуемость и time-travel.
- ≠ React DevTools (компоненты vs store).

---

# 5. Описание

## Подключение (RTK)

```javascript
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
  // по умолчанию true в development
  devTools: process.env.NODE_ENV !== 'production',
});
```

## Классический compose

```javascript
import { createStore, applyMiddleware, compose } from 'redux';

const composeEnhancers =
  (typeof window !== 'undefined' &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose;

const store = createStore(rootReducer, composeEnhancers(applyMiddleware(thunk)));
```

## Что смотреть в панели

```text
Action list  →  какой тип и payload ушли
State        →  дерево целиком / выбрантый путь
Diff         →  что реально изменилось
Trace (opt)  →  стек, откуда dispatch
```

Типичный разбор бага:

1. Воспроизвести клик / запрос.
2. Найти последний action перед поломкой.
3. Diff: пропало ли поле, затёрся ли массив.
4. Jump back → проверить, живёт ли UI на старом state.

## Опции store

```javascript
devTools: {
  name: 'shop-app',
  actionSanitizer: (action) =>
    action.type === 'auth/setToken'
      ? { ...action, payload: '<<hidden>>' }
      : action,
  stateSanitizer: (state) => ({ ...state, secrets: '<<hidden>>' }),
}
```

---

# 6. Ссылки

- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
- [RTK configureStore — devTools](https://redux-toolkit.js.org/api/configureStore)
- [Redux — DevTools](https://redux.js.org/introduction/ecosystem#devtools)
