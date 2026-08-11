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
- HtmlWebpackPlugin = HTML + правильные `<script>` под хеши.
- Terser = JS minify; CSS — отдельно (css-minimizer).

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

```javascript
new HtmlWebpackPlugin({
  template: './src/index.html',
  minify: isProd && { collapseWhitespace: true },
})
```

Не хардкодьте `[name].[hash].js` руками в HTML — плагин подставит актуальные имена.

## TerserPlugin

```javascript
optimization: {
  minimize: true,
  minimizer: [new TerserPlugin({ parallel: true })],
}
```

В Webpack 5 при `mode: 'production'` минификация включена по умолчанию; кастомный Terser — для тонкой настройки (drop_console, reserved names).

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
