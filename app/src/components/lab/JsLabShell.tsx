import type { ReactNode } from 'react'
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
}

/** Общая оболочка JS-лабораторий: заголовок + LabTabs. */
export function JsLabShell({
  title,
  lead,
  problem,
  sandbox,
  code,
  defaultTab = 'code',
}: JsLabShellProps) {
  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.lead}>{lead}</p>
        <LabTabs problem={problem} sandbox={sandbox} code={code} defaultTab={defaultTab} />
      </section>
    </div>
  )
}
