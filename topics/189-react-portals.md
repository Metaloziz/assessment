# 1. Тема

**Порталы**

---

# 2. Главное в одну фразу

Portal — рендер детей в другой DOM-узел, при этом в React-дереве они остаются детьми родителя (события и контекст — как у обычных детей).

---

# 3. Суть

> **Portal** (`createPortal(children, domNode)`) позволяет отрисовать React-узлы *в другом месте DOM*, не разрывая связь с родителем в дереве компонентов. Визуально модалка может жить в `#modal-root` у `body`, а логически — оставаться потомком кнопки или страницы.
>
> Зачем: родители с `overflow: hidden`, `transform`, низким `z-index` и сложным stacking context обрезают или перекрывают всплывающие слои. Модалки, тултипы, дропдауны и тосты часто нужно «вынести» из карточки наружу, иначе UI ломается.
>
> Как: вызываете `createPortal(jsx, document.getElementById('modal-root'))` из `render` / возврата компонента. React монтирует разметку в указанный DOM-узел, но **события всплывают по React-дереву** (к родителю портала), а не по DOM-предкам целевого контейнера. Context тоже берётся от React-родителя.
>
> Ловушка: портал не «обходит» React — только DOM. Фокус, `aria-modal`, закрытие по Escape и клик снаружи остаются вашей задачей. Несколько порталов в один контейнер — обычные соседи в DOM; порядок и `z-index` нужно проектировать явно.

---

# 4. Самое главное запомнить

- `createPortal(child, container)` — UI в `container`, React-родитель — прежний.
- Типичные цели: `#modal-root`, `document.body`, отдельный host для тултипов.
- События всплывают по **React**-дереву, не по DOM-предкам портала.
- Context, Error Boundary выше по React — работают как для обычного ребёнка.
- Спасает от `overflow` / stacking parent; a11y и фокус — отдельно.
- Портал ≠ отдельное React-приложение: один reconciler, те же обновления.

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

```jsx
import { createPortal } from 'react-dom';

function Modal({ children }) {
  const host = document.getElementById('modal-root');
  if (!host) return null;
  return createPortal(
    <div className="overlay" role="dialog">{children}</div>,
    host, // ← DOM-цель
  );
}
```

В HTML заранее:

```html
<div id="root"></div>
<div id="modal-root"></div>
```

Второй контейнер — частый паттерн: не смешивать оверлеи с основным деревом приложения.

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
