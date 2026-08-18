# 1. Тема

**Особенности стрелочных функций. Отличия от классических.**

---

# 2. Главное в одну фразу

Стрелочная функция — это выражение с лексическим `this` и без конструктора; классическая `function` задаёт `this` при вызове и может быть конструктором.

---

# 3. Суть

> Классическая функция и стрелочная выглядят похоже, но ведут себя по-разному. У обычной `function` свой `this`: он зависит от того, **как** функцию вызвали — как метод объекта, через `call`, как обработчик события. Стрелка не создаёт свой `this`, а «подсматривает» значение снаружи, в месте, где её написали.
>
> Отсюда главные отличия на практике. Стрелка удобна в колбэках внутри метода: таймер, `map`, промис — контекст экземпляра не теряется. Как метод объекта или DOM-обработчик, где нужен `this` вызывающего, стрелка обычно не подходит. У стрелки нет собственного `arguments`, нет `prototype`, её нельзя вызвать через `new`; `call`, `apply` и `bind` не перепишут захваченный `this`.
>
> Классическая функция объявляется через `function` и поднимается целиком; стрелка — только выражение и живёт там, где её присвоили. Ни одна форма не «лучше» другой: выбор — по тому, нужен ли динамический `this`, конструктор или короткий колбэк с внешним контекстом.

---

# 4. Самое главное запомнить

- У классической функции `this` задаётся вызовом; у стрелки — лексически, из внешнего кода.
- Стрелка как метод объекта не получает `this` этого объекта.
- Внутри метода стрелка в `setTimeout` / `map` сохраняет `this` метода; обычная функция — часто теряет.
- У стрелки нет `arguments`; для переменного числа аргументов — rest (`...args`).
- `new` со стрелкой бросит `TypeError`; у обычной функции есть `prototype` и конструктор.
- `call` / `apply` / `bind` не меняют `this` у стрелочной функции.

---

# 5. Описание

```text
классическая function          стрелочная =>
─────────────────────          ─────────────
this ← от вызова               this ← снаружи (лексически)
arguments ← свой объект        arguments ← нет (rest ...args)
prototype ← есть               prototype ← undefined
new fn() ← можно               new arrow() ← TypeError
function foo() {} ← hoisting     const f = () => {} ← только после строки
```

## `this`: метод объекта

```js
const user = {
  name: 'Anna',
  greetClassic() {
    return this.name;
  },
  greetArrow: () => this?.name,
};

user.greetClassic(); // 'Anna'
user.greetArrow(); // undefined (или внешний this, не user)
```

## `this`: колбэк внутри метода

```js
const timer = {
  label: 'tick',
  startClassic() {
    setTimeout(function () {
      console.log(this.label); // undefined — свой this у колбэка
    }, 0);
  },
  startArrow() {
    setTimeout(() => {
      console.log(this.label); // 'tick' — this метода startArrow
    }, 0);
  },
};
```

## `arguments`, `prototype`, `new`

```js
function sumClassic() {
  return Array.from(arguments).reduce((a, b) => a + b, 0);
}

const sumArrow = (...nums) => nums.reduce((a, b) => a + b, 0);

function Regular() {}
const arrow = () => {};

Regular.prototype; // {}
arrow.prototype; // undefined

new Regular(); // ok
new arrow(); // TypeError: arrow is not a constructor
```

## Когда что выбирать

| Задача | Обычно |
| --- | --- |
| Колбэк внутри метода, нужен `this` экземпляра | Стрелка |
| `map`, `filter`, короткое выражение | Стрелка |
| Метод объекта с `this` объекта | Сокращённый метод `method() {}` или `function` |
| DOM-обработчик, `this === element` | Обычная `function` или `event.currentTarget` |
| Конструктор, фабрика через `new` | `function` или `class` |
| Переменное число аргументов | Rest + стрелка или классическая `function` |

Подробнее про синтаксис неявного return — тема «Синтаксис и особенности стрелочных функций»; про `prototype` и `new` — «Прототипы и стрелочные функции»; про `this` в событиях — «Контекст this в браузерных событиях».

---

# 6. Ссылки

- [MDN: Стрелочные функции](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN: function](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Functions)
- [MDN: this](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Operators/this)
- [JavaScript.info: Стрелочные функции](https://javascript.info/arrow-functions)
- [ECMAScript: Arrow Function Definitions](https://tc39.es/ecma262/#sec-arrow-function-definitions)
