import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Target, Activity, Building2, PieChart } from 'lucide-react'
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

    const fams = new Map<string, number>()
    filteredActuals.forEach((a) => {
      if (a.mix_family) {
        fams.set(a.mix_family, (fams.get(a.mix_family) || 0) + (a.actual_value || 0))
      }
    })

    const totalMix = Array.from(fams.values()).reduce((a, b) => a + b, 0)

    const getPhasePct = (fam: string) => {
      const val = fams.get(fam) || 0
      return totalMix > 0 ? (val / totalMix) * 100 : 0
    }

    const phases = [
      { name: 'Fase 1', pct: getPhasePct('F1') },
      { name: 'Fase 2', pct: getPhasePct('F2') },
      { name: 'Fase 3', pct: getPhasePct('F3') },
      { name: 'Fase 4', pct: getPhasePct('Outros') },
    ]

    return { revActual, revGoal, achievement, covActual, covGoal, phases }
  }, [filteredActuals, filteredGoals])

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v)

  const formatNumber = (v: number) => new Intl.NumberFormat('pt-BR').format(v)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <KPICard
        title="Faturamento Realizado"
        value={formatCurrency(metrics.revActual)}
        icon={DollarSign}
        color="text-[#0072c6]"
        bgAccent="bg-[#0072c6]/10"
        borderColor="border-l-[#0072c6]"
      />
      <KPICard
        title="Meta de Faturamento"
        value={formatCurrency(metrics.revGoal)}
        icon={Target}
        color="text-[#004b87]"
        bgAccent="bg-[#004b87]/10"
        borderColor="border-l-[#004b87]"
      />
      <KPICard
        title="% Atingimento"
        value={`${metrics.achievement.toFixed(1)}%`}
        icon={Activity}
        color={metrics.achievement >= 100 ? 'text-emerald-600' : 'text-rose-600'}
        bgAccent={metrics.achievement >= 100 ? 'bg-emerald-600/10' : 'bg-rose-600/10'}
        borderColor={metrics.achievement >= 100 ? 'border-l-emerald-600' : 'border-l-rose-600'}
        subtitle="Vs Meta Base"
      />
      <KPICard
        title="Cobertura nas Empresas"
        value={formatNumber(metrics.covActual)}
        icon={Building2}
        color="text-[#002147]"
        bgAccent="bg-[#002147]/10"
        borderColor="border-l-[#002147]"
        subtitle={`Meta: ${formatNumber(metrics.covGoal)}`}
      />
      <Card className="border-l-4 border-l-[#00a3e0] shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 rounded-bl-3xl bg-[#00a3e0]/10 transition-all duration-300 group-hover:scale-110">
          <PieChart className="h-6 w-6 text-[#00a3e0]" strokeWidth={2} />
        </div>
        <CardContent className="p-4 flex flex-col justify-center h-full relative z-10">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Mix Principal
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-1">
            {metrics.phases.map((p, i) => (
              <div key={`phase-${p.name}-${i}`} className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  {p.name}
                </span>
                <span className="text-sm font-bold text-[#002147]">{p.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KPICard({ title, value, icon: Icon, color, bgAccent, borderColor, subtitle }: any) {
  return (
    <Card className={`border-l-4 ${borderColor} shadow-sm relative overflow-hidden group`}>
      <div
        className={`absolute top-0 right-0 p-4 rounded-bl-3xl ${bgAccent} transition-all duration-300 group-hover:scale-110`}
      >
        <Icon className={`h-6 w-6 ${color}`} strokeWidth={2} />
      </div>
      <CardContent className="p-4 flex flex-col justify-center h-full relative z-10">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3
          className="text-2xl lg:text-2xl xl:text-3xl font-bold text-[#002147] truncate tracking-tight"
          title={value}
        >
          {value}
        </h3>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
