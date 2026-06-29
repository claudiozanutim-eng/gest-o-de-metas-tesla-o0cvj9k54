import pb from '@/lib/pocketbase/client'

export interface ReportRow {
  seller_name: string
  seller_code: string
  regional_name: string
  area_name: string
  period_label: string
  metric: string
  target_base: number
  actual_value: number
  achievement_pct: number
  tier_name: string
  tier_color: string
  commission_pct: number
  commission_value: number
}

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

const METRICS = ['Coverage', 'Mix_F1', 'Mix_F2', 'Mix_F3', 'Mix_Outros', 'Faturamento (Geral)']

export function normalizeMetric(m: string): string {
  return m.split('(')[0].trim()
}

export async function loadCommissionTiers(): Promise<CommissionTier[]> {
  const res = await pb.collection('commission_tiers').getFullList({ sort: 'order' })
  return res as unknown as CommissionTier[]
}

export async function loadFinancialAdjustments(): Promise<FinancialAdjustments> {
  const res = await pb.collection('system_parameters').getFullList()
  const rec = res.find((r) => r.key === 'financial_adjustments')
  if (rec?.value) return rec.value as FinancialAdjustments
  return { rate: 0, tax: 32, retention: 0, discount: 0 }
}

export function findTier(achievementPct: number, tiers: CommissionTier[]): CommissionTier | null {
  const active = tiers.filter((t) => t.is_active).sort((a, b) => a.order - b.order)
  for (const t of active) {
    if (achievementPct >= t.min_pct && achievementPct <= t.max_pct) return t
  }
  if (active.length === 0) return null
  if (achievementPct < active[0].min_pct) return active[0]
  return active[active.length - 1]
}

export function calculateCommission(
  actualValue: number,
  tier: CommissionTier | null,
  adjustments: FinancialAdjustments,
): { commissionPct: number; commissionValue: number } {
  if (!tier) return { commissionPct: 0, commissionValue: 0 }
  const totalAdj = adjustments.rate + adjustments.tax + adjustments.retention + adjustments.discount
  const liquidRevenue = actualValue * (1 - totalAdj / 100)
  return { commissionPct: tier.commission_pct, commissionValue: liquidRevenue * tier.multiplier }
}

interface GenerateParams {
  startPeriod: string
  endPeriod: string
  metric: string
  regionalId: string
  areaId: string
  sellerUserId: string
  tiers: CommissionTier[]
  adjustments: FinancialAdjustments
}

export async function generateReport(params: GenerateParams): Promise<ReportRow[]> {
  const { startPeriod, endPeriod, metric, regionalId, areaId, sellerUserId, tiers, adjustments } =
    params

  const filters: string[] = []
  if (startPeriod) filters.push(`period >= '${startPeriod}'`)
  if (endPeriod) filters.push(`period <= '${endPeriod}'`)
  if (metric !== 'all') filters.push(`metric ~ '${metric}'`)
  if (regionalId !== 'all') filters.push(`seller_id.regional_id = '${regionalId}'`)
  if (areaId !== 'all') filters.push(`seller_id.area_id = '${areaId}'`)
  if (sellerUserId !== 'all') filters.push(`seller_id = '${sellerUserId}'`)
  const filterString = filters.join(' && ')

  const [goalsRes, perfRes, sellersRes, areasRes, regionalsRes] = await Promise.all([
    pb.collection('goals').getFullList({ filter: filterString, expand: 'seller_id' }),
    pb.collection('actual_performance').getFullList({ filter: filterString, expand: 'seller_id' }),
    pb.collection('sellers').getFullList(),
    pb.collection('areas').getFullList(),
    pb.collection('regionals').getFullList(),
  ])

  const areaMap = new Map(areasRes.map((a) => [a.id, a]))
  const regionalMap = new Map(regionalsRes.map((r) => [r.id, r]))

  const sellerInfo = new Map<
    string,
    { name: string; code: string; area_name: string; regional_name: string }
  >()
  for (const s of sellersRes) {
    if (!s.user_id) continue
    const area = areaMap.get(s.area_id)
    const regional = area ? regionalMap.get(area.regional_id) : undefined
    sellerInfo.set(s.user_id, {
      name: s.name,
      code: s.code || '-',
      area_name: area?.name || '-',
      regional_name: regional?.name || '-',
    })
  }

  for (const g of goalsRes) {
    if (!sellerInfo.has(g.seller_id)) {
      const user = g.expand?.seller_id
      sellerInfo.set(g.seller_id, {
        name: user?.name || 'Desconhecido',
        code: '-',
        area_name: '-',
        regional_name: '-',
      })
    }
  }

  const agg = new Map<
    string,
    { seller_id: string; metric: string; target_base: number; actual_value: number }
  >()

  for (const g of goalsRes) {
    const key = `${g.seller_id}|${g.metric}`
    const entry = agg.get(key) || {
      seller_id: g.seller_id,
      metric: g.metric,
      target_base: 0,
      actual_value: 0,
    }
    entry.target_base += g.target_base || 0
    agg.set(key, entry)
  }

  for (const p of perfRes) {
    const key = `${p.seller_id}|${p.metric}`
    const entry = agg.get(key) || {
      seller_id: p.seller_id,
      metric: p.metric,
      target_base: 0,
      actual_value: 0,
    }
    entry.actual_value += p.actual_value || 0
    agg.set(key, entry)
  }

  const rows: ReportRow[] = []
  for (const [, data] of agg) {
    const info = sellerInfo.get(data.seller_id) || {
      name: 'Desconhecido',
      code: '-',
      area_name: '-',
      regional_name: '-',
    }
    const achievementPct = data.target_base > 0 ? (data.actual_value / data.target_base) * 100 : 0
    const tier = findTier(achievementPct, tiers)
    const { commissionPct, commissionValue } = calculateCommission(
      data.actual_value,
      tier,
      adjustments,
    )

    rows.push({
      seller_name: info.name,
      seller_code: info.code,
      regional_name: info.regional_name,
      area_name: info.area_name,
      period_label: `${startPeriod} a ${endPeriod}`,
      metric: normalizeMetric(data.metric),
      target_base: data.target_base,
      actual_value: data.actual_value,
      achievement_pct: achievementPct,
      tier_name: tier?.name || 'Sem Faixa',
      tier_color: tier?.color || '#9ca3af',
      commission_pct: commissionPct,
      commission_value: commissionValue,
    })
  }

  rows.sort(
    (a, b) => a.seller_name.localeCompare(b.seller_name) || a.metric.localeCompare(b.metric),
  )
  return rows
}

export function exportReportCSV(rows: ReportRow[]): void {
  const csvRows: string[][] = []
  csvRows.push([
    'Periodo',
    'Metrica',
    'Vendedor',
    'Codigo Vendedor',
    'Regional',
    'Area',
    'Meta Base',
    'Realizado',
    '% Atingimento da Meta',
    'Faixa Atingida',
    '% de Comissao Aplicada',
    'Comissao a Pagar (R$)',
  ])

  for (const r of rows) {
    csvRows.push([
      r.period_label,
      r.metric,
      r.seller_name,
      r.seller_code,
      r.regional_name,
      r.area_name,
      r.target_base.toFixed(2),
      r.actual_value.toFixed(2),
      r.achievement_pct.toFixed(2) + '%',
      r.tier_name,
      r.commission_pct.toFixed(2) + '%',
      r.commission_value.toFixed(2),
    ])
  }

  const csv = csvRows
    .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `relatorio_metas_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export { METRICS }
