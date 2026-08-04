# 1. Тема

**Делегирование событий**

---

# 2. Главное в одну фразу

Делегирование назначает обработчик общему предку и определяет нужный дочерний элемент по всплывшему событию.

---

# 3. Суть

> Большинство DOM-событий всплывает от `event.target` к предкам, поэтому один обработчик обслуживает список и элементы, добавленные позже. Надёжная реализация использует `closest()`, проверяет принадлежность найденного элемента контейнеру и не полагается на то, что `target` уже является нужной кнопкой.

---

# 4. Самое главное запомнить

- `event.target` — исходный узел, `event.currentTarget` — элемент с обработчиком.
- `closest(selector)` учитывает клики по вложенным иконкам и тексту.
- Не все события всплывают: например, используйте `focusin`/`focusout` вместо `focus`/`blur`.
- `stopPropagation()` может не дать событию дойти до делегата.
- Для Shadow DOM нужно учитывать `event.composedPath()` и флаг `composed`.

---

# 5. Описание

```js
const list = document.querySelector('.todos');

list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || !list.contains(button)) return;

  const item = button.closest('[data-id]');
  if (button.dataset.action === 'remove') {
    item.remove();
  }
});
```

Один listener снижает число обработчиков и автоматически работает с динамически добавленными элементами. Однако «один listener всегда быстрее» — слишком сильное утверждение: при сложном селекторе, огромном числе событий или независимых сценариях обработчик может стать узким местом. Выбирайте ближайшего стабильного предка, а не `document`.

В React обработчик на контейнере обычно достаточен, но React SyntheticEvent — отдельный слой; базовые правила `target`, `currentTarget` и всплытия остаются применимыми.

---

# 6. Ссылки

- [MDN: Event bubbling](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling)
- [MDN: Element.closest()](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest)
