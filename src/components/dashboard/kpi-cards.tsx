import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Target, Activity, LayoutGrid } from 'lucide-react'
import { useMemo } from 'react'

export function DashboardKPIs() {
  const { filteredActuals, filteredGoals } = useDashboard()

  const metrics = useMemo(() => {
    const isRevenue = (m: string) => ['Faturamento', 'Revenue'].includes(m)

    const revActual = filteredActuals
      .filter((a) => isRevenue(a.metric))
      .reduce((sum, a) => sum + (a.actual_value || 0), 0)
    const revGoal = filteredGoals
      .filter((g) => isRevenue(g.metric))
      .reduce((sum, g) => sum + (g.target_base || 0), 0)

    const achievement = revGoal > 0 ? (revActual / revGoal) * 100 : 0

    const covActual = filteredActuals.reduce((sum, a) => sum + (a.focus_companies || 0), 0)
    const covGoal = filteredGoals.reduce((sum, g) => sum + (g.focus_companies || 0), 0)
    const coverage = covGoal > 0 ? (covActual / covGoal) * 100 : 0

    const fams = new Map<string, number>()
    filteredActuals.forEach((a) => {
      if (a.mix_family) {
        fams.set(a.mix_family, (fams.get(a.mix_family) || 0) + (a.actual_value || 0))
      }
    })
    const sortedFams = Array.from(fams.entries()).sort((a, b) => b[1] - a[1])
    const topFam = sortedFams[0]
    const totalMix = sortedFams.reduce((sum, [, val]) => sum + val, 0)
    const mixPart = totalMix > 0 && topFam ? (topFam[1] / totalMix) * 100 : 0
    const mixLabel = topFam ? `${topFam[0]} Lidera` : 'N/A'

    return { revActual, revGoal, achievement, coverage, mixPart, mixLabel }
  }, [filteredActuals, filteredGoals])

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <KPICard
        title="Faturamento Realizado"
        value={formatCurrency(metrics.revActual)}
        icon={DollarSign}
        trend={metrics.achievement >= 100 ? 'positive' : 'negative'}
      />
      <KPICard
        title="Meta de Faturamento"
        value={formatCurrency(metrics.revGoal)}
        icon={Target}
        color="text-[#004b87]"
      />
      <KPICard
        title="% Atingimento"
        value={`${metrics.achievement.toFixed(1)}%`}
        icon={Activity}
        trend={metrics.achievement >= 100 ? 'positive' : 'negative'}
        subtitle="Vs Meta Base"
      />
      <KPICard
        title="Cobertura (Empresas)"
        value={`${metrics.coverage.toFixed(1)}%`}
        icon={LayoutGrid}
        trend={metrics.coverage >= 80 ? 'positive' : 'neutral'}
      />
      <KPICard
        title="Mix Principal"
        value={`${metrics.mixPart.toFixed(1)}%`}
        icon={LayoutGrid}
        color="text-[#0072c6]"
        subtitle={metrics.mixLabel}
      />
    </div>
  )
}

function KPICard({ title, value, icon: Icon, trend, color, subtitle }: any) {
  const trendColor =
    trend === 'positive'
      ? 'text-emerald-600'
      : trend === 'negative'
        ? 'text-rose-600'
        : 'text-slate-600'
  const iconColor = color || trendColor

  return (
    <Card className="border-l-4 border-l-[#004b87] shadow-sm">
      <CardContent className="p-4 flex flex-col justify-center h-full">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <h3 className="text-2xl font-bold text-[#002147] truncate" title={value}>
          {value}
        </h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
