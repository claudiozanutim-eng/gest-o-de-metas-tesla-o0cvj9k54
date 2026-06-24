import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import Reports from './pages/reports/Reports'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
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
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
