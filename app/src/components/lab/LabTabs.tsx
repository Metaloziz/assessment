import { useId, useState, type ReactNode } from 'react'
import styles from './LabTabs.module.css'

export type LabTabId = 'problem' | 'sandbox' | 'code'

type LabTabsProps = {
  problem: ReactNode
  /** If omitted, «Песочница» tab is hidden (pilot 2-tab labs). */
  sandbox?: ReactNode
  code: ReactNode
  defaultTab?: LabTabId
}

const ALL_TABS: { id: LabTabId; label: string }[] = [
  { id: 'code', label: 'Код' },
  { id: 'problem', label: 'Решение проблемы' },
  { id: 'sandbox', label: 'Песочница' },
]

export function LabTabs({ problem, sandbox, code, defaultTab = 'code' }: LabTabsProps) {
  const hasSandbox = sandbox !== undefined && sandbox !== null
  const tabs = hasSandbox ? ALL_TABS : ALL_TABS.filter((t) => t.id !== 'sandbox')
  const initial =
    defaultTab === 'sandbox' && !hasSandbox ? 'code' : defaultTab
  const [tab, setTab] = useState<LabTabId>(initial)
  const baseId = useId()
  const active = tab === 'sandbox' && !hasSandbox ? 'code' : tab

  return (
    <div className={styles.root}>
      <div
        className={`${styles.toggle} ${hasSandbox ? styles.toggle3 : styles.toggle2}`}
        role="tablist"
        aria-label="Разделы лаборатории"
      >
        {tabs.map(({ id, label }) => {
          const selected = active === id
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
        id={`${baseId}-panel-code`}
        aria-labelledby={`${baseId}-code`}
        hidden={active !== 'code'}
        className={styles.panel}
      >
        {code}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-problem`}
        aria-labelledby={`${baseId}-problem`}
        hidden={active !== 'problem'}
        className={styles.panel}
      >
        {problem}
      </div>
      {hasSandbox ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-sandbox`}
          aria-labelledby={`${baseId}-sandbox`}
          hidden={active !== 'sandbox'}
          className={styles.panel}
        >
          {sandbox}
        </div>
      ) : null}
    </div>
  )
}
