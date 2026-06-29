import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fetchAuditLogs } from '@/services/tracking'
import type { TierRow } from './MultiTierTable'

interface Props {
  open: boolean
  onClose: () => void
  row: TierRow | null
}

function formatVal(v: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v)
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AuditHistoryModal({ open, onClose, row }: Props) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !row) return
    setLoading(true)
    fetchAuditLogs(row.goalId)
      .then((data) => setLogs(data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [open, row])

  if (!row) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Histórico de Lançamentos — {row.sellerName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">Nenhum histórico encontrado.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">% Base</TableHead>
                  <TableHead className="text-right">% Ouro</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const newVal = log.new_values?.actual_value || 0
                  const basePct = row.targetBase > 0 ? (newVal / row.targetBase) * 100 : 0
                  const ouroPct = row.targetOuro > 0 ? (newVal / row.targetOuro) * 100 : 0
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{formatDate(log.created)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatVal(newVal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {basePct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {ouroPct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-sm">{log.expand?.user_id?.name || '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
