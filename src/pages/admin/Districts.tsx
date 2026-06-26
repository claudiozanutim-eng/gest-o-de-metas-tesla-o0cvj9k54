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
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '', is_active: true })
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [districtToDelete, setDistrictToDelete] = useState<any>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const isAllowedToDelete = ['Administrator', 'National Manager', 'Gerente Nacional'].includes(
    user?.role || '',
  )

  const loadData = () => pb.collection('districts').getFullList().then(setDistricts)
  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async () => {
    if (!districtToDelete) return
    try {
      const regionals = await pb
        .collection('regionals')
        .getList(1, 1, { filter: `district_id="${districtToDelete.id}"` })
      if (regionals.items.length > 0) {
        toast({
          title: 'Erro ao excluir item',
          description:
            'Não é possível excluir este item pois ele possui vínculos ativos (Regionais).',
          variant: 'destructive',
        })
        setDeleteDialog(false)
        return
      }
      await pb.collection('districts').delete(districtToDelete.id)
      toast({ title: 'Item excluído com sucesso.' })
      setDeleteDialog(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    try {
      if (formData.id) {
        await pb.collection('districts').update(formData.id, formData)
      } else {
        await pb.collection('districts').create(formData)
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
            <Map className="w-8 h-8" /> Regional
          </h1>
        </div>
        <Button
          onClick={() => {
            setFormData({ id: '', name: '', is_active: true })
            setIsOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Regional
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {districts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="pl-6">{d.name}</TableCell>
                  <TableCell>
                    <Badge variant={d.is_active ? 'default' : 'secondary'}>
                      {d.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData(d)
                          setIsOpen(true)
                        }}
                      >
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
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
