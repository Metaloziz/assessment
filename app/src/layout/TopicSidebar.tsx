import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { TopicSummary } from '../content'
import { contentSource, TOPIC_GROUPS, LEVEL_META } from '../content'
import { TopicCheckbox } from '../components/TopicCheckbox'
import { LevelBadge } from '../components/LevelBadge'
import { useProgressHydrated } from '../hooks/useProgressHydrated'
import { useLayoutStore } from '../store/layout'
import { useProgressStore } from '../store/progress'
import styles from './TopicSidebar.module.css'

type Props = {
  onCollapse?: () => void
}

export function TopicSidebar({ onCollapse }: Props) {
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [query, setQuery] = useState('')
  const hydrated = useProgressHydrated()
  const completedIds = useProgressStore((s) => s.completedIds)
  const sidebarScrollTop = useLayoutStore((s) => s.sidebarScrollTop)
  const setSidebarScrollTop = useLayoutStore((s) => s.setSidebarScrollTop)
  const collapsedGroups = useLayoutStore((s) => s.collapsedGroups)
  const toggleCollapsedGroup = useLayoutStore((s) => s.toggleCollapsedGroup)
  const listRef = useRef<HTMLElement>(null)
  const restoredRef = useRef(false)
  const saveTimerRef = useRef<number | null>(null)
  const [layoutReady, setLayoutReady] = useState(() => useLayoutStore.persist.hasHydrated())

  useEffect(() => {
    void contentSource.listTopics().then(setTopics)
  }, [])

  useEffect(() => {
    setLayoutReady(useLayoutStore.persist.hasHydrated())
    return useLayoutStore.persist.onFinishHydration(() => setLayoutReady(true))
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el || !layoutReady || topics.length === 0 || restoredRef.current) return
    el.scrollTop = sidebarScrollTop
    restoredRef.current = true
  }, [layoutReady, topics.length, sidebarScrollTop])

  const flushScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setSidebarScrollTop(el.scrollTop)
  }, [setSidebarScrollTop])

  const onListScroll = useCallback(() => {
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      flushScroll()
    }, 120)
  }, [flushScroll])

  useEffect(() => {
    const onHide = () => flushScroll()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current)
    }
  }, [flushScroll])

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

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>AP</div>
        <div className={styles.brandText}>
          <div className={styles.brandTitle}>Assessment Prep</div>
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

      <nav
        ref={listRef}
        className={styles.list}
        aria-label="Список тем по группам"
        onScroll={onListScroll}
      >
        {grouped.map(({ group, topics: groupTopics }) => {
          const isCollapsed = Boolean(collapsedGroups[group.id]) && !query.trim()
          const groupDone = groupTopics.filter((t) => completedIds[t.id]).length

          return (
            <section key={group.id} className={styles.group}>
              <button
                type="button"
                className={styles.groupHeader}
                onClick={() => toggleCollapsedGroup(group.id)}
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
                          {topic.hasLab || topic.hasApi ? (
                            <span className={styles.tags}>
                              {topic.hasLab ? <span className={styles.lab}>lab</span> : null}
                              {topic.hasApi ? <span className={styles.api}>api</span> : null}
                            </span>
                          ) : null}
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
