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
  const [data, setData] = useState<any>({ sellers: [], regionals: [], areas: [] })
  const [sellerId, setSellerId] = useState('')
  const [regId, setRegId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [metric, setMetric] = useState('Métrica F1')

  const [loadedGoal, setLoadedGoal] = useState<any>(null)
  const [perfId, setPerfId] = useState<string | null>(null)
  const [atual, setAtual] = useState('')
  const [cobAtual, setCobAtual] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      pb.collection('sellers').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
    ]).then(([s, r, a]) => setData({ sellers: s, regionals: r, areas: a }))
  }, [])

  const loadData = async () => {
    const seller = data.sellers.find((s: any) => s.id === sellerId)
    if (!seller?.user_id || !period || !metric) {
      setLoadedGoal(null)
      setPerfId(null)
      setAtual('')
      setCobAtual('')
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
      setAtual(maskMoney(p.actual_value * 100))
      setCobAtual(p.actual_coverage?.toString() || '')
    } catch {
      setPerfId(null)
      setAtual('')
      setCobAtual('')
    }

    try {
      const perfs = await pb
        .collection('actual_performance')
        .getFullList({
          filter: `seller_id="${seller.user_id}" && metric="${metric}"`,
          sort: '-period',
          limit: 3,
        })
      const goals = await pb
        .collection('goals')
        .getFullList({
          filter: `seller_id="${seller.user_id}" && metric="${metric}"`,
          sort: '-period',
          limit: 3,
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
    if (!seller?.user_id || !period || !metric || !atual || !regId || !areaId) {
      return toast({
        title: 'Atenção',
        description: 'Preencha todos os filtros e o valor atual.',
        variant: 'destructive',
      })
    }
    const val = unmaskMoney(atual)
    const cVal = Number(cobAtual) || 0
    if (val <= 0)
      return toast({
        title: 'Atenção',
        description: 'Meta Atual deve ser positivo.',
        variant: 'destructive',
      })
    if (loadedGoal && val > loadedGoal.target_ouro)
      toast({ title: 'Aviso', description: 'Meta Atual excede Meta Ouro.' })
    if (cVal < 0 || cVal > 100)
      return toast({
        title: 'Atenção',
        description: 'Cobertura Atual deve estar entre 0 e 100.',
        variant: 'destructive',
      })

    setIsSubmitting(true)
    try {
      const payload = {
        seller_id: seller.user_id,
        period,
        metric,
        actual_value: val,
        actual_coverage: cVal,
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

  const MetricCard = ({ title, act, tgt, isMoney = false }: any) => {
    const pct = tgt > 0 ? (act / tgt) * 100 : 0
    const color = pct >= 100 ? 'text-green-600' : pct >= 80 ? 'text-yellow-500' : 'text-red-500'
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className={cn('text-2xl font-bold', color)}>{pct.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            Meta: {isMoney ? maskMoney(tgt * 100) : `${tgt}%`}
          </div>
        </CardContent>
      </Card>
    )
  }

  const aVal = unmaskMoney(atual)
  const cVal = Number(cobAtual) || 0
  const metricsList = [
    'Faturamento Geral',
    ...Array.from({ length: 10 }, (_, i) => `Métrica F${i + 1}`),
  ]

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Select value={regId} onValueChange={setRegId}>
          <SelectTrigger>
            <SelectValue placeholder="Regional" />
          </SelectTrigger>
          <SelectContent>
            {data.regionals.map((r: any) => (
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
              .filter((a: any) => a.regional_id === regId)
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
              .filter((s: any) => s.area_id === areaId)
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
            <h3 className="text-lg font-semibold">Metas de Volume</h3>
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
                  <TableCell className="bg-muted/50">
                    {maskMoney(loadedGoal.target_base * 100)}
                  </TableCell>
                  <TableCell className="bg-muted/50">
                    {maskMoney(loadedGoal.target_bronze * 100)}
                  </TableCell>
                  <TableCell className="bg-muted/50">
                    {maskMoney(loadedGoal.target_prata * 100)}
                  </TableCell>
                  <TableCell className="bg-muted/50">
                    {maskMoney(loadedGoal.target_ouro * 100)}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={atual}
                      onChange={(e) => setAtual(maskMoney(e.target.value))}
                      placeholder="R$ 0,00"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Atingimento Base"
                act={aVal}
                tgt={loadedGoal.target_base}
                isMoney
              />
              <MetricCard
                title="Atingimento Bronze"
                act={aVal}
                tgt={loadedGoal.target_bronze}
                isMoney
              />
              <MetricCard
                title="Atingimento Prata"
                act={aVal}
                tgt={loadedGoal.target_prata}
                isMoney
              />
              <MetricCard
                title="Atingimento Ouro"
                act={aVal}
                tgt={loadedGoal.target_ouro}
                isMoney
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Metas de Cobertura</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Diária</TableHead>
                  <TableHead>Semanal</TableHead>
                  <TableHead>Mensal</TableHead>
                  <TableHead>Cobertura Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="bg-muted/50">
                    {loadedGoal.target_daily_coverage || 0}%
                  </TableCell>
                  <TableCell className="bg-muted/50">
                    {loadedGoal.target_weekly_coverage || 0}%
                  </TableCell>
                  <TableCell className="bg-muted/50">
                    {loadedGoal.target_monthly_coverage || 0}%
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={cobAtual}
                      onChange={(e) => setCobAtual(e.target.value)}
                      placeholder="%"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Cobertura Diária"
                act={cVal}
                tgt={loadedGoal.target_daily_coverage || 0}
              />
              <MetricCard
                title="Cobertura Semanal"
                act={cVal}
                tgt={loadedGoal.target_weekly_coverage || 0}
              />
              <MetricCard
                title="Cobertura Mensal"
                act={cVal}
                tgt={loadedGoal.target_monthly_coverage || 0}
              />
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
          <h3 className="text-lg font-semibold">Histórico Recente</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Realizado</TableHead>
                <TableHead>Atingimento (Base)</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell>{h.period}</TableCell>
                  <TableCell>{maskMoney(h.actual_value * 100)}</TableCell>
                  <TableCell>
                    {h.target > 0 ? ((h.actual_value / h.target) * 100).toFixed(1) : 0}%
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setPeriod(h.period)}>
                      Editar
                    </Button>
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
