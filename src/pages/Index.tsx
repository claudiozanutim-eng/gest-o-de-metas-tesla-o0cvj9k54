import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, BarChart4, DollarSign, Activity } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { EmptyState } from '@/components/ui/empty-state'
import { useNavigate } from 'react-router-dom'

function TieredProgress({
  realized,
  base,
  bronze,
  silver,
  gold,
}: {
  realized: number
  base: number
  bronze: number
  silver: number
  gold: number
}) {
  const max = Math.max(gold * 1.1, realized)
  const pRealized = Math.min((realized / max) * 100, 100)

  const getTierColor = () => {
    if (realized >= gold) return 'bg-[#eab308]'
    if (realized >= silver) return 'bg-[#94a3b8]'
    if (realized >= bronze) return 'bg-[#cd7f32]'
    if (realized >= base) return 'bg-primary'
    return 'bg-muted-foreground'
  }

  return (
    <div className="relative h-4 w-full bg-secondary rounded-full overflow-hidden mt-2">
      {[
        { value: base, color: 'bg-primary', label: 'Base' },
        { value: bronze, color: 'bg-[#cd7f32]', label: 'Br' },
        { value: silver, color: 'bg-[#94a3b8]', label: 'Pr' },
        { value: gold, color: 'bg-[#eab308]', label: 'Ou' },
      ].map(
        (tier, i) =>
          tier.value > 0 && (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-0.5 bg-background z-10"
              style={{ left: `${(tier.value / max) * 100}%` }}
              title={tier.label}
            />
          ),
      )}
      <div
        className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ease-in-out ${getTierColor()}`}
        style={{ width: `${pRealized}%` }}
      />
    </div>
  )
}

export default function Index() {
  const [period, setPeriod] = useLocalStorage('dashboard-period', '2026-07')
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const goals = await pb.collection('goals').getFullList({ filter: `period="${period}"` })
      const actuals = await pb
        .collection('actual_performance')
        .getFullList({ filter: `period="${period}"` })

      if (goals.length > 0 || actuals.length > 0) {
        const metrics = Array.from(
          new Set([...goals.map((g) => g.metric), ...actuals.map((a) => a.metric)]),
        )
        const formatted = metrics.map((m) => {
          const mg = goals.filter((g) => g.metric === m)
          const ma = actuals.filter((a) => a.metric === m)
          return {
            name: m === 'Revenue' ? 'Faturamento' : m,
            metaBase: mg.reduce((acc, g) => acc + g.target_base, 0),
            metaBronze: mg.reduce((acc, g) => acc + g.target_bronze, 0),
            metaPrata: mg.reduce((acc, g) => acc + g.target_prata, 0),
            metaOuro: mg.reduce((acc, g) => acc + g.target_ouro, 0),
            realizado: ma.reduce((acc, a) => acc + a.actual_value, 0),
          }
        })
        setChartData(formatted)
      } else {
        setChartData([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period])

  useRealtime('goals', () => {
    loadData()
  })
  useRealtime('actual_performance', () => {
    loadData()
  })

  const chartConfig = {
    metaBase: { label: 'Base', color: '#64748b' },
    metaBronze: { label: 'Bronze', color: '#cd7f32' },
    metaPrata: { label: 'Prata', color: '#94a3b8' },
    metaOuro: { label: 'Ouro', color: '#eab308' },
    realizado: { label: 'Realizado', color: '#3b82f6' },
  }

  const faturamento =
    chartData.find((d) => d.name === 'Faturamento') ||
    chartData.find((d) => d.name === 'Revenue') ||
    chartData[0] ||
    {}
  const atingimento = faturamento.metaBase
    ? (faturamento.realizado / faturamento.metaBase) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Painel de Desempenho</h1>
          <p className="text-muted-foreground">
            Acompanhamento consolidado de Metas vs Realizado em tempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-Q3">Q3 2026</SelectItem>
              <SelectItem value="2026-07">Julho 2026</SelectItem>
              <SelectItem value="2026-08">Agosto 2026</SelectItem>
              <SelectItem value="2026-09">Setembro 2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isLoading && chartData.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nenhum dado encontrado"
          description={`Não existem metas ou desempenhos registrados para o período de ${period}. Importe a planilha de metas para começar.`}
          actionLabel="Ir para Importação"
          onAction={() => navigate('/admin/importacao')}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receita Realizada</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {faturamento.realizado?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {atingimento.toFixed(1)}% da Meta Base
                </p>
                <TieredProgress
                  realized={faturamento.realizado || 0}
                  base={faturamento.metaBase || 0}
                  bronze={faturamento.metaBronze || 0}
                  silver={faturamento.metaPrata || 0}
                  gold={faturamento.metaOuro || 0}
                />
                <div className="mt-4 flex gap-1">
                  {faturamento.realizado >= (faturamento.metaBase || 0) && (
                    <Badge variant="outline" className="text-[10px]">
                      Base
                    </Badge>
                  )}
                  {faturamento.realizado >= (faturamento.metaBronze || 0) && (
                    <Badge
                      variant="secondary"
                      className="bg-[#cd7f32]/20 text-[#cd7f32] dark:text-[#e89c4d] text-[10px]"
                    >
                      Bronze
                    </Badge>
                  )}
                  {faturamento.realizado >= (faturamento.metaPrata || 0) && (
                    <Badge
                      variant="secondary"
                      className="bg-[#c0c0c0]/20 text-slate-600 dark:text-slate-300 text-[10px]"
                    >
                      Prata
                    </Badge>
                  )}
                  {faturamento.realizado >= (faturamento.metaOuro || 0) && (
                    <Badge
                      variant="secondary"
                      className="bg-[#ffd700]/20 text-yellow-600 dark:text-yellow-400 text-[10px]"
                    >
                      Ouro
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Performance de Mix</CardTitle>
                <BarChart4 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98.2%</div>
                <p className="text-xs text-muted-foreground mb-2">Média ponderada F1, F2, F3</p>
                <TieredProgress realized={98.2} base={80} bronze={85} silver={90} gold={95} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">85%</div>
                <p className="text-xs text-muted-foreground mb-2">Carteira positivada</p>
                <TieredProgress realized={85} base={70} bronze={75} silver={80} gold={85} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Projeção do Período</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">Prata Garantido</div>
                <p className="text-xs text-muted-foreground">A 8% do tier Ouro</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métricas - Realizado vs Metas (Tiers)</CardTitle>
              <CardDescription>
                Comparativo por faixa de meta (Base, Bronze, Prata e Ouro).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="metaBase" fill="var(--color-metaBase)" radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="metaBronze"
                        fill="var(--color-metaBronze)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="metaPrata"
                        fill="var(--color-metaPrata)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar dataKey="metaOuro" fill="var(--color-metaOuro)" radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="realizado"
                        fill="var(--color-realizado)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
