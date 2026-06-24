import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Upload, CheckCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function Importacao() {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ updated: 0, created: 0, errors: 0 })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = text.split('\n').filter((r) => r.trim().length > 0)
      if (rows.length < 2) return toast({ title: 'Arquivo inválido', variant: 'destructive' })
      const h = rows[0].split(',').map((s) => s.trim())
      const d = rows.slice(1).map((r) => {
        const cols = r.split(',')
        const obj: any = {}
        h.forEach((header, i) => (obj[header] = cols[i]?.trim() || ''))
        return obj
      })
      setHeaders(h)
      setData(d)
      setStep(2)
    }
    reader.readAsText(file)
  }

  const handleSync = async () => {
    setLoading(true)
    let updated = 0,
      created = 0,
      errors = 0
    try {
      const users = await pb.collection('users').getFullList()
      const sellers = await pb.collection('sellers').getFullList()

      for (const row of data) {
        const vCode = row['Vendedor']
        const seller = sellers.find((s) => s.code === vCode)
        const sellerUserId = seller?.user_id || users.find((u) => u.email === vCode)?.id

        if (!sellerUserId) {
          errors++
          continue
        }

        const payload = {
          seller_id: sellerUserId,
          period: row['Período'] || '2026-07',
          metric: row['Métrica'] || 'Faturamento',
          target_base: Number(row['Base']) || 0,
          target_bronze: Number(row['Bronze']) || 0,
          target_prata: Number(row['Prata']) || 0,
          target_ouro: Number(row['Ouro']) || 0,
        }

        try {
          const existing = await pb
            .collection('goals')
            .getFirstListItem(
              `seller_id="${payload.seller_id}" && period="${payload.period}" && metric="${payload.metric}"`,
            )
          await pb.collection('goals').update(existing.id, payload)
          updated++
        } catch {
          await pb.collection('goals').create(payload)
          created++
        }
      }
      setStats({ updated, created, errors })
      setStep(3)
      toast({ title: 'Importação finalizada' })
    } catch (e: any) {
      toast({ title: 'Erro na sincronização', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Upload className="w-8 h-8" /> Importar Planilha
        </h1>
        <p className="text-muted-foreground">
          Importe dados de metas e performance de forma guiada.
        </p>
      </div>

      {step === 1 && (
        <Card className="border-dashed border-2">
          <CardHeader className="text-center">
            <CardTitle>Passo 1: Upload</CardTitle>
            <CardDescription>
              Envie um .csv com: Vendedor, Período, Métrica, Base, Bronze, Prata, Ouro
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-10">
            <div className="w-full max-w-sm">
              <Input type="file" accept=".csv" onChange={handleFileUpload} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Passo 2: Preview ({data.length} linhas)</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => (
                      <TableCell key={h}>{row[h]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4 bg-muted/20">
            <Button variant="outline" onClick={() => setStep(1)}>
              Cancelar
            </Button>
            <Button onClick={handleSync} disabled={loading}>
              {loading ? 'Processando...' : 'Sincronizar Metas Importadas'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <CheckCircle className="w-20 h-20 text-green-500" />
            <h2 className="text-2xl font-bold">Sincronização Concluída</h2>
            <p className="text-muted-foreground">
              Criados: {stats.created} | Atualizados: {stats.updated} | Erros: {stats.errors}
            </p>
            <Button
              onClick={() => {
                setStep(1)
                setData([])
              }}
            >
              Nova Importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
