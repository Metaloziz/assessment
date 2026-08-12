import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { ApiSmokePage } from './pages/ApiSmokePage'
import { TopicListPage } from './pages/TopicListPage'
import { TopicPage } from './pages/TopicPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TopicListPage />} />
          <Route path="topics/:topicId" element={<TopicPage />} />
          <Route path="dev/api-smoke" element={<ApiSmokePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
