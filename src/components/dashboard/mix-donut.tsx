import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'

const COLORS = ['#002147', '#004b87', '#0072c6', '#00a3e0', '#6ba4d8', '#a1c6ea']

export function MixDonutChart() {
  const { filteredActuals } = useDashboard()

  const data = useMemo(() => {
    const fams = new Map<string, number>()

    const nameMap: Record<string, string> = {
      F1: 'Fase 1',
      F2: 'Fase 2',
      F3: 'Fase 3',
      Outros: 'Fase 4',
    }

    filteredActuals.forEach((a) => {
      if (['Faturamento', 'Revenue'].includes(a.metric)) {
        const f = a.mix_family || 'Outros'
        const fName = nameMap[f] || f
        fams.set(fName, (fams.get(fName) || 0) + (a.actual_value || 0))
      }
    })
    return Array.from(fams.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredActuals])

  return (
    <Card className="shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#002147] uppercase tracking-wider">
          Composição de Mix
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
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
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    value,
                  )
                }
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem dados
          </div>
        )}
      </CardContent>
    </Card>
  )
}
