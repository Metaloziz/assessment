import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { TopicSummary } from '../content'
import { contentSource, TOPIC_GROUPS, LEVEL_META } from '../content'
import { TopicCheckbox } from '../components/TopicCheckbox'
import { LevelBadge } from '../components/LevelBadge'
import { useProgressHydrated } from '../hooks/useProgressHydrated'
import { useProgressStore } from '../store/progress'
import styles from './TopicSidebar.module.css'

type Props = {
  onCollapse?: () => void
}

export function TopicSidebar({ onCollapse }: Props) {
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const hydrated = useProgressHydrated()
  const completedIds = useProgressStore((s) => s.completedIds)

  useEffect(() => {
    void contentSource.listTopics().then(setTopics)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return topics
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.groupTitle.toLowerCase().includes(q) ||
        LEVEL_META[t.level].label.toLowerCase().includes(q),
    )
  }, [topics, query])

  const grouped = useMemo(() => {
    const byGroup = new Map<string, TopicSummary[]>()
    for (const topic of filtered) {
      const list = byGroup.get(topic.groupId) ?? []
      list.push(topic)
      byGroup.set(topic.groupId, list)
    }

    return TOPIC_GROUPS.map((group) => ({
      group,
      topics: (byGroup.get(group.id) ?? []).slice().sort((a, b) => {
        if (a.sortInGroup !== b.sortInGroup) return a.sortInGroup - b.sortInGroup
        return a.order - b.order
      }),
    })).filter((entry) => entry.topics.length > 0)
  }, [filtered])

  const done = Object.keys(completedIds).filter((id) => topics.some((t) => t.id === id)).length
  const total = topics.length || 1
  const pct = Math.round((done / total) * 100)

  const toggleGroup = (groupId: string) => {
    setCollapsed((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>AP</div>
        <div className={styles.brandText}>
          <div className={styles.brandTitle}>Assessment Prep</div>
          <div className={styles.brandSub}>как в Notion · группы и уровни</div>
        </div>
        {onCollapse ? (
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onCollapse}
            aria-label="Скрыть список тем"
            title="Скрыть список тем"
          >
            <span aria-hidden>»</span>
          </button>
        ) : null}
      </div>

      <div className={styles.progress}>
        <div className={styles.progressRow}>
          <span>
            {hydrated ? done : '…'} / {topics.length} пройдено
          </span>
          <span>{pct}%</span>
        </div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск…"
          aria-label="Поиск темы"
        />
      </div>

      <nav className={styles.list} aria-label="Список тем по группам">
        {grouped.map(({ group, topics: groupTopics }) => {
          const isCollapsed = Boolean(collapsed[group.id]) && !query.trim()
          const groupDone = groupTopics.filter((t) => completedIds[t.id]).length

          return (
            <section key={group.id} className={styles.group}>
              <button
                type="button"
                className={styles.groupHeader}
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!isCollapsed}
              >
                <span className={styles.groupTitle}>{group.title}</span>
                <span className={styles.groupCount}>
                  {groupDone}/{groupTopics.length}
                </span>
              </button>

              {!isCollapsed ? (
                <div className={styles.groupBody}>
                  {groupTopics.map((topic) => {
                    const doneItem = Boolean(completedIds[topic.id])
                    return (
                      <div
                        key={topic.id}
                        className={`${styles.row} ${doneItem ? styles.done : ''}`}
                      >
                        <TopicCheckbox topicId={topic.id} />
                        <NavLink
                          to={`/topics/${topic.id}`}
                          className={({ isActive }) =>
                            `${styles.page} ${isActive ? styles.active : ''}`
                          }
                        >
                          <LevelBadge level={topic.level} size="sm" />
                          <span className={styles.title}>{topic.title}</span>
                          {topic.hasLab ? <span className={styles.lab}>lab</span> : null}
                        </NavLink>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </section>
          )
        })}
      </nav>
    </aside>
  )
}
