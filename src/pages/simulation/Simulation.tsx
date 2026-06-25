import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/mock-data'
import { Calculator, DollarSign, TrendingUp } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function Simulation() {
  const [baseSalary, setBaseSalary] = useState(3000)
  const [goal, setGoal] = useState(200000)
  const [achievementPercent, setAchievementPercent] = useState([85])
  const [taxRate, setTaxRate] = useState(0.32)

  const [rules, setRules] = useState({
    base_threshold: 80,
    base_multiplier: 0,
    bronze_threshold: 95,
    bronze_multiplier: 0.02,
    prata_threshold: 110,
    prata_multiplier: 0.035,
    ouro_multiplier: 0.05,
  })

  useEffect(() => {
    pb.collection('system_parameters')
      .getFullList({ filter: 'key = "commission_rules" || key = "tax_rate"' })
      .then((records) => {
        const cr = records.find((r) => r.key === 'commission_rules')
        if (cr) setRules(cr.value)
        const tr = records.find((r) => r.key === 'tax_rate')
        if (tr) setTaxRate(Number(tr.value))
      })
      .catch(console.error)
  }, [])

  const getMultiplier = (percent: number) => {
    if (percent < rules.base_threshold) return 0 // Abaixo da base
    if (percent < rules.bronze_threshold) return rules.base_multiplier
    if (percent < rules.prata_threshold) return rules.bronze_multiplier
    if (percent < rules.prata_threshold + 15) return rules.prata_multiplier
    return rules.ouro_multiplier
  }

  const getCategory = (percent: number) => {
    if (percent < rules.base_threshold) return { name: 'Abaixo da Base', color: 'text-destructive' }
    if (percent < rules.bronze_threshold) return { name: 'Base', color: 'text-zinc-500' }
    if (percent < rules.prata_threshold) return { name: 'Bronze', color: 'text-amber-600' }
    if (percent < rules.prata_threshold + 15) return { name: 'Prata', color: 'text-zinc-400' }
    return { name: 'Ouro', color: 'text-yellow-500' }
  }

  const percent = achievementPercent[0]
  const grossRevenue = goal * (percent / 100)
  const liquidRevenue = grossRevenue * (1 - taxRate)
  const commission = liquidRevenue * getMultiplier(percent)
  const totalEarnings = baseSalary + commission
  const category = getCategory(percent)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Simulação de Ganho</h1>
        <p className="text-muted-foreground">
          Estime seus recebimentos baseado no atingimento da meta com regras dinâmicas.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Parâmetros
            </CardTitle>
            <CardDescription>Defina sua base salarial e meta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Salário Fixo (R$)</Label>
              <Input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta de Faturamento (R$)</Label>
              <Input type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value))} />
            </div>

            <div className="pt-4 border-t mt-4 text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Regras de Comissão:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  Base ({rules.base_threshold}-{rules.bronze_threshold - 1}%):{' '}
                  {(rules.base_multiplier * 100).toFixed(1)}%
                </li>
                <li>
                  Bronze ({rules.bronze_threshold}-{rules.prata_threshold - 1}%):{' '}
                  {(rules.bronze_multiplier * 100).toFixed(1)}%
                </li>
                <li>
                  Prata ({rules.prata_threshold}-{rules.prata_threshold + 14}%):{' '}
                  {(rules.prata_multiplier * 100).toFixed(1)}%
                </li>
                <li>
                  Ouro (≥{rules.prata_threshold + 15}%): {(rules.ouro_multiplier * 100).toFixed(1)}%
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-gradient-to-br from-background to-muted/50 border-primary/20">
          <CardHeader>
            <CardTitle>Cenário Simulado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-base font-semibold">Atingimento da Meta</Label>
                <span className={`text-2xl font-bold font-mono ${category.color}`}>{percent}%</span>
              </div>
              <Slider
                value={achievementPercent}
                onValueChange={setAchievementPercent}
                max={150}
                step={1}
                className="py-4"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Faturamento Bruto
                </p>
                <p className="text-xl font-mono font-semibold">{formatCurrency(grossRevenue)}</p>
              </div>
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> Faturamento Líquido
                </p>
                <p className="text-xl font-mono font-semibold text-primary">
                  {formatCurrency(liquidRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dedução de {(taxRate * 100).toFixed(0)}%
                </p>
              </div>
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Award className="w-4 h-4" /> Categoria Atingida
                </p>
                <p className={`text-xl font-bold ${category.color}`}>{category.name}</p>
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
              <div className="bg-primary-foreground/20 p-3 rounded-full">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Composição: Fixo ({formatCurrency(baseSalary)}) + Comissão (
              {formatCurrency(commission)})
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Award(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}
