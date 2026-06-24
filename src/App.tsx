import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import GoalEntry from './pages/goals/GoalEntry'
import Tracking from './pages/tracking/Tracking'
import Simulation from './pages/simulation/Simulation'
import Assistant from './pages/assistant/Assistant'
import Users from './pages/admin/Users'
import Structure from './pages/admin/Structure'
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

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/metas" element={<GoalEntry />} />
              <Route path="/acompanhamento" element={<Tracking />} />
              <Route path="/simulacao" element={<Simulation />} />
              <Route path="/assistente" element={<Assistant />} />
              <Route path="/relatorios" element={<Reports />} />

              <Route path="/admin">
                <Route path="usuarios" element={<Users />} />
                <Route path="estrutura" element={<Structure />} />
                <Route path="parametros" element={<Parameters />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
