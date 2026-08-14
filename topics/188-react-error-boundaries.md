# 1. Тема

**Предохранители**

---

# 2. Главное в одну фразу

Error Boundary — предохранитель вокруг поддерева: ловит ошибки рендера ниже себя, показывает fallback-экран и не роняет весь UI.

---

# 3. Суть

> **Error Boundary** (предохранитель) — обёртка вокруг рискованного поддерева, которая перехватывает ошибки на этапе **render** (и связанных lifecycle/constructor детей). Вместо «белого экрана» пользователь видит запасной UI, а сбой можно залогировать.
>
> Без границы необработанный throw в render часто валит дерево до корня: пропадают шапка, навигация и соседние виджеты. Предохранитель сужает зону поражения — сломался график, cabinet вокруг продолжает жить.
>
> В прикладном коде границу подключают как обёртку с `FallbackComponent` (экран ошибки) и колбэком `onError`. Удобный JSX-API даёт готовая библиотека вроде `react-error-boundary`; голым хуком поймать throw из render ребёнка нельзя.
>
> Ловушка: граница **не** ловит ошибки в обработчиках событий, в асинхронном коде (`setTimeout`, промисы), внутри самого fallback и вне React-дерева. Там — `try/catch` и обработка промисов.

---

# 4. Самое главное запомнить

- Boundary изолирует ошибки **render** в поддереве; остальной UI не обязан падать.
- `FallbackComponent` — экран ошибки / «Повторить»; `onError` — лог или репорт.
- Голым хуком поймать throw из render ребёнка нельзя — нужна обёртка-boundary (пакет или свой адаптер).
- Не ловит: event handlers, async, ошибки в самом fallback.
- Несколько границ на разных уровнях — разный радиус (страница vs виджет).
- Fallback держите простым и безопасным.

---

# 5. Описание

```text
App
 ├─ Header                 ← живёт, если граница ниже
 └─ ErrorBoundary
      ├─ ChartWidget       ← throw в render
      └─ ChartFallback     ← экран ошибки
           (без границы → падает весь App)
```

## Зачем оборачивать поддерево

Ошибка в одном виджете (чарт, карта, сторонний SDK) не должна уносить layout. Границу ставят **вокруг рискованного куста**: чем ближе к месту сбоя, тем меньше зона поражения.

## Fallback и обёртка

Экран ошибки и страница — обычные компоненты; граница подключает fallback по контракту:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

type FallbackProps = {
  error: Error;
  resetErrorBoundary: () => void;
};

export const ChartFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div role="alert" className="errorPanel">
    <h2>Не удалось загрузить график</h2>
    <p>{error.message}</p>
    <button type="button" onClick={resetErrorBoundary}>
      Повторить
    </button>
  </div>
);

export const App = () => (
  <div className="shell">
    <Header title="Cabinet" />
    <ErrorBoundary
      FallbackComponent={ChartFallback}
      onError={(err) => report(err)}
    >
      <ChartWidget explode />
    </ErrorBoundary>
  </div>
);
```

`FallbackComponent` — запасной UI. `ErrorBoundary` из пакета даёт тот же JSX-API без ручной реализации ловли.

Виджет:

```tsx
type ChartWidgetProps = { explode?: boolean };

export const ChartWidget = ({ explode = false }: ChartWidgetProps) => {
  if (explode) throw new Error('chart failed'); // ← render-phase
  return <div className="chart">OK</div>;
};
```

## Что граница не перехватывает

| Место ошибки | Ловит boundary? | Что делать |
| --- | --- | --- |
| `render` ребёнка | да | fallback + лог |
| `onClick` / handlers | нет | `try/catch` в обработчике |
| `setTimeout`, промисы | нет | `.catch` / `try/catch` в `async` |
| Ошибка внутри fallback | нет | упростить fallback или граница выше |
| Код вне React-дерева | нет | обычная обработка JS |

## Fallback и восстановление

Fallback — понятный экран: заголовок, короткое сообщение, «Повторить». Сброс = `resetErrorBoundary` (или смена `key` у границы), чтобы снова смонтировать детей.

Не кладите в fallback тяжёлую логику, которая сама может бросить.

## Несколько границ

```text
AppBoundary          ← крупный радиус
 └─ Page
      └─ WidgetBoundary  ← мелкий радиус
           └─ Chart
```

Упал `Chart` → срабатывает ближайшая граница. Соседи и шапка не затрагиваются.

---

# 6. Ссылки

- [React — Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [react-error-boundary](https://github.com/bvaughn/react-error-boundary) — обёртка с `FallbackComponent`
- [React Blog — Error Handling in React 16](https://legacy.reactjs.org/blog/2017/07/26/error-handling-in-react-16.html)
- [MDN — ARIA: alert role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/alert_role)
