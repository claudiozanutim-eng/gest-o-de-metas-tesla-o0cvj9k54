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
import { FileDown, FileText, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface Regional {
  id: string
  name: string
}
interface Area {
  id: string
  name: string
  regional_id: string
}
interface Seller {
  id: string
  name: string
  regional_id: string
  area_id: string
}

const METRICS = ['Coverage', 'Mix_F1', 'Mix_F2', 'Mix_F3', 'Mix_Outros', 'Faturamento (Geral)']

function normalizeMetric(m: string) {
  return m.split('(')[0].trim()
}

export default function Reports() {
  const [regionals, setRegionals] = useState<Regional[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])

  const [startPeriod, setStartPeriod] = useState('2026-01')
  const [endPeriod, setEndPeriod] = useState('2026-12')
  const [metric, setMetric] = useState('all')
  const [regionalId, setRegionalId] = useState('all')
  const [areaId, setAreaId] = useState('all')
  const [sellerId, setSellerId] = useState('all')
  const [isExporting, setIsExporting] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    async function loadFilters() {
      try {
        const [regs, ars, slls] = await Promise.all([
          pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
          pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
          pb.collection('users').getFullList({ filter: "role = 'Vendedor'", sort: 'name' }),
        ])
        setRegionals(regs.map((r) => ({ id: r.id, name: r.name })))
        setAreas(ars.map((a) => ({ id: a.id, name: a.name, regional_id: a.regional_id })))
        setSellers(
          slls.map((s) => ({
            id: s.id,
            name: s.name,
            regional_id: s.regional_id,
            area_id: s.area_id,
          })),
        )
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
    if (regionalId !== 'all' && s.regional_id !== regionalId) return false
    if (areaId !== 'all' && s.area_id !== areaId) return false
    return true
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const filters: string[] = []
      if (startPeriod) filters.push(`period >= '${startPeriod}'`)
      if (endPeriod) filters.push(`period <= '${endPeriod}'`)
      if (metric !== 'all') filters.push(`metric ~ '${metric}'`)
      if (regionalId !== 'all') filters.push(`seller_id.regional_id = '${regionalId}'`)
      if (areaId !== 'all') filters.push(`seller_id.area_id = '${areaId}'`)
      if (sellerId !== 'all') filters.push(`seller_id = '${sellerId}'`)

      const filterString = filters.join(' && ')

      const [goalsRes, performanceRes, sellersRes] = await Promise.all([
        pb.collection('goals').getFullList({
          filter: filterString,
          expand: 'seller_id,seller_id.regional_id,seller_id.area_id',
        }),
        pb.collection('actual_performance').getFullList({
          filter: filterString,
          expand: 'seller_id,seller_id.regional_id,seller_id.area_id',
        }),
        pb.collection('sellers').getFullList(),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, any>()
      const getKey = (sId: string, per: string, met: string, mix: string = '') =>
        `${sId}|${per}|${met}|${mix}`

      const sellerCodes = new Map<string, string>()
      const sellerCodesByName = new Map<string, string>()
      for (const s of sellersRes) {
        if (s.user_id) sellerCodes.set(s.user_id, s.code)
        if (s.name) sellerCodesByName.set(s.name, s.code)
      }

      goalsRes.forEach((g) => {
        const mix = g.mix_family || ''
        const key = getKey(g.seller_id, g.period, g.metric, mix)
        const user = g.expand?.seller_id
        const code =
          sellerCodes.get(g.seller_id) || (user ? sellerCodesByName.get(user.name) : '') || ''

        map.set(key, {
          period: g.period,
          metric: g.metric,
          seller_id: g.seller_id,
          seller_name: user?.name || 'Desconhecido',
          seller_code: code,
          regional_name: user?.expand?.regional_id?.name || '-',
          area_name: user?.expand?.area_id?.name || '-',
          target_bronze: g.target_bronze || 0,
          target_prata: g.target_prata || 0,
          target_ouro: g.target_ouro || 0,
          actual_value: 0,
          mix_family: mix,
        })
      })

      performanceRes.forEach((p) => {
        const mix = p.mix_family || ''
        const key = getKey(p.seller_id, p.period, p.metric, mix)
        const existing = map.get(key)
        if (existing) {
          existing.actual_value = p.actual_value || 0
        } else {
          const user = p.expand?.seller_id
          const code =
            sellerCodes.get(p.seller_id) || (user ? sellerCodesByName.get(user.name) : '') || ''
          map.set(key, {
            period: p.period,
            metric: p.metric,
            seller_id: p.seller_id,
            seller_name: user?.name || 'Desconhecido',
            seller_code: code,
            regional_name: user?.expand?.regional_id?.name || '-',
            area_name: user?.expand?.area_id?.name || '-',
            target_bronze: 0,
            target_prata: 0,
            target_ouro: 0,
            actual_value: p.actual_value || 0,
            mix_family: mix,
          })
        }
      })

      if (map.size === 0) {
        toast({
          title: 'Nenhum dado',
          description: 'Os filtros selecionados não retornaram dados para exportação.',
          variant: 'destructive',
        })
        setIsExporting(false)
        return
      }

      const csvRows = []
      csvRows.push([
        'Periodo',
        'Metrica',
        'Vendedor',
        'Codigo Vendedor',
        'Regional',
        'Area',
        'Mix / Familia',
        'Meta Bronze',
        'Meta Prata',
        'Meta Ouro',
        'Realizado',
      ])

      for (const row of Array.from(map.values())) {
        csvRows.push(
          [
            row.period,
            normalizeMetric(row.metric),
            row.seller_name,
            row.seller_code,
            row.regional_name,
            row.area_name,
            row.mix_family || '-',
            row.target_bronze.toString(),
            row.target_prata.toString(),
            row.target_ouro.toString(),
            row.actual_value.toString(),
          ]
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(','),
        )
      }

      const csvContent = csvRows.join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `relatorio_metas_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao gerar o relatório.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Relatórios</h1>
        <p className="text-muted-foreground">Gere extrações detalhadas para análise externa.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerador de Relatórios
          </CardTitle>
          <CardDescription>
            Configure os filtros para baixar os dados em formato de planilha (.csv).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
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
              <Select
                value={sellerId}
                onValueChange={setSellerId}
                disabled={filteredSellers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Vendedores</SelectItem>
                  {filteredSellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {isExporting ? 'Exportando...' : 'Exportar Dados'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
