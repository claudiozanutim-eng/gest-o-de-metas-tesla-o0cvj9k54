import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, UploadCloud } from 'lucide-react'

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
      const expected = [
        'Vendedor',
        'Area',
        'Regional',
        'Distrito',
        'periodo',
        'Métrica',
        'Base',
        'Bronze',
        'Prata',
        'Ouro',
        'familia',
        'Frota Foco da Área',
        'Empresas Foco da Área',
        'Métrica',
        'Base',
        'Bronze',
        'Prata',
        'Ouro',
      ]

      const headers = lines[0].split(/[;,]/).map((h) => h.trim().replace(/^"|"$/g, ''))

      if (headers.length !== 18 || !expected.every((h, i) => headers[i] === h)) {
        throw new Error(
          'Erro: Planilha inválida. Esperado 18 colunas com nomes exatos: Vendedor, Area, Regional, Distrito, periodo, Métrica, Base, Bronze, Prata, Ouro, familia, Frota Foco da Área, Empresas Foco da Área, Métrica, Base, Bronze, Prata, Ouro.',
        )
      }

      const errs: string[] = []
      const data: any[] = []

      for (let i = 1; i < lines.length; i++) {
        const rawRow = lines[i].split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ''))
        const row = Array.from({ length: 18 }, (_, idx) => rawRow[idx] || '')

        const [
          vendedor,
          area,
          reg,
          dist,
          periodo,
          metrica1,
          base1,
          bronze1,
          prata1,
          ouro1,
          familia,
          frota,
          emp,
          metrica2,
          base2,
          bronze2,
          prata2,
          ouro2,
        ] = row

        let hasEmpty = false
        for (let col = 0; col < 18; col++) {
          if (!row[col]) {
            errs.push(
              `Erro na linha ${i + 1}: Campo '${expected[col]}' (coluna ${col + 1}) está vazio.`,
            )
            hasEmpty = true
          }
        }
        if (hasEmpty) continue

        const nBase1 = Number(base1),
          nBro1 = Number(bronze1),
          nPra1 = Number(prata1),
          nOuro1 = Number(ouro1)
        const nBase2 = Number(base2),
          nBro2 = Number(bronze2),
          nPra2 = Number(prata2),
          nOuro2 = Number(ouro2)

        if (
          isNaN(nBase1) ||
          isNaN(nBro1) ||
          isNaN(nPra1) ||
          isNaN(nOuro1) ||
          isNaN(nBase2) ||
          isNaN(nBro2) ||
          isNaN(nPra2) ||
          isNaN(nOuro2) ||
          nBase1 < 0 ||
          nBro1 < 0 ||
          nPra1 < 0 ||
          nOuro1 < 0 ||
          nBase2 < 0 ||
          nBro2 < 0 ||
          nPra2 < 0 ||
          nOuro2 < 0
        ) {
          errs.push(
            `Erro na linha ${i + 1}: Valores de meta (Base, Bronze, Prata, Ouro) devem ser números positivos.`,
          )
          continue
        }

        if (!(nBro1 < nPra1 && nPra1 < nOuro1) || !(nBro2 < nPra2 && nPra2 < nOuro2)) {
          errs.push(
            `Erro na linha ${i + 1}: Lógica de metas inválida. Regra: Bronze < Prata < Ouro.`,
          )
          continue
        }

        const rObj = lookups.regionals?.find((x: any) => x.name.toLowerCase() === reg.toLowerCase())
        const dObj = lookups.districts?.find(
          (x: any) => x.name.toLowerCase() === dist.toLowerCase(),
        )
        const aObj = lookups.areas?.find((x: any) => x.name.toLowerCase() === area.toLowerCase())
        if (!rObj || !dObj || !aObj) {
          errs.push(
            `Erro na linha ${i + 1}: Regional, Distrito ou Área não encontrados no sistema. Verifique a grafia.`,
          )
          continue
        }

        data.push({
          rowNum: i + 1,
          vendedor,
          area,
          regional: reg,
          distrito: dist,
          periodo,
          metrica1,
          base1: nBase1,
          bronze1: nBro1,
          prata1: nPra1,
          ouro1: nOuro1,
          familia,
          frotas: frota,
          cnpjs: emp,
          metrica2,
          base2: nBase2,
          bronze2: nBro2,
          prata2: nPra2,
          ouro2: nOuro2,
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
      const res = await pb.send('/backend/v1/import-goals', {
        method: 'POST',
        body: JSON.stringify({
          rows: preview,
          fileName: file?.name || 'upload.csv',
          source: 'CSV',
        }),
      })

      if (res.errors > 0) {
        const errorMessages = res.errorDetails.map((e: any) => `Linha ${e.line}: ${e.error}`)
        setErrors(errorMessages)
        setStep(3)
        toast({
          title: 'Erro na importação',
          description: 'Foram encontrados erros durante a importação. Nenhuma meta foi salva.',
          variant: 'destructive',
        })
      } else {
        const periodoStr = preview.length > 0 ? preview[0].periodo : 'selecionado'
        toast({
          title: 'Sucesso',
          description: `${preview.length} metas importadas com sucesso para o período de ${periodoStr}.`,
        })
        setStep(1)
        setFile(null)
        setPreview([])
      }
    } catch (e: any) {
      toast({
        title: 'Erro ao importar',
        description: `Erro ao processar arquivo: ${e.message}`,
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
      <h2 className="text-xl font-semibold mb-4">Importar Metas</h2>
      {step === 1 && (
        <div className="space-y-4">
          <Input type="file" accept=".csv" onChange={handleFile} />
          <p className="text-sm text-muted-foreground">
            A planilha deve conter 18 colunas: Vendedor, Area, Regional, Distrito, periodo, Métrica,
            Base, Bronze, Prata, Ouro, familia, Frota Foco da Área, Empresas Foco da Área, Métrica,
            Base, Bronze, Prata, Ouro.
          </p>
        </div>
      )}
      {step === 2 && <p>Analisando arquivo...</p>}
      {step === 3 && (
        <div className="space-y-4">
          {errors.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Erros Encontrados</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
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
                  {preview.length} linhas prontas para importação.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setFile(null)
                  }}
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
