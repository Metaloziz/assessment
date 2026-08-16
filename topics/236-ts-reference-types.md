# 1. Тема

**Reference types · `/// <reference>` · path / types / lib**

---

# 2. Главное в одну фразу

Triple-slash `/// <reference … />` подключает файлы, пакеты типов или встроенные `lib` в компиляцию: это зависимость для checker’а, а не импорт рантайма.

---

# 3. Суть

> Reference types в TypeScript — директивы вида `/// <reference types="…" />` (и соседние `path` / `lib`): однострочные XML-комментарии в самом верху файла, которые говорят компилятору «включи эти декларации в контекст проверки». Это не `import` модуля: в бандл JS из директивы не попадает, меняется только набор доступных типов.
>
> Зачем: ambient-окружение без явного импорта (`vite/client`, `@types/node`), связка legacy `.d.ts` через `path`, авторам деклараций — подтянуть DOM/`es20xx` через `lib`, не дублируя глобалы. Типичный след в проекте: `src/vite-env.d.ts` с `/// <reference types="vite/client" />`.
>
> Как: `types` резолвит пакет деклараций (часто `@types/…` или `types` внутри пакета) по правилам module resolution; `path` — конкретный файл относительно текущего; `lib` — встроенный `lib.*.d.ts` (как опция `"lib"` в `tsconfig`). Директивы обрабатываются только в начале файла; после кода это обычный комментарий.
>
> Ловушка: сыпать `reference` по обычным модулям вместо `import` / `"types"` в `tsconfig` — дубли, «лишние» глобалы, путаница с реальным графом модулей. Для приложения чаще правят `compilerOptions.types` / `typeRoots`; директивы оставляют в `.d.ts` и редких entry-файлах окружения.

---

# 4. Самое главное запомнить

- `/// <reference … />` — инструкция компилятору, не runtime-зависимость.
- `types="pkg"` — подтянуть пакет деклараций (как «import» для `@types`).
- `path="…"` — включить конкретный файл в компиляцию.
- `lib="dom"` / `es2017.string` — встроенная библиотека типов, как `"lib"` в tsconfig.
- Директива действует только вверху файла; ниже по коду — просто комментарий.
- В модульном коде предпочитают `import` и `tsconfig.types`; reference — для ambient / `.d.ts`.

---

# 5. Описание

```text
файл (часто .d.ts / env)
      │
      │  /// <reference types="vite/client" />
      │  /// <reference path="./legacy.d.ts" />
      │  /// <reference lib="dom" />
      ▼
компилятор / checker
      │
      ├─ types → пакет деклараций (@types / types пакета)
      ├─ path  → файл по относительному пути
      └─ lib   → встроенный lib.*.d.ts
      │
      ▼
типы в контексте  (в emit JS из директивы нет)
```

## `/// <reference types="…" />`

Подключает пакет типов по имени — удобно думать об этом как об `import` для declaration package. Резолв похож на модульный: ищут `@types/name` или поле `"types"` у пакета.

```ts
/// <reference types="vite/client" />
// ← TYPES: ambient Vite (import.meta.env, *.svg, …)

const mode = import.meta.env.MODE; // string — из типов vite/client
```

Для обычного приложения то же часто делают через `"types": ["vite/client"]` в `tsconfig` — без размазывания директив по `.ts`.

## `/// <reference path="…" />`

Явная зависимость от **файла**. Путь относительно текущего файла. Классика legacy / script-стиля и склейки ambient `.d.ts`, когда нет `import`/`export`.

```ts
/// <reference path="./globals.d.ts" />
// ← PATH: подтянуть локальный файл деклараций

const appName: AppName = "desk"; // AppName из globals.d.ts
```

В современных ES-модулях вместо `path` обычно `import type` или обычный `import`.

## `/// <reference lib="…" />`

Подтягивает встроенную библиотеку (`dom`, `es2015`, `es2017.string`…), как опция `"lib"` в `tsconfig`. Нужна авторам `.d.ts`, которым нужны DOM/`Iterable`/`padStart` без ручных forward-declare.

```ts
/// <reference lib="es2017.string" />
"foo".padStart(4); // ← LIB: метод из lib.es2017.string.d.ts
```

## Где уместно, а где нет

| Место | Обычно |
| --- | --- |
| `vite-env.d.ts`, ambient `.d.ts` | `types` / `lib` — норма |
| Обычный `src/*.ts` с модулями | `import`; `types` — в tsconfig |
| Скриптовый / legacy граф без модулей | иногда `path` |

Директивы ниже любого statement превращаются в обычные комментарии и **не** работают. В emit по умолчанию стираются; `preserve="true"` оставляет их в выходе (редко нужно).

---

# 6. Ссылки

- [TypeScript Handbook — Triple-Slash Directives](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html)
- [TSConfig — `types`](https://www.typescriptlang.org/tsconfig/#types)
- [TSConfig — `lib`](https://www.typescriptlang.org/tsconfig/#lib)
- [TypeScript Handbook — Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [Vite — Client Types](https://vitejs.dev/guide/features.html#client-types)
