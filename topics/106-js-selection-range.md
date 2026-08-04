# 1. Тема

**Selection и Range**

---

# 2. Главное в одну фразу

`Selection` представляет текущее выделение пользователя, а `Range` — программно заданный непрерывный диапазон точек в DOM.

---

# 3. Суть

> Через `window.getSelection()` получают объект выделения и его ranges; `document.createRange()` создаёт диапазон для чтения, вставки или выделения DOM-фрагмента. Границы range состоят из узла и смещения, поэтому при работе с редакторами нужно учитывать текстовые и вложенные узлы, а не только HTML-элементы.

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
