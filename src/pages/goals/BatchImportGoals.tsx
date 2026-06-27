import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, UploadCloud, Download, AlertTriangle, ExternalLink } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const EXPECTED_HEADERS = [
  'Distrito', 'Regional', 'Área', 'Vendedor', 'Período', 'Métrica',
  'Família', 'Frota Foco', 'Empresa Foco', 'Meta Base', 'Meta Bronze', 'Meta Prata', 'Meta Ouro'
]

const parseCsvLine = (line: string, delim: string) => {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') inQuotes = !inQuotes
    else if (char === delim && !inQuotes) { result.push(current.trim()); current = '' }
    else current += char
  }
  result.push(current.trim())
  return result.map((s) => s.replace(/^"|"$/g, '').trim())
}

const parseNum = (v: string) => {
  if (!v) return 0
  const str = v.toString().replace('R

<skip-file path="src/pages/goals/GoalDashboard.tsx" type="typescript">
import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, Target, Award, BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXPLICIT_METRICS } from './GoalManualEntry'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts'

const maskMoney = (v: number) => `R$ ${(v / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selectedYear = value ? parseInt(value.split('-')[0], 10) : new Date().getFullYear()
  const selectedMonth = value ? parseInt(value.split('-')[1], 10) - 1 : new Date().getMonth()
  const [displayYear, setDisplayYear] = useState(selectedYear)

  useEffect(() => { if (open) setDisplayYear(selectedYear) }, [open, selectedYear])

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? `${months[selectedMonth]} ${selectedYear}` : <span>Selecione o período</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between space-x-2 pb-4">
          <Button variant="outline" size="icon" onClick={() => setDisplayYear(displayYear - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="font-semibold">{displayYear}</div>
          <Button variant="outline" size="icon" onClick={() => setDisplayYear(displayYear + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {shortMonths.map((m, i) => (
            <Button key={i} variant={displayYear === selectedYear && i === selectedMonth ? 'default' : 'outline'} className="h-9 w-full" onClick={() => { onChange(`${displayYear}-${String(i + 1).padStart(2, '0')}`); setOpen(false) }}>{m}</Button>
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
  const [metric, setMetric] = useState(EXPLICIT_METRICS[0])

  const [agg, setAgg] = useState<any>(null)
  const [regionalData, setRegionalData] = useState<any[]>([])
  const [sellerRanking, setSellerRanking] = useState<any[]>([])
  const [historicalData, setHistoricalData] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      pb.collection('sellers').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('districts').getFullList({ filter: 'is_active = true', sort: 'name' }),
    ]).then(([s, r, a, d]) => setData({ sellers: s, regionals: r, areas: a, districts: d }))
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!period || !metric || data.sellers.length === 0) return

      let baseFilter = `metric="${metric}"`
      if (sellerId && sellerId !== 'all') {
        const seller = data.sellers.find((s: any) => s.id === sellerId)
        if (seller) baseFilter += ` && seller_id="${seller.user_id}"`
      } else if (areaId && areaId !== 'all') {
        const sIds = data.sellers.filter((s: any) => s.area_id === areaId).map((s:any) => s.user_id).filter(Boolean)
        baseFilter += sIds.length ? ` && seller_id in ('${sIds.join("','")}')` : ` && id="0"`
      } else if (regId && regId !== 'all') {
        const sIds = data.sellers.filter((s: any) => s.regional_id === regId).map((s:any) => s.user_id).filter(Boolean)
        baseFilter += sIds.length ? ` && seller_id in ('${sIds.join("','")}')` : ` && id="0"`
      }

      try {
        // Fetch current period
        const goals = await pb.collection('goals').getFullList({ filter: `${baseFilter} && period="${period}"` })
        const perfs = await pb.collection('actual_performance').getFullList({ filter: `${baseFilter} && period="${period}"` })

        if (goals.length === 0) {
          setAgg(null); setRegionalData([]); setSellerRanking([]); setHistoricalData([])
          return
        }

        const isCoverage = metric === 'Coverage' || metric.toLowerCase().includes('cobertura')

        // Aggregate main KPIs
        const totalBase = goals.reduce((sum, g) => sum + (g.target_base || g.target_monthly_coverage || 0), 0)
        const totalAtual = perfs.reduce((sum, p) => sum + (p.actual_value || p.actual_coverage || 0), 0)
        setAgg({ base: totalBase, atual: totalAtual, pct: totalBase > 0 ? (totalAtual / totalBase) * 100 : 0 })

        // Regional Data
        const regMap = new Map()
        data.regionals.forEach((r: any) => regMap.set(r.id, { name: r.name, base: 0, atual: 0 }))
        goals.forEach(g => {
          const seller = data.sellers.find((s:any) => s.user_id === g.seller_id)
          if (seller && regMap.has(seller.regional_id)) {
            regMap.get(seller.regional_id).base += (g.target_base || g.target_monthly_coverage || 0)
          }
        })
        perfs.forEach(p => {
          const seller = data.sellers.find((s:any) => s.user_id === p.seller_id)
          if (seller && regMap.has(seller.regional_id)) {
            regMap.get(seller.regional_id).atual += (p.actual_value || p.actual_coverage || 0)
          }
        })
        setRegionalData(Array.from(regMap.values()).filter(r => r.base > 0).map(r => ({
          name: r.name,
          base: r.base,
          atual: r.atual,
          pct: r.base > 0 ? (r.atual / r.base) * 100 : 0
        })))

        // Seller Ranking
        const selMap = new Map()
        data.sellers.forEach((s: any) => selMap.set(s.user_id, { name: s.name, base: 0, atual: 0 }))
        goals.forEach(g => { if (selMap.has(g.seller_id)) selMap.get(g.seller_id).base += (g.target_base || g.target_monthly_coverage || 0) })
        perfs.forEach(p => { if (selMap.has(p.seller_id)) selMap.get(p.seller_id).atual += (p.actual_value || p.actual_coverage || 0) })
        const ranked = Array.from(selMap.values())
          .filter(s => s.base > 0)
          .map(s => ({ ...s, pct: s.base > 0 ? (s.atual / s.base) * 100 : 0 }))
          .sort((a, b) => b.pct - a.pct)
        setSellerRanking(ranked)

        // Historical Data (fetch all matching baseFilter)
        const histGoals = await pb.collection('goals').getFullList({ filter: baseFilter })
        const histPerfs = await pb.collection('actual_performance').getFullList({ filter: baseFilter })
        const histMap = new Map()
        histGoals.forEach(g => {
          if (!histMap.has(g.period)) histMap.set(g.period, { period: g.period, base: 0, atual: 0 })
          histMap.get(g.period).base += (g.target_base || g.target_monthly_coverage || 0)
        })
        histPerfs.forEach(p => {
          if (!histMap.has(p.period)) histMap.set(p.period, { period: p.period, base: 0, atual: 0 })
          histMap.get(p.period).atual += (p.actual_value || p.actual_coverage || 0)
        })
        const histArr = Array.from(histMap.values())
          .sort((a, b) => a.period.localeCompare(b.period))
          .slice(-6) // last 6 periods
        setHistoricalData(histArr)

      } catch (e) {
        setAgg(null)
      }
    }
    load()
  }, [distId, regId, areaId, sellerId, period, metric, data.sellers])

  const isCoverage = metric === 'Coverage' || metric.toLowerCase().includes('cobertura')
  const formatVal = (v: number) => (isCoverage ? v.toLocaleString('pt-BR') : maskMoney(v * 100))

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-sm border grid grid-cols-1 md:grid-cols-6 gap-4">
        <Select value={distId} onValueChange={v => { setDistId(v); setRegId(''); setAreaId(''); setSellerId('') }}>
          <SelectTrigger><SelectValue placeholder="Distrito (Todos)" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{data.districts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={regId} onValueChange={v => { setRegId(v); setAreaId(''); setSellerId('') }}>
          <SelectTrigger><SelectValue placeholder="Regional (Todas)" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem>{data.regionals.filter((r: any) => !distId || distId === 'all' || r.district_id === distId).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={areaId} onValueChange={v => { setAreaId(v); setSellerId('') }}>
          <SelectTrigger><SelectValue placeholder="Área (Todas)" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem>{data.areas.filter((a: any) => !regId || regId === 'all' || a.regional_id === regId).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sellerId} onValueChange={setSellerId}>
          <SelectTrigger><SelectValue placeholder="Vendedor (Todos)" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{data.sellers.filter((s: any) => !areaId || areaId === 'all' || s.area_id === areaId).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <MonthPicker value={period} onChange={setPeriod} />
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger><SelectValue placeholder="Métrica" /></SelectTrigger>
          <SelectContent>{EXPLICIT_METRICS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {agg ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium">Meta Base {isCoverage && '(%)'}</CardTitle><Target className="w-4 h-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-3xl font-bold">{formatVal(agg.base)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium">Realizado {isCoverage && '(%)'}</CardTitle><TrendingUp className="w-4 h-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-3xl font-bold">{formatVal(agg.atual)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium">% Atingimento</CardTitle><Award className="w-4 h-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className={cn("text-3xl font-bold", agg.pct >= 100 ? "text-green-600" : "text-primary")}>{agg.pct.toFixed(1)}%</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary"/> Performance por Regional</CardTitle>
                <CardDescription>Atingimento consolidado por regional no período selecionado</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={{ pct: { label: '% Atingimento', color: 'hsl(var(--primary))' } }} className="h-full w-full">
                  <BarChart data={regionalData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pct" fill="var(--color-pct)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LineChartIcon className="w-5 h-5 text-primary"/> Tendência Histórica</CardTitle>
                <CardDescription>Comparativo Base x Realizado nos últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={{ base: { label: 'Base', color: 'hsl(var(--muted-foreground))' }, atual: { label: 'Realizado', color: 'hsl(var(--primary))' } }} className="h-full w-full">
                  <LineChart data={historicalData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="base" stroke="var(--color-base)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="atual" stroke="var(--color-atual)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Ranking de Vendedores</CardTitle><CardDescription>Baseado no % de atingimento da meta atual</CardDescription></CardHeader>
            <CardContent>
              <div className="border rounded-md max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Pos</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Meta Base</TableHead>
                      <TableHead className="text-right">Realizado</TableHead>
                      <TableHead className="text-right">% Ating.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellerRanking.map((s, i) => (
                      <TableRow key={s.name}>
                        <TableCell className="font-bold text-muted-foreground">{i + 1}º</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{formatVal(s.base)}</TableCell>
                        <TableCell className="text-right">{formatVal(s.atual)}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{s.pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-lg bg-muted/20 text-muted-foreground">
          Nenhuma meta encontrada para os filtros selecionados.
        </div>
      )}
    </div>
  )
}
