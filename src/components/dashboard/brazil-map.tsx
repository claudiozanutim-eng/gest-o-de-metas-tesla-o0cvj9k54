import { useDashboard, STATE_TO_REG_NUMBER } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BRAZIL_STATES, BRAZIL_VIEW_BOX, STATE_NAMES } from './brazil-paths'
import { cn } from '@/lib/utils'

const FALLBACK_COLOR = '#D1D5DB'

export function BrazilMap() {
  const { filteredActuals, filteredGoals, filters, setFilters, regionals } = useDashboard()

  const regionalByNumber = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>()
    regionals.forEach((r) => {
      const num = r.name?.match(/\b(0|1|2|3|4|5|6|7|8)\b/)?.[1]
      if (num) {
        map.set(num, {
          id: r.id,
          name: r.name,
          color: r.color_code || FALLBACK_COLOR,
        })
      }
    })
    return map
  }, [regionals])

  const regionalData = useMemo(() => {
    const rMap = new Map<
      string,
      { id: string; name: string; number: string; color: string; actual: number; goal: number }
    >()

    const extractNum = (name: string) => name?.match(/\b(0|1|2|3|4|5|6|7|8)\b/)?.[1]

    filteredActuals.forEach((a) => {
      const reg = a.expand?.seller_id?.expand?.regional_id
      if (reg && ['Faturamento', 'Revenue'].includes(a.metric)) {
        const num = extractNum(reg.name)
        if (num) {
          const regInfo = regionalByNumber.get(num)
          const entry = rMap.get(num) || {
            id: reg.id,
            name: reg.name,
            number: num,
            color: regInfo?.color || reg.color_code || FALLBACK_COLOR,
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
          const regInfo = regionalByNumber.get(num)
          const entry = rMap.get(num) || {
            id: reg.id,
            name: reg.name,
            number: num,
            color: regInfo?.color || reg.color_code || FALLBACK_COLOR,
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
  }, [filteredActuals, filteredGoals, regionalByNumber])

  const getStateInfo = (uf: string) => {
    const regNum = STATE_TO_REG_NUMBER[uf]
    const regInfo = regionalByNumber.get(regNum)
    const rData = regionalData[regNum]
    return {
      regNum,
      regName: regInfo?.name || `Regional ${regNum}`,
      color: regInfo?.color || FALLBACK_COLOR,
      rData,
    }
  }

  const handleStateClick = (uf: string) => {
    if (filters.state === uf) {
      setFilters({ state: 'All' })
    } else {
      setFilters({ state: uf })
    }
  }

  const handleLegendClick = (num: string) => {
    const regInfo = regionalByNumber.get(num)
    if (regInfo) {
      if (filters.regional === regInfo.id) {
        setFilters({ regional: 'All' })
      } else {
        setFilters({ regional: regInfo.id, state: 'All' })
      }
    }
  }

  const legendItems = useMemo(() => {
    const nums = ['0', '1', '2', '3', '4', '5', '6', '7', '8']
    return nums.map((num) => {
      const regInfo = regionalByNumber.get(num)
      const rData = regionalData[num]
      return {
        num,
        name: regInfo?.name || `Regional ${num}`,
        color: regInfo?.color || FALLBACK_COLOR,
        ach: rData?.ach || 0,
        hasData: !!rData,
      }
    })
  }, [regionalByNumber, regionalData])

  return (
    <Card className="shadow-sm flex flex-col col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[#002147] uppercase tracking-wider">
          Desempenho Geográfico
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col sm:flex-row gap-4 items-center p-6">
        <div className="flex flex-col gap-2 justify-center w-full sm:w-1/3 order-2 sm:order-1">
          {legendItems.map(({ num, name, color, ach, hasData }) => {
            const regInfo = regionalByNumber.get(num)
            const isSelected =
              (regInfo && filters.regional === regInfo.id) ||
              (filters.state !== 'All' && STATE_TO_REG_NUMBER[filters.state] === num)
            return (
              <div
                key={num}
                onClick={() => regInfo && handleLegendClick(num)}
                className={cn(
                  'flex items-center gap-2 text-xs cursor-pointer p-2 rounded-md transition-all border border-transparent',
                  regInfo ? 'hover:bg-[#E6F0FF]/50' : 'opacity-50 cursor-default',
                  isSelected && 'bg-[#E6F0FF] font-bold border-[#4D94FF]/30 shadow-sm',
                )}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1 truncate">{name}</span>
                {hasData && <span className="font-mono">{ach.toFixed(0)}%</span>}
              </div>
            )
          })}
        </div>

        <div className="flex-1 w-full max-w-sm sm:max-w-md order-1 sm:order-2 flex items-center justify-center relative aspect-square">
          <svg viewBox={BRAZIL_VIEW_BOX} className="w-full h-full drop-shadow-md">
            <TooltipProvider delayDuration={100}>
              {Object.entries(BRAZIL_STATES).map(([uf, path]) => {
                const { regNum, regName, color, rData } = getStateInfo(uf)

                let opacity = 0.2
                if (rData) {
                  const ach = Math.min(Math.max(rData.ach, 40), 100)
                  opacity = ach / 100
                }

                const isSelected = filters.state === uf
                const regInfo = regionalByNumber.get(regNum)
                const isRegionalSelected = regInfo && filters.regional === regInfo.id
                const isActive = isSelected || isRegionalSelected
                const strokeWidth = isActive ? 3 : 1.5
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
                        strokeLinejoin="round"
                        className={cn(
                          'cursor-pointer transition-all duration-300',
                          'hover:fill-opacity-90 hover:stroke-[#002147]',
                        )}
                        onClick={() => handleStateClick(uf)}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="z-50">
                      <div className="text-sm">
                        <p className="font-bold text-[#002147]">{STATE_NAMES[uf] || uf}</p>
                        <p className="text-muted-foreground">{regName}</p>
                        {rData ? (
                          <>
                            <p className="mt-1">
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
