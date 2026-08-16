# 1. Тема

**keyof · typeof · keyof typeof**

---

# 2. Главное в одну фразу

`keyof` даёт union ключей типа, `typeof` (в позиции типа) — тип значения; вместе `keyof typeof` связывают объект-значение с безопасным набором ключей.

---

# 3. Суть

> `keyof` и `typeof` в TypeScript — операторы уровня типов. `keyof T` превращает объектный тип в union имён его свойств (`"id" | "name"`). `typeof` в аннотации или `type`-алиасе берёт тип у уже существующего значения (`const config`, функция, класс), не путаясь с рантайм-`typeof` из JavaScript.
>
> Зачем: не дублировать список ключей вручную. Меняется форма `User` или объект `ROUTES` — производные типы (`Pick`, indexed access, ключи словаря) подтягиваются checker’ом. Типичный паттерн — `keyof typeof routes` для безопасного доступа к константе.
>
> Как: `type Keys = keyof User`; `type C = typeof config`; `type Route = keyof typeof ROUTES`. С дженериками часто `K extends keyof T` и возврат `T[K]`. Всё это существует только на этапе проверки типов.
>
> Ловушка: путать type-level `typeof` с JS-`typeof` (строка `"string"` / `"object"`). Ещё: `keyof` у массива/tuple даёт и числовые индексы, и методы вроде `"length"` — для «только полей объекта» смотрят на форму типа.

---

# 4. Самое главное запомнить

- `keyof T` → union ключей объектного типа `T`.
- `typeof value` (в типе) → тип значения; в JS после emit оператора нет.
- `keyof typeof obj` — ключи константы без отдельного `interface`.
- `K extends keyof T` + `T[K]` — безопасный доступ к полю по ключу.
- Type-level `typeof` ≠ рантайм-`typeof` из JavaScript.
- Операторы стираются при emit: в бандле остаются обычные значения.

---

# 5. Описание

```text
тип User { id, name }
        │
     keyof User  →  "id" | "name"

const ROUTES = { home: "/", about: "/about" }
        │
     typeof ROUTES           →  { home: string; about: string }
     keyof typeof ROUTES     →  "home" | "about"
              ↓
         только checker (в JS — обычный объект)
```

## `keyof`

Оператор берёт ключи **типа**, не значения:

```ts
type User = {
  id: string;
  name: string;
};

type UserKey = keyof User; // ← "id" | "name"

function getField<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]; // ← KEYOF + indexed access
}
```

`K extends keyof T` обещает, что `key` — реальный ключ `T`, а `T[K]` — тип этого поля.

## `typeof` как type query

В позиции типа `typeof` читает тип у значения:

```ts
const defaults = {
  theme: "dark" as const,
  locale: "ru" as const,
};

type Defaults = typeof defaults;
// { readonly theme: "dark"; readonly locale: "ru" }

function createStore() {
  return { count: 0, inc() {} };
}

type Store = ReturnType<typeof createStore>; // ← часто рядом с typeof
```

Рядом часто ставят `ReturnType<typeof fn>` и `InstanceType<typeof Class>` — это уже utility, но вход всё равно type-level `typeof`.

## `keyof typeof`

Связка «значение → ключи» без ручного union:

```ts
const ROUTES = {
  home: "/",
  about: "/about",
  profile: "/me",
} as const;

type RouteName = keyof typeof ROUTES; // ← "home" | "about" | "profile"

function path(name: RouteName): string {
  return ROUTES[name]; // ← безопасный доступ
}
```

`as const` сужает литералы; без него значения часто становятся просто `string`, а ключи всё равно остаются именами свойств.

## Чем не путать

| Контекст | Что даёт |
|----------|----------|
| `typeof x === "string"` (JS / guard) | строка-тег рантайма, сужение в ветке |
| `type T = typeof x` (TS) | тип значения для checker’а |
| `keyof T` | union ключей **типа** `T` |

Type guards с рантайм-`typeof` — соседняя тема; здесь `typeof` — про вывод типа из значения.

---

# 6. Ссылки

- [TypeScript Handbook — keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [TypeScript Handbook — typeof Type Operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)
- [TypeScript Handbook — Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [TypeScript Handbook — Generics · Constraints](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints)
- [TypeScript Handbook — typeof type guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#typeof-type-guards)
