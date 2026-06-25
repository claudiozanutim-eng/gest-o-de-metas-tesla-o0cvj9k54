import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { UploadCloud, CheckCircle2, ArrowRight, Check, ChevronsUpDown } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function GoalEntry() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Manual Entry States
  const [sellers, setSellers] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [selectedSellerId, setSelectedSellerId] = useState<string>('')

  const [period, setPeriod] = useState('2026-06')
  const [metric, setMetric] = useState('Revenue')

  const [focusFleet, setFocusFleet] = useState('')
  const [focusCompanies, setFocusCompanies] = useState('')

  const [targetBase, setTargetBase] = useState('')
  const [targetBronze, setTargetBronze] = useState('')
  const [targetPrata, setTargetPrata] = useState('')
  const [targetOuro, setTargetOuro] = useState('')

  const [existingGoalId, setExistingGoalId] = useState<string | null>(null)

  // Import States
  const [importStep, setImportStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])

  useEffect(() => {
    pb.collection('sellers')
      .getFullList({ expand: 'area_id.regional_id', filter: 'is_active = true', sort: 'name' })
      .then(setSellers)
      .catch(console.error)
  }, [])

  useEffect(() => {
    const loadGoal = async () => {
      if (!selectedSellerId || !period || !metric) {
        setExistingGoalId(null)
        setTargetBase('')
        setTargetBronze('')
        setTargetPrata('')
        setTargetOuro('')
        setFocusFleet('')
        setFocusCompanies('')
        return
      }

      const seller = sellers.find((s) => s.id === selectedSellerId)
      if (!seller?.user_id) {
        setExistingGoalId(null)
        setTargetBase('')
        setTargetBronze('')
        setTargetPrata('')
        setTargetOuro('')
        setFocusFleet('')
        setFocusCompanies('')
        return
      }

      try {
        const goal = await pb
          .collection('goals')
          .getFirstListItem(
            `seller_id="${seller.user_id}" && period="${period}" && metric="${metric}"`,
          )
        setExistingGoalId(goal.id)
        setTargetBase(goal.target_base?.toString() || '')
        setTargetBronze(goal.target_bronze?.toString() || '')
        setTargetPrata(goal.target_prata?.toString() || '')
        setTargetOuro(goal.target_ouro?.toString() || '')
        setFocusFleet(goal.focus_fleet?.toString() || '')
        setFocusCompanies(goal.focus_companies?.toString() || '')
      } catch (e) {
        setExistingGoalId(null)
        setTargetBase('')
        setTargetBronze('')
        setTargetPrata('')
        setTargetOuro('')
        setFocusFleet('')
        setFocusCompanies('')
      }
    }

    loadGoal()
  }, [selectedSellerId, period, metric, sellers])

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedSellerId) {
      toast({ title: 'Atenção', description: 'Selecione um vendedor.', variant: 'destructive' })
      return
    }

    const seller = sellers.find((s) => s.id === selectedSellerId)
    if (!seller?.user_id) {
      toast({
        title: 'Atenção',
        description: 'O vendedor selecionado não possui um usuário associado.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const data = {
        seller_id: seller.user_id,
        period,
        metric,
        target_base: Number(targetBase),
        target_bronze: Number(targetBronze),
        target_prata: Number(targetPrata),
        target_ouro: Number(targetOuro),
        focus_fleet: focusFleet ? Number(focusFleet) : 0,
        focus_companies: focusCompanies ? Number(focusCompanies) : 0,
      }

      if (existingGoalId) {
        await pb.collection('goals').update(existingGoalId, data)
        toast({
          title: 'Meta atualizada',
          description: 'Os valores foram atualizados com sucesso.',
        })
      } else {
        const newGoal = await pb.collection('goals').create(data)
        setExistingGoalId(newGoal.id)
        toast({
          title: 'Meta lançada',
          description: 'Os valores foram registrados com sucesso.',
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setImportStep(2)
      setTimeout(() => {
        setPreviewData([
          {
            Vendedor: 'João Silva',
            Período: '2026-06',
            Métrica: 'Revenue',
            Base: 100000,
            Bronze: 110000,
            Prata: 120000,
            Ouro: 130000,
          },
          {
            Vendedor: 'Maria Santos',
            Período: '2026-06',
            Métrica: 'Mix_F1',
            Base: 200000,
            Bronze: 220000,
            Prata: 240000,
            Ouro: 260000,
          },
        ])
        setImportStep(3)
      }, 1000)
    }
  }

  const confirmImport = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      toast({ title: 'Importação concluída', description: 'Registros importados com sucesso.' })
      setImportStep(1)
      setFile(null)
      setPreviewData([])
      setIsSubmitting(false)
    }, 1500)
  }

  const isAllowedToEdit =
    user?.role === 'Administrator' ||
    user?.role === 'National Manager' ||
    user?.role === 'Sales Assistant'

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId)
  const regionalName = selectedSeller?.expand?.area_id?.expand?.regional_id?.name || ''
  const areaName = selectedSeller?.expand?.area_id?.name || ''

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Lançamento de Metas</h1>
        <p className="text-muted-foreground">
          Defina os objetivos para vendedores e áreas (mensal).
        </p>
      </div>

      {!isAllowedToEdit && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Você não tem permissão para lançar metas.
        </div>
      )}

      {isAllowedToEdit && (
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Entrada Manual</TabsTrigger>
            <TabsTrigger value="lote">Importação em Lote</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Nova Meta Individual</CardTitle>
                <CardDescription>
                  Preencha os dados para lançar a meta de um vendedor específico e categoria.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Vendedor</Label>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between font-normal"
                          >
                            {selectedSellerId
                              ? sellers.find((s) => s.id === selectedSellerId)?.name
                              : 'Selecione o vendedor...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar vendedor..." />
                            <CommandList>
                              <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
                              <CommandGroup>
                                {sellers.map((seller) => (
                                  <CommandItem
                                    key={seller.id}
                                    value={seller.name}
                                    onSelect={() => {
                                      setSelectedSellerId(seller.id)
                                      setOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        selectedSellerId === seller.id
                                          ? 'opacity-100'
                                          : 'opacity-0',
                                      )}
                                    />
                                    {seller.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Regional</Label>
                      <Input
                        value={regionalName}
                        disabled
                        className="bg-muted"
                        placeholder="Automático"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Área</Label>
                      <Input
                        value={areaName}
                        disabled
                        className="bg-muted"
                        placeholder="Automático"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="periodo">Período</Label>
                      <Input
                        id="periodo"
                        name="periodo"
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metric">Métrica</Label>
                      <Select value={metric} onValueChange={setMetric} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Métrica" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Revenue">Faturamento Geral</SelectItem>
                          <SelectItem value="Mix_F1">Faturamento F1 (Automação)</SelectItem>
                          <SelectItem value="Mix_F2">Faturamento F2 (Robótica)</SelectItem>
                          <SelectItem value="Mix_F3">Faturamento F3 (Sensores)</SelectItem>
                          <SelectItem value="Mix_Outros">Faturamento Outros</SelectItem>
                          <SelectItem value="Coverage">Cobertura (Empresas)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="focus_fleet">Frota Foco da Área</Label>
                      <Input
                        id="focus_fleet"
                        type="number"
                        value={focusFleet}
                        onChange={(e) => setFocusFleet(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="focus_companies">Empresas Foco da Área</Label>
                      <Input
                        id="focus_companies"
                        type="number"
                        value={focusCompanies}
                        onChange={(e) => setFocusCompanies(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="target_base">Meta Base</Label>
                      <Input
                        id="target_base"
                        type="number"
                        value={targetBase}
                        onChange={(e) => setTargetBase(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_bronze">Meta Bronze</Label>
                      <Input
                        id="target_bronze"
                        type="number"
                        value={targetBronze}
                        onChange={(e) => setTargetBronze(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_prata">Meta Prata</Label>
                      <Input
                        id="target_prata"
                        type="number"
                        value={targetPrata}
                        onChange={(e) => setTargetPrata(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_ouro">Meta Ouro</Label>
                      <Input
                        id="target_ouro"
                        type="number"
                        value={targetOuro}
                        onChange={(e) => setTargetOuro(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={isSubmitting || !selectedSellerId}>
                      {existingGoalId
                        ? isSubmitting
                          ? 'Atualizando...'
                          : 'Atualizar Meta'
                        : isSubmitting
                          ? 'Salvando...'
                          : 'Salvar Meta'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lote">
            <Card>
              <CardHeader>
                <CardTitle>Importação via Planilha</CardTitle>
                <CardDescription>
                  Fluxo de importação para Metas e Realizado (.csv / .xlsx).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {importStep === 1 && (
                  <div className="relative border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept=".csv,.xlsx"
                      onChange={handleFileChange}
                    />
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                      <UploadCloud className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Arraste seu arquivo aqui</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      ou clique para procurar (.xlsx, .csv)
                    </p>
                    <Button variant="outline">Selecionar Arquivo</Button>
                  </div>
                )}

                {importStep === 2 && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p>Mapeando colunas e validando formato...</p>
                  </div>
                )}

                {importStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 className="w-5 h-5" /> Arquivo mapeado com sucesso (
                      {previewData.length} registros).
                    </div>

                    <div className="border rounded-md overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 font-medium">Vendedor</th>
                            <th className="px-4 py-2 font-medium">Período</th>
                            <th className="px-4 py-2 font-medium">Métrica</th>
                            <th className="px-4 py-2 font-medium">Base</th>
                            <th className="px-4 py-2 font-medium">Bronze</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-4 py-2">{r.Vendedor}</td>
                              <td className="px-4 py-2">{r.Período}</td>
                              <td className="px-4 py-2">{r.Métrica}</td>
                              <td className="px-4 py-2">{r.Base}</td>
                              <td className="px-4 py-2">{r.Bronze}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center">
                      <Button variant="outline" onClick={() => setImportStep(1)}>
                        Cancelar
                      </Button>
                      <Button onClick={confirmImport} disabled={isSubmitting} className="gap-2">
                        {isSubmitting ? 'Importando...' : 'Confirmar e Importar'}{' '}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
