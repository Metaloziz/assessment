# 1. Тема

**Порталы**

---

# 2. Главное в одну фразу

Portal рисует разметку в другом месте DOM, но в React она остаётся ребёнком того же родителя — события и контекст идут как обычно.

---

# 3. Суть

> **Portal** (`createPortal(children, domNode)`) — способ «вынести» кусок UI в другой DOM-узел, не разрывая связь с родителем в дереве компонентов. Модалка может жить в `#modal-root` рядом с `body`, а логически оставаться потомком кнопки или карточки.
>
> Зачем: у карточки часто стоит `overflow: hidden`, `transform` или низкий `z-index`. Оверлей внутри такой карточки обрежется или окажется под соседями. Модалки, тултипы и дропдауны поэтому часто рисуют снаружи — иначе интерфейс ломается.
>
> Как: из компонента вызывают `createPortal(jsx, document.getElementById('modal-root'))`. React монтирует разметку в указанный узел, но **клики всплывают по React-дереву** (к родителю портала), а не по DOM-предкам `#modal-root`. `useContext` тоже читает провайдеров выше по React.
>
> Ловушка: портал меняет только место в DOM. Фокус, `aria-modal`, Escape и клик снаружи — ваша задача. Несколько порталов в один контейнер — обычные соседи; порядок и `z-index` нужно задавать явно.

---

# 4. Самое главное запомнить

- `createPortal(child, container)` — UI в `container`, React-родитель тот же.
- Частые цели: `#modal-root`, `document.body`, отдельный host для тултипов.
- События идут по **React**-дереву, не по DOM-предкам портала.
- Context и Error Boundary выше по React работают как для обычного ребёнка.
- Спасает от `overflow` и чужого stacking; a11y и фокус — отдельно.
- Портал ≠ второе приложение: один reconciler, те же обновления.

---

# 5. Описание

```text
React-дерево:                DOM:

App                          <div id="root">
 └─ Card (overflow:hidden)     └─ Card
      └─ Modal ──portal──┐        └─ (пусто / триггер)
                         │
                         └────→  <div id="modal-root">
                                    └─ Modal overlay
```

## Зачем выносить разметку

Без портала модалка — потомок карточки. Если у карточки `overflow: hidden` или она внутри трансформированного слоя, оверлей обрежется или окажется под соседями. Портал монтирует оверлей рядом с корнем страницы, а кнопка «Открыть» остаётся в карточке.

## API

```tsx
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export const Modal = ({ children }: Props) => {
  const host = document.getElementById('modal-root');
  if (!host) return null;
  return createPortal(
    <div className="overlay" role="dialog">
      {children}
    </div>,
    host, // ← DOM-цель
  );
};
```

В HTML заранее:

```html
<div id="root"></div>
<div id="modal-root"></div>
```

Второй контейнер — частый паттерн: оверлеи не смешивают с основным деревом приложения.

## События и контекст

Клик по кнопке внутри портала всплывает к React-родителям `Modal` / `Card` / `App`, даже если в DOM между ними нет общего предка (кроме `body`). Поэтому `onClick` на предке в React может поймать событие из портала — это ожидаемо.

`useContext` внутри портала читает провайдеры **выше по React**, не «провайдеры вокруг `#modal-root`» (их там обычно нет).

## Когда портал не нужен

| Ситуация | Решение |
| --- | --- |
| Обычный блок в потоке карточки | Обычный JSX, без портала |
| Модалка / dropdown режется `overflow` | Portal в `#modal-root` |
| Нужен изолированный CSS/JS мир | iframe / другое приложение, не portal |
| Только поднять `z-index` внутри того же stacking | Иногда хватает CSS; portal — когда мешает предок |

## A11y рядом с порталом

Портал решает геометрию DOM. Для диалога обычно ещё: `role="dialog"` / `aria-modal`, ловушка фокуса, возврат фокуса на триггер, закрытие по Escape. Без этого «красивый» оверлей остаётся плохим для клавиатуры и скринридеров.

---

# 6. Ссылки

- [React — Portals](https://react.dev/reference/react-dom/createPortal)
- [React — Rendering React components into the DOM](https://react.dev/learn/importing-and-exporting-components) — контекст дерева компонентов
- [MDN — Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context)
- [MDN — `overflow`](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow)
- [WAI-ARIA — Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
