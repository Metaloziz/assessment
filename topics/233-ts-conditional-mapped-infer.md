# 1. Тема

**Conditional types · mapped types · infer**

---

# 2. Главное в одну фразу

Conditional types ветвят типы по `extends`, mapped types пересобирают объект по ключам, `infer` вытаскивает фрагмент из паттерна — вместе это «конструктор» для `ReturnType`, `Pick`, рекурсивного `Awaited` и своих DTO только в checker’е.

---

# 3. Суть

> Conditional types, mapped types и `infer` — способ **строить новые типы из старых**, не переписывая поля вручную. Условный тип `T extends U ? X : Y` выбирает ветку по совместимости. Mapped `{ [K in keyof T]: … }` проходит по каждому ключу и задаёт новую форму. `infer R` внутри `extends` «заглядывает» внутрь формы и называет кусок — элемент массива, возврат функции, аргумент промиса.
>
> Зачем: так устроены встроенные Utility Types (`Partial`, `ReturnType`, `Exclude`, `Parameters`) и ваши производные контракты — API DTO, «только строковые поля», разбор вложенных промисов. Меняется базовый интерфейс — checker пересчитывает все алиасы, а не десять копий вручную.
>
> Как: `Exclude<T, U>` пишут как `T extends U ? never : T` — distributivity выкидывает ветки union. Mapped с `as` и условием фильтрует или переименовывает ключи. Рекурсивный `Awaited<T>` снова вызывает себя на вложенном `Promise`. Чтобы **не** раскрывать union по веткам, параметр оборачивают в `[T] extends [U]`.
>
> Ловушка: ждать рантайм-ветвления — после emit типов нет. `infer` не выводит аргументы при вызове функции; он работает только в conditional. Забыть про distributivity — и `ToArray<A|B>` станет `A[]|B[]`, а не `(A|B)[]`.

---

# 4. Самое главное запомнить

- `T extends U ? X : Y` — ветка типов по совместимости, не `if` в JS.
- На **голом** type parameter union условие **раскрывается** по веткам (distributivity); `[T] extends [U]` — union целиком.
- Mapped: `{ [K in keyof T]: … }` — новая форма по ключам; `as` — фильтр или переименование ключа.
- Модификаторы `+`/`-` у `readonly` / `?` добавляют или снимают опциональность и readonly.
- `infer R` в `extends`-паттерне — именованный «карман»; несколько `infer` и рекурсия — обычный приём senior-утилит.
- Встроенные `ReturnType`, `Exclude`, `Parameters` — готовые рецепты из той же тройки; в бандле остаётся обычный JS.

---

# 5. Описание

```text
входной тип T
   │
   ├─ T extends U ? X : Y     → ветка True / False
   │         (+ на A|B → по каждой ветке, если T «голый»)
   │
   ├─ { [K in keyof T]: … }   → объект по ключам
   │         as Cond ? …      → фильтр / rename ключей
   │
   └─ … extends … infer R …   → вытащить R; рекурсия в True-ветке
              ↓
         производный тип (только checker)
```

## Conditional types

Форма: «если `T` совместим с `U`, возьми `X`, иначе `Y`».

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<"hi">; // true
type B = IsString<42>; // false
```

Типичный приём — сузить union до нужных веток. Так устроены `Exclude` и `Extract`:

```ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

type OnlyStrings = Exclude<string | number | boolean, number | boolean>;
// string

type OnlyNums = Extract<string | number, number>;
// number
```

Ветка `never` «выкидывает» ветку из union — distributivity делает это по каждому члену.

### Distributivity

Если слева от `extends` стоит **голый** type parameter, и в него передали union, условие применяется к **каждой** ветке:

```ts
type ToArray<T> = T extends unknown ? T[] : never;

type R = ToArray<string | number>;
// string[] | number[]  ← не (string | number)[]
```

Чтобы обработать union **целиком**, оборачивают в tuple:

```ts
type ToArrayWhole<T> = [T] extends [unknown] ? T[] : never;
// ToArrayWhole<string | number> → (string | number)[]
```

Это нужно, когда логика должна смотреть на union как на одно целое — сравнение пересечений, «оба сразу», проверка `never`.

## Mapped types

Mapped type проходит по ключам и задаёт тип значения для каждого:

```ts
type User = { id: string; name: string };

type ReadonlyUser = {
  readonly [K in keyof User]: User[K]; // ← MAPPED
};
// { readonly id: string; readonly name: string }
```

Модификаторы можно добавлять и снимать:

```ts
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]; // ← снять readonly
};

type RequiredKeys<T> = {
  [K in keyof T]-?: T[K]; // ← снять ?
};
```

### Key remapping и фильтр ключей

С TypeScript 4.1 в mapped можно менять имя ключа через `as` и отфильтровать ключи условным типом:

```ts
type StringsOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
  // ← оставить только строковые поля
};

type Row = { id: string; age: number; tag: string };
type S = StringsOnly<Row>; // { id: string; tag: string }
```

Тот же приём — переименование (`get${Capitalize<K>}`) и префиксы API; подробнее про шаблонные имена — в теме Template Literal Types.

## `infer`

В правой части `extends` можно объявить переменную типа через `infer` и использовать её в ветке True:

```ts
type ReturnOf<F> = F extends (...args: never[]) => infer R ? R : never;
// ReturnOf<() => number> → number

type Params<F> = F extends (...args: infer P) => unknown ? P : never;
// Params<(a: string, b: number) => void> → [string, number]

type Head<T> = T extends [infer H, ...unknown[]] ? H : never;
// Head<[string, number]> → string
```

`infer` работает только внутри условного типа в паттерне `extends`. Это не рантайм-разбор и не вывод типов аргuments при вызове функции.

### Рекурсивные conditional

Для вложенных структур условие вызывает себя в True-ветке:

```ts
type Awaited<T> = T extends null | undefined
  ? T
  : T extends Promise<infer V>
    ? Awaited<V> // ← снова развернуть вложенный Promise
    : T;

type Deep = Awaited<Promise<Promise<string>>>; // string
```

Так же строят `DeepPartial`, `DeepReadonly` — mapped по ключам + conditional «если объект — рекурсия».

## Связка трёх: как читать Utility Types

| Утилита | Идея реализации |
|---|---|
| `Partial<T>` | mapped + `?` на каждом ключе |
| `Pick<T, K>` | mapped по `K` |
| `ReturnType<F>` | conditional + `infer` возврата |
| `Parameters<F>` | conditional + `infer` args |
| `Exclude` / `Extract` | conditional + `never` / ветка union |

```ts
type NullableFields<T> = {
  [K in keyof T]: T[K] | null; // ← mapped
};
```

Меняется базовый `User` — все производные пересчитываются без правок в десяти файлах.

## Типичные ловушки

- **Distributivity по умолчанию** — `IsArray<T>` на union даст union результатов; для «union целиком» — `[T] extends …`.
- **`infer` только в extends** — нельзя «вытащить» тип из произвольного места без conditional-обёртки.
- **Контравариантность аргументов** — при `infer` из параметров функции в union перегрузок берётся пересечение аргументов, не union (важно для `Parameters` на перегруженных функциях).
- **Рантайм ≠ типы** — conditional не генерирует код; в JS после emit типов нет.

---

# 6. Ссылки

- [TypeScript Handbook — Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook — Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript Handbook — Inferring Within Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types)
- [TypeScript Handbook — Distributive Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)
- [TypeScript Handbook — Key Remapping](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as)
- [TypeScript Handbook — Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
