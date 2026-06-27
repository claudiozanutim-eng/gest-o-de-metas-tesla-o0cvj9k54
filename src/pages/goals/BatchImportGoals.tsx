import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, UploadCloud, Download, ExternalLink } from 'lucide-react'

const expected = [
  'Vendedor',
  'Área',
  'Regional',
  'Distrito',
  'Período',
  'Métrica Faturamento',
  'Meta Base Faturamento',
  'Meta Bronze Faturamento',
  'Meta Prata Faturamento',
  'Meta Ouro Faturamento',
  'Família',
  'Frota Foco',
  'Empresa Foco',
  'Métrica Família',
  'Meta Base Família',
  'Meta Bronze Família',
  'Meta Prata Família',
  'Meta Ouro Família',
]

const sampleRow = [
  'João Silva',
  'Minas Gerais',
  'Regional Sudeste',
  'Distrito 1',
  '2026-06',
  'Faturamento Geral',
  'R$ 100.000,00',
  'R$ 90.000,00',
  'R$ 110.000,00',
  'R$ 120.000,00',
  'F1',
  '10',
  '5',
  'Família',
  'R$ 50.000,00',
  'R$ 45.000,00',
  'R$ 55.000,00',
  'R$ 60.000,00',
]

const parseCsvLine = (line: string, delim: string) => {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') inQuotes = !inQuotes
    else if (char === delim && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else current += char
  }
  result.push(current.trim())
  return result.map((s) => s.replace(/^"|"$/g, '').trim())
}

const parseNum = (v: string) => {
  if (!v) return 0
  const str = v.replace('R$', '').trim()
  const parsed = Number(str.replace(/\./g, '').replace(',', '.'))
  return isNaN(parsed) ? 0 : parsed
}

export default function BatchImportGoals({ user }: { user: any }) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lookups, setLookups] = useState<any>({})

  useEffect(() => {
    if (user?.role !== 'Administrador') return
    Promise.all([
      pb.collection('sellers').getFullList({ filter: 'is_active = true' }),
      pb.collection('regionals').getFullList({ filter: 'is_active = true' }),
      pb.collection('areas').getFullList({ filter: 'is_active = true' }),
      pb.collection('districts').getFullList({ filter: 'is_active = true' }),
    ]).then(([s, r, a, d]) => setLookups({ sellers: s, regionals: r, areas: a, districts: d }))
  }, [user])

  const downloadExcel = () => {
    const date = new Date().toISOString().split('T')[0]
    const filename = `Modelo_Metas_${date}.xls`
    const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Metas">
    <Table>
      <Row>${expected.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
      <Row>${sampleRow.map((v) => `<Cell><Data ss:Type="String">${v}</Data></Cell>`).join('')}</Row>
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Instruções">
    <Table>
      <Row><Cell><Data ss:Type="String">Instruções de Preenchimento</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">1. As colunas de faturamento (7 a 10) devem estar no formato R$ X.XXX,XX.</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">2. A coluna Família aceita "F1", "F2", "F3", etc., ou "Outros".</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">3. A ordem das 18 colunas não pode ser alterada.</Data></Cell></Row>
    </Table>
  </Worksheet>
</Workbook>`

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCsv = () => {
    const date = new Date().toISOString().split('T')[0]
    const filename = `Modelo_Metas_${date}.csv`
    const csv = expected.join(';') + '\n' + sampleRow.join(';')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const openGoogleSheets = () => {
    window.open('https://docs.google.com/spreadsheets/create', '_blank')
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setStep(2)
    try {
      const text = await selected.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) throw new Error('Arquivo vazio ou sem dados.')

      const delimiter = lines[0].includes(';') ? ';' : ','
      const headers = parseCsvLine(lines[0], delimiter)

      if (headers.length !== 18 || !expected.every((h, i) => headers[i] === h)) {
        throw new Error(
          `Erro: Planilha inválida. Esperado 18 colunas com nomes EXATOS. Sua planilha tem ${headers.length} colunas.`,
        )
      }

      const errs: string[] = []
      const data: any[] = []
      const keys = new Set<string>()
      const currRegex = /^R\$\s?\d{1,3}(\.\d{3})*,\d{2}$/

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i], delimiter)

        while (row.length < 18) row.push('')

        if (row.some((c) => !c)) {
          errs.push(`Erro na linha ${i + 1}: Todos os 18 campos são obrigatórios.`)
          continue
        }

        const [
          vendedor,
          area,
          reg,
          dist,
          periodo,
          metricaFat,
          baseFat,
          broFat,
          praFat,
          ouroFat,
          familia,
          frota,
          emp,
          metricaFam,
          baseFam,
          broFam,
          praFam,
          ouroFam,
        ] = row

        if (
          !currRegex.test(baseFat) ||
          !currRegex.test(broFat) ||
          !currRegex.test(praFat) ||
          !currRegex.test(ouroFat)
        ) {
          errs.push(`Erro na linha ${i + 1}: Colunas 7 a 10 devem estar no formato R$ X.XXX,XX.`)
          continue
        }

        if (!/^F\d+$/i.test(familia) && familia.toLowerCase() !== 'outros') {
          errs.push(`Erro na linha ${i + 1}: Família deve ser 'F1', 'F2', etc., ou 'Outros'.`)
          continue
        }

        const nBaseFat = parseNum(baseFat),
          nBroFat = parseNum(broFat),
          nPraFat = parseNum(praFat),
          nOuroFat = parseNum(ouroFat)
        const nBaseFam = parseNum(baseFam),
          nBroFam = parseNum(broFam),
          nPraFam = parseNum(praFam),
          nOuroFam = parseNum(ouroFam)
        const nFrota = parseNum(frota),
          nEmp = parseNum(emp)

        if (
          [
            nBaseFat,
            nBroFat,
            nPraFat,
            nOuroFat,
            nBaseFam,
            nBroFam,
            nPraFam,
            nOuroFam,
            nFrota,
            nEmp,
          ].some(isNaN)
        ) {
          errs.push(`Erro na linha ${i + 1}: Valores numéricos inválidos.`)
          continue
        }

        if (nBaseFat <= 0 || nBroFat <= 0 || nPraFat <= 0 || nOuroFat <= 0)
          errs.push(`Erro na linha ${i + 1}: Metas de Faturamento devem ser maiores que 0.`)
        if (nBaseFam <= 0 || nBroFam <= 0 || nPraFam <= 0 || nOuroFam <= 0)
          errs.push(`Erro na linha ${i + 1}: Metas de Família devem ser maiores que 0.`)
        if (nFrota < 0 || nEmp < 0)
          errs.push(`Erro na linha ${i + 1}: Frotas e Empresas foco devem ser >= 0.`)

        if (!(nBroFat < nPraFat && nPraFat < nOuroFat))
          errs.push(
            `Erro na linha ${i + 1}: Lógica de metas de faturamento inválida (Bronze < Prata < Ouro).`,
          )
        if (!(nBroFam < nPraFam && nPraFam < nOuroFam))
          errs.push(
            `Erro na linha ${i + 1}: Lógica de metas de família inválida (Bronze < Prata < Ouro).`,
          )

        if (metricaFat === metricaFam) {
          errs.push(
            `Erro na linha ${i + 1}: Os nomes das métricas (Faturamento e Família) devem ser diferentes entre si.`,
          )
        }

        const key = `${vendedor}-${area}-${reg}-${dist}-${periodo}-${familia}`
        if (keys.has(key)) {
          errs.push(
            `Erro na linha ${i + 1}: Duplicidade encontrada para a combinação (Vendedor, Área, Regional, Distrito, Período, Família).`,
          )
          continue
        }
        keys.add(key)

        const rObj = lookups.regionals?.find((x: any) => x.name.toLowerCase() === reg.toLowerCase())
        const dObj = lookups.districts?.find(
          (x: any) => x.name.toLowerCase() === dist.toLowerCase(),
        )
        const aObj = lookups.areas?.find((x: any) => x.name.toLowerCase() === area.toLowerCase())
        const sObj = lookups.sellers?.find(
          (x: any) => x.name.toLowerCase() === vendedor.toLowerCase(),
        )

        if (!sObj)
          errs.push(`Erro na linha ${i + 1}: Vendedor '${vendedor}' não encontrado no sistema.`)
        if (!rObj) errs.push(`Erro na linha ${i + 1}: Regional '${reg}' não encontrada no sistema.`)
        if (!dObj)
          errs.push(`Erro na linha ${i + 1}: Distrito '${dist}' não encontrado no sistema.`)
        if (!aObj) errs.push(`Erro na linha ${i + 1}: Área '${area}' não encontrada no sistema.`)

        if (sObj && !sObj.user_id) {
          errs.push(
            `Erro na linha ${i + 1}: Vendedor '${vendedor}' não possui um usuário associado.`,
          )
        }

        if (!rObj || !dObj || !aObj || !sObj || !sObj.user_id) {
          continue
        }

        data.push({
          vendedor,
          area,
          regional: reg,
          distrito: dist,
          seller_id: sObj.user_id,
          regional_id: rObj.id,
          area_id: aObj.id,
          periodo,
          metricaFat,
          baseFat: nBaseFat,
          broFat: nBroFat,
          praFat: nPraFat,
          ouroFat: nOuroFat,
          metricaFam,
          baseFam: nBaseFam,
          broFam: nBroFam,
          praFam: nPraFam,
          ouroFam: nOuroFam,
          familia,
          frota: nFrota,
          emp: nEmp,
        })
      }

      setErrors(errs)
      setPreview(errs.length ? [] : data)
      setStep(3)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
      setStep(1)
    }
  }

  const confirmImport = async () => {
    setIsSubmitting(true)
    try {
      const payloadRows = preview.map((p: any) => ({
        seller_id: p.seller_id,
        regional_id: p.regional_id,
        area_id: p.area_id,
        period: p.periodo,
        metrica1: p.metricaFat,
        base1: p.baseFat,
        bronze1: p.broFat,
        prata1: p.praFat,
        ouro1: p.ouroFat,
        metrica2: p.metricaFam,
        base2: p.baseFam,
        bronze2: p.broFam,
        prata2: p.praFam,
        ouro2: p.ouroFam,
        familia: p.familia,
        frotas: p.frota,
        cnpjs: p.emp,
      }))

      const res = await pb.send('/backend/v1/import-goals', {
        method: 'POST',
        body: JSON.stringify({
          rows: payloadRows,
          fileName: file?.name,
          source: 'Lote (18 Colunas)',
        }),
      })

      toast({
        title: 'Sucesso',
        description: `${res.created + res.updated} metas importadas/atualizadas com sucesso para ${preview.length} linhas de contexto.`,
      })
      setStep(1)
      setFile(null)
      setPreview([])
    } catch (e: any) {
      toast({
        title: 'Erro ao importar',
        description: `Erro ao salvar no banco: ${e.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (user?.role !== 'Administrador') {
    return (
      <div className="bg-card border rounded-xl p-12 text-center shadow-sm">
        <UploadCloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          A importação em lote está disponível apenas para Administradores.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Importar Metas (18 Colunas)</h2>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-muted/30 p-6 rounded-lg border border-dashed">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              MODELO PADRÃO DA PLANILHA
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Baixe o modelo de planilha com as 18 colunas exatas. A ordem e o nome das colunas não
              devem ser alterados. Valores de faturamento exigem formato R$ X.XXX,XX.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadExcel} className="gap-2">
                <Download className="w-4 h-4" /> Baixar em Excel
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCsv} className="gap-2">
                <Download className="w-4 h-4" /> Baixar em CSV
              </Button>
              <Button variant="outline" size="sm" onClick={openGoogleSheets} className="gap-2">
                <ExternalLink className="w-4 h-4" /> Abrir Google Sheets
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Selecione o arquivo preenchido (.csv)</h3>
            <Input type="file" accept=".csv" onChange={handleFile} />
            <p className="text-sm text-muted-foreground mt-2">
              A planilha deve conter exatas 18 colunas, conforme o template acima. Cada linha gerará
              automaticamente 2 registros de meta (Faturamento Geral e Família).
            </p>
          </div>
        </div>
      )}

      {step === 2 && <p className="text-muted-foreground animate-pulse">Analisando arquivo...</p>}

      {step === 3 && (
        <div className="space-y-4">
          {errors.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Erros Encontrados ({errors.length})</AlertTitle>
              <AlertDescription className="max-h-64 overflow-y-auto mt-2">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="h-4 w-4 !text-green-600" />
                <AlertTitle>Arquivo Válido</AlertTitle>
                <AlertDescription>
                  {preview.length} linhas analisadas prontas para gerar/atualizar{' '}
                  {preview.length * 2} registros de meta.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setFile(null)
                  }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button onClick={confirmImport} disabled={isSubmitting}>
                  {isSubmitting ? 'Importando...' : 'Confirmar Importação'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
