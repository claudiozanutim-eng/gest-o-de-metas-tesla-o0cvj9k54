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
import { Plus, Map } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function Districts() {
  const [districts, setDistricts] = useState<any[]>([])

  useEffect(() => {
    pb.collection('districts').getFullList().then(setDistricts).catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Map className="w-8 h-8" /> Distritos
          </h1>
          <p className="text-muted-foreground">Gerencie os Distritos.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Novo Distrito
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {districts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="pl-6 font-medium">{d.name}</TableCell>
                  <TableCell>
                    <Badge variant={d.is_active !== false ? 'default' : 'secondary'}>
                      {d.is_active !== false ? 'Ativo' : 'Inativo'}
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
