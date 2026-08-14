# 1. Тема

**Фрагменты**

---

# 2. Главное в одну фразу

`Fragment` (`<>…</>` / `<Fragment>`) группирует React-детей без лишнего DOM-узла — в разметке остаются только реальные элементы.

---

# 3. Суть

> **Fragment** — способ вернуть из компонента несколько соседних узлов под одним родителем в React-дереве, не создавая обёртку в DOM. Короткая запись — `<>…</>`; полная — `<Fragment>…</Fragment>` (из `react`). В DOM дети появляются так, будто их положили прямо в родителя.
>
> Зачем: лишний `div` ломает таблицы (`tr` не может сидеть в `div` внутри `tbody`), flex/grid (лишний слой между контейнером и ячейками), семантику (`dl` ждёт прямых `dt`/`dd`) и селекторы вроде `:nth-child`. Fragment даёт «логический» корень для JSX, не добавляя узел в HTML.
>
> Как: компонент возвращает фрагмент с несколькими детьми. React знает о группировке; браузер видит только содержимое. У короткой формы `<>` **нельзя** задать `key` и атрибуты — для списка пар нужен `<Fragment key={…}>`.
>
> Ловушка: Fragment ≠ `DocumentFragment` из DOM API и ≠ Portal. Это не «невидимый div» с отступами и не способ вынести разметку в другой host. DevTools React покажет Fragment; в Elements его не будет.

---

# 4. Самое главное запомнить

- `<>…</>` / `<Fragment>` — группа детей без DOM-узла.
- Лишний `div` часто ломает таблицу, flex/grid и семантику списка определений.
- `key` и props — только у `<Fragment key={…}>`, не у `<>`.
- В списке пар (`dt`+`dd`, несколько `tr`) keyed Fragment — нормальный паттерн.
- Fragment виден в React DevTools, в DOM его нет.
- Не путать с Portal (`createPortal`) и с `document.createDocumentFragment()`.

---

# 5. Описание

```text
React-дерево:                 DOM:

Glossary                      <dl>
 └─ Fragment (прозрачный)       ├─ <dt>…</dt>
      ├─ <dt>                     └─ <dd>…</dd>
      └─ <dd>

vs обёртка:

Glossary                      <dl>
 └─ <div>  ← лишний узел         └─ <div>  ← ломает семантику / CSS
      ├─ <dt>                         ├─ <dt>
      └─ <dd>                         └─ <dd>
```

## Зачем без обёртки

Компонент часто должен вернуть **несколько** соседних элементов. JSX требует одного корня (или массива). Самый простой выход — обернуть в `div`, но тогда в DOM появляется узел, которого в дизайне и HTML-спеке не было.

Типичные места, где обёртка вредна:

| Контекст | Проблема лишнего `div` |
| --- | --- |
| `<table>` / `<tbody>` | `div` между `tbody` и `tr` — невалидная разметка |
| `display: flex` / `grid` | дети — не flex/grid-items родителя |
| `<dl>` | `dt`/`dd` должны быть прямыми детьми |
| CSS `:nth-child` | счётчик съезжает из‑за обёртки |

## Синтаксис

```jsx
import { Fragment } from 'react';

// короткая форма — без key и props
return (
  <>
    <dt>{term}</dt>
    <dd>{definition}</dd>
  </>
);

// полная — можно key
return (
  <Fragment key={id}>
    <dt>{term}</dt>
    <dd>{definition}</dd>
  </Fragment>
);
```

Обе формы — один механизм. Разница только в том, что короткая запись не принимает атрибуты.

## Списки и `key`

Когда из `map` возвращают **пару** узлов (две ячейки, `dt`+`dd`), стабильный `key` вешают на Fragment:

```jsx
function Glossary({ entries }) {
  return (
    <dl>
      {entries.map((e) => (
        <Fragment key={e.id}>
          <dt>{e.term}</dt>
          <dd>{e.definition}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

`<>` здесь не подойдёт: у короткой формы нет `key`, а без `key` у элементов массива React хуже сопоставляет узлы при вставке/перестановке.

## Чем Fragment не является

| | Fragment | Portal | DocumentFragment |
| --- | --- | --- | --- |
| Задача | несколько детей без DOM-обёртки | UI в другом DOM-host | пакетная вставка в DOM (vanilla) |
| API | `<>` / `<Fragment>` | `createPortal` | `document.createDocumentFragment()` |
| React-родитель | тот же | тот же | вне React |

Fragment не меняет место монтирования и не «прячет» узел от CSS родителя магически — он просто **не создаёт** узел.

## Когда `div` всё же уместен

Если обёртка нужна для стилей, отступов, `ref`, обработчика клика на группу или `role`/`aria-*` на контейнер — обычный элемент лучше Fragment. Fragment не принимает `className`, `onClick`, `ref` (кроме редких внутренних сценариев с полной формой без DOM-эффекта). Группировка «только для JSX» — Fragment; группировка «для браузера и CSS» — реальный тег.

---

# 6. Ссылки

- [React — `<Fragment>`](https://react.dev/reference/react/Fragment)
- [React — Returning multiple elements](https://react.dev/learn/writing-markup-with-jsx#the-rules-of-jsx) — правила JSX и корень
- [React — Rendering Lists](https://react.dev/learn/rendering-lists) — `key` у элементов массива
- [MDN — `<dl>`: The Description List element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl)
- [MDN — DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment) — не путать с React Fragment
