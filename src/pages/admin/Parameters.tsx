import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function Parameters() {
  const [families, setFamilies] = useState<any[]>([])
  const { toast } = useToast()
  const [paramsId, setParamsId] = useState('')
  const [taxRateId, setTaxRateId] = useState('')
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

  const [isOpen, setIsOpen] = useState(false)
  const [familyData, setFamilyData] = useState<any>({
    id: '',
    code: '',
    name: '',
    weight: 0,
    composition: '{}',
  })

  const loadData = async () => {
    try {
      const records = await pb
        .collection('system_parameters')
        .getFullList({ filter: 'key = "commission_rules" || key = "tax_rate"' })

      const cr = records.find((r) => r.key === 'commission_rules')
      if (cr) {
        setParamsId(cr.id)
        setRules(cr.value)
      }
      const tr = records.find((r) => r.key === 'tax_rate')
      if (tr) {
        setTaxRateId(tr.id)
        setTaxRate(tr.value)
      }

      setFamilies(await pb.collection('product_families').getFullList())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveParams = async () => {
    try {
      if (paramsId) await pb.collection('system_parameters').update(paramsId, { value: rules })
      else {
        const res = await pb
          .collection('system_parameters')
          .create({ key: 'commission_rules', value: rules })
        setParamsId(res.id)
      }

      if (taxRateId) await pb.collection('system_parameters').update(taxRateId, { value: taxRate })
      else {
        const res = await pb.collection('system_parameters').create({
          key: 'tax_rate',
          value: taxRate,
          description: 'Tax deduction for net commission value',
        })
        setTaxRateId(res.id)
      }

      toast({ title: 'Parâmetros atualizados' })
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const handleFamilySave = async () => {
    try {
      let comp = {}
      try {
        comp = JSON.parse(familyData.composition)
      } catch {
        return toast({ title: 'JSON Inválido', variant: 'destructive' })
      }
      const data = { ...familyData, composition: comp }
      if (data.id) await pb.collection('product_families').update(data.id, data)
      else await pb.collection('product_families').create(data)
      setIsOpen(false)
      loadData()
      toast({ title: 'Família salva' })
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const openFamilyEdit = (f: any) => {
    setFamilyData({
      id: f.id,
      code: f.code,
      name: f.name,
      weight: f.weight,
      composition: JSON.stringify(f.composition || {}),
    })
    setIsOpen(true)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-primary">Parâmetros e Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as regras de comissionamento e famílias de produtos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras de Comissionamento (%)</CardTitle>
          <CardDescription>
            Defina limites e multiplicadores das metas Base, Bronze, Prata e Ouro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(rules).map(([k, v]) => (
              <div key={k} className="space-y-2">
                <Label className="capitalize">{k.replace('_', ' ')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={v}
                  onChange={(e) => setRules({ ...rules, [k]: Number(e.target.value) })}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Taxa / Imposto (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Ex: 0.32 para 32%</p>
            </div>
          </div>
          <Button onClick={saveParams}>Salvar Parâmetros</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Famílias de Produtos</CardTitle>
            <CardDescription>Configuração de pesos e mix (JSON).</CardDescription>
          </div>
          <Button
            onClick={() =>
              openFamilyEdit({ id: '', code: '', name: '', weight: 0, composition: '{}' })
            }
          >
            Nova Família
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Peso (%)</TableHead>
                <TableHead>Composição</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {families.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono">{f.code}</TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.weight}%</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {JSON.stringify(f.composition)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openFamilyEdit(f)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{familyData.id ? 'Editar' : 'Nova'} Família</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Código (ex: F1)</Label>
              <Input
                value={familyData.code}
                onChange={(e) => setFamilyData({ ...familyData, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={familyData.name}
                onChange={(e) => setFamilyData({ ...familyData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Peso (%)</Label>
              <Input
                type="number"
                value={familyData.weight}
                onChange={(e) => setFamilyData({ ...familyData, weight: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Composição (JSON)</Label>
              <Input
                value={familyData.composition}
                onChange={(e) => setFamilyData({ ...familyData, composition: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleFamilySave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
