# 1. Тема

**Современные пре/постпроцессоры:** SCSS · PostCSS · пайплайн сборки

---

# 2. Главное в одну фразу

SCSS расширяет синтаксис до обычного CSS на этапе сборки, PostCSS прогоняет уже CSS через плагины (префиксы, nesting, polyfill) — оба живут в пайплайне бандлера, не в браузере.

---

# 3. Суть

> **Препроцессор** (сегодня чаще всего **SCSS**/Sass) даёт язык *над* CSS: переменные `$token`, вложенность, миксины, модули `@use`. Сборщик компилирует `.scss` → обычный CSS, который понимает браузер. **Постпроцессор** — в первую очередь **PostCSS**: парсит CSS в AST и гоняет **плагины** (`autoprefixer`, nesting, custom media…). На входе уже CSS (или вывод Sass), на выходе — тоже CSS, но с нужными трансформациями под целевые браузеры и соглашения проекта.

> Зачем: писать короче и единообразнее (токены, миксины кнопок), не копировать вендорные префиксы руками, подключать только те преобразования, что нужны `browserslist`. В Vite/webpack это один или два шага в цепочке лоадеров, а не «магия в DevTools».

> Как обычно связывают. Часто: исходники SCSS → Sass → CSS → PostCSS (autoprefixer и компания) → в бандл / CSS Modules. PostCSS умеет и без Sass: современный CSS + плагины. Sass не заменяет PostCSS и наоборот: один про синтаксис и абстракции автора, другой — про целевой CSS и экосистему плагинов.

> Ловушка: тащить и тяжёлый Sass, и дублирующий PostCSS-nesting «на всякий случай»; или ждать префиксов от Sass — их даёт autoprefixer по `browserslist`. Ещё: глубокая вложенность SCSS раздувает селекторы и specificity. Переменные `$` в Sass и `var(--…)` в CSS — разные слои: первые исчезают после компиляции, вторые живут в рантайме.

---

# 4. Самое главное запомнить

- Браузер ест CSS; SCSS и PostCSS работают **на сборке** (или в watcher), не «внутри Chrome».
- SCSS: `$vars`, nesting, `@mixin` / `@include`, `@use` — удобство автора.
- PostCSS: плагины над CSS AST; типичный must-have — `autoprefixer` + `browserslist`.
- Пайплайн часто `SCSS → CSS → PostCSS → бандл`; PostCSS можно и без SCSS.
- `$color` в Sass ≠ `var(--color)` в рантайме: одно схлопывается при билде, другое читает браузер.
- Глубокий nesting и «миксин на всё» ухудшают читаемость и вес селекторов.

---

# 5. Описание

```text
  *.scss / *.css
       │
       ▼
  [ Sass / SCSS ]          ← препроцессор: синтаксис → CSS
       │
       ▼
  [ PostCSS + plugins ]    ← пост: префиксы, nesting, polyfills…
       │
       ▼
  CSS в бандле / Modules / файл для браузера
```

## SCSS (Sass)

Диалект **SCSS** близок к CSS (фигурные скобки), в отличие от старого indented Sass. Типичное:

```scss
$accent: #69b1ff;

.button {
  color: $accent;

  &:hover {
    filter: brightness(1.1);
  }

  &__icon {
    margin-inline-end: 0.5rem;
  }
}
```

После компиляции — плоские селекторы `.button:hover`, `.button__icon`, литерал цвета вместо `$accent`.

**Миксины** — переиспользуемые куски с параметрами (`@mixin` / `@include`). **`@use`** (вместо устаревшего `@import` в Sass) подключает модули с пространствами имён и не дублирует CSS при повторном импорте.

Часть «фич Sass» уже есть в нативном CSS (nesting, custom properties). Sass остаётся удобен для миксинов, циклов, дизайн-токенов на этапе сборки и больших кодовых баз, где синтаксис уже принят.

## PostCSS

PostCSS сам по себе — **движок + плагины**, не «ещё один Sass». Конфиг (`postcss.config.js`) перечисляет плагины:

```js
module.exports = {
  plugins: [
    require('autoprefixer'),
    // require('postcss-nesting'),
  ],
};
```

**Autoprefixer** смотрит `browserslist` и дописывает `-webkit-` / `-ms-` там, где ещё нужно. Без актуального browserslist префиксы будут «наугад» или лишними.

Другие частые плагины: nesting (если пишут CSS без Sass), `postcss-preset-env` (синтаксис «на вырост» с даункейтом), минификация в prod (часто отдельным шагом / cssnano).

## Пайплайн в бандлере

| Шаг | Инструмент | Роль |
| --- | --- | --- |
| 1 | `sass` / `sass-loader` | SCSS → CSS |
| 2 | `postcss` / `postcss-loader` | плагины |
| 3 | `css-loader` / Vite CSS | Modules, import в JS |

Порядок важен: сначала раскрыть Sass, потом префиксы. В Vite часто достаточно `*.scss` + `autoprefixer` в PostCSS-конфиге.

## SCSS vs PostCSS vs «просто CSS»

```text
  Нужны миксины / зрелый SCSS-код  →  Sass (+ PostCSS для префиксов)
  Только префиксы и лёгкий nesting →  CSS + PostCSS
  Токены в рантайме / темы         →  CSS variables (± любой из выше)
```

Не выбирать «PostCSS вместо SCSS» как лозунг: это разные этажи. Современный стек часто **оба** или **CSS + PostCSS** без Sass.

## Частые ловушки

- Дублировать nesting в Sass и postcss-nesting без нужды.
- Хранить бренд только в `$brand`, а в JS/Theme ждать `var(--brand)` — их никто не связал.
- Считать, что Sass «добавляет префиксы» — это зона autoprefixer.
- Адский `& &__ &--` на шесть уровней — specificity и боль ревью.

---

# 6. Ссылки

- [Sass documentation](https://sass-lang.com/documentation/)
- [PostCSS](https://postcss.org/)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [Browserlist](https://github.com/browserslist/browserslist)
- [Using PostCSS with Vite](https://vitejs.dev/guide/features.html#postcss)
