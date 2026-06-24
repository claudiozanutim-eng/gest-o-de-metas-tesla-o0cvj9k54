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
import { Plus, MapPinned } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function Areas() {
  const [areas, setAreas] = useState<any[]>([])

  useEffect(() => {
    pb.collection('areas')
      .getFullList({ expand: 'regional_id,responsible_id' })
      .then(setAreas)
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <MapPinned className="w-8 h-8" /> Áreas
          </h1>
          <p className="text-muted-foreground">Gerencie as Áreas comerciais.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Nova Área
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Regional</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="pl-6 font-medium">{a.name}</TableCell>
                  <TableCell>{a.expand?.regional_id?.name || '-'}</TableCell>
                  <TableCell>{a.expand?.responsible_id?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active !== false ? 'default' : 'secondary'}>
                      {a.is_active !== false ? 'Ativo' : 'Inativo'}
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
