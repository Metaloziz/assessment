# 1. Тема

**Механизмы ускорения горячей и холодной сборки проекта**

---

# 2. Главное в одну фразу

Горячую сборку ускоряют через HMR и инкрементальную пересборку только изменённого, холодную — через кэш, параллелизм, быстрые компиляторы и уменьшение объёма работы bundler'а.

---

# 3. Ответ для собеседования

> «**Горячая сборка** — dev: быстрый старт и HMR. **Холодная** — полная production-сборка с нуля.
>
> Hot: HMR, ESM в dev (Vite), инкрементальная пересборка, in-memory cache, lazy compilation.
> Cold: persistent filesystem cache, esbuild/SWC, параллелизация, tree shaking, code splitting, оптимизация resolve, осторожнее с source maps.
>
> Vite быстр в dev за счёт native ESM + esbuild; Webpack — filesystem cache. Главная идея: не делать одну работу дважды и не трогать то, что не изменилось.»

---

# 4. Самое главное запомнить

- Hot = HMR + инкрементальность + dev без полного bundle.
- Cold = кэш + быстрые компиляторы + параллелизм.
- Vite dev быстр, потому что не бандлит всё заранее.
- Webpack 5 cache ускоряет повторные сборки.
- esbuild/SWC ≫ Babel/tsc для transpile/minify.

---

# 5. Описание

## Hot

- HMR / React Fast Refresh
- Vite: ESM по запросу, deps prebundle через esbuild
- Инкрементальная компиляция графа
- `watchOptions.ignored` для `node_modules`

## Cold

- `cache: { type: 'filesystem' }` (Webpack)
- esbuild/SWC вместо Babel/Terser
- thread-loader / workers
- Tree shaking, externals, меньше source maps в prod
- CI cache: `node_modules`, `.vite`, webpack cache
- Turborepo/Nx — remote/affected builds

| Инструмент | Сильная сторона |
|------------|----------------|
| Vite | Мгновенный dev |
| Webpack 5 | Filesystem cache |
| esbuild/SWC | Быстрый transpile |
| Turbopack | Инкрементальный bundler |

---

# 6. Ссылки

- [Vite — Why Vite](https://vitejs.dev/guide/why.html)
- [Webpack — Cache](https://webpack.js.org/configuration/cache/)
- [esbuild](https://esbuild.github.io/)
- [SWC](https://swc.rs/)
- [Turborepo Caching](https://turbo.build/repo/docs/core-concepts/caching)
