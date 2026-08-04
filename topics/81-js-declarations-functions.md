# 1. Тема

**Виды объявления переменных, Function Declaration и Function Expression**

---

# 2. Главное в одну фразу

`let` и `const` создают блочные переменные, а Function Declaration и Function Expression различаются синтаксисом, моментом доступности и областью применения.

---

# 3. Суть

> «В современном JavaScript по умолчанию выбираю `const`, `let` — только когда значение меняется, а `var` избегаю из-за функциональной области видимости. Функцию можно объявить декларацией или создать как выражение.
>
> Declaration полностью доступна до строки объявления, а expression становится доступной только после присваивания переменной. Стрелочная функция — это всегда expression и у неё нет собственного `this` и `arguments`.»

---

# 4. Самое главное запомнить

- `var` имеет функциональную область видимости, `let`/`const` — блочную.
- `const` запрещает переназначение ссылки, но не мутацию объекта.
- Function Declaration поднимается вместе с телом.
- Function Expression удобно передавать как значение и использовать в коллбэках.
- Именованное Function Expression полезно для рекурсии и стека ошибок.

---

# 5. Описание

| Конструкция | Область видимости | До объявления |
|---|---|---|
| `var` | функция | `undefined` |
| `let` | блок | TDZ, `ReferenceError` |
| `const` | блок | TDZ, обязательна инициализация |
| Function Declaration | блок/функция | доступна |
| Function Expression | зависит от переменной | после присваивания |

```js
sayHi(); // работает
function sayHi() {
  return 'Привет';
}

const multiply = function multiply(a, b) {
  return a * b;
};
```

Используйте декларацию для самостоятельной именованной операции в модуле. Выражение выбирайте, когда функция — значение: обработчик, аргумент, результат фабрики или условное присваивание.

---

# 6. Ссылки

- [MDN: let](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Statements/let)
- [JavaScript.info: Function Declaration и Expression](https://javascript.info/function-expressions)
