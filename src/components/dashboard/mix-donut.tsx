import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'

const COLORS: Record<string, string> = {
  'Fase 1': '#003DA5',
  'Fase 2': '#0066CC',
  'Fase 3': '#4D94FF',
  Outros: '#80B5FF',
}
const COLOR_ARRAY = Object.values(COLORS)
const nameMap: Record<string, string> = {
  F1: 'Fase 1',
  F2: 'Fase 2',
  F3: 'Fase 3',
  Outros: 'Outros',
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

  const getColor = (name: string) => COLORS[name] || COLOR_ARRAY[3]

  return (
    <Card className="shadow-sm flex flex-col hover:shadow-md transition-all duration-300 min-h-[250px]">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-bold text-[#003DA5] uppercase tracking-wider">
          Composição de Mix
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-4 pb-4 gap-3">
        {data.length > 0 ? (
          <>
            <div className="w-full h-[160px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((d, index) => (
                      <Cell key={`cell-${d._key}`} fill={getColor(d.name)} />
                    ))}
                  </Pie>
                  <RTooltip formatter={(value: number) => fmtCur(value)} />
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 border-t pt-3">
              {data.map((d) => {
                const code = Object.entries(nameMap).find(([, v]) => v === d.name)?.[0]
                const pf = productFamilies.find((p) => p.code === code)
                const targetPct = pf?.weight || 0
                const actualPct = total > 0 ? (d.value / total) * 100 : 0
                const barColor = getColor(d.name)
                const withinTarget = Math.abs(actualPct - targetPct) < 5
                return (
                  <Tooltip key={d._key}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-muted-foreground font-medium">{d.name}</span>
                          <span
                            className="font-bold"
                            style={{ color: withinTarget ? '#10b981' : barColor }}
                          >
                            {actualPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative h-2.5 rounded-full bg-muted overflow-visible">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(actualPct, 100)}%`,
                              backgroundColor: barColor,
                            }}
                          />
                          {targetPct > 0 && (
                            <div
                              className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-foreground/60 rounded-full transition-all duration-300"
                              style={{ left: `calc(${Math.min(targetPct, 100)}% - 1px)` }}
                            />
                          )}
                        </div>
                        {targetPct > 0 && (
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                            <span>Realizado</span>
                            <span>Meta: {targetPct}%</span>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{d.name}</p>
                      <p>Realizado: {actualPct.toFixed(1)}%</p>
                      <p>Meta: {targetPct}%</p>
                      <p>Valor: {fmtCur(d.value)}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Sem dados
          </div>
        )}
      </CardContent>
    </Card>
  )
}
