# 1. Тема

**Прототипное наследование**

---

# 2. Главное в одну фразу

Наследование в JavaScript — это делегирование: объект получает свойства через ссылку на другой объект в своей прототипной цепочке.

---

# 3. Суть

> `Object.create`, функции-конструкторы и `class extends` используют один механизм — настройку прототипов и поиск свойств по цепочке.

---

# 4. Самое главное запомнить

- `Object.create(proto)` создаёт объект с `proto` как прототипом.
- `class` — синтаксический слой над прототипами, а не отдельная объектная модель.
- При наследовании конструктора `Child.prototype = Object.create(Parent.prototype)`.
- После замены прототипа нужно восстановить `Child.prototype.constructor`.
- Экземплярные данные обычно принадлежат объекту, общие методы — прототипу.

---

# 5. Описание

```js
function Animal(name) {
  this.name = name;
}

Animal.prototype.speak = function () {
  return `${this.name}: звук`;
};

function Dog(name) {
  Animal.call(this, name);
}

Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.speak = function () {
  return `${this.name}: гав`;
};
```

```js
const dog = new Dog('Бобик');
console.log(dog.speak()); // Бобик: гав
console.log(dog instanceof Animal); // true
```

Вариант с классами выражает то же намерение короче:

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name}: звук`; }
}

class Dog extends Animal {
  speak() { return `${this.name}: гав`; }
}
```

Не кладите изменяемые массивы и объекты в общий прототип: тогда все экземпляры будут менять одно и то же значение. Для проверки собственных свойств используйте `Object.hasOwn(instance, key)`, а не устаревающее прямое `instance.hasOwnProperty`.

---

# 6. Ссылки

- [MDN: Inheritance and prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- [JavaScript.info: Встроенные классы и наследование](https://javascript.info/class-inheritance)
