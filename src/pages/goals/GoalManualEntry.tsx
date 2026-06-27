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
  'Coverage',
  'Mix_F1',
  'Mix_F2',
  'Mix_F3',
  'Mix_Outros',
  'Faturamento (Geral)',
]

const maskMoney = (v: any) => {
  const n = String(v).replace(/\D/g, '')
  return n
    ? `R$ ${(parseInt(n) / 100)
        .toFixed(2)
        .replace('.', ',')
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
    : ''
}
const unmaskMoney = (v: any) => parseInt(String(v).replace(/\D/g, '') || '0') / 100

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

export default function GoalManualEntry() {
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
  const [atual, setAtual] = useState('')

  const [history, setHistory] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCoverage = metric === 'Coverage' || metric.toLowerCase().includes('cobertura')
  const isCurrency = !isCoverage

  const formatVal = (v: any) => {
    if (v === undefined || v === null) return ''
    return isCurrency ? maskMoney(Number(v) * 100) : String(v)
  }
  const parseVal = (v: string) => {
    if (!v) return 0
    return isCurrency ? unmaskMoney(v) : Number(v.toString().replace(',', '.'))
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
      const mixFamily = isCoverage ? '' : metric
      const g = await pb
        .collection('goals')
        .getFirstListItem(
          `seller_id="${seller.user_id}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="${metric}" && mix_family="${mixFamily}"`,
        )
      setLoadedGoal(g)
      gId = g.id
      setTargetBase(formatVal(g.target_base || g.target_monthly_coverage || 0))
      setTargetBronze(formatVal(g.target_bronze || 0))
      setTargetPrata(formatVal(g.target_prata || 0))
      setTargetOuro(formatVal(g.target_ouro || 0))
    } catch {
      setLoadedGoal(null)
      setTargetBase('')
      setTargetBronze('')
      setTargetPrata('')
      setTargetOuro('')
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
        filter: `seller_id="${seller.user_id}" && area_id="${areaId}" && metric="${metric}"`,
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
  }, [sellerId, areaId, period, metric, data.sellers])

  const calcBase = parseVal(targetBase)
  const calcBronze = parseVal(targetBronze)
  const calcPrata = parseVal(targetPrata)
  const calcOuro = parseVal(targetOuro)
  const calcActual = parseVal(atual)

  const diff = calcActual - calcBase
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
    const seller = data.sellers.find((s: any) => s.id === sellerId)
    if (!seller?.user_id || !period || !metric || !regId || !areaId || !distId) {
      return toast({
        title: 'Atenção',
        description: 'Preencha todos os seletores obrigatórios.',
        variant: 'destructive',
      })
    }

    setIsSubmitting(true)
    try {
      const mixFamily = isCoverage ? '' : metric

      let existingGoal = null
      try {
        existingGoal = await pb
          .collection('goals')
          .getFirstListItem(
            `seller_id="${seller.user_id}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="${metric}" && mix_family="${mixFamily}"`,
          )
      } catch (err) {
        // Not found, will create
      }

      const newGoalData = {
        target_base: calcBase,
        target_bronze: calcBronze,
        target_prata: calcPrata,
        target_ouro: calcOuro,
        target_monthly_coverage: isCoverage ? calcBase : 0,
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
        const g = await pb.collection('goals').create({
          seller_id: seller.user_id,
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
        await pb.collection('actual_performance').create({
          seller_id: seller.user_id,
          period,
          metric,
          mix_family: mixFamily,
          ...newPerfData,
        })
      }

      toast({ title: 'Sucesso', description: 'Meta lançada com sucesso' })
      setTargetBase('')
      setTargetBronze('')
      setTargetPrata('')
      setTargetOuro('')
      setAtual('')
      setSellerId('')
      setDistId('')
      setRegId('')
      setAreaId('')

      // Let loadData handle refreshing the UI context if any remains
      loadData()
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Meta Base {isCoverage && '(%)'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">
                  {isCurrency ? maskMoney(calcBase * 100) : calcBase}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Realizada {isCoverage && '(%)'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">
                  {isCurrency ? maskMoney(calcActual * 100) : calcActual}
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
                  {diff >= 0 ? '+' : ''}
                  {isCurrency ? maskMoney(diff * 100) : diff}
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
                <div className="text-2xl font-bold text-primary">{pct.toFixed(1)}%</div>
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
                  <TableHead>Meta Base {isCoverage && '(%)'}</TableHead>
                  <TableHead>Meta Bronze {isCoverage && '(%)'}</TableHead>
                  <TableHead>Meta Prata {isCoverage && '(%)'}</TableHead>
                  <TableHead>Meta Ouro {isCoverage && '(%)'}</TableHead>
                  <TableHead className="bg-primary/5">Realizado {isCoverage && '(%)'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Input
                      value={targetBase}
                      onChange={(e) =>
                        setTargetBase(isCurrency ? maskMoney(e.target.value) : e.target.value)
                      }
                      placeholder="0"
                    />
                  </TableCell>
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
                  <TableCell className="bg-primary/5">
                    <Input
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

          <div className="flex justify-end">
            <Button onClick={savePerf} disabled={isSubmitting}>
              {loadedGoal ? 'Salvar Alterações' : 'Criar Lançamento'}
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
