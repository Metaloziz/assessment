# 1. Тема

**Преобразование классов в рантайме. Приватные и статичные поля классов**

---

# 2. Главное в одну фразу

Синтаксис `class` движок превращает в конструктор и объект прототипа, а статические и приватные поля кладёт не туда, где лежат обычные методы и свойства экземпляра.

---

# 3. Суть

> Запись `class Account { … }` в рантайме даёт функцию-конструктор `Account` и объект `Account.prototype` с общими методами. Экземпляр после `new` хранит свои поля у себя и ссылается на прототип за методами — та же прототипная модель, что у «старого» `function + prototype`, только с жёсткой семантикой `new`, `extends` и `super`.
>
> **Статические** поля и методы (`static count`, `static create()`) живут на **самом конструкторе** `Account`, а не на `Account.prototype` и не на каждом экземпляре. Один счётчик или фабрика на класс — удобно для общих настроек и счётчиков без копии в каждый объект.
>
> **Приватные** поля `#balance` движок не кладёт как обычный строковый ключ: у объекта нет `#balance` в `Object.keys`, снаружи нет `obj['#balance']`. Доступ проверяется по «бренду» класса — только код, объявленный в этом классе, может читать и писать `#balance`. У подкласса своё `#balance` — это другое поле, даже если имя совпадает; к `#balance` родителя из наследника не попасть.
>
> Поэтому «class — просто сахар над function» верно лишь для методов и прототипа: статика и private names добавляют отдельные правила, которые транспайлер в старый ES5 не воспроизводит один в один.

---

# 4. Самое главное запомнить

- `class C {}` → конструктор `C` + объект `C.prototype`; методы экземпляра — на прототипе.
- `static x` и `static method()` — свойства **конструктора** `C`, не экземпляра и не `C.prototype`.
- Поле экземпляра `#secret` не видно в перечислении ключей объекта; снаружи к нему не обратиться.
- Подкласс не читает `#secret` родителя — у private names своя привязка к классу объявления.
- Вызов класса без `new` — `TypeError`; в derived-конструкторе к `this` только после `super()`.

---

# 5. Описание

## Что получается после `class`

```js
class BankAccount {
  static taxRate = 0.13;
  static create(id) {
    return new this(id);
  }

  #balance = 0;

  constructor(id) {
    this.id = id;
  }

  deposit(amount) {
    this.#balance += amount;
  }

  getBalance() {
    return this.#balance;
  }
}
```

Упрощённая картина в памяти:

```text
BankAccount                    // функция-конструктор (только через new)
├── .taxRate = 0.13            // ← static field на конструкторе
├── .create()                  // ← static method
├── .prototype ──►
│     ├── .constructor → BankAccount
│     ├── .deposit()
│     └── .getBalance()
└── (нет #balance здесь)

new BankAccount('A1')
└── instance
    ├── .id = 'A1'             // обычное own-свойство
    ├── #balance → слот движка // не ключ в Object.keys
    └── [[Prototype]] ──► BankAccount.prototype
```

Проверки:

```js
const acc = BankAccount.create('A1');
acc.deposit(100);

Object.keys(acc); // ['id'] — #balance не в списке
'balance' in acc; // false
acc.getBalance(); // 100 — метод класса видит #balance

BankAccount.taxRate; // 0.13 — на конструкторе
acc.taxRate; // undefined — на экземпляре static нет
```

## Статические поля и методы

Статика нужна, когда состояние или поведение относится ко **всему классу**, а не к одному объекту: счётчик созданных экземпляров, общий лимит, фабрика `create`, константа конфигурации.

```js
class Counter {
  static count = 0;

  constructor() {
    Counter.count += 1;
  }
}

new Counter();
new Counter();
Counter.count; // 2
```

Static-методы часто используют `new this(...)` или `new Target(...)` в фабриках наследников: `this` в static-методе — сам конструктор (например `SavingsAccount`, если метод вызван на нём).

Статические поля инициализируются при подготовке класса; порядок с другими static-полями того же класса — сверху вниз, как у обычных полей.

## Приватные поля `#name`

Private field — не «соглашение с подчёркиванием» и не TypeScript `private` (который стирается при компиляции в JS без `#`). Это проверка **в рантайме**:

```js
class Wallet {
  #balance = 0;

  credit(n) {
    this.#balance += n;
  }
}

const w = new Wallet();
w.credit(50);
// w.#balance — SyntaxError снаружи класса
// w['#balance'] — undefined, такого ключа нет
```

Движок хранит значение в internal slot, привязанном к паре «объект + имя private brand класса». Методы того же класса обращаются к `#balance` через скомпилированную ссылку на brand; чужой код — нет.

## Наследник и private родителя

```js
class Savings extends BankAccount {
  #bonus = 0;

  addBonus(n) {
    this.#bonus += n;
    // this.#balance — ошибка: #balance объявлен в BankAccount, не здесь
    this.deposit(n); // ок — публичный метод родителя трогает #balance внутри
  }
}
```

У `Savings` своё `#bonus`; `#balance` из `BankAccount` для кода `Savings` как бы не существует — даже если подкласс знает, что у родителя было поле с таким именем.

## Чем это отличается от «голого» конструктора

| | `function + prototype` | `class` + static + `#private` |
| --- | --- | --- |
| Методы экземпляра | вручную на `.prototype` | на `C.prototype`, non-enumerable |
| Static | вручную `C.x = …` | `static x` на конструкторе |
| Приватность | соглашение `_x` или WeakMap снаружи | `#x` с проверкой brand в рантайме |
| Вызов без `new` | часто тихий баг | `TypeError` |

Транспайлер может сгенерировать **приближённый** ES5-код для методов и наследования, но семантику `#private` и static fields современный движок исполняет нативно.

---

# 6. Ссылки

- [MDN: Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN: Private elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements)
- [MDN: Static initialization blocks](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Static_initialization_blocks)
- [TC39: Private fields](https://github.com/tc39/proposal-class-fields)
- [JavaScript.info: Private and public fields](https://javascript.info/private-protected-properties-methods)
