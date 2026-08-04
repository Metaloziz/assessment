# 1. Тема

**Всплытие и погружение событий**

---

# 2. Главное в одну фразу

DOM-событие проходит путь от `document` к цели и обратно, а обработчик можно поставить на нужной фазе.

---

# 3. Суть

> При клике браузер сначала идёт по дереву DOM вниз (capturing), обрабатывает целевой элемент, затем обычно поднимается вверх (bubbling). По умолчанию `addEventListener` слушает всплытие.

---

# 4. Самое главное запомнить

- Порядок фаз: `capturing → target → bubbling`.
- `event.target` — элемент, где произошло событие; `event.currentTarget` — элемент с текущим обработчиком.
- `{ capture: true }` включает обработчик на фазе погружения.
- `stopPropagation()` не отменяет другие обработчики на том же элементе; для этого есть `stopImmediatePropagation()`.
- `preventDefault()` отменяет действие браузера, но не останавливает распространение.

---

# 5. Описание

```html
<div class="parent">
  <button class="child">Удалить</button>
</div>
```

```js
const parent = document.querySelector('.parent');
const child = document.querySelector('.child');

parent.addEventListener('click', () => console.log('parent, capture'), true);
parent.addEventListener('click', () => console.log('parent, bubble'));
child.addEventListener('click', (event) => {
  console.log('child');
  // event.stopPropagation();
});
```

При клике на кнопку лог будет: `parent, capture`, `child`, `parent, bubble`.
Всплытие особенно полезно для делегирования: один обработчик на контейнере обслуживает его дочерние элементы, включая добавленные позже.

| Метод | Результат |
| --- | --- |
| `stopPropagation()` | Не даёт событию идти к другим элементам |
| `stopImmediatePropagation()` | Также отменяет оставшиеся обработчики текущего элемента |
| `preventDefault()` | Отменяет стандартное действие: переход по ссылке, отправку формы и т. п. |

Не все события всплывают. Например, `focus` и `blur` не всплывают; для делегирования можно использовать `focusin` и `focusout`.

---

# 6. Ссылки

- [MDN: Event bubbling](https://developer.mozilla.org/ru/docs/Learn_web_development/Core/Scripting/Event_bubbling)
- [JavaScript.info: Всплытие и погружение](https://javascript.info/bubbling-and-capturing)
