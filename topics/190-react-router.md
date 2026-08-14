# 1. Тема

**React Router · withRouter**

---

# 2. Главное в одну фразу

React Router связывает URL с деревом экранов; `withRouter` — устаревший HOC, который пробрасывал router-props в класс, сейчас вместо него хуки.

---

# 3. Суть

> **React Router** — библиотека клиентской навигации: URL (pathname, search, hash) выбирает, какой набор компонентов показать, без полной перезагрузки страницы. Корень — `BrowserRouter` / `RouterProvider`, маршруты описывают `Route`, вложенность и общий каркас — через nested routes и `Outlet`.
>
> Зачем: SPA должна уметь глубокие ссылки, кнопку «назад», закладки и разделение layout (шапка + смена только «страницы»). Без роутера приходится вручную парсить `location` и монтировать экраны — легко сломать историю браузера и вложенные URL.
>
> Как: объявляете дерево маршрутов (`Routes`/`Route` или `createBrowserRouter`), переходите через `Link` / `NavLink` / `useNavigate`, читаете параметры через `useParams` / `useSearchParams`. Дочерний маршрут рендерится в `Outlet` родителя — layout не размонтируется при смене вложенной страницы.
>
> **`withRouter`** (в классическом React Router v5) — HOC: оборачивал компонент и подмешивал `history` / `location` / `match`. В v6+ его нет: для функций — `useNavigate`, `useLocation`, `useParams`; для классов — обёртка-функция вокруг хуков или доступ через props от родителя. Путать «роутер» и «withRouter» не стоит: первое — система маршрутов, второе — один старый способ достать её API в класс.

---

# 4. Самое главное запомнить

- Роутер синхронизирует **URL ↔ дерево экранов**, не заменяет Redux/Context для бизнес-данных.
- Nested `Route` + `Outlet` — общий layout, меняется только «дыра» страницы.
- Навигация: `Link` (декларативно), `navigate()` (императивно); избегайте голого `window.location` в SPA.
- `useParams` / `useSearchParams` — динамика пути и query.
- `withRouter` — наследие v5; в современном коде — хуки или тонкая function-обёртка.
- Несколько `Routes` и index/pathless layout routes — норма; конфликт путей решает порядок и специфичность match.

---

# 5. Описание

```text
URL: /app/users/42

BrowserRouter
 └─ Route path="/app" element={<AppLayout />}     ← шапка живёт
      └─ Route path="users/:id" → Outlet           ← страница
           └─ UserPage  (params.id = "42")
```

## Каркас приложения

Типичный v6-паттерн:

```jsx
import { BrowserRouter, Routes, Route, Outlet, Link } from 'react-router-dom';

function AppLayout() {
  return (
    <>
      <nav>
        <Link to="/app">Home</Link>
        <Link to="/app/users/1">User</Link>
      </nav>
      <Outlet /> {/* ← сюда дочерний Route */}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="users/:id" element={<UserPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

`Link` меняет историю через роутер; полная перезагрузка не нужна. `NavLink` удобен для активного пункта меню.

## Параметры и навигация

```jsx
import { useParams, useNavigate } from 'react-router-dom';

function UserPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/app')}>
      Назад ({id})
    </button>
  );
}
```

Императивный `navigate` — после сабмита формы, редиректа по правам, «закрыть модалку и уйти на список».

## Data router (кратко)

`createBrowserRouter` + `RouterProvider` — тот же URL→UI, плюс loaders/actions на маршрутах. Идея та же: маршрут — единица навигации и (опционально) загрузки данных. Детали data APIs — уже следующий слой поверх этой модели.

## `withRouter` (v5) и замена

Раньше класс без прямого доступа к роутеру оборачивали так:

```jsx
// React Router v5
import { withRouter } from 'react-router-dom';

class UserBadge extends React.Component {
  render() {
    const { match, history } = this.props; // ← подмешал HOC
    return (
      <button type="button" onClick={() => history.push(`/users/${match.params.id}`)}>
        Open
      </button>
    );
  }
}

export default withRouter(UserBadge);
```

Сейчас эквивалент:

```jsx
function UserBadge() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(`/users/${id}`)}>
      Open
    </button>
  );
}
```

Если класс трогать нельзя — тонкая обёртка:

```jsx
function withRouterCompat(Component) {
  return function Wrapped(props) {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    return <Component {...props} navigate={navigate} location={location} params={params} />;
  };
}
```

Так сохраняют старый классовый UI, не тащат API v5.

## Частые ловушки

| Ловушка | Что происходит |
| --- | --- |
| Забыли `BrowserRouter` / provider | хуки роутера падают в runtime |
| `path="/users/:id"` вместо относительного в nested | match не там, где ждали |
| `window.location.href = …` | полная перезагрузка, мимо SPA-истории |
| Ждать `withRouter` в v6 «из коробки» | его нет — хуки / своя обёртка |
| Класть весь стейт приложения только в URL | URL для навигации и shareable state, не замена store |

---

# 6. Ссылки

- [React Router — Main concepts](https://reactrouter.com/en/main/start/concepts)
- [React Router — `<Outlet>`](https://reactrouter.com/en/main/components/outlet)
- [React Router — `useNavigate`](https://reactrouter.com/en/main/hooks/use-navigate)
- [React Router — `useParams`](https://reactrouter.com/en/main/hooks/use-params)
- [React Router v5 — `withRouter`](https://v5.reactrouter.com/web/api/withRouter) — исторический HOC
