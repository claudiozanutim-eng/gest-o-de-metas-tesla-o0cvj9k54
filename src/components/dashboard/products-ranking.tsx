import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useMemo } from 'react'

export function ProductsRanking() {
  const { filteredActuals } = useDashboard()

  const data = useMemo(() => {
    const products = new Map<string, number>()
    filteredActuals.forEach((a) => {
      if (['Faturamento', 'Revenue', 'Faturamento (Geral)'].includes(a.metric)) {
        const p = a.mix_family ? `Família ${a.mix_family}` : 'Outros Produtos'
        products.set(p, (products.get(p) || 0) + (a.actual_value || 0))
      }
    })
    return Array.from(products.entries())
      .map(([name, value], idx) => ({ name, value, _key: `${name}-${idx}` }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [filteredActuals])

  return (
    <Card className="shadow-sm flex flex-col hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#003DA5] uppercase tracking-wider">
          Top Produtos / Famílias
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              key="products-ranking-chart"
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6F0FF" />
              <XAxis
                type="number"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(value)
                }
              />
              <Bar dataKey="value" fill="#0066CC" radius={[0, 4, 4, 0]} barSize={24} />
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
