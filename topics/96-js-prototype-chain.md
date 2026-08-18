# 1. Тема

**Определение прототипа. Цепочка прототипов, механизм поиска свойств**

---

# 2. Главное в одну фразу

Прототип — объект-«родитель», в котором JavaScript ищет свойство, если его нет у самого экземпляра; поиск идёт по цепочке ссылок до `null`.

---

# 3. Суть

> Прототип — это не копия данных, а **ссылка** на другой объект. У каждого обычного объекта есть внутренняя связь `[[Prototype]]`: если у экземпляра нет нужного свойства, движок поднимается по этой ссылке и смотрит дальше, пока не найдёт имя или не дойдёт до `null`.
>
> Так сотни массивов делят один `Array.prototype.push`, а не хранят копию метода каждый. Цепочка прототипов — последовательность таких ссылок: `obj → proto → … → Object.prototype → null`. У массива типичный путь: `array → Array.prototype → Object.prototype → null`.
>
> При **чтении** движок идёт по цепочке снаружи внутрь, пока имя не найдётся. При **записи** обычно создаётся **собственное** свойство на объекте — оно перекрывает одноимённое у прототипа, но сам прототип не меняется. Для проверки «только свои поля» — `Object.hasOwn`, для «есть где-то по цепочке» — оператор `in`.
>
> Не путайте прототип **объекта** и свойство `prototype` у **функции-конструктора**: второе — объект, который станет прототипом экземпляров после `new`. Читать связь объекта безопаснее через `Object.getPrototypeOf`, а не через устаревший `__proto__`.

---

# 4. Самое главное запомнить

- Прототип — ссылка на объект, не копия методов в каждый экземпляр.
- Поиск при чтении: свой объект → прототип → прототип прототипа → … → `null`.
- Собственное свойство всегда побеждает одноимённое в прототипе.
- Запись `obj.key = …` создаёт own-свойство и «заслоняет» прототип.
- `Object.hasOwn(obj, key)` — только на объекте; `key in obj` — с учётом цепочки.
- `Function.prototype` у конструктора и `[[Prototype]]` у экземпляра — разные вещи.

---

# 5. Описание

```text
чтение obj.move
  → есть move у obj?        нет → дальше
  → есть move у proto?      да  → вернуть (this = obj)
  → … до null               нет → undefined

запись obj.color = 'red'
  → создать own color на obj (прототип не трогаем)
```

## Что такое прототип

Представьте объект как ящик с **своими** полями и стрелкой «если здесь нет — смотри в соседний ящик». Этот соседний объект и есть прототип. Связь задают `Object.create(parent)`, `new Constructor()`, `class extends` или редко `Object.setPrototypeOf`.

```js
const animal = {
  move() {
    return `${this.name} движется`;
  },
};

const dog = Object.create(animal);
dog.name = 'Бобик';

console.log(dog.move()); // Бобик движется — метод в animal, this = dog
console.log(Object.hasOwn(dog, 'move')); // false
console.log('move' in dog); // true
```

`Object.getPrototypeOf(dog) === animal` — так проверяют ссылку. У `Object.create(null)` прототипа нет: цепочка сразу обрывается, удобно для «чистых» словарей (подробнее — тема про null-прототип).

## Цепочка прототипов

Цепочка — не класс и не папка на диске, а **линейный обход ссылок**. У встроенных типов цепочки уже собраны:

| Объект | Типичная цепочка |
| --- | --- |
| `{}` | `obj → Object.prototype → null` |
| `[]` | `arr → Array.prototype → Object.prototype → null` |
| `function f() {}` | `f → Function.prototype → Object.prototype → null` |

Общие методы (`toString`, `hasOwnProperty`) живут на `Object.prototype`. Менять встроенные прототипы (`Array.prototype.push = …`) опасно: ломает ожидания библиотек и других разработчиков.

## Механизм поиска свойств

**Чтение** (`obj.key`, `obj[key]`, деструктуризация) — обход цепочки, пока имя не найдётся или не станет `null`. Если нигде нет — `undefined` (не ошибка). Для методов важно: функция берётся с прототипа, но **`this` остаётся исходным объектом** — отсюда работа `dog.move()` при методе на `animal`.

**Запись** обычно создаёт **own**-свойство:

```js
dog.color = 'red'; // own color на dog
// animal.color не меняется; чтение dog.color вернёт 'red'
```

Исключения — `Object.defineProperty` с дескriptor без `writable` и некоторые встроенные объекты; в обычном коде правило «запись = своё поле» держится.

**Проверки:**

```js
Object.hasOwn(dog, 'move'); // false — только dog
'move' in dog;              // true — нашли на animal
```

## Прототип объекта и `prototype` функции

У функции-конструктора есть свойство **`User.prototype`** — объект, который станет прототипом экземпляра после `new`:

```js
function User(name) {
  this.name = name;
}
User.prototype.greet = function () {
  return `Привет, ${this.name}`;
};

const user = new User('Ира');
Object.getPrototypeOf(user) === User.prototype; // true
```

`User.prototype` — обычный объект; у него свой прототип — обычно `Object.prototype`. Класс `class User { … }` строит ту же схему, только синтаксис другой (см. тему про класс и прототип).

---

# 6. Ссылки

- [MDN: Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- [MDN: Object.getPrototypeOf()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getPrototypeOf)
- [JavaScript.info: Прототипное наследование](https://javascript.info/prototype-inheritance)
- [ECMAScript: Ordinary Object Internal Methods — [[Get]]](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)
