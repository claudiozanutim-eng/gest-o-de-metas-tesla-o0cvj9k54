import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockDashboardData, formatCurrency } from '@/lib/mock-data'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Target, TrendingUp, Layers, Award } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const Index = () => {
  const { kpis, charts, breakdown } = mockDashboardData

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Ouro':
        return 'bg-category-ouro text-black'
      case 'Prata':
        return 'bg-category-prata text-black'
      case 'Bronze':
        return 'bg-category-bronze text-white'
      default:
        return 'bg-category-base text-white'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard Gerencial</h1>
          <p className="text-muted-foreground">Visão geral do desempenho comercial.</p>
        </div>
        <Select defaultValue="mes">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Mensal (Junho)</SelectItem>
            <SelectItem value="trimestre">Trimestral (Q2)</SelectItem>
            <SelectItem value="semestre">Semestral (S1)</SelectItem>
            <SelectItem value="ano">Anual (2026)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(kpis.faturamento.current)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Meta: {formatCurrency(kpis.faturamento.meta)}
            </p>
            <Progress value={kpis.faturamento.progress} className="h-2 mt-3" />
            <p className="text-xs text-right mt-1 font-medium">{kpis.faturamento.progress}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mix Performance</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{kpis.mix.current}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Meta: {kpis.mix.meta}% Famílias F1/F2
            </p>
            <Progress value={kpis.mix.progress} className="h-2 mt-3 [&>div]:bg-accent" />
            <p className="text-xs text-right mt-1 font-medium">{kpis.mix.progress}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura de Território</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{kpis.cobertura.current}%</div>
            <p className="text-xs text-muted-foreground mt-1">Clientes ativos vs. Base</p>
            <Progress value={kpis.cobertura.progress} className="h-2 mt-3 [&>div]:bg-emerald-500" />
            <p className="text-xs text-right mt-1 font-medium">{kpis.cobertura.progress}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categoria Atual</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <div
              className={`text-2xl font-bold px-4 py-2 rounded-lg ${getCategoryColor(kpis.categoria)}`}
            >
              {kpis.categoria}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">Faltam 10% para Prata</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Evolução de Faturamento (Meta vs Realizado)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={{
                meta: { color: 'hsl(var(--muted-foreground))' },
                realizado: { color: 'hsl(var(--accent))' },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.faturamentoMensal}
                  margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value / 1000}k`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(val) => formatCurrency(val as number)} />
                    }
                  />
                  <Bar
                    dataKey="meta"
                    fill="var(--color-meta)"
                    radius={[4, 4, 0, 0]}
                    opacity={0.5}
                    name="Meta"
                  />
                  <Bar
                    dataKey="realizado"
                    fill="var(--color-realizado)"
                    radius={[4, 4, 0, 0]}
                    name="Realizado"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Mix de Famílias (Realizado)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.mixFamilias}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {charts.mixFamilias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {charts.mixFamilias.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  ></div>
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Área</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Área</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-center">% Atingimento</TableHead>
                <TableHead className="text-center">Categoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(row.meta)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(row.realizado)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-sm">{row.percentual}%</span>
                      <Progress value={row.percentual} className="w-16 h-2" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`${getCategoryColor(row.categoria)} border-transparent`}
                    >
                      {row.categoria}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Index
