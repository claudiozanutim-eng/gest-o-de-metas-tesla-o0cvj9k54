import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, UploadCloud, FileSpreadsheet } from 'lucide-react'

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
  'Métrica Cobertura',
  'Meta Base Cobertura Mensal',
  'Meta Bronze Cobertura Mensal',
  'Meta Prata Cobertura Mensal',
  'Meta Ouro Cobertura Mensal',
]

const templateCsv = encodeURI('data:text/csv;charset=utf-8,' + expected.join(';') + '\n')

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

const parseNum = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'))

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

      if (headers.length !== 23 || !expected.every((h, i) => headers[i] === h)) {
        throw new Error(
          `Erro: Planilha inválida. Esperado 23 colunas com nomes EXATOS. Sua planilha tem ${headers.length} colunas com nomes: [${headers.join(', ')}].`,
        )
      }

      const errs: string[] = []
      const data: any[] = []
      const keys = new Set<string>()

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i], delimiter)

        while (row.length < 23) row.push('')

        if (row.some((c) => !c)) {
          errs.push(`Erro na linha ${i + 1}: Todos os 23 campos são obrigatórios.`)
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
          metricaCob,
          baseCob,
          broCob,
          praCob,
          ouroCob,
        ] = row

        const nBaseFat = parseNum(baseFat),
          nBroFat = parseNum(broFat),
          nPraFat = parseNum(praFat),
          nOuroFat = parseNum(ouroFat)
        const nBaseFam = parseNum(baseFam),
          nBroFam = parseNum(broFam),
          nPraFam = parseNum(praFam),
          nOuroFam = parseNum(ouroFam)
        const nBaseCob = parseNum(baseCob),
          nBroCob = parseNum(broCob),
          nPraCob = parseNum(praCob),
          nOuroCob = parseNum(ouroCob)
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
            nBaseCob,
            nBroCob,
            nPraCob,
            nOuroCob,
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

        if ([nBaseCob, nBroCob, nPraCob, nOuroCob].some((v) => v < 0 || v > 100)) {
          errs.push(`Erro na linha ${i + 1}: Metas de Cobertura devem estar entre 0 e 100.`)
        }

        if (!(nBroFat < nPraFat && nPraFat < nOuroFat))
          errs.push(
            `Erro na linha ${i + 1}: Lógica de metas de faturamento inválida (Bronze < Prata < Ouro).`,
          )
        if (!(nBroFam < nPraFam && nPraFam < nOuroFam))
          errs.push(
            `Erro na linha ${i + 1}: Lógica de metas de família inválida (Bronze < Prata < Ouro).`,
          )
        if (!(nBroCob < nPraCob && nPraCob < nOuroCob))
          errs.push(
            `Erro na linha ${i + 1}: Lógica de metas de cobertura inválida (Bronze < Prata < Ouro).`,
          )

        if (metricaFat === metricaFam || metricaFat === metricaCob || metricaFam === metricaCob) {
          errs.push(
            `Erro na linha ${i + 1}: Os nomes das métricas (Faturamento, Família, Cobertura) devem ser diferentes entre si.`,
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

        if (!rObj || !dObj || !aObj || !sObj) {
          errs.push(
            `Erro na linha ${i + 1}: Vendedor, Regional, Distrito ou Área não encontrados no sistema. Verifique a grafia.`,
          )
          continue
        }
        if (!sObj.user_id) {
          errs.push(
            `Erro na linha ${i + 1}: Vendedor '${vendedor}' não possui um usuário vinculado no sistema.`,
          )
          continue
        }

        const baseRecord = {
          seller_id: sObj.user_id,
          regional_id: rObj.id,
          area_id: aObj.id,
          period: periodo,
        }

        data.push({
          record1: {
            ...baseRecord,
            metric: metricaFat,
            target_base: nBaseFat,
            target_bronze: nBroFat,
            target_prata: nPraFat,
            target_ouro: nOuroFat,
            mix_family: '',
            focus_fleet: 0,
            focus_companies: 0,
          },
          record2: {
            ...baseRecord,
            metric: metricaFam,
            target_base: nBaseFam,
            target_bronze: nBroFam,
            target_prata: nPraFam,
            target_ouro: nOuroFam,
            mix_family: familia,
            focus_fleet: nFrota,
            focus_companies: nEmp,
          },
          record3: {
            ...baseRecord,
            metric: metricaCob,
            target_base: nBaseCob,
            target_bronze: nBroCob,
            target_prata: nPraCob,
            target_ouro: nOuroCob,
            mix_family: '',
            focus_fleet: 0,
            focus_companies: 0,
          },
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
      const goalsToCreate = preview.flatMap((p: any) => [p.record1, p.record2, p.record3])

      const chunkSize = 90
      for (let i = 0; i < goalsToCreate.length; i += chunkSize) {
        const chunk = goalsToCreate.slice(i, i + chunkSize)
        const batch = pb.createBatch()
        chunk.forEach((record) => {
          batch.collection('goals').create(record)
        })
        await batch.send()
      }

      await pb.collection('import_history').create({
        user_id: user.id,
        source: 'CSV',
        file_name: file?.name || 'upload.csv',
        status: 'Concluído',
        stats: { total: preview.length, records: goalsToCreate.length },
      })

      toast({
        title: 'Sucesso',
        description: `${goalsToCreate.length} metas importadas com sucesso para ${preview.length} linhas de contexto.`,
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
      <h2 className="text-xl font-semibold mb-4">Importar Metas (23 Colunas)</h2>
      {step === 1 && (
        <div className="space-y-4">
          <Input type="file" accept=".csv" onChange={handleFile} />

          <div className="flex gap-6 mt-4">
            <a
              href={templateCsv}
              download="template_metas.csv"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <FileSpreadsheet className="w-4 h-4" /> Template CSV
            </a>
            <a
              href={templateCsv}
              download="template_metas.xlsx"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <FileSpreadsheet className="w-4 h-4" /> Template Excel
            </a>
            <a
              href={templateCsv}
              download="template_metas.tsv"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <FileSpreadsheet className="w-4 h-4" /> Template Google Sheets
            </a>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            A planilha deve conter exatas 23 colunas, conforme o template acima. Cada linha gerará
            automaticamente 3 registros de meta (Faturamento, Família, e Cobertura).
          </p>
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
                  {preview.length} linhas analisadas prontas para gerar {preview.length * 3}{' '}
                  registros de meta.
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
