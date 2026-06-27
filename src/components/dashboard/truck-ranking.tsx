import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Trophy } from 'lucide-react'
import { useMemo } from 'react'

const TRUCK_IMAGES = [
  'https://img.usecurling.com/p/80/80?q=electric%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=delivery%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=pickup%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=cargo%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=semi%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=box%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=tow%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=dump%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=fire%20truck&color=blue&dpr=2',
  'https://img.usecurling.com/p/80/80?q=monster%20truck&color=blue&dpr=2',
]

const isRevenue = (m: string) => ['Faturamento', 'Revenue', 'Faturamento (Geral)'].includes(m)

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)

export function TruckRanking() {
  const { filteredActuals, filteredGoals, areas, regionals } = useDashboard()

  const ranking = useMemo(() => {
    const map = new Map<
      string,
      { name: string; target: number; actual: number; area: string; regional: string }
    >()

    filteredGoals.forEach((g) => {
      if (!isRevenue(g.metric)) return
      const s = g.expand?.seller_id
      if (!s) return
      if (!map.has(s.id)) {
        const area = areas.find((a) => a.id === s.area_id)
        const reg = regionals.find((r) => r.id === s.regional_id)
        map.set(s.id, {
          name: s.name || '—',
          target: 0,
          actual: 0,
          area: area?.name || '—',
          regional: reg?.name || '—',
        })
      }
      map.get(s.id)!.target += g.target_base || 0
    })

    filteredActuals.forEach((a) => {
      if (!isRevenue(a.metric)) return
      const s = a.expand?.seller_id
      if (!s || !map.has(s.id)) return
      map.get(s.id)!.actual += a.actual_value || 0
    })

    return Array.from(map.entries())
      .map(([id, d]) => ({
        id,
        ...d,
        pct: d.target > 0 ? (d.actual / d.target) * 100 : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10)
  }, [filteredActuals, filteredGoals, areas, regionals])

  if (ranking.length === 0) return null

  return (
    <Card className="shadow-md border-[#003DA5]/10 animate-scale-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-[#003DA5] uppercase tracking-wider">
          <Trophy className="w-5 h-5 text-[#0066CC]" />
          Top 10 Vendedores — Ranking de Caminhões
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ranking.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#E6F0FF]/50 hover:bg-[#E6F0FF] border border-transparent hover:border-[#4D94FF]/30 transition-all duration-300 hover:scale-[1.02] animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex flex-col items-center justify-center shrink-0 w-8">
                <span
                  className={`text-xl font-extrabold ${
                    i < 3 ? 'text-[#003DA5]' : 'text-muted-foreground'
                  }`}
                >
                  {i + 1}º
                </span>
              </div>
              <img
                src={TRUCK_IMAGES[i % TRUCK_IMAGES.length]}
                alt="Truck"
                className="w-12 h-12 rounded-lg object-cover border-2 border-[#4D94FF]/30 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#003DA5] truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.regional} • {s.area}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={Math.min(s.pct, 100)} className="h-2 flex-1" />
                  <span className="text-xs font-bold text-[#0066CC] shrink-0">
                    {s.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    Meta Base: {fmtCurrency(s.target)}
                  </span>
                  <span className="text-[10px] font-semibold text-[#003DA5]">
                    Atual: {fmtCurrency(s.actual)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
