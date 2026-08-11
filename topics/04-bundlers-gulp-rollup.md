# 1. Тема

**Инструменты для сборки (gulp, rollup). Принцип выбора сборщика исходя из задачи**

---

# 2. Главное в одну фразу

Gulp — task runner для файловых пайплайнов, Rollup — bundler с сильным tree shaking для библиотек; Webpack/Vite — приложения; выбор определяется задачей, а не модой.

---

# 3. Суть

> **Bundler** и **task runner** решают разные задачи. Bundler (Webpack, Rollup, Vite, esbuild) строит граф `import`/`require` и собирает JS/TS в бандлы. **Gulp** гоняет файлы через `src → pipe → dest` (scss, картинки, копирование) и сам по себе не заменяет module graph — это оркестратор файловых шагов, а не сборщик приложения.
>
> Зачем различать: от артефакта зависит инструмент. **SPA / админка** — Vite или Webpack: HMR, code splitting, лоадеры. **npm-библиотека / SDK** — Rollup или tsup: чистый ESM и CJS, сильный tree shaking, `external` для peerDeps вроде React. **Только ассеты без JS-графа** — Gulp или простые npm-скрипты.
>
> Как выбирать на практике: сначала тип выхода (приложение / пакет / пайп файлов), потом DX и форматы. В монорепо часто комбинируют — Vite для app, Rollup/tsup для пакета рядом. Один «универсальный» инструмент на всё обычно хуже явного выбора под задачу.
>
> Ловушка: ставить Gulp «вместо Webpack», потому что «так было в старом проекте», или тащить Rollup в большую SPA только из-за tree shaking. Bundler ≠ task runner; библиотечный конфиг ≠ аппликационный.

---

# 4. Самое главное запомнить

- Bundler ≠ task runner.
- Rollup / tsup — библиотеки; Vite / Webpack — приложения.
- Gulp: потоки файлов, не граф `import`.
- Выбор = задача + формат выхода + скорость feedback loop.

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

Когда: legacy-ассеты, спрайты, кастомные шаги без ES-module graph.

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

Когда: UI kit, SDK, нужен предсказуемый tree-shaken output.

## Выбор

| Задача | Инструмент |
|--------|------------|
| SPA / админка | Vite / Webpack |
| npm-библиотека | Rollup / tsup |
| Файловые пайплайны | Gulp |
| Оркестрация монорепо | Turborepo / Nx |

```text
нужен module graph? ──нет──► Gulp (или скрипты)
        │да
        ▼
библиотека с ESM/CJS? ──да──► Rollup/tsup
        │нет (приложение)
        ▼
Vite (DX) или Webpack (гибкий legacy/кастом)
```

---

# 6. Ссылки

- [Gulp](https://gulpjs.com/docs/en/getting-started/quick-start)
- [Rollup](https://rollupjs.org/introduction/)
- [Vite — Why Vite](https://vitejs.dev/guide/why.html)
- [tsup](https://github.com/egoist/tsup)
