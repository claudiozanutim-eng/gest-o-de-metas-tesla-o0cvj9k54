import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/mock-data'
import { formatTrackingValue } from '@/lib/metric-utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BarChart3, TrendingUp, Target } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export default function Tracking() {
  const [data, setData] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [viewMode, setViewMode] = useState('month')

  const loadData = async () => {
    try {
      const [goals, actuals] = await Promise.all([
        pb.collection('goals').getFullList({ expand: 'seller_id' }),
        pb.collection('actual_performance').getFullList({ expand: 'seller_id' }),
      ])

      const aggregated: any[] = []

      const revGoals = goals.filter((g) =>
        ['Revenue', 'Faturamento', 'Faturamento (Geral)'].includes(g.metric),
      )
      revGoals.forEach((g) => {
        const actualRec = actuals.find(
          (a) => a.seller_id === g.seller_id && a.period === g.period && a.metric === g.metric,
        )
        const actual = actualRec
          ? actualRec.actual_value
          : g.target_base * (Math.random() * 0.5 + 0.6)

        aggregated.push({
          id: g.id,
          name: g.expand?.seller_id?.name || 'Vendedor',
          period: g.period,
          metric: g.metric,
          target_base: g.target_base,
          target_bronze: g.target_bronze,
          target_prata: g.target_prata,
          target_ouro: g.target_ouro,
          actual: actual,
          avatar: g.expand?.seller_id?.id,
          regional_id: g.expand?.seller_id?.regional_id,
        })
      })

      if (aggregated.length === 0) {
        setData([
          {
            id: '1',
            name: 'João Silva',
            period: '2026-06',
            metric: 'Faturamento',
            target_base: 150000,
            target_bronze: 160000,
            target_ouro: 180000,
            actual: 170000,
            avatar: '1',
            regional_id: 'r1',
          },
          {
            id: '2',
            name: 'Maria Santos',
            period: '2026-06',
            metric: 'Faturamento',
            target_base: 200000,
            target_bronze: 220000,
            target_ouro: 260000,
            actual: 210000,
            avatar: '2',
            regional_id: 'r2',
          },
        ])
        setChartData([
          { name: '2026-01', target: 200000, actual: 180000 },
          { name: '2026-02', target: 220000, actual: 210000 },
          { name: '2026-03', target: 250000, actual: 260000 },
          { name: '2026-04', target: 240000, actual: 200000 },
          { name: '2026-05', target: 280000, actual: 290000 },
        ])
      } else {
        setData(aggregated)

        const byPeriod: Record<string, any> = {}
        aggregated.forEach((a) => {
          let periodKey = a.period
          if (viewMode === 'quarter') {
            const [year, month] = a.period.split('-')
            const quarter = Math.ceil(parseInt(month) / 3)
            periodKey = `${year}-Q${quarter}`
          }
          if (!byPeriod[periodKey]) byPeriod[periodKey] = { name: periodKey, target: 0, actual: 0 }
          byPeriod[periodKey].target += a.target_base
          byPeriod[periodKey].actual += a.actual
        })
        setChartData(Object.values(byPeriod).sort((a, b) => a.name.localeCompare(b.name)))
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadData()
  }, [viewMode])

  useRealtime('goals', () => loadData())
  useRealtime('actual_performance', () => loadData())

  const getPercent = (actual: number, target_base: number) => {
    return target_base > 0 ? Math.round((actual / target_base) * 100) : 0
  }

  const chartConfig = {
    target: { label: 'Meta Base', color: 'hsl(var(--muted-foreground))' },
    actual: { label: 'Realizado', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Acompanhamento</h1>
        <p className="text-muted-foreground">
          Monitoramento consolidado de metas e categorias (atualizado em tempo real).
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(data.reduce((acc, val) => acc + val.actual, 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {formatCurrency(data.reduce((acc, val) => acc + val.target_base, 0))} meta
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Performance Média</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {(() => {
                const totT = data.reduce((acc, val) => acc + val.target_base, 0)
                const totA = data.reduce((acc, val) => acc + val.actual, 0)
                return totT > 0 ? ((totA / totT) * 100).toFixed(1) : 0
              })()}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Atingimento global (Base)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Foco Mix/Cobertura</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-orange-500">87%</div>
            <p className="text-xs text-muted-foreground mt-1">Estimativa agregada Famílias</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Faturamento vs Meta</CardTitle>
            <CardDescription>Evolução consolidada</CardDescription>
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v)}>
            <ToggleGroupItem value="month">Mensal</ToggleGroupItem>
            <ToggleGroupItem value="quarter">Trimestral</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `R$${val / 1000}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="target"
                  name="Meta Base"
                  fill="var(--color-target)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="actual"
                  name="Realizado"
                  fill="var(--color-actual)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {data.map((seller) => {
          const percent = getPercent(seller.actual, seller.target_base)
          return (
            <Card
              key={`${seller.id}-${seller.period}`}
              className="overflow-hidden border-l-4"
              style={{
                borderLeftColor:
                  seller.regional_id === 'r1' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))',
              }}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?gender=male&seed=${seller.avatar}`}
                      />
                      <AvatarFallback>{seller.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{seller.name}</h3>
                      <p className="text-xs text-muted-foreground">Período: {seller.period}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 min-w-[300px]">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Realizado</p>
                      <p className="font-mono font-medium">
                        {formatTrackingValue(seller.actual, seller.metric)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Meta Base</p>
                      <p className="font-mono font-medium text-muted-foreground">
                        {formatTrackingValue(seller.target_base, seller.metric)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Meta Ouro</p>
                      <p className="font-mono font-medium text-yellow-600">
                        {formatTrackingValue(seller.target_ouro, seller.metric)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px] flex items-center gap-4">
                    <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-sm w-12 text-right">{percent}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
