import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { ExecutiveFilterHeader } from './ExecutiveFilterHeader'
import { ConsolidatedCard } from './ConsolidatedCard'
import { MultiTierTable, type TierRow } from './MultiTierTable'
import { EditRealizedModal } from './EditRealizedModal'
import { AuditHistoryModal } from './AuditHistoryModal'
import { ComparativeCharts } from './ComparativeCharts'
import {
  fetchGoals,
  fetchActuals,
  fetchAllGoalsForMetric,
  fetchAllActualsForMetric,
  type TrackingFilters,
} from '@/services/tracking'

export default function Tracking() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [regionalId, setRegionalId] = useState('all')
  const [areaId, setAreaId] = useState('all')
  const [sellerId, setSellerId] = useState('all')
  const [metricType, setMetricType] = useState<'faturamento' | 'cobertura'>('faturamento')
  const [family, setFamily] = useState('Todos')

  const [regionals, setRegionals] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [actuals, setActuals] = useState<any[]>([])
  const [allGoals, setAllGoals] = useState<any[]>([])
  const [allActuals, setAllActuals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<TierRow | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyRow, setHistoryRow] = useState<TierRow | null>(null)

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

  const isCoverage = metricType === 'cobertura'

  const loadData = async () => {
    setLoading(true)
    try {
      const filters: TrackingFilters = {
        period,
        regionalId,
        areaId,
        sellerUserId,
        metricType,
        family,
      }
      const [g, a, ag, aa] = await Promise.all([
        fetchGoals(filters),
        fetchActuals(filters),
        fetchAllGoalsForMetric(metricType),
        fetchAllActualsForMetric(metricType),
      ])
      setGoals(g)
      setActuals(a)
      setAllGoals(ag)
      setAllActuals(aa)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period, regionalId, areaId, sellerUserId, metricType, family])
  useRealtime('goals', () => loadData())
  useRealtime('actual_performance', () => loadData())

  const rows: TierRow[] = useMemo(() => {
    return goals.map((g) => {
      const actualRec = actuals.find(
        (a) => a.seller_id === g.seller_id && a.period === g.period && a.metric === g.metric,
      )
      const baseTarget = isCoverage
        ? g.target_monthly_coverage || g.target_base || 0
        : g.target_base || 0
      const actualValue = isCoverage
        ? actualRec?.actual_coverage || actualRec?.actual_value || 0
        : actualRec?.actual_value || 0
      return {
        goalId: g.id,
        sellerName: g.expand?.seller_id?.name || 'Vendedor',
        sellerId: g.seller_id,
        period: g.period,
        metric: g.metric,
        mixFamily: g.mix_family || '',
        targetBase: baseTarget,
        targetBronze: g.target_bronze || 0,
        targetPrata: g.target_prata || 0,
        targetOuro: g.target_ouro || 0,
        actual: actualValue,
      }
    })
  }, [goals, actuals, isCoverage])

  const totalActual = rows.reduce((s, r) => s + r.actual, 0)
  const totalTarget = rows.reduce((s, r) => s + r.targetBase, 0)

  const barData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.sellerName.split(' ')[0],
        target: r.targetBase,
        actual: r.actual,
      })),
    [rows],
  )

  const lineData = useMemo(() => {
    const map = new Map<string, { period: string; target: number; actual: number }>()
    allGoals.forEach((g) => {
      if (!map.has(g.period)) map.set(g.period, { period: g.period, target: 0, actual: 0 })
      map.get(g.period)!.target += g.target_base || 0
    })
    allActuals.forEach((a) => {
      if (map.has(a.period)) map.get(a.period)!.actual += a.actual_value || 0
    })
    let cumT = 0,
      cumA = 0
    return Array.from(map.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((d) => {
        cumT += d.target
        cumA += d.actual
        return { period: d.period, target: cumT, actual: cumA }
      })
  }, [allGoals, allActuals])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Gestão de Metas</h1>
        <p className="text-muted-foreground">
          Monitoramento executivo de metas e resultados em tempo real.
        </p>
      </div>
      <ExecutiveFilterHeader
        period={period}
        setPeriod={setPeriod}
        regionalId={regionalId}
        setRegionalId={setRegionalId}
        areaId={areaId}
        setAreaId={setAreaId}
        sellerId={sellerId}
        setSellerId={setSellerId}
        metricType={metricType}
        setMetricType={setMetricType}
        family={family}
        setFamily={setFamily}
        regionals={regionals}
        areas={filteredAreas}
        sellers={filteredSellers}
      />
      {loading && (
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          Atualizando dados...
        </div>
      )}
      <ConsolidatedCard
        totalActual={totalActual}
        totalTarget={totalTarget}
        metricType={metricType}
      />
      <MultiTierTable
        rows={rows}
        isCoverage={isCoverage}
        onEdit={(row) => {
          setEditRow(row)
          setEditOpen(true)
        }}
        onHistory={(row) => {
          setHistoryRow(row)
          setHistoryOpen(true)
        }}
      />
      <ComparativeCharts barData={barData} lineData={lineData} isCoverage={isCoverage} />
      <EditRealizedModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        row={editRow}
        isCoverage={isCoverage}
        onSaved={loadData}
      />
      <AuditHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        row={historyRow}
      />
    </div>
  )
}
