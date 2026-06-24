import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const mockUsers = [
  {
    id: '1',
    name: 'Roberto Almeida',
    email: 'roberto@tesla.com.br',
    role: 'Gerente Regional',
    status: 'Ativo',
  },
  {
    id: '2',
    name: 'Carlos Ferreira',
    email: 'carlos@tesla.com.br',
    role: 'Vendedor',
    status: 'Ativo',
  },
  { id: '3', name: 'Admin Master', email: 'admin@tesla.com.br', role: 'Admin', status: 'Ativo' },
  {
    id: '4',
    name: 'Lucia Gomes',
    email: 'lucia@tesla.com.br',
    role: 'Vendedor',
    status: 'Inativo',
  },
]

export default function Users() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Administre acessos e perfis no sistema.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg">Lista de Usuários</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou email" className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-6 font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 ${user.status === 'Ativo' ? 'text-emerald-600' : 'text-muted-foreground'}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
                      ></span>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Redefinir Senha</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Desativar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
