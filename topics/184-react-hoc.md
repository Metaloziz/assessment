# 1. Тема

**Компоненты высшего порядка**

---

# 2. Главное в одну фразу

HOC — функция, которая принимает компонент и возвращает новый с дополнительной логикой или props, не меняя исходный компонент напрямую.

---

# 3. Суть

> **Higher-Order Component (HOC)** — паттерн: функция вида `withSomething(WrappedComponent) => EnhancedComponent`. На вход — любой компонент, на выход — обёртка, которая рендерит исходный и добавляет поведение: авторизацию, данные из store, логирование, feature-flag.
>
> Зачем: когда одну и ту же *логику* нужно навесить на разные экраны, не копируя код. Классические примеры экосистемы — `connect` из React-Redux (исторически), `withRouter` в старых версиях React Router. Обёртка держит подписку или проверку прав и передаёт результат вниз через props.
>
> Как устроено: HOC создаёт новый компонент; внутри `render` / функции вызывается `<WrappedComponent {...props} extra={…} />`. Исходный файл не правят — композиция снаружи. Имя обёртки в DevTools задают через `displayName`.
>
> Ловушка: «обёртка на обёртке» усложняет дерево и props; статичные методы и `ref` сами не пробрасываются (нужен `forwardRef` / hoist). Сегодня для переиспользования *логики* чаще пишут **кастомные хуки**; HOC остаётся полезен, когда нужно обернуть чужой компонент или единообразно внедрить props без доступа к его исходникам. Не путать с родителем, который просто рендерит `{children}` — это композиция, но не HOC-фабрика.

---

# 4. Самое главное запомнить

- HOC = `(Component) => Component`, не «родитель с children» сам по себе.
- Не мутировать `WrappedComponent` — возвращать новую обёртку.
- Пробрасывать неизвестные props: `{...props}` + свои.
- `ref` и static-поля через обёртку не текут сами — `forwardRef` / копирование static.
- Для новой логики в своём коде чаще предпочтительнее custom hook.
- Не использовать HOC внутри render родителя — каждый раз новый тип компонента, сброс state.

---

# 5. Описание

```text
withAuth(Page)  →  function WithAuth(props) {
                       if (!user) return <Login />;
                       return <Page {...props} user={user} />;
                     }
```

## Минимальный пример

```jsx
function withLoading(Wrapped) {
  function WithLoading({ isLoading, ...rest }) {
    if (isLoading) return <p>Загрузка…</p>;
    return <Wrapped {...rest} />;
  }
  WithLoading.displayName = `withLoading(${Wrapped.displayName || Wrapped.name || 'Component'})`;
  return WithLoading;
}

const UserListWithLoading = withLoading(UserList);
```

`UserList` не знает про спиннер; экраны подключают `withLoading` по необходимости.

## Типичные задачи HOC

| Задача | Идея обёртки |
| --- | --- |
| Права доступа | редирект / заглушка, если нет роли |
| Данные | подписка на store / контекст → props |
| Аналитика | логировать mount и клики |
| Feature toggle | не рендерить `Wrapped`, если флаг выключен |

## HOC vs другие способы переиспользования

| Подход | Что переиспользует | Когда уместен |
| --- | --- | --- |
| HOC | логику + внедрение props | обёртка чужого/готового компонента |
| Custom hook | только логику | свой код на функциях |
| Render prop / children-as-function | логику через колбэк `(api) => UI` | гибкий UI у вызывающего |
| Обычная композиция | разметку (`Layout` + `children`) | структура экрана |

```jsx
// хук — та же идея «добавить поведение», без смены типа компонента
function useAuth() {
  return useContext(AuthContext);
}

function Page() {
  const user = useAuth();
  if (!user) return <Login />;
  return <Dashboard user={user} />;
}
```

## Правила, чтобы не сломать дерево

1. **Не создавать HOC в теле render** — тип компонента должен быть стабильным между рендерами.
2. **Пробрасывать props** — иначе оборачиваемый «глухой» к `className`, `onClick` и т.д.
3. **Refs** — `React.forwardRef` + передать `ref` в `Wrapped`, если нужна ссылка на DOM/класс.
4. **Композиция** — `compose(withA, withB)(Comp)` или `withA(withB(Comp))`; порядок важен.

## Антипаттерн

```jsx
// плохо: на каждом render родителя — новый класс/функция компонента
function Parent() {
  const Enhanced = withX(Child);
  return <Enhanced />;
}
```

State `Child` будет сбрасываться, эффекты — перезапускаться как при полном remount.

---

# 6. Ссылки

- [React — Higher-Order Components (legacy)](https://legacy.reactjs.org/docs/higher-order-components.html)
- [React — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React — forwardRef](https://react.dev/reference/react/forwardRef)
