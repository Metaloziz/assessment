# 1. Тема

**Разделение конфига на prod/dev · bundle-analyzer · HtmlWebpackPlugin · TerserPlugin**

---

# 2. Главное в одну фразу

Dev и prod конфиги разделяют через common + merge; analyzer показывает состав чанков; HtmlWebpackPlugin вшивает бандлы в HTML; TerserPlugin минифицирует JS в production.

---

# 3. Суть

> Когда один `webpack.config.js` обрастает `if (isProd)`, конфиг становится нечитаемым: вперемешку HMR, source maps, minify и хеши имён. Рабочий паттерн — вынести общее (entry, `module.rules`, базовые resolve) в **common**, а отличия окружения — в **dev** и **prod**, склеивая их через `webpack-merge`. Dev заточен под скорость правки и отладку; prod — под размер бандла и долгий кеш в браузере (`contenthash` в именах файлов).
>
> После `build` важно понять, *что* попало в чанки. **webpack-bundle-analyzer** (или Statoscope) рисует карту: где дублируется React, где тянется лишняя локаль, какой vendor раздулся. Без такой картины «оптимизация» — угадывание по ощущениям от `dist/`.
>
> Два плагина часто закрывают хвост prod-сборки. **HtmlWebpackPlugin** сам пишет `index.html` и подставляет актуальные `<script>` / CSS после эмита — не нужно вручную прописывать `[name].[hash].js` в шаблоне. **TerserPlugin** (через `optimization.minimizer` или дефолт `mode: 'production'`) минифицирует JS: короткие имена, выкинутый мёртвый код внутри файла. CSS сжимают отдельно (css-minimizer), это не задача Terser.
>
> Ловушка: тащить тяжёлый minify и «боевые» плагины в dev «на всякий случай» — HMR и feedback loop тупеют. И наоборот: собирать prod без анализатора и без проверки HTML/хешей — легко выкатить раздутый или битый index. Разделение конфигов как раз чтобы каждый режим включал только своё.

---

# 4. Самое главное запомнить

- `webpack-merge`: `merge(common, envConfig)`.
- Dev: скорость и DX; prod: размер, кеш-friendly имена (`contenthash`).
- Analyzer — после `build`, смотреть «кто съел килобайты».
- HtmlWebpackPlugin — шаблон → `dist/index.html` с актуальными `<script>`/`link`; не хардкодить hashed имена.
- Terser — minify JS (mangle + compress); CSS/HTML — отдельно; в dev обычно выключен.

---

# 5. Описание

## Разделение конфигов

```text
webpack.common.js  ─┬─ webpack.dev.js   → serve / HMR
                    └─ webpack.prod.js  → build / minify
```

```javascript
const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'production',
  // prod-only plugins
});
```

## bundle-analyzer

```javascript
new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false })
```

Ищите: неожиданно большие зависимости, два экземпляра одной библиотеки, лишние polyfills.

## HtmlWebpackPlugin

**HtmlWebpackPlugin** — plugin, не loader: он не обрабатывает `import`, а подписывается на **compilation** и после **emit** создаёт или обновляет `index.html`. В исходниках у вас обычно лежит **шаблон** без имён бандлов — пустой `<div id="root">` и, может быть, мета-теги. После сборки Webpack знает, какие JS- и CSS-файлы реально попали в `dist/` (в том числе с `[contenthash]` в имени). Плагин берёт шаблон и **вставляет** актуальные `<script>` и `<link>` — вручную прописывать `main.a1b2c3.js` в HTML не нужно и опасно: при следующем build хеш сменится, а в HTML останется старое имя.

```text
src/index.html (шаблон)     emit: main.[contenthash].js, vendor.[contenthash].js
         │                                    │
         └──────── HtmlWebpackPlugin ─────────┘
                         │
                         ▼
              dist/index.html с правильными <script>/<link>
```

Типичная настройка — в **common**, потому что и dev, и prod нуждаются в HTML; отличаются только имена файлов в output (`[name].js` vs `[name].[contenthash].js`):

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');

plugins: [
  new HtmlWebpackPlugin({
    template: './src/index.html', // ← ваш HTML без ручных hashed имён
    inject: 'body',               // ← куда вставить теги (body / head / false)
    // minify — часто только в prod (см. webpack.prod.js или merge)
    minify: process.env.NODE_ENV === 'production' && {
      collapseWhitespace: true,
      removeComments: true,
    },
  }),
],
```

Полезные опции:

| Опция | Зачем |
| --- | --- |
| `template` | Файл-основа; без него плагин сгенерирует минимальный HTML сам |
| `inject` | `'body'` / `'head'` — автоматически добавить теги; `false` — вы сами ставите `<%= htmlWebpackPlugin.tags %>` в шаблоне |
| `filename` | Имя выходного HTML, по умолчанию `index.html` |
| `chunks` / `excludeChunks` | Какие entry попадут в этот HTML, если entry несколько |
| `minify` | Сжатие HTML в prod (пробелы, комментарии) — отдельно от Terser |

Ловушки: хардкод `<script src="main.js">` в шаблоне ломает кеширование и code splitting; забытый `HtmlWebpackPlugin` при `contenthash` — белый экран, потому что браузер ищет файл с другим именем. Если CSS выносится через `MiniCssExtractPlugin`, плагин подставит и `<link rel="stylesheet">` — главное, чтобы extract-плагин был в конфиге.

## TerserPlugin

**TerserPlugin** (пакет `terser-webpack-plugin`) — минификатор **JavaScript** на этапе `optimization.minimizer`. Он не «угадывает», какие модули импортировать: tree shaking решает, *что* попало в бандл; Terser сжимает уже собранный JS — убирает пробелы и комментарии, **сокращает имена** переменных и функций (`mangle`), выкидывает мёртвый код *внутри* файла (`compress`: `if (false) { … }`, неиспользуемые ветки). CSS, HTML и картинки Terser не трогает: HTML сжимает `HtmlWebpackPlugin` (опция `minify`), CSS — `CssMinimizerPlugin` или аналог.

```text
граф модулей → bundle.js (читаемый, с пробелами)
                      │
                      ▼ TerserPlugin (prod)
              bundle.[contenthash].js (короткий, для браузера)
```

В Webpack 5 при `mode: 'production'` минификация **включена по умолчанию** — под капотом уже стоит Terser. Явный `new TerserPlugin({ … })` нужен, когда хотите тонкую настройку или заменить дефолт:

```javascript
const TerserPlugin = require('terser-webpack-plugin');

optimization: {
  minimize: true, // ← в prod обычно true; в dev — false (быстрее HMR)
  minimizer: [
    new TerserPlugin({
      parallel: true, // ← несколько процессов на больших бандлах
      terserOptions: {
        compress: {
          passes: 2,
          drop_console: true, // ← убрать console.* в prod (осознанно!)
        },
        mangle: true,
        // keep_classnames / keep_fnames — если стек-трейсы важны для Sentry
      },
    }),
  ],
},
```

Terser имеет смысл держать в **prod**, не в dev: минификация заметно удлиняет сборку и ломает читаемость стека при отладке. Не путать с **gzip/brotli** на CDN — это сжатие при передаче по сети *поверх* уже минифицированного файла. Ловушка: `drop_console: true` без согласования с командой — в prod пропадают логи, на которые полагали support; `mangle` может усложнить чтение production stack trace без source maps.

## Чеклист prod

1. `mode: 'production'`
2. `contenthash` в filename
3. HtmlWebpackPlugin
4. Minify JS (+ CSS)
5. Analyzer на PR «размер вырос»

---

# 6. Ссылки

- [webpack-merge](https://github.com/survivejs/webpack-merge)
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [HtmlWebpackPlugin](https://github.com/jantimon/html-webpack-plugin)
- [TerserWebpackPlugin](https://webpack.js.org/plugins/terser-webpack-plugin/)
