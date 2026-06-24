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
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Upload, CheckCircle, FileSpreadsheet } from 'lucide-react'

export default function Importacao() {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = text.split('\n').filter((r) => r.trim().length > 0)
      if (rows.length < 2)
        return toast({ title: 'Arquivo inválido ou vazio', variant: 'destructive' })
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
    // Simulando processamento no backend
    setTimeout(() => {
      setLoading(false)
      setStep(3)
      toast({ title: 'Planilha processada com sucesso!' })
    }, 1500)
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
              Envie um arquivo .csv contendo colunas Vendedor, Distrito, Regional, Área, Período e
              Metas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <FileSpreadsheet className="w-16 h-16 text-muted-foreground" />
            <div className="w-full max-w-sm">
              <Label htmlFor="file" className="sr-only">
                Arquivo
              </Label>
              <Input id="file" type="file" accept=".csv" onChange={handleFileUpload} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Passo 2: Validação e Preview</span>
              <span className="text-sm font-normal text-muted-foreground">
                {data.length} linhas lidas
              </span>
            </CardTitle>
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
            {data.length > 10 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Exibindo as primeiras 10 linhas...
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4 bg-muted/20">
            <Button variant="outline" onClick={() => setStep(1)}>
              Cancelar
            </Button>
            <Button onClick={handleSync} disabled={loading}>
              {loading ? 'Processando...' : 'Aplicar e Sincronizar Metas'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <CheckCircle className="w-20 h-20 text-green-500" />
            <h2 className="text-2xl font-bold">Importação Concluída</h2>
            <p className="text-muted-foreground">
              Foram processadas e atualizadas {data.length} linhas com sucesso.
            </p>
            <Button onClick={() => setStep(1)} className="mt-4">
              Nova Importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
