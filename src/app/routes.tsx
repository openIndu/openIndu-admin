import { Navigate, createBrowserRouter } from 'react-router'
import { AdminGuard } from './components/AdminGuard'
import { AuthGuard } from './components/AuthGuard'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { UsersPage } from './pages/users/UsersPage'
import { UserDetail } from './pages/users/UserDetail'
import { DocumentList } from './pages/documents/DocumentList'
import { DocumentUpload } from './pages/documents/DocumentUpload'
import { SoftwareList } from './pages/software/SoftwareList'
import { SoftwareUpload } from './pages/software/SoftwareUpload'
import { SettingsView } from './pages/settings/SettingsView'
import { TagsView } from './pages/settings/TagsView'
import { OnlineStats } from './pages/stats/OnlineStats'
import { AuditLogs } from './pages/stats/AuditLogs'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          {
            element: <AdminGuard />,
            children: [
              { path: '/users', element: <UsersPage /> },
              { path: '/users/:id', element: <UserDetail /> },
              { path: '/documents', element: <DocumentList /> },
              { path: '/documents/upload', element: <DocumentUpload /> },
              { path: '/software', element: <SoftwareList /> },
              { path: '/software/upload', element: <SoftwareUpload /> },
              { path: '/settings', element: <SettingsView /> },
              { path: '/settings/tags', element: <TagsView /> },
              { path: '/stats', element: <OnlineStats /> },
              { path: '/stats/audit', element: <AuditLogs /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
