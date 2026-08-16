# 1. Тема

**Механизм typeGuard**

---

# 2. Главное в одну фразу

Type guard сужает широкий тип в узкой ветке кода: после проверки checker знает более точный тип без лишних приведений.

---

# 3. Суть

> Type guard — проверка в рантайме, после которой TypeScript **сужает** (narrowing) тип значения в этой ветке. На входе часто `unknown`, union или optional; внутри `if` / `else` / `switch` доступны только те поля и методы, которые гарантирует проверка.
>
> Так безопасно разбирают ответы API, DOM-узлы и discriminated union: сначала отсекаем «не то», потом работаем с точной формой. Без сужения пришлось бы писать `as` наугад или плодить optional-цепочки.
>
> Встроенные опоры — `typeof`, `instanceof`, сравнение с литералом, оператор `in`. Свой контракт оформляют предикатом `value is Type` или assertion `asserts value is Type`. Guard живёт в JS как обычный `boolean` (или `throw`); сужение — только на этапе проверки типов.
>
> Ловушка: возвращать `true`/`false` без `is Type` — рантайм «ок», но тип снаружи не сузится. Ещё хуже — врать в предикате: checker поверит, а в рантайме поля не будет.

---

# 4. Самое главное запомнить

- Narrowing действует **внутри** ветки после успешной проверки, не «навсегда» у переменной.
- `typeof` / `instanceof` / литерал / `in` — встроенные guards.
- Предикат: `function isUser(x: unknown): x is User`.
- Discriminated union (`kind` / `ok`) сужается сравнением тега.
- `asserts x is T` — сужение после вызова или `throw`.
- Ложный predicate ломает безопасность типов, не падает компилятор.

---

# 5. Описание

```text
значение: unknown | string | number | User | …
        │
        ▼
   type guard?  ──false──► другая ветка / ошибка
        │ true
        ▼
   суженный тип в этой ветке
   (поля и методы известны checker’у)
```

## Зачем нужен narrowing

Типы стираются в JS: в рантайме остаётся значение. Checker не «видит» сеть и DOM сам — ему нужна проверка, которую он понимает как сужение.

```ts
function len(x: string | number) {
  if (typeof x === "string") {
    return x.length; // ← здесь x: string
  }
  return String(x).length; // ← здесь x: number
}
```

Без `if` к `x.length` на union не обратиться: у `number` поля `length` нет.

## Встроенные проверки

| Проверка | Типичный случай |
|---|---|
| `typeof x === "string"` | примитивы |
| `x instanceof Date` | экземпляры классов |
| `x === null` / `x != null` | optional / nullable |
| `"id" in x` | наличие объекта с полем |
| `x.kind === "ok"` | discriminant у union |

`typeof null === "object"` — историческая ловушка JS; для `null` чаще явная проверка.

## Предикат `value is Type`

Когда формы не хватает стандартных операторов, пишут свою функцию:

```ts
type User = { id: string; name: string };

function isUser(x: unknown): x is User {
  // ← PREDICATE: возвращает boolean + сужает тип
  return (
    typeof x === "object" &&
    x !== null &&
    "id" in x &&
    typeof (x as User).id === "string" &&
    typeof (x as User).name === "string"
  );
}

function greet(raw: unknown) {
  if (!isUser(raw)) return "guest";
  return raw.name; // ← raw: User
}
```

Сигнатура `x is User` — контракт с checker’ом. Тело должно реально проверять то, что обещает тип.

## Discriminated union

Общий тег делает сужение коротким и надёжным:

```ts
type Ok = { ok: true; value: string };
type Err = { ok: false; error: string };
type Result = Ok | Err;

function message(r: Result) {
  if (r.ok) return r.value; // Ok
  return r.error; // Err
}
```

Тег (`ok`, `kind`, `type`) — и guard, и документация формы.

## Assertion functions

```ts
function assertUser(x: unknown): asserts x is User {
  if (!isUser(x)) throw new Error("not a User");
}

function handle(raw: unknown) {
  assertUser(raw);
  return raw.id; // ← после вызова raw: User
}
```

После успешного `asserts` тип сужен ниже по коду; при провале — исключение, ветки «продолжения» нет.

## Чего не делает type guard

- Не добавляет поля в рантайме — только проверяет и сужает тип.
- Не заменяет валидацию схемы целиком (Zod и т.п.), если нужна глубокая проверка JSON.
- Не работает «через» мутацию той же переменной так же надёжно, как через локальный `const` после проверки — для сложных случаев копируют в новую константу.

---

# 6. Ссылки

- [TypeScript Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript Handbook — typeof type guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#typeof-type-guards)
- [TypeScript Handbook — Using type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- [TypeScript Handbook — Assertion functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
- [TypeScript Handbook — Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
