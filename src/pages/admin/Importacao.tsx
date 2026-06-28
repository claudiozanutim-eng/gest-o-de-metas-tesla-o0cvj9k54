import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  History,
  Download,
  Trash2,
  UploadCloud,
  FileText,
  XCircle,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
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

export default function Importacao() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [historyToDelete, setHistoryToDelete] = useState<any>(null)

  const loadHistory = async () => {
    try {
      const hist = await pb
        .collection('import_history')
        .getList(1, 10, { sort: '-created', expand: 'user_id' })
      setImportHistory(hist.items)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
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
    if (format === 'csv') {
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
    } else {
      const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Modelo"><Table><Row>${TEMPLATE_HEADERS.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row><Row>${example.map((v) => `<Cell><Data ss:Type="String">${v}</Data></Cell>`).join('')}</Row></Table></Worksheet></Workbook>`
      const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'modelo_metas.xls'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const processFile = async (file: File) => {
    setLoading(true)
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
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsText(file)
        })
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
      setStep(2)
      loadHistory()
    } catch (err: any) {
      const errResponse = err?.response || {}
      if (
        errResponse.errors &&
        Array.isArray(errResponse.errors) &&
        errResponse.errors.length > 0
      ) {
        setResult({ success: false, errors: errResponse.errors })
        setStep(2)
      } else {
        toast({
          title: 'Erro na importação',
          description: err.message || 'Falha ao processar arquivo.',
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
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        processFile(file)
      } else {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, envie um arquivo .csv ou .xlsx',
          variant: 'destructive',
        })
      }
    }
  }

  const handleDeleteHistory = async () => {
    if (!historyToDelete) return
    try {
      await pb.collection('import_history').delete(historyToDelete.id)
      toast({ title: 'Item excluído com sucesso.' })
      setDeleteDialog(false)
      loadHistory()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir item', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          Importação de Metas
        </h1>
        <p className="text-muted-foreground">
          Baixe o modelo padrão, preencha com seus dados e envie para lançar metas de Faturamento e
          Cobertura.
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-8 animate-fade-in">
          <Card className="bg-muted/30 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">1. Baixe o Modelo Oficial</CardTitle>
              <CardDescription>
                A planilha deve conter exatamente as colunas padrão, sem mesclagens e com um
                registro completo por linha.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button onClick={() => downloadTemplate('xlsx')} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Download Modelo (.xlsx)
              </Button>
              <Button variant="outline" onClick={() => downloadTemplate('csv')} className="gap-2">
                <FileText className="w-4 h-4" /> Modelo (.csv)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Envie o Arquivo Preenchido</CardTitle>
              <CardDescription>
                O sistema validará as informações e lançará metas de Faturamento e Cobertura
                automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    <p className="text-sm font-medium text-primary">
                      Processando arquivo, aguarde...
                    </p>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Histórico de Importação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico encontrado.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Estatísticas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(h.created).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-green-500" />
                              {h.file_name}
                            </div>
                          </TableCell>
                          <TableCell>{h.expand?.user_id?.name || '-'}</TableCell>
                          <TableCell className="text-xs">
                            <span className="text-green-600 font-medium">
                              Fat: {h.stats?.faturamentoCount ?? h.stats?.created ?? 0}
                            </span>
                            {' | '}
                            <span className="text-blue-600 font-medium">
                              Cob: {h.stats?.coberturaCount ?? 0}
                            </span>
                            {h.stats?.errors?.length > 0 && (
                              <>
                                {' | '}
                                <span className="text-red-600 font-medium">
                                  Erros: {h.stats.errors.length}
                                </span>
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                h.status === 'Sucesso' &&
                                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                                h.status === 'Parcial' &&
                                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                                h.status === 'Falha' &&
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                              )}
                            >
                              {h.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {h.file && (
                                <a
                                  href={`${pb.baseURL}/api/files/import_history/${h.id}/${h.file}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center justify-center p-2"
                                  title="Baixar arquivo"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setHistoryToDelete(h)
                                  setDeleteDialog(true)
                                }}
                                title="Excluir histórico"
                                disabled={h.user_id !== user?.id && user?.role !== 'Administrador'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && result && (
        <div className="space-y-4 animate-fade-in-up">
          {result.success ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">
                  Importação Concluída com Sucesso!
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-2xl mx-auto">
                  <div className="bg-muted rounded-lg p-4 text-center border">
                    <div className="text-3xl font-bold text-primary">{result.totalRows}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mt-1">
                      Linhas Processadas
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center border">
                    <div className="text-3xl font-bold text-green-600">
                      {result.faturamentoCount}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mt-1">
                      Metas Faturamento
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center border">
                    <div className="text-3xl font-bold text-blue-600">{result.coberturaCount}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mt-1">
                      Metas Cobertura
                    </div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
                    <div className="text-3xl font-bold text-primary">{result.totalGoals}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mt-1">
                      Total no Sistema
                    </div>
                  </div>
                </div>
                {result.countVerified && (
                  <p className="text-sm text-green-600 mt-4">
                    ✓ Verificação de contagem: {result.totalGoals} metas = {result.expectedGoals}{' '}
                    esperadas
                  </p>
                )}
                <p className="text-muted-foreground mt-6">
                  As metas estão disponíveis em: <strong>Painel de Entrada Manual</strong> e{' '}
                  <strong>Dashboard</strong>.
                </p>
                <div className="mt-8">
                  <Button
                    onClick={() => {
                      setStep(1)
                      setResult(null)
                    }}
                    size="lg"
                    className="px-8"
                  >
                    Nova Importação
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="py-12 text-center">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">
                    Erro ao Lançar Metas
                  </h2>
                  <p className="text-muted-foreground mt-2">Nenhuma meta foi salva no sistema.</p>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-6 max-w-md mx-auto text-left bg-background rounded-lg border p-4 space-y-2">
                      <div>
                        <span className="font-semibold">Motivo:</span> {result.errors[0].message}
                      </div>
                      <div>
                        <span className="font-semibold">Linha afetada:</span>{' '}
                        {result.errors[0].line}
                      </div>
                      <div>
                        <span className="font-semibold">Campo com problema:</span>{' '}
                        {result.errors[0].field}
                      </div>
                      <div>
                        <span className="font-semibold">Valor recebido:</span>{' '}
                        {result.errors[0].value || '(vazio)'}
                      </div>
                    </div>
                  )}
                  <div className="mt-8">
                    <Button
                      onClick={() => {
                        setStep(1)
                        setResult(null)
                      }}
                      size="lg"
                      className="px-8"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {result.errors && result.errors.length > 0 && (
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> Todos os Erros de Validação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto rounded-md border border-red-100 dark:border-red-900 bg-background">
                      <Table>
                        <TableHeader className="bg-red-50/50 dark:bg-red-900/10 sticky top-0">
                          <TableRow>
                            <TableHead className="w-24">Linha</TableHead>
                            <TableHead className="w-32">Campo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Motivo da Falha</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.errors.map((err, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{err.line}</TableCell>
                              <TableCell className="font-medium">{err.field}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {err.value || '(vazio)'}
                              </TableCell>
                              <TableCell className="text-red-600 dark:text-red-400 font-medium text-sm">
                                {err.message}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este histórico?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHistory}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
