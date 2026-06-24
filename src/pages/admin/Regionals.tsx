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
import { Plus, MapPin } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function Regionals() {
  const [regionals, setRegionals] = useState<any[]>([])

  useEffect(() => {
    pb.collection('regionals')
      .getFullList({ expand: 'district_id' })
      .then(setRegionals)
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <MapPin className="w-8 h-8" /> Regionais
          </h1>
          <p className="text-muted-foreground">Gerencie as Regionais e seus códigos de cor.</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Nova Regional
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6 font-medium">{r.name}</TableCell>
                  <TableCell>{r.expand?.district_id?.name || '-'}</TableCell>
                  <TableCell>
                    <div
                      className="w-6 h-6 rounded border shadow-sm"
                      style={{ backgroundColor: r.color_code || '#ccc' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_active !== false ? 'default' : 'secondary'}>
                      {r.is_active !== false ? 'Ativo' : 'Inativo'}
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
