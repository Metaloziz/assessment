# 1. Тема

**Основные типы данных в TS**

---

# 2. Главное в одну фразу

В TypeScript базовые типы — примитивы JS плюс специальные (`any`, `unknown`, `never`, `void`) и составные (массивы, кортежи, object / literal types).

---

# 3. Суть

> Основные типы в TS описывают, какие значения допустимы у переменной или параметра. Примитивы совпадают с JS: `string`, `number`, `boolean`, `null`, `undefined`, `bigint`, `symbol`. К ним добавляют составные формы — массивы, кортежи с фиксированной длиной и наборами позиций, объектные и literal types (`"ok"`, `42`).
>
> Отдельно стоят «системные» типы checker’а: `void` — функция ничего осмысленного не возвращает; `never` — путь кода не завершается нормально; `unknown` — значение есть, но сначала нужно сузить; `any` — отключает проверку.
>
> На практике выбирают самый узкий честный тип: лучше `string | null`, чем `any`. Literal и union сужают ветки `if` / `switch`; массивы и кортежи различают «список одного вида» и «пара позиций с разными ролями».
>
> Ловушка: привычка ставить `any` «чтобы собралось» и путать `object` с конкретной формой `{ id: string }`. Широкий тип снова пропускает те баги, ради которых взяли TS.

---

# 4. Самое главное запомнить

- Примитивы TS зеркалят JS; типы стираются при emit.
- `unknown` безопаснее `any`: сначала narrowing, потом использование.
- `void` — нет полезного return; `never` — недостижимый / не возвращающий путь.
- `T[]` / `Array<T>` — однородный список; `[string, number]` — кортеж по позициям.
- Object type и type literal описывают форму объекта, не «любой non-primitive» в бытовом смысле.
- `strict` / `strictNullChecks` делают `null` и `undefined` явными в union.

---

# 5. Описание

```text
значения
  ├─ primitives: string | number | boolean | null | undefined | bigint | symbol
  ├─ special:    any | unknown | never | void
  └─ compound:   arrays · tuples · object / literal types
```

## Примитивы

```ts
let title: string = "cart";
let count: number = 3;
let on: boolean = true;
let empty: null = null;
let missing: undefined = undefined;
```

При `strictNullChecks` обычный `string` не принимает `null` — пишут `string | null`, если пустое значение допустимо.

## `any` и `unknown`

| Тип | Смысл | Типичное место |
|---|---|---|
| `any` | отключить проверку | временный обход; избегать в публичном API |
| `unknown` | «что-то», пока не сузили | вход JSON, границы модулей |

```ts
function parse(raw: unknown) {
  if (typeof raw === "string") {
    return raw.toUpperCase(); // здесь raw уже string
  }
  throw new Error("expected string");
}
```

## `void` и `never` подробнее

Оба про «возврат», но смысл разный:

| | `void` | `never` |
|---|---|---|
| Смысл | функция **завершается**, полезного значения нет | функция **не завершается** нормальным return |
| Типичный return | ничего / `undefined` (значение игнорируют) | `throw`, бесконечный цикл, `process.exit` |
| Переменная типа | почти не нужна | «пустое» множество значений |

### `void` — колбэки и «просто сделай»

`void` говорят вызывающему: «результат не смотри». Так помечают обработчики и side-effect функции.

```ts
function logClick(id: string): void {
  console.log("click", id);
  // return; — можно, но возвращать string/number нельзя
}

type Listener = () => void;

const onReady: Listener = () => {
  document.body.classList.add("ready");
  // даже если здесь return true, для Listener результат «съедается» как void
};

function forEachId(ids: string[], fn: (id: string) => void) {
  for (const id of ids) fn(id); // ← вызываем ради эффекта, не ради значения
}

forEachId(["a", "b"], (id) => {
  console.log(id);
});
```

Контраст с «обычным» return:

```ts
function label(id: string): string {
  return id.toUpperCase(); // есть полезное значение
}

function notify(id: string): void {
  console.log(id); // полезного значения нет — только эффект
}
```

Путать `void` с `undefined` не стоит: у функции `: void` акцент на контракте вызова («игнорь return»), а не на том, что в переменную положили `undefined`.

### `never` — путь без нормального завершения

`never` — тип, у которого **нет** значений. Функция с return type `never` обещает: сюда «успешно с return» не придут.

```ts
function fail(msg: string): never {
  throw new Error(msg);
}

function waitForever(): never {
  while (true) {
    /* … */
  }
}

function handle(status: "ok" | "err") {
  if (status === "ok") return "готово";
  if (status === "err") return fail("сломалось"); // fail: never — ветка не продолжается
  // если добавить третий статус и забыть ветку — checker ругнётся
}
```

Исчерпывающий `switch`: после всех известных веток остаток имеет тип `never` — защита от забытого кейса.

```ts
type Status = "idle" | "loading" | "done";

function label(status: Status): string {
  switch (status) {
    case "idle":
      return "жду";
    case "loading":
      return "гружу";
    case "done":
      return "готово";
    default: {
      const _exhaustive: never = status;
      return _exhaustive; // если Status расширят — ошибка типов здесь
    }
  }
}
```

Кратко: **`void`** = «закончилась, результата нет»; **`never`** = «сюда нормальным return не попадают».

## Массивы и кортежи

```ts
const ids: string[] = ["a", "b"];
const pair: [string, number] = ["qty", 2];
```

Массив — переменная длина, один элементный тип. Кортеж — известные позиции (часто пары ключ/значение, координаты, rest-кортежи в продвинутых сигнатурах).

## Object и literal types

```ts
type Point = { x: number; y: number };
type Status = "idle" | "loading" | "done";

const origin: Point = { x: 0, y: 0 };
const st: Status = "idle";
```

Literal union (`Status`) фиксирует набор строк/чисел — удобно для конечных автоматов UI. Анонимный object type или `type`/`interface` описывает поля; тип `object` в TS означает non-primitive и для формы данных почти не используют.

## Как выбирать

```text
нужна форма полей?     → type / interface с полями
список однородный?     → T[]
позиции разные?        → кортеж
вход извне без гарантий? → unknown + narrowing
«потом разберёмся»?    → не any в API; локальный unknown / дженерик
```

---

# 6. Ссылки

- [TypeScript Handbook — Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript Handbook — Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [MDN — JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)
