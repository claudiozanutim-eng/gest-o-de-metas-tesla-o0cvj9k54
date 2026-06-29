import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Flag, Pencil, History } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TierRow {
  goalId: string
  sellerName: string
  sellerId: string
  period: string
  metric: string
  mixFamily: string
  targetBase: number
  targetBronze: number
  targetPrata: number
  targetOuro: number
  actual: number
}

function getPctColor(pct: number): string {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 80) return 'text-yellow-600'
  return 'text-red-600'
}

function getPctBg(pct: number): string {
  if (pct >= 100) return 'bg-emerald-100'
  if (pct >= 80) return 'bg-yellow-100'
  return 'bg-red-100'
}

function formatVal(v: number, isCoverage: boolean) {
  if (isCoverage) return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)
}

interface Props {
  rows: TierRow[]
  isCoverage: boolean
  onEdit: (row: TierRow) => void
  onHistory: (row: TierRow) => void
}

export function MultiTierTable({ rows, isCoverage, onEdit, onHistory }: Props) {
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center border rounded-lg bg-muted/20 text-muted-foreground">
        Nenhuma meta encontrada para os filtros selecionados.
      </div>
    )
  }

  const TierCell = ({ target, actual }: { target: number; actual: number }) => {
    const pct = target > 0 ? (actual / target) * 100 : 0
    return (
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm">{formatVal(target, isCoverage)}</span>
          <span
            className={cn(
              'text-xs font-bold inline-flex items-center w-fit px-1.5 py-0.5 rounded',
              getPctBg(pct),
              getPctColor(pct),
            )}
          >
            {pct.toFixed(1)}%
          </span>
        </div>
      </TableCell>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Vendedor</TableHead>
            <TableHead>Meta Base</TableHead>
            <TableHead>Meta Bronze</TableHead>
            <TableHead>Meta Prata</TableHead>
            <TableHead>Meta Ouro</TableHead>
            <TableHead>Realizado</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const basePct = row.targetBase > 0 ? (row.actual / row.targetBase) * 100 : 0
            return (
              <TableRow key={row.goalId}>
                <TableCell className="font-medium">{row.sellerName}</TableCell>
                <TierCell target={row.targetBase} actual={row.actual} />
                <TierCell target={row.targetBronze} actual={row.actual} />
                <TierCell target={row.targetPrata} actual={row.actual} />
                <TierCell target={row.targetOuro} actual={row.actual} />
                <TableCell>
                  <button onClick={() => onEdit(row)} className="flex items-center gap-1.5 group">
                    <span className="font-mono text-sm font-bold">
                      {formatVal(row.actual, isCoverage)}
                    </span>
                    <Flag
                      className={cn(
                        'w-4 h-4',
                        basePct >= 100
                          ? 'text-emerald-500'
                          : basePct >= 80
                            ? 'text-yellow-500'
                            : 'text-red-500',
                      )}
                    />
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(row)}
                      className="h-8 px-2"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onHistory(row)}
                      className="h-8 px-2"
                    >
                      <History className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
