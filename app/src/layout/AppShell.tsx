import { Outlet } from 'react-router-dom'
import { TopicSidebar } from './TopicSidebar'
import { useLayoutStore } from '../store/layout'
import styles from './AppShell.module.css'

export function AppShell() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)

  return (
    <div className={styles.shell}>
      <div className={styles.sidebarRail} data-open={sidebarOpen ? 'true' : 'false'}>
        <TopicSidebar onCollapse={() => setSidebarOpen(false)} />
      </div>

      <main className={styles.main}>
        {!sidebarOpen ? (
          <button
            type="button"
            className={styles.sidebarReveal}
            onClick={() => setSidebarOpen(true)}
            aria-label="Показать список тем"
            title="Показать список тем"
          >
            <span aria-hidden>«</span>
          </button>
        ) : null}
        <div className={styles.mainBody}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
