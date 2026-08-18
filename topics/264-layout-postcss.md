# 1. Тема

**PostCSS**

---

# 2. Главное в одну фразу

PostCSS — движок, который парсит CSS в AST и прогоняет его через цепочку плагинов на сборке: autoprefixer, nesting, preset-env и свои трансформеры.

---

# 3. Суть

> **PostCSS** — не «ещё один Sass» и не замена CSS в браузере. Это **ранner плагинов** над деревом CSS: parse → правки узлов → stringify. На входе и выходе обычный CSS; браузер видит только финальный файл из бандла. Типичный must-have — **Autoprefixer**, который читает **Browserlist** и дописывает вендорные префиксы там, где они ещё нужны.

> Зачем отдельный слой. Препроцессор (SCSS) отвечает за синтаксис автора — переменные `$`, миксины, `@use`. PostCSS отвечает за **целевой CSS под версии браузеров** и за полифилы синтаксиса: nesting без Sass, `postcss-preset-env`, custom media, минификация в prod. Можно жить **только на CSS + PostCSS**, без Sass — частый современный вариант.

> Как подключают. Конфиг `postcss.config.js` (или `.mjs`) перечисляет плагины **в порядке применения**. Vite, webpack и другие сборщики подхватывают файл автоматически после компиляции SCSS (если он есть). Цепочка часто выглядит так: исходный CSS (или вывод Sass) → nesting / preset-env → autoprefixer → cssnano в production.

> Ловушка: ждать префиксов от Sass — их даёт Autoprefixer. Дублировать nesting в Sass и `postcss-nesting` без нужды. Ставить autoprefixer **до** nesting — префиксы попадут не туда. Держать второй список браузеров только в Autoprefixer, игнорируя общий Browserlist — CSS и JS разъедутся по целям.

---

# 4. Самое главное запомнить

- PostCSS = **движок + плагины** над CSS AST; работает **на сборке**, не в рантайме.
- **Autoprefixer** + **Browserlist** — стандартная пара для вендорных префиксов.
- Порядок плагинов в конфиге **важен**: сначала синтаксис (nesting, preset-env), потом префиксы, в prod — минификация.
- PostCSS **не заменяет** Sass: разные задачи; часто идут **последовательно** в пайплайне.
- Свой плагин — объект с `postcssPlugin` и хуками по узлам (`Once`, `Rule`, `Declaration`).
- Без актуального `caniuse-lite` / Browserlist префиксы и даунlevel синтаксис «уезжают» от реальности.

---

# 5. Описание

```text
  styles.css  (или CSS после Sass)
        │
        ▼
   PostCSS parse → AST
        │
   ┌────┴────┬──────────────┬─────────────┐
   │ nesting │ preset-env   │ свой plugin │
   └────┬────┴──────────────┴─────────────┘
        ▼
   autoprefixer  ← browserslist
        ▼
   cssnano (prod, опционально)
        ▼
   бандл / CSS Modules
```

## Конфиг плагинов

```js
module.exports = {
  plugins: [
    require('postcss-nesting'),
    require('autoprefixer'),
    ...(process.env.NODE_ENV === 'production' ? [require('cssnano')] : []),
  ],
};
```

Форма с объектом тоже допустима — удобна для опций:

```js
module.exports = {
  plugins: {
    'postcss-nesting': {},
    autoprefixer: {},
  },
};
```

## Частые плагины

| Плагин | Роль |
| --- | --- |
| **autoprefixer** | `-webkit-` / `-ms-` по Browserlist |
| **postcss-nesting** | вложенные правила в плоский CSS |
| **postcss-preset-env** | современный синтаксис с даункейтом по stage |
| **cssnano** | минификация в production |
| **postcss-import** | `@import` до остальных (если нужен) |

## Autoprefixer и Browserlist

Autoprefixer без своего `overrideBrowserslist` читает тот же конфиг, что Babel (`package.json` или `.browserslistrc`). Список проверяют `npx browserslist`. Соседняя тема **Browserlist** — про общий контракт целей; здесь важно, что **CSS-префиксы** завязаны на него же.

Пример входа/выхода:

```css
/* до */
.card {
  user-select: none;
  backdrop-filter: blur(8px);
}
```

```css
/* после autoprefixer (упрощённо) */
.card {
  -webkit-user-select: none;
  user-select: none;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
```

## Nesting без Sass

```css
/* до postcss-nesting */
.button {
  color: white;
  &:hover {
    filter: brightness(1.1);
  }
}
```

```css
/* после */
.button {
  color: white;
}
.button:hover {
  filter: brightness(1.1);
}
```

## Порядок в бандлере

| Шаг | Инструмент | Роль |
| --- | --- | --- |
| 0 (опц.) | Sass | SCSS → CSS |
| 1 | PostCSS | плагины по конфигу |
| 2 | css-loader / Vite | import, Modules |

В Vite достаточно `postcss.config.*` в корне — для `*.css` и для CSS после встроенного Sass.

## Свой плагин (минимум)

```js
const plugin = {
  postcssPlugin: 'strip-comments',
  Once(root) {
    root.walkComments((c) => c.remove());
  },
};
plugin.postcss = true;
module.exports = plugin;
```

Плагин обходит AST, а не текст regex'ом — так же устроены Autoprefixer и nesting.

## PostCSS vs Sass

```text
  Миксины, $vars, @use, зрелая SCSS-база  →  Sass, затем PostCSS
  Только префиксы + nesting в CSS         →  CSS + PostCSS
  Токены в рантайме / темы                →  CSS variables (± любой стек выше)
```

## Ловушки

- Два nesting-п слоя (Sass + postcss-nesting) без причины.
- Autoprefixer перед nesting — префиксы на «сыром» синтаксисе.
- Отдельный `targets` только в Babel, забытый Browserlist для CSS.
- Считать PostCSS «препроцессором с переменными `$`» — `$` это Sass, не PostCSS.

Соседние темы: **SCSS/PostCSS** — общий пайплайн с препроцессором; **Browserlist** — общий список целей для Autoprefixer и Babel.

---

# 6. Ссылки

- [PostCSS](https://postcss.org/)
- [Writing a PostCSS plugin](https://postcss.org/docs/writing-a-postcss-plugin)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [postcss-preset-env](https://github.com/csstools/postcss-preset-env)
- [Using PostCSS with Vite](https://vitejs.dev/guide/features.html#postcss)
