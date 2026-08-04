# 1. Тема

**Основные браузерные события**

---

# 2. Главное в одну фразу

Браузерные события позволяют реагировать на действия пользователя и жизненный цикл страницы через `addEventListener` и объект `Event`.

---

# 3. Суть

> «Обработчик подписывают через `addEventListener`, а детали события берут из объекта `event`: `target` — исходный элемент, `currentTarget` — элемент с обработчиком. Большинство DOM-событий проходят захват, цель и всплытие.
>
> Для динамических списков использую делегирование: один слушатель на контейнере и `closest` для определения дочернего элемента. `preventDefault` отменяет действие браузера, а `stopPropagation` применяю только когда действительно нужно остановить распространение.»

---

# 4. Самое главное запомнить

- Частые события: `click`, `input`, `change`, `submit`, `keydown`, `DOMContentLoaded`.
- `DOMContentLoaded` ждёт DOM, `load` — ещё и ресурсы страницы.
- `target` и `currentTarget` могут различаться.
- `removeEventListener` требует ту же функцию и те же значимые параметры.
- `passive: true` нельзя сочетать с `preventDefault`.

---

# 5. Описание

| Событие | Когда срабатывает |
|---|---|
| `click` | активация элемента указателем или клавиатурой |
| `input` | каждое изменение поля |
| `change` | подтверждённое изменение значения |
| `submit` | отправка формы |
| `keydown` | нажатие клавиши |
| `DOMContentLoaded` | DOM построен |

```js
const form = document.querySelector('form');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  console.log(data.get('email'));
});
```

Делегирование:

```js
list.addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-action="remove"]');
  if (removeButton) removeButton.closest('li')?.remove();
});
```

---

# 6. Ссылки

- [MDN: События](https://developer.mozilla.org/ru/docs/Web/Events)
- [MDN: addEventListener](https://developer.mozilla.org/ru/docs/Web/API/EventTarget/addEventListener)
- [JavaScript.info: Всплытие и захват](https://javascript.info/bubbling-and-capturing)
