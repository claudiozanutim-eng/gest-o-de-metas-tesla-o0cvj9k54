import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/mock-data'
import { Calculator, DollarSign, TrendingUp, Award, Info } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'

export default function Simulation() {
  const { user } = useAuth()
  const [baseSalary, setBaseSalary] = useState<number | string>(3000)
  const [goal, setGoal] = useState<number | string>(200000)

  const [achievements, setAchievements] = useState({
    revenue: [100],
    mix: [100],
    coverage: [100],
  })

  const [tiers, setTiers] = useState<any[]>([])
  const [weights, setWeights] = useState({ revenue: 50, mix: 25, coverage: 25 })

  useEffect(() => {
    Promise.all([
      pb.collection('commission_tiers').getFullList({ sort: 'order' }),
      pb.collection('system_parameters').getFullList(),
      user
        ? pb
            .collection('goals')
            .getList(1, 1, {
              filter: `seller_id="${user.id}" && metric~'faturamento'`,
              sort: '-created',
            })
            .catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([tiersRes, sysRes, goalsRes]) => {
        setTiers(tiersRes)
        const wRec = sysRes.find((r) => r.key === 'commission_weights')
        if (wRec && wRec.value) setWeights(wRec.value)

        if (goalsRes && goalsRes.items.length > 0) {
          setGoal(goalsRes.items[0].target_base)
        }
      })
      .catch(console.error)
  }, [user])

  // Calculate Overall Achievement %
  const overallPercent =
    achievements.revenue[0] * (weights.revenue / 100) +
    achievements.mix[0] * (weights.mix / 100) +
    achievements.coverage[0] * (weights.coverage / 100)

  // Find Category (Tier)
  const activeTiers = tiers.filter((t) => t.is_active).sort((a, b) => a.order - b.order)
  let matchedTier = activeTiers[0]
  for (const t of activeTiers) {
    if (overallPercent >= t.min_pct && overallPercent <= t.max_pct) {
      matchedTier = t
      break
    }
  }
  // Fallback boundaries
  if (!matchedTier && activeTiers.length > 0) {
    if (overallPercent < activeTiers[0].min_pct) matchedTier = activeTiers[0]
    else matchedTier = activeTiers[activeTiers.length - 1]
  }

  const category = matchedTier
    ? { name: matchedTier.name, color: matchedTier.color }
    : { name: 'Sem Faixa', color: '#9ca3af' }
  const multiplier = matchedTier ? matchedTier.multiplier : 0

  // Financial Math
  const numericGoal = Number(goal) || 0
  const numericBaseSalary = Number(baseSalary) || 0

  const grossRevenue = numericGoal * (achievements.revenue[0] / 100)
  const totalAdjustments = 32 // 32% tax discount
  const liquidRevenue = grossRevenue * (1 - 0.32)
  const commission = liquidRevenue * multiplier
  const totalEarnings = numericBaseSalary + commission

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Simulação de Ganho</h1>
        <p className="text-muted-foreground">
          Estime seus recebimentos baseado no atingimento das metas, mix e cobertura.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Variáveis Base
              </CardTitle>
              <CardDescription>
                Defina sua base salarial e meta financeira principal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Salário Fixo (R$)</Label>
                <Input
                  type="number"
                  value={baseSalary}
                  onChange={(e) =>
                    setBaseSalary(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Meta de Faturamento (R$)</Label>
                <Input
                  type="number"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atingimento de Metas</CardTitle>
              <CardDescription>
                Simule a performance nos critérios de comissionamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="flex items-center gap-2">
                    Faturamento
                    <Badge variant="outline" className="text-xs">
                      Peso {weights.revenue}%
                    </Badge>
                  </Label>
                  <span className="font-mono font-bold text-lg">{achievements.revenue[0]}%</span>
                </div>
                <Slider
                  value={achievements.revenue}
                  onValueChange={(v) => setAchievements({ ...achievements, revenue: v })}
                  min={0}
                  max={190}
                  step={1}
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="flex items-center gap-2">
                    Mix Produtos
                    <Badge variant="outline" className="text-xs">
                      Peso {weights.mix}%
                    </Badge>
                  </Label>
                  <span className="font-mono font-bold text-lg">{achievements.mix[0]}%</span>
                </div>
                <Slider
                  value={achievements.mix}
                  onValueChange={(v) => setAchievements({ ...achievements, mix: v })}
                  min={0}
                  max={190}
                  step={1}
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="flex items-center gap-2">
                    Cobertura CNPJ
                    <Badge variant="outline" className="text-xs">
                      Peso {weights.coverage}%
                    </Badge>
                  </Label>
                  <span className="font-mono font-bold text-lg">{achievements.coverage[0]}%</span>
                </div>
                <Slider
                  value={achievements.coverage}
                  onValueChange={(v) => setAchievements({ ...achievements, coverage: v })}
                  min={0}
                  max={190}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/20 h-full">
            <CardHeader>
              <CardTitle>Resultados Simulados</CardTitle>
              <CardDescription>
                Acompanhamento progressivo com as regras financeiras ativas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Atingimento Global Ponderado</p>
                  <p className="text-sm font-medium">Soma de (Atingimento × Peso)</p>
                </div>
                <span className="text-3xl font-bold font-mono" style={{ color: category.color }}>
                  {overallPercent.toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-lg p-4 border shadow-sm">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Faturamento Bruto
                  </p>
                  <p className="text-xl font-mono font-semibold">{formatCurrency(grossRevenue)}</p>
                </div>
                <div className="bg-background rounded-lg p-4 border shadow-sm relative group">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Faturamento Líquido
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground ml-1" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Dedução de 32% referente a impostos e taxas, conforme regra de negócio.
                      </TooltipContent>
                    </Tooltip>
                  </p>
                  <p className="text-xl font-mono font-semibold text-primary">
                    {formatCurrency(liquidRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dedução de {totalAdjustments}%
                  </p>
                </div>
                <div className="bg-background rounded-lg p-4 border shadow-sm col-span-2 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Award className="w-4 h-4" /> Categoria de Comissionamento
                    </p>
                    <p className="text-2xl font-bold" style={{ color: category.color }}>
                      {category.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Multiplicador Base</p>
                    <p className="text-xl font-mono font-semibold">{multiplier.toFixed(4)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-primary text-primary-foreground rounded-xl p-6 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-primary-foreground/80 font-medium mb-1">
                    Ganhos Estimados Totais
                  </p>
                  <p className="text-4xl font-mono font-bold tracking-tight">
                    {formatCurrency(totalEarnings)}
                  </p>
                </div>
                <div className="bg-primary-foreground/20 p-3 rounded-full hidden sm:block">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Composição: Fixo ({formatCurrency(numericBaseSalary)}) + Comissão (
                {formatCurrency(commission)})
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
