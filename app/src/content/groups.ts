export type TopicLevel = 'junior' | 'middle' | 'senior'

export type TopicGroupId =
  | 'performance'
  | 'git'
  | 'testing'
  | 'refactoring'
  | 'browser'
  | 'cicd'
  | 'js'
  | 'algorithms'
  | 'redux'
  | 'project'
  | 'logging'
  | 'security'
  | 'other'

export type TopicGroup = {
  id: TopicGroupId
  title: string
  order: number
}

/** Порядок как в Notion Senior */
export const TOPIC_GROUPS: TopicGroup[] = [
  { id: 'performance', title: 'Производительность', order: 1 },
  { id: 'git', title: 'Git', order: 2 },
  { id: 'testing', title: 'Тестирование', order: 3 },
  { id: 'refactoring', title: 'Рефакторинг', order: 4 },
  { id: 'browser', title: 'Браузер и его инструменты', order: 5 },
  { id: 'cicd', title: 'CI/CD', order: 6 },
  { id: 'js', title: 'JS', order: 7 },
  { id: 'algorithms', title: 'Алгоритмы и структуры данных', order: 8 },
  { id: 'redux', title: 'Redux', order: 9 },
  { id: 'project', title: 'Проект', order: 10 },
  { id: 'logging', title: 'Обработка исключений, логирование, дебагинг', order: 11 },
  { id: 'security', title: 'Безопасность', order: 12 },
  { id: 'other', title: 'Прочее', order: 99 },
]

/**
 * Цвет в Notion = уровень:
 * 🟩 junior · 🟧 middle · 🟪 senior
 */
export const LEVEL_META: Record<
  TopicLevel,
  { label: string; short: string; notion: string }
> = {
  junior: { label: 'Junior', short: 'J', notion: '🟩' },
  middle: { label: 'Middle', short: 'M', notion: '🟧' },
  senior: { label: 'Senior', short: 'S', notion: '🟪' },
}

/** Временно скрыты из списка (файл остаётся в topics/). */
export const HIDDEN_TOPIC_IDS = new Set<string>(['03-build-hot-cold'])

/** Маппинг существующих markdown-тем → группа + уровень (из Notion). */
export const TOPIC_META: Record<
  string,
  { groupId: TopicGroupId; level: TopicLevel; sortInGroup?: number }
> = {
  // Производительность (порядок как в Notion)
  '24-devtools-lighthouse': { groupId: 'performance', level: 'junior', sortInGroup: 1 },
  '25-preload-prefetch-async-defer': { groupId: 'performance', level: 'junior', sortInGroup: 2 },
  '14-client-performance-metrics': { groupId: 'performance', level: 'middle', sortInGroup: 3 },
  '15-bundle-cdn': { groupId: 'performance', level: 'middle', sortInGroup: 4 },
  '26-lazy-loading-critical-path': { groupId: 'performance', level: 'senior', sortInGroup: 5 },
  '27-server-performance-metrics': { groupId: 'performance', level: 'senior', sortInGroup: 6 },

  // Git (порядок и уровни по иконкам Notion)
  '28-git-purpose': { groupId: 'git', level: 'junior', sortInGroup: 1 },
  '29-git-pull-push-commit-fetch': { groupId: 'git', level: 'junior', sortInGroup: 2 },
  '30-git-init-config-checkout-merge': { groupId: 'git', level: 'junior', sortInGroup: 3 },
  '16-git-amend-fixup-revert-cherry-pick-stash': {
    groupId: 'git',
    level: 'middle',
    sortInGroup: 4,
  },
  '17-git-reset-tag-log-diff-reflog': { groupId: 'git', level: 'middle', sortInGroup: 5 },
  '18-git-flow-github-gitlab': { groupId: 'git', level: 'middle', sortInGroup: 6 },
  '19-git-hooks': { groupId: 'git', level: 'senior', sortInGroup: 7 },
  '31-git-switch': { groupId: 'git', level: 'senior', sortInGroup: 8 },
  '32-git-restore': { groupId: 'git', level: 'senior', sortInGroup: 9 },
  '33-git-grep': { groupId: 'git', level: 'senior', sortInGroup: 10 },
  '34-git-lfs': { groupId: 'git', level: 'senior', sortInGroup: 11 },
  '20-git-bisect': { groupId: 'git', level: 'senior', sortInGroup: 12 },
  '21-git-worktree': { groupId: 'git', level: 'senior', sortInGroup: 13 },

  // Тестирование (порядок как в Notion «Тестирование»)
  '22-unit-tests-purpose': { groupId: 'testing', level: 'junior', sortInGroup: 1 },
  '35-jest-unit-tests': { groupId: 'testing', level: 'junior', sortInGroup: 2 },
  '36-aaa-aas-patterns': { groupId: 'testing', level: 'junior', sortInGroup: 3 },
  '37-mocks': { groupId: 'testing', level: 'middle', sortInGroup: 4 },
  '38-tdd': { groupId: 'testing', level: 'middle', sortInGroup: 5 },
  '39-enzyme-rtl': { groupId: 'testing', level: 'middle', sortInGroup: 6 },
  '40-stubs': { groupId: 'testing', level: 'middle', sortInGroup: 7 },
  '41-bdd': { groupId: 'testing', level: 'middle', sortInGroup: 8 },
  '42-coverage': { groupId: 'testing', level: 'middle', sortInGroup: 9 },
  '43-e2e-cypress': { groupId: 'testing', level: 'middle', sortInGroup: 10 },
  '44-code-instrumentation': { groupId: 'testing', level: 'senior', sortInGroup: 11 },
  '23-testing-tools-principles': { groupId: 'testing', level: 'senior', sortInGroup: 12 },

  // Рефакторинг (порядок и уровни по цвету Notion: 🟩 junior / 🟧 middle / 🟪 senior)
  '45-todo-jsdoc-tsdoc': { groupId: 'refactoring', level: 'junior', sortInGroup: 1 },
  '46-dry-kiss-yagni': { groupId: 'refactoring', level: 'junior', sortInGroup: 2 },
  '47-formatting-vertical': { groupId: 'refactoring', level: 'junior', sortInGroup: 3 },
  '48-refactoring-principles-clean': { groupId: 'refactoring', level: 'middle', sortInGroup: 4 },
  '49-refactoring-principles-tests': { groupId: 'refactoring', level: 'middle', sortInGroup: 5 },
  '50-dirty-code-properties': { groupId: 'refactoring', level: 'middle', sortInGroup: 6 },
  '51-refactoring-methods': { groupId: 'refactoring', level: 'middle', sortInGroup: 7 },
  '52-apo': { groupId: 'refactoring', level: 'senior', sortInGroup: 8 },
  '53-bduf': { groupId: 'refactoring', level: 'senior', sortInGroup: 9 },
  '54-refactoring-design-patterns': { groupId: 'refactoring', level: 'senior', sortInGroup: 10 },
  '55-legacy-code-approaches': { groupId: 'refactoring', level: 'senior', sortInGroup: 11 },
  '56-dead-code-tools': { groupId: 'refactoring', level: 'senior', sortInGroup: 12 },

  // Браузер и его инструменты (порядок как в Notion; уровень по цвету иконки)
  '58-devtools-network-application': { groupId: 'browser', level: 'junior', sortInGroup: 1 },
  '59-breakpoints': { groupId: 'browser', level: 'junior', sortInGroup: 2 },
  '60-local-storage': { groupId: 'browser', level: 'junior', sortInGroup: 3 },
  '61-iframe': { groupId: 'browser', level: 'junior', sortInGroup: 4 },
  '62-websocket': { groupId: 'browser', level: 'middle', sortInGroup: 5 },
  '63-cookies-server-httponly': { groupId: 'browser', level: 'middle', sortInGroup: 6 },
  '64-cookie-security': { groupId: 'browser', level: 'middle', sortInGroup: 7 },
  '57-cookies': { groupId: 'browser', level: 'senior', sortInGroup: 8 },
  '65-service-workers': { groupId: 'browser', level: 'senior', sortInGroup: 9 },
  '66-web-workers': { groupId: 'browser', level: 'senior', sortInGroup: 10 },
  '67-web-apis': { groupId: 'browser', level: 'senior', sortInGroup: 11 },
  '68-indexeddb': { groupId: 'browser', level: 'senior', sortInGroup: 12 },
  '69-worklets': { groupId: 'browser', level: 'senior', sortInGroup: 13 },
  '70-pwa': { groupId: 'browser', level: 'senior', sortInGroup: 14 },

  // CI/CD (порядок как в Notion; уровень по цвету иконки)
  '71-why-cicd': { groupId: 'cicd', level: 'junior', sortInGroup: 1 },
  '72-jenkins': { groupId: 'cicd', level: 'junior', sortInGroup: 2 },
  '73-mesos-marathon': { groupId: 'cicd', level: 'middle', sortInGroup: 3 },
  '74-server-clusters': { groupId: 'cicd', level: 'middle', sortInGroup: 4 },
  '75-configure-jenkins-marathon': { groupId: 'cicd', level: 'senior', sortInGroup: 5 },
  '76-cicd-systems-comparison': { groupId: 'cicd', level: 'senior', sortInGroup: 6 },

  // JS / data
  '01-immutability-js': { groupId: 'js', level: 'middle', sortInGroup: 1 },
  '02-normalize-immutable-libs': { groupId: 'redux', level: 'middle', sortInGroup: 1 },

  // Проект / сборка
  '04-bundlers-gulp-rollup': { groupId: 'project', level: 'middle', sortInGroup: 1 },
  '05-module-federation-babel-postcss': { groupId: 'project', level: 'senior', sortInGroup: 2 },

  // Логирование
  '06-logging-nodes': { groupId: 'logging', level: 'middle', sortInGroup: 1 },

  // Безопасность
  '07-cors': { groupId: 'security', level: 'junior', sortInGroup: 1 },
  '08-npm-audit': { groupId: 'security', level: 'junior', sortInGroup: 2 },
  '09-jwt-security': { groupId: 'security', level: 'middle', sortInGroup: 3 },
  '10-csp': { groupId: 'security', level: 'middle', sortInGroup: 4 },
  '11-xss': { groupId: 'security', level: 'middle', sortInGroup: 5 },
  '12-sql-injection': { groupId: 'security', level: 'middle', sortInGroup: 6 },
  '13-csrf': { groupId: 'security', level: 'middle', sortInGroup: 7 },
}

export function resolveTopicMeta(topicId: string): {
  groupId: TopicGroupId
  level: TopicLevel
  sortInGroup: number
} {
  const meta = TOPIC_META[topicId]
  if (meta) {
    return {
      groupId: meta.groupId,
      level: meta.level,
      sortInGroup: meta.sortInGroup ?? 50,
    }
  }
  return { groupId: 'other', level: 'middle', sortInGroup: 50 }
}
