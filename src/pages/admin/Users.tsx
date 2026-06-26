import { useEffect, useState, useMemo } from 'react'
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
import { Plus, UserCog, Search, Users as UsersIcon, Trash2, KeyRound } from 'lucide-react'
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
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useLocalStorage } from '@/hooks/use-local-storage'
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

const roleDisplayMap: Record<string, string> = {
  Administrator: 'Administrador',
  'National Manager': 'Gerente Nacional',
  'District Manager': 'Gerente Distrital',
  'Regional Manager': 'Gerente Regional',
  Seller: 'Vendedor',
  'Sales Assistant': 'Assistente de Vendas',
  'Gerente Nacional': 'Gerente Nacional',
  'Gerente Distrital Geral': 'Gerente Distrital Geral',
  'Gerente Distrital': 'Gerente Distrital',
  'Gerente Regional': 'Gerente Regional',
  Vendedor: 'Vendedor',
}

const roles = [
  'Administrator',
  'Gerente Nacional',
  'Gerente Distrital Geral',
  'Gerente Distrital',
  'Gerente Regional',
  'Vendedor',
  'Sales Assistant',
]

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [regionals, setRegionals] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    email: '',
    password: '',
    role: '',
    is_active: true,
    district_id: 'none',
    regional_id: 'none',
    area_id: 'none',
  })

  const [deleteDialog, setDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)

  const [resetDialog, setResetDialog] = useState(false)
  const [userToReset, setUserToReset] = useState<any>(null)

  const [filters, setFilters] = useLocalStorage('users-filters', {
    search: '',
    role: 'all',
    district: 'all',
  })
  const [searchTerm, setSearchTerm] = useState(filters.search)

  const { toast } = useToast()
  const { user } = useAuth()
  const isAllowedToDelete = ['Administrator', 'National Manager', 'Gerente Nacional'].includes(
    user?.role || '',
  )

  const loadData = async () => {
    try {
      const u = await pb
        .collection('users')
        .getFullList({ sort: '-created', expand: 'district_id,regional_id,area_id' })
      setUsers(u)
      const d = await pb.collection('districts').getFullList({ sort: 'name' })
      setDistricts(d)
      const r = await pb.collection('regionals').getFullList({ sort: 'name' })
      setRegionals(r)
      const a = await pb.collection('areas').getFullList({ sort: 'name' })
      setAreas(a)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchTerm }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, setFilters])

  useRealtime('users', () => {
    loadData()
  })

  const handleDelete = async () => {
    if (!userToDelete) return
    try {
      const sellersCount = await pb
        .collection('sellers')
        .getList(1, 1, { filter: `user_id="${userToDelete.id}"` })
      if (sellersCount.items.length > 0) {
        toast({
          title: 'Erro ao excluir item',
          description:
            'Não é possível excluir este item pois ele possui vínculos ativos (Vendedor).',
          variant: 'destructive',
        })
        setDeleteDialog(false)
        return
      }
      const areasCount = await pb
        .collection('areas')
        .getList(1, 1, { filter: `responsible_id="${userToDelete.id}"` })
      if (areasCount.items.length > 0) {
        toast({
          title: 'Erro ao excluir item',
          description: 'Não é possível excluir este item pois ele possui vínculos ativos (Área).',
          variant: 'destructive',
        })
        setDeleteDialog(false)
        return
      }
      await pb.collection('users').delete(userToDelete.id)
      toast({ title: 'Item excluído com sucesso.' })
      setDeleteDialog(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    if (!formData.role) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, selecione um Cargo.',
        variant: 'destructive',
      })
      return
    }
    try {
      const data = { ...formData, emailVisibility: true }

      if (data.role === 'District Manager' && data.district_id === 'none') {
        toast({
          title: 'Erro de validação',
          description: 'Selecione o Distrito.',
          variant: 'destructive',
        })
        return
      }
      if (data.role === 'Regional Manager' && data.regional_id === 'none') {
        toast({
          title: 'Erro de validação',
          description: 'Selecione a Regional.',
          variant: 'destructive',
        })
        return
      }
      if (data.role === 'Seller' && data.area_id === 'none') {
        toast({
          title: 'Erro de validação',
          description: 'Selecione a Área.',
          variant: 'destructive',
        })
        return
      }

      // Auto-fill higher levels
      if (data.role === 'Seller' && data.area_id !== 'none') {
        const area = areas.find((a) => a.id === data.area_id)
        if (area?.regional_id) {
          data.regional_id = area.regional_id
          const regional = regionals.find((r) => r.id === area.regional_id)
          if (regional?.district_id) data.district_id = regional.district_id
        }
      }
      if (data.role === 'Regional Manager' && data.regional_id !== 'none') {
        const regional = regionals.find((r) => r.id === data.regional_id)
        if (regional?.district_id) data.district_id = regional.district_id
        data.area_id = ''
      }
      if (data.role === 'District Manager') {
        data.regional_id = ''
        data.area_id = ''
      }
      if (['Administrator', 'National Manager', 'Sales Assistant'].includes(data.role)) {
        data.district_id = ''
        data.regional_id = ''
        data.area_id = ''
      }

      data.district_id = data.district_id === 'none' ? '' : data.district_id
      data.regional_id = data.regional_id === 'none' ? '' : data.regional_id
      data.area_id = data.area_id === 'none' ? '' : data.area_id

      if (data.id) {
        await pb.collection('users').update(data.id, data)
        toast({ title: 'Sucesso', description: 'Dados salvos com sucesso' })
      } else {
        data.password = 'Tesla@2026!'
        data.passwordConfirm = 'Tesla@2026!'
        data.force_password_change = true
        await pb.collection('users').create(data)
        toast({
          title: 'Sucesso',
          description:
            'Usuário criado com sucesso. Senha padrão definida e troca obrigatória habilitada.',
        })
      }
      setIsOpen(false)
      await loadData()
    } catch (e: any) {
      toast({
        title: 'Ocorreu um erro',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const handleResetPassword = async () => {
    if (!userToReset) return
    try {
      await pb.collection('users').update(userToReset.id, {
        password: 'Tesla@2026!',
        passwordConfirm: 'Tesla@2026!',
        force_password_change: true,
      })
      toast({
        title: 'Sucesso',
        description:
          'Senha redefinida para o padrão Tesla@2026!. O usuário será solicitado a trocá-la no próximo login.',
      })
      setResetDialog(false)
      loadData()
    } catch (e: any) {
      const fieldErrors = extractFieldErrors(e)
      if (Object.keys(fieldErrors).length > 0) {
        const errorDetails = Object.entries(fieldErrors)
          .map(([f, m]) => `${f} (${m})`)
          .join(', ')
        toast({
          title: 'Erro de validação no usuário',
          description: `O cadastro do usuário possui campos inválidos ou em branco: ${errorDetails}. Por favor, edite o usuário para corrigir os dados antes de redefinir a senha.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Erro ao redefinir senha',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      }
    }
  }

  const openEdit = (u: any) => {
    setFormData({
      id: u.id || '',
      name: u.name || '',
      email: u.email || '',
      role: u.role || '',
      is_active: u.is_active ?? true,
      district_id: u.district_id || 'none',
      regional_id: u.regional_id || 'none',
      area_id: u.area_id || 'none',
    })
    setIsOpen(true)
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        u.email?.toLowerCase().includes(filters.search.toLowerCase())
      const matchRole =
        filters.role === 'all' ||
        u.role === filters.role ||
        (filters.role === 'Vendedor' && u.role === 'Seller') ||
        u.role === filters.role
      const matchDistrict = filters.district === 'all' || u.district_id === filters.district
      return matchSearch && matchRole && matchDistrict
    })
  }, [users, filters])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCog className="w-8 h-8" /> Usuários
        </h1>
        <Button onClick={() => openEdit({})}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Novo
        </Button>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={filters.role}
            onValueChange={(v) => setFilters((p) => ({ ...p, role: v }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filtrar por Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Cargos</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {roleDisplayMap[r] || r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.district}
            onValueChange={(v) => setFilters((p) => ({ ...p, district: v }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filtrar por Distrito" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Distritos</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Nenhum usuário encontrado"
          description="Os filtros aplicados não retornaram nenhum resultado."
          actionLabel="Limpar Filtros"
          onAction={() => {
            setSearchTerm('')
            setFilters({ search: '', role: 'all', district: 'all' })
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo/Função</TableHead>
                  <TableHead>Escopo (Distrito/Reg/Área)</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="pl-6 font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleDisplayMap[u.role] || u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.expand?.area_id?.name ||
                        u.expand?.regional_id?.name ||
                        u.expand?.district_id?.name ||
                        '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'secondary'}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Redefinir Senha"
                          onClick={() => {
                            setUserToReset(u)
                            setResetDialog(true)
                          }}
                          disabled={!isAllowedToDelete}
                        >
                          <KeyRound className="w-4 h-4 text-amber-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setUserToDelete(u)
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

      <AlertDialog open={resetDialog} onOpenChange={setResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir senha?</AlertDialogTitle>
            <AlertDialogDescription>
              A senha do usuário será redefinida para o padrão <strong>Tesla@2026!</strong> e ele
              será forçado a trocá-la no próximo acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>Redefinir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Usuário</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            {!formData.id && (
              <div className="col-span-full">
                <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-200">
                  A senha inicial padrão (<strong>Tesla@2026!</strong>) será aplicada
                  automaticamente. O usuário deverá alterá-la no primeiro acesso.
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Cargo</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleDisplayMap[r] || r}
                    </SelectItem>
                  ))}
                </SelectContent>{' '}
              </Select>
            </div>
            {['District Manager', 'Regional Manager', 'Seller'].includes(formData.role) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.role === 'District Manager' && (
                  <div className="grid gap-2">
                    <Label>
                      Distrito <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.district_id}
                      onValueChange={(v) => setFormData({ ...formData, district_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        {districts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.role === 'Regional Manager' && (
                  <div className="grid gap-2">
                    <Label>
                      Regional <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.regional_id}
                      onValueChange={(v) => setFormData({ ...formData, regional_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        {regionals.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.role === 'Seller' && (
                  <div className="grid gap-2">
                    <Label>
                      Área <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.area_id}
                      onValueChange={(v) => setFormData({ ...formData, area_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        {areas.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
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
