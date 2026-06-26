import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Map, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
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

export default function Districts() {
  const [districts, setDistricts] = useState<any[]>([])
  const [regionals, setRegionals] = useState<any[]>([])
  const [selectedRegionals, setSelectedRegionals] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '', is_active: true })
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [districtToDelete, setDistrictToDelete] = useState<any>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const isAllowedToDelete = [
    'Administrador',
    'Gestor da Empresa',
    'Gerente Nacional de Vendas',
  ].includes(user?.role || '')

  const loadData = async () => {
    const dists = await pb.collection('districts').getFullList()
    setDistricts(dists)
    const regs = await pb.collection('regionals').getFullList()
    setRegionals(regs)
  }

  useEffect(() => {
    loadData()
  }, [])

  const openEdit = (d: any) => {
    setFormData({ id: d.id, name: d.name, is_active: d.is_active })
    setSelectedRegionals(regionals.filter((r) => r.district_id === d.id).map((r) => r.id))
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!districtToDelete) return
    try {
      const regionals = await pb
        .collection('regionals')
        .getList(1, 1, { filter: `district_id="${districtToDelete.id}"` })
      if (regionals.items.length > 0) {
        toast({
          title: 'Erro ao excluir distrito',
          description:
            'Não é possível excluir este distrito pois ele possui vínculos ativos (Regionais).',
          variant: 'destructive',
        })
        setDeleteDialog(false)
        return
      }
      await pb.collection('districts').delete(districtToDelete.id)
      toast({ title: 'Distrito excluído com sucesso.' })
      setDeleteDialog(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir distrito', description: e.message, variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    try {
      let districtId = formData.id
      if (districtId) {
        await pb.collection('districts').update(districtId, formData)
      } else {
        const created = await pb.collection('districts').create(formData)
        districtId = created.id
      }

      const currentlyAssociated = regionals
        .filter((r) => r.district_id === districtId)
        .map((r) => r.id)
      const toAdd = selectedRegionals.filter((id) => !currentlyAssociated.includes(id))
      const toRemove = currentlyAssociated.filter((id) => !selectedRegionals.includes(id))

      for (const rId of toAdd) {
        await pb.collection('regionals').update(rId, { district_id: districtId })
      }
      for (const rId of toRemove) {
        await pb.collection('regionals').update(rId, { district_id: '' })
      }

      toast({ title: 'Salvo com sucesso' })
      setIsOpen(false)
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Map className="w-8 h-8" /> Gestão de Distritos
          </h1>
        </div>
        <Button
          onClick={() => {
            setFormData({ id: '', name: '', is_active: true })
            setSelectedRegionals([])
            setIsOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Distrito
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Regionais Associadas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {districts.map((d) => {
                const districtRegionals = regionals.filter((r) => r.district_id === d.id)
                return (
                  <TableRow key={d.id}>
                    <TableCell className="pl-6 font-medium">{d.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {districtRegionals.length > 0 ? (
                          districtRegionals.map((r) => (
                            <Badge key={r.id} variant="outline" className="bg-muted/50 font-normal">
                              {r.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.is_active ? 'default' : 'secondary'}>
                        {d.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setDistrictToDelete(d)
                            setDeleteDialog(true)
                          }}
                          disabled={!isAllowedToDelete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este distrito?</AlertDialogTitle>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Distrito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Regionais</Label>
              <ScrollArea className="h-[200px] border rounded-md p-4 bg-muted/20">
                <div className="flex flex-col gap-3">
                  {regionals.map((r) => (
                    <div key={r.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`reg-${r.id}`}
                        checked={selectedRegionals.includes(r.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedRegionals([...selectedRegionals, r.id])
                          else setSelectedRegionals(selectedRegionals.filter((id) => id !== r.id))
                        }}
                      />
                      <Label
                        htmlFor={`reg-${r.id}`}
                        className="font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {r.name}
                      </Label>
                    </div>
                  ))}
                  {regionals.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma regional encontrada.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
