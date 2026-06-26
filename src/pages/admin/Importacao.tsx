import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle,
  FileSpreadsheet,
  HardDrive,
  AlertTriangle,
  History,
  Download,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
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

const REQ_FIELDS = [
  {
    k: 'seller',
    l: 'Vendedor (Cód. ou Nome)',
    req: true,
    match: ['vendedor', 'cod', 'código', 'seller', 'vendedores', 'nome'],
  },
  { k: 'area', l: 'Área', req: true, match: ['area', 'área'] },
  { k: 'regional', l: 'Regional', req: true, match: ['regional'] },
  { k: 'district', l: 'Distrito (Opcional)', req: false, match: ['distrito', 'district'] },
  {
    k: 'period',
    l: 'Período',
    req: true,
    match: ['periodo', 'período', 'mês', 'mes', 'data', 'ano'],
  },
  { k: 'metric', l: 'Métrica', req: true, match: ['métrica', 'metrica', 'indicador', 'kpi'] },
  { k: 'target_base', l: 'Base', req: true, match: ['base', 'meta base'] },
  { k: 'target_bronze', l: 'Bronze', req: true, match: ['bronze', 'meta bronze'] },
  { k: 'target_prata', l: 'Prata', req: true, match: ['prata', 'meta prata', 'silver'] },
  { k: 'target_ouro', l: 'Ouro', req: true, match: ['ouro', 'meta ouro', 'gold'] },
  {
    k: 'mix_family',
    l: 'Família (Mix - Opcional)',
    req: false,
    match: ['familia', 'família', 'mix'],
  },
  { k: 'focus_fleet', l: 'Frotas (Opcional)', req: false, match: ['frota', 'frotas', 'fleet'] },
  {
    k: 'focus_companies',
    l: 'CNPJs (Opcional)',
    req: false,
    match: ['cnpj', 'cnpjs', 'empresas', 'cobertura'],
  },
  {
    k: 'actual_value',
    l: 'Realizado (Opcional)',
    req: false,
    match: ['realizado', 'atingido', 'resultado', 'venda', 'faturamento real'],
  },
]

export default function Importacao() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [source, setSource] = useState<'excel' | 'google' | null>(null)
  const [data, setData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [googleUrl, setGoogleUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const [users, setUsers] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [regionals, setRegionals] = useState<any[]>([])

  const [validatedData, setValidatedData] = useState<any[]>([])
  const [stats, setStats] = useState({ updated: 0, created: 0, errors: 0, entities_created: 0 })
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [errorDetails, setErrorDetails] = useState<any[]>([])
  const [importHistory, setImportHistory] = useState<any[]>([])

  const [deleteDialog, setDeleteDialog] = useState(false)
  const [historyToDelete, setHistoryToDelete] = useState<any>(null)

  const getTemplateHeaders = () => [
    'Vendedor',
    'Área',
    'Regional',
    'Distrito',
    'Período',
    'Métrica',
    'Base',
    'Bronze',
    'Prata',
    'Ouro',
    'Família',
    'Frotas',
    'CNPJs',
    'Realizado',
  ]

  const downloadCSV = () => {
    const headers = getTemplateHeaders().join(',')
    const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'modelo_metas.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadExcel = () => {
    const headers = getTemplateHeaders()
    const xml = `<?xml version="1.0"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:o="urn:schemas-microsoft-com:office:office"
     xmlns:x="urn:schemas-microsoft-com:office:excel"
     xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
     <Worksheet ss:Name="Modelo">
      <Table>
       <Row>
        ${headers.map((h: string) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}
       </Row>
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
    Promise.all([
      pb.collection('users').getFullList(),
      pb.collection('sellers').getFullList(),
      pb.collection('areas').getFullList(),
      pb.collection('regionals').getFullList(),
    ]).then(([u, s, a, r]) => {
      setUsers(u)
      setSellers(s)
      setAreas(a)
      setRegionals(r)
    })
    loadHistory()
  }, [])

  const autoMap = (h: string[]) => {
    const map: Record<string, string> = {}
    const used = new Set<string>()
    REQ_FIELDS.forEach((f) => {
      for (const header of h) {
        if (used.has(header)) continue
        const hl = header.toLowerCase()
        if (f.match.some((m) => hl.includes(m))) {
          map[f.k] = header
          used.add(header)
          break
        }
      }
    })
    setMapping(map)
  }

  const parseCSV = (text: string) => {
    const lines = []
    let currentLine = []
    let currentCell = ''
    let insideQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"' && insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === ',' && !insideQuotes) {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setUploadedFile(file)
    setLoading(true)

    try {
      if (file.name.endsWith('.xlsx')) {
        const reader = new FileReader()
        reader.onload = async (ev) => {
          try {
            const resultStr = ev.target?.result as string | undefined
            if (!resultStr) throw new Error('Falha ao ler arquivo')
            const base64 = resultStr.split(',')[1] || resultStr
            const res = await pb.send('/backend/v1/parse-excel', {
              method: 'POST',
              body: JSON.stringify({ data: base64 }),
              headers: { 'Content-Type': 'application/json' },
            })
            setData(res.data)
            setHeaders(res.headers)
            autoMap(res.headers)
            setStep(3)
          } catch (err: any) {
            toast({
              title: 'Erro ao processar Excel',
              description: err.message,
              variant: 'destructive',
            })
          } finally {
            setLoading(false)
          }
        }
        reader.readAsDataURL(file)
      } else {
        const reader = new FileReader()
        reader.onload = async (ev) => {
          try {
            const resultStr = ev.target?.result as string | undefined
            if (!resultStr) throw new Error('Falha ao ler arquivo')
            const { headers: parsedHeaders, data: parsedData } = parseCSV(resultStr)
            setData(parsedData)
            setHeaders(parsedHeaders)
            autoMap(parsedHeaders)
            setStep(3)
          } catch (err: any) {
            toast({
              title: 'Erro ao processar arquivo',
              description: err.message,
              variant: 'destructive',
            })
          } finally {
            setLoading(false)
          }
        }
        reader.readAsText(file)
      }
    } catch (err) {
      setLoading(false)
      toast({ title: 'Erro de leitura', variant: 'destructive' })
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

  const handleGoogleSheet = async () => {
    if (!googleUrl) return toast({ title: 'Insira a URL', variant: 'destructive' })
    setLoading(true)
    try {
      const res = await pb.send('/backend/v1/parse-google-sheets', {
        method: 'POST',
        body: JSON.stringify({ url: googleUrl }),
      })
      setFileName('Google Sheets Import')
      setData(res.data)
      setHeaders(res.headers)
      autoMap(res.headers)
      setStep(3)
    } catch (err: any) {
      toast({
        title: 'Erro ao conectar no Google Sheets',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const hasAccess = (uid: string) => {
    if (['Administrator', 'National Manager', 'Gerente Nacional'].includes(user?.role || ''))
      return true
    const tgt = users.find((u) => u.id === uid)
    if (!tgt) return false
    if (
      ['District Manager', 'Gerente Distrital'].includes(user?.role || '') &&
      tgt.district_id === user?.district_id
    )
      return true
    if (
      ['Regional Manager', 'Gerente Regional'].includes(user?.role || '') &&
      tgt.regional_id === user?.regional_id
    )
      return true
    return false
  }

  const pNum = (v: any) => {
    if (!v) return 0
    const str = String(v).trim()
    if (str.includes('.') && str.includes(',')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
    }
    if (str.includes(',')) {
      return parseFloat(str.replace(',', '.')) || 0
    }
    return parseFloat(str) || 0
  }

  const validate = () => {
    const v = data.map((r, i) => {
      const sellerValue = String(r[mapping.seller] || '').trim()
      const seller = sellers.find(
        (s) => s.code === sellerValue || s.name.toLowerCase() === sellerValue.toLowerCase(),
      )
      const userMatch = users.find(
        (u) =>
          u.email.toLowerCase() === sellerValue.toLowerCase() ||
          u.name.toLowerCase() === sellerValue.toLowerCase(),
      )

      const uid = seller?.user_id || userMatch?.id

      const targetBase = pNum(r[mapping.target_base])
      const targetBronze = pNum(r[mapping.target_bronze])
      const targetPrata = pNum(r[mapping.target_prata])
      const targetOuro = pNum(r[mapping.target_ouro])

      let err = null

      if (!sellerValue) err = 'Vendedor não identificado'
      else if (!r[mapping.period]) err = 'Período não identificado'
      else if (
        targetBase >= targetBronze ||
        targetBronze >= targetPrata ||
        targetPrata >= targetOuro
      ) {
        err = 'Inconsistência numérica (Base < Bronze < Prata < Ouro)'
      } else if (uid && !hasAccess(uid)) {
        err = 'Sem permissão para alterar metas deste vendedor'
      }

      // Resolve area and regional from map or fallback to existing user's data
      const mappedArea = r[mapping.area] ? String(r[mapping.area]).trim() : null
      const mappedRegional = r[mapping.regional] ? String(r[mapping.regional]).trim() : null

      if (!mappedArea && !uid) {
        if (!err) err = 'Área não mapeada e vendedor não existe'
      }
      if (!mappedRegional && !uid) {
        if (!err) err = 'Regional não mapeada e vendedor não existe'
      }

      return {
        row: r,
        map: {
          seller_value: sellerValue,
          area_name: mappedArea,
          regional_name: mappedRegional,
          district_name: mapping.district ? String(r[mapping.district]).trim() : null,
          seller_id: uid,
          period: String(r[mapping.period] || '').trim(),
          metric: String(r[mapping.metric] || '').trim(),
          target_base: targetBase,
          target_bronze: targetBronze,
          target_prata: targetPrata,
          target_ouro: targetOuro,
          mix_family: mapping.mix_family ? String(r[mapping.mix_family]).trim() : '',
          focus_fleet: mapping.focus_fleet ? pNum(r[mapping.focus_fleet]) : 0,
          focus_companies: mapping.focus_companies ? pNum(r[mapping.focus_companies]) : 0,
          actual_value: mapping.actual_value ? pNum(r[mapping.actual_value]) : null,
        },
        err,
        i: i + 1,
      }
    })
    setValidatedData(v)
    setStep(4)
  }

  const sync = async () => {
    setLoading(true)
    setProgress(0)
    let u = 0,
      c = 0,
      e = 0,
      entCreated = 0
    const errList = []

    for (let idx = 0; idx < validatedData.length; idx++) {
      const r = validatedData[idx]
      setProgress(Math.round((idx / validatedData.length) * 100))

      if (r.err) {
        e++
        errList.push({ line: r.i, error: r.err })
        continue
      }

      let distId = null
      if (r.map.district_name) {
        try {
          distId = (
            await pb.collection('districts').getFirstListItem(`name="${r.map.district_name}"`)
          ).id
        } catch {
          try {
            distId = (
              await pb
                .collection('districts')
                .create({ name: r.map.district_name, is_active: true })
            ).id
            entCreated++
          } catch {
            /* intentionally ignored */
          }
        }
      }

      let regId = null
      if (r.map.regional_name) {
        try {
          regId = (
            await pb.collection('regionals').getFirstListItem(`name="${r.map.regional_name}"`)
          ).id
        } catch {
          try {
            regId = (
              await pb
                .collection('regionals')
                .create({ name: r.map.regional_name, is_active: true, district_id: distId })
            ).id
            entCreated++
          } catch {
            /* intentionally ignored */
          }
        }
      }

      let areaId = null
      if (r.map.area_name) {
        try {
          areaId = (await pb.collection('areas').getFirstListItem(`name="${r.map.area_name}"`)).id
        } catch {
          try {
            areaId = (
              await pb.collection('areas').create({
                name: r.map.area_name,
                is_active: true,
                regional_id: regId,
                district_id: distId,
              })
            ).id
            entCreated++
          } catch {
            /* intentionally ignored */
          }
        }
      }

      let finalSellerId = r.map.seller_id
      if (!finalSellerId) {
        try {
          const fakeEmail = `${r.map.seller_value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}_${Date.now()}@tesla.com`
          const newU = await pb.collection('users').create({
            name: r.map.seller_value,
            email: fakeEmail,
            password: 'Skip@Password123',
            passwordConfirm: 'Skip@Password123',
            role: 'Seller',
            area_id: areaId,
            regional_id: regId,
            district_id: distId,
            is_active: true,
          })
          entCreated++
          finalSellerId = newU.id

          await pb.collection('sellers').create({
            name: r.map.seller_value,
            code: r.map.seller_value,
            area_id: areaId,
            user_id: newU.id,
            is_active: true,
          })
          entCreated++
        } catch (error: any) {
          e++
          errList.push({ line: r.i, error: `Falha ao criar vendedor: ${error?.message}` })
          continue
        }
      }

      const goalData = {
        seller_id: finalSellerId,
        period: r.map.period,
        metric: r.map.metric,
        target_base: r.map.target_base,
        target_bronze: r.map.target_bronze,
        target_prata: r.map.target_prata,
        target_ouro: r.map.target_ouro,
        mix_family: r.map.mix_family,
        focus_fleet: r.map.focus_fleet,
        focus_companies: r.map.focus_companies,
        regional_id: regId,
        area_id: areaId,
      }

      try {
        const ex = await pb
          .collection('goals')
          .getFirstListItem(
            `seller_id="${goalData.seller_id}" && period="${goalData.period}" && metric="${goalData.metric}"`,
          )
        await pb.collection('goals').update(ex.id, goalData)
        u++
      } catch {
        try {
          await pb.collection('goals').create(goalData)
          c++
        } catch (error: any) {
          e++
          errList.push({
            line: r.i,
            error: `Erro no DB (goals): ${error?.message || 'Falha ao salvar'}`,
          })
        }
      }

      if (r.map.actual_value !== null) {
        const perfData = {
          seller_id: finalSellerId,
          period: r.map.period,
          metric: r.map.metric,
          actual_value: r.map.actual_value,
          mix_family: r.map.mix_family,
          focus_fleet: r.map.focus_fleet,
          focus_companies: r.map.focus_companies,
        }
        try {
          const exPerf = await pb
            .collection('actual_performance')
            .getFirstListItem(
              `seller_id="${perfData.seller_id}" && period="${perfData.period}" && metric="${perfData.metric}"`,
            )
          await pb.collection('actual_performance').update(exPerf.id, perfData)
        } catch {
          try {
            await pb.collection('actual_performance').create(perfData)
          } catch (error: any) {
            e++
            errList.push({
              line: r.i,
              error: `Erro no DB (performance): ${error?.message || 'Falha ao salvar'}`,
            })
          }
        }
      }
    }

    setProgress(100)

    try {
      const form = new FormData()
      form.append('user_id', user?.id || '')
      form.append('source', source === 'excel' ? 'CSV' : 'Google Sheets')
      form.append('file_name', fileName)
      form.append(
        'stats',
        JSON.stringify({ updated: u, created: c, errors: e, entities_created: entCreated }),
      )
      form.append('status', e === 0 ? 'Sucesso' : c + u > 0 ? 'Parcial' : 'Falha')
      if (uploadedFile && source === 'excel') {
        form.append('file', uploadedFile)
      }
      await pb.collection('import_history').create(form)
    } catch (err) {
      console.error('History log failed', err)
    } finally {
      loadHistory()
    }

    setStats({ updated: u, created: c, errors: e, entities_created: entCreated })
    setErrorDetails(errList)
    setStep(5)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          Importação Inteligente
        </h1>
        <p className="text-muted-foreground">
          Importe metas comerciais mapeando sua planilha para o sistema automaticamente.
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-8 animate-fade-in">
          <Card className="bg-muted/30 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Modelos de Importação</CardTitle>
              <CardDescription>
                Baixe um modelo padronizado para preencher seus dados antes de importar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={downloadCSV} className="gap-2">
                <Download className="w-4 h-4" /> Baixar Modelo CSV
              </Button>
              <Button variant="outline" onClick={downloadExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Baixar Modelo Excel
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a
                  href="https://docs.google.com/spreadsheets/d/1X5X9M8b1s7e9E8b1s7e9E8b1s7e9E8b1s7e9E/copy"
                  target="_blank"
                  rel="noreferrer"
                >
                  <LinkIcon className="w-4 h-4" /> Modelo Google Sheets
                </a>
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              className="hover:border-primary cursor-pointer transition-colors group"
              onClick={() => {
                setSource('excel')
                setStep(2)
              }}
            >
              <CardHeader className="text-center py-10">
                <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Upload CSV</CardTitle>
                <CardDescription className="mt-2">Suporte para arquivos .csv</CardDescription>
              </CardHeader>
            </Card>
            <Card
              className="hover:border-primary cursor-pointer transition-colors group"
              onClick={() => {
                setSource('google')
                setStep(2)
              }}
            >
              <CardHeader className="text-center py-10">
                <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <HardDrive className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Google Sheets</CardTitle>
                <CardDescription className="mt-2">
                  Importe direto por URL compartilhada
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

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
                              {h.source === 'CSV' || h.source === 'Excel' ? (
                                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                              ) : (
                                <HardDrive className="h-4 w-4 text-blue-500" />
                              )}
                              {h.file_name}
                            </div>
                          </TableCell>
                          <TableCell>{h.expand?.user_id?.name || '-'}</TableCell>
                          <TableCell className="text-xs">
                            <span className="text-green-600">C: {h.stats?.created || 0}</span> |{' '}
                            <span className="text-blue-600">A: {h.stats?.updated || 0}</span> |{' '}
                            <span className="text-red-600">E: {h.stats?.errors || 0}</span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${h.status === 'Sucesso' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : h.status === 'Parcial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
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
                                disabled={h.user_id !== user?.id && user?.role !== 'Administrator'}
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

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este item?</AlertDialogTitle>
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

      {step === 2 && source === 'excel' && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Upload do Arquivo CSV / Excel</CardTitle>
            <CardDescription>Selecione um arquivo .csv ou .xlsx</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              className="max-w-sm"
              disabled={loading}
            />
            {loading && (
              <p className="text-sm text-muted-foreground animate-pulse">Processando arquivo...</p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>
              Voltar
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && source === 'google' && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Google Sheets (Integração via Link)</CardTitle>
            <CardDescription>
              Cole o link da sua planilha do Google Sheets. Certifique-se de que o acesso está como
              "Qualquer pessoa com o link".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL da Planilha</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="pl-9"
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button onClick={handleGoogleSheet} disabled={loading || !googleUrl}>
                  {loading ? 'Buscando...' : 'Carregar'}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>
              Voltar
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Mapeamento de Colunas</CardTitle>
            <CardDescription>
              O sistema identificou os cabeçalhos automaticamente. Confirme se os campos abaixo
              correspondem às colunas da sua planilha.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {REQ_FIELDS.map((f) => (
              <div key={f.k} className="space-y-1">
                <label className="text-sm font-medium flex items-center justify-between">
                  {f.l}
                  {f.req && <span className="text-red-500 text-xs">*Obrigatório</span>}
                </label>
                <Select
                  value={mapping[f.k] || 'none'}
                  onValueChange={(v) => setMapping((p) => ({ ...p, [f.k]: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger className={!mapping[f.k] && f.req ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Ignorar / Não mapeado --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4 bg-muted/20">
            <Button variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button onClick={validate} disabled={REQ_FIELDS.some((f) => f.req && !mapping[f.k])}>
              Validar Dados
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Revisão e Validação</CardTitle>
            <CardDescription>
              Foram identificados {validatedData.length} registros. Revise os alertas antes de
              confirmar a importação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="mb-6 space-y-2 p-4 border rounded bg-muted/50">
                <div className="flex justify-between text-sm font-medium">
                  <span>Aplicando metas no sistema...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            <div className="max-h-[400px] overflow-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Vendedor Identificado</TableHead>
                    <TableHead>Período / Métrica</TableHead>
                    <TableHead>Metas (Base - Ouro)</TableHead>
                    <TableHead>Status da Validação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validatedData.map((r) => (
                    <TableRow key={r.i} className={r.err ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                      <TableCell className="font-mono text-muted-foreground">{r.i}</TableCell>
                      <TableCell className="font-medium">
                        {r.map.seller_value}
                        {!r.map.seller_id && (
                          <span className="block text-xs text-blue-600">Será criado novo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="block font-medium">{r.map.period}</span>
                        <span className="text-xs text-muted-foreground">{r.map.metric}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        B: {r.map.target_base} | Br: {r.map.target_bronze}
                        <br />
                        P: {r.map.target_prata} | O: {r.map.target_ouro}
                      </TableCell>
                      <TableCell>
                        {r.err ? (
                          <span className="text-red-500 font-medium text-sm flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" /> {r.err}
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Pronto
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4">
            <Button variant="outline" onClick={() => setStep(3)} disabled={loading}>
              Voltar
            </Button>
            <Button
              onClick={sync}
              disabled={loading || !validatedData.some((r) => !r.err)}
              className="gap-2"
            >
              {loading ? 'Processando...' : 'Lançar Metas Automaticamente'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 5 && (
        <div className="space-y-4 animate-fade-in-up">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Importação Concluída</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                As metas foram lançadas no sistema e já estão refletindo no Dashboard e Relatórios.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-2xl mx-auto">
                <div className="bg-muted rounded p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.created}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Novas
                  </div>
                </div>
                <div className="bg-muted rounded p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.updated}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Atualizadas
                  </div>
                </div>
                <div className="bg-muted rounded p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.entities_created}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Entidades Criadas
                  </div>
                </div>
                <div className="bg-muted rounded p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Erros
                  </div>
                </div>
              </div>

              <div className="mt-8 space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setData([])
                    setValidatedData([])
                    setUploadedFile(null)
                    setGoogleUrl('')
                  }}
                >
                  Nova Importação
                </Button>
              </div>
            </CardContent>
          </Card>

          {errorDetails.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Registros não importados
                </CardTitle>
                <CardDescription>
                  As seguintes linhas da planilha apresentaram falhas durante a importação:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto rounded-md border border-red-100 dark:border-red-900 bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Linha</TableHead>
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
    </div>
  )
}
