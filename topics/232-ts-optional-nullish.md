# 1. Тема

**Optional chaining и nullish coalescing**

---

# 2. Главное в одну фразу

`?.` безопасно читает вложенные поля и вызывает методы без `TypeError`, а `??` подставляет запасное значение только для `null` / `undefined`, не трогая `0`, `''` и `false`.

---

# 3. Суть

> Optional chaining (`?.`) и nullish coalescing (`??`) — операторы для «дырявых» данных: ответа API, optional-полей, конфигов. `a?.b` и `fn?.()` не падают, если слева `null` или `undefined`: выражение сразу даёт `undefined`. `x ?? fallback` берёт запас только когда `x` — `null` или `undefined`.
>
> Так пишут доступ к вложенности и дефолты без длинных `if` и без подмены легитимных «пустых, но осмысленных» значений. Типичный сценарий: `user?.profile?.email` и `pageSize ?? 20`.
>
> Цепочка `?.` обрывается на первом `nullish`-звене; справа от обрыва ничего не вычисляется. `??` смотрит только на nullish, в отличие от `||`, который срабатывает на любое falsy (`0`, `''`, `false`, `NaN`).
>
> Ловушка: путать `??` с `||` — тогда ноль и пустая строка «пропадают». Ещё: `?.` не лечит неправильную форму объекта дальше по пути — только отсутствие значения слева.

---

# 4. Самое главное запомнить

- `obj?.prop` / `obj?.[key]` / `fn?.()` → `undefined`, если слева `null` | `undefined`; иначе обычный доступ / вызов.
- Цепочка коротко замыкается: дальше выражения после «дыры» не выполняют.
- `a ?? b` подставляет `b` только при `null` / `undefined`.
- `0`, `''`, `false` для `??` — валидные значения; для `||` — повод взять правую часть.
- В TypeScript при `strictNullChecks` `?.` сужает optional в выражении без лишних проверок.
- `?.` и `??` — рантайм-операторы JS; типы только отражают результат (`T | undefined` и т.п.).

---

# 5. Описание

```text
данные (часто partial / API)
        │
        ├─?.─► чтение / вызов без TypeError
        │       (дыра → undefined, дальше не идём)
        │
        └─??─► дефолт только для null | undefined
                (0 / '' / false остаются)
```

## Optional chaining `?.`

Три формы:

| Запись | Смысл |
|---|---|
| `obj?.prop` | свойство |
| `obj?.[key]` | вычисляемый ключ |
| `fn?.(...args)` | вызов, если функция есть |

```ts
type User = {
  profile?: { email?: string };
};

function emailOf(user: User | null) {
  return user?.profile?.email; // ← string | undefined, без throw
}
```

Без `?.` пришлось бы писать `user && user.profile && user.profile.email` или ловить `TypeError` на `null.profile`.

Короткое замыкание:

```ts
const n = null;
n?.toUpperCase(); // undefined — toUpperCase не вызывали
```

## Nullish coalescing `??`

```ts
function pageSize(raw: number | null | undefined) {
  return raw ?? 20; // ← 0 останется 0
}

pageSize(0); // 0
pageSize(null); // 20
pageSize(undefined); // 20
```

Контраст с `||`:

```ts
0 || 20; // 20  — ноль «пропал»
0 ?? 20; // 0   — ноль сохранили
"" || "guest"; // "guest"
"" ?? "guest"; // ""
```

`??` выбирают, когда «пусто» значит именно «значения нет», а не «falsy».

## Вместе

Частый шаблон ответа API:

```ts
const title = response?.data?.title ?? "Без названия";
const items = response?.data?.items ?? [];
```

Сначала безопасный доступ, потом дефолт только для отсутствующего значения.

## Что не делает `?.`

- Не подставляет дефолт сам — для этого `??` или явное условие.
- Не проверяет «правильность» объекта: если `profile` есть, но это не объект с `email`, поведение как у обычной точки.
- Не заменяет type guard, когда нужна узкая форма и работа с полями в большой ветке.

---

# 6. Ссылки

- [Optional chaining (`?.`) — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [Nullish coalescing (`??`) — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [Optional chaining — TypeScript handbook](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#optional-chaining)
- [Nullish coalescing — TypeScript handbook](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#nullish-coalescing)
- [ECMAScript optional chaining proposal](https://github.com/tc39/proposal-optional-chaining)
