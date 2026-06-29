export interface CommissionTier {
  id: string
  name: string
  order: number
  is_active: boolean
  color: string
  min_pct: number
  max_pct: number
  commission_pct: number
  multiplier: number
}

export function findTierForPct(tiers: CommissionTier[], pct: number): CommissionTier | null {
  if (!tiers || tiers.length === 0) return null
  const sorted = [...tiers].filter((t) => t.is_active).sort((a, b) => a.order - b.order)
  return (
    sorted.find((t) => pct >= t.min_pct && pct <= t.max_pct) || sorted[sorted.length - 1] || null
  )
}

export function getTierColor(tiers: CommissionTier[], pct: number): string {
  const tier = findTierForPct(tiers, pct)
  return tier?.color || '#003DA5'
}

export function getTierName(tiers: CommissionTier[], pct: number): string {
  const tier = findTierForPct(tiers, pct)
  return tier?.name || ''
}
