import type { ContentSource, TopicDetail, TopicSummary } from './types'
import { parseTopicMd, toSummary } from './parseTopicMd'
import { TOPIC_GROUPS, HIDDEN_TOPIC_IDS } from './groups'

const markdownModules = import.meta.glob('@topics/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function idFromPath(path: string): { id: string; order: number } {
  const file = path.split(/[/\\]/).pop() ?? path
  const id = file.replace(/\.md$/i, '')
  const orderMatch = id.match(/^(\d+)/)
  return { id, order: orderMatch ? Number(orderMatch[1]) : 999 }
}

function loadAll(): TopicDetail[] {
  return Object.entries(markdownModules)
    .map(([path, raw]) => {
      const { id, order } = idFromPath(path)
      return parseTopicMd(id, raw, order)
    })
    .filter((t) => !HIDDEN_TOPIC_IDS.has(t.id))
    .sort((a, b) => {
      if (a.groupId !== b.groupId) {
        const ga = TOPIC_GROUPS.find((g) => g.id === a.groupId)?.order ?? 99
        const gb = TOPIC_GROUPS.find((g) => g.id === b.groupId)?.order ?? 99
        return ga - gb
      }
      return a.sortInGroup - b.sortInGroup || a.order - b.order
    })
}

const cache = loadAll()
const byId = new Map(cache.map((t) => [t.id, t]))

export const localMarkdownSource: ContentSource = {
  async listTopics(): Promise<TopicSummary[]> {
    return cache.map(toSummary)
  },
  async getTopic(id: string): Promise<TopicDetail> {
    const topic = byId.get(id)
    if (!topic) {
      throw new Error(`Topic not found: ${id}`)
    }
    return topic
  },
}
