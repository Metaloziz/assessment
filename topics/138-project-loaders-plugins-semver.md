# 1. Тема

**Зачем нужны лоадеры · Зачем нужны плагины · Семантическое версионирование**

---

# 2. Главное в одну фразу

Loaders превращают импортируемый файл в модуль по цепочке; plugins цепляются к жизненному циклу компиляции; semver (`MAJOR.MINOR.PATCH` и диапазоны `^`/`~`) договаривается о совместимости зависимостей.

---

# 3. Суть

> **Loader** — функция (часто цепочка), которая на этапе сборки читает файл по `test` и отдаёт JS-модуль или следующий loader. CSS, картинки, TS «становятся импортируемыми», потому что loader их понял.
>
> **Plugin** — объект с доступом к `compiler` / `compilation`: эмитит HTML, минифицирует, копирует ассеты, рисует прогресс. Это не «ещё один loader», а хуки на события сборки.
>
> **Semver** — схема версий пакетов: ломающие изменения → MAJOR, фичи без поломки API → MINOR, фиксы → PATCH. В `package.json` диапазоны `^1.2.3` / `~1.2.3` задают, что можно подтянуть при install. Путаница loaders/plugins и слепой `^` — частые источники «внезапно сломалось».

---

# 4. Самое главное запомнить

- Loaders: **file in → transform → module**; порядок `use` — справа налево.
- Plugins: **hooks** на компиляцию, не на один файл.
- Один файл — loaders; «сгенерировать index.html» — plugin.
- Semver: `1.2.3` = major.minor.patch.
- `^1.2.3` ≈ совместимо с 1.x (≥1.2.3); `~1.2.3` ≈ патчи 1.2.x.

---

# 5. Описание

## Loaders

```javascript
{
  test: /\.scss$/,
  use: ['style-loader', 'css-loader', 'sass-loader'],
  // фактически: sass → css → inject style
}
```

Примеры: `babel-loader`, `ts-loader`, `css-loader`, `file-loader` / `asset/resource`.

## Plugins

```javascript
plugins: [
  new HtmlWebpackPlugin({ template: './src/index.html' }),
  new MiniCssExtractPlugin(),
]
```

Loader обрабатывает импорт; plugin может создать файл, которого не было в `import`.

## Semver на пальцах

```text
1.4.2
│ │ └── PATCH — багфикс
│ └──── MINOR — новая возможность, API совместим
└────── MAJOR — ломающие изменения
```

| Диапазон | Пример разрешит |
|----------|-----------------|
| `1.2.3` | только 1.2.3 |
| `~1.2.3` | 1.2.3 … 1.2.x |
| `^1.2.3` | 1.2.3 … <2.0.0 |
| `*` / `latest` | почти что угодно — опасно в проде |

`0.x` по соглашению часто считают нестабильным API — `^0.5.1` ведёт себя иначе, чем `^1.x`.

## Схема: loader vs plugin

```text
import './app.scss' ──► sass-loader → css-loader → …  (loaders)
                              │
compilation hooks ──► HtmlWebpackPlugin пишет index.html  (plugin)
```

---

# 6. Ссылки

- [Webpack — Loaders](https://webpack.js.org/concepts/loaders/)
- [Webpack — Plugins](https://webpack.js.org/concepts/plugins/)
- [semver](https://semver.org/)
- [npm — semver ranges](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies)
