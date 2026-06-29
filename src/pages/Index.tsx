import { DashboardProvider, useDashboard } from '@/hooks/use-dashboard'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardKPIs } from '@/components/dashboard/kpi-cards'
import { ComparativeCards } from '@/components/dashboard/comparative-cards'
import { TruckRanking } from '@/components/dashboard/truck-ranking'
import { MixDonutChart } from '@/components/dashboard/mix-donut'
import { ProductsRanking } from '@/components/dashboard/products-ranking'
import { BrazilMap } from '@/components/dashboard/brazil-map'
import { TrendLineChart } from '@/components/dashboard/trend-line'
import { Activity } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

function DashboardContent() {
  const { isLoading, actuals, goals } = useDashboard()

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando dashboard...
      </div>
    )
  }

  if (actuals.length === 0 && goals.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Activity}
          title="Nenhum dado encontrado"
          description="O dashboard precisa de dados de metas e desempenho para ser exibido. Importe os dados no menu de administração."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader />
      <DashboardKPIs />
      <ComparativeCards />
      <TruckRanking />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MixDonutChart />
        <ProductsRanking />
        <TrendLineChart />
      </div>
      <div className="pb-8">
        <BrazilMap />
      </div>
    </div>
  )
}

export default function Index() {
  return (
    <DashboardProvider>
      <div className="p-4 md:p-8 bg-background min-h-screen">
        <DashboardContent />
      </div>
    </DashboardProvider>
  )
}
