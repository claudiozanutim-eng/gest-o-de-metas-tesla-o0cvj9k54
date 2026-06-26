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
import { UploadCloud, CheckCircle2, ArrowRight, Check, ChevronsUpDown, Trash2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
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
import Importacao from '../admin/Importacao'

export default function GoalEntry() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Manual Entry States
  const [sellers, setSellers] = useState<any[]>([])
  const [regionals, setRegionals] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [openRegional, setOpenRegional] = useState(false)
  const [openArea, setOpenArea] = useState(false)
  const [selectedSellerId, setSelectedSellerId] = useState<string>('')
  const [selectedRegionalId, setSelectedRegionalId] = useState<string>('')
  const [selectedAreaId, setSelectedAreaId] = useState<string>('')

  const [period, setPeriod] = useState('2026-06')
  const [metric, setMetric] = useState('Faturamento Geral')

  const [focusFleet, setFocusFleet] = useState('')
  const [focusCompanies, setFocusCompanies] = useState('')
  const [mixFamily, setMixFamily] = useState('')

  const [targetBase, setTargetBase] = useState('')
  const [targetBronze, setTargetBronze] = useState('')
  const [targetPrata, setTargetPrata] = useState('')
  const [targetOuro, setTargetOuro] = useState('')

  const maskInteger = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return ''
    let digits = String(value).replace(/\D/g, '')
    if (!digits) return ''
    if (digits.length > 15) digits = digits.slice(0, 15)
    const num = parseInt(digits, 10).toString()
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const unmaskInteger = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return 0
    let digits = String(value).replace(/\D/g, '')
    if (!digits) return 0
    if (digits.length > 15) digits = digits.slice(0, 15)
    return parseInt(digits, 10)
  }

  const maskCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return ''
    let digits = String(value).replace(/\D/g, '')
    if (!digits) return ''
    if (digits.length > 15) digits = digits.slice(0, 15)
    try {
      const num = (parseInt(digits, 10) / 100).toFixed(2)
      const parts = num.split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      return `R$ ${parts.join(',')}`
    } catch {
      return ''
    }
  }

  const unmaskCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return 0
    let digits = String(value).replace(/\D/g, '')
    if (!digits) return 0
    if (digits.length > 15) digits = digits.slice(0, 15)
    return parseInt(digits, 10) / 100
  }

  const normalizeRegional = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^regional\s+/, '')
  }

  const normalizeArea = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^(área|area)\s+/, '')
  }

  const [existingGoalId, setExistingGoalId] = useState<string | null>(null)

  const [deleteDialog, setDeleteDialog] = useState(false)

  // Import States
  const [importStep, setImportStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      pb
        .collection('sellers')
        .getFullList({ expand: 'area_id.regional_id', filter: 'is_active = true', sort: 'name' }),
      pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
    ])
      .then(([sellersData, regionalsData, areasData]) => {
        setSellers(sellersData)
        setRegionals(regionalsData)
        setAreas(areasData)
      })
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
      const defaultAreaId = seller?.area_id || ''
      const defaultRegionalId = seller?.expand?.area_id?.regional_id || ''

      if (!seller?.user_id) {
        setExistingGoalId(null)
        setTargetBase('')
        setTargetBronze('')
        setTargetPrata('')
        setTargetOuro('')
        setFocusFleet('')
        setFocusCompanies('')
        setMixFamily('')
        setSelectedRegionalId(defaultRegionalId)
        setSelectedAreaId(defaultAreaId)
        return
      }

      try {
        const goal = await pb
          .collection('goals')
          .getFirstListItem(
            `seller_id="${seller.user_id}" && period="${period}" && metric="${metric}"`,
          )
        setExistingGoalId(goal.id)
        setTargetBase(
          goal.target_base != null ? maskCurrency((goal.target_base * 100).toFixed(0)) : '',
        )
        setTargetBronze(
          goal.target_bronze != null ? maskCurrency((goal.target_bronze * 100).toFixed(0)) : '',
        )
        setTargetPrata(
          goal.target_prata != null ? maskCurrency((goal.target_prata * 100).toFixed(0)) : '',
        )
        setTargetOuro(
          goal.target_ouro != null ? maskCurrency((goal.target_ouro * 100).toFixed(0)) : '',
        )
        setFocusFleet(goal.focus_fleet != null ? maskInteger(goal.focus_fleet) : '')
        setFocusCompanies(goal.focus_companies != null ? maskInteger(goal.focus_companies) : '')
        setMixFamily(goal.mix_family || '')
        setSelectedRegionalId(goal.regional_id || defaultRegionalId)
        setSelectedAreaId(goal.area_id || defaultAreaId)
      } catch (e) {
        setExistingGoalId(null)
        setTargetBase('')
        setTargetBronze('')
        setTargetPrata('')
        setTargetOuro('')
        setFocusFleet('')
        setFocusCompanies('')
        setMixFamily('')
        setSelectedRegionalId(defaultRegionalId)
        setSelectedAreaId(defaultAreaId)
      }
    }

    loadGoal()
  }, [selectedSellerId, period, metric, sellers])

  const handleDeleteGoal = async () => {
    if (!existingGoalId) return
    setIsSubmitting(true)
    try {
      await pb.collection('goals').delete(existingGoalId)
      toast({ title: 'Meta excluída com sucesso.' })
      setDeleteDialog(false)
      setExistingGoalId(null)
      setTargetBase('')
      setTargetBronze('')
      setTargetPrata('')
      setTargetOuro('')
      setFocusFleet('')
      setFocusCompanies('')
      setMixFamily('')
    } catch (e: any) {
      toast({ title: 'Erro ao excluir meta', description: e.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedSellerId) {
      toast({ title: 'Atenção', description: 'Selecione um vendedor.', variant: 'destructive' })
      return
    }

    const seller = sellers.find((s) => s.id === selectedSellerId)
    if (!seller) return

    setIsSubmitting(true)

    let finalUserId = seller.user_id
    if (!finalUserId) {
      try {
        const email = `${seller.code || seller.id}@tesla.com.br`.toLowerCase().replace(/\s/g, '')
        const newUser = await pb.collection('users').create({
          email,
          password: 'Password123!',
          passwordConfirm: 'Password123!',
          name: seller.name,
          role: 'Vendedor',
          area_id: seller.area_id || null,
          is_active: true,
        })
        finalUserId = newUser.id
        await pb.collection('sellers').update(seller.id, { user_id: finalUserId })
        setSellers(sellers.map((s) => (s.id === seller.id ? { ...s, user_id: finalUserId } : s)))
      } catch (err: any) {
        console.error('Failed to create user for seller', err)
        toast({
          title: 'Erro',
          description: 'Não foi possível criar o usuário para este vendedor.',
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }
    }

    try {
      const data = {
        seller_id: finalUserId,
        regional_id: selectedRegionalId || null,
        area_id: selectedAreaId || null,
        period,
        metric,
        target_base: unmaskCurrency(targetBase),
        target_bronze: unmaskCurrency(targetBronze),
        target_prata: unmaskCurrency(targetPrata),
        target_ouro: unmaskCurrency(targetOuro),
        focus_fleet: focusFleet ? unmaskInteger(focusFleet) : 0,
        focus_companies: focusCompanies ? unmaskInteger(focusCompanies) : 0,
        mix_family: mixFamily,
      }

      if (existingGoalId) {
        await pb.collection('goals').update(existingGoalId, data)
        toast({
          title: 'Sucesso',
          description: 'Meta salva com sucesso!',
        })
      } else {
        const newGoal = await pb.collection('goals').create(data)
        setExistingGoalId(newGoal.id)
        toast({
          title: 'Sucesso',
          description: 'Meta salva com sucesso!',
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Ocorreu um erro',
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
            Métrica: 'Faturamento Geral',
            Base: 100000,
            Bronze: 110000,
            Prata: 120000,
            Ouro: 130000,
          },
          {
            Vendedor: 'Maria Santos',
            Período: '2026-06',
            Métrica: 'Faturamento F1',
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

  const isAllowedToEdit = true

  const isAllowedToDelete =
    user?.role === 'Administrador' ||
    user?.role === 'Gestor da Empresa' ||
    user?.role === 'Gerente Nacional de Vendas'

  const getRegionalColor = (name: string) => {
    if (!name) return 'bg-muted'
    const lower = name.toLowerCase()
    if (lower.includes('r1')) return 'bg-green-600 !text-white !opacity-100 font-medium' // Verde
    if (lower.includes('r2')) return 'bg-purple-600 !text-white !opacity-100 font-medium' // Roxa
    if (lower.includes('r3')) return 'bg-orange-500 !text-white !opacity-100 font-medium' // Laranja
    if (lower.includes('r4')) return 'bg-yellow-400 !text-black !opacity-100 font-medium' // Amarela
    if (lower.includes('r5')) return 'bg-sky-300 !text-black !opacity-100 font-medium' // Azul Claro
    if (lower.includes('r6')) return 'bg-red-600 !text-white !opacity-100 font-medium' // Vermelho
    if (lower.includes('r7')) return 'bg-amber-600 !text-white !opacity-100 font-medium' // Marrom Claro
    if (lower.includes('r8')) return 'bg-gray-500 !text-white !opacity-100 font-medium' // Cinza
    if (lower.includes('r0')) return 'bg-purple-300 !text-black !opacity-100 font-medium' // Lilás
    return 'bg-muted'
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Lançamento de Metas</h1>
        <p className="text-muted-foreground">
          Defina os objetivos para vendedores e áreas (mensal).
        </p>
      </div>

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
                                      selectedSellerId === seller.id ? 'opacity-100' : 'opacity-0',
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
                    {selectedSellerId &&
                      !sellers.find((s) => s.id === selectedSellerId)?.user_id && (
                        <p className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Vendedor sem acesso ao sistema. O usuário será criado ao salvar.
                        </p>
                      )}
                  </div>

                  <div className="space-y-2">
                    <Label>Regional</Label>
                    <Popover open={openRegional} onOpenChange={setOpenRegional}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openRegional}
                          className={cn(
                            'w-full justify-between font-normal',
                            getRegionalColor(
                              regionals.find((r) => r.id === selectedRegionalId)?.name || '',
                            ),
                          )}
                        >
                          {selectedRegionalId
                            ? regionals.find((r) => r.id === selectedRegionalId)?.name
                            : 'Selecione a regional...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar regional..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma regional encontrada.</CommandEmpty>
                            <CommandGroup>
                              {regionals.map((reg) => (
                                <CommandItem
                                  key={reg.id}
                                  value={reg.name}
                                  keywords={[normalizeRegional(reg.name)]}
                                  onSelect={() => {
                                    setSelectedRegionalId(reg.id)
                                    if (selectedAreaId) {
                                      const currentArea = areas.find((a) => a.id === selectedAreaId)
                                      if (currentArea && currentArea.regional_id !== reg.id) {
                                        setSelectedAreaId('')
                                      }
                                    }
                                    setOpenRegional(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedRegionalId === reg.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {reg.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Área</Label>
                    <Popover open={openArea} onOpenChange={setOpenArea}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openArea}
                          className="w-full justify-between font-normal"
                        >
                          {selectedAreaId
                            ? areas.find((a) => a.id === selectedAreaId)?.name
                            : 'Selecione a área...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar área..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma área encontrada.</CommandEmpty>
                            <CommandGroup>
                              {areas
                                .filter(
                                  (a) =>
                                    !selectedRegionalId || a.regional_id === selectedRegionalId,
                                )
                                .map((area) => (
                                  <CommandItem
                                    key={area.id}
                                    value={area.name}
                                    keywords={[normalizeArea(area.name)]}
                                    onSelect={() => {
                                      setSelectedAreaId(area.id)
                                      if (!selectedRegionalId && area.regional_id) {
                                        setSelectedRegionalId(area.regional_id)
                                      }
                                      setOpenArea(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        selectedAreaId === area.id ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                    {area.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                        <SelectItem value="Faturamento Geral">Faturamento Geral</SelectItem>
                        <SelectItem value="Faturamento F1">Faturamento F1</SelectItem>
                        <SelectItem value="Faturamento F2">Faturamento F2</SelectItem>
                        <SelectItem value="Faturamento F3">Faturamento F3</SelectItem>
                        <SelectItem value="Faturamento Outros">Faturamento Outros</SelectItem>
                        <SelectItem value="Cobertura">Cobertura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="mix_family">Família Mix</Label>
                    <Input
                      id="mix_family"
                      value={mixFamily}
                      onChange={(e) => setMixFamily(e.target.value)}
                      placeholder="Ex: F1, F2..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="focus_fleet">Frota Foco da Área</Label>
                    <Input
                      id="focus_fleet"
                      type="tel"
                      value={focusFleet}
                      onChange={(e) => setFocusFleet(maskInteger(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="focus_companies">Empresas Foco da Área</Label>
                    <Input
                      id="focus_companies"
                      type="tel"
                      value={focusCompanies}
                      onChange={(e) => setFocusCompanies(maskInteger(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="target_base">Meta Base</Label>
                    <Input
                      id="target_base"
                      type="tel"
                      value={targetBase}
                      onChange={(e) => setTargetBase(maskCurrency(e.target.value))}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_bronze">Meta Bronze</Label>
                    <Input
                      id="target_bronze"
                      type="tel"
                      value={targetBronze}
                      onChange={(e) => setTargetBronze(maskCurrency(e.target.value))}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_prata">Meta Prata</Label>
                    <Input
                      id="target_prata"
                      type="tel"
                      value={targetPrata}
                      onChange={(e) => setTargetPrata(maskCurrency(e.target.value))}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_ouro">Meta Ouro</Label>
                    <Input
                      id="target_ouro"
                      type="tel"
                      value={targetOuro}
                      onChange={(e) => setTargetOuro(maskCurrency(e.target.value))}
                      placeholder="R$ 0,00"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  {existingGoalId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteDialog(true)}
                      disabled={isSubmitting || !isAllowedToDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Meta
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting || !selectedSellerId}>
                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>

              <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza que deseja excluir esta meta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação não poderá ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteGoal}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Confirmar Exclusão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lote" className="mt-6">
          {user?.role === 'Administrador' ? (
            <div className="bg-card rounded-xl p-6 shadow-sm border">
              <Importacao />
            </div>
          ) : (
            <div className="bg-card text-card-foreground border rounded-xl p-12 shadow-sm text-center">
              <UploadCloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                A importação em lote está disponível apenas para Administradores do sistema. Por
                favor, solicite a um administrador para realizar a importação ou utilize a entrada
                manual.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
