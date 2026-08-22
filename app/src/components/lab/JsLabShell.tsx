import type { ReactNode } from 'react'
import { LabApiTag } from './LabApiTag'
import { useLabTopic } from './LabTopicContext'
import { LabTabs, type LabTabId } from './LabTabs'
import styles from './JsLabShell.module.css'

type JsLabShellProps = {
  title: string
  lead: string
  problem: ReactNode
  /** Omit for pilot labs (problem + interactive code only). */
  sandbox?: ReactNode
  code: ReactNode
  defaultTab?: LabTabId
  /** Fill lab dock height so «Код» can stretch the editor (default for all labs). */
  fill?: boolean
}

/** Общая оболочка JS-лабораторий: заголовок + LabTabs. */
export function JsLabShell({
  title,
  lead,
  problem,
  sandbox,
  code,
  defaultTab = 'code',
  fill = true,
}: JsLabShellProps) {
  const { hasApi } = useLabTopic()

  return (
    <div className={`${styles.root} ${fill ? styles.rootFill : ''}`}>
      <section className={styles.section}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{title}</h2>
          {hasApi ? <LabApiTag /> : null}
        </div>
        <p className={styles.lead}>{lead}</p>
        <LabTabs problem={problem} sandbox={sandbox} code={code} defaultTab={defaultTab} />
      </section>
    </div>
  )
}
