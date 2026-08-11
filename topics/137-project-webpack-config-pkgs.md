# 1. Тема

**Как работает конфигурация Webpack · Прекоммитные проверки · Менеджеры пакетов (yarn, npm)**

---

# 2. Главное в одну фразу

Конфиг Webpack описывает entry/rules/plugins; прекоммит (husky + lint-staged) ловит ошибки до git; npm и yarn ставят зависимости по lockfile — отличаются клиентом и стратегией резолва, не «магией пакетов».

---

# 3. Суть

> `webpack.config.js` (или `.mjs` / функция от `env`) — декларация сборки: откуда брать код, чем обрабатывать файлы, какие плагины повесить. Без понятного конфига «чинится» всё через копипасту плагинов.
>
> Прекоммитные проверки — страховка локально: перед коммитом прогоняют линтер/тесты только на затронутых файлах (`lint-staged`), хук ставит **Husky**. Это не замена CI, а быстрый фильтр.
>
> **npm** и **yarn** (Classic / Berry) — менеджеры пакетов: читают `package.json`, пишут lockfile, кладут дерево в `node_modules` (или PnP). Для команды важен один менеджер и закоммиченный lockfile, иначе «у меня работает».

---

# 4. Самое главное запомнить

- Конфиг = объект или `(env, argv) => config`; mode `development` / `production` меняет дефолты.
- `module.rules` — match по `test` + цепочка `use` (справа налево).
- Husky → git hooks; lint-staged → только staged файлы.
- Lockfile обязателен в репозитории.
- npm и yarn не смешивать в одном проекте без причины.

---

# 5. Описание

## Конфигурация Webpack

Частые поля:

```javascript
module.exports = (env, argv) => ({
  mode: argv.mode || 'development',
  entry: './src/index.js',
  output: { path: __dirname + '/dist', clean: true },
  resolve: { extensions: ['.js', '.ts', '.tsx'] },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
    ],
  },
  plugins: [/* HtmlWebpackPlugin, DefinePlugin… */],
  devServer: { hot: true, port: 3000 },
});
```

Разделение на `webpack.common.js` + `webpack.dev.js` / `webpack.prod.js` через `webpack-merge` — тема соседних уровней; на старте хватит одного файла и `mode`.

## Прекоммит

Типичная связка:

1. `husky` создаёт `.husky/pre-commit`.
2. Хук вызывает `npx lint-staged`.
3. В `package.json` — map: `*.{ts,tsx}` → `eslint --fix`.

Так не гоняют весь монорепозиторий на каждый коммит.

## npm vs yarn

| | npm | yarn |
|--|-----|------|
| Lockfile | `package-lock.json` | `yarn.lock` |
| Команда | `npm install` / `npm ci` | `yarn` / `yarn install --frozen-lockfile` |
| Скрипты | `npm run build` | `yarn build` |

Правило: один инструмент на репозиторий + CI ставит ровно по lockfile (`npm ci` / frozen).

---

# 6. Ссылки

- [Webpack — Configuration](https://webpack.js.org/configuration/)
- [Husky](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/lint-staged/lint-staged)
- [npm — package-lock](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)
- [Yarn](https://yarnpkg.com/)
