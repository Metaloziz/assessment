import { localMarkdownSource } from './localMarkdownSource'
import type { ContentSource } from './types'

export type { ContentSource, TopicDetail, TopicSummary, TopicSectionKey, TopicLevel } from './types'
export { parseTopicMd } from './parseTopicMd'
export {
  TOPIC_GROUPS,
  LEVEL_META,
  TOPIC_META,
  resolveTopicMeta,
} from './groups'
export type { TopicGroup, TopicGroupId } from './groups'

/** Swap this later for an API/DB-backed source. */
export const contentSource: ContentSource = localMarkdownSource
