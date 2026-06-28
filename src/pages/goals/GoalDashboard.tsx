import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Award,
  Download,
  BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'

const maskMoney = (v: number) =>
  `R$ ${(v / 100)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`

const METRICS_DEFAULT = [
  'Faturamento',
  'Cobertura',
  'Coverage',
  'Mix_F1',
  'Mix_F2',
  'Mix_F3',
  'Mix_Outros',
  'Faturamento (Geral)',
]

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selectedYear = value ? parseInt(value.split('-')[0], 10) : new Date().getFullYear()
  const selectedMonth = value ? parseInt(value.split('-')[1], 10) - 1 : new Date().getMonth()
  const [displayYear, setDisplayYear] = useState(selectedYear)

  useEffect(() => {
    if (open) setDisplayYear(selectedYear)
  }, [open, selectedYear])

  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const shortMonths = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? `${months[selectedMonth]} ${selectedYear}` : <span>Selecione o período</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between space-x-2 pb-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setDisplayYear(displayYear - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold">{displayYear}</div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setDisplayYear(displayYear + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {shortMonths.map((m, i) => (
            <Button
              key={i}
              type="button"
              variant={displayYear === selectedYear && i === selectedMonth ? 'default' : 'outline'}
              className="h-9 w-full"
              onClick={() => {
                onChange(`${displayYear}-${String(i + 1).padStart(2, '0')}`)
                setOpen(false)
              }}
            >
              {m}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function GoalDashboard() {
  const [data, setData] = useState<any>({ sellers: [], regionals: [], areas: [], districts: [] })
  const [distId, setDistId] = useState('')
  const [regId, setRegId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [metric, setMetric] = useState(METRICS_DEFAULT[0])
  const [metricsList, setMetricsList] = useState<string[]>(METRICS_DEFAULT)

  const [aggData, setAggData] = useState<any>(null)
  const [regionalAgg, setRegionalAgg] = useState<any[]>([])
  const [sellerRanking, setSellerRanking] = useState<any[]>([])
  const [historicalData, setHistoricalData] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      pb.collection('sellers').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('districts').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('goals').getFullList({ fields: 'metric' }),
    ]).then(([s, r, a, d, g]) => {
      setData({ sellers: s, regionals: r, areas: a, districts: d })
      const dbMetrics = Array.from(new Set(g.map((x) => x.metric))).filter(Boolean)
      const combined = Array.from(new Set([...METRICS_DEFAULT, ...dbMetrics]))
      setMetricsList(combined)
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!period || !metric) {
        setAggData(null)
        setRegionalAgg([])
        setSellerRanking([])
        setHistoricalData([])
        return
      }

      let filterGoal = `period="${period}" && metric="${metric}"`
      let filterPerf = `period="${period}" && metric="${metric}"`

      if (regId && regId !== 'all') {
        filterGoal += ` && regional_id="${regId}"`
      }

      if (areaId && areaId !== 'all') {
        filterGoal += ` && area_id="${areaId}"`
      }

      if (sellerId && sellerId !== 'all') {
        const seller = data.sellers.find((s: any) => s.id === sellerId)
        if (seller) {
          filterGoal += ` && seller_id="${seller.user_id}"`
          filterPerf += ` && seller_id="${seller.user_id}"`
        }
      } else if (areaId && areaId !== 'all') {
        const sellerIds = data.sellers
          .filter((s: any) => s.area_id === areaId)
          .map((s: any) => s.user_id)
          .filter(Boolean)
        if (sellerIds.length > 0) {
          filterPerf += ` && seller_id in ('${sellerIds.join("','")}')`
        } else {
          filterPerf += ` && id="0"`
        }
      } else if (regId && regId !== 'all') {
        const sellerIds = data.sellers
          .filter((s: any) => {
            const area = data.areas.find((a: any) => a.id === s.area_id)
            return area?.regional_id === regId
          })
          .map((s: any) => s.user_id)
          .filter(Boolean)
        if (sellerIds.length > 0) {
          filterPerf += ` && seller_id in ('${sellerIds.join("','")}')`
        } else {
          filterPerf += ` && id="0"`
        }
      }

      try {
        const [goals, perfs, allGoals, allPerfs] = await Promise.all([
          pb
            .collection('goals')
            .getFullList({ filter: filterGoal, expand: 'seller_id,seller_id.regional_id' }),
          pb
            .collection('actual_performance')
            .getFullList({ filter: filterPerf, expand: 'seller_id' }),
          pb.collection('goals').getFullList({ filter: `metric="${metric}"`, sort: 'period' }),
          pb.collection('actual_performance').getFullList({ filter: `metric="${metric}"` }),
        ])

        if (goals.length === 0) {
          setAggData(null)
          return
        }

        // Global Aggregation
        const globalTarget = goals.reduce((acc, g) => acc + (g.target_base || 0), 0)
        const globalActual = perfs.reduce((acc, p) => acc + (p.actual_value || 0), 0)

        setAggData({ target: globalTarget, actual: globalActual })

        // Regional Aggregation
        const regMap = new Map()
        goals.forEach((g) => {
          const rId = g.expand?.seller_id?.regional_id || 'unknown'
          const rName = g.expand?.seller_id?.expand?.regional_id?.name || 'Desconhecida'
          if (!regMap.has(rId)) regMap.set(rId, { name: rName, target: 0, actual: 0 })
          regMap.get(rId).target += g.target_base || 0
        })
        perfs.forEach((p) => {
          const rId = p.expand?.seller_id?.regional_id || 'unknown'
          if (regMap.has(rId)) {
            regMap.get(rId).actual += p.actual_value || 0
          }
        })
        const regArr = Array.from(regMap.values())
          .map((r) => ({
            ...r,
            pct: r.target > 0 ? (r.actual / r.target) * 100 : 0,
          }))
          .sort((a, b) => b.pct - a.pct)
        setRegionalAgg(regArr)

        // Seller Ranking
        const sellerMap = new Map()
        goals.forEach((g) => {
          const s = data.sellers.find((x: any) => x.user_id === g.seller_id)
          if (!s) return
          if (!sellerMap.has(s.id)) sellerMap.set(s.id, { name: s.name, target: 0, actual: 0 })
          sellerMap.get(s.id).target += g.target_base || 0
        })
        perfs.forEach((p) => {
          const s = data.sellers.find((x: any) => x.user_id === p.seller_id)
          if (s && sellerMap.has(s.id)) {
            sellerMap.get(s.id).actual += p.actual_value || 0
          }
        })
        const rankArr = Array.from(sellerMap.values())
          .map((s) => ({
            ...s,
            pct: s.target > 0 ? (s.actual / s.target) * 100 : 0,
          }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 10)
        setSellerRanking(rankArr)

        // Historical Data
        const histMap = new Map()
        allGoals.forEach((g) => {
          if (!histMap.has(g.period))
            histMap.set(g.period, { period: g.period, target: 0, actual: 0 })
          histMap.get(g.period).target += g.target_base || 0
        })
        allPerfs.forEach((p) => {
          if (histMap.has(p.period)) {
            histMap.get(p.period).actual += p.actual_value || 0
          }
        })
        setHistoricalData(
          Array.from(histMap.values()).sort((a, b) => a.period.localeCompare(b.period)),
        )
      } catch (e) {
        setAggData(null)
      }
    }
    load()
  }, [distId, regId, areaId, sellerId, period, metric, data.sellers])

  const isCoverage = metric === 'Coverage'
  const isCurrency = !isCoverage

  const formatVal = (v: number) =>
    isCurrency ? maskMoney(v * 100) : `${v.toLocaleString('pt-BR')}${isCoverage ? '%' : ''}`

  const exportData = () => {
    if (sellerRanking.length === 0) return
    const csv = [
      ['Vendedor', 'Meta', 'Realizado', '% Atingimento'],
      ...sellerRanking.map((s) => [s.name, s.target, s.actual, s.pct.toFixed(2)]),
    ]
      .map((e) => e.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ranking_${metric}_${period}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Select
            value={distId}
            onValueChange={(v) => {
              setDistId(v)
              setRegId('')
              setAreaId('')
              setSellerId('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Distrito (Todos)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {data.districts.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={regId}
            onValueChange={(v) => {
              setRegId(v)
              setAreaId('')
              setSellerId('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Regional (Todas)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {data.regionals
                .filter((r: any) => !distId || distId === 'all' || r.district_id === distId)
                .map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={areaId}
            onValueChange={(v) => {
              setAreaId(v)
              setSellerId('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Área (Todas)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {data.areas
                .filter((a: any) => !regId || regId === 'all' || a.regional_id === regId)
                .map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger>
              <SelectValue placeholder="Vendedor (Todos)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {data.sellers
                .filter((s: any) => !areaId || areaId === 'all' || s.area_id === areaId)
                .map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <MonthPicker value={period} onChange={setPeriod} />
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger>
              <SelectValue placeholder="Métrica" />
            </SelectTrigger>
            <SelectContent>
              {metricsList.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {aggData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Meta Base Total</CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatVal(aggData.target)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Realizado Total</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatVal(aggData.actual)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">% Atingimento Global</CardTitle>
                <Award className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {aggData.target > 0 ? ((aggData.actual / aggData.target) * 100).toFixed(1) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart2 className="w-4 h-4" /> Atingimento por Regional (%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={regionalAgg}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        formatter={(v: number) => [`${v.toFixed(1)}%`, 'Atingimento']}
                      />
                      <Bar
                        dataKey="pct"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4" /> Histórico ({metric})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="period" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <RechartsTooltip formatter={(v: number) => formatVal(v)} />
                      <Legend />
                      <Line
                        type="monotone"
                        name="Meta"
                        dataKey="target"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        name="Realizado"
                        dataKey="actual"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Top 10 Vendedores</CardTitle>
                <CardDescription>Ranking de atingimento no período selecionado</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportData} className="gap-2">
                <Download className="w-4 h-4" /> Exportar Ranking
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">% Atingimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerRanking.map((s, idx) => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">
                        <span className="text-muted-foreground mr-2">{idx + 1}º</span> {s.name}
                      </TableCell>
                      <TableCell className="text-right">{formatVal(s.target)}</TableCell>
                      <TableCell className="text-right">{formatVal(s.actual)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {s.pct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-lg bg-muted/20 text-muted-foreground flex flex-col items-center">
          <BarChart2 className="w-12 h-12 mb-4 text-muted-foreground/50" />
          Nenhuma meta ou resultado encontrado para os filtros selecionados.
        </div>
      )}
    </div>
  )
}
