import { Outlet } from 'react-router-dom'
import { TopicSidebar } from './TopicSidebar'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.shell}>
      <TopicSidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
