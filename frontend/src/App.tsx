import { Navigate, Route, Routes } from 'react-router'

import { Layout } from './layout/Layout.tsx'
import { AboutPage } from './pages/AboutPage.tsx'
import { ComingSoonPage } from './pages/ComingSoonPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { RecordPage } from './pages/RecordPage.tsx'

function App() {
  return (
    <Routes>
      {/* Layout has no path: it wraps every page with the nav and renders the page in its <Outlet />. */}
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/record" replace />} />
        <Route path="record" element={<RecordPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="account" element={<ComingSoonPage title="Account" />} />
        <Route path="login" element={<ComingSoonPage title="Log in" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
