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
import { Plus, MapPin, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { EmptyState } from '@/components/ui/empty-state'
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

export default function Regionals() {
  const [regionals, setRegionals] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    color_code: '#3b82f6',
    is_active: true,
    district_id: '',
  })
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [regionalToDelete, setRegionalToDelete] = useState<any>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const isAllowedToDelete = ['Administrator', 'National Manager', 'Gerente Nacional'].includes(
    user?.role || '',
  )

  const loadData = async () => {
    const r = await pb.collection('regionals').getFullList({ expand: 'district_id' })
    setRegionals(r)
    const d = await pb.collection('districts').getFullList()
    setDistricts(d)
  }
  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async () => {
    if (!regionalToDelete) return
    try {
      const areas = await pb
        .collection('areas')
        .getList(1, 1, { filter: `regional_id="${regionalToDelete.id}"` })
      if (areas.items.length > 0) {
        toast({
          title: 'Erro ao excluir item',
          description: 'Não é possível excluir este item pois ele possui vínculos ativos (Áreas).',
          variant: 'destructive',
        })
        setDeleteDialog(false)
        return
      }
      await pb.collection('regionals').delete(regionalToDelete.id)
      toast({ title: 'Item excluído com sucesso.' })
      setDeleteDialog(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    try {
      if (formData.id) await pb.collection('regionals').update(formData.id, formData)
      else await pb.collection('regionals').create(formData)
      toast({ title: 'Regional salva com sucesso' })
      setIsOpen(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const openEdit = (r: any) => {
    setFormData({
      id: r.id,
      name: r.name,
      color_code: r.color_code || '#000000',
      is_active: r.is_active,
      district_id: r.district_id || '',
    })
    setIsOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MapPin className="w-8 h-8" /> Regionais
        </h1>
        <Button onClick={() => openEdit({ id: '', is_active: true, color_code: '#3b82f6' })}>
          <Plus className="w-4 h-4 mr-2" /> Nova Regional
        </Button>
      </div>
      {regionals.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhuma regional"
          description="Crie regionais para agrupar suas áreas."
          actionLabel="Nova Regional"
          onAction={() => openEdit({ id: '', is_active: true, color_code: '#3b82f6' })}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nome</TableHead>
                  <TableHead>Regional</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Abrangência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regionals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6 font-medium">{r.name}</TableCell>
                    <TableCell>{r.expand?.district_id?.name || '-'}</TableCell>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: r.color_code || '#ccc' }}
                        title={r.color_code}
                      />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={r.observations}>
                      {r.observations
                        ? r.observations.replace(/[[\]"]/g, '').replace(/,/g, ', ')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? 'default' : 'secondary'}>
                        {r.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setRegionalToDelete(r)
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
      )}

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este item?</AlertDialogTitle>
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
            <DialogTitle>{formData.id ? 'Editar' : 'Nova'} Regional</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Cor</Label>
              <Input
                type="color"
                value={formData.color_code}
                onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                className="h-10 px-1"
              />
            </div>
            <div className="grid gap-2">
              <Label>Regional</Label>
              <Select
                value={formData.district_id}
                onValueChange={(v) => setFormData({ ...formData, district_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma regional" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
