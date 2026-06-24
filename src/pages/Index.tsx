import { useState } from 'react'
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
import { Target, TrendingUp, BarChart4, DollarSign } from 'lucide-react'

export default function Index() {
  const [period, setPeriod] = useState('2026-Q3')
  const [filter, setFilter] = useState('all')

  const mockChartData = [
    {
      name: 'Julho',
      metaBase: 1000,
      metaBronze: 1100,
      metaPrata: 1200,
      metaOuro: 1300,
      realizado: 1150,
    },
    {
      name: 'Agosto',
      metaBase: 1000,
      metaBronze: 1100,
      metaPrata: 1200,
      metaOuro: 1300,
      realizado: 980,
    },
    {
      name: 'Setembro',
      metaBase: 1000,
      metaBronze: 1100,
      metaPrata: 1200,
      metaOuro: 1300,
      realizado: 1250,
    },
  ]

  const chartConfig = {
    metaBase: { label: 'Meta Base', color: 'hsl(var(--muted-foreground))' },
    metaBronze: { label: 'Bronze', color: '#cd7f32' },
    metaPrata: { label: 'Prata', color: '#c0c0c0' },
    metaOuro: { label: 'Ouro', color: '#ffd700' },
    realizado: { label: 'Realizado', color: 'hsl(var(--primary))' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Dashboard de Desempenho
          </h1>
          <p className="text-muted-foreground">Acompanhamento consolidado de Metas vs Realizado.</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-Q3">Q3 2026 (Jul-Set)</SelectItem>
              <SelectItem value="2026-07">Julho 2026</SelectItem>
              <SelectItem value="2026-08">Agosto 2026</SelectItem>
              <SelectItem value="2026-09">Setembro 2026</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtro de Visão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Visão Nacional</SelectItem>
              <SelectItem value="d1">Distrito Sul</SelectItem>
              <SelectItem value="r1">Regional SP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Realizada</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 3.380.000</div>
            <p className="text-xs text-muted-foreground">+12.5% em relação à Meta Base</p>
            <div className="mt-4 flex gap-1">
              <Badge variant="outline" className="text-[10px]">
                Base atingida
              </Badge>
              <Badge
                variant="secondary"
                className="bg-[#cd7f32]/20 text-[#cd7f32] text-[10px] hover:bg-[#cd7f32]/30"
              >
                Bronze
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance de Mix</CardTitle>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.2%</div>
            <p className="text-xs text-muted-foreground">Média ponderada F1, F2, F3</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura (Carteira)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">Clientes com positivação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projeção Q3</CardTitle>
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
          <CardTitle>Evolução Receita - Realizado vs Metas (Tiers)</CardTitle>
          <CardDescription>Acompanhamento mensal em relação às 4 faixas de meta.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="metaBase" fill="var(--color-metaBase)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="metaBronze" fill="var(--color-metaBronze)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="metaPrata" fill="var(--color-metaPrata)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="metaOuro" fill="var(--color-metaOuro)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizado" fill="var(--color-realizado)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
