import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DollarSign, PieChart, MapPin, TrendingUp, TrendingDown } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { AutoScaleText } from './auto-scale-text'
import { getTierColor, getTierName } from '@/lib/tier-utils'

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
  const { filteredActuals, filteredGoals, commissionTiers } = useDashboard()

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
    return { revenue: calc(isRevenue), mix: calc(isMix), coverage: calc(isCoverage) }
  }, [filteredActuals, filteredGoals])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <PillarCard
        title="Faturamento"
        icon={DollarSign}
        data={pillars.revenue}
        formatFn={fmtCurrency}
        tiers={commissionTiers}
        delay={0}
      />
      <PillarCard
        title="Mix de Produtos"
        icon={PieChart}
        data={pillars.mix}
        formatFn={fmtCurrency}
        tiers={commissionTiers}
        delay={75}
      />
      <PillarCard
        title="Cobertura"
        icon={MapPin}
        data={pillars.coverage}
        formatFn={fmtNum}
        tiers={commissionTiers}
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
  tiers,
}: {
  title: string
  icon: any
  data: { target: number; actual: number; diff: number; pct: number }
  formatFn: (v: number) => string
  delay: number
  isCoverage?: boolean
  tiers: any[]
}) {
  const isPositive = data.pct >= 100
  const tierColor = getTierColor(tiers, data.pct)
  const tierName = getTierName(tiers, data.pct)

  return (
    <Card
      className="border-l-4 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${delay}ms`, borderLeftColor: tierColor }}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-[#E6F0FF] shrink-0">
              <Icon className="w-5 h-5 text-[#003DA5]" />
            </div>
            <span className="text-sm font-bold text-[#003DA5] uppercase tracking-wider truncate">
              {title}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 cursor-help',
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
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{tierName || 'Sem faixa'}</p>
              <p>Meta: {formatFn(data.target)}</p>
              <p>Realizado: {formatFn(data.actual)}</p>
              <p>
                Diferença: {data.diff >= 0 ? '+' : ''}
                {formatFn(data.diff)}
              </p>
              <p>
                Atingimento: {data.pct.toFixed(1)}
                {!isCoverage && '%'}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(data.pct, 100)}%`, backgroundColor: tierColor }}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-2">
          <div className="flex-1 flex flex-col gap-1 sm:px-2 sm:border-r sm:border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
              Meta
            </p>
            <AutoScaleText
              value={formatFn(data.target)}
              maxSize={18}
              minSize={11}
              className="font-extrabold text-[#003DA5] leading-tight"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1 sm:px-2 sm:border-r sm:border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
              Realizado
            </p>
            <AutoScaleText
              value={formatFn(data.actual)}
              maxSize={18}
              minSize={11}
              className="font-extrabold text-[#0066CC] leading-tight"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1 sm:px-2">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
              Diferença
            </p>
            <AutoScaleText
              value={`${data.diff >= 0 ? '+' : ''}${formatFn(data.diff)}`}
              maxSize={18}
              minSize={11}
              className={cn(
                'font-extrabold leading-tight',
                data.diff >= 0 ? 'text-emerald-600' : 'text-red-500',
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
