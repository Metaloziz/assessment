# 1. Тема

**Архитектура Fiber**

---

# 2. Главное в одну фразу

Fiber — внутренняя единица работы React: каждый узел UI описан объектом со связями `child` / `sibling` / `return`, а reconciler обходит их в цикле, который можно прервать и позже продолжить, прежде чем синхронно применить правки к DOM на этапе commit.

---

# 3. Суть

> **Fiber** — не «ещё один Virtual DOM», а **структура данных и планировщик** поверх дерева элементов. Каждый узел UI — объект `Fiber` с типом, props, очередью обновлений и **связным списком** указателей: `child` (первый ребёнок), `sibling` (сосед справа), `return` (родитель). Так React обходит дерево без рекурсивного стека и может **остановиться между узлами**.
>
> Обновление делится на **две фазы**. **Render** (reconcile): вызовы компонентов, diff, построение «черновика» дерева — **без** записи в DOM; работа идёт по fiber-узлам и может **yield** (отдать кадр браузеру). **Commit**: короткий синхронный проход — мутации DOM, ref, layout effects, `useLayoutEffect`; прервать commit нельзя.
>
> Планировщик (**Scheduler**) назначает приоритет (lanes): ввод пользователя и анимации важнее фонового списка. Срочное обновление может **прервать** незавершённый render и начать reconcile заново с новым снимком; устаревший черновик отбрасывается (`alternate` хранит пару current/workInProgress).
>
> Ловушка: Fiber ≠ reconciliation (правила `type`/`key` те же) и ≠ «Virtual DOM» (снимок элементов). Fiber отвечает за **когда и как по шагам** выполнять reconcile и **когда** писать в DOM; `startTransition` / `useDeferredValue` — API поверх этой модели, а не «магическое ускорение».

---

# 4. Самое главное запомнить

- Один **Fiber** = один узел работы (компонент или host `div`/`span`), не «один DOM-узел на всё приложение».
- Обход дерева: вниз по `child`, вверх по `return`, вправо по `sibling` — **итеративный** work loop, не глубокий стек.
- **Render** можно прервать; **commit** — атомарный и синхронный для браузера.
- DOM, ref и layout-эффекты меняются **только в commit**, не во время render.
- Два дерева: **current** (на экране) и **workInProgress** (черновик); после commit черновик становится current.
- Reconciliation (UPDATE/MOVE/REPLACE) живёт **внутри** render-фазы; Fiber добавляет очередь, приоритеты и yield между узлами.

---

# 5. Описание

```text
update (setState / dispatch)
        ↓
  Scheduler → priority / lane
        ↓
  render phase (может yield)
    work loop: fiber → child → sibling → return
    reconcile, hooks, memo — DOM не трогаем
        ↓
  commit phase (синхронно)
    mutation → layout → passive (useEffect)
        ↓
  current ← workInProgress
```

## Fiber-узел (упрощённо)

```js
// схема полей, не публичный API
const fiber = {
  type: 'div',           // string | function | null
  key: null,
  pendingProps: { className: 'card' },
  stateNode: domNode,    // у host-компонента — HTMLElement
  child: null,           // первый ребёнок
  sibling: null,         // следующий брат
  return: parentFiber,
  alternate: otherTree,  // current ↔ workInProgress
  flags: /* Placement | Update | Deletion … */,
};
```

`alternate` — **double buffering**: пока идёт render, на экране остаётся `current`, черновик собирается в `workInProgress`. После успешного commit указатели меняются местами.

## Work loop

Reconciler не рекурсирует «вглубь стека JS» на всё дерево — он крутит цикл «один fiber за шаг»:

```text
beginWork(fiber)  →  descend to child
  …
completeWork    →  if no child, go sibling
  …
  if no sibling → return to parent.return
```

Между итерациями concurrent-режим проверяет: «есть ли время в кадре / пришло ли срочное обновление?» → **yield**, сохранить `workInProgress` и вернуть управление браузеру.

## Render vs Commit

| Фаза | Что происходит | DOM |
| --- | --- | --- |
| **Render** | `render` компонентов, diff, план `flags`, hooks (часть) | **не меняется** |
| **Commit** | применить `flags`, ref, `useLayoutEffect`, затем passive effects | **меняется** |

Поэтому во время долгого render UI может ещё показывать **старое** состояние — это ожидаемо, не «завис React». Новая картинка появляется одним commit-пакетом (или несколькими commit при streaming SSR — отдельная тема).

## Приоритет и прерывание

```jsx
// низкий приоритет — можно отложить / прервать
startTransition(() => setTab(next));

// ввод — обычно срочнее фонового списка
<input onChange={(e) => setQuery(e.target.value)} />
```

Срочное обновление (клик, ввод) получает более высокий lane → Scheduler **переключает** work loop на новую задачу; незавершённый render большого списка **не доводят до commit** и начинают reconcile с актуальным state.

## Связь с соседними темами

| Слой | Роль |
| --- | --- |
| Virtual DOM / elements | JS-снимок после `render()` |
| Reconciliation | Правила UPDATE / MOVE / REPLACE по `type` и `key` |
| **Fiber** | Единица работы, обход, прерывания, `alternate` |
| Scheduler | Приоритет, когда продолжить work loop |
| Commit | Единственное место записи в DOM |

## Что проверить в коде

- Долгий render (тяжёлый список без `memo`) + ввод в поле: при concurrent UI ввода не должен «залипать» так же, как при синхронном блокирующем render (сравнить с/без `startTransition` на смену вкладки).
- `useLayoutEffect` vs `useEffect`: layout — **до** paint в commit; effect — после, уже на отрисованном кадре.
- Strict Mode (dev): двойной invoke render — про **проверку** side effects, не про «два commit в prod».

---

# 6. Ссылки

- [React — Render and Commit](https://react.dev/learn/render-and-commit)
- [React blog — React Fiber Architecture (2017)](https://github.com/acdlite/react-fiber-architecture) — историческое описание мотивации
- [React — `startTransition`](https://react.dev/reference/react/startTransition)
- [React — `useDeferredValue`](https://react.dev/reference/react/useDeferredValue)
- [React (legacy) — Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html) — эвристики diff внутри render
- [React RFC — React 18](https://github.com/reactjs/rfcs/blob/main/text/0212-react-18.md) — concurrent features поверх Fiber
