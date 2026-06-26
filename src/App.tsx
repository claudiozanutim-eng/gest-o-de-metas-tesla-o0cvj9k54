import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import { ThemeProvider } from './components/theme-provider'
import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import GoalEntry from './pages/goals/GoalEntry'
import Tracking from './pages/tracking/Tracking'
import Simulation from './pages/simulation/Simulation'
import Assistant from './pages/assistant/Assistant'
import Users from './pages/admin/Users'
import Structure from './pages/admin/Structure'
import Districts from './pages/admin/Districts'
import Regionals from './pages/admin/Regionals'
import Areas from './pages/admin/Areas'
import Sellers from './pages/admin/Sellers'
import Importacao from './pages/admin/Importacao'
import Auditoria from './pages/admin/Auditoria'
import Parameters from './pages/admin/Parameters'
import Reports from './pages/reports/Reports'
import Login from './pages/auth/Login'
import { AuthProvider, useAuth } from './hooks/use-auth'

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

const SuperAdminRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user?.role !== 'Administrator' && user?.role !== 'National Manager') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

const AdminRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user?.role === 'Seller' || user?.role === 'Sales Assistant') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

const NonSellerRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user?.role === 'Seller') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/metas" element={<GoalEntry />} />
                <Route path="/simulacao" element={<Simulation />} />

                <Route element={<NonSellerRoute />}>
                  <Route path="/acompanhamento" element={<Tracking />} />
                  <Route path="/assistente" element={<Assistant />} />
                  <Route path="/relatorios" element={<Reports />} />
                </Route>

                <Route element={<AdminRoute />}>
                  <Route path="/admin">
                    <Route path="estrutura" element={<Structure />} />
                    <Route path="distritos" element={<Districts />} />
                    <Route path="regionais" element={<Regionals />} />
                    <Route path="areas" element={<Areas />} />
                    <Route path="vendedores" element={<Sellers />} />
                    <Route path="auditoria" element={<Auditoria />} />

                    <Route element={<SuperAdminRoute />}>
                      <Route path="usuarios" element={<Users />} />
                      <Route path="importacao" element={<Importacao />} />
                      <Route path="parametros" element={<Parameters />} />
                    </Route>
                  </Route>
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
