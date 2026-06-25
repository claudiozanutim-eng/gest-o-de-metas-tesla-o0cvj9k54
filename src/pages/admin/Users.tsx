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
import { Plus, UserCog, Search, Users as UsersIcon } from 'lucide-react'
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
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { EmptyState } from '@/components/ui/empty-state'

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
    area_id: 'none',
  })

  const [filters, setFilters] = useLocalStorage('users-filters', {
    search: '',
    role: 'all',
    district: 'all',
  })
  const [searchTerm, setSearchTerm] = useState(filters.search)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      const u = await pb
        .collection('users')
        .getFullList({ sort: '-created', expand: 'district_id,area_id' })
      setUsers(u)
      const d = await pb.collection('districts').getFullList({ sort: 'name' })
      setDistricts(d)
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
      if (!data.password) delete data.password
      else data.passwordConfirm = data.password
      data.district_id = data.district_id === 'none' ? '' : data.district_id
      data.area_id = data.area_id === 'none' ? '' : data.area_id
      data.role = data.role === 'Vendedor' ? 'Seller' : data.role

      if (data.id) await pb.collection('users').update(data.id, data)
      else {
        if (!data.password) {
          toast({
            title: 'Erro de validação',
            description: 'A senha é obrigatória para novos usuários.',
            variant: 'destructive',
          })
          return
        }
        await pb.collection('users').create(data)
      }
      toast({ title: 'Usuário salvo com sucesso' })
      setIsOpen(false)
      await loadData()
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar usuário',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const openEdit = (u: any) => {
    setFormData({
      id: u.id || '',
      name: u.name || '',
      email: u.email || '',
      role: u.role === 'Seller' ? 'Vendedor' : u.role || '',
      is_active: u.is_active ?? true,
      district_id: u.district_id || 'none',
      area_id: u.area_id || 'none',
      password: '',
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
        (filters.role === 'Vendedor' && u.role === 'Seller')
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
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
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
                  {r}
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
                  <TableHead>Cargo</TableHead>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="pl-6 font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.role === 'Seller' ? 'Vendedor' : u.role}</Badge>
                    </TableCell>
                    <TableCell>{u.expand?.district_id?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'secondary'}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
              <div className="grid gap-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Senha"
                />
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
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Distrito (Opcional)</Label>
                <Select
                  value={formData.district_id}
                  onValueChange={(v) => setFormData({ ...formData, district_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Área (Opcional)</Label>
                <Select
                  value={formData.area_id}
                  onValueChange={(v) => setFormData({ ...formData, area_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
