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
import { Plus, MapPinned, Trash2 } from 'lucide-react'
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

export default function Areas() {
  const [areas, setAreas] = useState<any[]>([])
  const [regionals, setRegionals] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    is_active: true,
    regional_id: '',
    responsible_id: '',
  })
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<any>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const isAllowedToDelete = ['Administrator', 'National Manager', 'Gerente Nacional'].includes(
    user?.role || '',
  )

  const loadData = async () => {
    const a = await pb
      .collection('areas')
      .getFullList({ expand: 'regional_id,responsible_id,district_id' })
    setAreas(a)
    setRegionals(await pb.collection('regionals').getFullList())

    const [sellerUsers, sellerRecords] = await Promise.all([
      pb.collection('users').getFullList({ filter: "role = 'Seller'", sort: 'name' }),
      pb.collection('sellers').getFullList({ expand: 'user_id' }),
    ])

    const uniqueSellers = new Map()
    sellerUsers.forEach((u) => uniqueSellers.set(u.id, u))
    sellerRecords.forEach((s) => {
      if (s.expand?.user_id) {
        uniqueSellers.set(s.expand.user_id.id, s.expand.user_id)
      }
    })

    setUsers(
      Array.from(uniqueSellers.values()).sort((a: any, b: any) =>
        (a.name || '').localeCompare(b.name || ''),
      ),
    )
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async () => {
    if (!areaToDelete) return
    try {
      const sellers = await pb
        .collection('sellers')
        .getList(1, 1, { filter: `area_id="${areaToDelete.id}"` })
      if (sellers.items.length > 0) {
        toast({
          title: 'Erro ao excluir item',
          description:
            'Não é possível excluir este item pois ele possui vínculos ativos (Vendedores).',
          variant: 'destructive',
        })
        setDeleteDialog(false)
        return
      }
      await pb.collection('areas').delete(areaToDelete.id)
      toast({ title: 'Item excluído com sucesso.' })
      setDeleteDialog(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    try {
      const data = { ...formData }
      if (!data.responsible_id || data.responsible_id === 'none') {
        data.responsible_id = null
      }
      if (!data.regional_id) {
        throw new Error('A Regional é obrigatória.')
      }

      const regional = regionals.find((r) => r.id === data.regional_id)
      const district_id = regional?.district_id || ''

      if (data.id) {
        await pb.collection('areas').update(data.id, { ...data, district_id })
      } else {
        await pb.collection('areas').create({ ...data, district_id })
      }

      toast({ title: 'Área salva com sucesso' })
      setIsOpen(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const openEdit = (a: any) => {
    setFormData({
      id: a.id,
      name: a.name,
      is_active: a.is_active,
      regional_id: a.regional_id || '',
      responsible_id: a.responsible_id || 'none',
    })
    setIsOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MapPinned className="w-8 h-8" /> Áreas
        </h1>
        <Button onClick={() => openEdit({ id: '', is_active: true })}>
          <Plus className="w-4 h-4 mr-2" /> Nova Área
        </Button>
      </div>
      {areas.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="Nenhuma área"
          description="Você ainda não possui áreas cadastradas. Crie a primeira para organizar seus vendedores."
          actionLabel="Nova Área"
          onAction={() => openEdit({ id: '', is_active: true })}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nome</TableHead>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Regional</TableHead>
                  <TableHead>Vendedor da Área</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-6 font-medium">{a.name}</TableCell>
                    <TableCell>{a.expand?.district_id?.name || '-'}</TableCell>
                    <TableCell>{a.expand?.regional_id?.name || '-'}</TableCell>
                    <TableCell>{a.expand?.responsible_id?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? 'default' : 'secondary'}>
                        {a.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setAreaToDelete(a)
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
            <DialogTitle>{formData.id ? 'Editar' : 'Nova'} Área</DialogTitle>
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
              <Label>Regional</Label>
              <Select
                value={formData.regional_id}
                onValueChange={(v) => setFormData({ ...formData, regional_id: v })}
              >
                <SelectTrigger>
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
            <div className="grid gap-2">
              <Label>Vendedor da Área</Label>
              <Select
                value={formData.responsible_id}
                onValueChange={(v) => setFormData({ ...formData, responsible_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || 'Sem nome'}
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
