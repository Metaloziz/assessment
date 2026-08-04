# 1. Тема

**Потеря контекста**

---

# 2. Главное в одну фразу

Контекст теряется, когда метод передают или вызывают как обычную функцию, поэтому он больше не получает исходный объект в `this`.

---

# 3. Суть

> «Потеря `this` — не потеря объекта, а смена способа вызова функции. Если передать `user.save` в таймер или обработчик, браузер позже вызовет её сам, уже не как `user.save()`.
>
> Исправляю это стрелочным адаптером, `bind` или хранением ссылки на объект в замыкании. Выбор зависит от API: в DOM-обработчике обычная функция специально получает элемент в `this`, а стрелка этого не даст.»

---

# 4. Самое главное запомнить

- `const fn = obj.method; fn()` — уже не вызов метода.
- Коллбэк `setTimeout(obj.method)` не сохраняет `obj`.
- DOM передаёт `this === event.currentTarget` в обычный обработчик.
- `bind` нельзя вызывать заново при удалении слушателя: это будет другая функция.

---

# 5. Описание

```js
const user = {
  name: 'Анна',
  greet() {
    console.log(this.name);
  },
};

setTimeout(user.greet, 0); // this не user
setTimeout(() => user.greet(), 0); // Анна
setTimeout(user.greet.bind(user), 0); // Анна
```

| Решение | Особенность |
|---|---|
| `() => obj.method()` | короткий адаптер, сохраняет исходный вызов |
| `obj.method.bind(obj)` | фиксирует `this`, возвращает новую функцию |
| `const self = this` | старый, но корректный приём через замыкание |

Для удаления подписки сохраните привязанную функцию:

```js
this.onClick = this.onClick.bind(this);
button.addEventListener('click', this.onClick);
button.removeEventListener('click', this.onClick);
```

---

# 6. Ссылки

- [MDN: Function.prototype.bind](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)
- [JavaScript.info: Привязка контекста](https://javascript.info/bind)
