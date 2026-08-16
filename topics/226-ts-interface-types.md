# 1. Тема

**Interface и types**

---

# 2. Главное в одну фразу

`interface` и `type` оба описывают формы значений; у interface есть declaration merging, у type — удобные union и сложные выражения.

---

# 3. Суть

> В TypeScript объектную форму чаще задают через `interface` или через `type` alias. Оба стираются при emit и оба участвуют в проверке совместимости полей. Разница не в «силе типов», а в том, какие конструкции язык разрешает и как декларации складываются между файлами.
>
> `interface` можно объявить несколько раз с одним именем — checker **сливает** (declaration merging) поля в один контракт. Так удобно расширять модель по модулям или дополнять сторонние типы. `type` имя закреплено один раз: повторное объявление — ошибка.
>
> `type` свободно строит union (`A | B`), intersection (`A & B`), условные и mapped-выражения. `interface` описывает объектную форму и может `extends`, но сам по себе не становится «или Ok, или Err».
>
> Ловушка: выбирать «только interface» или «только type» догмой. Для публичного объектного API с возможным дополнением — interface; для union/утилит и одноразовых алиасов — type. Смешивать можно; важно не путать merge с переопределением.

---

# 4. Самое главное запомнить

- `interface` и `type` для объектов часто взаимозаменяемы по полям.
- Declaration merging работает у `interface`, не у `type`.
- Union (`|`) и сложные type-выражения — сильная сторона `type`.
- `interface` может `extends`; `type` может `&` (intersection).
- Оба стираются в JS; в рантайме формы нет.
- Не дублировать одно имя `type` в двух местах — это ошибка, не merge.

---

# 5. Описание

```text
interface User { … }     type User = { … }
        │                        │
        ├─ merge при повторе     ├─ одно объявление имени
        ├─ extends               ├─ |  &  utilities
        └─ объектная форма       └─ любой type-выражение
```

## Похожий объектный контракт

```ts
interface UserI {
  id: string;
  name: string;
}

type UserT = {
  id: string;
  name: string;
};

function label(u: UserI | UserT) {
  return u.name;
}
```

Для простой формы объекта выбор часто стилевой. Важнее единообразие в команде, чем микроразличия.

## Declaration merging

```ts
interface User {
  id: string;
}

interface User {
  email: string; // ← MERGE: поля склеиваются
}

const u: User = { id: "1", email: "a@b.c" };
```

Так библиотеки и ambient-декларации наращивают глобальные или модульные интерфейсы. С `type` второй `type User = …` не сольётся — будет конфликт имён.

## Union и ветвление

```ts
type Ok = { ok: true; value: string };
type Err = { ok: false; error: string };
type Result = Ok | Err; // ← UNION: interface так не пишут

function message(r: Result) {
  return r.ok ? r.value : r.error;
}
```

Discriminated union — типичный случай, где `type` выразительнее: одна сущность «результат» с взаимоисключающими ветками.

## Extends и intersection

```ts
interface WithId {
  id: string;
}
interface User extends WithId {
  name: string;
}

type Admin = User & { role: "admin" };
```

`extends` у interface читается как наследование формы. `&` у type смешивает формы в пересечение — удобно для миксинов типов без нового `interface`.

## Что выбрать на практике

| Ситуация | Частый выбор |
|---|---|
| Публичная модель сущности, возможны дополнения | `interface` |
| `Ok \| Err`, литеральные union, mapped/conditional | `type` |
| Пропсы компонента / локальный shape | любой; в React-экосистеме часто `type` |
| Дополнить чужой контракт | merge `interface` / module augmentation |

---

# 6. Ссылки

- [TypeScript Handbook — Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [TypeScript Handbook — Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript — Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [TypeScript Handbook — Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
