import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function getProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 80) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getTextColor(pct: number): string {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 80) return 'text-yellow-600'
  return 'text-red-600'
}

interface Props {
  totalActual: number
  totalTarget: number
  metricType: 'faturamento' | 'cobertura'
}

export function ConsolidatedCard({ totalActual, totalTarget, metricType }: Props) {
  const pct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0
  const isCoverage = metricType === 'cobertura'

  const fmtValue = (v: number) => {
    if (isCoverage) return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v)
  }

  return (
    <Card className="border-l-4 border-l-[#003DA5] shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#003DA5] uppercase tracking-wider">
              {isCoverage ? 'Cobertura Total' : 'Faturamento Total'}
            </h2>
            <span className={cn('text-2xl font-extrabold', getTextColor(pct))}>
              {pct.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Realizado</p>
              <p className="text-xl font-bold text-[#0066CC]">{fmtValue(totalActual)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Meta Base</p>
              <p className="text-xl font-bold text-[#003DA5]">{fmtValue(totalTarget)}</p>
            </div>
          </div>
          <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                getProgressColor(pct),
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
