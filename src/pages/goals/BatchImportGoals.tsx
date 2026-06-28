import { useState, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  UploadCloud,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Download,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  parseCSV,
  mapRowsToStandard,
  normalizeHeader,
  HEADER_MAP,
  TEMPLATE_HEADERS,
  REQUIRED_HEADERS,
} from '@/lib/csv-utils'

interface ImportResult {
  success: boolean
  totalRows?: number
  faturamentoCount?: number
  coberturaCount?: number
  totalGoals?: number
  expectedGoals?: number
  countVerified?: boolean
  errors?: Array<{ line: number; field: string; value: string; message: string }>
}

export default function BatchImportGoals({ onImportSuccess }: { onImportSuccess?: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const example = [
      'Distrito 1',
      'Regional Sul',
      'Area 1',
      'João Silva',
      '06/2026',
      'F1',
      '50',
      '100',
      '1000',
      '1500',
      '2000',
      '2500',
      '80',
    ]
    const header = TEMPLATE_HEADERS.join(';')
    const blob = new Blob(['\ufeff' + header + '\n' + example.join(';')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'modelo_metas.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (file: File) => {
    setLoading(true)
    setResult(null)
    setPreview([])
    try {
      let headers: string[] = []
      let data: Record<string, string>[] = []

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const cleanBase64 = base64.split(',')[1]
        const res = await pb.send('/backend/v1/parse-excel', {
          method: 'POST',
          body: JSON.stringify({ data: cleanBase64 }),
          headers: { 'Content-Type': 'application/json' },
        })
        headers = res.headers
        data = res.data
      } else {
        const text = await file.text()
        const parsed = parseCSV(text)
        headers = parsed.headers
        data = parsed.data
      }

      const mappedHeaders = headers.map((h) => HEADER_MAP[normalizeHeader(h)] || normalizeHeader(h))
      const missing = REQUIRED_HEADERS.filter((r) => !mappedHeaders.includes(r))
      if (missing.length > 0) {
        throw new Error(`Colunas obrigatórias faltando: ${missing.join(', ')}`)
      }

      const rows = mapRowsToStandard(headers, data)
      setPreview(rows.slice(0, 5))

      const res = await pb.send('/backend/v1/import-goals', {
        method: 'POST',
        body: JSON.stringify({
          rows,
          fileName: file.name,
          source: file.name.endsWith('.csv') ? 'CSV' : 'Excel',
        }),
      })

      setResult({
        success: true,
        totalRows: res.totalRows,
        faturamentoCount: res.faturamentoCount,
        coberturaCount: res.coberturaCount,
        totalGoals: res.totalGoals,
        expectedGoals: res.expectedGoals,
        countVerified: res.countVerified,
      })
      toast({ title: 'Sucesso', description: 'Metas importadas com sucesso!' })
      onImportSuccess?.()
    } catch (err: any) {
      const errResponse = err?.response || {}
      if (
        errResponse.errors &&
        Array.isArray(errResponse.errors) &&
        errResponse.errors.length > 0
      ) {
        setResult({ success: false, errors: errResponse.errors })
      } else {
        toast({
          title: 'Erro',
          description: err.message || 'Falha ao importar.',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        handleFile(file)
      } else {
        toast({
          title: 'Arquivo inválido',
          description: 'Envie um arquivo .csv ou .xlsx',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Importação em Lote</span>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <Download className="w-4 h-4" /> Modelo
            </Button>
          </CardTitle>
          <CardDescription>
            Envie uma planilha CSV ou Excel para lançar metas de Faturamento e Cobertura
            automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center transition-colors cursor-pointer text-center',
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-muted-foreground/30 hover:bg-muted/50',
              loading && 'opacity-50 pointer-events-none',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
          >
            {loading ? (
              <div className="space-y-4 w-full max-w-xs">
                <Progress value={undefined} className="h-2 w-full animate-pulse" />
                <p className="text-sm font-medium text-primary">Processando arquivo...</p>
              </div>
            ) : (
              <>
                <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="font-medium text-lg">Arraste e solte sua planilha aqui</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou clique para procurar (.csv, .xlsx)
                </p>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
            />
          </div>

          {preview.length > 0 && !result && (
            <div className="border rounded-md overflow-x-auto">
              <p className="text-sm font-medium text-muted-foreground p-2">
                Pré-visualização (5 primeiras linhas)
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(preview[0])
                      .slice(0, 6)
                      .map((k) => (
                        <TableHead key={k}>{k}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {Object.keys(row)
                        .slice(0, 6)
                        .map((k) => (
                          <TableCell key={k} className="whitespace-nowrap truncate max-w-[150px]">
                            {row[k]}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {result && result.success && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-400">
                Importação Concluída com Sucesso!
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-500">
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <strong>{result.totalRows}</strong> linhas processadas
                  </div>
                  <div>
                    <strong>{result.faturamentoCount}</strong> metas de Faturamento
                  </div>
                  <div>
                    <strong>{result.coberturaCount}</strong> metas de Cobertura
                  </div>
                  <div>
                    <strong>Total: {result.totalGoals}</strong> metas no sistema
                  </div>
                </div>
                {result.countVerified && (
                  <p className="mt-2 text-xs">
                    ✓ Verificação: {result.totalGoals} = {result.expectedGoals} esperadas
                  </p>
                )}
                <p className="mt-2 text-xs">
                  As metas estão disponíveis em: Painel de Entrada Manual e Dashboard.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {result && !result.success && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erro ao Lançar Metas. Nenhuma meta foi salva no sistema.</AlertTitle>
                <AlertDescription>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 space-y-1 text-sm">
                      <div>
                        <strong>Motivo:</strong> {result.errors[0].message}
                      </div>
                      <div>
                        <strong>Linha afetada:</strong> {result.errors[0].line}
                      </div>
                      <div>
                        <strong>Campo com problema:</strong> {result.errors[0].field}
                      </div>
                      <div>
                        <strong>Valor recebido:</strong> {result.errors[0].value || '(vazio)'}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
              {result.errors && result.errors.length > 1 && (
                <div className="max-h-[300px] overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-20">Linha</TableHead>
                        <TableHead className="w-32">Campo</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((err, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{err.line}</TableCell>
                          <TableCell className="font-medium">{err.field}</TableCell>
                          <TableCell className="text-sm">{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
