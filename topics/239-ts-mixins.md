# 1. Тема

**Mixins**

---

# 2. Главное в одну фразу

В TypeScript mixin — class factory `Base => class extends Base`: подмешивает поведение и типы через constrained constructor, без «настоящего» множественного наследования.

---

# 3. Суть

> Mixins в TypeScript — тот же JS-паттерн class factory (`function Timestamped(Base) { return class extends Base { … } }`), плюс типы: параметр `TBase extends Constructor`, чтобы checker знал конструктор и итоговый класс с новыми полями и методами.
>
> Зачем: собрать класс из независимых кусков (timestamp, activate, events), не плодя глубокое дерево `extends` ради двух методов. Поведение остаётся на прототипе через цепочку `extends`; типы сходятся в intersection-подобную форму результата factory.
>
> Как: объявляют `type Constructor = new (...args: any[]) => object`, пишут `function Mix<TBase extends Constructor>(Base: TBase) { return class extends Base { … } }` и применяют `const Rich = Activatable(Timestamped(User))`. Constrained mixin сужает `TBase` до `new (…args) => { name: string }`, если примесь читает поля базы.
>
> Ловушка: ждать настоящего multiple inheritance — в рантайме это всё ещё одна цепочка прототипов; порядок примесей важен, конфликт имён методов — как в JS. Ещё: конструкторы с разными сигнатурами аргументов плохо стыкуются с общим `Constructor` — иногда честнее композиция сервисом, а не стек mixins.

---

# 4. Самое главное запомнить

- Mixin = `Base => class extends Base`, не отдельный keyword в языке.
- `Constructor` / `GConstructor<T>` — тип «класс, который можно `new`».
- `TBase extends Constructor` даёт factory типизированный результат с полями примеси.
- Стек: `A(B(C))` — внешний mixin ближе к экземпляру в цепочке `extends`.
- Constrained mixin: `TBase extends new (…args) => Shape`, если нужен контракт базы.
- Конфликт имён и толстый `this`-контракт — сигнал заменить mixin сервисом.

---

# 5. Описание

```text
User
  │
Timestamped(User)     ← class extends User { timestamp, getTimestamp }
  │
Activatable(…)        ← class extends … { isActive, activate }
  │
экземпляр: name + timestamp + activate  (одна прототипная цепочка)
```

## Constructor и factory

Минимальный каркас из Handbook:

```ts
type Constructor = new (...args: any[]) => object;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = Date.now(); // ← MIXIN field
    getTimestamp() {
      return this.timestamp;
    }
  };
}

class User {
  name = "";
}

const TimestampedUser = Timestamped(User);
const u = new TimestampedUser();
u.name;
u.getTimestamp(); // ← типы и рантайм сходятся
```

`TBase extends Constructor` говорит checker’у: аргумент — класс; результат — подкласс с новыми членами.

## Несколько mixins

Стек — вложенные вызовы factory:

```ts
function Activatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    isActive = false;
    activate() {
      this.isActive = true; // ← MIXIN method
    }
  };
}

const RichUser = Activatable(Timestamped(User));
// RichUser ──extends──► Activatable(…) ──extends──► Timestamped(…) ──extends──► User
```

Порядок важен: внешний mixin — ближайший предок экземпляра. Одинаковые имена методов перезапишут друг друга по правилам `extends`.

## Constrained mixin

Если примесь читает поля базы, сужают конструктор:

```ts
type Named = new (...args: any[]) => { name: string };

function Greeter<TBase extends Named>(Base: TBase) {
  return class extends Base {
    greet() {
      return `hi, ${this.name}`; // ← CONSTRAINT: name есть
    }
  };
}

Greeter(User); // ок — у User есть name
// Greeter(class {}); // ошибка типов: нет name
```

Так checker ловит несовместимую базу до рантайма.

## Когда не mixin

| Подходит mixin | Лучше сервис / DI |
| --- | --- |
| 1–3 метода, слабая связь с базой | Много состояния и сложный init |
| Поведение «умеет X» рядом с классом | Отдельная подсистема с жизненным циклом |
| Явный `Constructor` / Shape | Разные сигнатуры конструкторов плохо стыкуются |

---

# 6. Ссылки

- [TypeScript Handbook: Mixins](https://www.typescriptlang.org/docs/handbook/mixins.html)
- [TypeScript Handbook: Generics · Constraints](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints)
- [javascript.info: Mixins](https://javascript.info/mixins)
