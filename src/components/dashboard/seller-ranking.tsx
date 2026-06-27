import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useMemo } from 'react'

export function SellerRanking() {
  const { filteredActuals } = useDashboard()

  const data = useMemo(() => {
    const sellers = new Map<string, number>()
    filteredActuals.forEach((a) => {
      if (['Faturamento', 'Revenue'].includes(a.metric)) {
        const s = a.expand?.seller_id?.name || 'Desconhecido'
        sellers.set(s, (sellers.get(s) || 0) + (a.actual_value || 0))
      }
    })
    return Array.from(sellers.entries())
      .map(([name, value], idx) => ({ name: name.split(' ')[0], value, _key: `${name}-${idx}` }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredActuals])

  return (
    <Card className="shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#002147] uppercase tracking-wider">
          Ranking de Vendedores (Top 10)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              key="seller-ranking-chart"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    value,
                  )
                }
              />
              <Bar dataKey="value" fill="#004b87" radius={[4, 4, 0, 0]} />
            </BarChart>
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
