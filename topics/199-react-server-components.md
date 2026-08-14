# 1. Тема

**Server components**

---

# 2. Главное в одну фразу

Server Components выполняются только на сервере и отдают сериализованное дерево (RSC payload), а Client Components с `'use client'` по-прежнему попадают в бандл и гидратируются в браузере.

---

# 3. Суть

> **React Server Components (RSC)** — компоненты по умолчанию **серверные**: React рендерит их на сервере, читает БД и файлы напрямую, а в браузер уходит не их JS, а результат в формате Flight (сериализованное дерево + ссылки на клиентские острова). Статическая разметка и данные приезжают без лишнего бандла; интерактивность остаётся у Client Components.
>
> Зачем: в классическом CSR весь компонентный код едет в браузер, даже если он только показывает список из API. RSC переносит fetch и тяжёлую логику на сервер, уменьшает JS на клиенте и держит секреты (ключи, SQL) на сервере.
>
> Как: файл без `'use client'` — Server Component; с `'use client'` — Client Component (хуки, обработчики, браузерные API). Сервер строит дерево, сериализует его; клиент «склеивает» HTML/RSC-узлы и подгружает JS только для островов `'use client'`. Данные между ними — через props (сериализуемые) или composition (передать Client Component как `children` Server Component).
>
> Ловушка: это **не** «SSR с другим названием». SSR отдаёт HTML всего дерева и гидратирует его целиком; RSC — другая модель: серверные части не гидратируются, `useState` / `useEffect` в Server Component запрещены. Нельзя импортировать Server Component в Client — только наоборот. RSC нужен рантайм фреймворка (Next.js App Router и др.), не «просто React 19 в Vite».

---

# 4. Самое главное запомнить

- По умолчанию компонент **серверный**; `'use client'` — граница Client Component.
- Server Component: `async`, прямой доступ к БД/API, **без** `useState`, `useEffect`, обработчиков.
- Client Component: хуки, события, браузерные API — попадает в JS-бандл и гидратируется.
- Импорт: Server → Client ✓; Client → Server ✗ (передавай через `children` / props).
- Props Server → Client должны быть **сериализуемы** (JSON-подобные), не функции и не классы.
- RSC payload (Flight) — не HTML страницы; клиент собирает UI из серверных узлов + островов.
- RSC ≠ SSR: SSR гидратирует всё дерево; RSC — только `'use client'` части.

---

# 5. Описание

```text
Server Components (RSC):
  запрос → сервер: async Page + ProductList (fetch БД)
       → RSC payload (Flight): серверные узлы + ссылки на client-модули
       → браузер: HTML/стрим + JS только для 'use client' (AddToCart)
       → гидратация только Client Components

Классический SSR (для контраста):
  запрос → renderToString(<App />) → HTML всего дерева
       → hydrateRoot(<App />) → listeners на всём интерактивном дереве
```

## Server vs Client

| | Server Component | Client Component |
| --- | --- | --- |
| Директива | нет (по умолчанию) | `'use client'` в начале файла |
| Где выполняется | только сервер | сервер (SSR pass) + браузер |
| JS в бандле | не попадает | попадает |
| `async` / `await fetch` | да | только в event handlers / effects |
| `useState`, `useEffect` | нет | да |
| `onClick`, refs | нет | да |
| Секреты / БД | да, на сервере | нет — код виден клиенту |

## Пример разделения

```tsx
// app/products/page.tsx — Server Component
import { ProductList } from './ProductList';
import { AddToCart } from './AddToCart';

export default async function ProductsPage() {
  const products = await db.products.findMany(); // ← только на сервере

  return (
    <main>
      <h1>Каталог</h1>
      <ProductList items={products} />
      <AddToCart productId={products[0].id} /> {/* ← client-остров */}
    </main>
  );
}
```

```tsx
// ProductList.tsx — Server Component
type Props = { items: Array<{ id: string; title: string; price: number }> };

export const ProductList = ({ items }: Props) => (
  <ul>
    {items.map((p) => (
      <li key={p.id}>
        {p.title} — {p.price} ₽
      </li>
    ))}
  </ul>
);
```

```tsx
// AddToCart.tsx — Client Component
'use client';

import { useState } from 'react';

type Props = { productId: string };

export const AddToCart = ({ productId }: Props) => {
  const [added, setAdded] = useState(false);

  return (
    <button type="button" onClick={() => setAdded(true)}>
      {added ? 'В корзине' : 'Добавить'}
    </button>
  );
};
```

`ProductList` и `page.tsx` не увеличивают клиентский бандл. `AddToCart` — да: там `useState` и `onClick`.

## Граница импорта и composition

Client Component **не может** импортировать Server Component — иначе серверный код потянулся бы в бандл.

Плохо:

```tsx
'use client';
import { ServerOnlyChart } from './ServerOnlyChart'; // ← ошибка
```

Хорошо — передать серверный UI как `children`:

```tsx
// ServerWrapper.tsx
import { ClientShell } from './ClientShell';
import { HeavyChart } from './HeavyChart';

export const ServerWrapper = () => (
  <ClientShell>
    <HeavyChart /> {/* ← сервер отрендерил, клиент получил результат */}
  </ClientShell>
);
```

```tsx
'use client';
type Props = { children: React.ReactNode };

export const ClientShell = ({ children }: Props) => {
  const [open, setOpen] = useState(true);
  return open ? <div>{children}</div> : null;
};
```

## RSC payload и «острова»

Сервер не шлёт исходники Server Components в браузер. Он шлёт **Flight** — компактное описание дерева: текстовые узлы, props, указатели «здесь нужен client-модуль X». Браузер рисует статику сразу и догружает JS для `'use client'` модулей.

Образ **островов**: страница — серверная рама; кнопки, формы, виджеты с состоянием — client-острова внутри неё.

## RSC и SSR

| | SSR (классика) | RSC |
| --- | --- | --- |
| Что уезжает в браузер | HTML + JS **всего** дерева | RSC payload + JS **только** client-частей |
| Гидратация | всё интерактивное дерево | только Client Components |
| Fetch данных | часто дублируют (server + client) | чаще один раз на сервере в Server Component |
| Нужен фреймворк | можно вручную (`renderToString`) | нужен RSC-рантайм (Next.js App Router…) |

Next.js App Router совмещает RSC и streaming SSR: серверные компоненты в потоке, client-острова гидратируются по мере приезда чанков.

## Типичные ошибки

```tsx
// Server Component — useState запрещён
export const Broken = () => {
  const [n, setN] = useState(0); // ← ошибка сборки / рантайма
  return <button onClick={() => setN(n + 1)}>{n}</button>;
};
```

```tsx
// Несериализуемый prop Server → Client
'use client';
export const Client = ({ onSave }: { onSave: () => void }) => …;

// Server parent не может передать функцию — только JSON-подобные данные
```

Секреты: `process.env.DB_URL` в Server Component — нормально; в `'use client'` — попадёт в бандл, если не через публичный префикс с осознанным риском.

---

# 6. Ссылки

- [React — Server Components](https://react.dev/reference/rsc/server-components)
- [React — `'use client'`](https://react.dev/reference/rsc/use-client)
- [React — Server Actions](https://react.dev/reference/rsc/server-actions)
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [RFC — React Server Components](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
