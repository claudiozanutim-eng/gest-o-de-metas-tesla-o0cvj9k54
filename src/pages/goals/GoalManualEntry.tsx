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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

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

export default function GoalManualEntry() {
  const { toast } = useToast()
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
  const [atual, setAtual] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCurrency =
    metric.toLowerCase().includes('faturamento') || metric.toLowerCase().includes('f')
  const formatVal = (v: number) => (isCurrency ? maskMoney(v * 100) : v.toString())
  const parseVal = (v: string) => (isCurrency ? unmaskMoney(v) : Number(v.replace(',', '.')))

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
        const fallbacks = ['Métrica Faturamento', 'Métrica Família', 'Métrica Cobertura']
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
      setAtual('')
      setHistory([])
      return
    }

    try {
      const g = await pb
        .collection('goals')
        .getFirstListItem(
          `seller_id="${seller.user_id}" && period="${period}" && metric="${metric}"`,
        )
      setLoadedGoal(g)
    } catch {
      setLoadedGoal(null)
    }

    try {
      const p = await pb
        .collection('actual_performance')
        .getFirstListItem(
          `seller_id="${seller.user_id}" && period="${period}" && metric="${metric}"`,
        )
      setPerfId(p.id)
      setAtual(isCurrency ? maskMoney(p.actual_value * 100) : p.actual_value.toString())
    } catch {
      setPerfId(null)
      setAtual('')
    }

    try {
      const perfs = await pb.collection('actual_performance').getFullList({
        filter: `seller_id="${seller.user_id}" && metric="${metric}"`,
        sort: '-period',
        expand: 'seller_id',
      })
      const goals = await pb.collection('goals').getFullList({
        filter: `seller_id="${seller.user_id}" && metric="${metric}"`,
        sort: '-period',
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
  }

  useEffect(() => {
    loadData()
  }, [sellerId, period, metric, data.sellers])

  const savePerf = async () => {
    const seller = data.sellers.find((s: any) => s.id === sellerId)
    if (!seller?.user_id || !period || !metric || !atual || !regId || !areaId || !distId) {
      return toast({
        title: 'Atenção',
        description: 'Preencha todos os seletores e a Meta Atual.',
        variant: 'destructive',
      })
    }

    const val = parseVal(atual)

    if (val < 0) {
      return toast({
        title: 'Atenção',
        description: 'Meta Atual deve ser positiva.',
        variant: 'destructive',
      })
    }

    const isCoverage = metric.toLowerCase().includes('cobertura')
    if (isCoverage && val > 100) {
      return toast({
        title: 'Atenção',
        description: 'Cobertura Atual deve estar entre 0 e 100.',
        variant: 'destructive',
      })
    }

    if (loadedGoal && val > loadedGoal.target_ouro) {
      toast({
        title: 'Aviso',
        description: 'Aviso: Meta Atual excede Meta Ouro.',
        variant: 'default',
      })
    }

    setIsSubmitting(true)
    try {
      const payload = {
        seller_id: seller.user_id,
        period,
        metric,
        actual_value: val,
      }
      if (perfId) await pb.collection('actual_performance').update(perfId, payload)
      else await pb.collection('actual_performance').create(payload)
      toast({ title: 'Sucesso', description: 'Desempenho salvo!' })
      loadData()
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePerf = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return
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

  const MetricCard = ({ title, act, tgt }: any) => {
    const pct = tgt > 0 ? (act / tgt) * 100 : 0
    const color = pct >= 100 ? 'text-green-600' : pct >= 80 ? 'text-yellow-500' : 'text-red-500'
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className={cn('text-2xl font-bold', color)}>{pct.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground mt-1">Meta: {formatVal(tgt)}</div>
        </CardContent>
      </Card>
    )
  }

  const aVal = parseVal(atual) || 0

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Select value={distId} onValueChange={setDistId}>
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
        <Select value={regId} onValueChange={setRegId}>
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
        <Select value={areaId} onValueChange={setAreaId}>
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
        <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
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

      {!loadedGoal ? (
        <div className="p-8 text-center border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            Nenhuma meta lançada para esta combinação. As metas base devem ser importadas via Lote.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Metas Comparativas</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meta Base</TableHead>
                    <TableHead>Meta Bronze</TableHead>
                    <TableHead>Meta Prata</TableHead>
                    <TableHead>Meta Ouro</TableHead>
                    <TableHead>Meta Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="bg-muted/50 font-medium">
                      {formatVal(loadedGoal.target_base)}
                    </TableCell>
                    <TableCell className="bg-muted/50 font-medium text-amber-700">
                      {formatVal(loadedGoal.target_bronze)}
                    </TableCell>
                    <TableCell className="bg-muted/50 font-medium text-slate-500">
                      {formatVal(loadedGoal.target_prata)}
                    </TableCell>
                    <TableCell className="bg-muted/50 font-medium text-yellow-600">
                      {formatVal(loadedGoal.target_ouro)}
                    </TableCell>
                    <TableCell className="bg-background">
                      <Input
                        value={atual}
                        onChange={(e) => {
                          if (isCurrency) setAtual(maskMoney(e.target.value))
                          else setAtual(e.target.value)
                        }}
                        placeholder={isCurrency ? 'R$ 0,00' : '0'}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <MetricCard title="Atingimento Base" act={aVal} tgt={loadedGoal.target_base} />
              <MetricCard title="Atingimento Bronze" act={aVal} tgt={loadedGoal.target_bronze} />
              <MetricCard title="Atingimento Prata" act={aVal} tgt={loadedGoal.target_prata} />
              <MetricCard title="Atingimento Ouro" act={aVal} tgt={loadedGoal.target_ouro} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={savePerf} disabled={isSubmitting}>
              Salvar Desempenho
            </Button>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold">Histórico de Lançamentos de Desempenho</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>% Atingimento (Base)</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h: any) => {
                const sellerName = h.expand?.seller_id?.name || '-'
                const pct = h.target > 0 ? ((h.actual_value / h.target) * 100).toFixed(1) : 0
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.period}</TableCell>
                    <TableCell>
                      {isCurrency ? maskMoney(h.actual_value * 100) : h.actual_value}
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
                    <TableCell>{sellerName}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPeriod(h.period)
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletePerf(h.id)}
                      >
                        Excluir
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
