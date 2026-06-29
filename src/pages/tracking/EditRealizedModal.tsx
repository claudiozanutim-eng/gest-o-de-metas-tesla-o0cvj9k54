import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
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
import { Loader2 } from 'lucide-react'
import type { TierRow } from './MultiTierTable'
import {
  upsertFamilyPerformance,
  fetchFamilyActuals,
  createAuditLog,
  formatPeriodLabel,
} from '@/services/tracking'
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
  const [families, setFamilies] = useState<{ id: string; code: string; name: string }[]>([])
  const [familyValues, setFamilyValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !row) {
      setFamilyValues({})
      setFamilies([])
      return
    }
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      setFamilyValues({})
      try {
        const [fams, existing] = await Promise.all([
          pb.collection('product_families').getFullList({ sort: 'name' }),
          fetchFamilyActuals(row.sellerId, row.period, row.metric),
        ])
        if (cancelled) return
        const famList = fams.map((f: any) => ({ id: f.id, code: f.code, name: f.name }))
        setFamilies(famList)
        const values: Record<string, string> = {}
        for (const fam of famList) {
          const matching = existing.filter((a: any) => (a.mix_family || '') === fam.code)
          const total = matching.reduce((s: number, a: any) => s + (a.actual_value || 0), 0)
          values[fam.code] = total > 0 ? String(total) : ''
        }
        setFamilyValues(values)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [open, row])

  const total = Object.values(familyValues).reduce((s, v) => s + (parseFloat(v) || 0), 0)

  const handleSave = async () => {
    if (!row) return
    for (const val of Object.values(familyValues)) {
      if (val && isNaN(parseFloat(val))) {
        toast.error('Informe apenas valores numéricos.')
        return
      }
    }
    setSaving(true)
    try {
      const entries = families.map((f) => ({
        family: f.code,
        value: parseFloat(familyValues[f.code] || '0') || 0,
      }))
      const results = await upsertFamilyPerformance(row.sellerId, row.period, row.metric, entries)
      const oldTotal = results.reduce((s, r) => s + r.oldValue, 0)
      await createAuditLog(
        row.goalId,
        user?.id || '',
        { actual_value: oldTotal },
        { actual_value: total },
      )
      toast.success('Realizado atualizado com sucesso!')
      if (navigator.vibrate) navigator.vibrate(50)
      onSaved()
      onClose()
    } catch {
      toast.error('Erro ao atualizar realizado.')
    } finally {
      setSaving(false)
    }
  }

  const tiers = row
    ? [
        { name: 'Base', target: row.targetBase },
        { name: 'Bronze', target: row.targetBronze },
        { name: 'Prata', target: row.targetPrata },
        { name: 'Ouro', target: row.targetOuro },
      ]
    : []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Realizado por Família</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Vendedor</Label>
                <p className="font-medium">{row.sellerName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Período</Label>
                <p className="font-medium">{formatPeriodLabel(row.period)}</p>
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : families.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma família de produto cadastrada.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Realizado por Família</Label>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {families.map((fam) => (
                      <div key={fam.id} className="flex items-center gap-3">
                        <Label
                          htmlFor={`fam-${fam.code}`}
                          className="text-sm w-32 shrink-0 truncate"
                        >
                          {fam.name}
                        </Label>
                        <Input
                          id={`fam-${fam.code}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={familyValues[fam.code] || ''}
                          onChange={(e) =>
                            setFamilyValues((p) => ({ ...p, [fam.code]: e.target.value }))
                          }
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-semibold">Total Consolidado</span>
                  <span className="text-lg font-bold text-primary">
                    {formatVal(total, isCoverage)}
                  </span>
                </div>
                <div className="space-y-2">
                  {tiers.map((t) => {
                    const pct = t.target > 0 ? (total / t.target) * 100 : 0
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
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || families.length === 0}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
