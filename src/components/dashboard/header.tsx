import { useDashboard } from '@/hooks/use-dashboard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { FilterX } from 'lucide-react'
import { useMemo, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

const ALL_YEARS = ['2026', '2027', '2028']
const ALL_PERIODS = [
  { id: '01', name: 'Janeiro' },
  { id: '02', name: 'Fevereiro' },
  { id: '03', name: 'Março' },
  { id: '04', name: 'Abril' },
  { id: '05', name: 'Maio' },
  { id: '06', name: 'Junho' },
  { id: '07', name: 'Julho' },
  { id: '08', name: 'Agosto' },
  { id: '09', name: 'Setembro' },
  { id: '10', name: 'Outubro' },
  { id: '11', name: 'Novembro' },
  { id: '12', name: 'Dezembro' },
  { id: 'Q1', name: '1º Trimestre' },
  { id: 'Q2', name: '2º Trimestre' },
  { id: 'Q3', name: '3º Trimestre' },
  { id: 'Q4', name: '4º Trimestre' },
]
const ALL_FAMILIES = [
  { id: 'F1', name: 'Fase 1' },
  { id: 'F2', name: 'Fase 2' },
  { id: 'F3', name: 'Fase 3' },
  { id: 'Outros', name: 'Fase 4' },
]

export function DashboardHeader() {
  const { user } = useAuth()
  const {
    regionals: dbRegionals,
    areas: dbAreas,
    sellers: dbSellers,
    filters,
    setFilters,
    clearFilters,
  } = useDashboard()

  const { regionals, areas, sellers } = useMemo(() => {
    const dedupRegionals = new Map<string, { id: string; name: string }>()
    dbRegionals.forEach((r) => {
      if (r.id && !dedupRegionals.has(r.id)) dedupRegionals.set(r.id, { id: r.id, name: r.name })
    })
    const availableRegionals = Array.from(dedupRegionals.values())

    let availableAreas = dbAreas
    if (filters.regional !== 'All') {
      availableAreas = availableAreas.filter((a) => a.regional_id === filters.regional)
    }
    const dedupAreas = new Map<string, { id: string; name: string }>()
    availableAreas.forEach((a) => {
      if (a.id && !dedupAreas.has(a.id)) dedupAreas.set(a.id, { id: a.id, name: a.name })
    })
    const areasMapped = Array.from(dedupAreas.values())

    let availableSellers = dbSellers
    if (filters.area !== 'All') {
      availableSellers = availableSellers.filter((s) => s.area_id === filters.area)
    } else if (filters.regional !== 'All') {
      availableSellers = availableSellers.filter((s) => {
        const area = dbAreas.find((a) => a.id === s.area_id)
        return area?.regional_id === filters.regional
      })
    }
    const dedupSellers = new Map<string, { id: string; name: string }>()
    availableSellers
      .filter((s) => s.user_id)
      .forEach((s) => {
        if (s.user_id && !dedupSellers.has(s.user_id))
          dedupSellers.set(s.user_id, { id: s.user_id, name: s.name })
      })
    const sellersMapped = Array.from(dedupSellers.values())

    return { regionals: availableRegionals, areas: areasMapped, sellers: sellersMapped }
  }, [dbRegionals, dbAreas, dbSellers, filters.regional, filters.area])

  const isSellerLocked = user?.role === 'Seller' || sellers.length === 1
  const isAreaLocked = user?.role === 'Seller' || areas.length === 1
  const isRegionalLocked =
    user?.role === 'Seller' || user?.role === 'Regional Manager' || regionals.length === 1

  useEffect(() => {
    if (isRegionalLocked && regionals.length === 1 && filters.regional === 'All') {
      setFilters({ regional: regionals[0].id })
    }
    if (isAreaLocked && areas.length === 1 && filters.area === 'All') {
      setFilters({ area: areas[0].id })
    }
    if (isSellerLocked && sellers.length === 1 && filters.seller === 'All') {
      setFilters({ seller: sellers[0].id })
    }
  }, [
    isRegionalLocked,
    isAreaLocked,
    isSellerLocked,
    regionals,
    areas,
    sellers,
    filters,
    setFilters,
  ])

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#003DA5]">Dashboard</h1>
          <p className="text-muted-foreground">Monitoramento consolidado de metas e resultados.</p>
        </div>
        <Button variant="outline" onClick={clearFilters} className="mt-2 md:mt-0">
          <FilterX className="mr-2 h-4 w-4" /> Limpar Filtros
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 bg-white rounded-lg shadow-sm border">
        <FilterSelect
          label="Ano"
          value={filters.year}
          options={ALL_YEARS.map((y) => ({ id: y, name: y }))}
          onChange={(v) => setFilters({ year: v, period: 'All' })}
        />
        <FilterSelect
          label="Período"
          value={filters.period}
          options={ALL_PERIODS}
          onChange={(v) => setFilters({ period: v })}
        />
        <FilterSelect
          label="Regional"
          value={filters.regional}
          options={regionals}
          disabled={isRegionalLocked}
          onChange={(v) => setFilters({ regional: v, area: 'All', seller: 'All' })}
        />
        <FilterSelect
          label="Área"
          value={filters.area}
          options={areas}
          disabled={isAreaLocked}
          onChange={(v) => setFilters({ area: v, seller: 'All' })}
        />
        <FilterSelect
          label="Vendedor"
          value={filters.seller}
          options={sellers}
          disabled={isSellerLocked}
          onChange={(v) => setFilters({ seller: v })}
        />
        <FilterSelect
          label="Mix/Fase"
          value={filters.family}
          options={ALL_FAMILIES}
          onChange={(v) => setFilters({ family: v })}
        />
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  options: { id: string; name: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full h-8 text-sm bg-white">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">Todos</SelectItem>
          {options.map((o, idx) => (
            <SelectItem key={`${o.id}-${idx}`} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
