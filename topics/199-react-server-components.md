# 1. Тема

**Server components**

---

# 2. Главное в одну фразу

Server Components рисуют страницу на сервере и не едут в клиентский JS; в бандл и гидратацию попадают только островки с `'use client'`.

---

# 3. Суть

> Представьте каталог: список товаров можно собрать на сервере (база, секреты, тяжёлый код), а в браузер отдать уже готовую разметку — без JS этих компонентов. **Server Components** как раз про это: по умолчанию компонент живёт на сервере; интерактивные куски помечают `'use client'` и оставляют «островами» внутри серверной рамы.
>
> Зачем: в обычном CSR весь компонентный код уезжает в бандл, даже если он только показывает список из API. RSC переносит fetch и тяжёлую логику на сервер, уменьшает JS на клиенте и держит ключи и SQL там, куда браузер не смотрит.
>
> Как: файл без директивы — Server Component (`async`, прямой доступ к БД). Файл с `'use client'` — Client Component (хуки, клики, `window`). Сервер отдаёт не исходники серверных файлов, а **Flight** — компактное описание дерева плюс ссылки «здесь нужен client-модуль». Клиент рисует статику и догружает JS только для островов.
>
> Ловушка: это не «SSR под другим именем». SSR отдаёт HTML и обычно гидратирует всё дерево; RSC — другая модель: серверные части **не** гидратируются, `useState` / `useEffect` в них запрещены. Client не импортирует Server (только наоборот или через `children`). Нужен RSC-рантайм фреймворка (Next.js App Router и др.), не «просто React в Vite».

---

# 4. Самое главное запомнить

- По умолчанию компонент **серверный**; `'use client'` — граница клиентского островка.
- Server Component: можно `async` и БД на сервере; нельзя `useState`, `useEffect`, `onClick`.
- Client Component: хуки и события — попадает в бандл и гидратируется.
- Server может импортировать Client; Client не может импортировать Server — серверный UI передают как `children`.
- Props с сервера на клиент — только сериализуемые данные (как JSON), не функции.
- В браузер уходит Flight (описание дерева), не исходники Server Components.
- RSC ≠ SSR: при SSR гидратируют всё интерактивное дерево; при RSC — только `'use client'`.

---

# 5. Описание

```text
запрос
  → сервер: async Page + ProductList (fetch БД)
  → Flight: серверные узлы + «здесь client: AddToCart»
  → браузер: разметка списка сразу
       + JS только для острова AddToCart
       + гидратация только островка

SSR для контраста:
  → HTML всего App
  → hydrateRoot всего интерактивного дерева
```

Главный образ: **страница — серверная рама**, кнопки и формы со состоянием — **острова** внутри неё. Список каталога может не стоить ни байта клиентского JS; кнопка «В корзину» — да.

## Server и Client

| | Server Component | Client Component |
| --- | --- | --- |
| Директива | нет (по умолчанию) | `'use client'` в начале файла |
| Где выполняется | только сервер | часто и SSR-pass, и браузер |
| JS в бандле | не попадает | попадает |
| Данные / секреты | БД, ключи на сервере | код виден клиенту |
| Хуки и клики | нет | да |

```tsx
// app/products/page.tsx — Server Component
import { ProductList } from './ProductList';
import { AddToCart } from './AddToCart';

const ProductsPage = async () => {
  const products = await db.products.findMany(); // ← только сервер

  return (
    <main>
      <h1>Каталог</h1>
      <ProductList items={products} />
      <AddToCart productId={products[0].id} /> {/* ← остров */}
    </main>
  );
};

export default ProductsPage;
```

```tsx
// ProductList.tsx — без 'use client'
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
// AddToCart.tsx
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

`ProductList` и страница не раздувают бандл. `AddToCart` — да: там состояние и клик.

## Граница импорта

Client **нельзя** импортировать Server — иначе серверный код потянется в бандл.

Плохо: `'use client'` + `import { HeavyChart } from './HeavyChart'` (если chart серверный).

Хорошо — сервер оборачивает клиентскую оболочку и передаёт уже отрендеренный UI как `children`:

```tsx
// ServerWrapper.tsx
import { ClientShell } from './ClientShell';
import { HeavyChart } from './HeavyChart';

export const ServerWrapper = () => (
  <ClientShell>
    <HeavyChart /> {/* ← результат с сервера внутри клиента */}
  </ClientShell>
);
```

```tsx
'use client';

import { useState, type ReactNode } from 'react';

type Props = { children: ReactNode };

export const ClientShell = ({ children }: Props) => {
  const [open, setOpen] = useState(true);
  return open ? <div>{children}</div> : null;
};
```

## Flight и островки

Сервер не шлёт исходники Server Components. Он шлёт **Flight**: текст, props, указатели «подгрузи client-модуль X». Браузер сразу видит статику и отдельно качает JS для островов.

## RSC и SSR

Тема **SSR** — про HTML в первом ответе и `hydrateRoot` на уже существующем DOM. RSC — про то, **какой код** остаётся на сервере и **какой** едет в бандл. Next.js App Router часто совмещает оба: серверные компоненты в потоке, острова гидратируются по мере приезда чанков.

| | SSR (классика) | RSC |
| --- | --- | --- |
| В браузер | HTML + JS дерева | Flight + JS только client-частей |
| Гидратация | интерактивное дерево | только Client Components |
| Данные | часто дублируют server/client | чаще один раз на сервере |

## Типичные ошибки

```tsx
// Server Component — useState запрещён
export const Broken = () => {
  const [n, setN] = useState(0); // ← нужен 'use client'
  return <button type="button" onClick={() => setN(n + 1)}>{n}</button>;
};
```

С сервера на клиент нельзя передать функцию в props — только данные, похожие на JSON. `process.env.DB_URL` в Server Component нормален; в `'use client'` без публичного префикса попадёт в бандл.

---

# 6. Ссылки

- [React — Server Components](https://react.dev/reference/rsc/server-components)
- [React — `'use client'`](https://react.dev/reference/rsc/use-client)
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [RFC — React Server Components](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
