import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Send, Target } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export function CoverageLaunch() {
  const { sellers, areas, regionals } = useDashboard()
  const { toast } = useToast()
  const [regId, setRegId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [covBase, setCovBase] = useState('')
  const [covBronze, setCovBronze] = useState('')
  const [covPrata, setCovPrata] = useState('')
  const [covOuro, setCovOuro] = useState('')
  const [actualCov, setActualCov] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredAreas = areas.filter((a) => !regId || a.regional_id === regId)
  const filteredSellers = sellers.filter((s) => !areaId || s.area_id === areaId)
  const selectedSeller = sellers.find((s) => s.id === sellerId)

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
        let filter = `seller_id="${selectedSeller.user_id}" && period="${period}" && metric="Coverage"`
        if (areaId) filter += ` && area_id="${areaId}"`
        if (regId) filter += ` && regional_id="${regId}"`
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

  const handleSubmit = async () => {
    const seller = sellers.find((s) => s.id === sellerId)
    if (!seller?.user_id || !period || !areaId || !regId) {
      return toast({
        title: 'Atenção',
        description: 'Selecione Regional, Área, Vendedor e Período.',
        variant: 'destructive',
      })
    }

    const baseVal = Number(covBase?.replace(',', '.') || '0') || 0
    const actualVal = Number(actualCov?.replace(',', '.') || '0') || 0

    if (baseVal <= 0 && actualVal <= 0) {
      return toast({
        title: 'Atenção',
        description: 'Preencha pelo menos a Meta Base ou o Realizado de cobertura.',
        variant: 'destructive',
      })
    }

    setLoading(true)
    try {
      const bronzeVal = Number(covBronze?.replace(',', '.') || '0') || 0
      const prataVal = Number(covPrata?.replace(',', '.') || '0') || 0
      const ouroVal = Number(covOuro?.replace(',', '.') || '0') || 0

      let existingGoal = null
      try {
        existingGoal = await pb
          .collection('goals')
          .getFirstListItem(
            `seller_id="${seller.user_id}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="Coverage" && mix_family=""`,
          )
      } catch {
        /* not found */
      }

      const goalData = {
        target_base: baseVal,
        target_bronze: bronzeVal,
        target_prata: prataVal,
        target_ouro: ouroVal,
        target_daily_coverage: baseVal > 0 ? baseVal / 30 : 0,
        target_weekly_coverage: baseVal > 0 ? baseVal / 4 : 0,
        target_monthly_coverage: baseVal,
      }

      if (existingGoal) {
        await pb.collection('goals').update(existingGoal.id, goalData)
      } else {
        try {
          await pb.collection('goals').create({
            seller_id: seller.user_id,
            area_id: areaId,
            regional_id: regId,
            period,
            metric: 'Coverage',
            mix_family: '',
            ...goalData,
          })
        } catch (createErr) {
          const found = await pb
            .collection('goals')
            .getFirstListItem(
              `seller_id="${seller.user_id}" && area_id="${areaId}" && regional_id="${regId}" && period="${period}" && metric="Coverage" && mix_family=""`,
            )
            .catch(() => null)
          if (found) {
            await pb.collection('goals').update(found.id, goalData)
          } else {
            throw createErr
          }
        }
      }

      let existingPerf = null
      try {
        existingPerf = await pb
          .collection('actual_performance')
          .getFirstListItem(
            `seller_id="${seller.user_id}" && period="${period}" && metric="Coverage"`,
          )
      } catch {
        /* not found */
      }

      const perfData = {
        actual_value: actualVal,
        actual_coverage: actualVal,
      }

      if (existingPerf) {
        await pb.collection('actual_performance').update(existingPerf.id, perfData)
      } else {
        try {
          await pb.collection('actual_performance').create({
            seller_id: seller.user_id,
            period,
            metric: 'Coverage',
            mix_family: '',
            ...perfData,
          })
        } catch (createErr) {
          const found = await pb
            .collection('actual_performance')
            .getFirstListItem(
              `seller_id="${seller.user_id}" && period="${period}" && metric="Coverage"`,
            )
            .catch(() => null)
          if (found) {
            await pb.collection('actual_performance').update(found.id, perfData)
          } else {
            throw createErr
          }
        }
      }

      toast({ title: 'Sucesso', description: 'Meta de cobertura salva com sucesso' })
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-md border-[#003DA5]/10 animate-scale-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-[#003DA5] uppercase tracking-wider">
          <Calendar className="w-5 h-5 text-[#0066CC]" />
          Lançamento de Meta de Cobertura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              {regionals.map((r) => (
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
              {filteredAreas.map((a) => (
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
              {filteredSellers.map((s) => (
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
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="w-4 h-4" /> Metas de Cobertura (%)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Base (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={covBase}
                  onChange={(e) => setCovBase(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-amber-700">Bronze (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={covBronze}
                  onChange={(e) => setCovBronze(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Prata (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={covPrata}
                  onChange={(e) => setCovPrata(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-yellow-600">Ouro (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={covOuro}
                  onChange={(e) => setCovOuro(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cobertura Realizada (%)</Label>
              <Input
                type="number"
                placeholder="0"
                value={actualCov}
                onChange={(e) => setActualCov(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Lançar Cobertura'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
