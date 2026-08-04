# 1. Тема

**Как движок реализует классы**

---

# 2. Главное в одну фразу

`class` использует прототипный механизм JavaScript, но добавляет собственную семантику: строгий режим, обязательный `new`, private names и правила `super`.

---

# 3. Суть

> Класс создаёт функцию-конструктор и объект `Class.prototype`; экземпляр при `new` получает внутреннюю ссылку `[[Prototype]]` на этот прототип. Методы экземпляра хранятся на прототипе и разделяются объектами, статические члены принадлежат конструктору, а наследование связывает и прототипы экземпляров, и сами конструкторы.

---

# 4. Самое главное запомнить

- `Class.prototype` — объект, из которого экземпляры наследуют методы.
- `Object.getPrototypeOf(instance) === Class.prototype`.
- Методы класса неперечисляемы и выполняются в strict mode.
- В derived constructor нельзя обращаться к `this` до `super()`.
- `extends` строит две связи: `Child.prototype → Parent.prototype` и `Child → Parent`.

---

# 5. Описание

```js
class Person {
  constructor(name) {
    this.name = name;
  }

  greet() {
    return `Привет, ${this.name}`;
  }

  static from(data) {
    return new this(data.name);
  }
}

const user = Person.from({ name: 'Ада' });
Object.getPrototypeOf(user) === Person.prototype; // true
```

Упрощённая аналогия с функциями-конструкторами полезна, но `class` не просто текстовая подстановка: класс нельзя вызвать без `new`, его объявление находится в temporal dead zone, а private fields и `super` имеют спецификационные внутренние механизмы. Транспайлер может сгенерировать приближённый ES5-код, но движок исполняет современную семантику напрямую.

---

# 6. Ссылки

- [MDN: Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN: Inheritance and prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
