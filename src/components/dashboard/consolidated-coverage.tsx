import { useState, useMemo } from 'react'
import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

function getColorClass(achievement: number) {
  if (achievement >= 100)
    return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (achievement >= 80) return { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' }
  return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' }
}

export function ConsolidatedCoverage() {
  const { goals, actuals, regionals, areas, isLoading } = useDashboard()
  const [regId, setRegId] = useState('All')
  const [areaId, setAreaId] = useState('All')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))

  const filteredAreas = useMemo(
    () => areas.filter((a) => regId === 'All' || a.regional_id === regId),
    [areas, regId],
  )

  const coverageData = useMemo(() => {
    const covGoals = goals.filter(
      (g) =>
        g.metric === 'Coverage' &&
        g.period === period &&
        (regId === 'All' || g.regional_id === regId) &&
        (areaId === 'All' || g.area_id === areaId),
    )
    const covActuals = actuals.filter((a) => a.metric === 'Coverage' && a.period === period)
    if (covGoals.length === 0) return []

    const groups = new Map<
      string,
      { name: string; type: string; targetSum: number; actualSum: number; count: number }
    >()

    for (const goal of covGoals) {
      let groupKey: string
      let groupName: string
      let groupType: string

      if (areaId !== 'All') {
        const seller = goal.expand?.seller_id
        groupKey = `seller-${seller?.id || goal.seller_id}`
        groupName = seller?.name || 'Vendedor'
        groupType = 'Vendedor'
      } else if (regId !== 'All') {
        const area = areas.find((a) => a.id === goal.area_id)
        groupKey = `area-${goal.area_id || 'none'}`
        groupName = area?.name || 'Sem Área'
        groupType = 'Área'
      } else {
        const regional = regionals.find((r) => r.id === goal.regional_id)
        groupKey = `reg-${goal.regional_id || 'none'}`
        groupName = regional?.name || 'Sem Regional'
        groupType = 'Regional'
      }

      const existing = groups.get(groupKey) || {
        name: groupName,
        type: groupType,
        targetSum: 0,
        actualSum: 0,
        count: 0,
      }
      existing.targetSum += goal.target_base || 0
      existing.count += 1

      const actual = covActuals.find((a) => a.seller_id === goal.seller_id)
      if (actual) {
        existing.actualSum += actual.actual_coverage || actual.actual_value || 0
      }
      groups.set(groupKey, existing)
    }

    return Array.from(groups.values())
      .map((g) => {
        const avgTarget = g.count > 0 ? g.targetSum / g.count : 0
        const avgActual = g.count > 0 ? g.actualSum / g.count : 0
        const achievement = avgTarget > 0 ? (avgActual / avgTarget) * 100 : 0
        return { name: g.name, type: g.type, target: avgTarget, actual: avgActual, achievement }
      })
      .sort((a, b) => b.achievement - a.achievement)
  }, [goals, actuals, period, regId, areaId, areas, regionals])

  return (
    <Card className="shadow-md border-[#003DA5]/10 animate-scale-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-[#003DA5] uppercase tracking-wider">
          <ShieldCheck className="w-5 h-5 text-[#0066CC]" />
          Cobertura Consolidada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={regId}
            onValueChange={(v) => {
              setRegId(v)
              setAreaId('All')
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Regional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Todas</SelectItem>
              {regionals.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={areaId} onValueChange={setAreaId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Todas</SelectItem>
              {filteredAreas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2"
          />
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            Carregando...
          </div>
        ) : coverageData.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma meta de cobertura lançada para este período
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {coverageData.map((row, i) => {
              const colors = getColorClass(row.achievement)
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'rounded-lg p-3 border cursor-help transition-all duration-200 hover:scale-[1.02]',
                        colors.bg,
                        'border-transparent',
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                            {row.type}
                          </p>
                          <p className="text-sm font-bold text-foreground">{row.name}</p>
                        </div>
                        <span className={cn('text-lg font-extrabold', colors.text)}>
                          {row.achievement.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            colors.bar,
                          )}
                          style={{ width: `${Math.min(row.achievement, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="font-semibold">Meta Base:</span> {row.target.toFixed(1)}%
                      </p>
                      <p>
                        <span className="font-semibold">Realizada:</span> {row.actual.toFixed(1)}%
                      </p>
                      <p>
                        <span className="font-semibold">Atingimento:</span>{' '}
                        {row.achievement.toFixed(1)}%
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
