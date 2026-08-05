# 1. Тема

**Нативная обработка форм и полей**

---

# 2. Главное в одну фразу

Браузер уже умеет валидировать форму, собирать её данные и отправлять их — JavaScript лишь управляет этим процессом.

---

# 3. Суть

> Нативная форма — это готовый контракт между пользователем и браузером: поля собираются, проверяются и отправляются без JavaScript. Атрибуты `required`, `type` и `min` уже описывают многие простые правила.
>
> Это уменьшает код и даёт доступную обработку ошибок из коробки. JavaScript нужен, когда данные надо отправить через API, добавить бизнес-проверку или изменить поведение после отправки.
>
> Обработчик ставят на `submit` формы. Если стандартная отправка не нужна, вызывают `preventDefault()`, проверяют форму и собирают значения через `new FormData(form)`. В данные попадут только поля с `name`, которые не отключены через `disabled`.

---

# 4. Самое главное запомнить

- Событие `submit` вешают на `<form>`, а не только на кнопку.
- `event.preventDefault()` нужен только если стандартная навигация/отправка не нужна.
- `input` срабатывает при каждом изменении, `change` — когда значение подтверждено.
- `FormData` собирает только успешные поля: у поля должен быть `name`, отключённые поля не попадут.
- `checkValidity()` проверяет ограничения, `reportValidity()` ещё и показывает нативное сообщение.

---

# 5. Описание

```html
<form id="profile">
  <input name="email" type="email" required>
  <input name="age" type="number" min="18">
  <button>Сохранить</button>
</form>
```

```js
const form = document.querySelector('#profile');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
});
```

| Инструмент | Когда применять |
| --- | --- |
| `required`, `type`, `min`, `pattern` | Простые правила, понятные браузеру |
| `setCustomValidity()` | Бизнес-проверка, которую не выразить HTML-атрибутом |
| `FormData(form)` | Тело запроса, файлы и получение значений формы |
| `form.reset()` | Вернуть начальные значения полей |

`disabled` исключает поле из отправки и фокуса. `readonly` оставляет значение доступным и отправляемым. Для файлов передавайте `FormData` напрямую в `fetch` и не задавайте заголовок `Content-Type` вручную: браузер добавит boundary.

---

# 6. Ссылки

- [MDN: Работа с формами](https://developer.mozilla.org/ru/docs/Learn_web_development/Extensions/Forms)
- [MDN: FormData](https://developer.mozilla.org/ru/docs/Web/API/FormData)
