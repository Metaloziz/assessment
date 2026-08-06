# 1. Тема

**Примеси:** композиция поведения · class factory · `Object.assign` · конфликты имён · границы mixin vs сервис

---

# 2. Главное в одну фразу

Mixin добавляет классу или объекту независимое поведение без глубокой иерархии наследования — это композиция возможностей, а не множественное наследование.

---

# 3. Суть

> Mixin — способ «подмешать» небольшое поведение: лог, timestamp, события — к классу или объекту, не строя дерево предков ради одного метода.
>
> Так класс остаётся про свою основную роль, а возможности собирают из готовых кусков. Это удобнее, чем тащить лишние методы через длинный `extends`.
>
> Обычно mixin — функция: принимает базовый класс и возвращает `class extends Base { … }`. Методы смотрят на `this`, поэтому контракт (какие поля должны быть) и конфликты имён нужно держать явными. Если примесь требует десятки скрытых зависимостей — честнее отдельный сервис.

---

# 4. Самое главное запомнить

- Mixin — композиция, не «настоящее» multiple inheritance.
- Class factory (`Base => class extends Base`) сохраняет прототипную цепочку.
- `Object.assign` копирует только enumerable own и ломает аксессоры/дескрипторы — для методов прототипа часто нужен `defineProperty`.
- Методы примеси используют `this`: целевой объект обязан дать ожидаемое состояние.
- Одинаковые имена методов у нескольких mixins — конфликт; порядок примесей важен.

---

# 5. Описание

## Class factory (предпочтительный стиль)

```js
const withTimestamp = (Base) =>
  class extends Base {
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

```text
TimedTask ──extends──► withTimestamp(Task) ──extends──► Task
                              │
                              └── ageMs / createdAt на прототипе / полях экземпляра
```

Цепочка `extends` остаётся читаемой: можно посмотреть `Object.getPrototypeOf`.

## Object mixin

```js
function applyMixin(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    if (key === 'constructor') continue;
    if (key in target) throw new Error(`Конфликт: ${String(key)}`);
    Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
  }
}

applyMixin(Task.prototype, {
  log() {
    console.log(this.title);
  },
});
```

`Object.assign(Task.prototype, source)` проще, но не копирует getters/non-enumerable как надо.

## Когда не mixin

| Подходит mixin | Лучше сервис / композиция |
| --- | --- |
| 1–3 метода, слабая связь | Много состояния и сложный init |
| Поведение «умеет X» | Отдельная подсистема (auth, db) |
| Явный контракт `this` | Нужны моки и независимый жизненный цикл |

---

# 6. Ссылки

- [javascript.info: Mixins](https://javascript.info/mixins)
- [MDN: Object.assign()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
- [MDN: Object.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
