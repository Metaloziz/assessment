# 1. Тема

**Архитектура Fiber**

---

# 2. Главное в одну фразу

Fiber — как React держит каждый кусок UI карточкой в связном списке и обрабатывает обновление по шагам: сначала черновик без записи в DOM, потом короткий commit на экран.

---

# 3. Суть

> **Fiber** — внутренняя «карточка работы» React на каждый узел UI (компонент или `div`). У карточки есть связи: вниз к первому ребёнку (`child`), вправо к соседу (`sibling`), вверх к родителю (`return`). Reconciler идёт по этим стрелкам **по одной карточке**, а не ныряет рекурсией в глубокий стек JS — поэтому между карточками можно **остановиться** и отдать кадр браузеру.
>
> Зачем: длинный список или тяжёлый экран не должны намертво блокировать ввод. React сначала собирает **черновик** дерева в памяти (фаза **render**), а в браузер пишет только потом — коротким синхронным проходом (**commit**). Пока идёт render, на экране ещё старая картинка; это ожидаемо.
>
> Как: планировщик (**Scheduler**) ставит обновления в очередь с приоритетом: клик и ввод важнее фоновой смены вкладки. Срочное может **прервать** незавершённый render — черновик выбрасывают и начинают заново с актуальным state. Пара `current` / `workInProgress` (`alternate`) — «что на экране» и «что рисуем сейчас».
>
> Ловушка: Fiber — не «ещё один Virtual DOM» и не сами правила `type`/`key` (это reconciliation). Fiber отвечает за **когда** и **по каким шагам** крутить работу и **когда** трогать DOM. `startTransition` / `useDeferredValue` — ручки поверх этой модели, не отдельный движок.

---

# 4. Самое главное запомнить

- Один Fiber ≈ один узел работы (компонент или host-элемент), не «один DOM на всё приложение».
- Обход: вниз `child` → вправо `sibling` → вверх `return`; цикл итеративный, стек JS не растёт с глубиной.
- **Render** можно прервать и отложить; **commit** короткий и синхронный — его не режут на кадры.
- В DOM, ref и layout-эффекты пишут **только в commit**, не во время render.
- Два дерева: **current** (на экране) и **workInProgress** (черновик); после commit черновик становится current.
- Reconciliation (UPDATE / MOVE / REPLACE) живёт **внутри** render; Fiber добавляет очередь, приоритеты и паузы между узлами.
- `startTransition` помечает обновление как «можно подождать» — срочный ввод может вытеснить его черновик.

---

# 5. Описание

```text
setState / dispatch
        ↓
  Scheduler → приоритет (lane)
        ↓
  render (можно остановиться)
    карточка → child → sibling → return
    reconcile, hooks — DOM не трогаем
        ↓
  commit (синхронно)
    запись в DOM → layout → useEffect
        ↓
  current ← workInProgress
```

## Карточка Fiber

Каждый узел UI — объект со связями (схема полей, не публичный API):

```js
const fiber = {
  type: 'div',
  key: null,
  pendingProps: { className: 'card' },
  stateNode: domNode,    // у host — HTMLElement
  child: null,           // первый ребёнок
  sibling: null,         // сосед справа
  return: parentFiber,   // родитель
  alternate: otherTree,  // current ↔ workInProgress
  flags: /* Placement | Update | … */,
};
```

`alternate` — **два буфера**: пока собирают черновик, пользователь видит `current`. После удачного commit указатели меняются местами — новый экран появляется целиком, без «полусобранного» DOM.

## Work loop: по одной карточке

```text
beginWork(fiber)  →  спуститься к child
  …
completeWork      →  нет ребёнка? идти к sibling
  …
  нет sibling?    →  вернуться к return (родитель)
```

Между шагами concurrent-режим спрашивает: «есть ли ещё время в кадре / не пришло ли срочное?» → можно **yield** (отдать управление браузеру), сохранив `workInProgress`.

## Render и commit

| Фаза | Что происходит | DOM |
| --- | --- | --- |
| **Render** | вызовы компонентов, diff, план `flags`, часть hooks | **не меняется** |
| **Commit** | применить `flags`, ref, `useLayoutEffect`, затем passive | **меняется** |

Пока render долгий, UI может показывать **старое** состояние — это не «завис React», а разделение фаз. Новая картинка выходит пакетом на commit.

## Приоритет и прерывание

```jsx
// можно отложить / прервать
startTransition(() => setTab(next));

// ввод обычно срочнее фонового списка
<input onChange={(e) => setQuery(e.target.value)} />
```

Срочный lane переключает work loop: незавершённый render большого списка **не доводят до commit** — начинают reconcile с актуальным state. Иначе пользователь видел бы устаревший или «полуготовый» черновик.

## Связь с соседними темами

| Слой | Роль |
| --- | --- |
| Virtual DOM / elements | JS-снимок после `render()` |
| Reconciliation | Правила UPDATE / MOVE / REPLACE по `type` и `key` |
| **Fiber** | Единица работы, обход, паузы, `alternate` |
| Scheduler | Приоритет и когда продолжить цикл |
| Commit | Единственное место записи в DOM |

## Что проверить в коде

- Тяжёлый список без `memo` + ввод в поле: с `startTransition` на смене вкладки ввод отзывчивее, чем при полностью синхронном блокирующем render.
- `useLayoutEffect` vs `useEffect`: layout — в commit **до** paint; effect — после, уже на отрисованном кадре.
- Strict Mode (dev): двойной вызов render — проверка побочных эффектов, не «два commit в production».

---

# 6. Ссылки

- [React — Render and Commit](https://react.dev/learn/render-and-commit)
- [React blog — React Fiber Architecture (2017)](https://github.com/acdlite/react-fiber-architecture) — мотивация и модель
- [React — `startTransition`](https://react.dev/reference/react/startTransition)
- [React — `useDeferredValue`](https://react.dev/reference/react/useDeferredValue)
- [React (legacy) — Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html) — эвристики diff внутри render
- [React RFC — React 18](https://github.com/reactjs/rfcs/blob/main/text/0212-react-18.md) — concurrent поверх Fiber
