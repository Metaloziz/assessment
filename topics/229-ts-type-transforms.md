# 1. Тема

**Преобразование типов (extend, |, &, Utility Types)**

---

# 2. Главное в одну фразу

Из существующих типов строят новые через `extends`, union `|`, intersection `&` и встроенные Utility Types (`Partial`, `Pick`, `Omit`…).

---

# 3. Суть

> Преобразование типов в TypeScript — это способ получить новый тип из уже описанных, не копируя поля вручную. Базовые операторы: `extends` (наследование формы / ограничение дженерика), `|` (union — «или»), `&` (intersection — «и то, и другое»). Рядом лежат готовые утилиты Handbook’а: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record` и другие.
>
> Зачем: один исходный контракт (`User`, `Config`) — много производных (черновик формы, публичный DTO, ключи словаря). Меняется база — производные подтягиваются checker’ом, а не правками в десяти копиях.
>
> Как: `interface Admin extends User` добавляет поля к объекту; `type Status = "idle" | "done"` собирает альтернативы; `User & { role: "admin" }` требует оба набора полей сразу. Utility Types — сахар над mapped/conditional: `Partial<T>` делает поля опциональными, `Pick` / `Omit` вырезают ключи.
>
> Ловушка: путать `|` и `&` («или ветка» vs «склеить требования») и считать Utility «магией рантайма» — они существуют только на этапе проверки типов и стираются при emit.

---

# 4. Самое главное запомнить

- `extends` у interface — расширить форму; у дженерика `T extends X` — ограничить параметр.
- `|` — union: значение принадлежит одной из веток.
- `&` — intersection: значение должно удовлетворять всем частям сразу.
- Utility Types (`Partial`, `Pick`, `Omit`…) — готовые преобразования формы.
- Производный тип живёт в checker’е; в JS после emit его нет.
- Не смешивать смысл `|` и `&`: «черновик или готовый» ≠ «обязательны оба набора полей».

---

# 5. Описание

```text
базовый тип T
   ├─ extends …     → шире / ограниченный параметр
   ├─ A | B         → одна из веток
   ├─ A & B         → поля/требования обеих сторон
   └─ Utility<T>    → Partial · Pick · Omit · …
              ↓
         производный тип (только checker)
```

## `extends`

У `interface` — наследование объектной формы:

```ts
interface WithId {
  id: string;
}

interface User extends WithId {
  name: string; // ← EXTENDS: User = id + name
}
```

У дженериков — **ограничение**: `T` обязан быть совместим с указанным типом.

```ts
function pluckId<T extends { id: string }>(row: T): string {
  return row.id; // ← T точно имеет id
}
```

`extends` здесь не «наследует класс», а «T должен подходить под форму».

## Union `|`

Union — набор альтернатив. Значение имеет тип **одной** ветки; после narrowing доступны поля этой ветки.

```ts
type Status = "idle" | "loading" | "done";

type Ok = { ok: true; value: string };
type Err = { ok: false; error: string };
type Result = Ok | Err; // ← UNION
```

Частый паттерн — discriminated union с общим литеральным полем (`ok`, `type`, `kind`).

## Intersection `&`

Intersection требует **все** части сразу. Для объектов поля склеиваются; конфликт несовместимых типов одного ключа даёт `never` на этом поле.

```ts
type Timestamped = { createdAt: Date };
type User = { id: string; name: string };

type StoredUser = User & Timestamped; // ← INTERSECTION: id, name, createdAt
```

Контраст с `|`: `User | Timestamped` — либо user, либо timestamped (общие поля узкие); `User & Timestamped` — обязательно и то, и другое.

## Utility Types

Встроенные алиасы Handbook’а — преобразования ключей и модификаторов:

| Утилита | Смысл |
|---|---|
| `Partial<T>` | все поля опциональны |
| `Required<T>` | все поля обязательны |
| `Readonly<T>` | поля только для чтения |
| `Pick<T, K>` | взять ключи `K` |
| `Omit<T, K>` | убрать ключи `K` |
| `Record<K, V>` | словарь ключ → значение |

```ts
type User = {
  id: string;
  name: string;
  email: string;
};

type UserDraft = Partial<User>; // ← все поля?
type UserPublic = Pick<User, "id" | "name">; // ← только id, name
type UserSecrets = Omit<User, "email">; // ← без email
```

Под капотом многие утилиты — mapped types; глубокий разбор `infer` / conditional — в соседней теме. Здесь достаточно уметь читать и выбирать готовую утилиту.

## Как выбирать оператор

```text
нужна «или»-ветка?              → |
нужно склеить требования?       → &  (или interface extends)
черновик / патч полей?          → Partial
вырезать/оставить ключи DTO?    → Pick / Omit
словарь по ключам?              → Record
```

---

# 6. Ссылки

- [TypeScript Handbook — Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [TypeScript Handbook — Everyday Types (Union)](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)
- [TypeScript Handbook — Object Types (Extending)](https://www.typescriptlang.org/docs/handbook/2/objects.html#extending-types)
- [TypeScript Handbook — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [TypeScript Handbook — Generics (Constraints)](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints)
