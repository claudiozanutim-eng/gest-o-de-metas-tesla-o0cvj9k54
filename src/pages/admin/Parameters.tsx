import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function Parameters() {
  const { toast } = useToast()
  const [paramsId, setParamsId] = useState('')
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
    loadParams()
  }, [])

  const loadParams = async () => {
    try {
      const records = await pb
        .collection('system_parameters')
        .getFullList({ filter: 'key = "commission_rules"' })
      if (records.length > 0) {
        setParamsId(records[0].id)
        setRules(records[0].value)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveParams = async () => {
    try {
      if (paramsId) {
        await pb.collection('system_parameters').update(paramsId, { value: rules })
      } else {
        const res = await pb
          .collection('system_parameters')
          .create({
            key: 'commission_rules',
            value: rules,
            description: 'Regras de comissionamento',
          })
        setParamsId(res.id)
      }
      toast({ title: 'Parâmetros atualizados com sucesso' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleChange = (key: string, value: string) => {
    setRules((prev) => ({ ...prev, [key]: Number(value) }))
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Parâmetros do Sistema</h1>
        <p className="text-muted-foreground">
          Gerencie as regras de comissionamento e limites de categorias.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras de Comissionamento e Categorias</CardTitle>
          <CardDescription>
            Defina os thresholds (%) e os multiplicadores de cada categoria.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Base Threshold (%)</Label>
              <Input
                type="number"
                value={rules.base_threshold}
                onChange={(e) => handleChange('base_threshold', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Base Multiplicador</Label>
              <Input
                type="number"
                step="0.01"
                value={rules.base_multiplier}
                onChange={(e) => handleChange('base_multiplier', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Bronze Threshold (%)</Label>
              <Input
                type="number"
                value={rules.bronze_threshold}
                onChange={(e) => handleChange('bronze_threshold', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Bronze Multiplicador</Label>
              <Input
                type="number"
                step="0.01"
                value={rules.bronze_multiplier}
                onChange={(e) => handleChange('bronze_multiplier', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Prata Threshold (%)</Label>
              <Input
                type="number"
                value={rules.prata_threshold}
                onChange={(e) => handleChange('prata_threshold', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prata Multiplicador</Label>
              <Input
                type="number"
                step="0.01"
                value={rules.prata_multiplier}
                onChange={(e) => handleChange('prata_multiplier', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-start-1 col-end-3" />
            <div className="space-y-2">
              <Label>Ouro Multiplicador</Label>
              <Input
                type="number"
                step="0.01"
                value={rules.ouro_multiplier}
                onChange={(e) => handleChange('ouro_multiplier', e.target.value)}
              />
            </div>
          </div>

          <Button onClick={saveParams}>Salvar Parâmetros</Button>
        </CardContent>
      </Card>
    </div>
  )
}
