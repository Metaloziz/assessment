# Assessment — подготовка к собеседованию

Конспект тем + веб-приложение для прокачки к senior assessment.

## Приложение (`app/`)

Тёмный RemNote-like UI: список тем, чекбоксы «пройдено», теория из markdown, GSAP-лаборатория для иммутабельности.

Визуальная тема (Cursor IDE): [app/THEME.md](app/THEME.md)

```bash
cd app
npm install
npm run dev
```

Сборка:

```bash
cd app
npm run build
npm run preview
```

### GitHub Pages

- `base`: `/assessment/`
- Роутинг: HashRouter (`/#/topics/...`)
- Workflow: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)

В Settings → Pages выберите **GitHub Actions**. После пуша сайт будет на:
`https://metaloziz.github.io/assessment/`

Прогресс чекбоксов хранится в `localStorage` (`assessment-progress`).

## Формат заметок (`topics/`)

1. **Тема**
2. **Главное в одну фразу**
3. **Ответ для собеседования**
4. **Самое главное запомнить**
5. **Описание**
6. **Ссылки**

## Темы

| # | Файл | Тема |
|---|------|------|
| 01 | [01-immutability-js.md](topics/01-immutability-js.md) | Преимущества и минусы иммутабельности в JS |
| 02 | [02-normalize-immutable-libs.md](topics/02-normalize-immutable-libs.md) | Normalizr, Immer, Immutable.js |
| 03 | [03-build-hot-cold.md](topics/03-build-hot-cold.md) | Ускорение горячей/холодной сборки |
| 04 | [04-bundlers-gulp-rollup.md](topics/04-bundlers-gulp-rollup.md) | Gulp, Rollup, выбор сборщика |
| 05 | [05-module-federation-babel-postcss.md](topics/05-module-federation-babel-postcss.md) | Module Federation, плагины Babel/PostCSS |
| 06 | [06-logging-nodes.md](topics/06-logging-nodes.md) | Узлы, которые нужно логировать |
| 07 | [07-cors.md](topics/07-cors.md) | CORS |
| 08 | [08-npm-audit.md](topics/08-npm-audit.md) | npm audit |
| 09 | [09-jwt-security.md](topics/09-jwt-security.md) | Безопасность JWT |
| 10 | [10-csp.md](topics/10-csp.md) | CSP |
| 11 | [11-xss.md](topics/11-xss.md) | XSS |
| 12 | [12-sql-injection.md](topics/12-sql-injection.md) | SQL Injection |
| 13 | [13-csrf.md](topics/13-csrf.md) | CSRF |
| 14 | [14-client-performance-metrics.md](topics/14-client-performance-metrics.md) | Метрики клиентской производительности |
| 15 | [15-bundle-cdn.md](topics/15-bundle-cdn.md) | Уменьшение бандла и CDN |
| 16 | [16-git-amend-fixup-revert-cherry-pick-stash.md](topics/16-git-amend-fixup-revert-cherry-pick-stash.md) | amend, fixup, revert, cherry-pick, stash |
| 17 | [17-git-reset-tag-log-diff-reflog.md](topics/17-git-reset-tag-log-diff-reflog.md) | reset, tag, log, diff, reflog |
| 18 | [18-git-flow-github-gitlab.md](topics/18-git-flow-github-gitlab.md) | Git Flow, GitHub Flow, GitLab Flow |
| 19 | [19-git-hooks.md](topics/19-git-hooks.md) | Git hooks |
| 20 | [20-git-bisect.md](topics/20-git-bisect.md) | git bisect |
| 21 | [21-git-worktree.md](topics/21-git-worktree.md) | git worktree |
| 22 | [22-unit-tests-purpose.md](topics/22-unit-tests-purpose.md) | Назначение unit-тестов |
| 23 | [23-testing-tools-principles.md](topics/23-testing-tools-principles.md) | Принципы работы инструмента тестирования |
| 24 | [24-devtools-lighthouse.md](topics/24-devtools-lighthouse.md) | DevTools / Lighthouse |
| 25 | [25-preload-prefetch-async-defer.md](topics/25-preload-prefetch-async-defer.md) | Preload, prefetch, async, defer |
| 26 | [26-lazy-loading-critical-path.md](topics/26-lazy-loading-critical-path.md) | Lazy-loading и critical path |
| 27 | [27-server-performance-metrics.md](topics/27-server-performance-metrics.md) | Метрики серверной производительности |
| 28 | [28-git-purpose.md](topics/28-git-purpose.md) | Назначение системы Git |
| 29 | [29-git-pull-push-commit-fetch.md](topics/29-git-pull-push-commit-fetch.md) | pull, push, commit, fetch |
| 30 | [30-git-init-config-checkout-merge.md](topics/30-git-init-config-checkout-merge.md) | init, config, checkout, merge |
| 31 | [31-git-switch.md](topics/31-git-switch.md) | git switch |
| 32 | [32-git-restore.md](topics/32-git-restore.md) | git restore |
| 33 | [33-git-grep.md](topics/33-git-grep.md) | git grep |
| 34 | [34-git-lfs.md](topics/34-git-lfs.md) | Git LFS |
| 35 | [35-jest-unit-tests.md](topics/35-jest-unit-tests.md) | unit-тесты — Jest |
| 36 | [36-aaa-aas-patterns.md](topics/36-aaa-aas-patterns.md) | Паттерны AAA, AAS |
| 37 | [37-mocks.md](topics/37-mocks.md) | Моки |
| 38 | [38-tdd.md](topics/38-tdd.md) | Принцип TDD |
| 39 | [39-enzyme-rtl.md](topics/39-enzyme-rtl.md) | Enzyme / React Testing Library |
| 40 | [40-stubs.md](topics/40-stubs.md) | Стабы |
| 41 | [41-bdd.md](topics/41-bdd.md) | Принцип BDD |
| 42 | [42-coverage.md](topics/42-coverage.md) | Coverage |
| 43 | [43-e2e-cypress.md](topics/43-e2e-cypress.md) | E2E / Cypress |
| 44 | [44-code-instrumentation.md](topics/44-code-instrumentation.md) | Инструментализация кода |
