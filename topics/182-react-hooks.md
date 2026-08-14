# 1. Тема

**Хуки: встроенные и пользовательские**

---

# 2. Главное в одну фразу

Хуки — функции вида `use…`, которые подключают к функциональному компоненту state, эффекты и другой React-функционал; свои хуки собирают повторно используемую логику без смены дерева UI.

---

# 3. Суть

> **Хуки (Hooks)** появились, чтобы функции-компоненты могли хранить состояние и выполнять побочные эффекты без классов. Вызов `useState`, `useEffect`, `useRef`, `useContext` и других `use*` внутри компонента «подписывает» его на возможности React: память между рендерами, работа после отрисовки, чтение контекста.
>
> Зачем: одна парадигма — функции; логику с state легче вынести в **пользовательский хук** (`useForm`, `useMediaQuery`), не оборачивая дерево в HOC и не размножая render-props. Встроенные хуки покрывают базовые задачи; кастомные — композиция нескольких встроенных под сценарий продукта.
>
> Правила: хуки вызывают **только на верхнем уровне** компонента или другого хука — не в циклах, условиях и вложенных функциях после раннего `return`. Порядок вызовов между рендерами должен быть стабильным: React сопоставляет хуки по позиции в цепочке. Имена кастомных хуков начинаются с `use`, чтобы линтер (`eslint-plugin-react-hooks`) видел правила.
>
> Ловушка: `useEffect` — не «жизненный цикл componentDidMount», а синхронизация с внешней системой (подписка, таймер, fetch с отменой). Для вычислений от props/state чаще хватает выражения в теле компонента или `useMemo`; для ответа на клик — обработчик, а не эффект.

---

# 4. Самое главное запомнить

- Хуки только в теле функции-компонента или кастомного хука, всегда в одном порядке.
- `useState` / `useReducer` — локальное состояние; `useRef` — ящик, смена `.current` не вызывает render.
- `useEffect` — синхронизация с «внешним миром»; cleanup снимает подписку.
- Кастомный хук = функция `useX(…)` из встроенных хуков, без обязательного JSX.
- Зависимости эффекта (`[]`) должны перечислять все используемые реактивные значения (помогает exhaustive-deps).
- Хуки не работают в обычных JS-функциях и классах (в классах — методы жизненного цикла).

---

# 5. Описание

```text
function Profile() {
  useState(…)     // 1-й слот
  useEffect(…)    // 2-й слот
  useForm(…)  ──► внутри тоже useState / useEffect → следующие слоты
  return <…>
}
```

## Базовые встроенные хуки

| Хук | Роль |
| --- | --- |
| `useState` | значение + setter, trigger render |
| `useReducer` | state через `(state, action) => next` |
| `useEffect` | подписка / fetch / DOM после commit |
| `useLayoutEffect` | то же, но до paint (измерения layout) |
| `useRef` | мутабельный ящик / ссылка на DOM |
| `useContext` | чтение ближайшего Context |
| `useMemo` / `useCallback` | мемоизация значения / функции |

```jsx
function Timer() {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return <p>{sec}</p>;
}
```

## Пользовательский хук

```jsx
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}

function Banner() {
  const online = useOnlineStatus();
  return online ? null : <p>Нет сети</p>;
}
```

UI остаётся в компоненте; подписка на сеть переиспользуется в любом месте.

## Правила хуков

```text
✓ function Comp() { useState(); if (x) { … } }
✗ function Comp() { if (x) useState(); }
✗ function Comp() { for (…) useEffect(…); }
✗ function helper() { useState(); }  // не компонент и не use*
```

Нарушение порядка → React читает «чужой» слот state → баги, которые трудно отловить.

## Effect не вместо события

| Задача | Куда |
| --- | --- |
| Клик «Сохранить» → POST | `onClick` |
| Подписка на `resize` | `useEffect` + cleanup |
| Вывести `items.length` | выражение в JSX / теле |
| Сбросить state при смене `userId` | ключ на компоненте или эффект с осторожностью |

## Связь с другими темами

Классы и методы `componentDidMount` / `DidUpdate` / `WillUnmount` соответствуют разным способам выразить ту же синхронизацию через `useEffect`. HOC и render-props частично заменяются кастомными хуками, когда нужно делить *логику*, а не разметку.

---

# 6. Ссылки

- [React — Hooks at a Glance](https://react.dev/reference/react)
- [React — Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React — Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
