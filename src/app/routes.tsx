import { Navigate, createBrowserRouter } from 'react-router'
import { AdminGuard } from './components/AdminGuard'
import { AuthGuard } from './components/AuthGuard'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { HeroManager } from './pages/content/HeroManager'
import { SolutionsManager } from './pages/content/SolutionsManager'
import { CarouselManager } from './pages/content/CarouselManager'
import { BenefitsManager } from './pages/content/BenefitsManager'
import { FooterManager } from './pages/content/FooterManager'
import { UserList } from './pages/users/UserList'
import { UserDetail } from './pages/users/UserDetail'
import { DocumentList } from './pages/documents/DocumentList'
import { DocumentUpload } from './pages/documents/DocumentUpload'
import { SoftwareList } from './pages/software/SoftwareList'
import { SoftwareUpload } from './pages/software/SoftwareUpload'
import { SettingsView } from './pages/settings/SettingsView'

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
              { path: '/content', element: <Navigate to="/content/hero" replace /> },
              { path: '/content/hero', element: <HeroManager /> },
              { path: '/content/solutions', element: <SolutionsManager /> },
              { path: '/content/carousel', element: <CarouselManager /> },
              { path: '/content/benefits', element: <BenefitsManager /> },
              { path: '/content/footer', element: <FooterManager /> },
              { path: '/users', element: <UserList /> },
              { path: '/users/:id', element: <UserDetail /> },
              { path: '/documents', element: <DocumentList /> },
              { path: '/documents/upload', element: <DocumentUpload /> },
              { path: '/software', element: <SoftwareList /> },
              { path: '/software/upload', element: <SoftwareUpload /> },
              { path: '/settings', element: <SettingsView /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
