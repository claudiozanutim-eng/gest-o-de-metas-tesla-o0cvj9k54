import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { TierRow } from './MultiTierTable'
import { upsertActualPerformance, createAuditLog } from '@/services/tracking'
import { useAuth } from '@/hooks/use-auth'

function getPctColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 80) return 'bg-yellow-500'
  return 'bg-red-500'
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
  open: boolean
  onClose: () => void
  row: TierRow | null
  isCoverage: boolean
  onSaved: () => void
}

export function EditRealizedModal({ open, onClose, row, isCoverage, onSaved }: Props) {
  const { user } = useAuth()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(row ? String(row.actual || 0) : '')
  }, [row])
  if (!row) return null

  const numValue = parseFloat(value) || 0
  const tiers = [
    { name: 'Base', target: row.targetBase },
    { name: 'Bronze', target: row.targetBronze },
    { name: 'Prata', target: row.targetPrata },
    { name: 'Ouro', target: row.targetOuro },
  ]

  const handleSave = async () => {
    if (isNaN(numValue) || numValue < 0) {
      toast.error('Informe um valor positivo válido.')
      return
    }
    setSaving(true)
    try {
      const { oldValue } = await upsertActualPerformance(
        row.sellerId,
        row.period,
        row.metric,
        numValue,
        row.mixFamily,
      )
      await createAuditLog(
        row.goalId,
        user?.id || '',
        { actual_value: oldValue },
        { actual_value: numValue },
      )
      toast.success('Realizado atualizado com sucesso!')
      onSaved()
      onClose()
    } catch {
      toast.error('Erro ao atualizar realizado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Realizado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Vendedor</Label>
              <p className="font-medium">{row.sellerName}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Período</Label>
              <p className="font-medium">{row.period}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Métrica</Label>
              <p className="font-medium">{row.metric}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Atual</Label>
              <p className="font-medium">{formatVal(row.actual, isCoverage)}</p>
            </div>
          </div>
          <div>
            <Label htmlFor="newValue">Novo Realizado</Label>
            <Input
              id="newValue"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {tiers.map((t) => {
              const pct = t.target > 0 ? (numValue / t.target) * 100 : 0
              return (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-14">{t.name}</span>
                  <span className="text-xs text-muted-foreground w-24">
                    {formatVal(t.target, isCoverage)}
                  </span>
                  <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-200',
                        getPctColor(pct),
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-12 text-right">{pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
