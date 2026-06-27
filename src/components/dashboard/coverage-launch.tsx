import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useDashboard } from '@/hooks/use-dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Send } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export function CoverageLaunch() {
  const { sellers, areas, regionals } = useDashboard()
  const { toast } = useToast()
  const [regId, setRegId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [coverage, setCoverage] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredAreas = areas.filter((a) => !regId || a.regional_id === regId)
  const filteredSellers = sellers.filter((s) => !areaId || s.area_id === areaId)

  const handleSubmit = async () => {
    const seller = sellers.find((s) => s.id === sellerId)
    if (!seller?.user_id || !period || !coverage) {
      return toast({
        title: 'Atenção',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      })
    }
    setLoading(true)
    try {
      const value = Number(coverage.replace(',', '.')) || 0
      let existing = null
      try {
        existing = await pb
          .collection('actual_performance')
          .getFirstListItem(
            `seller_id="${seller.user_id}" && period="${period}" && metric="Coverage"`,
          )
      } catch {
        /* not found */
      }

      if (existing) {
        await pb.collection('actual_performance').update(existing.id, {
          actual_value: value,
          actual_coverage: value,
        })
      } else {
        await pb.collection('actual_performance').create({
          seller_id: seller.user_id,
          period,
          metric: 'Coverage',
          actual_value: value,
          actual_coverage: value,
        })
      }
      toast({ title: 'Sucesso', description: 'Cobertura lançada com sucesso!' })
      setCoverage('')
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
          Lançamento de Cobertura Diária
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
        <div className="flex gap-3">
          <Input
            type="number"
            placeholder="Valor de Cobertura (%)"
            value={coverage}
            onChange={(e) => setCoverage(e.target.value)}
            className="flex-1 bg-white"
          />
          <Button onClick={handleSubmit} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Enviando...' : 'Lançar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
