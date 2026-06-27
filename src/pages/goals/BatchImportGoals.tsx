import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, UploadCloud, AlertTriangle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const EXPECTED_HEADERS = [
  'Distrito',
  'Regional',
  'Área',
  'Vendedor',
  'Período',
  'Métrica',
  'Família',
  'Frota Foco',
  'Empresa Foco',
  'Meta Base',
  'Meta Bronze',
  'Meta Prata',
  'Meta Ouro',
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
  const str = v.toString().replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

export default function BatchImportGoals() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [preview, setPreview] = useState<any[]>([])
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    setPreview([])
    setStatus('idle')

    if (f) {
      const text = await f.text()
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length > 1) {
        const delim = lines[0].includes(';') ? ';' : ','
        const headers = parseCsvLine(lines[0], delim)

        const previewData = lines.slice(1, 6).map((line) => {
          const vals = parseCsvLine(line, delim)
          const row: any = {}
          headers.forEach((h, i) => {
            row[h] = vals[i]
          })
          return row
        })
        setPreview(previewData)
      }
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setStatus('idle')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_name', file.name)
      formData.append('source', 'goals')
      formData.append('status', 'pending')
      formData.append('user_id', pb.authStore.record?.id || '')

      await pb.collection('import_history').create(formData)

      setStatus('success')
      toast({ title: 'Sucesso', description: 'Arquivo enviado para processamento.' })
      setFile(null)
      setPreview([])

      // Reset the file input element visually
      const input = document.getElementById('csv-upload') as HTMLInputElement
      if (input) input.value = ''
    } catch (e: any) {
      console.error(e)
      setStatus('error')
      toast({
        title: 'Erro',
        description: e.message || 'Falha ao importar.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Importação em Lote</h1>
      </div>

      <div className="grid gap-6 grid-cols-1">
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
          <h3 className="text-lg font-medium mb-4">Upload de Metas (CSV)</h3>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>

            {preview.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  Pré-visualização (5 primeiras linhas)
                </h4>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(preview[0])
                          .slice(0, 8)
                          .map((k) => (
                            <TableHead key={k}>{k}</TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, i) => (
                        <TableRow key={i}>
                          {Object.keys(row)
                            .slice(0, 8)
                            .map((k) => (
                              <TableCell
                                key={k}
                                className="whitespace-nowrap truncate max-w-[150px]"
                              >
                                {row[k]}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="w-full md:w-auto mt-4"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              {loading ? 'Enviando...' : 'Importar Arquivo'}
            </Button>

            {status === 'success' && (
              <Alert className="bg-green-50 text-green-900 border-green-200 mt-4">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Arquivo recebido</AlertTitle>
                <AlertDescription>
                  A importação está sendo processada em segundo plano. Verifique o histórico de
                  importações para acompanhar o status.
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>
                  Ocorreu um erro ao enviar o arquivo. Tente novamente.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
