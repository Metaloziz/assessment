# 1. Тема

**Контекст this в браузерных событиях**

---

# 2. Главное в одну фразу

В обычном обработчике, зарегистрированном через `addEventListener`, `this` равен `event.currentTarget`, а не обязательно элементу, по которому кликнули.

---

# 3. Суть

> В обработчике события `this`, `event.target` и `event.currentTarget` описывают разные элементы. В обычной функции, переданной в `addEventListener`, `this` и `currentTarget` указывают на элемент с обработчиком, а `target` — на исходную цель события.
>
> Это различие важно в делегировании. Контейнер получает событие от вложенной кнопки: работать с контейнером нужно через `currentTarget`, а элемент действия искать от `target`.
>
> Правило про `this` действует только для обычной функции. Стрелка захватывает внешний контекст и не получает DOM-элемент как `this`; в ней следует использовать `event.currentTarget`. Метод класса, переданный обработчиком, тоже теряет экземпляр, если его заранее не связать через `bind` или обёртку.

---

# 4. Самое главное запомнить

- В обычной функции-обработчике `this === event.currentTarget`.
- `event.target` остаётся исходным элементом события.
- В стрелочном обработчике `this` берётся из внешней области и не указывает на DOM-элемент.
- При делегировании берите элемент действия из `event.target.closest(...)`.
- Переданный как колбэк метод класса обычно требует `bind` или обёртки.

---

# 5. Описание

```js
const list = document.querySelector('#list');

list.addEventListener('click', function (event) {
  console.log(this === list); // true
  console.log(event.currentTarget === list); // true
  console.log(event.target); // конкретный потомок, по которому кликнули
});
```

```js
class Dialog {
  constructor(button) {
    this.open = false;
    button.addEventListener('click', this.toggle.bind(this));
  }

  toggle() {
    this.open = !this.open;
  }
}
```

| Значение | Что означает |
| --- | --- |
| `this` в `function`-обработчике | Элемент, на котором зарегистрирован обработчик |
| `event.currentTarget` | То же значение во время вызова обработчика |
| `event.target` | Исходный элемент, где произошло событие |
| `this` в стрелке | Лексический `this` внешней области |

Не полагайтесь на неявную глобальную `event`: принимайте параметр `event` явно. В inline-обработчиках (`onclick`) правила контекста и области видимости имеют дополнительные особенности, поэтому в приложениях предпочтительнее `addEventListener`.

---

# 6. Ссылки

- [MDN: this](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Operators/this)
- [MDN: Event.currentTarget](https://developer.mozilla.org/ru/docs/Web/API/Event/currentTarget)
