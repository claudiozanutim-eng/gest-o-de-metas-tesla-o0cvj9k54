import { useDashboard, STATE_TO_REG_NUMBER } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BRAZIL_STATES, BRAZIL_VIEW_BOX } from './brazil-paths'
import { cn } from '@/lib/utils'

export const REG_COLORS: Record<string, string> = {
  '1': '#34a853',
  '2': '#673ab7',
  '3': '#ff9800',
  '4': '#ffeb3b',
  '5': '#42a5f5',
  '6': '#f44336',
  '7': '#ff7043',
  '8': '#9e9e9e',
  '0': '#e91e63',
}

export function BrazilMap() {
  const { filteredActuals, filteredGoals, filters, setFilters } = useDashboard()

  const regionalData = useMemo(() => {
    const rMap = new Map<
      string,
      { id: string; name: string; number: string; color: string; actual: number; goal: number }
    >()

    const extractNum = (name: string) => name.match(/\b(0|1|2|3|4|5|6|7|8)\b/)?.[1]

    filteredActuals.forEach((a) => {
      const reg = a.expand?.seller_id?.expand?.regional_id
      if (reg && ['Faturamento', 'Revenue'].includes(a.metric)) {
        const num = extractNum(reg.name)
        if (num) {
          const entry = rMap.get(num) || {
            id: reg.id,
            name: reg.name,
            number: num,
            color: reg.color_code || REG_COLORS[num],
            actual: 0,
            goal: 0,
          }
          entry.actual += a.actual_value || 0
          rMap.set(num, entry)
        }
      }
    })

    filteredGoals.forEach((g) => {
      const reg = g.expand?.seller_id?.expand?.regional_id
      if (reg && ['Faturamento', 'Revenue'].includes(g.metric)) {
        const num = extractNum(reg.name)
        if (num) {
          const entry = rMap.get(num) || {
            id: reg.id,
            name: reg.name,
            number: num,
            color: reg.color_code || REG_COLORS[num],
            actual: 0,
            goal: 0,
          }
          entry.goal += g.target_base || 0
          rMap.set(num, entry)
        }
      }
    })

    const result: Record<
      string,
      { id: string; name: string; color: string; ach: number; actual: number; goal: number }
    > = {}
    rMap.forEach((val, key) => {
      result[key] = {
        id: val.id,
        name: val.name,
        color: val.color,
        ach: val.goal > 0 ? (val.actual / val.goal) * 100 : 0,
        actual: val.actual,
        goal: val.goal,
      }
    })
    return result
  }, [filteredActuals, filteredGoals])

  const handleStateClick = (uf: string) => {
    if (filters.state === uf) {
      setFilters({ state: 'All' })
    } else {
      setFilters({ state: uf })
    }
  }

  const handleLegendClick = (num: string) => {
    const rData = regionalData[num]
    if (rData) {
      if (filters.regional === rData.id) {
        setFilters({ regional: 'All' })
      } else {
        setFilters({ regional: rData.id, state: 'All' })
      }
    }
  }

  return (
    <Card className="shadow-sm flex flex-col col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#002147] uppercase tracking-wider">
          Desempenho Geográfico
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col sm:flex-row gap-4 items-center p-6">
        <div className="flex flex-col gap-2 justify-center w-full sm:w-1/3 order-2 sm:order-1">
          {Object.entries(REG_COLORS)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([num, defaultColor], _legendIdx) => {
              const rData = regionalData[num]
              const color = rData?.color || defaultColor
              const isSelected =
                (rData && filters.regional === rData.id) ||
                (filters.state !== 'All' && STATE_TO_REG_NUMBER[filters.state] === num)

              return (
                <div
                  key={num}
                  onClick={() => handleLegendClick(num)}
                  className={cn(
                    'flex items-center gap-2 text-xs cursor-pointer p-2 rounded-md transition-all border border-transparent',
                    isSelected
                      ? 'bg-slate-100 font-bold border-slate-300 shadow-sm'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex-1 truncate">Regional {num}</span>
                  {rData && <span className="font-mono">{rData.ach.toFixed(0)}%</span>}
                </div>
              )
            })}
        </div>

        <div className="flex-1 w-full max-w-sm sm:max-w-md order-1 sm:order-2 flex items-center justify-center relative aspect-square">
          <svg viewBox={BRAZIL_VIEW_BOX} className="w-full h-full drop-shadow-md">
            <TooltipProvider delayDuration={100}>
              {Object.entries(BRAZIL_STATES).map(([uf, path]) => {
                const regNum = STATE_TO_REG_NUMBER[uf]
                const rData = regionalData[regNum]
                const color = rData?.color || REG_COLORS[regNum] || '#cccccc'

                let opacity = 0.2
                if (rData) {
                  const ach = Math.min(Math.max(rData.ach, 40), 100)
                  opacity = ach / 100
                }

                const isSelected = filters.state === uf
                const isRegionalSelected = rData && filters.regional === rData.id
                const isActive = isSelected || isRegionalSelected
                const strokeWidth = isActive ? 6 : 2
                const stroke = isActive ? '#002147' : '#ffffff'

                return (
                  <Tooltip key={`state-${uf}`}>
                    <TooltipTrigger asChild>
                      <path
                        d={path}
                        fill={color}
                        fillOpacity={opacity}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        className={cn(
                          'cursor-pointer transition-all duration-300',
                          'hover:fill-opacity-100 hover:stroke-[#002147]',
                        )}
                        onClick={() => handleStateClick(uf)}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="z-50">
                      <div className="text-sm">
                        <p className="font-bold">
                          {uf} - Regional {regNum}
                        </p>
                        {rData ? (
                          <>
                            <p>
                              Faturamento:{' '}
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(rData.actual)}
                            </p>
                            <p>Atingimento: {rData.ach.toFixed(1)}%</p>
                          </>
                        ) : (
                          <p className="text-muted-foreground mt-1">Sem dados no período</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
