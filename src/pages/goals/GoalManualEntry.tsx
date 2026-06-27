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
import { CalendarIcon, ChevronLeft, ChevronRight, History, Target } from 'lucide-react'
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

export default function GoalManualEntry() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [data, setData] = useState<any>({ sellers: [], regionals: [], areas: [], districts: [] })
  const [distId, setDistId] = useState('')
  const [regId, setRegId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [metric, setMetric] = useState('')
  const [metricsList, setMetricsList] = useState<string[]>([])

  const [loadedGoal, setLoadedGoal] = useState<any>(null)
  const [perfId, setPerfId] = useState<string | null>(null)

  // States for Goal and Performance inputs
  const [targetBase, setTargetBase] = useState('')
  const [targetBronze, setTargetBronze] = useState('')
  const [targetPrata, setTargetPrata] = useState('')
  const [targetOuro, setTargetOuro] = useState('')
  const [atual, setAtual] = useState('')

  // Coverage specific states
  const [targetCoverage, setTargetCoverage] = useState('')
  const [plannedCompanies, setPlannedCompanies] = useState('')
  const [actualCoverage, setActualCoverage] = useState('')
  const [visitedCompanies, setVisitedCompanies] = useState('')

  const [history, setHistory] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCoverage = metric.toLowerCase().includes('cobertura')
  const isCurrency =
    (metric.toLowerCase().includes('faturamento') || metric.toLowerCase().includes('f')) &&
    !isCoverage

  const formatVal = (v: any) => {
    if (v === undefined || v === null) return ''
    return isCurrency ? maskMoney(Number(v) * 100) : String(v)
  }
  const parseVal = (v: string) => {
    if (!v) return 0
    return isCurrency ? unmaskMoney(v) : Number(v.replace(',', '.'))
  }

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
      } else {
        const fallbacks = ['Métrica Faturamento', 'Métrica Família', 'Cobertura Mensal']
        setMetricsList(fallbacks)
        if (!metric) setMetric(fallbacks[0])
      }
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
      setTargetCoverage('')
      setPlannedCompanies('')
      setActualCoverage('')
      setVisitedCompanies('')
      setHistory([])
      setAuditLogs([])
      return
    }

    let gId = null
    try {
      const g = await pb
        .collection('goals')
        .getFirstListItem(
          `seller_id="${seller.user_id}" && area_id="${areaId}" && period="${period}" && metric="${metric}"`,
        )
      setLoadedGoal(g)
      gId = g.id
      setTargetBase(formatVal(g.target_base || 0))
      setTargetBronze(formatVal(g.target_bronze || 0))
      setTargetPrata(formatVal(g.target_prata || 0))
      setTargetOuro(formatVal(g.target_ouro || 0))
      setTargetCoverage(g.target_monthly_coverage?.toString() || '')
      setPlannedCompanies(g.focus_companies?.toString() || '')
    } catch {
      setLoadedGoal(null)
      setTargetBase('')
      setTargetBronze('')
      setTargetPrata('')
      setTargetOuro('')
      setTargetCoverage('')
      setPlannedCompanies('')
    }

    try {
      const p = await pb
        .collection('actual_performance')
        .getFirstListItem(
          `seller_id="${seller.user_id}" && period="${period}" && metric="${metric}"`,
        )
      setPerfId(p.id)
      setAtual(formatVal(p.actual_value || 0))
      setActualCoverage(p.actual_coverage?.toString() || '')
      setVisitedCompanies(p.focus_companies?.toString() || '')
    } catch {
      setPerfId(null)
      setAtual('')
      setActualCoverage('')
      setVisitedCompanies('')
    }

    try {
      const perfs = await pb.collection('actual_performance').getFullList({
        filter: `seller_id="${seller.user_id}" && metric="${metric}"`,
        sort: '-created',
        expand: 'seller_id',
      })
      const goals = await pb
        .collection('goals')
        .getFullList({
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

  const savePerf = async () => {
    const seller = data.sellers.find((s: any) => s.id === sellerId)
    if (!seller?.user_id || !period || !metric || !regId || !areaId || !distId) {
      return toast({
        title: 'Atenção',
        description: 'Preencha todos os seletores.',
        variant: 'destructive',
      })
    }

    setIsSubmitting(true)
    try {
      let currentGoalId = loadedGoal?.id

      const newGoalData = isCoverage
        ? {
            target_monthly_coverage: Number(targetCoverage),
            focus_companies: Number(plannedCompanies),
          }
        : {
            target_base: parseVal(targetBase),
            target_bronze: parseVal(targetBronze),
            target_prata: parseVal(targetPrata),
            target_ouro: parseVal(targetOuro),
          }

      if (currentGoalId) {
        const changes: any = {}
        let hasChanges = false
        for (const k of Object.keys(newGoalData)) {
          if (newGoalData[k as keyof typeof newGoalData] !== loadedGoal[k]) {
            hasChanges = true
            changes[k] = newGoalData[k as keyof typeof newGoalData]
          }
        }

        if (hasChanges) {
          await pb.collection('goals').update(currentGoalId, changes)
          await pb.collection('goal_audit_logs').create({
            goal_id: currentGoalId,
            user_id: user.id,
            old_values: loadedGoal,
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
          mix_family: isCoverage ? '' : metric,
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

      const newPerfData = isCoverage
        ? {
            actual_coverage: Number(actualCoverage),
            focus_companies: Number(visitedCompanies),
            actual_value: 0,
          }
        : {
            actual_value: parseVal(atual),
          }

      if (perfId) {
        await pb.collection('actual_performance').update(perfId, newPerfData)
      } else {
        await pb.collection('actual_performance').create({
          seller_id: seller.user_id,
          period,
          metric,
          ...newPerfData,
        })
      }

      toast({ title: 'Sucesso', description: 'Valores salvos com sucesso!' })
      loadData()
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePerf = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento de desempenho?')) return
    setIsSubmitting(true)
    try {
      await pb.collection('actual_performance').delete(id)
      toast({ title: 'Sucesso', description: 'Desempenho excluído!' })
      loadData()
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao excluir.', variant: 'destructive' })
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
            {metricsList.map((m) => (
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
          {isCoverage ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Métricas de Cobertura
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border p-4 rounded-md bg-muted/10">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Meta Cobertura (%)
                  </label>
                  <Input
                    value={targetCoverage}
                    onChange={(e) => setTargetCoverage(e.target.value)}
                    type="number"
                    placeholder="Ex: 80"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Cobertura Atual (%)
                  </label>
                  <Input
                    value={actualCoverage}
                    onChange={(e) => setActualCoverage(e.target.value)}
                    type="number"
                    placeholder="Ex: 75"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Empresas Planejadas
                  </label>
                  <Input
                    value={plannedCompanies}
                    onChange={(e) => setPlannedCompanies(e.target.value)}
                    type="number"
                    placeholder="Ex: 40"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Empresas Visitadas
                  </label>
                  <Input
                    value={visitedCompanies}
                    onChange={(e) => setVisitedCompanies(e.target.value)}
                    type="number"
                    placeholder="Ex: 30"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Metas e Realizado
              </h3>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meta Base</TableHead>
                      <TableHead>Meta Bronze</TableHead>
                      <TableHead>Meta Prata</TableHead>
                      <TableHead>Meta Ouro</TableHead>
                      <TableHead className="bg-primary/5">Meta Atual (Realizado)</TableHead>
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
            </div>
          )}

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
            <History className="w-5 h-5 text-muted-foreground" />
            Histórico de Alterações (Metas)
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
                  <TableCell className="font-medium text-muted-foreground">
                    {new Date(log.created).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>{log.expand?.user_id?.name || 'Sistema'}</TableCell>
                  <TableCell className="text-sm">
                    {!log.old_values ? (
                      'Meta criada na plataforma.'
                    ) : (
                      <div className="space-y-1">
                        {Object.keys(log.new_values || {}).map((k) => (
                          <div key={k}>
                            <span className="font-medium">{k}:</span> {log.old_values[k]} ➔{' '}
                            <span className="text-primary">{log.new_values[k]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            Lançamentos Anteriores (Desempenho Atual)
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Valor Realizado</TableHead>
                <TableHead>% Atingimento (Base)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h: any) => {
                const isCovHist = h.metric.toLowerCase().includes('cobertura')
                const val = isCovHist ? h.actual_coverage : h.actual_value
                const tgt = isCovHist ? h.target_monthly_coverage || 0 : h.target
                const pct = tgt > 0 ? ((val / tgt) * 100).toFixed(1) : 0
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.period}</TableCell>
                    <TableCell>
                      {isCovHist ? `${val}%` : isCurrency ? maskMoney(val * 100) : val}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          Number(pct) >= 100
                            ? 'bg-green-100 text-green-800'
                            : Number(pct) >= 80
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800',
                        )}
                      >
                        {pct}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPeriod(h.period)
                          loadData()
                        }}
                      >
                        Selecionar Período
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletePerf(h.id)}
                      >
                        Excluir Desempenho
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
