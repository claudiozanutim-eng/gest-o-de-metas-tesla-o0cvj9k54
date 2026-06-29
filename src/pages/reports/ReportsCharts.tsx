import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS: Record<string, string> = {
  F1: '#003DA5',
  F2: '#0066CC',
  F3: '#4D94FF',
  Outros: '#80B5FF',
}

function formatAxis(v: number, isCoverage: boolean) {
  if (isCoverage) return v.toLocaleString('pt-BR')
  return `R$${(v / 1000).toFixed(0)}k`
}

function formatTooltip(v: number, isCoverage: boolean) {
  if (isCoverage) return v.toLocaleString('pt-BR')
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)
}

interface Props {
  barData: { name: string; target: number; actual: number }[]
  donutData: { name: string; value: number }[]
  commissionDonutData: { name: string; value: number }[]
  lineData: { period: string; target: number; actual: number }[]
  isCoverage: boolean
}

export function ReportsCharts({
  barData,
  donutData,
  commissionDonutData,
  lineData,
  isCoverage,
}: Props) {
  const chartConfig = {
    target: { label: 'Meta Base', color: 'hsl(217, 91%, 60%)' },
    actual: { label: 'Realizado', color: 'hsl(142, 71%, 45%)' },
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Realizado vs Meta Base</CardTitle>
          <CardDescription>Comparativo por vendedor</CardDescription>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatAxis(v, isCoverage)}
                  />
                  <RTooltip formatter={(v: number) => [formatTooltip(v, isCoverage), '']} />
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comissão por Família</CardTitle>
          <CardDescription>Participação na comissão total por família</CardDescription>
        </CardHeader>
        <CardContent>
          {commissionDonutData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={commissionDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {commissionDonutData.map((d, i) => (
                    <Cell key={i} fill={COLORS[d.name] || '#80B5FF'} />
                  ))}
                </Pie>
                <RTooltip
                  formatter={(v: number) =>
                    new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 2,
                    }).format(v)
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={24}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Histórico Acumulado</CardTitle>
          <CardDescription>Evolução de metas e realizado no ano</CardDescription>
        </CardHeader>
        <CardContent>
          {lineData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatAxis(v, isCoverage)}
                  />
                  <RTooltip formatter={(v: number) => [formatTooltip(v, isCoverage), '']} />
                  <Legend />
                  <Line
                    type="monotone"
                    name="Meta Base Acumulada"
                    dataKey="target"
                    stroke="var(--color-target)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    name="Realizado Acumulado"
                    dataKey="actual"
                    stroke="var(--color-actual)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
