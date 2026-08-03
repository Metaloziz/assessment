import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
import { useDevToolsDocked } from '../hooks/useDevToolsDocked'
import { useLayoutStore } from '../store/layout'
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
  return null
}

export function TopicPage() {
  const { topicId = '' } = useParams()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const labShare = useLayoutStore((s) => s.labShare)
  const setLabShare = useLayoutStore((s) => s.setLabShare)
  const setLabFocus = useLayoutStore((s) => s.setLabFocus)
  const splitRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const devToolsDocked = useDevToolsDocked()

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

  useEffect(() => {
    const focus = Boolean(topic?.hasLab && devToolsDocked)
    setLabFocus(focus)
    return () => setLabFocus(false)
  }, [topic?.hasLab, devToolsDocked, setLabFocus])

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const split = splitRef.current
      if (!split) return

      draggingRef.current = true
      const handle = event.currentTarget
      handle.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current || !splitRef.current) return
        const rect = splitRef.current.getBoundingClientRect()
        if (rect.width <= 0) return
        setLabShare((ev.clientX - rect.left) / rect.width)
      }

      const onUp = (ev: PointerEvent) => {
        draggingRef.current = false
        handle.releasePointerCapture(ev.pointerId)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [setLabShare],
  )

  if (error) {
    return <div className={styles.state}>{error}</div>
  }

  if (!topic) {
    return <div className={styles.state}>Загрузка…</div>
  }

  const content = (
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
  )

  if (!topic.hasLab) {
    return <article className={styles.page}>{content}</article>
  }

  const labFocus = Boolean(topic.hasLab && devToolsDocked)

  return (
    <div className={styles.split} ref={splitRef} data-lab-focus={labFocus ? 'true' : 'false'}>
      <aside
        className={styles.labPane}
        aria-label="Лаборатория"
        style={labFocus ? undefined : { flex: `0 0 ${labShare * 100}%` }}
      >
        <div className={styles.labPaneHeader}>
          <span className={styles.labPaneTitle}>Лаборатория</span>
          {labFocus ? <span className={styles.labFocusHint}>DevTools · только лаба</span> : null}
        </div>
        <div className={styles.labPaneBody}>
          <TopicLab topicId={topic.id} topic={topic} />
        </div>
      </aside>

      {!labFocus ? (
        <div
          className={styles.resizer}
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину панелей"
          onPointerDown={onResizePointerDown}
        />
      ) : null}

      {!labFocus ? <article className={styles.primary}>{content}</article> : null}
    </div>
  )
}
