# 1. Тема

**Что такое Webpack**

---

# 2. Главное в одну фразу

Webpack — бандлер: строит граф зависимостей от entry и собирает модули (JS, CSS, картинки через loaders) в один или несколько файлов для браузера.

---

# 3. Суть

> Webpack берёт точку входа (`entry`), обходит `import` / `require` и собирает **граф модулей**. На выходе — бандлы в `output`: код, который браузер может загрузить без «сырой» папки `src`.
>
> Без бандлера браузеру пришлось бы тянуть сотни мелких файлов и разбираться с CommonJS/старыми синтаксисами. Webpack (и аналоги) закрывают DX: один конфиг, трансформы, splitting, dev-server.
>
> Важно: Webpack — не «магия прод», а пайплайн. Понимание entry → module graph → loaders → plugins → chunks помогает отлаживать размер и скорость сборки. Путать с task runner (Gulp): тот гоняет файлы по трубам, не обязательно строит JS-граф.

---

# 4. Самое главное запомнить

- **Bundler** связывает модули в граф; **task runner** оркестрирует файловые шаги.
- Ключевые понятия: `entry`, `output`, `module.rules` (loaders), `plugins`, `chunks`.
- Всё, что не «чистый» JS, проходит через **loader** (css, ts, images…).
- Dev: `webpack-dev-server` + HMR; prod: минимизация, splitting, хеши в именах.
- Сегодня часто Vite/esbuild на новых SPA; Webpack всё ещё доминирует в крупных legacy и гибких кастомах.

---

# 5. Описание

## Зачем

Браузер исторически плохо дружит с тысячами модулей и разными форматами. Бандлер:

1. Резолвит зависимости.
2. Трансформирует (TS → JS, CSS modules…).
3. Кладёт результат в предсказуемые файлы.

## Минимальная картинка

```text
entry (index.js)
   │
   ├─ App.js ─── Button.js
   │
   └─ styles.css  (через css-loader)
         │
         ▼
   output: main.js (+ main.css)
```

## Каркас конфига

```javascript
module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname + '/dist',
    filename: '[name].[contenthash].js',
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
};
```

## Что не путать

| Понятие | Смысл |
|---------|--------|
| Module | Один файл в графе |
| Chunk | Кусок бандла (после splitting) |
| Bundle | Итоговый артефакт(ы) для загрузки |
| Loader | Трансформ файла при импорте |
| Plugin | Хуки на жизненный цикл компиляции |

---

# 6. Ссылки

- [Webpack — Concepts](https://webpack.js.org/concepts/)
- [Webpack — Entry & Output](https://webpack.js.org/concepts/entry-points/)
- [Webpack — Dependency Graph](https://webpack.js.org/concepts/dependency-graph/)
