import { useId, useState, type ReactNode } from 'react'
import styles from './LabTabs.module.css'

export type LabTabId = 'problem' | 'sandbox'

type LabTabsProps = {
  problem: ReactNode
  sandbox: ReactNode
  defaultTab?: LabTabId
}

const TABS: { id: LabTabId; label: string }[] = [
  { id: 'problem', label: 'Решение проблемы' },
  { id: 'sandbox', label: 'Песочница' },
]

export function LabTabs({ problem, sandbox, defaultTab = 'problem' }: LabTabsProps) {
  const [tab, setTab] = useState<LabTabId>(defaultTab)
  const baseId = useId()

  return (
    <div className={styles.root}>
      <div className={styles.toggle} role="tablist" aria-label="Разделы лаборатории">
        {TABS.map(({ id, label }) => {
          const selected = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${baseId}-${id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${id}`}
              className={`${styles.tab} ${selected ? styles.active : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-problem`}
        aria-labelledby={`${baseId}-problem`}
        hidden={tab !== 'problem'}
        className={styles.panel}
      >
        {problem}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-sandbox`}
        aria-labelledby={`${baseId}-sandbox`}
        hidden={tab !== 'sandbox'}
        className={styles.panel}
      >
        {sandbox}
      </div>
    </div>
  )
}
