# 1. Тема

**Инструменты для сборки (gulp, rollup). Принцип выбора сборщика исходя из задачи**

---

# 2. Главное в одну фразу

Сначала смотрят, что должно лежать в `dist` — приложение, npm-пакет или набор файлов без графа `import` — и только потом выбирают Gulp, Rollup или Vite/Webpack, а не «как в старом репо».

---

# 3. Суть

> На выходе сборки может быть три разных типа артефакта: сайт или админка с бандлами для браузера, библиотека для `npm install`, или папка со стилями и картинками без связки через `import`. **Bundler** (Webpack, Rollup, Vite, esbuild) обходит граф модулей от `entry` и склеивает JS/TS. **Task runner** вроде **Gulp** прогоняет файлы по цепочке `src → pipe → dest` — scss, спрайты, копирование — и сам по себе не заменяет граф зависимостей.
>
> От типа артефакта зависит инструмент. **SPA / админка** — **Vite** или **Webpack**: dev-сервер, HMR, code splitting, loaders под CSS и TS (подробнее про webpack как bundler — тема «Что такое Webpack»). **npm-библиотека / UI kit** — **Rollup** или **tsup**: чистые ESM и CJS, сильный tree shaking, `external` для peerDeps вроде React. **Только ассеты без JS-графа** — **Gulp** или простые npm-скрипты.
>
> На практике сначала формулируют выход (приложение / пакет / пайп файлов), потом смотрят DX и форматы. В монорепо часто комбинируют: Vite для app, Rollup/tsup для пакета рядом; Turborepo или Nx оркестрируют задачи, но не подменяют bundler. Один «универсальный» инструмент на всё обычно хуже явного выбора под задачу.
>
> Ловушка: тащить Gulp «вместо Webpack», потому что «так было раньше», или Rollup в большую SPA только ради tree shaking. Task runner не соберёт приложение из сотен `import`; конфиг библиотеки с `external` — не тот же конфиг, что у prod-приложения с splitting.

---

# 4. Самое главное запомнить

- Gulp гоняет файлы по pipe, не строит граф `import`/`require` — подходит для scss, картинок, копирования.
- Bundler связывает модули от `entry`; без него SPA из сотен `import` в браузер не отдашь (см. тему про Webpack).
- Rollup / tsup — npm-пакет с ESM/CJS; peerDeps вроде React — в `external`, не в бандл.
- **ESM** — `import` / `export` (современный стандарт, удобен для tree shaking); **CJS** — `require` / `module.exports` (старый формат Node и части legacy-сборок).
- Vite — приложение на зелёном поле: **dev** — esbuild + нативный ESM (HMR); **build** — Rollup в `dist/`; `build.rollupOptions` — настройки Rollup только для prod.
- Webpack — тот же класс (app-bundler), но чаще legacy и тонкий кастом loaders/plugins.
- Turborepo / Nx — порядок и кеш задач в монорепо, не замена Rollup или Vite.
- Выбор проверяют по артефакту: что лежит в `dist` и кто это потребляет — браузер или `npm install`.

---

# 5. Описание

## Дерево выбора

Сначала ответьте, нужен ли **граф модулей** (`import`/`require` от entry). Если нет — достаточно файлового пайпа. Если да — это приложение или библиотека для npm.

```text
нужен module graph? ──нет──► Gulp (или скрипты)
        │да
        ▼
библиотека с ESM/CJS? ──да──► Rollup/tsup
        │нет (приложение)
        ▼
Vite (DX) или Webpack (гибкий legacy/кастом)
```

Дерево не про «модный стек», а про то, кто съест результат: браузер загружает бандлы приложения, `npm` — отдельные entry библиотеки, CDN или статика — папки css/img без JS-графа.

## Gulp

Gulp нужен, когда задача — **преобразовать или скопировать файлы по шаблону**, а не собрать приложение из модулей. Типичный кейс: legacy-сайт на jQuery, где scss компилируется в css, картинки сжимаются, SVG склеиваются в спрайт — и всё кладётся в `dist/` без единого JS entry.

Каждая задача — поток: `gulp.src(glob)` → цепочка `.pipe(transform)` → `gulp.dest()`. Параллель и последовательность задают через `gulp.parallel` / `gulp.series`. Gulp не резолвит `import` между вашими JS-файлами; если появился полноценный module graph — нужен bundler, а Gulp остаётся только для «хвоста» ассетов.

```javascript
export function styles() {
  return gulp.src('src/**/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('dist/css'));
}
```

Ловушка: ожидать от Gulp HMR, code splitting или tree shaking по графу — это зона bundler.

**Примеры, когда Gulp уместен:**

- **Legacy-лендинг** без сборки JS-модулей: компиляция SCSS → CSS, сжатие PNG/WebP, копирование шрифтов в `dist/`.
- **Статика для CDN**: одна команда собирает папку `assets/` (иконки, pdf, локализованные json) — файлы не связаны через `import`.
- **SVG-спрайт или autoprefixer** для старого сайта: glob картинок → один `icons.svg` или post-process всех `.css`.
- **Хвост рядом с bundler**: приложение собирает Vite, а Gulp только копирует `robots.txt`, `favicon` и генерирует sitemap — задачи без module graph.

## Rollup

Rollup заточен под **публикуемый пакет**: один или несколько entry, на выходе предсказуемые `index.esm.js` и `index.cjs.js`, лишние re-export часто вырезаются агрессивнее, чем у app-bundler. React, Vue и другие peerDependencies помечают `external`, чтобы они не попали в ваш npm-артефакт — хост-приложение подтянет их само.

```javascript
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.esm.js', format: 'esm' },
    { file: 'dist/index.cjs.js', format: 'cjs' },
  ],
  external: ['react', 'react-dom'],
};
```

### ESM и CJS — что за форматы

Это **не «расширения файлов ради красоты»**, а два способа описать модули в JavaScript.

**ESM** (ECMAScript modules, в Rollup — `format: 'esm'`) — синтаксис `import` / `export`. Так пишут современные браузеры, Vite, webpack и новый Node. Бандлер видит статические связи между модулями и лучше вырезает неиспользуемый код (tree shaking). В файловой системе часто встречаются суффиксы **`.mjs`** или имя вроде **`index.esm.js`** в `dist/`, а в `package.json` у пакета может быть `"type": "module"`.

**CJS** (CommonJS, в Rollup — `format: 'cjs'`) — синтаксис `require()` и `module.exports`. Долго был стандартом в Node и старых конфигах; до сих пор встречается в legacy-проектах и инструментах, которые не перешли на ESM. Явный суффикс **`.cjs`** или **`index.cjs.js`** нужен, когда в одном репозитории лежат оба формата и Node должен понять, какой файл как читать.

Зачем Rollup кладёт **оба** файла в npm-пакет: потребитель на Vite/React тянет ESM (`import { Button } from '@company/ui'`), а старый скрипт на Node или webpack 4 может подключить CJS (`require('@company/ui')`). Имена `index.esm.js` и `index.cjs.js` — договорённость команды; важнее поля `exports` / `module` / `main` в `package.json`, которые указывают, какой файл отдавать кому.

```javascript
// ESM — import / export
import { formatDate } from './date.js';
export { formatDate };

// CJS — require / module.exports
const { formatDate } = require('./date.js');
module.exports = { formatDate };
```

Ловушка: путать **расширение** (`.mjs`, `.cjs`) и **формат сборки** (`format: 'esm'` / `'cjs'`). Rollup может записать ESM в `dist/index.js`, если так задано в `output.file`; суффиксы `.esm.js` / `.cjs.js` просто помогают не смешивать два артефакта в одной папке.

**tsup** — обёртка над esbuild/Rollup для тех же целей с меньшим конфигом.

**Примеры, когда Rollup / tsup уместны:**

- **UI kit** (`@company/buttons`): компоненты на React, в npm — `index.esm.js` + `index.cjs.js`, React в `external`.
- **SDK или клиент API** (`@company/api`): один entry, типы из `.d.ts`, потребитель импортирует функции, а не целое приложение.
- **Утилиты и хелперы** (внутренний пакет вроде shared-utils): tree shaking вырежет неиспользуемые export у потребителя.
- **Плагин для bundler** (eslint-plugin, vite-plugin): публикуемый модуль с чётким `main` / `module` / `exports` в `package.json`.

Ловушка: собирать большую SPA только Rollup «ради размера» — app-конфиг с dev-server и splitting всё равно понадобится (Vite/Webpack).

## Vite

**Vite** — app-bundler для **новых SPA и админок**. В dev он не собирает весь бандл заранее: отдаёт исходники как нативные ESM и ускоряет трансформации через **esbuild**, поэтому HMR обычно быстрее, чем у классического webpack-dev-server. В prod Vite собирает через **Rollup**: code splitting, хеши в именах файлов, оптимизация чанков. Точка входа — обычно `index.html` в корне (не отдельный `entry` в конфиге, как у Webpack).

Vite **не равен** Rollup: это оболочка (dev-сервер, HMR, HTML, CSS, плагины), которая **под капотом** выбирает разный движок под задачу.

### Dev и build: esbuild и Rollup

```text
npm run dev              npm run build
     │                        │
     ▼                        ▼
 dev-сервер Vite         vite build
     │                        │
 esbuild + нативный ESM      Rollup
 (быстро, по файлу)     (оптимизированный dist/)
```

**Dev (`vite dev`).** Браузер открывает `index.html` и сам тянет модули через `import`. Dev-сервер отдаёт файлы «на лету»; **esbuild** переводит TS/JSX в то, что понимает браузер. Полный бандл не собирается — HMR подменяет только изменившийся модуль. Rollup здесь не главный: важны скорость старта и быстрые правки.

**Prod (`vite build`).** Vite вызывает **Rollup**: обходит граф от `index.html`, режет на чанки, делает tree shaking и минификацию, кладёт результат в `dist/` с хешами в именах. Поэтому в конфиге есть `build.rollupOptions` — это настройки **именно Rollup** на этапе prod, не dev.

| | Rollup «напрямую» | Vite |
| --- | --- | --- |
| Зачем | npm-пакет, SDK, UI kit | SPA / админка в браузере |
| Dev | обычно нет своего (или отдельно) | dev-сервер + HMR |
| Prod | `rollup.config` → `dist/*.js` | `vite build` → Rollup → `dist/` |

Зачем так: **esbuild** быстрее на трансформациях в dev; **Rollup** сильнее на tree shaking и предсказуемых чанках в prod. Vite комбинирует оба.

Ловушка: думать «раз Vite внутри Rollup, библиотеку в npm тоже соберём через Vite». Для npm-пакета нужен отдельный Rollup/tsup с `external` для peerDeps — это другой артефакт, не SPA.

Минимальный конфиг для React-приложения:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

`plugins` подключают фреймворк (React, Vue, …), `server` — dev-сервер и HMR, `build.rollupOptions` — тонкая настройка **prod-сборки Rollup** (например, вынести vendor в отдельный чанк); на dev эти опции не работают.

**Примеры, когда Vite уместен:**

- **Новая админка / ЛК** на React или Vue: быстрый HMR, lazy routes, привычный DX.
- **CRM / дашборд** с нуля: один `index.html`, splitting по разделам, prod через Rollup.
- **Маркетинговый SPA** с роутингом и i18n: `vite` в dev, `vite build` в CI.
- **App в монорепо** рядом с пакетом на Rollup/tsup: Vite собирает приложение, библиотека — отдельно.

Ловушка: ждать от Vite «магии» на огромном legacy с кастомными webpack-loaders и Module Federation — миграция может съесть больше, чем выигрыш в DX.

## Webpack (кратко)

**Webpack** — тот же класс инструментов (app-bundler), но с другим уклоном: гибкий legacy и нестандартные пайплайны, где уже живут десятки loaders и plugins. Entry, `module.rules`, plugins — отдельный мир (темы про webpack в этой группе). На зелёном поле для обычной SPA чаще хватает Vite; Webpack оставляют, когда миграция дороже поддержки текущего конфига.

**Когда Webpack всё ещё уместен:** legacy-монолит на Webpack 4/5, Module Federation, тонкий кастом loaders, который команда не готова переносить.

Ловушка: выбирать Webpack «на всякий случай» там, где хватит Vite; и наоборот — ломать рабочий webpack-конфиг ради моды без плана миграции.

## Сводка

| Задача | Инструмент |
|--------|------------|
| SPA / админка | Vite / Webpack |
| npm-библиотека | Rollup / tsup |
| Файловые пайплайны | Gulp |
| Оркестрация монорепо | Turborepo / Nx |

---

# 6. Ссылки

- [Gulp](https://gulpjs.com/docs/en/getting-started/quick-start)
- [Rollup](https://rollupjs.org/introduction/)
- [Vite — Why Vite](https://vitejs.dev/guide/why.html)
- [tsup](https://github.com/egoist/tsup)
