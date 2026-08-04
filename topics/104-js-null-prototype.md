# 1. Тема

**Объекты без прототипа**

---

# 2. Главное в одну фразу

`Object.create(null)` создаёт словарь без наследованных свойств, поэтому его ключи не конфликтуют с `Object.prototype`.

---

# 3. Суть

> Такой объект не имеет `toString`, `hasOwnProperty` и даже `__proto__`; это полезно для набора произвольных ключей, но требует аккуратной проверки свойств.

---

# 4. Самое главное запомнить

- Единственный стандартный способ — `Object.create(null)`.
- `Object.getPrototypeOf(Object.create(null))` возвращает `null`.
- У объекта нет метода `hasOwnProperty`; используйте `Object.hasOwn(obj, key)`.
- Ключи вроде `constructor` и `toString` становятся обычными безопасными данными.
- Для большинства новых коллекций `Map` часто выразительнее и удобнее.

---

# 5. Описание

```js
const dictionary = Object.create(null);

dictionary.constructor = 'значение';
dictionary.toString = 'тоже значение';

console.log(Object.getPrototypeOf(dictionary)); // null
console.log(Object.hasOwn(dictionary, 'constructor')); // true
console.log(dictionary.hasOwnProperty); // undefined
```

Обычный объект наследует от `Object.prototype`; данные из внешнего источника могут иметь ключ, совпадающий с методом прототипа. У null-прототипа такой конфликт отсутствует.

```js
const counts = Object.create(null);
for (const word of ['js', 'js', 'dom']) {
  counts[word] = (counts[word] ?? 0) + 1;
}
// { js: 2, dom: 1 } без прототипа
```

| Вариант | Подходит для | Особенность |
| --- | --- | --- |
| `{}` | Обычная модель данных | Есть `Object.prototype` |
| `Object.create(null)` | Словарь строковых ключей | Нет унаследованных методов |
| `Map` | Коллекция с ключами любого типа | Имеет `size`, `get`, `set`, итерацию |

Не создавайте такой объект ради микропроизводительности: выигрыш не является гарантией и обычно несущественен. Выбирайте его, когда важны отсутствие прототипа и безопасные произвольные строковые ключи.

---

# 6. Ссылки

- [MDN: Object.create()](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Object/create)
- [JavaScript.info: Объекты без прототипа](https://javascript.info/object#objects-without-prototype)
