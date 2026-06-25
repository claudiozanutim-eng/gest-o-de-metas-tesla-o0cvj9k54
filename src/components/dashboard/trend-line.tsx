import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useMemo } from 'react'

export function TrendLineChart() {
  const { filteredActuals, filteredGoals } = useDashboard()

  const data = useMemo(() => {
    const periods = new Set<string>()
    filteredActuals.forEach((a) => periods.add(a.period))
    filteredGoals.forEach((g) => periods.add(g.period))

    const sortedPeriods = Array.from(periods).sort()

    return sortedPeriods.map((p) => {
      const acts = filteredActuals.filter(
        (a) => a.period === p && ['Faturamento', 'Revenue'].includes(a.metric),
      )
      const gls = filteredGoals.filter(
        (g) => g.period === p && ['Faturamento', 'Revenue'].includes(g.metric),
      )

      return {
        period: p,
        Realizado: acts.reduce((sum, a) => sum + (a.actual_value || 0), 0),
        Meta: gls.reduce((sum, g) => sum + (g.target_base || 0), 0),
      }
    })
  }, [filteredActuals, filteredGoals])

  return (
    <Card className="shadow-sm flex flex-col col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#002147] uppercase tracking-wider">
          Evolução Histórica
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="period" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    value,
                  )
                }
              />
              <Legend verticalAlign="bottom" height={36} />
              <Line
                type="monotone"
                dataKey="Realizado"
                stroke="#004b87"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Meta"
                stroke="#00a3e0"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
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
