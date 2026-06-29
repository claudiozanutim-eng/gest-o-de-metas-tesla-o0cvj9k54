import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Send, ShieldCheck, AlertTriangle } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'

async function upsertRecord(collection: string, filter: string, createData: any, updateData: any) {
  let existing = null
  try {
    existing = await pb.collection(collection).getFirstListItem(filter)
  } catch {
    /* not found */
  }
  if (existing) {
    await pb.collection(collection).update(existing.id, updateData)
    return existing
  }
  try {
    return await pb.collection(collection).create(createData)
  } catch (createErr) {
    const found = await pb
      .collection(collection)
      .getFirstListItem(filter)
      .catch(() => null)
    if (found) {
      await pb.collection(collection).update(found.id, updateData)
      return found
    }
    throw createErr
  }
}

export default function CoverageGoalEntry() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [data, setData] = useState<any>({ sellers: [], regionals: [], areas: [], districts: [] })
  const [distId, setDistId] = useState('')
  const [regId, setRegId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [covBase, setCovBase] = useState('')
  const [covBronze, setCovBronze] = useState('')
  const [covPrata, setCovPrata] = useState('')
  const [covOuro, setCovOuro] = useState('')
  const [actualCov, setActualCov] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      pb.collection('sellers').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('regionals').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true', sort: 'name' }),
      pb.collection('districts').getFullList({ filter: 'is_active = true', sort: 'name' }),
    ]).then(([s, r, a, d]) => {
      setData({ sellers: s, regionals: r, areas: a, districts: d })
    })
  }, [])

  const selectedSeller = data.sellers.find((s: any) => s.id === sellerId)

  useEffect(() => {
    if (!selectedSeller?.user_id || !period) {
      setCovBase('')
      setCovBronze('')
      setCovPrata('')
      setCovOuro('')
      setActualCov('')
      return
    }
    const loadExisting = async () => {
      try {
        const filter = `seller_id="${selectedSeller.user_id}" && district_id="${distId}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="Coverage" && mix_family=""`
        const goal = await pb.collection('goals').getFirstListItem(filter)
        setCovBase(String(goal.target_base || ''))
        setCovBronze(String(goal.target_bronze || ''))
        setCovPrata(String(goal.target_prata || ''))
        setCovOuro(String(goal.target_ouro || ''))
      } catch {
        setCovBase('')
        setCovBronze('')
        setCovPrata('')
        setCovOuro('')
      }
      try {
        const perf = await pb
          .collection('actual_performance')
          .getFirstListItem(
            `seller_id="${selectedSeller.user_id}" && period="${period}" && metric="Coverage"`,
          )
        setActualCov(String(perf.actual_coverage || perf.actual_value || ''))
      } catch {
        setActualCov('')
      }
    }
    loadExisting()
  }, [selectedSeller?.user_id, period, areaId, regId])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!distId) errs.distId = 'Selecione um distrito'
    if (!regId) errs.regId = 'Selecione uma regional'
    if (!areaId) errs.areaId = 'Selecione uma área'
    if (!sellerId) errs.sellerId = 'Selecione um vendedor'
    if (!period) errs.period = 'Selecione um período'
    if (!covBase) errs.covBase = 'Meta Base é obrigatória'
    if (!covBronze) errs.covBronze = 'Meta Bronze é obrigatória'
    if (!covPrata) errs.covPrata = 'Meta Prata é obrigatória'
    if (!covOuro) errs.covOuro = 'Meta Ouro é obrigatória'

    const base = Number(covBase) || 0
    const bronze = Number(covBronze) || 0
    const prata = Number(covPrata) || 0
    const ouro = Number(covOuro) || 0

    for (const [field, val, label] of [
      ['covBase', base, 'Base'],
      ['covBronze', bronze, 'Bronze'],
      ['covPrata', prata, 'Prata'],
      ['covOuro', ouro, 'Ouro'],
    ] as const) {
      if (val < 0 || val > 100) errs[field] = `${label} deve estar entre 0 e 100`
    }

    if (bronze <= base && !errs.covBronze)
      errs.covBronze = 'Cobertura Bronze deve ser maior que Cobertura Base'
    if (prata <= bronze && !errs.covPrata)
      errs.covPrata = 'Cobertura Prata deve ser maior que Cobertura Bronze'
    if (ouro <= prata && !errs.covOuro)
      errs.covOuro = 'Cobertura Ouro deve ser maior que Cobertura Prata'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) {
      toast({
        title: 'Atenção',
        description: 'Corrija os campos destacados.',
        variant: 'destructive',
      })
      return
    }

    const seller = data.sellers.find((s: any) => s.id === sellerId)
    if (!seller?.user_id) return

    setLoading(true)
    try {
      const baseVal = Number(covBase) || 0
      const bronzeVal = Number(covBronze) || 0
      const prataVal = Number(covPrata) || 0
      const ouroVal = Number(covOuro) || 0
      const actualVal = Number(actualCov) || 0

      const goalData = {
        target_base: baseVal,
        target_bronze: bronzeVal,
        target_prata: prataVal,
        target_ouro: ouroVal,
        target_daily_coverage: baseVal > 0 ? baseVal / 30 : 0,
        target_weekly_coverage: baseVal > 0 ? baseVal / 4 : 0,
        target_monthly_coverage: baseVal,
      }

      const goalFilter = `seller_id="${seller.user_id}" && district_id="${distId}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="Coverage" && mix_family=""`
      const goalCreate = {
        seller_id: seller.user_id,
        district_id: distId,
        area_id: areaId,
        regional_id: regId,
        period,
        metric: 'Coverage',
        mix_family: '',
        ...goalData,
      }

      const existingGoal = await upsertRecord('goals', goalFilter, goalCreate, goalData)
      try {
        await pb.collection('goal_audit_logs').create({
          goal_id: existingGoal.id,
          user_id: user.id,
          old_values: null,
          new_values: goalData,
        })
      } catch {
        /* audit log optional */
      }

      const perfData = { actual_value: actualVal, actual_coverage: actualVal }
      const perfFilter = `seller_id="${seller.user_id}" && period="${period}" && metric="Coverage"`
      const perfCreate = {
        seller_id: seller.user_id,
        period,
        metric: 'Coverage',
        mix_family: '',
        ...perfData,
      }

      await upsertRecord('actual_performance', perfFilter, perfCreate, perfData)

      toast({ title: 'Sucesso', description: 'Meta de cobertura salva com sucesso!' })
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#003DA5]">
          <ShieldCheck className="w-5 h-5 text-[#0066CC]" />
          Lançamento de Meta de Cobertura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select
            value={distId}
            onValueChange={(v) => {
              setDistId(v)
              setRegId('')
              setAreaId('')
              setSellerId('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Distrito" />
            </SelectTrigger>
            <SelectContent>
              {data.districts.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={regId}
            onValueChange={(v) => {
              setRegId(v)
              setAreaId('')
              setSellerId('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Regional" />
            </SelectTrigger>
            <SelectContent>
              {data.regionals
                .filter((r: any) => !distId || r.district_id === distId)
                .map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={areaId}
            onValueChange={(v) => {
              setAreaId(v)
              setSellerId('')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              {data.areas
                .filter((a: any) => !regId || a.regional_id === regId)
                .map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger>
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              {data.sellers
                .filter((s: any) => !areaId || s.area_id === areaId)
                .map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white"
          />
        </div>

        {sellerId && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CoverageField
                label="Meta Base"
                value={covBase}
                onChange={setCovBase}
                error={errors.covBase}
              />
              <CoverageField
                label="Meta Bronze"
                value={covBronze}
                onChange={setCovBronze}
                error={errors.covBronze}
                color="amber"
              />
              <CoverageField
                label="Meta Prata"
                value={covPrata}
                onChange={setCovPrata}
                error={errors.covPrata}
                color="slate"
              />
              <CoverageField
                label="Meta Ouro"
                value={covOuro}
                onChange={setCovOuro}
                error={errors.covOuro}
                color="yellow"
              />
            </div>
            <div className="max-w-xs">
              <Label className="text-xs font-semibold text-muted-foreground">Cobertura Atual</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={actualCov}
                onChange={(e) => setActualCov(e.target.value)}
                className="bg-white mt-1"
              />
            </div>
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            Verifique os campos destacados.
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Meta de Cobertura'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CoverageField({
  label,
  value,
  onChange,
  error,
  color,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  color?: string
}) {
  const colorClass =
    color === 'amber'
      ? 'text-amber-700'
      : color === 'slate'
        ? 'text-slate-500'
        : color === 'yellow'
          ? 'text-yellow-600'
          : ''
  return (
    <div className="space-y-1">
      <Label className={cn('text-xs', colorClass)}>{label}</Label>
      <Input
        type="number"
        min={0}
        max={100}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
