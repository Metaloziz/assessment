# 1. Тема

**Примеси**

---

# 2. Главное в одну фразу

Mixin добавляет независимое поведение классу или объекту без построения глубокой иерархии наследования.

---

# 3. Суть

> JavaScript поддерживает только одиночное наследование классов, поэтому mixin применяют для композиции нескольких небольших возможностей: логирования, событий, сериализации. Примесь может копировать методы в прототип или быть функцией, принимающей базовый класс и возвращающей расширенный класс; в обоих случаях нужно явно контролировать контракт и конфликты имён.

---

# 4. Самое главное запомнить

- Mixin — композиция поведения, а не множественное наследование.
- `Object.assign` копирует только enumerable-свойства и не сохраняет дескрипторы.
- Class factory сохраняет цепочку наследования и обычно удобнее в современном коде.
- Методы примеси используют `this`, поэтому целевой класс обязан предоставить ожидаемое состояние.
- Несколько mixins могут конфликтовать одинаковыми именами методов.

---

# 5. Описание

```js
const withTimestamp = (Base) => class extends Base {
  createdAt = new Date();

  ageMs() {
    return Date.now() - this.createdAt.getTime();
  }
};

class Task {
  constructor(title) {
    this.title = title;
  }
}

class TimedTask extends withTimestamp(Task) {}
```

Для object mixin при необходимости сохраняют дескрипторы:

```js
function applyMixin(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    if (key in target) throw new Error(`Конфликт: ${String(key)}`);
    Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
  }
}
```

Mixins не должны скрывать обязательные зависимости. Если примеси нужны десятки полей и сложный порядок инициализации, лучше выделить отдельный объект-сервис или композицию через явные зависимости.

---

# 6. Ссылки

- [javascript.info: Mixins](https://javascript.info/mixins)
- [MDN: Object.assign()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
