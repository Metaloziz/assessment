import type { TopicDetail, TopicSectionKey, TopicSummary } from './types'
import { resolveTopicMeta, TOPIC_GROUPS } from './groups'

const SECTION_MAP: Array<{ key: TopicSectionKey; patterns: RegExp[] }> = [
  { key: 'theme', patterns: [/^#\s*1\.\s*Тема/i] },
  { key: 'oneLiner', patterns: [/^#\s*2\.\s*Главное/i] },
  { key: 'interview', patterns: [/^#\s*3\.\s*Суть/i, /^#\s*3\.\s*Ответ/i] },
  { key: 'remember', patterns: [/^#\s*4\.\s*Самое главное/i] },
  { key: 'description', patterns: [/^#\s*5\.\s*Описание/i] },
  { key: 'links', patterns: [/^#\s*6\.\s*Ссылки/i] },
]

function matchSection(line: string): TopicSectionKey | null {
  for (const entry of SECTION_MAP) {
    if (entry.patterns.some((re) => re.test(line.trim()))) {
      return entry.key
    }
  }
  return null
}

function extractTitle(themeSection: string | undefined, fallback: string): string {
  if (!themeSection) return fallback
  const bold = themeSection.match(/\*\*([^*]+)\*\*/)
  const raw = bold?.[1]
    ? bold[1].trim()
    : (themeSection
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith('#') && l !== '---')
        ?.replace(/^[*_]+|[*_]+$/g, '') ?? fallback)
  // Убрать Notion-маркеры уровня вроде (🟩)/(🟧)/(🟪)
  return raw.replace(/\s*\([\u{1F7E5}-\u{1F7EB}]\)/gu, '').trim() || fallback
}

function extractOneLiner(section: string | undefined): string {
  if (!section) return ''
  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l !== '---')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractCodeBlocks(md: string): Array<{ language: string; code: string }> {
  const blocks: Array<{ language: string; code: string }> = []
  const re = /```(\w+)?\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  while ((match = re.exec(md)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].replace(/\n$/, ''),
    })
  }
  return blocks
}

function extractLinks(linksSection: string | undefined): Array<{ label: string; href: string }> {
  if (!linksSection) return []
  const links: Array<{ label: string; href: string }> = []
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(linksSection)) !== null) {
    links.push({ label: match[1], href: match[2] })
  }
  return links
}

export function parseTopicMd(id: string, raw: string, order: number): TopicDetail {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const sections: Partial<Record<TopicSectionKey, string[]>> = {}
  let current: TopicSectionKey | null = null

  for (const line of lines) {
    const section = matchSection(line)
    if (section) {
      current = section
      sections[current] = []
      continue
    }
    if (current) {
      sections[current]!.push(line)
    }
  }

  const joined: Partial<Record<TopicSectionKey, string>> = {}
  for (const [key, value] of Object.entries(sections) as Array<[TopicSectionKey, string[]]>) {
    joined[key] = value.join('\n').trim()
  }

  const title = extractTitle(joined.theme, id)
  const oneLiner = extractOneLiner(joined.oneLiner)
  const meta = resolveTopicMeta(id)
  const groupTitle =
    TOPIC_GROUPS.find((g) => g.id === meta.groupId)?.title ?? 'Прочее'

  /** Темы с лабой против живого `assessment-api` (не симуляция). */
  const hasApi =
    id === '07-cors' ||
    id === '244-nodejs-db-async-config' ||
    id === '245-nodejs-cache-crud' ||
    id === '27-server-performance-metrics' ||
    id === '246-nodejs-worker-threads' ||
    id === '251-network-api-first' ||
    id === '250-network-http-https' ||
    id === '252-network-long-polling-ws-sse'

  return {
    id,
    title,
    oneLiner,
    order,
    hasApi,
    hasLab:
      id === '01-immutability-js' ||
      id === '17-git-reset-tag-log-diff-reflog' ||
      id === '16-git-amend-fixup-revert-cherry-pick-stash' ||
      id === '33-git-grep' ||
      id === '20-git-bisect' ||
      id === '18-git-flow-github-gitlab' ||
      id === '19-git-hooks' ||
      id === '31-git-switch' ||
      id === '32-git-restore' ||
      id === '34-git-lfs' ||
      id === '52-apo' ||
      id === '55-legacy-code-approaches' ||
      id === '56-dead-code-tools' ||
      id === '57-cookies' ||
      id === '65-service-workers' ||
      id === '66-web-workers' ||
      id === '67-web-apis' ||
      id === '68-indexeddb' ||
      id === '69-worklets' ||
      id === '73-mesos-marathon' ||
      id === '74-server-clusters' ||
      id === '75-configure-jenkins-marathon' ||
      id === '93-js-lexical-environment' ||
      id === '94-js-scope-chain' ||
      id === '95-js-bind-call-apply' ||
      id === '96-js-prototype-chain' ||
      id === '97-js-arrow-prototype' ||
      id === '98-js-live-collections' ||
      id === '99-js-event-delegation' ||
      id === '100-js-event-this' ||
      id === '101-js-arrow-syntax' ||
      id === '102-js-factory-functions' ||
      id === '103-js-prototypal-inheritance' ||
      id === '104-js-null-prototype' ||
      id === '105-js-mutation-observer' ||
      id === '106-js-selection-range' ||
      id === '107-js-iife' ||
      id === '108-js-currying' ||
      id === '109-js-private-static-fields' ||
      id === '110-js-delegation-pattern' ||
      id === '111-js-v8-gc' ||
      id === '112-js-v8-pipeline' ||
      id === '113-js-class-engine' ||
      id === '114-js-mixins' ||
      id === '115-js-web-components' ||
      id === '116-js-v8-optimizations' ||
      id === '117-js-proto-vs-closure-perf' ||
      id === '118-js-webcomponents-css' ||
      id === '124-redux-saga-thunk' ||
      id === '126-redux-feature-first-ducks' ||
      id === '02-normalize-immutable-libs' ||
      id === '129-algorithms-big-o' ||
      id === '130-algorithms-sorting' ||
      id === '131-algorithms-dp' ||
      id === '132-algorithms-patterns' ||
      id === '133-algorithms-stack-hashmap' ||
      id === '134-algorithms-graphs-list' ||
      id === '135-algorithms-complexity-notations' ||
      id === '138-project-loaders-plugins-semver' ||
      id === '139-project-scripts-hmr-treeshake' ||
      id === '140-project-prod-dev-plugins' ||
      id === '03-build-hot-cold' ||
      id === '04-bundlers-gulp-rollup' ||
      id === '05-module-federation-babel-postcss' ||
      id === '144-logging-redux-devtools' ||
      id === '145-logging-chrome-application-sources' ||
      id === '146-logging-sentry-prometheus' ||
      id === '147-logging-server-debug-browser' ||
      id === '06-logging-nodes' ||
      id === '151-x-frame-options' ||
      id === '07-cors' ||
      id === '08-npm-audit' ||
      id === '09-jwt-security' ||
      id === '10-csp' ||
      id === '11-xss' ||
      id === '12-sql-injection' ||
      id === '13-csrf' ||
      id === '14-client-performance-metrics' ||
      id === '15-bundle-cdn' ||
      id === '159-patterns-factory-prototype-proxy-singleton-adapter' ||
      id === '160-patterns-chain-abstract-factory-strategy-decorator' ||
      id === '161-patterns-mediator-composite-memento' ||
      id === '162-patterns-dependency-injection' ||
      id === '163-patterns-template-flyweight-bridge' ||
      id === '164-layout-vector-raster' ||
      id === '165-layout-typography' ||
      id === '168-layout-scss-postcss' ||
      id === '264-layout-postcss' ||
      id === '169-layout-flexbox' ||
      id === '170-layout-animation' ||
      id === '172-layout-css-modules-css-in-js' ||
      id === '173-layout-grid' ||
      id === '171-layout-stacking-context' ||
      id === '174-layout-browserslist' ||
      id === '175-layout-tools-by-browsers' ||
      id === '176-layout-design-system' ||
      id === '177-layout-a11y' ||
      id === '178-layout-microdata' ||
      id === '185-react-virtual-dom' ||
      id === '186-react-optimization' ||
      id === '187-react-fragments' ||
      id === '188-react-error-boundaries' ||
      id === '189-react-portals' ||
      id === '190-react-router' ||
      id === '191-react-context' ||
      id === '194-react-form-managers' ||
      id === '192-react-ssr' ||
      id === '199-react-server-components' ||
      id === '193-react-compound-components' ||
      id === '195-react-render-props' ||
      id === '196-react-reconciliation' ||
      id === '198-react-web-components' ||
      id === '197-react-fiber' ||
      id === '215-async-event-loop' ||
      id === '216-async-tasks-microtasks' ||
      id === '217-async-callback-promises' ||
      id === '218-async-callback-hell' ||
      id === '219-async-await' ||
      id === '220-async-promise-after-catch' ||
      id === '221-async-generators' ||
      id === '222-async-infinite-generators' ||
      id === '225-ts-basic-types' ||
      id === '226-ts-interface-types' ||
      id === '227-ts-declaration-files' ||
      id === '228-ts-type-guards' ||
      id === '229-ts-type-transforms' ||
      id === '230-ts-generics' ||
      id === '231-ts-keyof-typeof' ||
      id === '232-ts-optional-nullish' ||
      id === '233-ts-conditional-mapped-infer' ||
      id === '234-ts-template-literal-types' ||
      id === '235-ts-function-overloads' ||
      id === '236-ts-reference-types' ||
      id === '237-ts-tsc' ||
      id === '238-ts-decorators' ||
      id === '239-ts-mixins' ||
      id === '242-nodejs-modules-globals' ||
      id === '243-nodejs-routing-static' ||
      id === '244-nodejs-db-async-config' ||
      id === '245-nodejs-cache-crud' ||
      id === '246-nodejs-worker-threads' ||
      id === '250-network-http-https' ||
      id === '251-network-api-first' ||
      id === '252-network-long-polling-ws-sse' ||
      id === '253-network-tcpip-internet-app' ||
      id === '254-network-tcpip-transport-link' ||
      id === '261-network-ip-basics' ||
      id === '262-network-tcp' ||
      id === '263-network-dns-basics' ||
      id === '256-software-solid' ||
      id === '257-software-mvc-mvp-mvvm' ||
      id === '259-software-incremental-iterative-spiral' ||
      id === '53-bduf' ||
      id === '26-lazy-loading-critical-path' ||
      id === '27-server-performance-metrics',
    groupId: meta.groupId,
    groupTitle,
    level: meta.level,
    sortInGroup: meta.sortInGroup,
    raw,
    sections: joined,
    codeBlocks: extractCodeBlocks(raw),
    links: extractLinks(joined.links),
  }
}

export function toSummary(detail: TopicDetail): TopicSummary {
  return {
    id: detail.id,
    title: detail.title,
    oneLiner: detail.oneLiner,
    order: detail.order,
    hasLab: detail.hasLab,
    hasApi: detail.hasApi,
    groupId: detail.groupId,
    groupTitle: detail.groupTitle,
    level: detail.level,
    sortInGroup: detail.sortInGroup,
  }
}
