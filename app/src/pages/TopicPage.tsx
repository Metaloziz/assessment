import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { contentSource } from '../content'
import type { TopicDetail } from '../content'
import { MarkdownSections } from '../components/MarkdownSections'
import { CodeBlock } from '../components/CodeBlock'
import { ImmutabilityLab } from '../topics/immutability/ImmutabilityLab'
import { PerformanceLab } from '../topics/performance/PerformanceLab'
import { GitSwitchLab } from '../topics/git-switch/GitSwitchLab'
import { GitRestoreLab } from '../topics/git-restore/GitRestoreLab'
import { DeadCodeLab } from '../topics/dead-code/DeadCodeLab'
import { CookiesLab } from '../topics/cookies/CookiesLab'
import { ServiceWorkersLab } from '../topics/service-workers/ServiceWorkersLab'
import { WebApisLab } from '../topics/web-apis/WebApisLab'
import { IndexedDbLab } from '../topics/indexeddb/IndexedDbLab'
import { WebWorkersLab } from '../topics/web-workers/WebWorkersLab'
import { WorkletsLab } from '../topics/worklets/WorkletsLab'
import { MesosMarathonLab } from '../topics/mesos-marathon/MesosMarathonLab'
import { ServerClustersLab } from '../topics/server-clusters/ServerClustersLab'
import { JenkinsConfigLab } from '../topics/jenkins-config/JenkinsConfigLab'
import { useDevToolsDocked } from '../hooks/useDevToolsDocked'
import { LAB_DOCK_ID, useLayoutStore } from '../store/layout'
import styles from './TopicPage.module.css'

function TopicLab({ topicId, topic }: { topicId: string; topic: TopicDetail }) {
  if (topicId === '01-immutability-js') return <ImmutabilityLab topic={topic} />
  if (topicId === '24-devtools-lighthouse') return <PerformanceLab />
  if (topicId === '31-git-switch') return <GitSwitchLab />
  if (topicId === '32-git-restore') return <GitRestoreLab />
  if (topicId === '56-dead-code-tools') return <DeadCodeLab />
  if (topicId === '57-cookies') return <CookiesLab />
  if (topicId === '65-service-workers') return <ServiceWorkersLab />
  if (topicId === '66-web-workers') return <WebWorkersLab />
  if (topicId === '67-web-apis') return <WebApisLab />
  if (topicId === '68-indexeddb') return <IndexedDbLab />
  if (topicId === '69-worklets') return <WorkletsLab />
  if (topicId === '73-mesos-marathon') return <MesosMarathonLab />
  if (topicId === '74-server-clusters') return <ServerClustersLab />
  if (topicId === '75-configure-jenkins-marathon') return <JenkinsConfigLab />
  return null
}

export function TopicPage() {
  const { topicId = '' } = useParams()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dockEl, setDockEl] = useState<HTMLElement | null>(null)
  const labOpen = useLayoutStore((s) => s.labOpen)
  const setLabOpen = useLayoutStore((s) => s.setLabOpen)
  const setLabFocus = useLayoutStore((s) => s.setLabFocus)
  const setActiveHasLab = useLayoutStore((s) => s.setActiveHasLab)
  const devToolsDocked = useDevToolsDocked()

  useEffect(() => {
    setDockEl(document.getElementById(LAB_DOCK_ID))
  }, [])

  useEffect(() => {
    let cancelled = false
    setTopic(null)
    setError(null)
    setLabOpen(false)
    setActiveHasLab(false)
    void contentSource
      .getTopic(topicId)
      .then((data) => {
        if (cancelled) return
        setTopic(data)
        setActiveHasLab(data.hasLab)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки')
          setActiveHasLab(false)
        }
      })
    return () => {
      cancelled = true
      setLabOpen(false)
      setLabFocus(false)
      setActiveHasLab(false)
    }
  }, [topicId, setLabOpen, setLabFocus, setActiveHasLab])

  useEffect(() => {
    const focus = Boolean(topic?.hasLab && labOpen && devToolsDocked)
    setLabFocus(focus)
    return () => setLabFocus(false)
  }, [topic?.hasLab, labOpen, devToolsDocked, setLabFocus])

  if (error) {
    return <div className={styles.state}>{error}</div>
  }

  if (!topic) {
    return <div className={styles.state}>Загрузка…</div>
  }

  const labPortal =
    topic.hasLab && dockEl
      ? createPortal(<TopicLab topicId={topic.id} topic={topic} />, dockEl)
      : null

  return (
    <>
      {labPortal}
      <article className={styles.page}>
        <div className={styles.reading}>
          <header className={styles.header}>
            <h1 className={styles.title}>{topic.title}</h1>
            {topic.oneLiner ? <p className={styles.oneLiner}>{topic.oneLiner}</p> : null}
          </header>

          <div className={styles.stream}>
            {topic.sections.interview ? (
              <section className={styles.segment}>
                <h2 className={styles.sectionTitle}>Суть</h2>
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
        </div>
      </article>
    </>
  )
}
