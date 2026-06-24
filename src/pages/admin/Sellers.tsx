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
import { Plus, Users } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function Sellers() {
  const [sellers, setSellers] = useState<any[]>([])

  useEffect(() => {
    pb.collection('sellers')
      .getFullList({ expand: 'area_id,user_id' })
      .then(setSellers)
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Users className="w-8 h-8" /> Vendedores
          </h1>
          <p className="text-muted-foreground">
            Gerencie os vendedores e seus vínculos com usuários.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Novo Vendedor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Usuário Vinculado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-6 font-mono text-sm">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.expand?.area_id?.name || '-'}</TableCell>
                  <TableCell>{s.expand?.user_id?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active !== false ? 'default' : 'secondary'}>
                      {s.is_active !== false ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
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
