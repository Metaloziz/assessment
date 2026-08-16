# 1. Тема

**Generics · параметры типа · constraints**

---

# 2. Главное в одну фразу

Generics параметризуют типы через `<T>`: одна реализация работает с разными формами, а checker подставляет конкретный тип на месте вызова.

---

# 3. Суть

> Generics в TypeScript — параметры типа (`T`, `K`, `V`…), которые делают функцию, тип или класс переиспользуемыми без потери точности. Вместо `any` или копипасты `identityString` / `identityNumber` пишут `identity<T>(x: T): T`: на каждом вызове `T` становится тем типом, который реально передали.
>
> Зачем: общие контейнеры (`Array<T>`, `Promise<T>`, свой `Result<T, E>`), хелперы API и UI, которые не должны «забывать» форму данных. Меняется вызов — меняется вывод типов у результата, без правок тела функции.
>
> Как: объявляют параметр в угловых скобках; checker выводит `T` из аргументов или берёт явный `fn<string>(…)`. Ограничение `T extends X` сужает допустимые кандидаты — внутри функции доступны поля `X`. Значение по умолчанию `T = string` задаёт запасной тип, если вывести не из чего.
>
> Ловушка: считать, что `T` живёт в рантайме — после emit параметров типа нет, остаётся обычный JS. Ещё: слишком широкий `T` без constraint или наоборот `T extends any` — снова теряется смысл дженерика.

---

# 4. Самое главное запомнить

- `<T>` — слот типа; на вызове заполняется выводом или явно.
- `fn<T>(x: T): T` сохраняет связь «вход → выход» лучше, чем `any`.
- `T extends X` — ограничение: внутри доступны поля `X`.
- `T = Default` — значение по умолчанию, если вывести нельзя.
- Несколько параметров: `<T, K extends keyof T>`.
- Generics стираются при emit: в JS параметра типа нет.

---

# 5. Описание

```text
объявление:  fn<T>(x: T): T
                  │
вызов:       fn("hi")     или    fn<string>("hi")
                  │
подстановка: T = string
                  │
результат:   string  (только checker; в JS — обычная функция)
```

## Параметр типа у функции

Минимальный паттерн — «вернуть то же, что приняли», с сохранением типа:

```ts
function identity<T>(value: T): T {
  return value; // ← T связан: вход и выход одного типа
}

const a = identity("hi"); // T = string (вывод)
const b = identity<number>(42); // T = number (явно)
```

Без дженерика пришлось бы писать `any` или отдельные перегрузки на каждый тип.

## Вывод vs явный аргумент

Checker чаще выводит `T` из аргументов. Явный `<…>` нужен, когда вывести не из чего (пустой массив, фабрика без входа) или когда хотят сузить шире выведенное.

```ts
const empty = [] as string[]; // иначе string[] | никогда не угадаешь из []
const list = identity<string[]>([]); // ← явный T
```

## Constraints: `T extends …`

Без ограничения у `T` почти нет полей. Constraint обещает форму:

```ts
function pluckId<T extends { id: string }>(row: T): string {
  return row.id; // ← CONSTRAINT: id точно есть
}

pluckId({ id: "1", name: "Ann" }); // ок
// pluckId({ name: "Ann" }); // ошибка: нет id
```

`extends` здесь — «обязан быть совместим с», не наследование класса.

## Типы, интерфейсы, классы

Тот же слот работает у алиасов и классов:

```ts
type Box<T> = { value: T };

interface Repo<T> {
  get(id: string): T | undefined;
  save(item: T): void;
}

class Queue<T> {
  private items: T[] = [];
  push(x: T) {
    this.items.push(x);
  }
  pop(): T | undefined {
    return this.items.pop();
  }
}
```

`Box<string>` и `Box<User>` — разные конкретные типы с общей формой.

## Несколько параметров и default

```ts
function pick<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]; // ← K — ключ именно этого T
}

type Response<T = unknown> = {
  // ← DEFAULT
  data: T;
  ok: boolean;
};

type AnyResponse = Response; // Response<unknown>
type UserResponse = Response<User>;
```

`keyof T` и indexed access `T[K]` часто идут рядом с дженериками (подробнее — в теме про `keyof` / `typeof`).

## Что стирается

```ts
// TypeScript
function wrap<T>(x: T): T {
  return x;
}

// после emit ≈
function wrap(x) {
  return x;
}
```

Нельзя написать `if (T === string)` — `T` не значение. Для рантайм-веток нужны обычные проверки и type guards.

---

# 6. Ссылки

- [TypeScript Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook — Generic Constraints](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints)
- [TypeScript Handbook — Generic Classes](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-classes)
- [TypeScript Handbook — Generic Parameter Defaults](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-parameter-defaults)
- [TypeScript Handbook — keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
