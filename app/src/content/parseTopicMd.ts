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

  return {
    id,
    title,
    oneLiner,
    order,
    hasLab:
      id === '01-immutability-js' ||
      id === '24-devtools-lighthouse' ||
      id === '31-git-switch' ||
      id === '32-git-restore' ||
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
      id === '118-js-webcomponents-css',
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
    groupId: detail.groupId,
    groupTitle: detail.groupTitle,
    level: detail.level,
    sortInGroup: detail.sortInGroup,
  }
}
