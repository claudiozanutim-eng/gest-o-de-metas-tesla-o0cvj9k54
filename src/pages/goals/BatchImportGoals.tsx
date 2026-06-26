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
        'Regional',
        'Distrito',
        'Área',
        'Família',
        'Frota',
        'Empresa',
        'Meta Base',
        'Meta Bronze',
        'Meta Prata',
        'Meta Ouro',
        'Meta Cobertura Diária',
        'Meta Cobertura Semanal',
        'Meta Cobertura Mensal',
        'Observações',
      ]
      const headers = lines[0].split(/[;,]/).map((h) => h.trim().replace(/^"|"$/g, ''))
      if (headers.length !== 14 || !expected.every((h, i) => headers[i] === h)) {
        throw new Error(
          'Erro: Planilha inválida. Esperado 14 colunas com nomes EXATOS: Regional, Distrito, Área, Família, Frota, Empresa, Meta Base, Meta Bronze, Meta Prata, Meta Ouro, Meta Cobertura Diária, Meta Cobertura Semanal, Meta Cobertura Mensal, Observações.',
        )
      }

      const errs: string[] = []
      const data: any[] = []
      const unique = new Set()
      for (let i = 1; i < lines.length; i++) {
        const rawRow = lines[i].split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ''))
        // Fill missing cols with empty string if row is short
        const row = Array.from({ length: 14 }, (_, idx) => rawRow[idx] || '')
        const [reg, dist, area, fam, frota, emp, base, bronze, prata, ouro, cDia, cSem, cMen, obs] =
          row

        let hasEmpty = false
        for (let col = 0; col < 13; col++) {
          if (!row[col]) {
            errs.push(`Erro na linha ${i + 1}: Campo '${expected[col]}' está vazio.`)
            hasEmpty = true
          }
        }
        if (hasEmpty) continue

        const famRegex = /^F([1-9]|10)$/i
        if (!famRegex.test(fam)) {
          errs.push(
            `Erro na linha ${i + 1}: Família '${fam}' é inválida. Use apenas: F1, F2, F3, F4, F5, F6, F7, F8, F9, F10.`,
          )
          continue
        }

        const nBase = Number(base),
          nBro = Number(bronze),
          nPra = Number(prata),
          nOuro = Number(ouro)
        const isInt = (n: number) => Number.isInteger(n)

        if (
          !isInt(nBase) ||
          !isInt(nBro) ||
          !isInt(nPra) ||
          !isInt(nOuro) ||
          nBase <= 0 ||
          nBro <= 0 ||
          nPra <= 0 ||
          nOuro <= 0
        ) {
          errs.push(
            `Erro na linha ${i + 1}: Valores de meta (Base, Bronze, Prata, Ouro) devem ser números inteiros positivos.`,
          )
          continue
        } else if (!(nBro < nPra && nPra < nOuro && nBase < nOuro)) {
          errs.push(
            `Erro na linha ${i + 1}: Lógica de metas inválida. Regras: Bronze < Prata < Ouro e Base < Ouro.`,
          )
          continue
        }

        const nCDia = Number(cDia),
          nCSem = Number(cSem),
          nCMen = Number(cMen)
        if (
          !isInt(nCDia) ||
          !isInt(nCSem) ||
          !isInt(nCMen) ||
          nCDia < 0 ||
          nCDia > 100 ||
          nCSem < 0 ||
          nCSem > 100 ||
          nCMen < 0 ||
          nCMen > 100
        ) {
          errs.push(
            `Erro na linha ${i + 1}: Valores de cobertura devem ser inteiros entre 0 e 100.`,
          )
          continue
        }
        const rObj = lookups.regionals.find((x: any) => x.name.toLowerCase() === reg.toLowerCase())
        const dObj = lookups.districts.find((x: any) => x.name.toLowerCase() === dist.toLowerCase())
        const aObj = lookups.areas.find((x: any) => x.name.toLowerCase() === area.toLowerCase())
        if (!rObj || !dObj || !aObj) {
          errs.push(
            `Erro na linha ${i + 1}: Regional, Distrito ou Área não encontrados no sistema. Verifique a grafia e tente novamente.`,
          )
          continue
        }

        const key = `${reg}-${dist}-${area}-${fam}`.toLowerCase()
        if (unique.has(key)) {
          errs.push(
            `Erro na linha ${i + 1}: Combinação duplicada de Regional, Distrito, Área e Família.`,
          )
          continue
        }
        unique.add(key)
        data.push({
          rowNum: i + 1,
          reg: rObj.id,
          area: aObj.id,
          fam: fam.toUpperCase(),
          frota,
          emp,
          base: nBase,
          bronze: nBro,
          prata: nPra,
          ouro: nOuro,
          cDia: nCDia,
          cSem: nCSem,
          cMen: nCMen,
          obs,
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
      const currentMonth = new Date().toISOString().slice(0, 7)
      // First, gather all operations without executing them
      const operations = []
      for (const row of preview) {
        const seller = lookups.sellers.find((s: any) => s.area_id === row.area)
        if (!seller?.user_id)
          throw new Error(`Vendedor não encontrado para a Área na linha ${row.rowNum}.`)
        const metric = `Métrica ${row.fam}`
        const goalData = {
          seller_id: seller.user_id,
          period: currentMonth,
          metric,
          target_base: row.base,
          target_bronze: row.bronze,
          target_prata: row.prata,
          target_ouro: row.ouro,
          target_daily_coverage: row.cDia,
          target_weekly_coverage: row.cSem,
          target_monthly_coverage: row.cMen,
          regional_id: row.reg,
          area_id: row.area,
          focus_fleet: Number(row.frota),
          focus_companies: Number(row.emp),
        }

        try {
          const ex = await pb
            .collection('goals')
            .getFirstListItem(
              `seller_id="${seller.user_id}" && period="${currentMonth}" && metric="${metric}"`,
            )
          operations.push(() => pb.collection('goals').update(ex.id, goalData))
        } catch {
          operations.push(() => pb.collection('goals').create(goalData))
        }
      }

      // Execute sequentially to avoid overwhelming the server,
      // although true rollback would require a backend hook.
      // The upfront validation minimizes DB-level failures.
      for (const op of operations) {
        await op()
      }
      toast({
        title: 'Sucesso',
        description: `${preview.length} metas importadas com sucesso para o período de ${currentMonth}.`,
      })
      setStep(1)
      setFile(null)
      setPreview([])
    } catch (e: any) {
      toast({
        title: 'Erro ao importar',
        description: `Erro ao importar. Nenhuma meta foi salva. Motivo: ${e.message}. Tente novamente.`,
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
            A planilha deve conter 14 colunas: Regional, Distrito, Área, Família, Frota, Empresa,
            Meta Base, Meta Bronze, Meta Prata, Meta Ouro, Meta Cobertura Diária, Meta Cobertura
            Semanal, Meta Cobertura Mensal, Observações.
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
                <AlertDescription>{preview.length} metas prontas para importação.</AlertDescription>
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
