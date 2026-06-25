import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export const STATE_TO_REG_NUMBER: Record<string, string> = {
  SP: '1',
  RS: '2',
  SC: '2',
  PR: '2',
  RJ: '3',
  ES: '3',
  MG: '4',
  BA: '5',
  AL: '5',
  SE: '5',
  PE: '5',
  PB: '5',
  RN: '5',
  AP: '6',
  AM: '6',
  AC: '6',
  RR: '6',
  PA: '6',
  RO: '7',
  MT: '7',
  MS: '7',
  GO: '8',
  DF: '8',
  TO: '0',
  CE: '0',
  PI: '0',
  MA: '0',
}

export interface DashboardFilters {
  year: string
  period: string
  regional: string
  state: string
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
    state: 'All',
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

      if (filters.state !== 'All') {
        const expectedReg = STATE_TO_REG_NUMBER[filters.state]
        const regName = seller?.expand?.regional_id?.name || ''
        const regNum = regName.match(/\b(0|1|2|3|4|5|6|7|8)\b/)?.[1]
        if (expectedReg && regNum !== expectedReg) return false
      }

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

      if (filters.state !== 'All') {
        const expectedReg = STATE_TO_REG_NUMBER[filters.state]
        const regName = seller?.expand?.regional_id?.name || ''
        const regNum = regName.match(/\b(0|1|2|3|4|5|6|7|8)\b/)?.[1]
        if (expectedReg && regNum !== expectedReg) return false
      }

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
