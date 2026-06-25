import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useMemo } from 'react'

export function RegionalTiles() {
  const { filteredActuals, filteredGoals, setFilters } = useDashboard()

  const regionals = useMemo(() => {
    const rMap = new Map<string, { id: string; name: string; actual: number; goal: number }>()

    filteredActuals.forEach((a) => {
      const reg = a.expand?.seller_id?.expand?.regional_id
      if (reg && ['Faturamento', 'Revenue'].includes(a.metric)) {
        const entry = rMap.get(reg.id) || { id: reg.id, name: reg.name, actual: 0, goal: 0 }
        entry.actual += a.actual_value || 0
        rMap.set(reg.id, entry)
      }
    })

    filteredGoals.forEach((g) => {
      const reg = g.expand?.seller_id?.expand?.regional_id
      if (reg && ['Faturamento', 'Revenue'].includes(g.metric)) {
        const entry = rMap.get(reg.id) || { id: reg.id, name: reg.name, actual: 0, goal: 0 }
        entry.goal += g.target_base || 0
        rMap.set(reg.id, entry)
      }
    })

    return Array.from(rMap.values())
      .map((r) => ({
        ...r,
        ach: r.goal > 0 ? (r.actual / r.goal) * 100 : 0,
      }))
      .sort((a, b) => b.ach - a.ach)
  }, [filteredActuals, filteredGoals])

  return (
    <Card className="shadow-sm flex flex-col col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#002147] uppercase tracking-wider">
          Performance por Regional
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {regionals.length > 0 ? (
            regionals.map((r) => {
              const isHigh = r.ach >= 100
              const isMedium = r.ach >= 80 && r.ach < 100
              const bgClass = isHigh ? 'bg-[#0072c6]' : isMedium ? 'bg-[#004b87]' : 'bg-[#002147]'

              return (
                <div
                  key={r.id}
                  onClick={() => setFilters({ regional: r.id })}
                  className={`${bgClass} text-white p-4 rounded-md cursor-pointer transition-transform hover:scale-105 shadow-sm flex flex-col justify-center items-center text-center`}
                >
                  <span className="text-xs font-semibold opacity-90 truncate w-full mb-1">
                    {r.name}
                  </span>
                  <span className="text-2xl font-bold">{r.ach.toFixed(0)}%</span>
                </div>
              )
            })
          ) : (
            <div className="col-span-full flex h-full items-center justify-center text-sm text-muted-foreground min-h-[100px]">
              Sem dados
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
