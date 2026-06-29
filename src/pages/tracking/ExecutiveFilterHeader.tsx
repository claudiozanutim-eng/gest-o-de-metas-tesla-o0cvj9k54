import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const YEARS = [2025, 2026, 2027]

const QUARTERS = [
  { suffix: 'Q1', label: 'Q1 (Jan-Mar)' },
  { suffix: 'Q2', label: 'Q2 (Abr-Jun)' },
  { suffix: 'Q3', label: 'Q3 (Jul-Set)' },
  { suffix: 'Q4', label: 'Q4 (Out-Dez)' },
]

function generatePeriods() {
  return YEARS.map((year) => ({
    year,
    months: MONTHS_PT.map((m, i) => ({
      value: `${year}-${String(i + 1).padStart(2, '0')}`,
      label: `${m} ${year}`,
    })),
    quarters: QUARTERS.map((q) => ({
      value: `${year}-${q.suffix}`,
      label: `${q.label} ${year}`,
    })),
  }))
}

const FAMILIES = [
  { value: 'Todos', label: 'Todas' },
  { value: 'F1', label: 'F1' },
  { value: 'F2', label: 'F2' },
  { value: 'F3', label: 'F3' },
  { value: 'Outros', label: 'Outros' },
]

interface Props {
  period: string
  setPeriod: (v: string) => void
  regionalId: string
  setRegionalId: (v: string) => void
  areaId: string
  setAreaId: (v: string) => void
  sellerId: string
  setSellerId: (v: string) => void
  metricType: 'faturamento' | 'cobertura'
  setMetricType: (v: 'faturamento' | 'cobertura') => void
  family: string
  setFamily: (v: string) => void
  regionals: any[]
  areas: any[]
  sellers: any[]
}

export function ExecutiveFilterHeader(p: Props) {
  const periods = generatePeriods()
  return (
    <div className="bg-card rounded-xl p-4 md:p-6 shadow-sm border space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Período</label>
          <Select value={p.period} onValueChange={p.setPeriod}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((yp, idx) => (
                <SelectGroup key={yp.year}>
                  <SelectLabel className="font-bold text-primary">{yp.year}</SelectLabel>
                  {yp.months.map((per) => (
                    <SelectItem key={per.value} value={per.value}>
                      {per.label}
                    </SelectItem>
                  ))}
                  {yp.quarters.map((per) => (
                    <SelectItem key={per.value} value={per.value}>
                      {per.label}
                    </SelectItem>
                  ))}
                  {idx < periods.length - 1 && <SelectSeparator />}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Regional</label>
          <Select
            value={p.regionalId}
            onValueChange={(v) => {
              p.setRegionalId(v)
              p.setAreaId('all')
              p.setSellerId('all')
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {p.regionals.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Distrito</label>
          <Select
            value={p.areaId}
            onValueChange={(v) => {
              p.setAreaId(v)
              p.setSellerId('all')
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {p.areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Vendedor</label>
          <Select value={p.sellerId} onValueChange={p.setSellerId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {p.sellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Família</label>
          <Select value={p.family} onValueChange={p.setFamily}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Métrica</label>
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-background">
            <span
              className={`text-xs font-medium ${p.metricType === 'faturamento' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Fat.
            </span>
            <Switch
              checked={p.metricType === 'cobertura'}
              onCheckedChange={(c) => p.setMetricType(c ? 'cobertura' : 'faturamento')}
            />
            <span
              className={`text-xs font-medium ${p.metricType === 'cobertura' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Cob.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
