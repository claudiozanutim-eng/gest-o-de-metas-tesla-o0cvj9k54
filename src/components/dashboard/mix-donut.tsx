import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const COLORS = ['#003DA5', '#0066CC', '#4D94FF', '#80B5FF']
const nameMap: Record<string, string> = {
  F1: 'Fase 1',
  F2: 'Fase 2',
  F3: 'Fase 3',
  Outros: 'Fase 4',
}

export function MixDonutChart() {
  const { filteredActuals, productFamilies } = useDashboard()

  const { data, total } = useMemo(() => {
    const fams = new Map<string, number>()
    filteredActuals.forEach((a) => {
      if (['Faturamento', 'Revenue', 'Faturamento (Geral)'].includes(a.metric)) {
        const f = a.mix_family || 'Outros'
        const fName = nameMap[f] || f
        fams.set(fName, (fams.get(fName) || 0) + (a.actual_value || 0))
      }
    })
    const d = Array.from(fams.entries())
      .map(([name, value], idx) => ({ name, value, _key: `${name}-${idx}` }))
      .sort((a, b) => b.value - a.value)
    return { data: d, total: d.reduce((s, x) => s + x.value, 0) }
  }, [filteredActuals])

  return (
    <Card className="shadow-sm flex flex-col hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#003DA5] uppercase tracking-wider">
          Composição de Mix
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="70%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(value)
                  }
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
            {total > 0 && (
              <div className="space-y-1 mt-2 border-t pt-2">
                {data.map((d) => {
                  const code = Object.entries(nameMap).find(([, v]) => v === d.name)?.[0]
                  const pf = productFamilies.find((p) => p.code === code)
                  const targetPct = pf?.weight || 0
                  const actualPct = (d.value / total) * 100
                  return (
                    <div key={d._key} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{d.name}</span>
                      <span
                        className={cn(
                          'font-semibold',
                          Math.abs(actualPct - targetPct) < 5
                            ? 'text-emerald-600'
                            : 'text-[#0066CC]',
                        )}
                      >
                        {actualPct.toFixed(1)}% / Meta: {targetPct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem dados
          </div>
        )}
      </CardContent>
    </Card>
  )
}
