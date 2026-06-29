import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DollarSign, Target, Activity } from 'lucide-react'

function getColor(pct: number): string {
  if (pct >= 100) return '#10b981'
  if (pct >= 80) return '#f59e0b'
  return '#ef4444'
}

function getBgColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 80) return 'bg-yellow-500'
  return 'bg-red-500'
}

interface Props {
  totalActual: number
  totalTarget: number
  achievementPct: number
  isCoverage: boolean
}

export function ReportsSummaryCards({
  totalActual,
  totalTarget,
  achievementPct,
  isCoverage,
}: Props) {
  const fmt = (v: number) => {
    if (isCoverage) return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v)
  }
  const color = getColor(achievementPct)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card
        className="border-l-4 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up"
        style={{ borderLeftColor: '#0066CC' }}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-[#0066CC]/10">
              <DollarSign className="w-5 h-5 text-[#0066CC]" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isCoverage ? 'Cobertura Realizada' : 'Faturamento Realizado'}
            </p>
          </div>
          <p className="text-2xl font-extrabold text-[#003DA5]">{fmt(totalActual)}</p>
        </CardContent>
      </Card>
      <Card
        className="border-l-4 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up"
        style={{ borderLeftColor: '#003DA5', animationDelay: '75ms' }}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-[#003DA5]/10">
              <Target className="w-5 h-5 text-[#003DA5]" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Meta Base Total
            </p>
          </div>
          <p className="text-2xl font-extrabold text-[#003DA5]">{fmt(totalTarget)}</p>
        </CardContent>
      </Card>
      <Card
        className="border-l-4 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up"
        style={{ borderLeftColor: color, animationDelay: '150ms' }}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
              <Activity className="w-5 h-5" style={{ color }} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              % Atingimento
            </p>
          </div>
          <p className="text-2xl font-extrabold" style={{ color }}>
            {achievementPct.toFixed(1)}%
          </p>
          <div className="mt-3 w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                getBgColor(achievementPct),
              )}
              style={{ width: `${Math.min(achievementPct, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
