import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, PieChart, MapPin, TrendingUp, TrendingDown } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)

const fmtNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v)

const isRevenue = (m: string) => ['Faturamento', 'Revenue', 'Faturamento (Geral)'].includes(m)
const isMix = (m: string) => m.startsWith('Mix_')
const isCoverage = (m: string) => m === 'Coverage'

export function ComparativeCards() {
  const { filteredActuals, filteredGoals } = useDashboard()

  const pillars = useMemo(() => {
    const calc = (pred: (m: string) => boolean) => {
      const target = filteredGoals
        .filter((g) => pred(g.metric))
        .reduce((s, g) => s + (g.target_base || 0), 0)
      const actual = filteredActuals
        .filter((a) => pred(a.metric))
        .reduce((s, a) => s + (a.actual_value || 0), 0)
      const diff = actual - target
      const pct = target > 0 ? (actual / target) * 100 : 0
      return { target, actual, diff, pct }
    }
    return {
      revenue: calc(isRevenue),
      mix: calc(isMix),
      coverage: calc(isCoverage),
    }
  }, [filteredActuals, filteredGoals])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <PillarCard
        title="Faturamento"
        icon={DollarSign}
        data={pillars.revenue}
        formatFn={fmtCurrency}
        delay={0}
      />
      <PillarCard
        title="Mix de Produtos"
        icon={PieChart}
        data={pillars.mix}
        formatFn={fmtCurrency}
        delay={75}
      />
      <PillarCard
        title="Cobertura"
        icon={MapPin}
        data={pillars.coverage}
        formatFn={fmtNum}
        delay={150}
        isCoverage
      />
    </div>
  )
}

function PillarCard({
  title,
  icon: Icon,
  data,
  formatFn,
  delay,
  isCoverage,
}: {
  title: string
  icon: any
  data: { target: number; actual: number; diff: number; pct: number }
  formatFn: (v: number) => string
  delay: number
  isCoverage?: boolean
}) {
  const isPositive = data.pct >= 100
  return (
    <Card
      className="border-l-4 border-l-[#003DA5] shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-[#E6F0FF] shrink-0">
              <Icon className="w-5 h-5 text-[#003DA5]" />
            </div>
            <span className="text-sm font-bold text-[#003DA5] uppercase tracking-wider truncate">
              {title}
            </span>
          </div>
          <div
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0',
              isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {data.pct.toFixed(1)}
            {!isCoverage && '%'}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-2">
          <div className="flex-1 flex flex-col gap-1 sm:px-2 sm:border-r sm:border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
              Meta
            </p>
            <p className="text-base md:text-lg font-extrabold text-[#003DA5] leading-tight break-words">
              {formatFn(data.target)}
            </p>
          </div>
          <div className="flex-1 flex flex-col gap-1 sm:px-2 sm:border-r sm:border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
              Realizado
            </p>
            <p className="text-base md:text-lg font-extrabold text-[#0066CC] leading-tight break-words">
              {formatFn(data.actual)}
            </p>
          </div>
          <div className="flex-1 flex flex-col gap-1 sm:px-2">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
              Diferença
            </p>
            <p
              className={cn(
                'text-base md:text-lg font-extrabold leading-tight break-words',
                data.diff >= 0 ? 'text-emerald-600' : 'text-red-500',
              )}
            >
              {data.diff >= 0 ? '+' : ''}
              {formatFn(data.diff)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
