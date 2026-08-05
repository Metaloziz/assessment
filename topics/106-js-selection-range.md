# 1. Тема

**Selection и Range**

---

# 2. Главное в одну фразу

`Selection` представляет текущее выделение пользователя, а `Range` — программно заданный непрерывный диапазон точек в DOM.

---

# 3. Суть

> `Selection` описывает выделение, которое сейчас сделал пользователь, а `Range` — участок DOM между двумя границами. Границей служат узел и смещение внутри него, а не просто позиции в HTML-строке.
>
> Эти API нужны редактору, кнопке «копировать выделенное» или вставке фрагмента в точку курсора. Они позволяют работать с реальной структурой документа, не разбирая `innerHTML`.
>
> Выделение получают через `window.getSelection()`, проверяют `rangeCount` и берут диапазон. Новый `Range` создают через `document.createRange()`, задают ему границы и добавляют в `Selection`. После полной замены DOM старые ссылки на узлы могут потерять смысл, поэтому позицию курсора для редактора часто сохраняют отдельно.

---

# 4. Самое главное запомнить

- `Selection` может содержать несколько range, поэтому проверяют `rangeCount`.
- `anchor` и `focus` отражают направление пользовательского выделения; они не обязаны совпадать с началом и концом range.
- `selectNode()` включает сам элемент, `selectNodeContents()` — только его содержимое.
- `cloneContents()` возвращает `DocumentFragment`; `extractContents()` ещё и вырезает фрагмент.
- `surroundContents()` бросит ошибку, если range частично пересекает не-текстовый узел.

---

# 5. Описание

Выделить содержимое элемента можно так:

```js
const element = document.querySelector('#article');
const range = document.createRange();
range.selectNodeContents(element);

const selection = window.getSelection();
selection.removeAllRanges();
selection.addRange(range);
```

В редакторе часто нужно сохранить позицию курсора до обновления DOM и восстановить её после. `Range` хранит ссылки на текущие узлы: если заменить их через `innerHTML`, старый range может стать бесполезен. Лучше обновлять DOM минимально или сохранять логическую позицию отдельно.

```js
const selection = window.getSelection();
if (selection?.rangeCount) {
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  console.log(fragment.textContent);
}
```

Не используйте `document.execCommand('copy')` в новом коде: для буфера обмена предпочтительнее `navigator.clipboard`, а `Selection` оставьте для определения выбранного содержимого.

---

# 6. Ссылки

- [MDN: Selection](https://developer.mozilla.org/ru/docs/Web/API/Selection)
- [MDN: Range](https://developer.mozilla.org/ru/docs/Web/API/Range)
- [javascript.info: Range и Selection](https://javascript.info/selection-range)
