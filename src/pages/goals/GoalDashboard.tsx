import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, Target, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

const maskMoney = (v: number) =>
  `R$ ${(v / 100)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`

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
  const [metric, setMetric] = useState('')
  const [metricsList, setMetricsList] = useState<string[]>([])

  const [goal, setGoal] = useState<any>(null)
  const [perf, setPerf] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      pb.collection('sellers').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('districts').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('goals').getFullList({ fields: 'metric' }),
    ]).then(([s, r, a, d, g]) => {
      setData({ sellers: s, regionals: r, areas: a, districts: d })
      const uniqueMetrics = Array.from(new Set(g.map((x) => x.metric))).filter(Boolean)
      if (uniqueMetrics.length > 0) {
        setMetricsList(uniqueMetrics)
        if (!metric) setMetric(uniqueMetrics[0])
      }
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!period || !metric) {
        setGoal(null)
        setPerf(null)
        return
      }

      let filterGoal = `period="${period}" && metric="${metric}"`
      let filterPerf = `period="${period}" && metric="${metric}"`

      if (sellerId && sellerId !== 'all') {
        const seller = data.sellers.find((s: any) => s.id === sellerId)
        if (seller) {
          filterGoal += ` && seller_id="${seller.user_id}"`
          filterPerf += ` && seller_id="${seller.user_id}"`
        }
      } else if (areaId && areaId !== 'all') {
        filterGoal += ` && area_id="${areaId}"`
        const sellerIds = data.sellers
          .filter((s: any) => s.area_id === areaId)
          .map((s: any) => s.user_id)
          .filter(Boolean)
        if (sellerIds.length > 0) {
          const idList = sellerIds.join("','")
          filterPerf += ` && seller_id in ('${idList}')`
        } else {
          filterPerf += ` && id="0"` // force no results
        }
      }

      try {
        const goals = await pb.collection('goals').getFullList({ filter: filterGoal })
        const perfs = await pb.collection('actual_performance').getFullList({ filter: filterPerf })

        if (goals.length === 0) {
          setGoal(null)
          setPerf(null)
          return
        }

        const aggGoal = {
          target_base: goals.reduce((acc, g) => acc + (g.target_base || 0), 0),
          target_bronze: goals.reduce((acc, g) => acc + (g.target_bronze || 0), 0),
          target_prata: goals.reduce((acc, g) => acc + (g.target_prata || 0), 0),
          target_ouro: goals.reduce((acc, g) => acc + (g.target_ouro || 0), 0),
          target_monthly_coverage: goals.reduce(
            (acc, g) => acc + (g.target_monthly_coverage || 0),
            0,
          ),
        }

        const aggPerf = {
          actual_value: perfs.reduce((acc, p) => acc + (p.actual_value || 0), 0),
          actual_coverage: perfs.reduce((acc, p) => acc + (p.actual_coverage || 0), 0),
        }

        setGoal(aggGoal)
        setPerf(aggPerf)
      } catch (e) {
        setGoal(null)
        setPerf(null)
      }
    }
    load()
  }, [distId, regId, areaId, sellerId, period, metric, data.sellers])

  const isCoverage = metric.toLowerCase().includes('cobertura')
  const isCurrency =
    (metric.toLowerCase().includes('faturamento') || metric.toLowerCase().includes('f')) &&
    !isCoverage

  const formatVal = (v: number) => (isCurrency ? maskMoney(v * 100) : v.toLocaleString('pt-BR'))

  const base = goal?.target_base || 0
  const bronze = goal?.target_bronze || 0
  const prata = goal?.target_prata || 0
  const ouro = goal?.target_ouro || 0
  const atual = perf?.actual_value || 0

  const pctBase = base > 0 ? (atual / base) * 100 : 0

  // Progress Bar calculation
  const max = Math.max(ouro, atual, base * 1.5, 1)
  const getPct = (v: number) => Math.min((v / max) * 100, 100)

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

      {goal ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Meta Base</CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isCoverage ? goal.target_monthly_coverage : formatVal(base)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Realizado (Atual)</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isCoverage ? perf?.actual_coverage || 0 : formatVal(atual)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">% Atingimento</CardTitle>
                <Award className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {isCoverage && goal.target_monthly_coverage
                    ? (((perf?.actual_coverage || 0) / goal.target_monthly_coverage) * 100).toFixed(
                        1,
                      )
                    : pctBase.toFixed(1)}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          {!isCoverage && (
            <Card>
              <CardHeader>
                <CardTitle>Progresso de Atingimento (Tiers)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pt-8 pb-4 px-2">
                  {/* Progress track */}
                  <div className="h-4 bg-muted rounded-full overflow-hidden flex relative w-full">
                    <div
                      className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-in-out"
                      style={{ width: `${getPct(atual)}%` }}
                    />
                  </div>

                  {/* Markers */}
                  {[
                    { label: 'Base', val: base, color: 'text-slate-600' },
                    { label: 'Bronze', val: bronze, color: 'text-amber-700' },
                    { label: 'Prata', val: prata, color: 'text-slate-400' },
                    { label: 'Ouro', val: ouro, color: 'text-yellow-600' },
                  ].map(
                    (m) =>
                      m.val > 0 && (
                        <div
                          key={m.label}
                          className="absolute top-0 -ml-4 flex flex-col items-center justify-center w-8"
                          style={{ left: `${getPct(m.val)}%` }}
                        >
                          <span className={cn('text-xs font-bold mb-1', m.color)}>{m.label}</span>
                          <div className="h-10 w-0.5 bg-border z-10" />
                        </div>
                      ),
                  )}
                </div>

                <div className="mt-4 text-sm text-muted-foreground text-center">
                  Progresso atual: <strong className="text-foreground">{formatVal(atual)}</strong>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="p-12 text-center border rounded-lg bg-muted/20 text-muted-foreground">
          Nenhuma meta encontrada para os filtros selecionados.
        </div>
      )}
    </div>
  )
}
