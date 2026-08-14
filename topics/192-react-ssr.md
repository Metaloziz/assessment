# 1. Тема

**SSR**

---

# 2. Главное в одну фразу

SSR рендерит React-дерево в HTML на сервере, чтобы браузер сразу показал разметку, а `hydrateRoot` затем навешивает обработчики на уже существующий DOM.

---

# 3. Суть

> **SSR** (server-side rendering) — сервер вызывает React (`renderToString` или поток `renderToPipeableStream`) и отдаёт HTML с разметкой приложения, а не пустой `#root`. Браузер рисует контент до загрузки клиентского бандла: быстрее первая отрисовка, поисковик и шаринг ссылки видят текст, а не оболочку.
>
> Зачем: в CSR пользователь ждёт JS, потом React строит дерево в браузере. На медленной сети это пустой экран. SSR даёт читаемую страницу в первом ответе; клики и `useState` оживают после гидратации.
>
> Как: на сервере рендерят тот же `App`, HTML кладут в `#root`. Клиентский вход — `hydrateRoot`: React сверяет дерево с DOM и вешает listeners, не собирая узлы с нуля. Поток позволяет слать HTML кусками, не дожидаясь всего дерева.
>
> Ловушка: сервер и клиент должны выдать **одинаковую** разметку. `Date.now()`, `window`, разный locale — hydration mismatch: предупреждение и часто клиентский перерендер поверх HTML. SSR не подменяет данные: без fetch на сервере в HTML будет пустышка. Это не SSG и не Server Components.

---

# 4. Самое главное запомнить

- CSR: пустой `#root` + `createRoot`. SSR: HTML в ответе + `hydrateRoot`.
- `renderToString` — целиком в строку; `renderToPipeableStream` — поток кусков.
- Гидратация навешивает обработчики на существующий DOM, а не рисует страницу «с белого листа».
- HTML виден до JS; клики работают только после `hydrateRoot`.
- Расхождение сервер/клиент (`Date`, `window`, невалидный HTML) → hydration mismatch.
- SSR ≠ SSG (HTML на этапе сборки) и ≠ RSC (отдельная модель серверных компонентов).

---

# 5. Описание

```text
CSR:
  запрос → HTML: <div id="root"></div>
       → JS → createRoot().render(App) → UI + обработчики

SSR:
  запрос → React на сервере → HTML с разметкой App
       → браузер рисует HTML (ещё без listeners)
       → JS → hydrateRoot(App) → те же узлы + обработчики
```

## CSR и SSR

**CSR** (client-side rendering): сервер отдаёт оболочку и скрипт. Пока бандл не выполнился, в `#root` пусто (или скелетон без React). Потом `createRoot` монтирует дерево с нуля.

**SSR**: сервер уже построил HTML того же дерева. Пользователь читает заголовок и цену сразу. Интерактивность — второй шаг, когда доехал JS и прошла гидратация.

Типичный каркас ответа:

```html
<div id="root"><!-- сюда HTML от renderToString --></div>
<script type="module" src="/entry-client.js"></script>
```

## `renderToString` и гидратация

```tsx
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

const html = renderToString(<App />);
// сервер вставляет html в #root

hydrateRoot(document.getElementById('root')!, <App />);
```

`hydrateRoot` **не** заменяет `createRoot` «на всякий случай»: на пустом корне гидратировать нечего, на SSR-HTML `createRoot` выбросит серверную разметку и нарисует заново (лишняя работа и мигание).

`renderToString` удобен для коротких страниц и примеров. Для продакшена чаще поток: `renderToPipeableStream` (Node) или `renderToReadableStream` (Web Streams) — HTML уходит кусками, оболочка не ждёт самого медленного виджета.

## Hydration mismatch

Серверный HTML и клиентский `render` должны совпасть. Иначе React пишет предупреждение и часто перерисовывает поддерево на клиенте — выигрыш SSR по этому куску теряется.

```tsx
export const Price = () => {
  const label =
    typeof window === 'undefined'
      ? '4 290 ₽'
      : `4 290 ₽ · ${window.innerWidth}px`; // ← разный HTML
  return <p>{label}</p>;
};
```

Частые источники: `Date.now()`, `Math.random()`, `window` / `document`, несовпадение locale, невалидный HTML (например `<p>` внутри `<p>`), разный набор CSS-классов.

Браузерные API читают в `useEffect` (после гидратации) или передают с сервера одним и тем же значением.

## SSR, SSG и RSC

| Режим | Когда строится HTML | Кто рисует UI |
| --- | --- | --- |
| CSR | в браузере после JS | `createRoot` |
| SSR | на каждый запрос, на сервере | HTML + `hydrateRoot` |
| SSG | заранее, на сборке | статический HTML (+ опционально hydrate) |
| RSC | сервер отдаёт компоненты без клиентского JS на статику | другая модель, не «просто SSR» |

Фреймворки (Next.js и др.) прячут `renderToPipeableStream` / роутинг. Механизм тот же: HTML в ответе, затем гидратация клиентских островов.

---

# 6. Ссылки

- [React — `renderToString`](https://react.dev/reference/react-dom/server/renderToString)
- [React — `renderToPipeableStream`](https://react.dev/reference/react-dom/server/renderToPipeableStream)
- [React — `hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot)
- [React — `createRoot`](https://react.dev/reference/react-dom/client/createRoot)
- [web.dev — Rendering on the Web](https://web.dev/articles/rendering-on-the-web)
