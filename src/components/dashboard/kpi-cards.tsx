import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DollarSign, Target, Activity, Building2, PieChart } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { AutoScaleText } from './auto-scale-text'
import { getTierColor, getTierName } from '@/lib/tier-utils'

const REVENUE_METRICS = ['Faturamento', 'Revenue', 'Faturamento (Geral)']
const PHASE_NAMES: Record<string, string> = {
  F1: 'Fase 1',
  F2: 'Fase 2',
  F3: 'Fase 3',
  Outros: 'Outros',
}
const PHASE_COLORS: Record<string, string> = {
  F1: '#003DA5',
  F2: '#0066CC',
  F3: '#4D94FF',
  Outros: '#80B5FF',
}

export function DashboardKPIs() {
  const { filteredActuals, filteredGoals, commissionTiers, productFamilies } = useDashboard()

  const m = useMemo(() => {
    const revActual = filteredActuals
      .filter((a) => REVENUE_METRICS.includes(a.metric))
      .reduce((s, a) => s + (a.actual_value || 0), 0)
    const revGoal = filteredGoals
      .filter((g) => REVENUE_METRICS.includes(g.metric))
      .reduce((s, g) => s + (g.target_base || 0), 0)
    const achievement = revGoal > 0 ? (revActual / revGoal) * 100 : 0

    const covActual = filteredActuals
      .filter((a) => a.metric === 'Coverage')
      .reduce((s, a) => s + (a.actual_coverage || a.actual_value || 0), 0)
    const covGoal = filteredGoals
      .filter((g) => g.metric === 'Coverage')
      .reduce((s, g) => s + (g.target_monthly_coverage || g.target_base || 0), 0)
    const covAch = covGoal > 0 ? (covActual / covGoal) * 100 : 0

    const fams = new Map<string, number>()
    filteredActuals.forEach((a) => {
      if (a.mix_family)
        fams.set(a.mix_family, (fams.get(a.mix_family) || 0) + (a.actual_value || 0))
    })
    const totalMix = Array.from(fams.values()).reduce((a, b) => a + b, 0)
    const phases = ['F1', 'F2', 'F3', 'Outros'].map((code) => ({
      code,
      name: PHASE_NAMES[code],
      pct: totalMix > 0 ? ((fams.get(code) || 0) / totalMix) * 100 : 0,
      value: fams.get(code) || 0,
    }))

    return { revActual, revGoal, achievement, covActual, covGoal, covAch, phases, totalMix }
  }, [filteredActuals, filteredGoals])

  const fmtCur = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v)
  const achColor = getTierColor(commissionTiers, m.achievement)
  const covColor = getTierColor(commissionTiers, m.covAch)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      <KPICard title="Faturamento Realizado" icon={DollarSign} color="#0066CC" delay={0}>
        <AutoScaleText
          value={fmtCur(m.revActual)}
          maxSize={26}
          minSize={13}
          className="font-extrabold text-[#003DA5] tracking-tight"
        />
      </KPICard>
      <KPICard title="Meta de Faturamento" icon={Target} color="#003DA5" delay={75}>
        <AutoScaleText
          value={fmtCur(m.revGoal)}
          maxSize={26}
          minSize={13}
          className="font-extrabold text-[#003DA5] tracking-tight"
        />
      </KPICard>
      <KPICard
        title="Atingimento"
        icon={Activity}
        color={achColor}
        delay={150}
        tier={getTierName(commissionTiers, m.achievement)}
      >
        <span
          className="text-2xl lg:text-3xl font-extrabold tracking-tight block mb-2"
          style={{ color: achColor }}
        >
          {m.achievement.toFixed(1)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full cursor-help">
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(m.achievement, 100)}%`, backgroundColor: achColor }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">
              {getTierName(commissionTiers, m.achievement) || 'Sem faixa'}
            </p>
            <p>Realizado: {fmtCur(m.revActual)}</p>
            <p>Meta: {fmtCur(m.revGoal)}</p>
            <p>Atingimento: {m.achievement.toFixed(1)}%</p>
          </TooltipContent>
        </Tooltip>
      </KPICard>
      <KPICard
        title="Ating. Cobertura"
        icon={Building2}
        color={covColor}
        delay={225}
        tier={getTierName(commissionTiers, m.covAch)}
      >
        <span
          className="text-2xl lg:text-3xl font-extrabold tracking-tight block mb-2"
          style={{ color: covColor }}
        >
          {m.covAch.toFixed(1)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full cursor-help">
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(m.covAch, 100)}%`, backgroundColor: covColor }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{getTierName(commissionTiers, m.covAch) || 'Sem faixa'}</p>
            <p>Realizado: {m.covActual.toFixed(1)}</p>
            <p>Meta: {m.covGoal.toFixed(1)}</p>
            <p>Atingimento: {m.covAch.toFixed(1)}%</p>
          </TooltipContent>
        </Tooltip>
      </KPICard>
      <Card
        className="shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 animate-fade-in-up border-l-4"
        style={{ animationDelay: '300ms', borderLeftColor: '#4D94FF' }}
      >
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-[#4D94FF]/10 shrink-0">
              <PieChart className="h-4 w-4 text-[#4D94FF]" strokeWidth={2} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mix Principal
            </p>
          </div>
          <div className="space-y-2 flex-1 flex flex-col justify-center">
            {m.phases.map((p) => {
              const pf = productFamilies.find((f) => f.code === p.code)
              const targetPct = pf?.weight || 0
              const isOnTarget = targetPct > 0 && Math.abs(p.pct - targetPct) < 5
              return (
                <Tooltip key={p.code}>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <div className="flex justify-between items-center text-[10px] mb-0.5">
                        <span className="font-medium text-muted-foreground">{p.name}</span>
                        <span
                          className="font-bold"
                          style={{ color: isOnTarget ? '#10b981' : '#003DA5' }}
                        >
                          {p.pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="absolute h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(p.pct, 100)}%`,
                            backgroundColor: PHASE_COLORS[p.code],
                          }}
                        />
                        {targetPct > 0 && (
                          <div
                            className="absolute top-[-2px] bottom-[-2px] w-1 rounded-full bg-foreground/50 transition-all duration-300"
                            style={{ left: `calc(${Math.min(targetPct, 100)}% - 2px)` }}
                          />
                        )}
                      </div>
                      {targetPct > 0 && (
                        <div className="flex justify-between items-center text-[8px] text-muted-foreground mt-0.5">
                          <span>Realizado</span>
                          <span>Meta: {targetPct}%</span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{p.name}</p>
                    <p>Realizado: {p.pct.toFixed(1)}%</p>
                    {targetPct > 0 && <p>Meta: {targetPct}%</p>}
                    <p>Valor: {fmtCur(p.value)}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KPICard({
  title,
  icon: Icon,
  color,
  delay,
  tier,
  children,
}: {
  title: string
  icon: any
  color: string
  delay: number
  tier?: string
  children: ReactNode
}) {
  return (
    <Card
      className="shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 animate-fade-in-up border-l-4"
      style={{ animationDelay: `${delay}ms`, borderLeftColor: color }}
    >
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-4 w-4" strokeWidth={2} style={{ color }} />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate flex-1">
            {title}
          </p>
          {tier && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {tier}
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-end">{children}</div>
      </CardContent>
    </Card>
  )
}
