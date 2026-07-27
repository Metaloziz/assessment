# 1. Тема

**Gulp, Rollup и принцип выбора сборщика под задачу**

---

# 2. Главное в одну фразу

Gulp — task runner для пайплайнов над файлами, Rollup — bundler для библиотек и tree shaking; выбор зависит от того, собираете ли вы приложение, библиотеку или набор файловых задач.

---

# 3. Ответ для собеседования

> «Сборщик выбирают по задаче, не по моде.
>
> **Webpack/Vite** — SPA: loaders, HMR, splitting.
> **Rollup** — npm-библиотеки: отличный tree shaking, `esm`/`cjs`/`umd`.
> **Gulp** — оркестратор задач (Sass, спрайты, копирование), без полноценного module graph.
>
> Принцип: bundler связывает модули; task runner автоматизирует файловые операции. Часто комбинируют.»

---

# 4. Самое главное запомнить

- Bundler (Webpack/Rollup/Vite) ≠ task runner (Gulp).
- Rollup — лучший для **библиотек**.
- Gulp: `src → pipe → dest`.
- Выбор = тип проекта + DX + формат выхода.

---

# 5. Описание

## Gulp

```javascript
export function styles() {
  return gulp.src('src/**/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('dist/css'));
}
```

Когда: legacy, ассеты, кастомные шаги без ES-module graph.

## Rollup

```javascript
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.esm.js', format: 'esm' },
    { file: 'dist/index.cjs.js', format: 'cjs' },
  ],
  external: ['react', 'react-dom'],
};
```

Когда: UI kit, SDK, нужен чистый tree-shaken output.

## Выбор

| Задача | Инструмент |
|--------|------------|
| SPA | Vite / Webpack |
| npm-библиотека | Rollup / tsup |
| Файловые пайплайны | Gulp |
| Monorepo orchestration | Turborepo / Nx |

---

# 6. Ссылки

- [Gulp](https://gulpjs.com/docs/en/getting-started/quick-start)
- [Rollup](https://rollupjs.org/introduction/)
- [Vite — Why Vite](https://vitejs.dev/guide/why.html)
- [tsup](https://github.com/egoist/tsup)
