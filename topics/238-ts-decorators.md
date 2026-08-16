# 1. Тема

**Декораторы**

---

# 2. Главное в одну фразу

Декораторы — синтаксис `@…` у класса и его членов: функция оборачивает или дополняет объявление при инициализации класса, не меняя места вызова.

---

# 3. Суть

> Декораторы в TypeScript — аннотации `@decorator` над классом, методом, полем или accessor’ом. На этапе инициализации класса декоратор получает исходное значение и контекст и может вернуть обёртку (тот же контракт + побочный слой: лог, ретраи, метрики) или оставить член как есть.
>
> Зачем: сквозная логика рядом с объявлением — без ручного `withMetrics(fn)` на каждом call-site и без раздувания тела метода. В NestJS, Angular и похожих фреймворках декораторы размечают контроллеры, DI и пайпы; в своём коде — тонкие обёртки вокруг методов сервиса.
>
> Как: пишут `function logged(value, context) { return function (…) { … return value.call(this, …); }; }` и вешают `@logged` на метод. Фабрика `@retry(3)` — функция, которая **возвращает** декоратор. С TypeScript 5+ по умолчанию — стандарт TC39 Stage 3; старый режим — флаг `experimentalDecorators` (другая сигнатура и семантика).
>
> Ловушка: путать Stage 3 и legacy — один и тот же `@foo` ведёт себя по-разному. Ещё: ждать, что декоратор «живёт» только в типах — это рантайм-обёртка после emit (в отличие от generics). И помнить порядок стека: выражения сверху вниз, применение снизу вверх — верхний `@` становится внешней оболочкой вызова.

---

# 4. Самое главное запомнить

- `@decorator` срабатывает при инициализации класса, не при каждом импорте файла «магически».
- Метод-декоратор чаще возвращает **обёртку** с тем же API.
- Фабрика: `@retry(3)` = вызов, который возвращает декоратор.
- Несколько `@`: вызов идёт снаружи внутрь (верхний слой — первый на входе).
- TS 5+: Stage 3 по умолчанию; legacy — только с `experimentalDecorators`.
- Это не паттерн «только типы»: после emit остаётся обычный JS с обёртками.

---

# 5. Описание

```text
объявление:   @auth
              @logged
              save(id) { … }
                    │
инициализация: apply logged → apply auth
                    │
вызов:         save("1")
                    │
               auth → logged → core → … → наружу
```

## Stage 3 (TypeScript 5+)

Стандартный декоратор метода получает значение и `context` (имя, kind, `addInitializer`…):

```ts
function logged(
  original: (...args: unknown[]) => unknown,
  context: ClassMethodDecoratorContext,
) {
  const name = String(context.name);
  return function (this: unknown, ...args: unknown[]) {
    console.log(`call ${name}`); // ← WRAP: до core
    return original.call(this, ...args);
  };
}

class UserService {
  @logged
  save(id: string) {
    return id; // ← CORE
  }
}
```

Классовый декоратор получает сам конструктор и может его заменить или дополнить (seal, register, wrap).

## Фабрики

Если нужны параметры, пишут функцию, которая возвращает декоратор:

```ts
function retry(times: number) {
  return function (
    original: (...args: unknown[]) => unknown,
    _context: ClassMethodDecoratorContext,
  ) {
    return function (this: unknown, ...args: unknown[]) {
      let last: unknown;
      for (let i = 0; i < times; i++) {
        try {
          return original.call(this, ...args); // ← RETRY
        } catch (e) {
          last = e;
        }
      }
      throw last;
    };
  };
}

class Api {
  @retry(3)
  fetch() {
    /* … */
  }
}
```

## Порядок нескольких декораторов

```ts
class Cart {
  @auth
  @logged
  checkout() {
    /* … */
  }
}
```

Выражения `@auth` и `@logged` вычисляются сверху вниз. Применение — снизу вверх: сначала `logged` оборачивает метод, затем `auth` оборачивает результат. Вызов: `auth → logged → checkout`.

## Legacy: `experimentalDecorators`

До Stage 3 в TS включали:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

Сигнатуры другие (часто `target, propertyKey, descriptor`), иначе устроены поля и `emitDecoratorMetadata`. Код под Nest/Angular на старом флаге **не** копировать один в один в Stage 3 без правки.

## Когда уместны

| Уместно | Спорно |
| --- | --- |
| Лог / метрики / retry у метода | Скрытая бизнес-логика, которую трудно найти |
| Метаданные фреймворка (DI, routes) | «Магия» вместо явной композиции функций |
| Тонкий слой вокруг стабильного API | Толстые декораторы с половиной сервиса внутри |

Явная композиция `withMetrics(withAuth(fn))` и `@metrics` / `@auth` — родственники; синтаксис `@` ближе к объявлению члена.

---

# 6. Ссылки

- [TypeScript Handbook — Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [TypeScript 5.0 — Decorators](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators)
- [TC39 — Decorators proposal](https://github.com/tc39/proposal-decorators)
- [MDN — Decorators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Decorators)
