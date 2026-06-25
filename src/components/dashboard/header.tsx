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
import { useMemo } from 'react'

export function DashboardHeader() {
  const { actuals, goals, filters, setFilters, clearFilters } = useDashboard()

  const { years, periods, regionals, areas, sellers, families } = useMemo(() => {
    const y = new Set<string>()
    const p = new Set<string>()
    const r = new Map<string, string>()
    const a = new Map<string, string>()
    const s = new Map<string, string>()
    const f = new Set<string>()

    const process = (item: any) => {
      if (item.period) {
        p.add(item.period)
        y.add(item.period.split('-')[0])
      }
      if (item.mix_family) f.add(item.mix_family)

      const seller = item.expand?.seller_id
      if (seller) {
        s.set(seller.id, seller.name || 'Unknown Seller')
        const regional = seller.expand?.regional_id
        if (regional) r.set(regional.id, regional.name)
        const area = seller.expand?.area_id
        if (area) a.set(area.id, area.name)
      }
    }

    actuals.forEach(process)
    goals.forEach(process)

    return {
      years: Array.from(y).sort(),
      periods: Array.from(p).sort(),
      regionals: Array.from(r.entries()).map(([id, name]) => ({ id, name })),
      areas: Array.from(a.entries()).map(([id, name]) => ({ id, name })),
      sellers: Array.from(s.entries()).map(([id, name]) => ({ id, name })),
      families: Array.from(f).sort(),
    }
  }, [actuals, goals])

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002147]">
            Performance Executiva
          </h1>
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
          options={years.map((y) => ({ id: y, name: y }))}
          onChange={(v) => setFilters({ year: v, period: 'All' })}
        />
        <FilterSelect
          label="Período"
          value={filters.period}
          options={periods.map((p) => ({ id: p, name: p }))}
          onChange={(v) => setFilters({ period: v })}
        />
        <FilterSelect
          label="Regional"
          value={filters.regional}
          options={regionals}
          onChange={(v) => setFilters({ regional: v, area: 'All', seller: 'All' })}
        />
        <FilterSelect
          label="Área"
          value={filters.area}
          options={areas}
          onChange={(v) => setFilters({ area: v, seller: 'All' })}
        />
        <FilterSelect
          label="Vendedor"
          value={filters.seller}
          options={sellers}
          onChange={(v) => setFilters({ seller: v })}
        />
        <FilterSelect
          label="Família"
          value={filters.family}
          options={families.map((f) => ({ id: f, name: f }))}
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
}: {
  label: string
  value: string
  options: { id: string; name: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-8 text-sm">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
