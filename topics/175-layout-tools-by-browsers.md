# 1. Тема

**Определение инструментов в зависимости от используемых браузеров**

---

# 2. Главное в одну фразу

Целевые браузеры задают, *какие* слои тулчейна включать: transpile, префиксы, polyfill’ы и проверку фич — а не один «стандартный набор на все случаи».

---

# 3. Суть

> Сначала фиксируют **кого** поддерживаем (аналитика, продукт, Baseline / Browserslist), потом под этот список включают инструменты. Узкая аудитория evergreen — мало трансформов и почти без runtime-polyfill’ов. Широкая или legacy — `@babel/preset-env` / SWC, Autoprefixer, `core-js` или точечные polyfill’ы. Список целей (Browserslist) — вход; набор плагинов и polyfill’ов — выход решения.
>
> Зачем так: каждый лишний слой стоит килобайтов и времени сборки. Тащить IE-era transpile и полный `core-js` в дашборд «только Chrome 120+» — раздутый бандл без выгоды. Обратное — modern-only сборка для публичного сайта с Safari 14 в метриках — сюрпризы в проде.
>
> Практика: один контракт целей → инструменты читают его сами (`preset-env`, Autoprefixer). Отдельно решают runtime: `useBuiltIns: 'usage'` / `polyfill.io` / ручные shim’ы только под дыры списка. Для отдельных фич в CSS/JS смотрят Can I Use / MDN и при необходимости `@supports` / feature detect, а не User-Agent.
>
> Ловушка: путать «есть Browserslist» с «тулчейн уже правильный». Конфиг целей без согласованных Babel/PostCSS/polyfill даёт рассинхрон. И наоборот: копировать чужой набор плагинов без своего списка браузеров — оптимизация вслепую.

---

# 4. Самое главное запомнить

- Сначала аудитория → список браузеров; потом — какие слои тулчейна включать.
- Узкий modern → меньше transpile / префиксов / polyfill; широкий / legacy → больше.
- Browserslist задаёт **цели**; Babel, Autoprefixer и polyfill’ы — **реакция** на них.
- Polyfill — runtime; transpile/префиксы — build-time. Это разные слои.
- Фичу проверяют Can I Use / MDN / `@supports` / feature detect, не парсингом User-Agent.
- Один и тот же «стандартный» стек плагинов без своих целей почти всегда либо жирный, либо дырявый.
- После смены query имеет смысл пересмотреть `useBuiltIns`, Autoprefixer и лишние PostCSS-плагины.

---

# 5. Описание

```text
Аудитория / аналитика
        │
        ▼
  Цели (Browserslist / Baseline)
        │
        ▼
  ┌─────────────┬──────────────┬─────────────┐
  │ Transpile   │ CSS prefixes │ Polyfills   │
  │ Babel / SWC │ Autoprefixer │ core-js …   │
  └─────────────┴──────────────┴─────────────┘
        │
        ▼
  Бандл под реальные дыры списка
```

## От целей к инструментам

| Цели | Типичный тулчейн |
| --- | --- |
| Evergreen / Baseline widely available | Лёгкий transpile (или почти без), Autoprefixer почти пустой, polyfill’ов мало |
| «defaults» / доля рынка без IE | `preset-env` + Autoprefixer по списку; polyfill точечно |
| Legacy (старый Safari / IE в контракте) | Тяжёлый transpile, префиксы, `core-js` / явные shim’ы |

Browserslist (тема рядом) — **общий** список. Здесь — **решение**, какие потребители этого списка реально нужны продукту.

## Build-time vs runtime

- **Build-time:** Babel/SWC (синтаксис, helpers), Autoprefixer / PostCSS (CSS под версии).
- **Runtime:** `core-js`, `regenerator-runtime`, отдельные polyfill’ы API (`IntersectionObserver`, `ResizeObserver`…).

`@babel/preset-env` с `useBuiltIns: 'usage'` смотрит цели и вставляет только нужные импорты `core-js`. Без целей или с устаревшим `caniuse-lite` набор «нужного» будет другим.

## Как выбирать по фиче

1. Нужна фича (например `gap` в flex, `:has()`, `structuredClone`).
2. Can I Use / MDN — покрытие относительно **вашего** списка, не «мира вообще».
3. Если дыра есть: transpile/префикс, polyfill, progressive enhancement (`@supports`, ветка без фичи) — или сознательно поднять минимальную версию браузера.

Плохо:

```javascript
if (/MSIE|Trident/.test(navigator.userAgent)) {
  // «особый» CSS/JS
}
```

Хорошо: feature detect (`'ResizeObserver' in window`), `@supports`, или сборка уже под согласованный Browserslist.

## Согласовать стек

Один источник целей → все потребители:

```text
.browserslistrc
    → Babel preset-env   (без своего targets)
    → Autoprefixer       (без overrideBrowserslist)
    → (опц.) ESLint compat / stylelint
```

Свой `targets` только в Babel или только в Autoprefixer — снова рассинхрон CSS и JS (см. лабу Browserslist).

## Ловушки

- Копировать `useBuiltIns: 'entry'` + полный `core-js` после сужения целей до Chrome last 2 — мёртвый вес.
- Включать Autoprefixer «на всякий случай» при modern-only и не смотреть, что он реально пишет.
- Менять Browserslist в CI, но не обновлять `caniuse-lite` — решения по инструментам устаревают вместе с базой.
- Подменять продуктовую политику поддержки парсингом User-Agent в рантайме.

---

# 6. Ссылки

- [Browserslist](https://github.com/browserslist/browserslist)
- [Babel preset-env — targets / browserslist / useBuiltIns](https://babeljs.io/docs/babel-preset-env)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [Can I Use](https://caniuse.com/)
- [MDN — Progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)
- [web.dev — Baseline](https://web.dev/baseline)
