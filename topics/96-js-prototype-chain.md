# 1. Тема

**Цепочка прототипов и поиск свойств**

---

# 2. Главное в одну фразу

Если свойства нет у объекта, JavaScript ищет его в прототипе, затем в прототипе прототипа — до `null`.

---

# 3. Суть

> У каждого объекта есть внутренний `[[Prototype]]`; он задаёт делегирование свойств, а не копирование их в экземпляр.

---

# 4. Самое главное запомнить

- `Object.getPrototypeOf(obj)` читает прототип, `Object.setPrototypeOf` меняет его, но это редко нужно.
- Собственное свойство всегда перекрывает одноимённое свойство прототипа.
- `Object.hasOwn(obj, key)` проверяет только собственное свойство; `key in obj` — всю цепочку.
- У массива цепочка: `array → Array.prototype → Object.prototype → null`.
- Прототип объекта и свойство `prototype` функции-конструктора — разные сущности.

---

# 5. Описание

```js
const animal = {
  move() {
    return `${this.name} движется`;
  },
};

const dog = Object.create(animal);
dog.name = 'Бобик';

console.log(dog.move()); // Бобик движется
console.log(Object.hasOwn(dog, 'move')); // false
console.log('move' in dog); // true
```

При чтении `dog.move` движок сначала смотрит на `dog`, затем на `animal`. При записи `dog.move = ...` будет создано собственное свойство `dog`, которое скроет метод прототипа.

```js
function User(name) {
  this.name = name;
}
User.prototype.greet = function () {
  return `Привет, ${this.name}`;
};

const user = new User('Ира');
```

`new` создаёт объект, устанавливает его прототипом `User.prototype`, вызывает функцию с этим объектом как `this` и обычно возвращает созданный объект. Не расширяйте встроенные прототипы (`Array.prototype`): это создаёт конфликты и неожиданные перечисляемые свойства.

---

# 6. Ссылки

- [MDN: Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- [JavaScript.info: Прототипы](https://javascript.info/prototype-inheritance)
