import pb from '@/lib/pocketbase/client'

export interface TrackingFilters {
  period: string
  regionalId: string
  areaId: string
  sellerUserId: string
  metricType: 'faturamento' | 'cobertura'
  family: string
}

const REVENUE_METRICS = ['Faturamento', 'Revenue', 'Faturamento (Geral)']
const COVERAGE_METRICS = ['Coverage', 'Cobertura']
const MONTH_LABELS = [
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

export function getMetricFilter(metricType: 'faturamento' | 'cobertura'): string {
  const metrics = metricType === 'faturamento' ? REVENUE_METRICS : COVERAGE_METRICS
  return `(${metrics.map((m) => `metric="${m}"`).join(' || ')})`
}

export function isQuarterlyPeriod(period: string): boolean {
  return /^\d{4}-Q[1-4]$/.test(period)
}

export function expandPeriodToMonths(period: string): string[] {
  if (!isQuarterlyPeriod(period)) return [period]
  const [year, q] = period.split('-')
  const quarterNum = parseInt(q[1])
  const startMonth = (quarterNum - 1) * 3 + 1
  return [startMonth, startMonth + 1, startMonth + 2].map(
    (m) => `${year}-${String(m).padStart(2, '0')}`,
  )
}

export function buildPeriodFilter(period: string): string {
  const months = expandPeriodToMonths(period)
  if (months.length === 1) return `period="${months[0]}"`
  return `(${months.map((m) => `period="${m}"`).join(' || ')})`
}

export function formatPeriodLabel(period: string): string {
  if (isQuarterlyPeriod(period)) {
    const [year, q] = period.split('-')
    return `${q} ${year}`
  }
  const [year, month] = period.split('-')
  const idx = parseInt(month) - 1
  return `${MONTH_LABELS[idx]}/${year}`
}

function buildGoalFilter(filters: TrackingFilters): string {
  const parts: string[] = [buildPeriodFilter(filters.period), getMetricFilter(filters.metricType)]
  if (filters.regionalId && filters.regionalId !== 'all') {
    parts.push(`regional_id="${filters.regionalId}"`)
  }
  if (filters.areaId && filters.areaId !== 'all') {
    parts.push(`area_id="${filters.areaId}"`)
  }
  if (filters.sellerUserId && filters.sellerUserId !== 'all') {
    parts.push(`seller_id="${filters.sellerUserId}"`)
  }
  if (filters.family && filters.family !== 'Todos') {
    parts.push(`mix_family="${filters.family}"`)
  }
  return parts.join(' && ')
}

export async function fetchGoals(filters: TrackingFilters) {
  return pb.collection('goals').getFullList({
    filter: buildGoalFilter(filters),
    expand: 'seller_id',
  })
}

export async function fetchActuals(filters: TrackingFilters) {
  const parts: string[] = [buildPeriodFilter(filters.period), getMetricFilter(filters.metricType)]
  if (filters.sellerUserId && filters.sellerUserId !== 'all') {
    parts.push(`seller_id="${filters.sellerUserId}"`)
  }
  return pb.collection('actual_performance').getFullList({
    filter: parts.join(' && '),
    expand: 'seller_id',
  })
}

export async function fetchAllGoalsForMetric(metricType: 'faturamento' | 'cobertura') {
  return pb.collection('goals').getFullList({
    filter: getMetricFilter(metricType),
    sort: 'period',
  })
}

export async function fetchAllActualsForMetric(metricType: 'faturamento' | 'cobertura') {
  return pb.collection('actual_performance').getFullList({
    filter: getMetricFilter(metricType),
  })
}

export async function upsertActualPerformance(
  sellerId: string,
  period: string,
  metric: string,
  value: number,
  mixFamily?: string,
) {
  const months = expandPeriodToMonths(period)
  if (months.length > 1) {
    const perMonth = value / months.length
    let oldTotal = 0
    for (const p of months) {
      try {
        const existing = await pb
          .collection('actual_performance')
          .getFirstListItem(`seller_id="${sellerId}" && period="${p}" && metric="${metric}"`)
        oldTotal += existing.actual_value || 0
        await pb.collection('actual_performance').update(existing.id, { actual_value: perMonth })
      } catch {
        await pb.collection('actual_performance').create({
          seller_id: sellerId,
          period: p,
          metric,
          actual_value: perMonth,
          mix_family: mixFamily || '',
        })
      }
    }
    return { record: null, oldValue: oldTotal }
  }
  try {
    const existing = await pb
      .collection('actual_performance')
      .getFirstListItem(`seller_id="${sellerId}" && period="${period}" && metric="${metric}"`)
    const oldValue = existing.actual_value || 0
    const updated = await pb.collection('actual_performance').update(existing.id, {
      actual_value: value,
    })
    return { record: updated, oldValue }
  } catch {
    const created = await pb.collection('actual_performance').create({
      seller_id: sellerId,
      period,
      metric,
      actual_value: value,
      mix_family: mixFamily || '',
    })
    return { record: created, oldValue: 0 }
  }
}

export interface FamilyEntry {
  family: string
  value: number
}

export interface FamilyPerformanceResult {
  family: string
  oldValue: number
  newValue: number
}

export async function fetchFamilyActuals(sellerId: string, period: string, metric: string) {
  return pb.collection('actual_performance').getFullList({
    filter: `seller_id="${sellerId}" && ${buildPeriodFilter(period)} && metric="${metric}"`,
  })
}

export async function upsertFamilyPerformance(
  sellerId: string,
  period: string,
  metric: string,
  familyEntries: FamilyEntry[],
): Promise<FamilyPerformanceResult[]> {
  const months = expandPeriodToMonths(period)
  const results: FamilyPerformanceResult[] = []

  for (const p of months) {
    try {
      const legacy = await pb
        .collection('actual_performance')
        .getFirstListItem(
          `seller_id="${sellerId}" && period="${p}" && metric="${metric}" && mix_family=""`,
        )
      if ((legacy.actual_value || 0) !== 0) {
        await pb.collection('actual_performance').update(legacy.id, { actual_value: 0 })
      }
    } catch {
      // No legacy record — skip
    }
  }

  for (const entry of familyEntries) {
    const mixFamily = entry.family || ''
    if (months.length > 1) {
      const perMonth = entry.value / months.length
      let oldTotal = 0
      for (const p of months) {
        try {
          const existing = await pb
            .collection('actual_performance')
            .getFirstListItem(
              `seller_id="${sellerId}" && period="${p}" && metric="${metric}" && mix_family="${mixFamily}"`,
            )
          oldTotal += existing.actual_value || 0
          await pb.collection('actual_performance').update(existing.id, { actual_value: perMonth })
        } catch {
          await pb.collection('actual_performance').create({
            seller_id: sellerId,
            period: p,
            metric,
            actual_value: perMonth,
            mix_family: mixFamily,
          })
        }
      }
      results.push({ family: mixFamily, oldValue: oldTotal, newValue: entry.value })
    } else {
      try {
        const existing = await pb
          .collection('actual_performance')
          .getFirstListItem(
            `seller_id="${sellerId}" && period="${months[0]}" && metric="${metric}" && mix_family="${mixFamily}"`,
          )
        const oldValue = existing.actual_value || 0
        await pb.collection('actual_performance').update(existing.id, { actual_value: entry.value })
        results.push({ family: mixFamily, oldValue, newValue: entry.value })
      } catch {
        await pb.collection('actual_performance').create({
          seller_id: sellerId,
          period: months[0],
          metric,
          actual_value: entry.value,
          mix_family: mixFamily,
        })
        results.push({ family: mixFamily, oldValue: 0, newValue: entry.value })
      }
    }
  }

  return results
}

export async function createAuditLog(
  goalId: string,
  userId: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
) {
  return pb.collection('goal_audit_logs').create({
    goal_id: goalId,
    user_id: userId,
    old_values: oldValues,
    new_values: newValues,
  })
}

export async function fetchAuditLogs(goalIds: string | string[]) {
  const ids = Array.isArray(goalIds) ? goalIds : [goalIds]
  const filter =
    ids.length === 1
      ? `goal_id="${ids[0]}"`
      : `(${ids.map((id) => `goal_id="${id}"`).join(' || ')})`
  return pb.collection('goal_audit_logs').getFullList({
    filter,
    sort: '-created',
    expand: 'user_id',
  })
}
