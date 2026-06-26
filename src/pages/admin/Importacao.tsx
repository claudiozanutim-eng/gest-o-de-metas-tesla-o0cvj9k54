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

const EXPECTED_HEADERS = [
  'vendedor',
  'area',
  'regional',
  'distrito',
  'periodo',
  'metrica',
  'base',
  'bronze',
  'prata',
  'ouro',
  'familia',
  'frotas',
  'cnpjs',
]

export default function Importacao() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState({ updated: 0, created: 0, errors: 0 })
  const [errorDetails, setErrorDetails] = useState<any[]>([])
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
    if (format === 'csv') {
      const header = EXPECTED_HEADERS.join(';')
      const example = [
        'João Silva',
        'Area 1',
        'Regional Sul',
        'Distrito 1',
        'Janeiro',
        'Faturamento',
        '1000',
        '1500',
        '2000',
        '2500',
        '',
        '0',
        '0',
      ].join(';')
      const blob = new Blob(['\ufeff' + header + '\n' + example], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'modelo_metas.csv'
      link.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = EXPECTED_HEADERS
      const xml = `<?xml version="1.0"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
       xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:x="urn:schemas-microsoft-com:office:excel"
       xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
       <Worksheet ss:Name="Modelo">
        <Table>
         <Row>${headers.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
         <Row>${['João Silva', 'Area 1', 'Regional Sul', 'Distrito 1', 'Janeiro', 'Faturamento', '1000', '1500', '2000', '2500', '', '0', '0'].map((v) => `<Cell><Data ss:Type="String">${v}</Data></Cell>`).join('')}</Row>
        </Table>
       </Worksheet>
      </Workbook>`

      const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'modelo_metas.xls'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const detectSeparator = (text: string) => {
    const firstLine = text.split('\n')[0] || ''
    const commas = (firstLine.match(/,/g) || []).length
    const semicolons = (firstLine.match(/;/g) || []).length
    return semicolons > commas ? ';' : ','
  }

  const parseCSV = (text: string) => {
    const lines = []
    let currentLine = []
    let currentCell = ''
    let insideQuotes = false
    const separator = detectSeparator(text)

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"' && insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === separator && !insideQuotes) {
        currentLine.push(currentCell)
        currentCell = ''
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
        if (char === '\r') i++
        currentLine.push(currentCell)
        lines.push(currentLine)
        currentLine = []
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    if (currentCell || currentLine.length > 0) {
      currentLine.push(currentCell)
      lines.push(currentLine)
    }

    const validLines = lines.filter((l) => l.some((cell) => cell.trim().length > 0))
    if (validLines.length < 2) throw new Error('Arquivo vazio ou sem dados')

    const headers = validLines[0].map((h) => h.trim())
    const data = validLines.slice(1).map((line) => {
      const row: any = {}
      headers.forEach((h, idx) => {
        row[h] = line[idx] !== undefined ? line[idx].trim() : ''
      })
      return row
    })

    return { headers, data }
  }

  const processFile = async (file: File) => {
    setLoading(true)
    try {
      let headers: string[] = []
      let data: any[] = []

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

      const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())
      const missing = EXPECTED_HEADERS.filter((eh) => !normalizedHeaders.includes(eh))
      if (missing.length > 0) {
        throw new Error(
          `A planilha não está no formato padrão. Colunas faltando: ${missing.join(', ')}`,
        )
      }

      const rows = data.map((row) => {
        const out: any = {}
        headers.forEach((h) => {
          const hNorm = h.trim().toLowerCase()
          if (EXPECTED_HEADERS.includes(hNorm)) {
            out[hNorm] = row[h]
          }
        })
        return out
      })

      const res = await pb.send('/backend/v1/import-goals', {
        method: 'POST',
        body: JSON.stringify({
          rows,
          fileName: file.name,
          source: file.name.endsWith('.csv') ? 'CSV' : 'Excel',
        }),
      })

      setStats({
        created: res.created || 0,
        updated: res.updated || 0,
        errors: res.errors || 0,
      })
      setErrorDetails(res.errorDetails || [])
      setStep(2)
      loadHistory()
    } catch (err: any) {
      toast({
        title: 'Erro na importação',
        description: err.message || 'Falha ao processar arquivo.',
        variant: 'destructive',
      })
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
          Faça o download do modelo padrão, preencha com seus dados e envie para atualizar as metas
          do sistema.
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
                <FileSpreadsheet className="w-4 h-4" /> Download Modelo Oficial (.xlsx)
              </Button>
              <Button variant="outline" onClick={() => downloadTemplate('csv')} className="gap-2">
                <FileText className="w-4 h-4" /> Modelo Alternativo (.csv)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Envie o Arquivo Preenchido</CardTitle>
              <CardDescription>
                O sistema validará as informações e lançará as metas automaticamente.
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
                              Criadas: {h.stats?.created || 0}
                            </span>{' '}
                            |{' '}
                            <span className="text-blue-600 font-medium">
                              Atualizadas: {h.stats?.updated || 0}
                            </span>{' '}
                            |{' '}
                            <span className="text-red-600 font-medium">
                              Erros: {h.stats?.errors || 0}
                            </span>
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
                                  title="Baixar arquivo original"
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

      {step === 2 && (
        <div className="space-y-4 animate-fade-in-up">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Importação Processada</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                O arquivo foi analisado e o banco de dados atualizado com as novas metas.
              </p>

              <div className="grid grid-cols-3 gap-4 mt-8 max-w-xl mx-auto">
                <div className="bg-muted rounded-lg p-4 text-center border">
                  <div className="text-3xl font-bold text-green-600">{stats.created}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                    Metas Criadas
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center border">
                  <div className="text-3xl font-bold text-blue-600">{stats.updated}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                    Atualizadas
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 text-center border border-red-100 dark:border-red-900">
                  <div className="text-3xl font-bold text-red-600">{stats.errors}</div>
                  <div className="text-xs font-medium text-red-600/70 uppercase tracking-wider mt-1">
                    Erros
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button onClick={() => setStep(1)} size="lg" className="px-8">
                  Nova Importação
                </Button>
              </div>
            </CardContent>
          </Card>

          {errorDetails.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Registros com Falha
                </CardTitle>
                <CardDescription className="text-red-600/80">
                  As seguintes linhas da planilha não puderam ser importadas devido a
                  inconsistências:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto rounded-md border border-red-100 dark:border-red-900 bg-background">
                  <Table>
                    <TableHeader className="bg-red-50/50 dark:bg-red-900/10 sticky top-0">
                      <TableRow>
                        <TableHead className="w-24">Linha (Excel)</TableHead>
                        <TableHead>Motivo da Falha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorDetails.map((e, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{e.line}</TableCell>
                          <TableCell className="text-red-600 dark:text-red-400 font-medium text-sm">
                            {e.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
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
