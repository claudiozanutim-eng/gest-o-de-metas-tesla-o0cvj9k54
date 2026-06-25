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
import { Plus, Users, Search, Target } from 'lucide-react'
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
import { useRealtime } from '@/hooks/use-realtime'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { EmptyState } from '@/components/ui/empty-state'

export default function Sellers() {
  const [sellers, setSellers] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    code: '',
    is_active: true,
    area_id: '',
    user_id: '',
  })

  const [filters, setFilters] = useLocalStorage('sellers-filters', { search: '', area: 'all' })
  const [searchTerm, setSearchTerm] = useState(filters.search)

  const { toast } = useToast()

  const loadData = async () => {
    setSellers(
      await pb.collection('sellers').getFullList({ expand: 'area_id,user_id', sort: '-created' }),
    )
    setAreas(await pb.collection('areas').getFullList({ sort: 'name' }))
    setUsers(await pb.collection('users').getFullList({ sort: 'name' }))
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((p) => ({ ...p, search: searchTerm }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, setFilters])

  useRealtime('sellers', () => {
    loadData()
  })

  const handleSave = async () => {
    try {
      const data = { ...formData }
      if (!data.user_id || data.user_id === 'none') delete data.user_id
      if (data.id) await pb.collection('sellers').update(data.id, data)
      else await pb.collection('sellers').create(data)
      toast({ title: 'Sucesso', description: 'Dados salvos com sucesso' })
      setIsOpen(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Ocorreu um erro', description: e.message, variant: 'destructive' })
    }
  }

  const openEdit = (s: any) => {
    setFormData({
      id: s.id,
      name: s.name,
      code: s.code,
      is_active: s.is_active,
      area_id: s.area_id || '',
      user_id: s.user_id || 'none',
    })
    setIsOpen(true)
  }

  const filteredSellers = useMemo(() => {
    return sellers.filter((s) => {
      const matchSearch =
        s.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        s.code?.toLowerCase().includes(filters.search.toLowerCase())
      const matchArea = filters.area === 'all' || s.area_id === filters.area
      return matchSearch && matchArea
    })
  }, [sellers, filters])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" /> Vendedores
        </h1>
        <Button onClick={() => openEdit({ id: '', is_active: true })}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Novo
        </Button>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            value={filters.area}
            onValueChange={(v) => setFilters((p) => ({ ...p, area: v }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filtrar por Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Áreas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filteredSellers.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhum vendedor encontrado"
          description="Os filtros aplicados não retornaram nenhum resultado."
          actionLabel="Limpar Filtros"
          onAction={() => {
            setSearchTerm('')
            setFilters({ search: '', area: 'all' })
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSellers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 font-mono">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.expand?.area_id?.name || '-'}</TableCell>
                    <TableCell>{s.expand?.user_id?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>
                        {s.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
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
            <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Vendedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Área</Label>
              <Select
                value={formData.area_id}
                onValueChange={(v) => setFormData({ ...formData, area_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Usuário Vinculado</Label>
              <Select
                value={formData.user_id}
                onValueChange={(v) => setFormData({ ...formData, user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
