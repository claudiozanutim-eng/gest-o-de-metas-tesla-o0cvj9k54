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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function Parameters() {
  const { toast } = useToast()
  const [families, setFamilies] = useState<any[]>([])
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
  const [parameters, setParameters] = useState<any[]>([])
  const [paramDialog, setParamDialog] = useState(false)
  const [paramFormData, setParamFormData] = useState({
    id: '',
    key: '',
    value: '',
    description: '',
  })
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [paramToDelete, setParamToDelete] = useState<any>(null)

  const loadData = async () => {
    try {
      const records = await pb.collection('system_parameters').getFullList()
      setParameters(records)
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
        const res = await pb
          .collection('system_parameters')
          .create({
            key: 'tax_rate',
            value: taxRate,
            description: 'Tax deduction for net commission value',
          })
        setTaxRateId(res.id)
      }
      toast({ title: 'Parâmetro salvo com sucesso' })
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao salvar o parâmetro', variant: 'destructive' })
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

  const handleParamSave = async () => {
    try {
      let parsedValue = null
      if (paramFormData.value.trim() !== '') {
        try {
          parsedValue = JSON.parse(paramFormData.value)
        } catch {
          return toast({ title: 'JSON Inválido', variant: 'destructive' })
        }
      }
      const data = {
        key: paramFormData.key,
        value: parsedValue,
        description: paramFormData.description,
      }
      if (paramFormData.id) await pb.collection('system_parameters').update(paramFormData.id, data)
      else await pb.collection('system_parameters').create(data)
      setParamDialog(false)
      loadData()
      toast({ title: 'Parâmetro salvo com sucesso' })
    } catch (e: any) {
      toast({ title: 'Erro ao salvar o parâmetro', description: e.message, variant: 'destructive' })
    }
  }

  const handleParamDelete = async () => {
    if (!paramToDelete) return
    try {
      await pb.collection('system_parameters').delete(paramToDelete.id)
      setDeleteDialog(false)
      loadData()
      toast({ title: 'Parâmetro excluído com sucesso' })
    } catch (e: any) {
      toast({
        title: 'Erro ao excluir o parâmetro',
        description: e.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold text-primary">Parâmetros e Configurações</h1>
        <p className="text-muted-foreground">Gerencie parâmetros do sistema e regras.</p>
      </div>

      <Tabs defaultValue="gerais" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gerais">Parâmetros do Sistema</TabsTrigger>
          <TabsTrigger value="regras">Regras de Comissionamento</TabsTrigger>
          <TabsTrigger value="familias">Famílias de Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="gerais" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Parâmetros do Sistema</CardTitle>
                <CardDescription>Gerencie todos os parâmetros do sistema.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setParamFormData({ id: '', key: '', value: '', description: '' })
                  setParamDialog(true)
                }}
              >
                Adicionar Parâmetro
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chave</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[150px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        Nenhum parâmetro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    parameters.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.key}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {JSON.stringify(p.value)}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">{p.description}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setParamFormData({
                                  id: p.id,
                                  key: p.key,
                                  value: JSON.stringify(p.value),
                                  description: p.description || '',
                                })
                                setParamDialog(true)
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setParamToDelete(p)
                                setDeleteDialog(true)
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regras" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Comissionamento (%)</CardTitle>
              <CardDescription>Limites e multiplicadores.</CardDescription>
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
                </div>
              </div>
              <Button onClick={saveParams}>Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="familias" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Famílias de Produtos</CardTitle>
                <CardDescription>Configuração de pesos e mix (JSON).</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setFamilyData({ id: '', code: '', name: '', weight: 0, composition: '{}' })
                  setIsOpen(true)
                }}
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
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {JSON.stringify(f.composition)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFamilyData({
                              id: f.id,
                              code: f.code,
                              name: f.name,
                              weight: f.weight,
                              composition: JSON.stringify(f.composition || {}),
                            })
                            setIsOpen(true)
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFamilySave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paramDialog} onOpenChange={setParamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{paramFormData.id ? 'Editar' : 'Adicionar Parâmetro'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Chave</Label>
              <Input
                placeholder="Digite a chave do parâmetro..."
                value={paramFormData.key}
                onChange={(e) => setParamFormData({ ...paramFormData, key: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor</Label>
              <Input
                placeholder="Insira o valor (JSON)..."
                value={paramFormData.value}
                onChange={(e) => setParamFormData({ ...paramFormData, value: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Descreva a finalidade deste parâmetro..."
                value={paramFormData.description}
                onChange={(e) =>
                  setParamFormData({ ...paramFormData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParamDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleParamSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleParamDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
