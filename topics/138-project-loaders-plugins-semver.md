# 1. Тема

**Зачем нужны лоадеры · Зачем нужны плагины · Семантическое версионирование**

---

# 2. Главное в одну фразу

Loaders превращают импортированный файл в модуль по цепочке; plugins работают на всей сборке через хуки компиляции; semver и диапазоны в `package.json` договариваются, какие версии зависимостей можно подтянуть при установке.

---

# 3. Суть

> В `import './theme.scss'` Webpack не «понимает» SCSS сам по себе — нужен **loader**: функция, которая читает файл по правилу `test` и отдаёт JavaScript-модуль или передаёт результат следующему loader в цепочке `use`. CSS, картинки и TypeScript становятся импортируемыми именно потому, что loaders переводят их в формат, который бандлер уже умеет связать в граф. Порядок в `use: ['a', 'b', 'c']` читается **справа налево**: последний loader в массиве получает исходный файл первым.
>
> **Plugin** — другой слой. Он не обрабатывает один конкретный import, а подписывается на жизненный цикл **compilation**: сгенерировать `index.html`, вытащить CSS в отдельный файл, почистить `dist` перед сборкой, показать прогресс. Loader отвечает на вопрос «как прочитать этот файл»; plugin — «что сделать со всей сборкой после того, как граф собран».
>
> **Semver** (`MAJOR.MINOR.PATCH`) — договорённость об обратной совместимости: ломающие изменения → MAJOR, новые возможности без поломки API → MINOR, исправления → PATCH. В `package.json` диапазоны вроде `^1.2.3` и `~1.2.3` говорят npm/yarn, какие версии можно поставить при `install`. Слепой `^` на `0.x` или `*` в проде — частый источник «вчера собиралось, сегодня упало».
>
> Ловушка: путать loaders и plugins («почему HtmlWebpackPlugin не в `module.rules`») и не сверять lockfile после смены диапазонов — «совместимо по semver» не значит «ваш код точно работает с новой минорной версией».

---

# 4. Самое главное запомнить

- Loaders: файл → transform → модуль; цепочка `use` — **справа налево**.
- Plugins: хуки на **compilation**, не на один import.
- Один импорт файла — loaders; «сгенерировать index.html» — plugin.
- Semver: `1.2.3` = major · minor · patch.
- `^1.2.3` — совместимые версии 1.x (≥1.2.3, <2.0.0); `~1.2.3` — только патчи в 1.2.x.
- `0.x` и `*` — особые правила; в проде фиксируйте lockfile.

---

# 5. Описание

Webpack делит «как собрать проект» на два типа расширений: **на уровне файла** (loaders) и **на уровне всей сборки** (plugins). Версии пакетов — отдельный контракт между вашим кодом и `node_modules`.

## Схема: loader vs plugin

```text
import './app.scss' ──► sass-loader → css-loader → style-loader   (loaders, на файл)

compilation hooks ──► HtmlWebpackPlugin пишет index.html          (plugin, на сборку)
```

Loaders срабатывают, когда файл попадает в граф через `import` или `require`. Plugins могут создать файл, которого не было в исходниках — например, HTML с уже подставленными `<script>` после emit.

## Loaders

Правило в `module.rules` сопоставляет путь с `test` и запускает цепочку `use`. Для SCSS типичный порядок: сначала sass переводит SCSS в CSS, затем css-loader собирает `@import`, последний loader решает, куда деть CSS — инжект в DOM или вынос в файл.

```javascript
{
  test: /\.scss$/,
  use: ['style-loader', 'css-loader', 'sass-loader'],
  // фактически: sass → css → inject в страницу (справа налево)
}
```

Примеры loaders: `babel-loader`, `ts-loader`, `css-loader`, встроенный `asset/resource` (наследник идеи `file-loader`).

## Plugins

Plugins подключают через массив `plugins: […]` и часто инстанцируют класс: `new HtmlWebpackPlugin({ … })`. Они не заменяют loaders: loader не напишет `index.html` из шаблона, а plugin не превратит `.scss` в модуль.

```javascript
plugins: [
  new HtmlWebpackPlugin({ template: './src/index.html' }),
  new MiniCssExtractPlugin(),
]
```

`MiniCssExtractPlugin` — plugin (вынос CSS в файл), а `MiniCssExtractPlugin.loader` в `use` — уже loader в цепочке для `.scss`.

## Semver на пальцах

Версия `1.4.2` читается так: **1** — major (ломающие изменения), **4** — minor (новые фичи без поломки API), **2** — patch (багфиксы).

```text
1.4.2
│ │ └── PATCH — багфикс, API тот же
│ └──── MINOR — новая возможность, API совместим
└────── MAJOR — ломающие изменения
```

| Диапазон | Что разрешит при install |
|----------|--------------------------|
| `1.2.3` | только 1.2.3 |
| `~1.2.3` | 1.2.3 … последний 1.2.x |
| `^1.2.3` | 1.2.3 … <2.0.0 |
| `*` / `latest` | почти что угодно — опасно в проде |

Для `0.x` по соглашению API ещё нестабилен: `^0.5.1` ведёт себя иначе, чем `^1.x`. Практика команды: один lockfile в репозитории, `npm ci` / frozen install в CI — тогда диапазон в `package.json` не «переустановит» проект неожиданно.

---

# 6. Ссылки

- [Webpack — Loaders](https://webpack.js.org/concepts/loaders/)
- [Webpack — Plugins](https://webpack.js.org/concepts/plugins/)
- [semver](https://semver.org/)
- [npm — semver ranges](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies)
