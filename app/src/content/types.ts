export type TopicSectionKey =
  | 'theme'
  | 'oneLiner'
  | 'interview'
  | 'remember'
  | 'description'
  | 'links'

export type TopicLevel = 'junior' | 'middle' | 'senior'

export type TopicSummary = {
  id: string
  title: string
  oneLiner: string
  order: number
  hasLab: boolean
  /** Лаба ходит в живой assessment API (не симуляция). */
  hasApi: boolean
  groupId: string
  groupTitle: string
  level: TopicLevel
  sortInGroup: number
}

export type TopicDetail = TopicSummary & {
  raw: string
  sections: Partial<Record<TopicSectionKey, string>>
  codeBlocks: Array<{ language: string; code: string }>
  links: Array<{ label: string; href: string }>
}

export interface ContentSource {
  listTopics(): Promise<TopicSummary[]>
  getTopic(id: string): Promise<TopicDetail>
}
