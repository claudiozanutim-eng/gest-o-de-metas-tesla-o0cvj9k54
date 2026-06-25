import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export interface DashboardFilters {
  year: string
  period: string
  regional: string
  area: string
  seller: string
  family: string
}

export interface DashboardContextType {
  actuals: any[]
  goals: any[]
  productFamilies: any[]
  filters: DashboardFilters
  setFilters: (f: Partial<DashboardFilters>) => void
  clearFilters: () => void
  filteredActuals: any[]
  filteredGoals: any[]
  isLoading: boolean
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [actuals, setActuals] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [productFamilies, setProductFamilies] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const defaultFilters = {
    year: 'All',
    period: 'All',
    regional: 'All',
    area: 'All',
    seller: 'All',
    family: 'All',
  }

  const [filters, setFiltersState] = useState<DashboardFilters>(defaultFilters)

  const setFilters = (f: Partial<DashboardFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }))
  }

  const clearFilters = () => setFiltersState(defaultFilters)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [acts, gls, fams] = await Promise.all([
        pb
          .collection('actual_performance')
          .getFullList({ expand: 'seller_id.regional_id,seller_id.area_id' }),
        pb.collection('goals').getFullList({ expand: 'seller_id.regional_id,seller_id.area_id' }),
        pb.collection('product_families').getFullList(),
      ])
      setActuals(acts)
      setGoals(gls)
      setProductFamilies(fams)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('actual_performance', () => loadData())
  useRealtime('goals', () => loadData())

  const filteredActuals = useMemo(() => {
    return actuals.filter((a) => {
      if (filters.year !== 'All' && !a.period.startsWith(filters.year)) return false
      if (filters.period !== 'All' && a.period !== filters.period) return false
      if (filters.family !== 'All' && a.mix_family !== filters.family) return false

      const seller = a.expand?.seller_id
      if (filters.seller !== 'All' && seller?.id !== filters.seller) return false
      if (filters.area !== 'All' && seller?.area_id !== filters.area) return false
      if (filters.regional !== 'All' && seller?.regional_id !== filters.regional) return false

      return true
    })
  }, [actuals, filters])

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (filters.year !== 'All' && !g.period.startsWith(filters.year)) return false
      if (filters.period !== 'All' && g.period !== filters.period) return false
      if (filters.family !== 'All' && g.mix_family !== filters.family) return false

      const seller = g.expand?.seller_id
      if (filters.seller !== 'All' && seller?.id !== filters.seller) return false
      if (filters.area !== 'All' && seller?.area_id !== filters.area) return false
      if (filters.regional !== 'All' && seller?.regional_id !== filters.regional) return false

      return true
    })
  }, [goals, filters])

  return (
    <DashboardContext.Provider
      value={{
        actuals,
        goals,
        productFamilies,
        filters,
        setFilters,
        clearFilters,
        filteredActuals,
        filteredGoals,
        isLoading,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) throw new Error('useDashboard must be used within DashboardProvider')
  return context
}
