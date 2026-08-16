# 1. Тема

**Conditional types · mapped types · infer**

---

# 2. Главное в одну фразу

Условные типы выбирают ветку по `extends`, mapped types проходят по ключам и собирают новую форму, `infer` вытаскивает кусок типа из паттерна — всё только в checker’е.

---

# 3. Суть

> Conditional types, mapped types и `infer` — инструменты «типов из типов» в TypeScript. Условный тип `T extends U ? X : Y` выбирает ветку по совместимости. Mapped type `{ [K in Keys]: … }` строит объект, проходя по каждому ключу. `infer R` внутри `extends` вытаскивает фрагмент из формы (элемент Promise, возврат функции).
>
> Зачем: свои утилиты вроде `Partial` / `ReturnType` / `Unwrap`, производные DTO и хелперы API без копипасты полей. Меняется база — производные пересчитывает checker.
>
> Как: пишут `type IsString<T> = T extends string ? true : false`; `type ReadonlyProps<T> = { readonly [K in keyof T]: T[K] }`; `type Elem<T> = T extends (infer E)[] ? E : never`. На union условный тип по умолчанию **дистрибутивен**: применяется к каждой ветке.
>
> Ловушка: ждать рантайм-ветвления — после emit типов нет. Ещё: путать `infer` с выводом аргументов у вызова функции и забывать про distributivity (иногда её специально отключают обёрткой в tuple).

---

# 4. Самое главное запомнить

- `T extends U ? X : Y` — ветка типов по совместимости, не `if` в JS.
- На голом параметре union условие **раскрывается** по веткам (distributivity).
- Mapped: `{ [K in keyof T]: … }` — новая форма по ключам `T`.
- Модификаторы `+`/`-` `readonly` / `?` меняют опциональность и readonly.
- `infer R` в `extends`-паттерне — именованный «карман» для куска типа.
- Всё стирается при emit: в бандле остаётся обычный JS.

---

# 5. Описание

```text
входной тип T
   │
   ├─ T extends U ? X : Y     → ветка True / False
   │         (+ на A|B → по каждой ветке)
   │
   ├─ { [K in keyof T]: … }   → объект по ключам
   │
   └─ … extends … infer R …   → вытащить R из формы
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

Типичный приём — сузить union до нужных веток:

```ts
type NonNullable<T> = T extends null | undefined ? never : T;
// NonNullable<string | null> → string
```

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

Так устроены многие Utility Types: `Partial`, `Required`, `Readonly`, `Pick` (через отбор ключей).

## `infer`

В правой части `extends` можно объявить переменную типа через `infer` и использовать её в ветке True:

```ts
type Awaited<T> = T extends Promise<infer V> ? V : T;
// Awaited<Promise<string>> → string

type ReturnOf<F> = F extends (...args: never[]) => infer R ? R : never;
// ReturnOf<() => number> → number

type Head<T> = T extends [infer H, ...unknown[]] ? H : never;
// Head<[string, number]> → string
```

`infer` работает только внутри условного типа в паттерне `extends`. Это не рантайм-разбор и не `typeof` значения.

## Связка трёх

Частый рецепт: mapped + conditional (+ иногда `infer`) для точечных преобразований:

```ts
type NullableFields<T> = {
  [K in keyof T]: T[K] | null; // ← mapped
};

type StringsOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
  // ← key remapping + conditional
};
```

`as` в mapped (key remapping) отфильтровывает или переименовывает ключи; подробнее про шаблонные имена ключей — в теме про template literal types.

---

# 6. Ссылки

- [TypeScript Handbook — Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook — Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript Handbook — Inferring Within Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types)
- [TypeScript Handbook — Key Remapping](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as)
- [TypeScript Handbook — Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
