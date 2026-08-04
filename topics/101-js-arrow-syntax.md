# 1. Тема

**Синтаксис и особенности стрелочных функций**

---

# 2. Главное в одну фразу

Стрелочная функция короче обычной, но её лексический `this` и отсутствие конструктора меняют область применения.

---

# 3. Суть

> Стрелка удобна для коротких выражений и колбэков; она не создаёт собственные `this`, `arguments`, `super` и `new.target`.

---

# 4. Самое главное запомнить

- Один параметр можно писать без скобок: `x => x * 2`.
- Выражение без `{}` возвращается неявно.
- При теле в `{}` нужен явный `return`.
- Объект для неявного возврата оборачивается в скобки: `() => ({ ok: true })`.
- Стрелка не подходит для конструктора и метода, которому нужен `this` вызывающего объекта.

---

# 5. Описание

```js
const double = value => value * 2;
const sum = (left, right) => left + right;

const parse = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const makeUser = (name) => ({ name, active: true });
```

Rest-параметры заменяют отсутствующий собственный `arguments`:

```js
const average = (...numbers) =>
  numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
```

| Сценарий | Выбор |
| --- | --- |
| `map`, `filter`, промис-колбэк | Обычно стрелка |
| Таймер внутри метода, нужен внешний `this` | Стрелка |
| Метод объекта с `this` объекта | Сокращённый обычный метод |
| Конструктор, `new`, прототип | `function` или `class` |

Стрелка не «лучше» обычной функции: она фиксирует контекст в момент создания. В обработчике DOM-события используйте обычную функцию, если хотите получить элемент через `this`; иначе обращайтесь к `event.currentTarget`.

---

# 6. Ссылки

- [MDN: Стрелочные функции](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [JavaScript.info: Стрелочные функции](https://javascript.info/arrow-functions-basics)
