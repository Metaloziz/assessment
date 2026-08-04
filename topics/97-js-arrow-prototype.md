# 1. Тема

**Прототипы и стрелочные функции**

---

# 2. Главное в одну фразу

Стрелочная функция является функцией, но не конструктором: у неё нет собственного `prototype` и её нельзя вызвать через `new`.

---

# 3. Суть

> Стрелка создана для коротких функций с лексическим `this`, поэтому она не получает внутреннее свойство `[[Construct]]`, нужное конструкторам.

---

# 4. Самое главное запомнить

- `(() => {}).prototype` равно `undefined`.
- `new (() => {})` бросит `TypeError`.
- Стрелки всё равно наследуют от `Function.prototype`, поэтому у них есть `call`, `apply` и `bind`.
- У стрелки нет собственного `this`, `arguments` и `new.target`.
- Обычные функции и `class` подходят для конструкторов и прототипных методов.

---

# 5. Описание

```js
function Regular() {}
const arrow = () => {};

console.log(Regular.prototype); // {}
console.log(arrow.prototype); // undefined

new Regular(); // работает
new arrow(); // TypeError: arrow is not a constructor
```

Отсутствие `prototype` не означает, что стрелка «не функция»: у неё есть собственный объектный прототип — `Function.prototype`.

```js
const object = {
  value: 10,
  createHandler() {
    return () => this.value;
  },
};

console.log(object.createHandler()()); // 10
```

Здесь стрелка удобна, потому что захватывает `this` метода `createHandler`. Но как метод объекта она обычно неверна:

```js
const broken = {
  value: 10,
  get: () => this.value, // this взят из внешнего окружения, не из broken
};
```

Используйте стрелки в колбэках и для сохранения внешнего контекста; используйте обычные методы, `function` или `class`, когда нужен динамический `this`, конструктор или общий метод в прототипе.

---

# 6. Ссылки

- [MDN: Стрелочные функции](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [JavaScript.info: Стрелочные функции](https://javascript.info/arrow-functions)
