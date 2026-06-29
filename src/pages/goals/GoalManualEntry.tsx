import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  History,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export const EXPLICIT_METRICS = [
  'Faturamento',
  'Cobertura',
  'Mix_F1',
  'Mix_F2',
  'Mix_F3',
  'Mix_Outros',
  'Faturamento (Geral)',
]

const maskMoney = (v: any) => {
  const n = String(v).replace(/\D/g, '')
  return n
    ? `R$ ${(Number(n) / 100)
        .toFixed(2)
        .replace('.', ',')
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
    : ''
}
const unmaskMoney = (v: any) => {
  const digits = String(v).replace(/\D/g, '') || '0'
  return Number(digits) / 100
}
const formatCurrency = (v: number) => {
  const safe = Number.isFinite(v) ? v : 0
  return `R$ ${safe
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

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
          <Button variant="outline" size="icon" onClick={() => setDisplayYear(displayYear - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold">{displayYear}</div>
          <Button variant="outline" size="icon" onClick={() => setDisplayYear(displayYear + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {shortMonths.map((m, i) => (
            <Button
              key={i}
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

export default function GoalManualEntry({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [data, setData] = useState<any>({ sellers: [], regionals: [], areas: [], districts: [] })

  const [distId, setDistId] = useState('')
  const [regId, setRegId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [metric, setMetric] = useState(EXPLICIT_METRICS[0])

  const [loadedGoal, setLoadedGoal] = useState<any>(null)
  const [perfId, setPerfId] = useState<string | null>(null)

  const [targetBase, setTargetBase] = useState('')
  const [targetBronze, setTargetBronze] = useState('')
  const [targetPrata, setTargetPrata] = useState('')
  const [targetOuro, setTargetOuro] = useState('')
  const [tiersTouched, setTiersTouched] = useState(false)
  const [atual, setAtual] = useState('')
  const [covDaily, setCovDaily] = useState('')
  const [covWeekly, setCovWeekly] = useState('')
  const [covMonthly, setCovMonthly] = useState('')

  const [history, setHistory] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCoverage = metric === 'Coverage' || metric.toLowerCase().includes('cobertura')
  const isCurrency = !isCoverage

  const formatVal = (v: any) => {
    if (v === undefined || v === null) return ''
    return isCurrency ? formatCurrency(Number(v) || 0) : String(v)
  }
  const parseVal = (v: string) => {
    if (!v) return 0
    const result = isCurrency ? unmaskMoney(v) : Number(v.toString().replace(',', '.'))
    return Number.isFinite(result) ? result : 0
  }

  useEffect(() => {
    Promise.all([
      pb.collection('sellers').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('districts').getFullList({ filter: 'is_active = true', sort: 'name' }),
    ]).then(([s, r, a, d]) => {
      setData({ sellers: s, regionals: r, areas: a, districts: d })
    })
  }, [])

  const loadData = async () => {
    const seller = data.sellers.find((s: any) => s.id === sellerId)
    setTiersTouched(false)
    if (!seller?.user_id || !period || !metric) {
      setLoadedGoal(null)
      setPerfId(null)
      setTargetBase('')
      setTargetBronze('')
      setTargetPrata('')
      setTargetOuro('')
      setAtual('')
      setHistory([])
      setAuditLogs([])
      return
    }

    let gId = null
    try {
      const mixFamily = isCoverage
        ? ''
        : metric.startsWith('Mix_')
          ? metric.replace('Mix_', '')
          : ''
      const g = await pb
        .collection('goals')
        .getFirstListItem(
          `seller_id="${seller.user_id}" && district_id="${distId}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="${metric}" && mix_family="${mixFamily}"`,
        )
      setLoadedGoal(g)
      gId = g.id
      const baseVal = g.target_base || g.target_monthly_coverage || 0
      setTargetBase(formatVal(baseVal))
      setTargetBronze(formatVal(g.target_bronze || 0))
      setTargetPrata(formatVal(g.target_prata || 0))
      setTargetOuro(formatVal(g.target_ouro || 0))
      setCovDaily(String(g.target_daily_coverage || ''))
      setCovWeekly(String(g.target_weekly_coverage || ''))
      setCovMonthly(String(g.target_monthly_coverage || ''))
    } catch {
      setLoadedGoal(null)
      setTargetBase('')
      setTargetBronze('')
      setTargetPrata('')
      setTargetOuro('')
      setCovDaily('')
      setCovWeekly('')
      setCovMonthly('')
    }

    try {
      const p = await pb
        .collection('actual_performance')
        .getFirstListItem(
          `seller_id="${seller.user_id}" && period="${period}" && metric="${metric}"`,
        )
      setPerfId(p.id)
      setAtual(formatVal(p.actual_value || p.actual_coverage || 0))
    } catch {
      setPerfId(null)
      setAtual('')
    }

    try {
      const perfs = await pb.collection('actual_performance').getFullList({
        filter: `seller_id="${seller.user_id}" && metric="${metric}"`,
        sort: '-period',
      })
      const goals = await pb.collection('goals').getFullList({
        filter: `seller_id="${seller.user_id}" && district_id="${distId}" && area_id="${areaId}" && metric="${metric}"`,
      })
      setHistory(
        perfs.map((p) => ({
          ...p,
          target: goals.find((x) => x.period === p.period)?.target_base || 0,
        })),
      )
    } catch {
      setHistory([])
    }

    try {
      if (gId) {
        const logs = await pb
          .collection('goal_audit_logs')
          .getFullList({ filter: `goal_id="${gId}"`, sort: '-created', expand: 'user_id' })
        setAuditLogs(logs)
      } else {
        setAuditLogs([])
      }
    } catch {
      setAuditLogs([])
    }
  }

  useEffect(() => {
    loadData()
  }, [sellerId, areaId, period, metric, data.sellers, refreshTrigger])

  const calcBase = parseVal(targetBase)
  const calcBronze = parseVal(targetBronze)
  const calcPrata = parseVal(targetPrata)
  const calcOuro = parseVal(targetOuro)

  useEffect(() => {
    if (isCoverage && calcBase > 0 && !loadedGoal && !tiersTouched) {
      setTargetBronze(String(Math.round(calcBase * 1.4)))
      setTargetPrata(String(Math.round(calcBase * 1.6)))
      setTargetOuro(String(Math.round(calcBase * 1.8)))
    }
  }, [targetBase, isCoverage, loadedGoal, tiersTouched, calcBase])
  const pctBronzeDisp = calcBase > 0 ? (calcBronze / calcBase) * 100 : 0
  const pctPrataDisp = calcBase > 0 ? (calcPrata / calcBase) * 100 : 0
  const pctOuroDisp = calcBase > 0 ? (calcOuro / calcBase) * 100 : 0
  const calcActual = parseVal(atual)
  const calcCovDaily = parseVal(covDaily)
  const calcCovWeekly = parseVal(covWeekly)
  const calcCovMonthly = parseVal(covMonthly)

  const diff = calcActual - calcBase
  const ouroDiff = calcActual - calcOuro
  const pct = calcBase > 0 ? (calcActual / calcBase) * 100 : 0

  const getTier = () => {
    if (calcActual >= calcOuro && calcOuro > 0)
      return { name: 'Ouro', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
    if (calcActual >= calcPrata && calcPrata > 0)
      return { name: 'Prata', color: 'bg-slate-100 text-slate-800 border-slate-300' }
    if (calcActual >= calcBronze && calcBronze > 0)
      return { name: 'Bronze', color: 'bg-amber-100 text-amber-800 border-amber-300' }
    return { name: 'Abaixo do Bronze', color: 'bg-red-100 text-red-800 border-red-300' }
  }
  const tier = getTier()
  const isOverachieving = calcActual > calcOuro && calcOuro > 0

  const savePerf = async () => {
    if (isCoverage) {
      if (calcBronze > calcPrata) {
        return toast({
          title: 'Atenção',
          description: 'Meta Bronze não pode ser maior que Meta Prata.',
          variant: 'destructive',
        })
      }
      if (calcPrata > calcOuro) {
        return toast({
          title: 'Atenção',
          description: 'Meta Prata não pode ser maior que Meta Ouro.',
          variant: 'destructive',
        })
      }
      if ([calcBase, calcBronze, calcPrata, calcOuro].some((v) => v < 0)) {
        return toast({
          title: 'Atenção',
          description: 'Todos os valores devem ser positivos.',
          variant: 'destructive',
        })
      }
    }

    const seller = data.sellers.find((s: any) => s.id === sellerId)
    if (!seller?.user_id || !period || !metric || !regId || !areaId || !distId) {
      return toast({
        title: 'Atenção',
        description:
          'Preencha todos os campos obrigatórios: Distrito, Regional, Área, Vendedor, Período e Métrica.',
        variant: 'destructive',
      })
    }

    if (calcBase <= 0) {
      return toast({
        title: 'Atenção',
        description: 'O campo Meta Base é obrigatório.',
        variant: 'destructive',
      })
    }

    setIsSubmitting(true)
    try {
      const mixFamily = isCoverage
        ? ''
        : metric.startsWith('Mix_')
          ? metric.replace('Mix_', '')
          : ''

      let existingGoal = null
      try {
        existingGoal = await pb
          .collection('goals')
          .getFirstListItem(
            `seller_id="${seller.user_id}" && district_id="${distId}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="${metric}" && mix_family="${mixFamily}"`,
          )
      } catch (err) {
        // Not found, will create
      }

      const newGoalData = {
        target_base: calcBase,
        target_bronze: calcBronze,
        target_prata: calcPrata,
        target_ouro: calcOuro,
        target_daily_coverage: calcCovDaily,
        target_weekly_coverage: calcCovWeekly,
        target_monthly_coverage: calcCovMonthly || (isCoverage ? calcBase : 0),
      }

      let currentGoalId = existingGoal?.id

      if (currentGoalId) {
        const changes: any = {}
        let hasChanges = false
        for (const k of Object.keys(newGoalData)) {
          if (newGoalData[k as keyof typeof newGoalData] !== existingGoal[k]) {
            hasChanges = true
            changes[k] = newGoalData[k as keyof typeof newGoalData]
          }
        }
        if (hasChanges) {
          await pb.collection('goals').update(currentGoalId, changes)
          await pb.collection('goal_audit_logs').create({
            goal_id: currentGoalId,
            user_id: user.id,
            old_values: existingGoal,
            new_values: changes,
          })
        }
      } else {
        try {
          const g = await pb.collection('goals').create({
            seller_id: seller.user_id,
            district_id: distId,
            area_id: areaId,
            regional_id: regId,
            period,
            metric,
            mix_family: mixFamily,
            ...newGoalData,
          })
          currentGoalId = g.id
          await pb.collection('goal_audit_logs').create({
            goal_id: currentGoalId,
            user_id: user.id,
            old_values: null,
            new_values: newGoalData,
          })
        } catch (createErr) {
          const foundGoal = await pb
            .collection('goals')
            .getFirstListItem(
              `seller_id="${seller.user_id}" && district_id="${distId}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="${metric}" && mix_family="${mixFamily}"`,
            )
            .catch(() => null)
          if (foundGoal) {
            currentGoalId = foundGoal.id
            await pb.collection('goals').update(foundGoal.id, newGoalData)
            await pb.collection('goal_audit_logs').create({
              goal_id: foundGoal.id,
              user_id: user.id,
              old_values: foundGoal,
              new_values: newGoalData,
            })
          } else {
            throw createErr
          }
        }
      }

      const newPerfData = { actual_value: calcActual, actual_coverage: isCoverage ? calcActual : 0 }

      let existingPerf = null
      try {
        existingPerf = await pb
          .collection('actual_performance')
          .getFirstListItem(
            `seller_id="${seller.user_id}" && period="${period}" && metric="${metric}"`,
          )
      } catch (err) {
        // Not found
      }

      if (existingPerf) {
        await pb.collection('actual_performance').update(existingPerf.id, newPerfData)
      } else {
        try {
          await pb.collection('actual_performance').create({
            seller_id: seller.user_id,
            period,
            metric,
            mix_family: mixFamily,
            ...newPerfData,
          })
        } catch (createErr) {
          const foundPerf = await pb
            .collection('actual_performance')
            .getFirstListItem(
              `seller_id="${seller.user_id}" && period="${period}" && metric="${metric}"`,
            )
            .catch(() => null)
          if (foundPerf) {
            await pb.collection('actual_performance').update(foundPerf.id, newPerfData)
          } else {
            throw createErr
          }
        }
      }

      toast({ title: 'Sucesso', description: 'Meta salva com sucesso!' })
      await loadData()
    } catch (e) {
      toast({
        title: 'Erro ao salvar meta',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border space-y-8">
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
            <SelectValue placeholder="Distrito" />
          </SelectTrigger>
          <SelectContent>
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
            <SelectValue placeholder="Regional" />
          </SelectTrigger>
          <SelectContent>
            {data.regionals
              .filter((r: any) => !distId || r.district_id === distId)
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
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            {data.areas
              .filter((a: any) => !regId || a.regional_id === regId)
              .map((a: any) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={sellerId} onValueChange={setSellerId}>
          <SelectTrigger>
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            {data.sellers
              .filter((s: any) => !areaId || s.area_id === areaId)
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
            {EXPLICIT_METRICS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!sellerId ? (
        <div className="p-8 text-center border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            Selecione todos os filtros para carregar as metas.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Meta Base
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">
                  {isCurrency
                    ? formatCurrency(calcBase)
                    : calcBase.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Realizada
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">
                  {isCurrency
                    ? formatCurrency(calcActual)
                    : calcActual.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Diferença{' '}
                  {diff > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div
                  className={cn(
                    'text-2xl font-bold',
                    diff >= 0 ? 'text-green-600' : 'text-red-500',
                  )}
                >
                  {diff >= 0 ? '+' : '-'}
                  {isCurrency
                    ? formatCurrency(Math.abs(diff))
                    : Math.abs(diff).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </div>
              </CardContent>
            </Card>
            <Card className={cn('border-yellow-300/50', ouroDiff >= 0 && 'bg-yellow-50/50')}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Meta Ouro{' '}
                  {ouroDiff >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-yellow-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div
                  className={cn(
                    'text-2xl font-bold',
                    ouroDiff >= 0 ? 'text-green-600' : 'text-yellow-700',
                  )}
                >
                  {ouroDiff >= 0 ? '+' : '-'}
                  {isCurrency
                    ? formatCurrency(Math.abs(ouroDiff))
                    : Math.abs(ouroDiff).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  % Atingimento
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div
                  className={cn(
                    'text-2xl font-bold',
                    isCoverage
                      ? pct >= 100
                        ? 'text-green-600'
                        : pct >= 80
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      : 'text-primary',
                  )}
                >
                  {calcBase === 0 ? 'N/A' : `${pct.toFixed(1)}%`}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nível Atual de Atingimento
                </p>
                <div
                  className={cn(
                    'inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border mt-1',
                    tier.color,
                  )}
                >
                  {tier.name}
                </div>
              </div>
            </div>
            {isOverachieving && (
              <Alert className="bg-yellow-50 border-yellow-200 w-auto py-2">
                <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800 text-sm mb-0 ml-2 font-bold">
                  Meta Ouro Superada!
                </AlertTitle>
              </Alert>
            )}
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meta Base</TableHead>
                  <TableHead>Meta Bronze</TableHead>
                  <TableHead>Meta Prata</TableHead>
                  <TableHead>Meta Ouro</TableHead>
                  <TableHead className="bg-primary/5">Realizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Input
                      type={isCoverage ? 'number' : 'text'}
                      min={isCoverage ? 0 : undefined}
                      step={isCoverage ? 1 : undefined}
                      value={targetBase}
                      onChange={(e) =>
                        setTargetBase(isCurrency ? maskMoney(e.target.value) : e.target.value)
                      }
                      placeholder="0"
                    />
                  </TableCell>
                  {isCoverage ? (
                    <>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={targetBronze}
                            onChange={(e) => {
                              setTargetBronze(e.target.value)
                              setTiersTouched(true)
                            }}
                            placeholder="0"
                            className="font-medium text-amber-700"
                          />
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {pctBronzeDisp.toFixed(1)}% da Meta Base
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={targetPrata}
                            onChange={(e) => {
                              setTargetPrata(e.target.value)
                              setTiersTouched(true)
                            }}
                            placeholder="0"
                            className="font-medium text-slate-500"
                          />
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {pctPrataDisp.toFixed(1)}% da Meta Base
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={targetOuro}
                            onChange={(e) => {
                              setTargetOuro(e.target.value)
                              setTiersTouched(true)
                            }}
                            placeholder="0"
                            className="font-medium text-yellow-600"
                          />
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {pctOuroDisp.toFixed(1)}% da Meta Base
                          </span>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Input
                          value={targetBronze}
                          onChange={(e) =>
                            setTargetBronze(isCurrency ? maskMoney(e.target.value) : e.target.value)
                          }
                          placeholder="0"
                          className="text-amber-700 font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={targetPrata}
                          onChange={(e) =>
                            setTargetPrata(isCurrency ? maskMoney(e.target.value) : e.target.value)
                          }
                          placeholder="0"
                          className="text-slate-500 font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={targetOuro}
                          onChange={(e) =>
                            setTargetOuro(isCurrency ? maskMoney(e.target.value) : e.target.value)
                          }
                          placeholder="0"
                          className="text-yellow-600 font-medium"
                        />
                      </TableCell>
                    </>
                  )}
                  <TableCell className="bg-primary/5">
                    <Input
                      type={isCoverage ? 'number' : 'text'}
                      min={isCoverage ? 0 : undefined}
                      step={isCoverage ? 1 : undefined}
                      value={atual}
                      onChange={(e) =>
                        setAtual(isCurrency ? maskMoney(e.target.value) : e.target.value)
                      }
                      placeholder="0"
                      className="border-primary/50"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {isCoverage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CoverageTierCard
                label="Bronze"
                value={calcBronze}
                pct={pctBronzeDisp}
                actual={calcActual}
                colorClass="text-amber-700"
                borderClass="border-amber-300/50"
              />
              <CoverageTierCard
                label="Prata"
                value={calcPrata}
                pct={pctPrataDisp}
                actual={calcActual}
                colorClass="text-slate-600"
                borderClass="border-slate-300/50"
              />
              <CoverageTierCard
                label="Ouro"
                value={calcOuro}
                pct={pctOuroDisp}
                actual={calcActual}
                colorClass="text-yellow-600"
                borderClass="border-yellow-300/50"
              />
            </div>
          )}

          {isCoverage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Meta Cobertura Diária
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Input
                    value={covDaily}
                    onChange={(e) => setCovDaily(e.target.value)}
                    placeholder="0"
                    type="number"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Meta Cobertura Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Input
                    value={covWeekly}
                    onChange={(e) => setCovWeekly(e.target.value)}
                    placeholder="0"
                    type="number"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Meta Cobertura Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Input
                    value={covMonthly}
                    onChange={(e) => setCovMonthly(e.target.value)}
                    placeholder="0"
                    type="number"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={savePerf} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : loadedGoal ? 'Salvar Alterações' : 'Criar Lançamento'}
            </Button>
          </div>
        </div>
      )}

      {auditLogs.length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" /> Histórico de Alterações
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Modificações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {new Date(log.created).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>{log.expand?.user_id?.name || 'Sistema'}</TableCell>
                  <TableCell className="text-sm">
                    {!log.old_values
                      ? 'Meta criada.'
                      : Object.keys(log.new_values || {}).map((k) => (
                          <div key={k}>
                            <span className="font-medium">{k}:</span> {log.old_values[k]} ➔{' '}
                            <span className="text-primary">{log.new_values[k]}</span>
                          </div>
                        ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function getAchievementLevel(actual: number, target: number) {
  if (target <= 0)
    return { label: 'N/A', color: 'text-muted-foreground', bg: 'bg-muted/50 border-muted' }
  const pct = (actual / target) * 100
  if (pct >= 100)
    return {
      label: `${pct.toFixed(1)}%`,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-300',
    }
  if (pct >= 80)
    return {
      label: `${pct.toFixed(1)}%`,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 border-yellow-300',
    }
  return { label: `${pct.toFixed(1)}%`, color: 'text-red-600', bg: 'bg-red-50 border-red-300' }
}

function CoverageTierCard({
  label,
  value,
  pct,
  actual,
  colorClass,
  borderClass,
}: {
  label: string
  value: number
  pct: number
  actual: number
  colorClass: string
  borderClass: string
}) {
  const achievement = getAchievementLevel(actual, value)
  return (
    <Card className={cn('p-4', borderClass)}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-sm font-bold', colorClass)}>{label}</span>
        <span className="text-xs text-muted-foreground">{pct.toFixed(1)}% da Base</span>
      </div>
      <div className="text-2xl font-bold mb-2">{value.toLocaleString('pt-BR')}</div>
      <div
        className={cn(
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border',
          achievement.bg,
          achievement.color,
        )}
      >
        Atingimento: {achievement.label}
      </div>
    </Card>
  )
}
