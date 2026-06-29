import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'

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

  const fmtCur = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

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
            <ResponsiveContainer width="100%" height="50%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip formatter={(value: number) => fmtCur(value)} />
                <Legend verticalAlign="bottom" height={28} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-3 border-t pt-2">
              {data.map((d) => {
                const code = Object.entries(nameMap).find(([, v]) => v === d.name)?.[0]
                const pf = productFamilies.find((p) => p.code === code)
                const targetPct = pf?.weight || 0
                const actualPct = total > 0 ? (d.value / total) * 100 : 0
                const colorIdx = code ? Object.keys(nameMap).indexOf(code) : 3
                const barColor = COLORS[colorIdx >= 0 ? colorIdx : 3]
                return (
                  <Tooltip key={d._key}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="flex justify-between items-center text-xs mb-0.5">
                          <span className="text-muted-foreground">{d.name}</span>
                          <span
                            className="font-semibold"
                            style={{
                              color: Math.abs(actualPct - targetPct) < 5 ? '#10b981' : barColor,
                            }}
                          >
                            {actualPct.toFixed(1)}% / Meta: {targetPct}%
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="absolute h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(actualPct, 100)}%`,
                              backgroundColor: barColor,
                            }}
                          />
                          {targetPct > 0 && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                              style={{ left: `${Math.min(targetPct, 100)}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{d.name}</p>
                      <p>Atual: {actualPct.toFixed(1)}%</p>
                      <p>Meta: {targetPct}%</p>
                      <p>Valor: {fmtCur(d.value)}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
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
