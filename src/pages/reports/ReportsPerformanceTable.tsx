import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { DashboardTableRow } from '@/services/reports'

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
  rows: DashboardTableRow[]
  isCoverage: boolean
}

export function ReportsPerformanceTable({ rows, isCoverage }: Props) {
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center border rounded-lg bg-muted/20 text-muted-foreground">
        Nenhuma meta lançada para este período. Importe metas via Lote ou lance manualmente.
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Vendedor</TableHead>
            <TableHead>Família</TableHead>
            <TableHead>Regional</TableHead>
            <TableHead>Área</TableHead>
            <TableHead className="text-right">Meta Base</TableHead>
            <TableHead className="text-right">Realizado</TableHead>
            <TableHead className="text-right">Diferença</TableHead>
            <TableHead className="text-right">% Atingimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const exceeded = row.difference <= 0
            return (
              <TableRow key={i} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                <TableCell className="font-medium">{row.seller_name}</TableCell>
                <TableCell>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {row.family}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.regional_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.area_name}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatVal(row.target_base, isCoverage)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">
                  {formatVal(row.actual_value, isCoverage)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-mono text-sm',
                    exceeded ? 'text-emerald-600' : 'text-red-500',
                  )}
                >
                  {exceeded ? '+' : ''}
                  {formatVal(row.difference, isCoverage)}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      'text-xs font-bold inline-flex items-center px-2 py-0.5 rounded',
                      getPctBg(row.achievement_pct),
                      getPctColor(row.achievement_pct),
                    )}
                  >
                    {row.achievement_pct.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
