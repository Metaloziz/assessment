# 1. Тема

**Механизмы ускорения горячей/холодной сборки проекта**

---

# 2. Главное в одну фразу

Горячую (dev) сборку ускоряют HMR и инкрементальная пересборка только изменённого; холодную (полную/prod) — кэш, параллелизм, быстрые компиляторы и меньше лишней работы бандлера.

---

# 3. Суть

> Скорость сборки — не одна цифра. **Горячая** (dev) — цикл «сохранил файл → увидел изменение»: HMR, инкрементальный граф, lazy compilation, в Vite — native ESM по запросу без предварительного бандла всего приложения. **Холодная** — полная пересборка с нуля (prod или чистый CI): здесь решают persistent cache, быстрый transpile (SWC/esbuild), параллелизм и меньше лишней работы (тяжёлые source maps, лишний Babel на всём).
>
> Зачем разделять: рычаги разные. На save выигрывает «не трогать несвязанное»; на CI — «не пересчитывать то же самое дважды». Один плагин «для скорости» в обоих режимах часто вредит: minify в dev тормозит HMR, а отсутствие filesystem cache на cold делает каждую полную сборку как первую.
>
> Как ускоряют на практике. Hot: `devServer.hot`, watch с `ignored` для `node_modules`, Vite prebundle deps через esbuild. Cold: Webpack `cache: { type: 'filesystem' }`, SWC/esbuild вместо медленного пайплайна, на монорепо — remote cache и affected (Turborepo/Nx).
>
> Ловушка: спорить «Vite всегда быстрее Webpack» без контекста hot/cold. Vite силён в dev; Webpack 5 с прогретым cache часто конкурентоспособен на повторных cold. Сначала измерьте cold start, hot update и prod на CI — потом крутите рычаг нужного режима.

---

# 4. Самое главное запомнить

- Hot ≈ HMR + incremental + не бандлить всё заранее в dev.
- Cold ≈ cache + fast transpile/minify + parallelism.
- Webpack 5: `cache: { type: 'filesystem' }` для повторных сборок.
- Vite dev быстр за счёт ESM + prebundle deps через esbuild.
- CI: кешировать `node_modules`, webpack/vite cache, affected (Turborepo/Nx).

---

# 5. Описание

## Hot (разработка)

- HMR / React Fast Refresh — патч модуля без полного reload.
- Vite: модули по запросу; зависимости заранее через esbuild.
- Webpack: watch + HMR; `watchOptions.ignored` для `node_modules`.
- Lazy compilation — не компилировать неоткрытые маршруты до запроса.

```text
изменили Button.tsx
  → пересобрали только зависимый подграф
  → HMR update в браузер
```

## Cold (полная / prod / CI)

- Filesystem cache Webpack — повторный cold быстрее первого.
- esbuild/SWC для transpile и иногда minify.
- thread-loader / worker threads.
- Меньше source maps в prod; externals для тяжёлых peerDeps в библиотеках.
- Monorepo: remote cache и affected builds (Turborepo, Nx).

| Инструмент | Сильная сторона |
|------------|-----------------|
| Vite | Мгновенный dev |
| Webpack 5 cache | Повторные полные сборки |
| esbuild / SWC | Быстрый transpile |
| Turborepo / Nx | Кеш задач в монорепо |

## Что измерить

1. Cold start: время до «compiled» с пустым кешем.
2. Hot update: время от save до отображения.
3. Prod build на CI с прогретым cache vs без.

---

# 6. Ссылки

- [Vite — Why Vite](https://vitejs.dev/guide/why.html)
- [Webpack — Cache](https://webpack.js.org/configuration/cache/)
- [esbuild](https://esbuild.github.io/)
- [SWC](https://swc.rs/)
- [Turborepo Caching](https://turbo.build/repo/docs/core-concepts/caching)
