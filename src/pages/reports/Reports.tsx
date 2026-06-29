import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { ReportsFilterHeader } from './ReportsFilterHeader'
import { ReportsSummaryCards } from './ReportsSummaryCards'
import { ReportsPerformanceTable } from './ReportsPerformanceTable'
import { ReportsCharts } from './ReportsCharts'
import { loadReportData, type DashboardData, type ReportFilters } from '@/services/reports'
import { exportReportExcel } from '@/lib/excel-export'

export default function Reports() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [period, setPeriod] = useState(currentMonth)
  const [regionalId, setRegionalId] = useState('all')
  const [areaId, setAreaId] = useState('all')
  const [sellerId, setSellerId] = useState('all')
  const [family, setFamily] = useState('all')
  const [metricType, setMetricType] = useState<'faturamento' | 'cobertura'>('faturamento')

  const [regionals, setRegionals] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('sellers').getFullList({ filter: 'is_active = true', sort: 'name' }),
    ]).then(([r, a, s]) => {
      setRegionals(r)
      setAreas(a)
      setSellers(s)
    })
  }, [])

  const filteredAreas = useMemo(
    () => areas.filter((a) => regionalId === 'all' || a.regional_id === regionalId),
    [areas, regionalId],
  )
  const filteredSellers = useMemo(
    () => sellers.filter((s) => areaId === 'all' || s.area_id === areaId),
    [sellers, areaId],
  )

  const sellerUserId = useMemo(() => {
    if (sellerId === 'all') return 'all'
    return sellers.find((s) => s.id === sellerId)?.user_id || 'all'
  }, [sellerId, sellers])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const filters: ReportFilters = {
        period,
        regionalId,
        areaId,
        sellerId: sellerUserId,
        family,
        metricType,
      }
      const result = await loadReportData(filters)
      setData(result)
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [period, regionalId, areaId, sellerUserId, family, metricType, toast])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('goals', () => loadData())
  useRealtime('actual_performance', () => loadData())

  const isCoverage = metricType === 'cobertura'

  const handleExport = () => {
    if (!data || data.tableRows.length === 0) {
      toast({
        title: 'Nenhum dado',
        description: 'Gere o relatório antes de exportar.',
        variant: 'destructive',
      })
      return
    }
    const filters: ReportFilters = {
      period,
      regionalId,
      areaId,
      sellerId: sellerUserId,
      family,
      metricType,
    }
    exportReportExcel(data.tableRows, data.summary, filters, isCoverage)
    toast({
      title: '✓ Relatório exportado com sucesso!',
      description: 'O download foi iniciado.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Relatórios</h1>
          <p className="text-muted-foreground">
            Dashboard executivo de metas e performance comercial.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExport}
          disabled={!data || data.tableRows.length === 0}
        >
          <FileDown className="w-4 h-4" /> Exportar Excel
        </Button>
      </div>

      <ReportsFilterHeader
        period={period}
        setPeriod={setPeriod}
        regionalId={regionalId}
        setRegionalId={setRegionalId}
        areaId={areaId}
        setAreaId={setAreaId}
        sellerId={sellerId}
        setSellerId={setSellerId}
        family={family}
        setFamily={setFamily}
        metricType={metricType}
        setMetricType={setMetricType}
        regionals={regionals}
        areas={filteredAreas}
        sellers={filteredSellers}
      />

      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {data && (
        <>
          {loading && (
            <div className="text-center text-sm text-muted-foreground animate-pulse">
              Atualizando dados...
            </div>
          )}
          <ReportsSummaryCards
            totalActual={data.summary.total_actual}
            totalTarget={data.summary.total_target}
            achievementPct={data.summary.achievement_pct}
            totalCommission={data.summary.total_commission}
            isCoverage={isCoverage}
          />
          <ReportsPerformanceTable rows={data.tableRows} isCoverage={isCoverage} />
          <ReportsCharts
            barData={data.charts.barData}
            donutData={data.charts.donutData}
            commissionDonutData={data.charts.commissionDonutData}
            lineData={data.charts.lineData}
            isCoverage={isCoverage}
          />
        </>
      )}
    </div>
  )
}
