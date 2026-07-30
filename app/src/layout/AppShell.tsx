import { Outlet } from 'react-router-dom'
import { TopicSidebar } from './TopicSidebar'
import { useLayoutStore } from '../store/layout'
import styles from './AppShell.module.css'

export function AppShell() {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const labFocus = useLayoutStore((s) => s.labFocus)
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen)
  const showSidebar = sidebarOpen && !labFocus

  return (
    <div className={styles.shell} data-lab-focus={labFocus ? 'true' : 'false'}>
      <div className={styles.sidebarRail} data-open={showSidebar ? 'true' : 'false'}>
        <TopicSidebar onCollapse={() => setSidebarOpen(false)} />
      </div>

      <main className={styles.main}>
        {!showSidebar && !labFocus ? (
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
