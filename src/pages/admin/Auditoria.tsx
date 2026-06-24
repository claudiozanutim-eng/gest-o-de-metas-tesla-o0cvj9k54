import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'

export default function Auditoria() {
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    pb.collection('import_history')
      .getList(1, 50, { sort: '-created', expand: 'user_id' })
      .then((res) => setHistory(res.items))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ShieldAlert className="w-8 h-8" /> Histórico de Auditoria
        </h1>
        <p className="text-muted-foreground">
          Acompanhe as modificações críticas e importações realizadas no sistema.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Importação</CardTitle>
          <CardDescription>
            Registros de todas as importações de metas executadas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estatísticas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum registro de auditoria encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.created), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>
                        {record.expand?.user_id?.name ||
                          record.expand?.user_id?.email ||
                          'Desconhecido'}
                      </TableCell>
                      <TableCell>{record.source}</TableCell>
                      <TableCell>{record.file_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'Success'
                              ? 'default'
                              : record.status === 'Partial'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-green-600 font-medium">
                          C: {record.stats?.created || 0}
                        </span>{' '}
                        |{' '}
                        <span className="text-blue-600 font-medium">
                          A: {record.stats?.updated || 0}
                        </span>{' '}
                        |{' '}
                        <span className="text-red-600 font-medium">
                          E: {record.stats?.errors || 0}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
