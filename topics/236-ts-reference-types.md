# 1. Тема

**Reference types**

---

# 2. Главное в одну фразу

Строка `/// <reference … />` в начале файла говорит TypeScript, какие типы подключить к проверке — это не `import`, в JavaScript она не попадает.

---

# 3. Суть

> Triple-slash директива — **однострочный комментарий в самом верху файла**, который подсказывает TypeScript: «возьми типы отсюда». В собранный JS эта строка не превращается в код — меняется только то, что видит редактор и проверка типов.
>
> Зачем. После темы про `.d.ts` часто нужно **один раз** подключить пакет типов ко всему проекту или к env-файлу. Классический пример — Vite: в `vite-env.d.ts` пишут `/// <reference types="vite/client" />`, и `import.meta.env` перестаёт быть «неизвестным полем». То же можно сделать через `"types"` в `tsconfig.json` — директива удобна в маленьких `.d.ts` и legacy-склейках файлов.
>
> Три формы: `types="имя"` — пакет деклараций (как `@types/node` или встроенные типы Vite); `path="./файл.d.ts"` — конкретный соседний файл; `lib="dom"` / `es2017.string` — встроенная библиотека стандартных типов (аналог `"lib"` в tsconfig). Работает **только в начале файла** — ниже по коду это обычный комментарий.
>
> Ловушка: размазывать `reference` по обычным `.ts` вместо нормального `import` и настроек tsconfig — дубли, лишние глобалы, непонятно, откуда взялось имя типа. В приложении чаще правят `compilerOptions.types`; директивы оставляют в env-файлах и `.d.ts`.

---

# 4. Самое главное запомнить

- `/// <reference … />` — подсказка TypeScript, не зависимость для браузера или Node.
- `types="pkg"` — подтянуть пакет типов по имени (часто из `@types/…` или поля `"types"` пакета).
- `path="…"` — включить конкретный `.d.ts` рядом по пути.
- `lib="…"` — встроенные типы DOM, ES2017 и т.д., как опция `"lib"` в tsconfig.
- Строка действует только в **начале** файла; дальше — просто комментарий.
- В обычных модулях предпочитают `import` и `tsconfig`; reference — для env / `.d.ts`.

---

# 5. Описание

```text
файл (часто vite-env.d.ts или другой .d.ts)
      │
      │  /// <reference types="vite/client" />
      │  /// <reference path="./globals.d.ts" />
      │  /// <reference lib="dom" />
      ▼
TypeScript читает директиву
      │
      ├─ types → пакет типов (Vite, Node, @types/…)
      ├─ path  → ваш локальный .d.ts
      └─ lib   → встроенные типы языка / DOM
      │
      ▼
имена типов доступны в файле  (в JS при сборке строки нет)
```

## Зачем это после `.d.ts`

Файл декларации описывает API. Директива `reference` отвечает на другой вопрос: **откуда TypeScript возьмёт уже готовый набор типов**, не переписывая его вручную. Вы не импортируете модуль в рантайме — вы расширяете контекст проверки.

Типичный след в Vite-проекте:

```ts
/// <reference types="vite/client" />

const mode = import.meta.env.MODE; // string — типы из vite/client
```

## `/// <reference types="…" />`

Подключает **пакет типов** по имени. Удобно думать: «скажи TypeScript открыть типы этого пакета», как когда ставите `@types/node`.

```ts
/// <reference types="vite/client" />
// import.meta.env, импорт *.svg и др. — без import в каждом файле
```

В большом приложении то же часто делают в `tsconfig.json`: `"types": ["vite/client"]` — один раз на весь проект.

## `/// <reference path="…" />`

Подключает **конкретный файл** по относительному пути. Было популярно в старом script-стиле и при склейке нескольких ambient `.d.ts` без `import`/`export`.

```ts
/// <reference path="./globals.d.ts" />

const appName: AppName = "desk"; // AppName из globals.d.ts
```

В современном коде с ES-модулями чаще используют обычный `import type` или один общий `.d.ts` в tsconfig.

## `/// <reference lib="…" />`

Подтягивает **встроенную** библиотеку типов: `dom`, `es2015`, `es2017.string` и т.д. — то же, что массив `"lib"` в tsconfig. Нужна авторам `.d.ts`, которым нужны, например, методы строки без ручного `declare`.

```ts
/// <reference lib="es2017.string" />
"foo".padStart(4); // padStart описан во встроенном lib.es2017.string.d.ts
```

## Где уместно

| Место | Обычно |
| --- | --- |
| `vite-env.d.ts`, env-файлы | `types` — норма |
| Связка legacy `.d.ts` | иногда `path` |
| Обычный `src/*.ts` с модулями | `import`; пакеты типов — в tsconfig |

---

# 6. Ссылки

- [TypeScript Handbook — Triple-Slash Directives](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html)
- [TSConfig — `types`](https://www.typescriptlang.org/tsconfig/#types)
- [TSConfig — `lib`](https://www.typescriptlang.org/tsconfig/#lib)
- [TypeScript Handbook — Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [Vite — Client Types](https://vitejs.dev/guide/features.html#client-types)
