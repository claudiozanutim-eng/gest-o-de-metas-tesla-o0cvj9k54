import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileDown, FileText, Loader2, BarChart3 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/mock-data'
import {
  METRICS,
  loadCommissionTiers,
  loadFinancialAdjustments,
  generateReport,
  exportReportCSV,
  type ReportRow,
  type CommissionTier,
  type FinancialAdjustments,
} from '@/services/reports'

interface Regional {
  id: string
  name: string
}
interface Area {
  id: string
  name: string
  regional_id: string
}
interface SellerEntry {
  user_id: string
  name: string
  code: string
  area_id: string
}

export default function Reports() {
  const [regionals, setRegionals] = useState<Regional[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [sellers, setSellers] = useState<SellerEntry[]>([])

  const [startPeriod, setStartPeriod] = useState('2026-01')
  const [endPeriod, setEndPeriod] = useState('2026-12')
  const [metric, setMetric] = useState('all')
  const [regionalId, setRegionalId] = useState('all')
  const [areaId, setAreaId] = useState('all')
  const [sellerId, setSellerId] = useState('all')

  const [tiers, setTiers] = useState<CommissionTier[]>([])
  const [adjustments, setAdjustments] = useState<FinancialAdjustments>({
    rate: 0,
    tax: 32,
    retention: 0,
    discount: 0,
  })
  const [reportData, setReportData] = useState<ReportRow[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    async function loadFilters() {
      try {
        const [regs, ars, slls, t, adj] = await Promise.all([
          pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
          pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
          pb.collection('sellers').getFullList({ filter: 'is_active = true', sort: 'name' }),
          loadCommissionTiers(),
          loadFinancialAdjustments(),
        ])
        setRegionals(regs.map((r) => ({ id: r.id, name: r.name })))
        setAreas(ars.map((a) => ({ id: a.id, name: a.name, regional_id: a.regional_id })))
        setSellers(
          slls
            .filter((s) => s.user_id)
            .map((s) => ({
              user_id: s.user_id,
              name: s.name,
              code: s.code,
              area_id: s.area_id,
            })),
        )
        setTiers(t)
        setAdjustments(adj)
      } catch (error) {
        console.error('Failed to load filters:', error)
        toast({
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar os filtros.',
          variant: 'destructive',
        })
      }
    }
    loadFilters()
  }, [toast])

  const filteredAreas =
    regionalId === 'all' ? areas : areas.filter((a) => a.regional_id === regionalId)
  const filteredSellers = sellers.filter((s) => {
    if (regionalId !== 'all') {
      const area = areas.find((a) => a.id === s.area_id)
      if (!area || area.regional_id !== regionalId) return false
    }
    if (areaId !== 'all' && s.area_id !== areaId) return false
    return true
  })

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const rows = await generateReport({
        startPeriod,
        endPeriod,
        metric,
        regionalId,
        areaId,
        sellerId,
        tiers,
        adjustments,
      })
      if (rows.length === 0) {
        toast({
          title: 'Nenhum dado',
          description: 'Os filtros selecionados não retornaram dados para o relatório.',
          variant: 'destructive',
        })
      }
      setReportData(rows)
    } catch (error) {
      console.error('Report error:', error)
      toast({
        title: 'Erro na geração',
        description: 'Ocorreu um erro ao gerar o relatório.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = () => {
    if (reportData.length === 0) {
      toast({
        title: 'Nenhum dado',
        description: 'Gere o relatório antes de exportar.',
        variant: 'destructive',
      })
      return
    }
    exportReportCSV(reportData)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Relatórios</h1>
        <p className="text-muted-foreground">
          Gere extrações detalhadas com cálculo automático de comissões.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerador de Relatórios
          </CardTitle>
          <CardDescription>
            Configure os filtros para gerar o relatório de performance com comissionamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período Inicial</Label>
              <Input
                type="month"
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Período Final</Label>
              <Input
                type="month"
                value={endPeriod}
                onChange={(e) => setEndPeriod(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Métrica</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a métrica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Métricas</SelectItem>
                {METRICS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Regional</Label>
            <Select
              value={regionalId}
              onValueChange={(val) => {
                setRegionalId(val)
                setAreaId('all')
                setSellerId('all')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a regional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Regionais</SelectItem>
                {regionals.map((regional) => (
                  <SelectItem key={regional.id} value={regional.id}>
                    {regional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Área</Label>
            <Select
              value={areaId}
              onValueChange={(val) => {
                setAreaId(val)
                setSellerId('all')
              }}
              disabled={filteredAreas.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                {filteredAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vendedor</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vendedores</SelectItem>
                {filteredSellers.map((seller) => (
                  <SelectItem key={seller.user_id} value={seller.user_id}>
                    {seller.name} ({seller.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
              {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={reportData.length === 0}
            >
              <FileDown className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados do Relatório</CardTitle>
            <CardDescription>
              {reportData.length} registro(s) encontrado(s) com cálculo de comissionamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Regional</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Métrica</TableHead>
                    <TableHead className="text-right">Meta Base</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="text-right">% Ating.</TableHead>
                    <TableHead>Faixa</TableHead>
                    <TableHead className="text-right">% Comiss.</TableHead>
                    <TableHead className="text-right">Comissão (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.seller_name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.seller_code}</TableCell>
                      <TableCell className="text-sm">{row.regional_name}</TableCell>
                      <TableCell className="text-sm">{row.area_name}</TableCell>
                      <TableCell className="text-sm">{row.metric}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.target_base)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.actual_value)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {row.achievement_pct.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm" style={{ color: row.tier_color }}>
                          {row.tier_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.commission_pct.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">
                        {formatCurrency(row.commission_value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
