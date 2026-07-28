import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { contentSource } from '../content'
import type { TopicDetail } from '../content'
import { MarkdownSections } from '../components/MarkdownSections'
import { CodeBlock } from '../components/CodeBlock'
import { TopicCheckbox } from '../components/TopicCheckbox'
import { LevelBadge } from '../components/LevelBadge'
import { ImmutabilityLab } from '../topics/immutability/ImmutabilityLab'
import { PerformanceLab } from '../topics/performance/PerformanceLab'
import { LEVEL_META } from '../content'
import styles from './TopicPage.module.css'

type Tab = 'theory' | 'code' | 'links'

function TopicLab({ topicId, topic }: { topicId: string; topic: TopicDetail }) {
  if (topicId === '01-immutability-js') return <ImmutabilityLab topic={topic} />
  if (topicId === '24-devtools-lighthouse') return <PerformanceLab />
  return null
}

export function TopicPage() {
  const { topicId = '' } = useParams()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('theory')

  useEffect(() => {
    let cancelled = false
    setTopic(null)
    setError(null)
    setTab('theory')
    void contentSource
      .getTopic(topicId)
      .then((data) => {
        if (!cancelled) setTopic(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      })
    return () => {
      cancelled = true
    }
  }, [topicId])

  if (error) {
    return <div className={styles.state}>{error}</div>
  }

  if (!topic) {
    return <div className={styles.state}>Загрузка…</div>
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'theory', label: 'Теория' },
    { id: 'code', label: 'Код' },
    { id: 'links', label: 'Ссылки' },
  ]

  const content = (
    <>
      <header className={styles.header}>
        <div className={styles.metaRow}>
          <div className={styles.kicker}>
            {topic.groupTitle} · Тема {String(topic.order).padStart(2, '0')}
          </div>
          <span className={styles.levelInline}>
            <LevelBadge level={topic.level} size="md" />
            {LEVEL_META[topic.level].label}
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{topic.title}</h1>
          <TopicCheckbox topicId={topic.id} label="Пройдено" size="md" />
        </div>
        {topic.oneLiner ? <p className={styles.oneLiner}>{topic.oneLiner}</p> : null}
      </header>

      <div className={styles.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab === 'theory' ? (
          <div className={styles.stack}>
            {topic.sections.interview ? (
              <section>
                <h2 className={styles.sectionTitle}>Ответ для собеседования</h2>
                <MarkdownSections markdown={topic.sections.interview} />
              </section>
            ) : null}
            {topic.sections.remember ? (
              <section>
                <h2 className={styles.sectionTitle}>Самое главное запомнить</h2>
                <MarkdownSections markdown={topic.sections.remember} />
              </section>
            ) : null}
            {topic.sections.description ? (
              <section>
                <h2 className={styles.sectionTitle}>Описание</h2>
                <MarkdownSections markdown={topic.sections.description} />
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === 'code' ? (
          <div className={styles.stack}>
            {topic.codeBlocks.length === 0 ? (
              <p className={styles.muted}>В этой теме нет блоков кода.</p>
            ) : (
              topic.codeBlocks.map((block, idx) => (
                <CodeBlock key={idx} code={block.code} language={block.language} />
              ))
            )}
          </div>
        ) : null}

        {tab === 'links' ? (
          <ul className={styles.links}>
            {topic.links.length === 0 ? (
              <li className={styles.muted}>Ссылок нет.</li>
            ) : (
              topic.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </>
  )

  if (!topic.hasLab) {
    return <article className={styles.page}>{content}</article>
  }

  return (
    <div className={styles.split}>
      <article className={styles.primary}>{content}</article>
      <aside className={styles.labPane} aria-label="Лаборатория">
        <div className={styles.labPaneHeader}>
          <span className={styles.labPaneTitle}>Лаборатория</span>
          <span className={styles.labPaneHint}>всегда на виду</span>
        </div>
        <div className={styles.labPaneBody}>
          <TopicLab topicId={topic.id} topic={topic} />
        </div>
      </aside>
    </div>
  )
}
