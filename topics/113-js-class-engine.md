# 1. Тема

**Как движок реализует классы:** конструктор · `Class.prototype` · `extends` · обязательный `new` · `super` и private names

---

# 2. Главное в одну фразу

`class` — синтаксис над прототипной моделью: движок создаёт функцию-конструктор и объект прототипа, а `extends` / `super` / private fields добавляют жёсткую семантику поверх «просто function + prototype».

---

# 3. Суть

> Класс в JavaScript не отдельная объектная модель: движок по-прежнему связывает экземпляры с прототипом. Объявление `class Person` даёт конструктор `Person` и объект `Person.prototype`, куда кладут общие методы.
>
> Так тысячи однотипных объектов делят одну функцию `greet`, а не копируют её в каждый экземпляр. Статические члены живут на самом конструкторе и удобны для фабрик.
>
> `extends` строит две цепочки: прототипы экземпляров и цепочку самих конструкторов. Дополнительно класс нельзя вызвать без `new`, тело в strict mode, у `super` и `#private` свои правила — поэтому «это просто сахар над function» верно лишь наполовину.

---

# 4. Самое главное запомнить

- `class C {}` ≈ конструктор `C` + объект `C.prototype` с методами.
- `Object.getPrototypeOf(instance) === C.prototype`.
- Методы на прототипе общие; поля из `constructor` / полей класса — на экземпляре.
- `extends`: `Child.prototype → Parent.prototype` и `Child → Parent` (через `[[Prototype]]` функции).
- Класс нельзя вызвать без `new`; в derived-конструкторе к `this` — только после `super()`.
- Private `#field` — не обычное свойство объекта; у подкласса нет доступа к private names родителя.

---

# 5. Описание

## Что создаёт движок при `class`

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
```

Упрощённо внутри:

```text
Person                 // функция-конструктор (callable только через [[Construct]] / new)
├── .prototype  ──►  Person.prototype
│                      ├── .constructor → Person
│                      └── .greet       → function (неперечисляемый, strict)
└── .from       → static method (свойство конструктора, не прототипа)

new Person('Ада')
└── instance
    ├── .name = 'Ада'          // собственное поле
    └── [[Prototype]] ──► Person.prototype
```

Проверка:

```js
const user = new Person('Ада');
Object.getPrototypeOf(user) === Person.prototype; // true
user.hasOwnProperty('greet'); // false — метод на прототипе
typeof Person.prototype.greet; // 'function'
```

Методы из тела класса попадают на прототип и **неперечисляемы** (`for…in` их обычно не показывает). Вызов идёт в **strict mode**: «голый» вызов без объекта даст `this === undefined`, а не `globalThis`.

## Обязательный `new` и TDZ

Функцию-конструктор в старом стиле можно ошибочно вызвать без `new` и получить баг. Класс при вызове без `new` бросает `TypeError`: у конструктора класса нет обычного `[[Call]]` как у function declaration для создания экземпляра.

Объявление `class` не поднимается как `function`: до строки `class` имя в **temporal dead zone** — обратиться нельзя.

## `extends`: две связи

```js
class Employee extends Person {
  constructor(name, role) {
    super(name);
    this.role = role;
  }
}
```

```text
Экземпляры:     emp ──[[Prototype]]──► Employee.prototype ──► Person.prototype ──► Object.prototype ──► null

Конструкторы:   Employee ──[[Prototype]]──► Person ──► Function.prototype …
```

Зачем вторая цепочка: чтобы `Employee.from` мог найтись на родителе, если static не переопределён, и чтобы `super` в static-методах знал родителя.

В конструкторе наследника **нельзя читать/писать `this` до `super(...)`**: сначала родительский конструктор должен инициализировать экземпляр.

## Private names и brand

Поля `#secret` хранятся не как обычные enumerable-свойства. Движок ведёт учёт «бренда» класса: доступ к `#secret` разрешён только коду, объявленному в том же классе. Подкласс с собственным `#secret` — **другое** поле, даже если имя выглядит так же. Снаружи нет `obj['#secret']` и нет ключа в `Object.keys`.

Это сильнее соглашения `_private` и сильнее TypeScript `private` (который стирается при компиляции в JS без `#`).

## Чем class не равен «просто function»

| | `function Person() {}` + `Person.prototype` | `class Person {}` |
| --- | --- | --- |
| Вызов без `new` | часто «молчаливый» баг | `TypeError` |
| Методы | вручную на `.prototype`, часто enumerable | на прототипе, non-enumerable, strict |
| `extends` / `super` | вручную две цепочки | встроенная семантика |
| `#private` | нет | runtime-проверка brand |
| Hoisting | function declaration поднимается | TDZ до объявления |

Транспайлер в ES5 может сгенерировать *приближённый* код, но современный движок исполняет семантику класса напрямую — с private, `super` и запретом вызова без `new`.

## Практика для собеседования

На вопрос «как движок реализует классы» достаточно цепочки:

1. конструктор + `prototype`;
2. экземпляр → `[[Prototype]]` → методы;
3. `extends` = две связи;
4. отличия от «голого» function-конструктора.

Детали hidden class / shapes объектов — уже соседняя тема про пайплайн V8 и оптимизацию.

---

# 6. Ссылки

- [MDN: Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN: Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
- [TC39: Private fields](https://github.com/tc39/proposal-class-fields)
- [JavaScript.info: Class basic syntax](https://javascript.info/class)
