# Assessment — подготовка к собеседованию

Конспект тем + веб-приложение для прокачки к senior assessment.

План монорепо (API + БД): [`docs/FRANKENSTEIN_PLAN.md`](docs/FRANKENSTEIN_PLAN.md).

## Архитектура стенда (remote-first)

Основной путь: **фронт на GitHub Pages** ходит в **задеплоенный API**, API — в **облачную Postgres**. Локальный Docker для БД не нужен.

| Слой | Где | Примечание |
|------|-----|------------|
| Фронт | GitHub Pages | как сейчас; `VITE_API_BASE_URL` на URL API |
| API | **Render** (Docker, free) | [`render.yaml`](render.yaml) — как в meme-app |
| БД | **Render Postgres** (free) | `DATABASE_URL` из Blueprint автоматически |

Smoke: в шапке **API** или `/#/dev/api-smoke` → `/api/health`, `/api/demo/echo`, `/api/demo/db-ping`.

### Деплой API + БД (как meme-app)

1. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** → репозиторий `Metaloziz/assessment`, ветка с [`render.yaml`](render.yaml).
2. Approve: поднимутся `assessment-db` (Postgres) и `assessment-api` (Docker). `DATABASE_URL` прокинется сам.
3. Дождаться **Live** у API. Скопировать URL вида `https://assessment-api.onrender.com`.
4. **Фронт:** GitHub → Settings → Secrets and variables → Actions → secret  
   `VITE_API_BASE_URL` = URL API → **Actions → Deploy GitHub Pages → Run workflow**.
5. Проверка: сайт → шапка **API** → `db-ping` → `ok: true`.

`CORS_ORIGINS` уже включает `https://metaloziz.github.io`. Free Postgres на Render может засыпать / иметь срок — для стенда на неделю обычно достаточно (как у meme-app).

### Разработка фронта против боевого API

```bash
cd app
cp ../.env.example .env.local   # или создайте app/.env.local
# VITE_API_BASE_URL=https://<your-api>
npm install
npm run dev
```

Без `VITE_API_BASE_URL` Vite проксирует `/api` на `localhost:3000` (нужен локальный `server`).

### Опционально: локальный API + локальная БД

Только если нужен офлайн или не хотите трогать облако:

```bash
cp .env.example .env          # DATABASE_URL на localhost
docker compose up -d          # Postgres; файл docker-compose.yml — опциональный
cd server && npm install && npm run dev
cd ../app && npm run dev      # без VITE_API_BASE_URL → proxy на :3000
```

## Приложение (`app/`)

Тёмный RemNote-like UI: список тем, чекбоксы «пройдено», теория из markdown, интерактивные лаборатории.

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

## Сервер (`server/`)

Fastify + Drizzle + Postgres. Smoke-роуты: `/api/health`, `/api/demo/echo`, `/api/demo/db-ping`.

Env: корневой `.env` / `server/.env` / переменные хостинга — см. [`.env.example`](.env.example).

## Формат заметок (`topics/`)

См. [TOPIC_FORMAT.md](TOPIC_FORMAT.md).

1. **Тема**
2. **Главное в одну фразу**
3. **Суть** (раньше: «Ответ для собеседования»; в UI — «Суть»)
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
| 45 | [45-todo-jsdoc-tsdoc.md](topics/45-todo-jsdoc-tsdoc.md) | TODO, jsDoc / tsDoc в API |
| 46 | [46-dry-kiss-yagni.md](topics/46-dry-kiss-yagni.md) | DRY, KISS, YAGNI |
| 47 | [47-formatting-vertical.md](topics/47-formatting-vertical.md) | Вертикальное форматирование |
| 48 | [48-refactoring-principles-clean.md](topics/48-refactoring-principles-clean.md) | Рефакторинг: чище, без новой функциональности |
| 49 | [49-refactoring-principles-tests.md](topics/49-refactoring-principles-tests.md) | Рефакторинг: сначала тесты |
| 50 | [50-dirty-code-properties.md](topics/50-dirty-code-properties.md) | Свойства «грязного кода» |
| 51 | [51-refactoring-methods.md](topics/51-refactoring-methods.md) | Методы рефакторинга |
| 52 | [52-apo.md](topics/52-apo.md) | APO |
| 53 | [53-bduf.md](topics/53-bduf.md) | BDUF |
| 54 | [54-refactoring-design-patterns.md](topics/54-refactoring-design-patterns.md) | Рефакторинг через паттерны |
| 55 | [55-legacy-code-approaches.md](topics/55-legacy-code-approaches.md) | Определение легаси кода |
| 56 | [56-dead-code-tools.md](topics/56-dead-code-tools.md) | ts-prune, statoscope |
| 57 | [57-cookies.md](topics/57-cookies.md) | cookies |
| 58 | [58-devtools-network-application.md](topics/58-devtools-network-application.md) | DevTools Network / Application |
| 59 | [59-breakpoints.md](topics/59-breakpoints.md) | breakpoints |
| 60 | [60-local-storage.md](topics/60-local-storage.md) | localStorage |
| 61 | [61-iframe.md](topics/61-iframe.md) | iframe |
| 62 | [62-websocket.md](topics/62-websocket.md) | WebSocket |
| 63 | [63-cookies-server-httponly.md](topics/63-cookies-server-httponly.md) | Установка cookies сервером, httpOnly |
| 64 | [64-cookie-security.md](topics/64-cookie-security.md) | Безопасность cookie |
| 65 | [65-service-workers.md](topics/65-service-workers.md) | Service workers |
| 66 | [66-web-workers.md](topics/66-web-workers.md) | Web-workers |
| 67 | [67-web-apis.md](topics/67-web-apis.md) | Web APIs |
| 68 | [68-indexeddb.md](topics/68-indexeddb.md) | IndexedDB |
| 69 | [69-worklets.md](topics/69-worklets.md) | Worklets |
| 70 | [70-pwa.md](topics/70-pwa.md) | PWA |
| 71 | [71-why-cicd.md](topics/71-why-cicd.md) | Зачем нужен CI/CD |
| 72 | [72-jenkins.md](topics/72-jenkins.md) | Jenkins |
| 73 | [73-mesos-marathon.md](topics/73-mesos-marathon.md) | Mesos/Marathon |
| 74 | [74-server-clusters.md](topics/74-server-clusters.md) | Кластер серверов и системы управления |
| 75 | [75-configure-jenkins-marathon.md](topics/75-configure-jenkins-marathon.md) | Конфиг Jenkins, Marathon и систем банка |
| 76 | [76-cicd-systems-comparison.md](topics/76-cicd-systems-comparison.md) | Системы CI/CD: плюсы и минусы |
| 77 | [77-js-execution-context.md](topics/77-js-execution-context.md) | Определение контекста выполнения, случаи применения |
| 78 | [78-js-this-default.md](topics/78-js-this-default.md) | Вычисление контекста, его значение по умолчанию |
| 79 | [79-js-context-closure.md](topics/79-js-context-closure.md) | Сохранение контекста выполнения через замыкание |
| 80 | [80-js-lose-context.md](topics/80-js-lose-context.md) | Потеря контекста |
| 81 | [81-js-declarations-functions.md](topics/81-js-declarations-functions.md) | Виды объявления переменных, Function Declaration и Function Expression |
| 82 | [82-js-hoisting.md](topics/82-js-hoisting.md) | Всплытие переменных |
| 83 | [83-js-arguments.md](topics/83-js-arguments.md) | Псевдомассив arguments |
| 84 | [84-js-prototype-class.md](topics/84-js-prototype-class.md) | Определение прототипа, класса |
| 85 | [85-js-dom-query.md](topics/85-js-dom-query.md) | Методы поиска DOM-узлов |
| 86 | [86-js-dom-add-remove.md](topics/86-js-dom-add-remove.md) | Методы добавления и удаления DOM-узлов |
| 87 | [87-js-dom-content.md](topics/87-js-dom-content.md) | Методы изменения содержимого в DOM-узлах |
| 88 | [88-js-browser-events.md](topics/88-js-browser-events.md) | Основные браузерные события |
| 89 | [89-js-closure-problems.md](topics/89-js-closure-problems.md) | Замыкание, возможные проблемы |
| 90 | [90-js-class-inheritance.md](topics/90-js-class-inheritance.md) | Наследование классов |
| 91 | [91-js-event-bubbling-capturing.md](topics/91-js-event-bubbling-capturing.md) | Всплытие и погружение событий |
| 92 | [92-js-forms-native.md](topics/92-js-forms-native.md) | Нативная обработка форм и полей |
| 93 | [93-js-lexical-environment.md](topics/93-js-lexical-environment.md) | Лексическое окружение |
| 94 | [94-js-scope-chain.md](topics/94-js-scope-chain.md) | Цепочка областей видимости |
| 95 | [95-js-bind-call-apply.md](topics/95-js-bind-call-apply.md) | Подмена существующего контекста |
| 96 | [96-js-prototype-chain.md](topics/96-js-prototype-chain.md) | Цепочка прототипов и поиск свойств |
| 97 | [97-js-arrow-prototype.md](topics/97-js-arrow-prototype.md) | Прототипы и стрелочные функции |
| 98 | [98-js-live-collections.md](topics/98-js-live-collections.md) | Живые коллекции DOM |
| 99 | [99-js-event-delegation.md](topics/99-js-event-delegation.md) | Делегирование событий |
| 100 | [100-js-event-this.md](topics/100-js-event-this.md) | Контекст this в браузерных событиях |
| 101 | [101-js-arrow-syntax.md](topics/101-js-arrow-syntax.md) | Синтаксис и особенности стрелочных функций |
| 102 | [102-js-factory-functions.md](topics/102-js-factory-functions.md) | Функции-фабрики |
| 103 | [103-js-prototypal-inheritance.md](topics/103-js-prototypal-inheritance.md) | Прототипное наследование |
| 104 | [104-js-null-prototype.md](topics/104-js-null-prototype.md) | Объекты без прототипа |
| 105 | [105-js-mutation-observer.md](topics/105-js-mutation-observer.md) | MutationObserver |
| 106 | [106-js-selection-range.md](topics/106-js-selection-range.md) | Selection и Range |
| 107 | [107-js-iife.md](topics/107-js-iife.md) | IIFE |
| 108 | [108-js-currying.md](topics/108-js-currying.md) | Каррирование |
| 109 | [109-js-private-static-fields.md](topics/109-js-private-static-fields.md) | Приватные и статические поля классов |
| 110 | [110-js-delegation-pattern.md](topics/110-js-delegation-pattern.md) | Делегирование событий |
| 111 | [111-js-v8-gc.md](topics/111-js-v8-gc.md) | Сборщик мусора V8 |
| 112 | [112-js-v8-pipeline.md](topics/112-js-v8-pipeline.md) | Процесс обработки кода в V8 |
| 113 | [113-js-class-engine.md](topics/113-js-class-engine.md) | Как движок реализует классы |
| 114 | [114-js-mixins.md](topics/114-js-mixins.md) | Примеси |
| 115 | [115-js-web-components.md](topics/115-js-web-components.md) | Web Components |
| 116 | [116-js-v8-optimizations.md](topics/116-js-v8-optimizations.md) | Оптимизации V8 |
| 117 | [117-js-proto-vs-closure-perf.md](topics/117-js-proto-vs-closure-perf.md) | Производительность: прототип против замыкания |
| 118 | [118-js-webcomponents-css.md](topics/118-js-webcomponents-css.md) | CSS в Web Components |
| 119 | [119-redux-scope.md](topics/119-redux-scope.md) | Redux, область применения |
| 120 | [120-react-redux-binding.md](topics/120-react-redux-binding.md) | Связывание React с Redux |
| 121 | [121-redux-action-dispatch.md](topics/121-redux-action-dispatch.md) | action, dispatch |
| 122 | [122-redux-store-immutability.md](topics/122-redux-store-immutability.md) | Иммутабельность store |
| 123 | [123-redux-local-vs-store.md](topics/123-redux-local-vs-store.md) | Комбинирование State и store в компоненте, по какому принципу надо разделять данные |
| 124 | [124-redux-saga-thunk.md](topics/124-redux-saga-thunk.md) | redux-saga и redux-thunk — middleware для асинхронной логики |
| 125 | [125-redux-toolkit.md](topics/125-redux-toolkit.md) | Redux Toolkit (RTK) — официальный способ писать Redux |
| 126 | [126-redux-feature-first-ducks.md](topics/126-redux-feature-first-ducks.md) | Альтернативные подходы к организации store: Feature-first и redux-ducks |
