import pb from '@/lib/pocketbase/client'

export interface CommissionTier {
  id: string
  name: string
  min_pct: number
  max_pct: number
  commission_pct: number
  multiplier: number
  color: string
  is_active: boolean
  order: number
}
export interface FinancialAdjustments {
  rate: number
  tax: number
  retention: number
  discount: number
}
export interface ReportFilters {
  period: string
  regionalId: string
  areaId: string
  sellerId: string
  family: string
  metricType: 'faturamento' | 'cobertura'
}
export interface DashboardTableRow {
  seller_name: string
  seller_code: string
  regional_name: string
  area_name: string
  family: string
  target_base: number
  actual_value: number
  difference: number
  achievement_pct: number
}
export interface DashboardSummary {
  total_actual: number
  total_target: number
  achievement_pct: number
}
export interface DashboardChartData {
  barData: { name: string; target: number; actual: number }[]
  donutData: { name: string; value: number }[]
  lineData: { period: string; target: number; actual: number }[]
}
export interface DashboardData {
  tableRows: DashboardTableRow[]
  summary: DashboardSummary
  charts: DashboardChartData
}

const REVENUE_METRICS = ['Faturamento', 'Revenue', 'Faturamento (Geral)']
const COVERAGE_METRICS = ['Coverage', 'Cobertura']

export function getMetricFilter(metricType: 'faturamento' | 'cobertura'): string {
  const m = metricType === 'faturamento' ? REVENUE_METRICS : COVERAGE_METRICS
  return `(${m.map((x) => `metric="${x}"`).join(' || ')})`
}

export async function loadCommissionTiers(): Promise<CommissionTier[]> {
  return (await pb
    .collection('commission_tiers')
    .getFullList({ sort: 'order' })) as unknown as CommissionTier[]
}

export async function loadFinancialAdjustments(): Promise<FinancialAdjustments> {
  const res = await pb.collection('system_parameters').getFullList()
  const rec = res.find((r) => r.key === 'financial_adjustments')
  return rec?.value
    ? (rec.value as FinancialAdjustments)
    : { rate: 0, tax: 32, retention: 0, discount: 0 }
}

export function findTier(achievementPct: number, tiers: CommissionTier[]): CommissionTier | null {
  const active = tiers.filter((t) => t.is_active).sort((a, b) => a.order - b.order)
  for (const t of active) {
    if (achievementPct >= t.min_pct && achievementPct <= t.max_pct) return t
  }
  if (active.length === 0) return null
  return achievementPct < active[0].min_pct ? active[0] : active[active.length - 1]
}

export function calculateCommission(
  actualValue: number,
  tier: CommissionTier | null,
  adj: FinancialAdjustments,
) {
  if (!tier) return { commissionPct: 0, commissionValue: 0 }
  const totalAdj = adj.rate + adj.tax + adj.retention + adj.discount
  return {
    commissionPct: tier.commission_pct,
    commissionValue: actualValue * (1 - totalAdj / 100) * tier.multiplier,
  }
}

function buildGoalFilter(f: ReportFilters): string {
  const p: string[] = [`period="${f.period}"`, getMetricFilter(f.metricType)]
  if (f.regionalId !== 'all') p.push(`regional_id="${f.regionalId}"`)
  if (f.areaId !== 'all') p.push(`area_id="${f.areaId}"`)
  if (f.sellerId !== 'all') p.push(`seller_id="${f.sellerId}"`)
  if (f.family !== 'all') p.push(`mix_family="${f.family}"`)
  return p.join(' && ')
}

function buildActualFilter(f: ReportFilters): string {
  const p: string[] = [`period="${f.period}"`, getMetricFilter(f.metricType)]
  if (f.sellerId !== 'all') p.push(`seller_id="${f.sellerId}"`)
  if (f.family !== 'all') p.push(`mix_family="${f.family}"`)
  return p.join(' && ')
}

const getTarget = (g: any, mt: string) =>
  mt === 'cobertura' ? g.target_monthly_coverage || g.target_base || 0 : g.target_base || 0
const getActual = (a: any, mt: string) =>
  mt === 'cobertura' ? a.actual_coverage || a.actual_value || 0 : a.actual_value || 0

export async function loadReportData(f: ReportFilters): Promise<DashboardData> {
  const [goals, actuals, sellers, areas, regionals] = await Promise.all([
    pb.collection('goals').getFullList({ filter: buildGoalFilter(f), expand: 'seller_id' }),
    pb
      .collection('actual_performance')
      .getFullList({ filter: buildActualFilter(f), expand: 'seller_id' }),
    pb.collection('sellers').getFullList(),
    pb.collection('areas').getFullList(),
    pb.collection('regionals').getFullList(),
  ])

  const aMap = new Map(areas.map((a) => [a.id, a]))
  const rMap = new Map(regionals.map((r) => [r.id, r]))
  const sInfo = new Map<
    string,
    { name: string; code: string; area_name: string; regional_name: string }
  >()
  for (const s of sellers) {
    if (!s.user_id) continue
    const a = aMap.get(s.area_id)
    const r = a ? rMap.get(a.regional_id) : undefined
    sInfo.set(s.user_id, {
      name: s.name,
      code: s.code || '-',
      area_name: a?.name || '-',
      regional_name: r?.name || '-',
    })
  }
  for (const g of goals) {
    if (!sInfo.has(g.seller_id) && g.expand?.seller_id) {
      sInfo.set(g.seller_id, {
        name: g.expand.seller_id.name || 'Desconhecido',
        code: '-',
        area_name: '-',
        regional_name: '-',
      })
    }
  }

  const grouped = new Map<
    string,
    { seller_id: string; family: string; target_base: number; actual_value: number }
  >()
  for (const g of goals) {
    const fam = g.mix_family || 'Outros'
    const k = `${g.seller_id}|${fam}`
    const e = grouped.get(k) || {
      seller_id: g.seller_id,
      family: fam,
      target_base: 0,
      actual_value: 0,
    }
    e.target_base += getTarget(g, f.metricType)
    grouped.set(k, e)
  }
  for (const a of actuals) {
    const fam = a.mix_family || 'Outros'
    const k = `${a.seller_id}|${fam}`
    const e = grouped.get(k) || {
      seller_id: a.seller_id,
      family: fam,
      target_base: 0,
      actual_value: 0,
    }
    e.actual_value += getActual(a, f.metricType)
    grouped.set(k, e)
  }

  const tableRows: DashboardTableRow[] = []
  for (const [, d] of grouped) {
    const i = sInfo.get(d.seller_id) || {
      name: 'Desconhecido',
      code: '-',
      area_name: '-',
      regional_name: '-',
    }
    tableRows.push({
      seller_name: i.name,
      seller_code: i.code,
      regional_name: i.regional_name,
      area_name: i.area_name,
      family: d.family,
      target_base: d.target_base,
      actual_value: d.actual_value,
      difference: d.target_base - d.actual_value,
      achievement_pct: d.target_base > 0 ? (d.actual_value / d.target_base) * 100 : 0,
    })
  }
  tableRows.sort(
    (a, b) => a.seller_name.localeCompare(b.seller_name) || a.family.localeCompare(b.family),
  )

  const total_actual = tableRows.reduce((s, r) => s + r.actual_value, 0)
  const total_target = tableRows.reduce((s, r) => s + r.target_base, 0)
  const achievement_pct = total_target > 0 ? (total_actual / total_target) * 100 : 0

  const sMap = new Map<string, { target: number; actual: number }>()
  for (const r of tableRows) {
    const e = sMap.get(r.seller_name) || { target: 0, actual: 0 }
    e.target += r.target_base
    e.actual += r.actual_value
    sMap.set(r.seller_name, e)
  }
  const barData = Array.from(sMap.entries()).map(([name, v]) => ({
    name: name.split(' ')[0],
    target: v.target,
    actual: v.actual,
  }))

  const fMap = new Map<string, number>()
  for (const r of tableRows) fMap.set(r.family, (fMap.get(r.family) || 0) + r.actual_value)
  const donutData = Array.from(fMap.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  const year = f.period.split('-')[0]
  const hp: string[] = [`period ~ "${year}"`, getMetricFilter(f.metricType)]
  if (f.regionalId !== 'all') hp.push(`regional_id="${f.regionalId}"`)
  if (f.areaId !== 'all') hp.push(`area_id="${f.areaId}"`)
  if (f.sellerId !== 'all') hp.push(`seller_id="${f.sellerId}"`)
  if (f.family !== 'all') hp.push(`mix_family="${f.family}"`)
  const [ag, aa] = await Promise.all([
    pb.collection('goals').getFullList({ filter: hp.join(' && ') }),
    pb.collection('actual_performance').getFullList({ filter: hp.join(' && ') }),
  ])
  const pMap = new Map<string, { target: number; actual: number }>()
  for (const g of ag) {
    if (!pMap.has(g.period)) pMap.set(g.period, { target: 0, actual: 0 })
    pMap.get(g.period)!.target += getTarget(g, f.metricType)
  }
  for (const a of aa) {
    if (!pMap.has(a.period)) pMap.set(a.period, { target: 0, actual: 0 })
    pMap.get(a.period)!.actual += getActual(a, f.metricType)
  }
  let cT = 0,
    cA = 0
  const lineData = Array.from(pMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, v]) => {
      cT += v.target
      cA += v.actual
      return { period, target: cT, actual: cA }
    })

  return {
    tableRows,
    summary: { total_actual, total_target, achievement_pct },
    charts: { barData, donutData, lineData },
  }
}
