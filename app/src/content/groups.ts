export type TopicLevel = "junior" | "middle" | "senior";

export type TopicGroupId =
  | "performance"
  | "git"
  | "testing"
  | "refactoring"
  | "browser"
  | "cicd"
  | "js"
  | "algorithms"
  | "redux"
  | "project"
  | "logging"
  | "security"
  | "patterns"
  | "layout"
  | "react"
  | "regex"
  | "async"
  | "ts"
  | "nodejs"
  | "network"
  | "software"
  | "other";

export type TopicGroup = {
  id: TopicGroupId;
  title: string;
  order: number;
};

/** Порядок как в Notion Senior */
export const TOPIC_GROUPS: TopicGroup[] = [
  { id: "performance", title: "Производительность", order: 1 },
  { id: "git", title: "Git", order: 2 },
  { id: "testing", title: "Тестирование", order: 3 },
  { id: "refactoring", title: "Рефакторинг", order: 4 },
  { id: "browser", title: "Браузер и его инструменты", order: 5 },
  { id: "cicd", title: "CI/CD", order: 6 },
  { id: "js", title: "JS", order: 7 },
  { id: "algorithms", title: "Алгоритмы и структуры данных", order: 8 },
  { id: "redux", title: "Redux", order: 9 },
  { id: "project", title: "Проект", order: 10 },
  {
    id: "logging",
    title: "Обработка исключений, логирование, дебаг",
    order: 11,
  },
  { id: "security", title: "Безопасность", order: 12 },
  { id: "patterns", title: "Паттерны", order: 13 },
  { id: "layout", title: "Вёрстка", order: 14 },
  { id: "react", title: "React", order: 15 },
  { id: "regex", title: "Регулярки", order: 16 },
  { id: "async", title: "Асинхронность", order: 17 },
  { id: "ts", title: "TS", order: 18 },
  { id: "nodejs", title: "NodeJS", order: 19 },
  { id: "network", title: "Сеть", order: 20 },
  { id: "software", title: "Разработка ПО", order: 21 },
  { id: "other", title: "Прочее", order: 99 },
];

/**
 * Цвет в Notion = уровень:
 * 🟩 junior · 🟧 middle · 🟪 senior
 */
export const LEVEL_META: Record<
  TopicLevel,
  { label: string; short: string; notion: string }
> = {
  junior: { label: "Junior", short: "J", notion: "🟩" },
  middle: { label: "Middle", short: "M", notion: "🟧" },
  senior: { label: "Senior", short: "S", notion: "🟪" },
};

/** Временно скрыты из списка (файл остаётся в topics/). */
export const HIDDEN_TOPIC_IDS = new Set<string>([]);

/** Маппинг существующих markdown-тем → группа + уровень (из Notion). */
export const TOPIC_META: Record<
  string,
  { groupId: TopicGroupId; level: TopicLevel; sortInGroup?: number }
> = {
  // Производительность (порядок как в Notion)
  "24-devtools-lighthouse": {
    groupId: "performance",
    level: "junior",
    sortInGroup: 1,
  },
  "25-preload-prefetch-async-defer": {
    groupId: "performance",
    level: "junior",
    sortInGroup: 2,
  },
  "14-client-performance-metrics": {
    groupId: "performance",
    level: "middle",
    sortInGroup: 3,
  },
  "15-bundle-cdn": { groupId: "performance", level: "middle", sortInGroup: 4 },
  "26-lazy-loading-critical-path": {
    groupId: "performance",
    level: "senior",
    sortInGroup: 5,
  },
  "27-server-performance-metrics": {
    groupId: "performance",
    level: "senior",
    sortInGroup: 6,
  },

  // Git (порядок и уровни по иконкам Notion)
  "28-git-purpose": { groupId: "git", level: "junior", sortInGroup: 1 },
  "29-git-pull-push-commit-fetch": {
    groupId: "git",
    level: "junior",
    sortInGroup: 2,
  },
  "30-git-init-config-checkout-merge": {
    groupId: "git",
    level: "junior",
    sortInGroup: 3,
  },
  "16-git-amend-fixup-revert-cherry-pick-stash": {
    groupId: "git",
    level: "middle",
    sortInGroup: 4,
  },
  "17-git-reset-tag-log-diff-reflog": {
    groupId: "git",
    level: "middle",
    sortInGroup: 5,
  },
  "18-git-flow-github-gitlab": {
    groupId: "git",
    level: "middle",
    sortInGroup: 6,
  },
  "19-git-hooks": { groupId: "git", level: "senior", sortInGroup: 7 },
  "31-git-switch": { groupId: "git", level: "senior", sortInGroup: 8 },
  "32-git-restore": { groupId: "git", level: "senior", sortInGroup: 9 },
  "33-git-grep": { groupId: "git", level: "senior", sortInGroup: 10 },
  "34-git-lfs": { groupId: "git", level: "senior", sortInGroup: 11 },
  "20-git-bisect": { groupId: "git", level: "senior", sortInGroup: 12 },
  "21-git-worktree": { groupId: "git", level: "senior", sortInGroup: 13 },

  // Тестирование (порядок как в Notion «Тестирование»)
  "22-unit-tests-purpose": {
    groupId: "testing",
    level: "junior",
    sortInGroup: 1,
  },
  "35-jest-unit-tests": { groupId: "testing", level: "junior", sortInGroup: 2 },
  "36-aaa-aas-patterns": {
    groupId: "testing",
    level: "junior",
    sortInGroup: 3,
  },
  "37-mocks": { groupId: "testing", level: "middle", sortInGroup: 4 },
  "38-tdd": { groupId: "testing", level: "middle", sortInGroup: 5 },
  "39-enzyme-rtl": { groupId: "testing", level: "middle", sortInGroup: 6 },
  "40-stubs": { groupId: "testing", level: "middle", sortInGroup: 7 },
  "41-bdd": { groupId: "testing", level: "middle", sortInGroup: 8 },
  "42-coverage": { groupId: "testing", level: "middle", sortInGroup: 9 },
  "43-e2e-cypress": { groupId: "testing", level: "middle", sortInGroup: 10 },
  "44-code-instrumentation": {
    groupId: "testing",
    level: "senior",
    sortInGroup: 11,
  },
  "23-testing-tools-principles": {
    groupId: "testing",
    level: "senior",
    sortInGroup: 12,
  },

  // Рефакторинг (порядок и уровни по цвету Notion: 🟩 junior / 🟧 middle / 🟪 senior)
  "45-todo-jsdoc-tsdoc": {
    groupId: "refactoring",
    level: "junior",
    sortInGroup: 1,
  },
  "46-dry-kiss-yagni": {
    groupId: "refactoring",
    level: "junior",
    sortInGroup: 2,
  },
  "47-formatting-vertical": {
    groupId: "refactoring",
    level: "junior",
    sortInGroup: 3,
  },
  "48-refactoring-principles-clean": {
    groupId: "refactoring",
    level: "middle",
    sortInGroup: 4,
  },
  "49-refactoring-principles-tests": {
    groupId: "refactoring",
    level: "middle",
    sortInGroup: 5,
  },
  "50-dirty-code-properties": {
    groupId: "refactoring",
    level: "middle",
    sortInGroup: 6,
  },
  "51-refactoring-methods": {
    groupId: "refactoring",
    level: "middle",
    sortInGroup: 7,
  },
  "52-apo": { groupId: "refactoring", level: "senior", sortInGroup: 8 },
  "53-bduf": { groupId: "refactoring", level: "senior", sortInGroup: 9 },
  "54-refactoring-design-patterns": {
    groupId: "refactoring",
    level: "senior",
    sortInGroup: 10,
  },
  "55-legacy-code-approaches": {
    groupId: "refactoring",
    level: "senior",
    sortInGroup: 11,
  },
  "56-dead-code-tools": {
    groupId: "refactoring",
    level: "senior",
    sortInGroup: 12,
  },

  // Браузер и его инструменты (порядок как в Notion; уровень по цвету иконки)
  "58-devtools-network-application": {
    groupId: "browser",
    level: "junior",
    sortInGroup: 1,
  },
  "59-breakpoints": { groupId: "browser", level: "junior", sortInGroup: 2 },
  "60-local-storage": { groupId: "browser", level: "junior", sortInGroup: 3 },
  "61-iframe": { groupId: "browser", level: "junior", sortInGroup: 4 },
  "62-websocket": { groupId: "browser", level: "middle", sortInGroup: 5 },
  "63-cookies-server-httponly": {
    groupId: "browser",
    level: "middle",
    sortInGroup: 6,
  },
  "64-cookie-security": { groupId: "browser", level: "middle", sortInGroup: 7 },
  "57-cookies": { groupId: "browser", level: "senior", sortInGroup: 8 },
  "65-service-workers": { groupId: "browser", level: "senior", sortInGroup: 9 },
  "66-web-workers": { groupId: "browser", level: "senior", sortInGroup: 10 },
  "67-web-apis": { groupId: "browser", level: "senior", sortInGroup: 11 },
  "68-indexeddb": { groupId: "browser", level: "senior", sortInGroup: 12 },
  "69-worklets": { groupId: "browser", level: "senior", sortInGroup: 13 },
  "70-pwa": { groupId: "browser", level: "senior", sortInGroup: 14 },

  // CI/CD (порядок как в Notion; уровень по цвету иконки)
  "71-why-cicd": { groupId: "cicd", level: "junior", sortInGroup: 1 },
  "72-jenkins": { groupId: "cicd", level: "junior", sortInGroup: 2 },
  "73-mesos-marathon": { groupId: "cicd", level: "middle", sortInGroup: 3 },
  "74-server-clusters": { groupId: "cicd", level: "middle", sortInGroup: 4 },
  "75-configure-jenkins-marathon": {
    groupId: "cicd",
    level: "senior",
    sortInGroup: 5,
  },
  "76-cicd-systems-comparison": {
    groupId: "cicd",
    level: "senior",
    sortInGroup: 6,
  },

  // JS (порядок как в Notion view JS; уровень по цвету иконки 🟩/🟧/🟪)
  "77-js-execution-context": { groupId: "js", level: "junior", sortInGroup: 1 },
  "78-js-this-default": { groupId: "js", level: "junior", sortInGroup: 2 },
  "79-js-context-closure": { groupId: "js", level: "junior", sortInGroup: 3 },
  "80-js-lose-context": { groupId: "js", level: "junior", sortInGroup: 4 },
  "81-js-declarations-functions": {
    groupId: "js",
    level: "junior",
    sortInGroup: 5,
  },
  "82-js-hoisting": { groupId: "js", level: "junior", sortInGroup: 6 },
  "83-js-arguments": { groupId: "js", level: "junior", sortInGroup: 7 },
  "84-js-prototype-class": { groupId: "js", level: "junior", sortInGroup: 8 },
  "85-js-dom-query": { groupId: "js", level: "junior", sortInGroup: 9 },
  "86-js-dom-add-remove": { groupId: "js", level: "junior", sortInGroup: 10 },
  "87-js-dom-content": { groupId: "js", level: "junior", sortInGroup: 11 },
  "88-js-browser-events": { groupId: "js", level: "junior", sortInGroup: 12 },
  "89-js-closure-problems": { groupId: "js", level: "junior", sortInGroup: 13 },
  "90-js-class-inheritance": {
    groupId: "js",
    level: "junior",
    sortInGroup: 14,
  },
  "91-js-event-bubbling-capturing": {
    groupId: "js",
    level: "junior",
    sortInGroup: 15,
  },
  "92-js-forms-native": { groupId: "js", level: "junior", sortInGroup: 16 },
  "93-js-lexical-environment": {
    groupId: "js",
    level: "middle",
    sortInGroup: 17,
  },
  "94-js-scope-chain": { groupId: "js", level: "middle", sortInGroup: 18 },
  "95-js-bind-call-apply": { groupId: "js", level: "middle", sortInGroup: 19 },
  "96-js-prototype-chain": { groupId: "js", level: "middle", sortInGroup: 20 },
  "97-js-arrow-prototype": { groupId: "js", level: "middle", sortInGroup: 21 },
  "98-js-live-collections": { groupId: "js", level: "middle", sortInGroup: 22 },
  "99-js-event-delegation": { groupId: "js", level: "middle", sortInGroup: 23 },
  "100-js-event-this": { groupId: "js", level: "middle", sortInGroup: 24 },
  "101-js-arrow-syntax": { groupId: "js", level: "middle", sortInGroup: 25 },
  "102-js-factory-functions": {
    groupId: "js",
    level: "middle",
    sortInGroup: 26,
  },
  "103-js-prototypal-inheritance": {
    groupId: "js",
    level: "middle",
    sortInGroup: 27,
  },
  "104-js-null-prototype": { groupId: "js", level: "middle", sortInGroup: 28 },
  "105-js-mutation-observer": {
    groupId: "js",
    level: "middle",
    sortInGroup: 29,
  },
  "106-js-selection-range": { groupId: "js", level: "middle", sortInGroup: 30 },
  "107-js-iife": { groupId: "js", level: "senior", sortInGroup: 31 },
  "108-js-currying": { groupId: "js", level: "senior", sortInGroup: 32 },
  "109-js-private-static-fields": {
    groupId: "js",
    level: "senior",
    sortInGroup: 33,
  },
  "110-js-delegation-pattern": {
    groupId: "js",
    level: "senior",
    sortInGroup: 34,
  },
  "111-js-v8-gc": { groupId: "js", level: "senior", sortInGroup: 35 },
  "112-js-v8-pipeline": { groupId: "js", level: "senior", sortInGroup: 36 },
  "113-js-class-engine": { groupId: "js", level: "senior", sortInGroup: 37 },
  "114-js-mixins": { groupId: "js", level: "senior", sortInGroup: 38 },
  "115-js-web-components": { groupId: "js", level: "senior", sortInGroup: 39 },
  "116-js-v8-optimizations": {
    groupId: "js",
    level: "senior",
    sortInGroup: 40,
  },
  "117-js-proto-vs-closure-perf": {
    groupId: "js",
    level: "senior",
    sortInGroup: 41,
  },
  "118-js-webcomponents-css": {
    groupId: "js",
    level: "senior",
    sortInGroup: 42,
  },

  // Алгоритмы и структуры данных (после JS)
  "127-algorithms-what-is": {
    groupId: "algorithms",
    level: "junior",
    sortInGroup: 1,
  },
  "128-algorithms-common-mistakes": {
    groupId: "algorithms",
    level: "junior",
    sortInGroup: 2,
  },
  "129-algorithms-big-o": {
    groupId: "algorithms",
    level: "middle",
    sortInGroup: 3,
  },
  "130-algorithms-sorting": {
    groupId: "algorithms",
    level: "middle",
    sortInGroup: 4,
  },
  "131-algorithms-dp": {
    groupId: "algorithms",
    level: "middle",
    sortInGroup: 5,
  },
  "132-algorithms-patterns": {
    groupId: "algorithms",
    level: "middle",
    sortInGroup: 6,
  },
  "133-algorithms-stack-hashmap": {
    groupId: "algorithms",
    level: "senior",
    sortInGroup: 7,
  },
  "134-algorithms-graphs-list": {
    groupId: "algorithms",
    level: "senior",
    sortInGroup: 8,
  },
  "135-algorithms-complexity-notations": {
    groupId: "algorithms",
    level: "senior",
    sortInGroup: 9,
  },

  // Redux (порядок как в Notion view Redux; уровень по цвету иконки 🟩/🟧/🟪)
  "119-redux-scope": { groupId: "redux", level: "junior", sortInGroup: 1 },
  "120-react-redux-binding": {
    groupId: "redux",
    level: "junior",
    sortInGroup: 2,
  },
  "121-redux-action-dispatch": {
    groupId: "redux",
    level: "junior",
    sortInGroup: 3,
  },
  "122-redux-store-immutability": {
    groupId: "redux",
    level: "junior",
    sortInGroup: 4,
  },
  "123-redux-local-vs-store": {
    groupId: "redux",
    level: "junior",
    sortInGroup: 5,
  },
  "124-redux-saga-thunk": { groupId: "redux", level: "middle", sortInGroup: 6 },
  "125-redux-toolkit": { groupId: "redux", level: "middle", sortInGroup: 7 },
  "126-redux-feature-first-ducks": {
    groupId: "redux",
    level: "middle",
    sortInGroup: 8,
  },
  "01-immutability-js": { groupId: "redux", level: "senior", sortInGroup: 9 },
  "02-normalize-immutable-libs": {
    groupId: "redux",
    level: "senior",
    sortInGroup: 10,
  },

  // Проект / сборка (после Redux)
  "136-project-webpack-what": {
    groupId: "project",
    level: "junior",
    sortInGroup: 1,
  },
  "137-project-webpack-config-pkgs": {
    groupId: "project",
    level: "junior",
    sortInGroup: 2,
  },
  "138-project-loaders-plugins-semver": {
    groupId: "project",
    level: "middle",
    sortInGroup: 3,
  },
  "139-project-scripts-hmr-treeshake": {
    groupId: "project",
    level: "middle",
    sortInGroup: 4,
  },
  "140-project-prod-dev-plugins": {
    groupId: "project",
    level: "middle",
    sortInGroup: 5,
  },
  "03-build-hot-cold": {
    groupId: "project",
    level: "senior",
    sortInGroup: 6,
  },
  "04-bundlers-gulp-rollup": {
    groupId: "project",
    level: "senior",
    sortInGroup: 7,
  },
  "05-module-federation-babel-postcss": {
    groupId: "project",
    level: "senior",
    sortInGroup: 8,
  },

  // Обработка исключений, логирование, дебаг
  "141-logging-try-catch": {
    groupId: "logging",
    level: "junior",
    sortInGroup: 1,
  },
  "142-logging-console-methods": {
    groupId: "logging",
    level: "junior",
    sortInGroup: 2,
  },
  "143-logging-browser-debug": {
    groupId: "logging",
    level: "junior",
    sortInGroup: 3,
  },
  "144-logging-redux-devtools": {
    groupId: "logging",
    level: "middle",
    sortInGroup: 4,
  },
  "145-logging-chrome-application-sources": {
    groupId: "logging",
    level: "middle",
    sortInGroup: 5,
  },
  "146-logging-sentry-prometheus": {
    groupId: "logging",
    level: "senior",
    sortInGroup: 6,
  },
  "147-logging-server-debug-browser": {
    groupId: "logging",
    level: "senior",
    sortInGroup: 7,
  },
  "06-logging-nodes": { groupId: "logging", level: "senior", sortInGroup: 8 },

  // Безопасность
  "148-eval-dangerously-set-inner-html": {
    groupId: "security",
    level: "junior",
    sortInGroup: 1,
  },
  "149-rel-noopener-noreferrer-nofollow": {
    groupId: "security",
    level: "junior",
    sortInGroup: 2,
  },
  "150-authn-authz": {
    groupId: "security",
    level: "junior",
    sortInGroup: 3,
  },
  "07-cors": { groupId: "security", level: "middle", sortInGroup: 4 },
  "08-npm-audit": { groupId: "security", level: "middle", sortInGroup: 5 },
  "09-jwt-security": { groupId: "security", level: "middle", sortInGroup: 6 },
  "10-csp": { groupId: "security", level: "middle", sortInGroup: 7 },
  "11-xss": { groupId: "security", level: "middle", sortInGroup: 8 },
  "12-sql-injection": { groupId: "security", level: "middle", sortInGroup: 9 },
  "13-csrf": { groupId: "security", level: "middle", sortInGroup: 10 },
  "151-x-frame-options": {
    groupId: "security",
    level: "middle",
    sortInGroup: 11,
  },
  "152-owasp-top-10": {
    groupId: "security",
    level: "senior",
    sortInGroup: 12,
  },
  "153-ssl-tls": {
    groupId: "security",
    level: "senior",
    sortInGroup: 13,
  },
  "154-websocket-security": {
    groupId: "security",
    level: "senior",
    sortInGroup: 14,
  },
  "155-tcp-hijacking": {
    groupId: "security",
    level: "senior",
    sortInGroup: 15,
  },

  // Тестирование (дополнение)
  "156-testing-extra-tools": {
    groupId: "testing",
    level: "senior",
    sortInGroup: 13,
  },

  // Паттерны
  "157-patterns-what": {
    groupId: "patterns",
    level: "junior",
    sortInGroup: 1,
  },
  "158-patterns-command-facade-observer": {
    groupId: "patterns",
    level: "junior",
    sortInGroup: 2,
  },
  "159-patterns-factory-prototype-proxy-singleton-adapter": {
    groupId: "patterns",
    level: "middle",
    sortInGroup: 3,
  },
  "160-patterns-chain-abstract-factory-strategy-decorator": {
    groupId: "patterns",
    level: "middle",
    sortInGroup: 4,
  },
  "161-patterns-mediator-composite-memento": {
    groupId: "patterns",
    level: "senior",
    sortInGroup: 5,
  },
  "162-patterns-dependency-injection": {
    groupId: "patterns",
    level: "senior",
    sortInGroup: 6,
  },
  "163-patterns-template-flyweight-bridge": {
    groupId: "patterns",
    level: "senior",
    sortInGroup: 7,
  },

  // Вёрстка
  "164-layout-vector-raster": {
    groupId: "layout",
    level: "junior",
    sortInGroup: 1,
  },
  "165-layout-typography": {
    groupId: "layout",
    level: "junior",
    sortInGroup: 2,
  },
  "166-layout-bem": {
    groupId: "layout",
    level: "junior",
    sortInGroup: 3,
  },
  "167-layout-pseudo-classes": {
    groupId: "layout",
    level: "junior",
    sortInGroup: 4,
  },
  "168-layout-scss-postcss": {
    groupId: "layout",
    level: "middle",
    sortInGroup: 5,
  },
  "169-layout-flexbox": {
    groupId: "layout",
    level: "middle",
    sortInGroup: 6,
  },
  "170-layout-animation": {
    groupId: "layout",
    level: "middle",
    sortInGroup: 7,
  },
  "171-layout-stacking-context": {
    groupId: "layout",
    level: "middle",
    sortInGroup: 8,
  },
  "172-layout-css-modules-css-in-js": {
    groupId: "layout",
    level: "middle",
    sortInGroup: 9,
  },
  "173-layout-grid": {
    groupId: "layout",
    level: "middle",
    sortInGroup: 10,
  },
  "174-layout-browserslist": {
    groupId: "layout",
    level: "senior",
    sortInGroup: 11,
  },
  "175-layout-tools-by-browsers": {
    groupId: "layout",
    level: "senior",
    sortInGroup: 12,
  },
  "176-layout-design-system": {
    groupId: "layout",
    level: "senior",
    sortInGroup: 13,
  },
  "177-layout-a11y": {
    groupId: "layout",
    level: "senior",
    sortInGroup: 14,
  },
  "178-layout-microdata": {
    groupId: "layout",
    level: "senior",
    sortInGroup: 15,
  },

  // React
  "179-react-purpose": {
    groupId: "react",
    level: "junior",
    sortInGroup: 1,
  },
  "180-react-props-state": {
    groupId: "react",
    level: "junior",
    sortInGroup: 2,
  },
  "181-react-jsx": {
    groupId: "react",
    level: "junior",
    sortInGroup: 3,
  },
  "182-react-hooks": {
    groupId: "react",
    level: "junior",
    sortInGroup: 4,
  },
  "183-react-lifecycle": {
    groupId: "react",
    level: "junior",
    sortInGroup: 5,
  },
  "184-react-hoc": {
    groupId: "react",
    level: "junior",
    sortInGroup: 6,
  },
  "185-react-virtual-dom": {
    groupId: "react",
    level: "middle",
    sortInGroup: 7,
  },
  "186-react-optimization": {
    groupId: "react",
    level: "middle",
    sortInGroup: 8,
  },
  "187-react-fragments": {
    groupId: "react",
    level: "middle",
    sortInGroup: 9,
  },
  "188-react-error-boundaries": {
    groupId: "react",
    level: "middle",
    sortInGroup: 10,
  },
  "189-react-portals": {
    groupId: "react",
    level: "middle",
    sortInGroup: 11,
  },
  "190-react-router": {
    groupId: "react",
    level: "middle",
    sortInGroup: 12,
  },
  "191-react-context": {
    groupId: "react",
    level: "middle",
    sortInGroup: 13,
  },
  "192-react-ssr": {
    groupId: "react",
    level: "middle",
    sortInGroup: 14,
  },
  "193-react-compound-components": {
    groupId: "react",
    level: "middle",
    sortInGroup: 15,
  },
  "194-react-form-managers": {
    groupId: "react",
    level: "middle",
    sortInGroup: 16,
  },
  "195-react-render-props": {
    groupId: "react",
    level: "senior",
    sortInGroup: 17,
  },
  "196-react-reconciliation": {
    groupId: "react",
    level: "senior",
    sortInGroup: 18,
  },
  "197-react-fiber": {
    groupId: "react",
    level: "senior",
    sortInGroup: 19,
  },
  "198-react-web-components": {
    groupId: "react",
    level: "senior",
    sortInGroup: 20,
  },
  "199-react-server-components": {
    groupId: "react",
    level: "senior",
    sortInGroup: 21,
  },

  // Регулярки
  "200-regex-purpose": {
    groupId: "regex",
    level: "junior",
    sortInGroup: 1,
  },
  "201-regex-literal": {
    groupId: "regex",
    level: "junior",
    sortInGroup: 2,
  },
  "202-regex-special-chars": {
    groupId: "regex",
    level: "junior",
    sortInGroup: 3,
  },
  "203-regex-string-methods": {
    groupId: "regex",
    level: "junior",
    sortInGroup: 4,
  },
  "204-regex-regexp-object": {
    groupId: "regex",
    level: "middle",
    sortInGroup: 5,
  },
  "205-regex-groups": {
    groupId: "regex",
    level: "middle",
    sortInGroup: 6,
  },
  "206-regex-sets-ranges": {
    groupId: "regex",
    level: "middle",
    sortInGroup: 7,
  },
  "207-regex-quantifiers": {
    groupId: "regex",
    level: "middle",
    sortInGroup: 8,
  },
  "208-regex-word-boundaries": {
    groupId: "regex",
    level: "middle",
    sortInGroup: 9,
  },
  "209-regex-backreferences": {
    groupId: "regex",
    level: "middle",
    sortInGroup: 10,
  },
  "210-regex-performance": {
    groupId: "regex",
    level: "senior",
    sortInGroup: 11,
  },
  "211-regex-lookahead-lookbehind": {
    groupId: "regex",
    level: "senior",
    sortInGroup: 12,
  },
  "212-regex-search-at-position": {
    groupId: "regex",
    level: "senior",
    sortInGroup: 13,
  },

  // Асинхронность
  "213-async-js-single-thread": {
    groupId: "async",
    level: "junior",
    sortInGroup: 1,
  },
  "214-async-xhr-fetch": {
    groupId: "async",
    level: "junior",
    sortInGroup: 2,
  },
  "215-async-event-loop": {
    groupId: "async",
    level: "middle",
    sortInGroup: 3,
  },
  "216-async-tasks-microtasks": {
    groupId: "async",
    level: "middle",
    sortInGroup: 4,
  },
  "217-async-callback-promises": {
    groupId: "async",
    level: "middle",
    sortInGroup: 5,
  },
  "218-async-callback-hell": {
    groupId: "async",
    level: "middle",
    sortInGroup: 6,
  },
  "219-async-await": {
    groupId: "async",
    level: "middle",
    sortInGroup: 7,
  },
  "220-async-promise-after-catch": {
    groupId: "async",
    level: "senior",
    sortInGroup: 8,
  },
  "221-async-generators": {
    groupId: "async",
    level: "senior",
    sortInGroup: 9,
  },
  "222-async-infinite-generators": {
    groupId: "async",
    level: "senior",
    sortInGroup: 10,
  },

  // TS
  "223-ts-purpose": {
    groupId: "ts",
    level: "junior",
    sortInGroup: 1,
  },
  "224-ts-fewer-bugs": {
    groupId: "ts",
    level: "junior",
    sortInGroup: 2,
  },
  "225-ts-basic-types": {
    groupId: "ts",
    level: "junior",
    sortInGroup: 3,
  },
  "226-ts-interface-types": {
    groupId: "ts",
    level: "middle",
    sortInGroup: 4,
  },
  "227-ts-declaration-files": {
    groupId: "ts",
    level: "middle",
    sortInGroup: 5,
  },
  "228-ts-type-guards": {
    groupId: "ts",
    level: "middle",
    sortInGroup: 6,
  },
  "229-ts-type-transforms": {
    groupId: "ts",
    level: "middle",
    sortInGroup: 7,
  },
  "230-ts-generics": {
    groupId: "ts",
    level: "middle",
    sortInGroup: 8,
  },
  "231-ts-keyof-typeof": {
    groupId: "ts",
    level: "middle",
    sortInGroup: 9,
  },
  "232-ts-optional-nullish": {
    groupId: "ts",
    level: "middle",
    sortInGroup: 10,
  },
  "233-ts-conditional-mapped-infer": {
    groupId: "ts",
    level: "middle",
    sortInGroup: 11,
  },
  "234-ts-template-literal-types": {
    groupId: "ts",
    level: "senior",
    sortInGroup: 12,
  },
  "235-ts-function-overloads": {
    groupId: "ts",
    level: "senior",
    sortInGroup: 13,
  },
  "236-ts-reference-types": {
    groupId: "ts",
    level: "senior",
    sortInGroup: 14,
  },
  "237-ts-tsc": {
    groupId: "ts",
    level: "senior",
    sortInGroup: 15,
  },
  "238-ts-decorators": {
    groupId: "ts",
    level: "senior",
    sortInGroup: 16,
  },
  "239-ts-mixins": {
    groupId: "ts",
    level: "senior",
    sortInGroup: 17,
  },

  // NodeJS
  "240-nodejs-purpose": {
    groupId: "nodejs",
    level: "junior",
    sortInGroup: 1,
  },
  "241-nodejs-frontend-pros-cons": {
    groupId: "nodejs",
    level: "junior",
    sortInGroup: 2,
  },
  "242-nodejs-modules-globals": {
    groupId: "nodejs",
    level: "middle",
    sortInGroup: 3,
  },
  "243-nodejs-routing-static": {
    groupId: "nodejs",
    level: "middle",
    sortInGroup: 4,
  },
  "244-nodejs-db-async-config": {
    groupId: "nodejs",
    level: "middle",
    sortInGroup: 5,
  },
  "245-nodejs-cache-crud": {
    groupId: "nodejs",
    level: "senior",
    sortInGroup: 6,
  },
  "246-nodejs-worker-threads": {
    groupId: "nodejs",
    level: "senior",
    sortInGroup: 7,
  },

  // Сеть
  "247-network-ip-hostname": {
    groupId: "network",
    level: "junior",
    sortInGroup: 1,
  },
  "248-network-query-params": {
    groupId: "network",
    level: "junior",
    sortInGroup: 2,
  },
  "249-network-rest": {
    groupId: "network",
    level: "junior",
    sortInGroup: 3,
  },
  "250-network-http-https": {
    groupId: "network",
    level: "middle",
    sortInGroup: 4,
  },
  "251-network-api-first": {
    groupId: "network",
    level: "middle",
    sortInGroup: 5,
  },
  "252-network-long-polling-ws-sse": {
    groupId: "network",
    level: "middle",
    sortInGroup: 6,
  },
  "261-network-ip-basics": {
    groupId: "network",
    level: "senior",
    sortInGroup: 7,
  },
  "263-network-dns-basics": {
    groupId: "network",
    level: "senior",
    sortInGroup: 8,
  },
  "253-network-tcpip-internet-app": {
    groupId: "network",
    level: "senior",
    sortInGroup: 9,
  },
  "254-network-tcpip-transport-link": {
    groupId: "network",
    level: "senior",
    sortInGroup: 10,
  },
  "262-network-tcp": {
    groupId: "network",
    level: "senior",
    sortInGroup: 11,
  },

  // Разработка ПО
  "255-software-fp-vs-oop": {
    groupId: "software",
    level: "junior",
    sortInGroup: 1,
  },
  "256-software-solid": {
    groupId: "software",
    level: "middle",
    sortInGroup: 2,
  },
  "257-software-mvc-mvp-mvvm": {
    groupId: "software",
    level: "middle",
    sortInGroup: 3,
  },
  "258-software-waterfall-vmodel": {
    groupId: "software",
    level: "senior",
    sortInGroup: 4,
  },
  "259-software-incremental-iterative-spiral": {
    groupId: "software",
    level: "senior",
    sortInGroup: 5,
  },
  "260-software-paradigms": {
    groupId: "software",
    level: "senior",
    sortInGroup: 6,
  },
};

export function resolveTopicMeta(topicId: string): {
  groupId: TopicGroupId;
  level: TopicLevel;
  sortInGroup: number;
} {
  const meta = TOPIC_META[topicId];
  if (meta) {
    return {
      groupId: meta.groupId,
      level: meta.level,
      sortInGroup: meta.sortInGroup ?? 50,
    };
  }
  return { groupId: "other", level: "middle", sortInGroup: 50 };
}
