import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { contentSource } from '../content'
import type { TopicDetail } from '../content'
import { MarkdownSections } from '../components/MarkdownSections'
import { CodeBlock } from '../components/CodeBlock'
import { ImmutabilityLab } from '../topics/immutability/ImmutabilityLab'
import { PerformanceLab } from '../topics/performance/PerformanceLab'
import { GitSwitchLab } from '../topics/git-switch/GitSwitchLab'
import { GitRestoreLab } from '../topics/git-restore/GitRestoreLab'
import styles from './TopicPage.module.css'

function TopicLab({ topicId, topic }: { topicId: string; topic: TopicDetail }) {
  if (topicId === '01-immutability-js') return <ImmutabilityLab topic={topic} />
  if (topicId === '24-devtools-lighthouse') return <PerformanceLab />
  if (topicId === '31-git-switch') return <GitSwitchLab />
  if (topicId === '32-git-restore') return <GitRestoreLab />
  return null
}

export function TopicPage() {
  const { topicId = '' } = useParams()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setTopic(null)
    setError(null)
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

  const content = (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>{topic.title}</h1>
        {topic.oneLiner ? <p className={styles.oneLiner}>{topic.oneLiner}</p> : null}
      </header>

      <div className={styles.stream}>
        {topic.sections.interview ? (
          <section className={styles.segment}>
            <h2 className={styles.sectionTitle}>Ответ для собеседования</h2>
            <MarkdownSections markdown={topic.sections.interview} />
          </section>
        ) : null}

        {topic.sections.remember ? (
          <section className={styles.segment}>
            <h2 className={styles.sectionTitle}>Самое главное запомнить</h2>
            <MarkdownSections markdown={topic.sections.remember} />
          </section>
        ) : null}

        {topic.sections.description ? (
          <section className={styles.segment}>
            <h2 className={styles.sectionTitle}>Описание</h2>
            <MarkdownSections markdown={topic.sections.description} />
          </section>
        ) : null}

        {topic.codeBlocks.length > 0 ? (
          <section className={styles.segment}>
            <h2 className={styles.sectionTitle}>Код</h2>
            <div className={styles.codeStack}>
              {topic.codeBlocks.map((block, idx) => (
                <CodeBlock key={idx} code={block.code} language={block.language} />
              ))}
            </div>
          </section>
        ) : null}

        {topic.links.length > 0 ? (
          <section className={styles.segment}>
            <h2 className={styles.sectionTitle}>Ссылки</h2>
            <ul className={styles.links}>
              {topic.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
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
        </div>
        <div className={styles.labPaneBody}>
          <TopicLab topicId={topic.id} topic={topic} />
        </div>
      </aside>
    </div>
  )
}
