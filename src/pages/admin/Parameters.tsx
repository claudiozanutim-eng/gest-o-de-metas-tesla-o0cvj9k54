import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Info, Plus, Pencil, Trash2 } from 'lucide-react'

export default function Parameters() {
  const { toast } = useToast()

  // Tiers
  const [tiers, setTiers] = useState<any[]>([])
  const [tierDialog, setTierDialog] = useState(false)
  const [tierFormData, setTierFormData] = useState({
    id: '',
    name: '',
    order: 0,
    is_active: true,
    color: '#000000',
    min_pct: 0,
    max_pct: 0,
    commission_pct: 0,
    multiplier: 0,
  })

  // Weights
  const [weights, setWeights] = useState({ revenue: 50, mix: 25, coverage: 25 })
  const [weightsId, setWeightsId] = useState('')

  // Adjustments
  const [adjustments, setAdjustments] = useState({ rate: 0, tax: 32, retention: 0, discount: 0 })
  const [adjustmentsId, setAdjustmentsId] = useState('')

  // Legacy Families
  const [families, setFamilies] = useState<any[]>([])
  const [familyDialog, setFamilyDialog] = useState(false)
  const [familyData, setFamilyData] = useState<any>({
    id: '',
    code: '',
    name: '',
    weight: 0,
    composition: '{}',
  })

  // General Params
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

  const [deleteTierDialog, setDeleteTierDialog] = useState(false)
  const [tierToDelete, setTierToDelete] = useState<any>(null)

  const [deleteFamilyDialog, setDeleteFamilyDialog] = useState(false)
  const [familyToDelete, setFamilyToDelete] = useState<any>(null)

  const { user } = useAuth()
  const isAllowedToDelete = user?.role === 'Administrator'

  const loadData = async () => {
    try {
      const [tiersRes, sysRes, famRes] = await Promise.all([
        pb.collection('commission_tiers').getFullList({ sort: 'order' }),
        pb.collection('system_parameters').getFullList(),
        pb.collection('product_families').getFullList(),
      ])

      setTiers(tiersRes)
      setParameters(sysRes)
      setFamilies(famRes)

      const wRec = sysRes.find((r) => r.key === 'commission_weights')
      if (wRec && wRec.value) {
        setWeightsId(wRec.id)
        setWeights(wRec.value)
      }

      const aRec = sysRes.find((r) => r.key === 'financial_adjustments')
      if (aRec && aRec.value) {
        setAdjustmentsId(aRec.id)
        setAdjustments(aRec.value)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTierSave = async () => {
    if (tierFormData.min_pct > tierFormData.max_pct) {
      return toast({
        title: 'Erro',
        description: 'O % Mínimo não pode ser maior que o % Máximo.',
        variant: 'destructive',
      })
    }
    try {
      if (tierFormData.id)
        await pb.collection('commission_tiers').update(tierFormData.id, tierFormData)
      else await pb.collection('commission_tiers').create(tierFormData)
      setTierDialog(false)
      loadData()
      toast({ title: 'Faixa salva com sucesso.' })
    } catch (e: any) {
      toast({ title: 'Erro ao salvar faixa', description: e.message, variant: 'destructive' })
    }
  }

  const saveWeights = async () => {
    const total = Number(weights.revenue) + Number(weights.mix) + Number(weights.coverage)
    if (total !== 100) {
      return toast({
        title: 'Erro de Validação',
        description: `A soma dos pesos é ${total}%. Deve ser exatamente 100%.`,
        variant: 'destructive',
      })
    }
    try {
      const data = {
        key: 'commission_weights',
        value: weights,
        description: 'Pesos dos critérios de comissão',
      }
      if (weightsId) await pb.collection('system_parameters').update(weightsId, data)
      else {
        const res = await pb.collection('system_parameters').create(data)
        setWeightsId(res.id)
      }
      toast({ title: 'Pesos salvos com sucesso.' })
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const saveAdjustments = async () => {
    try {
      const data = {
        key: 'financial_adjustments',
        value: adjustments,
        description: 'Ajustes financeiros (%)',
      }
      if (adjustmentsId) await pb.collection('system_parameters').update(adjustmentsId, data)
      else {
        const res = await pb.collection('system_parameters').create(data)
        setAdjustmentsId(res.id)
      }
      toast({ title: 'Ajustes financeiros salvos.' })
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
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
      setFamilyDialog(false)
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
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleParamDelete = async () => {
    if (!paramToDelete) return
    try {
      await pb.collection('system_parameters').delete(paramToDelete.id)
      setDeleteDialog(false)
      loadData()
      toast({ title: 'Item excluído com sucesso.' })
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  const handleTierDelete = async () => {
    if (!tierToDelete) return
    try {
      await pb.collection('commission_tiers').delete(tierToDelete.id)
      setDeleteTierDialog(false)
      loadData()
      toast({ title: 'Item excluído com sucesso.' })
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  const handleFamilyDelete = async () => {
    if (!familyToDelete) return
    try {
      await pb.collection('product_families').delete(familyToDelete.id)
      setDeleteFamilyDialog(false)
      loadData()
      toast({ title: 'Item excluído com sucesso.' })
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold text-primary">Parâmetros e Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie comissionamento, faixas, impostos e regras do sistema.
        </p>
      </div>

      <Tabs defaultValue="faixas" className="w-full">
        <TabsList className="flex flex-wrap w-full justify-start h-auto mb-6">
          <TabsTrigger value="faixas">Faixas (Tiers)</TabsTrigger>
          <TabsTrigger value="pesos">Pesos da Comissão</TabsTrigger>
          <TabsTrigger value="ajustes">Taxas & Ajustes</TabsTrigger>
          <TabsTrigger value="previa">Prévia da Simulação</TabsTrigger>
          <TabsTrigger value="familias">Famílias</TabsTrigger>
          <TabsTrigger value="gerais">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="faixas">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Faixas de Comissionamento e Nomenclaturas</CardTitle>
                <CardDescription>
                  Crie e edite as faixas de atingimento que geram comissões.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setTierFormData({
                    id: '',
                    name: '',
                    order: tiers.length + 1,
                    is_active: true,
                    color: '#000000',
                    min_pct: 0,
                    max_pct: 0,
                    commission_pct: 0,
                    multiplier: 0,
                  })
                  setTierDialog(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Nova Faixa
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Mínimo %</TableHead>
                    <TableHead>Máximo %</TableHead>
                    <TableHead>Comissão %</TableHead>
                    <TableHead>Multiplicador</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((t) => (
                    <TableRow key={t.id} className={!t.is_active ? 'opacity-50' : ''}>
                      <TableCell>{t.order}</TableCell>
                      <TableCell className="font-semibold" style={{ color: t.color }}>
                        {t.name}
                      </TableCell>
                      <TableCell>{t.min_pct.toFixed(2)}%</TableCell>
                      <TableCell>{t.max_pct.toFixed(2)}%</TableCell>
                      <TableCell>{t.commission_pct.toFixed(2)}%</TableCell>
                      <TableCell>{t.multiplier.toFixed(4)}</TableCell>
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-full border shadow-sm"
                          style={{ backgroundColor: t.color }}
                        />
                      </TableCell>
                      <TableCell>
                        {t.is_active ? (
                          <Badge variant="default">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTierFormData(t)
                              setTierDialog(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setTierToDelete(t)
                              setDeleteTierDialog(true)
                            }}
                            disabled={!isAllowedToDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pesos">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Pesos da Comissão</CardTitle>
              <CardDescription>
                Defina o peso relativo de cada critério para a composição do atingimento final. A
                soma deve ser exatos 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Faturamento (%)
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>Impacto do atingimento financeiro.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    value={weights.revenue}
                    onChange={(e) => setWeights({ ...weights, revenue: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Mix de Produtos (%)
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>Impacto da diversidade de famílias vendidas.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    value={weights.mix}
                    onChange={(e) => setWeights({ ...weights, mix: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Cobertura (%)
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>Impacto da positivação de clientes (CNPJs).</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    value={weights.coverage}
                    onChange={(e) => setWeights({ ...weights, coverage: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <span className="font-semibold">Soma Total:</span>
                <span
                  className={`font-mono text-lg font-bold ${weights.revenue + weights.mix + weights.coverage === 100 ? 'text-green-600' : 'text-red-500'}`}
                >
                  {weights.revenue + weights.mix + weights.coverage}%
                </span>
              </div>
              <Button onClick={saveWeights}>Salvar Pesos</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajustes">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Taxas e Ajustes Financeiros</CardTitle>
              <CardDescription>
                Defina impostos, retenções e taxas que deduzem o faturamento bruto para chegar à
                base de cálculo da comissão líquida.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label>Taxa Administrativa (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={adjustments.rate}
                    onChange={(e) =>
                      setAdjustments({ ...adjustments, rate: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imposto (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={adjustments.tax}
                    onChange={(e) =>
                      setAdjustments({ ...adjustments, tax: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Retenção (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={adjustments.retention}
                    onChange={(e) =>
                      setAdjustments({ ...adjustments, retention: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto Fixo (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={adjustments.discount}
                    onChange={(e) =>
                      setAdjustments({ ...adjustments, discount: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="p-4 bg-amber-50 text-amber-900 rounded-lg text-sm flex gap-2 items-start">
                <Info className="w-5 h-5 flex-shrink-0" />
                <p>
                  O faturamento bruto será deduzido da soma destas taxas (
                  <strong>
                    {(
                      adjustments.rate +
                      adjustments.tax +
                      adjustments.retention +
                      adjustments.discount
                    ).toFixed(2)}
                    %
                  </strong>
                  ) antes da aplicação do multiplicador de comissão.
                </p>
              </div>
              <Button onClick={saveAdjustments}>Salvar Ajustes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="previa">
          <Card>
            <CardHeader>
              <CardTitle>Prévia da Simulação</CardTitle>
              <CardDescription>
                Resumo de como a Simulação de Ganhos vai calcular as comissões no momento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4 text-primary">
                  Composição do Atingimento Global
                </h3>
                <div className="flex gap-4">
                  <Badge variant="outline" className="text-sm px-4 py-1">
                    Faturamento: {weights.revenue}%
                  </Badge>
                  <Badge variant="outline" className="text-sm px-4 py-1">
                    Mix: {weights.mix}%
                  </Badge>
                  <Badge variant="outline" className="text-sm px-4 py-1">
                    Cobertura: {weights.coverage}%
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4 text-primary">
                  Tabela de Comissionamento Aplicada
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faixa (Tier)</TableHead>
                      <TableHead>Intervalo de Atingimento</TableHead>
                      <TableHead>Comissão Aplicada</TableHead>
                      <TableHead>Multiplicador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiers
                      .filter((t) => t.is_active)
                      .map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-bold" style={{ color: t.color }}>
                            {t.name}
                          </TableCell>
                          <TableCell>
                            {t.min_pct}% a {t.max_pct}%
                          </TableCell>
                          <TableCell>{t.commission_pct}%</TableCell>
                          <TableCell className="font-mono">{t.multiplier.toFixed(4)}</TableCell>
                        </TableRow>
                      ))}
                    {tiers.filter((t) => t.is_active).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Nenhuma faixa ativa.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-semibold text-sm">Fórmula Resumida:</p>
                <p className="text-sm text-muted-foreground mt-2 font-mono">
                  1. Atingimento = (Faturamento% * {weights.revenue / 100}) + (Mix% *{' '}
                  {weights.mix / 100}) + (Cob% * {weights.coverage / 100})
                </p>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  2. Faturamento Líquido = Faturamento Bruto * (1 -{' '}
                  {(adjustments.rate +
                    adjustments.tax +
                    adjustments.retention +
                    adjustments.discount) /
                    100}
                  )
                </p>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  3. Comissão = Faturamento Líquido * Multiplicador(Atingimento)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="familias">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Famílias de Produtos</CardTitle>
                <CardDescription>Configuração de pesos e mix (JSON).</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setFamilyData({ id: '', code: '', name: '', weight: 0, composition: '{}' })
                  setFamilyDialog(true)
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                              setFamilyDialog(true)
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setFamilyToDelete(f)
                              setDeleteFamilyDialog(true)
                            }}
                            disabled={!isAllowedToDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gerais">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Parâmetros do Sistema (Avançado)</CardTitle>
                <CardDescription>
                  Gerencie todos os parâmetros crus (JSON) armazenados no banco de dados.
                </CardDescription>
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
                  {parameters.map((p) => (
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
                            size="icon"
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
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setParamToDelete(p)
                              setDeleteDialog(true)
                            }}
                            disabled={!isAllowedToDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tier Dialog */}
      <Dialog open={tierDialog} onOpenChange={setTierDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {tierFormData.id ? 'Editar Faixa' : 'Nova Faixa de Comissionamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome da Faixa</Label>
              <Input
                value={tierFormData.name}
                onChange={(e) => setTierFormData({ ...tierFormData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Ordem de Exibição</Label>
              <Input
                type="number"
                value={tierFormData.order}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, order: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Mínimo de Atingimento (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={tierFormData.min_pct}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, min_pct: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Máximo de Atingimento (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={tierFormData.max_pct}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, max_pct: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Porcentagem de Comissão (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={tierFormData.commission_pct}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, commission_pct: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Multiplicador (Decimal)</Label>
              <Input
                type="number"
                step="0.0001"
                value={tierFormData.multiplier}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, multiplier: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Cor de Identificação</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-16 h-10 p-1"
                  value={tierFormData.color}
                  onChange={(e) => setTierFormData({ ...tierFormData, color: e.target.value })}
                />
                <Input
                  value={tierFormData.color}
                  onChange={(e) => setTierFormData({ ...tierFormData, color: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2 justify-start items-center">
              <Label>Status</Label>
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={tierFormData.is_active}
                  onCheckedChange={(v) => setTierFormData({ ...tierFormData, is_active: v })}
                />
                <span className="text-sm">{tierFormData.is_active ? 'Ativa' : 'Inativa'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTierSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Families Dialog */}
      <Dialog open={familyDialog} onOpenChange={setFamilyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{familyData.id ? 'Editar' : 'Nova'} Família</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Código</Label>
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
            <Button variant="outline" onClick={() => setFamilyDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFamilySave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Param Dialog */}
      <Dialog open={paramDialog} onOpenChange={setParamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{paramFormData.id ? 'Editar' : 'Adicionar Parâmetro'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Chave</Label>
              <Input
                value={paramFormData.key}
                onChange={(e) => setParamFormData({ ...paramFormData, key: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor (JSON)</Label>
              <Input
                value={paramFormData.value}
                onChange={(e) => setParamFormData({ ...paramFormData, value: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input
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

      {/* Delete Dialogs */}
      <AlertDialog open={deleteTierDialog} onOpenChange={setDeleteTierDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este item?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTierDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteFamilyDialog} onOpenChange={setDeleteFamilyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este item?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFamilyDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este item?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
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
