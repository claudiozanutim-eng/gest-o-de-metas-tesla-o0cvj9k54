import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FolderTree } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import logoUrl from '@/assets/image-247cf.png'
import {
  HierarchyTree,
  HierarchyInfoPanel,
  type SelectedItem,
  type NodeType,
} from '@/components/admin/hierarchy-tree'
import { HierarchyInfoPanel as InfoPanel } from '@/components/admin/hierarchy-info-panel'

const TYPE_LABELS: Record<NodeType, string> = {
  district: 'Distrito',
  regional: 'Regional',
  area: 'Área',
}

export default function Structure() {
  const [districts, setDistricts] = useState<any[]>([])
  const [regionals, setRegionals] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [loadingStruct, setLoadingStruct] = useState(false)
  const [isAddAreaOpen, setIsAddAreaOpen] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaRegionalId, setNewAreaRegionalId] = useState('')
  const [creatingArea, setCreatingArea] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    type: NodeType
    name: string
  } | null>(null)
  const { toast } = useToast()
  const loadTimer = useRef<ReturnType<typeof setTimeout>>()

  const loadData = async () => {
    try {
      const [d, r, a, s] = await Promise.all([
        pb.collection('districts').getFullList(),
        pb.collection('regionals').getFullList(),
        pb.collection('areas').getFullList(),
        pb.collection('sellers').getFullList(),
      ])
      setDistricts(d)
      setRegionals(r)
      setAreas(a)
      setSellers(s)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const debouncedLoad = () => {
    clearTimeout(loadTimer.current)
    loadTimer.current = setTimeout(() => loadData(), 300)
  }
  useRealtime('districts', debouncedLoad)
  useRealtime('regionals', debouncedLoad)
  useRealtime('areas', debouncedLoad)

  const handleSaveRename = async (
    id: string,
    type: NodeType,
    newName: string,
  ): Promise<boolean> => {
    const collection =
      type === 'district' ? 'districts' : type === 'regional' ? 'regionals' : 'areas'
    const list = type === 'district' ? districts : type === 'regional' ? regionals : areas
    const parentField = type === 'regional' ? 'district_id' : type === 'area' ? 'regional_id' : null
    const parentId = parentField ? list.find((x) => x.id === id)?.[parentField] : null

    const isDuplicate = list.some((x) => {
      if (x.id === id) return false
      if (x.name.toLowerCase() !== newName.toLowerCase()) return false
      if (parentField && parentId) return x[parentField] === parentId
      return true
    })

    if (isDuplicate) {
      toast({
        title: 'Erro',
        description: 'Já existe um item com este nome neste nível.',
        variant: 'destructive',
      })
      return false
    }

    try {
      await pb.collection(collection).update(id, { name: newName })
      toast({ title: `${TYPE_LABELS[type]} ${newName} atualizada com sucesso` })
      await loadData()
      if (selected?.id === id) setSelected({ ...selected, name: newName })
      return true
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' })
      return false
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { id, type, name } = deleteTarget
    try {
      if (type === 'district') {
        const regs = regionals.filter((r) => r.district_id === id)
        for (const r of regs) {
          const hasAreas = areas.some((a) => a.regional_id === r.id)
          if (hasAreas) throw new Error('has_dependencies')
        }
        for (const r of regs) await pb.collection('regionals').delete(r.id)
        await pb.collection('districts').delete(id)
      } else if (type === 'regional') {
        const hasAreas = areas.some((a) => a.regional_id === id)
        if (hasAreas) throw new Error('has_dependencies')
        await pb.collection('regionals').delete(id)
      } else {
        const hasSellers = sellers.some((s) => s.area_id === id)
        if (hasSellers) throw new Error('has_dependencies')
        await pb.collection('areas').delete(id)
      }
      toast({ title: `${name} excluído com sucesso.` })
      if (selected?.id === id) setSelected(null)
      setDeleteTarget(null)
      await loadData()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Verifique se há dados vinculados.',
        variant: 'destructive',
      })
      setDeleteTarget(null)
    }
  }

  const handleAddArea = async () => {
    if (!newAreaName.trim() || !newAreaRegionalId) {
      toast({
        title: 'Atenção',
        description: 'Preencha o nome e selecione a regional.',
        variant: 'destructive',
      })
      return
    }
    const isDuplicate = areas.some(
      (a) =>
        a.regional_id === newAreaRegionalId &&
        a.name.toLowerCase() === newAreaName.trim().toLowerCase(),
    )
    if (isDuplicate) {
      toast({
        title: 'Erro',
        description: 'Já existe uma área com este nome nesta regional.',
        variant: 'destructive',
      })
      return
    }
    setCreatingArea(true)
    try {
      const regional = regionals.find((r) => r.id === newAreaRegionalId)
      await pb.collection('areas').create({
        name: newAreaName.trim(),
        regional_id: newAreaRegionalId,
        district_id: regional?.district_id || '',
        is_active: true,
      })
      toast({ title: 'Sucesso', description: 'Área criada com sucesso.' })
      setIsAddAreaOpen(false)
      setNewAreaName('')
      setNewAreaRegionalId('')
      await loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao criar área', description: e.message, variant: 'destructive' })
    } finally {
      setCreatingArea(false)
    }
  }

  const handleLoadStructure = async () => {
    setLoadingStruct(true)
    try {
      const res = await pb.send('/backend/v1/load-structure', { method: 'POST' })
      toast({
        title: 'Estrutura Carregada',
        description: `Regionais: ${res.regionals_created + res.regionals_updated}. Áreas vinculadas: ${res.areas_linked}.`,
      })
      await loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' })
    } finally {
      setLoadingStruct(false)
    }
  }

  const selRegionalCount =
    selected?.type === 'district'
      ? regionals.filter((r) => r.district_id === selected.id).length
      : 0
  const selAreaCount =
    selected?.type === 'regional' ? areas.filter((a) => a.regional_id === selected.id).length : 0
  const selVendorCount =
    selected?.type === 'area' ? sellers.filter((s) => s.area_id === selected.id).length : 0
  const selParentName =
    selected?.type === 'regional'
      ? districts.find((d) => d.id === regionals.find((r) => r.id === selected.id)?.district_id)
          ?.name
      : selected?.type === 'area'
        ? regionals.find((r) => r.id === areas.find((a) => a.id === selected.id)?.regional_id)?.name
        : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Estrutura Hierárquica</h1>
          <p className="text-muted-foreground">Gerencie Distritos, Regionais e Áreas.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden bg-transparent">
            <img
              src={logoUrl}
              alt="Tesla Mecatrônica"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="secondary" onClick={handleLoadStructure} disabled={loadingStruct}>
              {loadingStruct && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Carregar Estrutura Padrão
            </Button>
            <Button variant="outline" onClick={() => setIsAddAreaOpen(true)}>
              Adicionar Nível
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5" /> Árvore da Organização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HierarchyTree
              districts={districts}
              regionals={regionals}
              areas={areas}
              vendedores={sellers}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onSaveRename={handleSaveRename}
              onDeleteRequest={(id, type, name) => setDeleteTarget({ id, type, name })}
            />
          </CardContent>
        </Card>

        <InfoPanel
          selected={selected}
          regionalCount={selRegionalCount}
          areaCount={selAreaCount}
          vendorCount={selVendorCount}
          parentName={selParentName}
          onSave={handleSaveRename}
        />
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tem certeza que deseja excluir {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddAreaOpen} onOpenChange={setIsAddAreaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Área</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="area-name">Nome da Área</Label>
              <Input
                id="area-name"
                placeholder="Ex: Área Norte 1"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regional-select">Regional Pai</Label>
              <Select value={newAreaRegionalId} onValueChange={setNewAreaRegionalId}>
                <SelectTrigger id="regional-select">
                  <SelectValue placeholder="Selecione uma regional" />
                </SelectTrigger>
                <SelectContent>
                  {regionals.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAreaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddArea} disabled={creatingArea}>
              {creatingArea && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
