# 1. Тема

**Файлы декларации .d.ts**

---

# 2. Главное в одну фразу

Файл `.d.ts` описывает типы модуля или окружения без JS-реализации: checker и IDE видят контракт, в рантайме исполняется уже готовый JavaScript.

---

# 3. Суть

> Файл декларации (`.d.ts`) — это TypeScript-контракт «только типы»: функции, классы, модули и глобалы объявлены через `declare` / `export`, но тела и логики в нём нет. При emit в бандл он не превращается в исполняемый код — служит checker’у и автодополнению.
>
> Так типизируют чужой или legacy JS, npm-пакеты без исходников TS и публичный API библиотеки, которую собирают в `.js` + рядом кладут `.d.ts`. Потребитель импортирует обычный модуль; рантайм берёт JS, а типы — из декларации.
>
> Типичные формы: ambient module (`declare module 'pkg' { … }`), собственные `.d.ts` пакета (поле `"types"` / `"exports"`), пакеты `@types/…` из DefinitelyTyped, иногда `declare global` для расширений `Window` и DOM.
>
> Ловушка: неверная декларация «закрывает» ошибки типов, но не меняет поведение в браузере. `.d.ts` не заменяет реализацию и не валидирует данные в рантайме.

---

# 4. Самое главное запомнить

- `.d.ts` = форма API для checker’а; исполняется JS-реализация рядом или из пакета.
- Ambient: `declare module 'name'` — типы для модуля без своих `.ts`.
- Библиотека часто отдаёт `dist/*.js` + `dist/*.d.ts` и указывает `"types"` в `package.json`.
- `@types/pkg` подключает типы к уже установленному JS-пакету `pkg`.
- Декларации не попадают в runtime-бандл как логика — только влияют на проверку.
- Ошибочный `.d.ts` даёт ложное чувство безопасности: типы «зелёные», код — нет.

---

# 5. Описание

```text
потребитель (app.ts)
      │  import from 'lib'
      ▼
┌─────────────┐     типы (compile-time)
│  lib.d.ts   │ ◄── checker / IDE
└─────────────┘
      │
      ▼
┌─────────────┐     код (runtime)
│   lib.js    │ ◄── браузер / Node
└─────────────┘
```

## Зачем отдельные декларации

Исходник на чистом JS не несёт типов. Переписывать весь пакет в `.ts` дорого; достаточно описать публичный API в `.d.ts` и оставить реализацию как есть. То же для скриптов на CDN и внутренних утилит без миграции.

Короткий ambient-модуль:

```ts
// types/slugify.d.ts
declare module 'slugify' {
  export default function slugify(
    text: string,
    options?: { lower?: boolean },
  ): string;
}
```

После этого `import slugify from 'slugify'` в `.ts` проходит проверку; в рантайме по-прежнему подключается JS из `node_modules`.

## Свои `.d.ts` у библиотеки

При публикации TS-библиотеки обычно эмитят JS и параллельно генерируют декларации (`declaration: true` в `tsconfig`). В `package.json`:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

Потребитель ставит пакет один раз: Node/бандлер резолвит `.js`, TypeScript — `.d.ts` по полю `types` (или через `exports`).

Фрагмент декларации после emit:

```ts
// dist/greet.d.ts
export declare function greet(name: string): string;
```

Ключевое слово `declare` подчёркивает: это описание, не тело функции.

## `@types` и DefinitelyTyped

Многие старые пакеты сами `.d.ts` не кладут. Сообщество ведёт [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped): npm-пакеты вида `@types/lodash`, `@types/node`. Установили `@types/foo` — checker подхватывает типы для `foo` (часто через `typeRoots` / автопоиск в `node_modules/@types`).

| Источник типов | Когда |
|---|---|
| Рядом с `.js` в том же пакете | Автор библиотеки на TS или вручную пишет `.d.ts` |
| `@types/…` | JS-пакет без своих деклараций |
| Локальный `declare module` / `*.d.ts` в проекте | Разовый shim, внутренний legacy, нет `@types` |

## Global и расширение окружения

Иногда нужны не модули, а глобалы: плагин на `Window`, кастомный элемент, ambient для скрипта без `import`:

```ts
// env.d.ts
declare global {
  interface Window {
    APP_CONFIG: { apiUrl: string };
  }
}

export {}; // файл-модуль, иначе global не склеится как ожидается
```

Так же подключают типы для CSS/картинок (`declare module '*.css'`), чтобы импорты ассетов не ломали checker.

## Типичные ловушки

- **Декларация шире реальности** — в `.d.ts` поле обязательное, в JS его нет → падение в рантайме при «зелёных» типах.
- **Дубли типов** — и свой ambient, и `@types` на один модуль → конфликты merge / incompatible.
- **Путать `.d.ts` с полифиллом** — типы не добавляют API в браузер; нужен реальный код или полифилл.
- **Забыть `export {}` в файле с `declare global`** — файл может считаться скриптом, и слияние global пойдёт иначе, чем ожидалось.

---

# 6. Ссылки

- [TypeScript Handbook — Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [TypeScript Handbook — Modules · .d.ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html)
- [TypeScript — Publishing / declaration](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)
- [TypeScript — tsconfig `declaration`](https://www.typescriptlang.org/tsconfig#declaration)
