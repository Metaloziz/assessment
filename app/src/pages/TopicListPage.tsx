import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { contentSource } from '../content'
import type { TopicSummary } from '../content'
import styles from './TopicListPage.module.css'

/** Landing redirects to first topic once loaded. */
export function TopicListPage() {
  const [firstId, setFirstId] = useState<string | null>(null)

  useEffect(() => {
    void contentSource.listTopics().then((topics: TopicSummary[]) => {
      setFirstId(topics[0]?.id ?? null)
    })
  }, [])

  if (!firstId) {
    return <div className={styles.loading}>Загрузка тем…</div>
  }

  return <Navigate to={`/topics/${firstId}`} replace />
}
