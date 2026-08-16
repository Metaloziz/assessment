# 1. Тема

**Использование tsc**

---

# 2. Главное в одну фразу

`tsc` — CLI компилятора TypeScript: читает `tsconfig`, проверяет типы и по настройкам эмитит JavaScript (и при необходимости `.d.ts`) или только сообщает об ошибках.

---

# 3. Суть

> `tsc` (TypeScript Compiler) — официальная утилита командной строки: по проекту или списку файлов строит программу типов, сверяет вызовы и присваивания, затем либо пишет выходные `.js` / `.d.ts`, либо останавливается на проверке. Вход — `.ts` / `.tsx` и опции из `tsconfig.json` (или флаги CLI).
>
> В библиотеках и простых Node-сервисах `tsc` часто и emit’ит артефакты в `outDir`. В SPA на Vite/webpack/esbuild транспиляцию обычно делает бандлер, а `tsc --noEmit` (или `vue-tsc` / плагин) гоняют в CI и pre-commit — та же семантика проверки, без дублирования emit.
>
> Типичный запуск: `tsc -p tsconfig.json`, `tsc --noEmit`, `tsc -w` (watch). Флаги CLI перекрывают поля `compilerOptions`; без `-p` компилятор ищет ближайший `tsconfig.json` или берёт файлы из аргументов.
>
> Ловушка: путать «собралось в Vite» и «прошли типы». Бандлер может выдать JS при ошибках типов, если checker не в пайплайне. И наоборот: успешный `tsc` не валидирует JSON/сеть — типы стёрты, данные снаружи всё равно проверяют явно.

---

# 4. Самое главное запомнить

- `tsc` = typecheck + опциональный emit JS / `.d.ts`.
- Конфиг — `tsconfig.json` (`-p` / `--project`); флаги CLI имеют приоритет над опциями файла.
- `--noEmit` — только проверка (часто CI + Vite/esbuild).
- Emit: `outDir`, `target`, `module`, `declaration` — куда и во что писать.
- Watch (`-w`) перепроверяет при сохранении; `incremental` / `.tsbuildinfo` ускоряют повторные прогоны.
- Успешный бандл без `tsc` ≠ зелёные типы; зелёный `tsc` ≠ безопасный рантайм.

---

# 5. Описание

```text
.ts / .tsx  +  tsconfig.json
        │
        ▼
   ┌─────────┐
   │   tsc   │  parse → check
   └────┬────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
 emit JS   --noEmit
 (+ .d.ts)  (только exit code / диагностика)
```

## Запуск и проект

Без аргументов `tsc` ищет `tsconfig.json` вверх по каталогам. Явно:

```bash
tsc -p tsconfig.json
tsc -p tsconfig.build.json --noEmit
```

В `package.json` обычно два скрипта: сборка с emit и отдельная проверка типов.

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

## Emit vs только проверка

| Режим | Что делает | Когда |
|---|---|---|
| `tsc` (emit) | пишет `.js` (и `.d.ts` при `declaration`) | lib, Node без бандлера |
| `tsc --noEmit` | только диагностика, exit ≠ 0 при ошибках | CI, Vite/webpack-проекты |
| `tsc -w` | watch: повторный check/emit при изменениях | локальная разработка |

`noEmitOnError: true` (в конфиге) не пишет выход, если check упал — полезно, чтобы в `dist` не лежали «битые» артефакты.

## Ключевые опции

Короткий фрагмент `tsconfig`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": true,
    "noEmit": false
  },
  "include": ["src"]
}
```

- `target` / `module` — синтаксис и система модулей на выходе.
- `outDir` / `rootDir` — зеркало дерева исходников в `dist`.
- `strict` — пакет строгих проверок (база для надёжного check).
- `declaration` — рядом с JS писать `.d.ts` для потребителей библиотеки.
- `skipLibCheck` — не перепроверять все `.d.ts` в `node_modules` (быстрее CI; не отменяет check своего кода).

## Связка с бандлером

Vite/esbuild быстро транспилируют `.ts` → JS и **не** делают полный semantic check. Паттерн: dev/build через бандлер, типы — отдельным `tsc --noEmit` (или `tsgo` / плагином в IDE). Так feedback loop остаётся быстрым, а контракты не «проскакивают» в merge.

## Диагностика

Ошибки печатаются в stdout/stderr с путём, строкой и кодом (`TS2322` и т.д.). Exit code ≠ 0 — сигнал для CI. `pretty: true` (по умолчанию в современных версиях) подсвечивает контекст; для машинного разбора удобен `--pretty false` или JSON-репортёры в обвязке.

---

# 6. Ссылки

- [TypeScript — tsc CLI](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig)
- [TypeScript — Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript Wiki — Using the Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
