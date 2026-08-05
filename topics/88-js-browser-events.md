# 1. Тема

**Основные браузерные события**

---

# 2. Главное в одну фразу

Браузерные события позволяют реагировать на действия пользователя и жизненный цикл страницы через `addEventListener` и объект `Event`.

---

# 3. Суть

> Браузерные события сообщают коду о действии пользователя или состоянии страницы. Обработчик подписывают через `addEventListener`, а объект `event` содержит источник события, тип и данные ввода.
>
> Это позволяет реагировать на отправку формы, ввод и клики без постоянного опроса DOM. Понимание распространения события особенно важно в вложенных компонентах, где один клик может дойти до контейнера.
>
> Большинство событий проходят захват, цель и всплытие. `event.target` — узел, с которого всё началось, а `currentTarget` — узел с текущим обработчиком. Поэтому для динамического списка ставят один слушатель на контейнер и через `closest()` находят нужную кнопку.
>
> `preventDefault()` отменяет стандартное действие браузера, например отправку формы. `stopPropagation()` останавливает распространение и нужен редко: он может сломать обработчики выше.

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
