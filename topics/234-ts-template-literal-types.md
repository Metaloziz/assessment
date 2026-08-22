# 1. Тема

**Template Literal Types**

---

# 2. Главное в одну фразу

Template literal types собирают строковые типы через `` `…${T}…` ``: unions раскрываются в декартово произведение, intrinsic меняют регистр, `infer` и key remapping — разбирают и переименовывают ключи только в checker’е.

---

# 3. Суть

> Template literal types в TypeScript — типы-строки с интерполяцией, как у JS template strings, но только для checker’а. Пишут `` type Id = `user-${string}` `` или `` `${A}-${B}` ``: слоты заполняются литералами, unions и примитивами, которые можно вставить в строку (`string`, `number`, `bigint`, `boolean`, `null`, `undefined`).
>
> Зачем: имена событий (`onClick` / `onChange`), пути API, CSS-единицы, «геттеры» из ключей объекта — без ручного перечисления всех комбинаций. Меняется база литералов — производные типы пересчитывает checker.
>
> Как: unions в слотах **раскрываются** (`` `${'a'|'b'}${'1'|'2'}` `` → `"a1" | "a2" | "b1" | "b2"`). Intrinsic `Uppercase` / `Lowercase` / `Capitalize` / `Uncapitalize` меняют регистр литералов. В условном типе `` T extends `${infer H}/${infer R}` `` вытаскивают куски; в mapped — `` as `get${Capitalize<…>}` `` переименовывают ключи.
>
> Ловушка: ждать рантайм-склейки строк — после emit типов нет. Ещё: путать template literal **type** с обычным template string в значении и забывать, что широкий `string` в слоте даёт бесконечное семейство строк, а не один литерал.

---

# 4. Самое главное запомнить

- `` `prefix-${T}` `` — тип-строка с интерполяцией, не значение в JS.
- Union в слоте раскрывается; несколько unions → все комбинации.
- Intrinsic: `Uppercase` / `Lowercase` / `Capitalize` / `Uncapitalize`.
- `` extends `${infer A}…` `` — разобрать строковый тип на части.
- Mapped + `as` + template — переименовать ключи (`getName`, `onClick`).
- Всё стирается при emit: в бандле остаётся обычный JS.

---

# 5. Описание

```text
слоты:     `pre-${T}-suf`
                │
T = литерал / union / string | number | …
                │
union × union → все комбинации ("a1"|"a2"|…)
                │
intrinsic     → Uppercase / Capitalize / …
                │
infer / as    → разобрать или переименовать ключи
                ↓
         строковый тип (только checker)
```

## Базовый синтаксис

Форма как у template string, но слева от `=` — **тип**:

```ts
type Greeting = `hello-${string}`;
// подходит: "hello-world", "hello-42"
// не подходит: "hi-world"

type Version = `v${number}`;
// "v1", "v2.5" — ок для checker’а как шаблон с number
```

В слот `${…}` можно подставить тип, совместимый со строковой интерполяцией. Широкий `string` означает «любой хвост», а не один конкретный литерал.

## Unions и декартово произведение

Каждая ветка union в каждом слоте даёт отдельный литерал:

```ts
type Axis = "x" | "y";
type Sign = "+" | "-";

type Point = `${Axis}${Sign}`;
// "x+" | "x-" | "y+" | "y-"  ← все комбинации
```

Так удобно описывать конечные наборы имён (события, флаги, сегменты пути), не перечисляя их вручную.

## Intrinsic string manipulation

Встроенные утилиты работают на строковых литералах (и unions из них):

```ts
type U = Uppercase<"id">; // "ID"
type L = Lowercase<"ID">; // "id"
type C = Capitalize<"name">; // "Name"
type Un = Uncapitalize<"Name">; // "name"
```

Частый паттерн — `Capitalize` вместе с key remapping для «геттеров» / обработчиков.

## `infer` внутри шаблона

Условный тип может разобрать строковый тип по шаблону:

```ts
type PathHead<T extends string> = T extends `${infer Head}/${infer Rest}`
  ? Head // ← HEAD: первый сегмент
  : T;

type H = PathHead<"users/42/profile">; // "users"
```

Несколько `infer` и хвостов (`${string}`) позволяют описывать разбор URL, CSS и подобных форматов на уровне типов.

## Key remapping + template

Mapped type с `as` и шаблоном строит новые ключи из старых:

```ts
type User = { id: string; name: string };

type Getters<T> = {
  [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K];
  // ← REMAP: id → getId, name → getName
};

// { getId: () => string; getName: () => string }
```

Тот же приём — для `on${Capitalize<…>}`, префиксов API и производных DTO-ключей. Связка с conditional/mapped из соседней темы: фильтр ключей через `as … ? K : never`, переименование — через template.

---

# 6. Ссылки

- [TypeScript Handbook — Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [TypeScript Handbook — Key Remapping via `as`](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as)
- [TypeScript Handbook — Intrinsic String Manipulation Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html#intrinsic-string-manipulation-types)
- [TypeScript 4.1 Release Notes — Template Literal Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#template-literal-types)
- [TypeScript Handbook — Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
