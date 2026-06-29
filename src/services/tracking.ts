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

export function getMetricFilter(metricType: 'faturamento' | 'cobertura'): string {
  const metrics = metricType === 'faturamento' ? REVENUE_METRICS : COVERAGE_METRICS
  return `(${metrics.map((m) => `metric="${m}"`).join(' || ')})`
}

function buildGoalFilter(filters: TrackingFilters): string {
  const parts: string[] = [`period="${filters.period}"`, getMetricFilter(filters.metricType)]
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
  const parts: string[] = [`period="${filters.period}"`, getMetricFilter(filters.metricType)]
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

export async function fetchAuditLogs(goalId: string) {
  return pb.collection('goal_audit_logs').getFullList({
    filter: `goal_id="${goalId}"`,
    sort: '-created',
    expand: 'user_id',
  })
}
