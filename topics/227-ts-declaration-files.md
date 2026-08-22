# 1. Тема

**Файлы декларации .d.ts**

---

# 2. Главное в одну фразу

Файл `.d.ts` — паспорт модуля для TypeScript: что можно вызвать и с какими типами, а исполняется обычный JavaScript рядом.

---

# 3. Суть

> Файл декларации (`.d.ts`) — это **паспорт** модуля или окружения для TypeScript. В нём перечислены функции, классы, поля и глобалы через `declare` / `export`, но **нет** тел и логики. Checker и IDE читают паспорт; в бандл как исполняемый код он не попадает.
>
> Зачем. Чужой или старый JS не несёт типов. Переписывать весь пакет в `.ts` дорого — достаточно описать публичный API в `.d.ts` и оставить реализацию как есть. То же при публикации библиотеки: отдаёте `dist/*.js` и рядом `dist/*.d.ts`, чтобы потребители видели автодополнение.
>
> Как это стыкуется. Вы пишете обычный `import` из пакета. Node или бандлер подключает **JS**. TypeScript ищет декларацию: локальный `declare module`, поле `"types"` / `"exports"` у пакета или пакет `@types/…` из DefinitelyTyped. Рантайм и checker смотрят на разные файлы одного контракта.
>
> Ловушка: неверный паспорт «зеленит» типы, но не чинит поведение в браузере. `.d.ts` не полифилл и не валидация данных — только проверка на этапе разработки.

---

# 4. Самое главное запомнить

- `.d.ts` описывает форму API; исполняется JS рядом или из пакета.
- Локальный `declare module 'имя'` — типы для JS без своих `.ts`.
- Библиотека часто кладёт `dist/*.js` + `dist/*.d.ts` и указывает `"types"` в `package.json`.
- `@types/pkg` подставляет типы к уже установленному JS-пакету `pkg`.
- Декларации не добавляют код в рантайм — только помогают checker’у.
- Ошибочный `.d.ts` даёт ложную уверенность: типы ок, падение в рантайме остаётся.

---

# 5. Описание

```text
ваш код (app.ts)
      │  import from 'lib'
      ▼
┌─────────────┐     паспорт (только проверка)
│  lib.d.ts   │ ◄── checker / IDE
└─────────────┘
      │
      ▼
┌─────────────┐     настоящий код
│   lib.js    │ ◄── браузер / Node
└─────────────┘
```

## Зачем отдельный паспорт

Исходник на чистом JS не говорит TypeScript, какие аргументы ждать. Можно постепенно мигрировать на `.ts`, а можно один раз описать публичный API в `.d.ts` и не трогать реализацию. Тот же приём — для скрипта с CDN и для внутренней утилиты «ещё не на TS».

Короткий ambient-модуль в проекте:

```ts
// types/slugify.d.ts
declare module 'slugify' {
  export default function slugify(
    text: string,
    options?: { lower?: boolean },
  ): string;
}
```

После этого `import slugify from 'slugify'` в `.ts` проходит проверку. В рантайме по-прежнему берётся JS из `node_modules`.

## Свои `.d.ts` у библиотеки

Если библиотеку пишут на TypeScript, при сборке обычно включают `declaration: true`: рядом с JS появляются декларации. В `package.json` указывают вход для типов:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

Потребитель ставит пакет один раз: Node/бандлер резолвит `.js`, TypeScript — `.d.ts` по `"types"` (или через `"exports"`).

Фрагмент после emit:

```ts
// dist/greet.d.ts
export declare function greet(name: string): string;
```

Слово `declare` здесь значит: «это описание, тела функции в файле нет».

## `@types` и DefinitelyTyped

Многие старые пакеты сами `.d.ts` не кладут. Сообщество ведёт [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped): пакеты вроде `@types/lodash`, `@types/node`. Установили `@types/foo` — checker подхватывает типы для `foo` (часто через поиск в `node_modules/@types`).

| Откуда типы | Когда так делают |
|---|---|
| Рядом с `.js` в том же пакете | Автор на TS или сам пишет `.d.ts` |
| `@types/…` | JS-пакет без своих деклараций |
| Локальный `declare module` / свой `*.d.ts` | Разовый shim, legacy, нет `@types` |

## Global и расширение окружения

Иногда нужен не модуль, а глобал: поле на `Window`, кастомный элемент, типы для скрипта без `import`:

```ts
// env.d.ts
declare global {
  interface Window {
    APP_CONFIG: { apiUrl: string };
  }
}

export {}; // файл-модуль, иначе global склеится иначе
```

Так же объявляют импорты ассетов (`declare module '*.css'`), чтобы checker не ругался на картинки и стили.

## Типичные ловушки

- **Паспорт шире реальности** — в `.d.ts` поле обязательное, в JS его нет → падение при «зелёных» типах.
- **Два паспорта на один модуль** — и свой ambient, и `@types` → конфликты merge.
- **Путать `.d.ts` с полифиллом** — типы не добавляют API в браузер; нужен реальный код.
- **Забыть `export {}` в файле с `declare global`** — файл могут считать скриптом, и слияние global пойдёт не так.

---

# 6. Ссылки

- [TypeScript Handbook — Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [TypeScript Handbook — Modules · .d.ts](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html)
- [TypeScript — Publishing / declaration](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)
- [TypeScript — tsconfig `declaration`](https://www.typescriptlang.org/tsconfig#declaration)
