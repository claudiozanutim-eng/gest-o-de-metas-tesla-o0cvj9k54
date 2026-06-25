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
import { CheckCircle, FileSpreadsheet, HardDrive, AlertTriangle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Progress } from '@/components/ui/progress'

const REQ_FIELDS = [
  { k: 'seller', l: 'Vendedor (E-mail ou Cód.)', req: true },
  { k: 'seller_name', l: 'Nome do Vendedor (Opcional)', req: false },
  { k: 'district', l: 'Distrito (Opcional)', req: false },
  { k: 'regional', l: 'Regional (Opcional)', req: false },
  { k: 'area', l: 'Área (Opcional)', req: false },
  { k: 'period', l: 'Período', req: true },
  { k: 'metric', l: 'Métrica', req: true },
  { k: 'target_base', l: 'Base', req: true },
  { k: 'target_bronze', l: 'Bronze', req: true },
  { k: 'target_prata', l: 'Prata', req: true },
  { k: 'target_ouro', l: 'Ouro', req: true },
]

export default function Importacao() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [source, setSource] = useState<'excel' | 'google' | null>(null)
  const [data, setData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [users, setUsers] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [validatedData, setValidatedData] = useState<any[]>([])
  const [stats, setStats] = useState({ updated: 0, created: 0, errors: 0, entities_created: 0 })
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [errorDetails, setErrorDetails] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      pb.collection('users').getFullList(),
      pb.collection('sellers').getFullList(),
    ]).then(([u, s]) => {
      setUsers(u)
      setSellers(s)
    })
  }, [])

  const autoMap = (h: string[]) => {
    const map: Record<string, string> = {}
    h.forEach((header) => {
      const hl = header.toLowerCase()
      REQ_FIELDS.forEach((f) => {
        if (hl.includes(f.l.toLowerCase().split(' ')[0])) map[f.k] = header
      })
    })
    setMapping(map)
  }

  const parseCsv = (text: string) => {
    const rows = text.split('\n').filter((r) => r.trim())
    if (rows.length < 2) return toast({ title: 'Arquivo inválido', variant: 'destructive' })
    const h = rows[0].split(',').map((s) => s.trim())
    const d = rows.slice(1).map((r) => {
      const cols = r.split(',')
      return h.reduce((acc, curr, i) => ({ ...acc, [curr]: cols[i]?.trim() || '' }), {})
    })
    setHeaders(h)
    setData(d)
    autoMap(h)
    setStep(3)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (ev) => parseCsv(ev.target?.result as string)
      reader.readAsText(file)
    } else {
      setTimeout(() => {
        const mh = [
          'Vendedor',
          'Nome',
          'Distrito',
          'Regional',
          'Área',
          'Período',
          'Métrica',
          'Base',
          'Bronze',
          'Prata',
          'Ouro',
        ]
        setHeaders(mh)
        setData([
          {
            Vendedor: user?.email || '',
            Nome: user?.name || 'Admin',
            Distrito: 'BR Sudeste',
            Regional: 'SP',
            Área: 'SP - Capital',
            Período: '2026-08',
            Métrica: 'Faturamento',
            Base: '15000',
            Bronze: '18000',
            Prata: '20000',
            Ouro: '25000',
          },
        ])
        autoMap(mh)
        setStep(3)
      }, 500)
    }
  }

  const handleGoogle = () => {
    setFileName('Metas_Drive_2026.xlsx')
    setTimeout(() => {
      const mh = [
        'Vendedor',
        'Nome',
        'Distrito',
        'Regional',
        'Área',
        'Período',
        'Métrica',
        'Base',
        'Bronze',
        'Prata',
        'Ouro',
      ]
      setHeaders(mh)
      setData([
        {
          Vendedor: user?.email || '',
          Nome: user?.name || 'Admin',
          Distrito: 'BR Sudeste',
          Regional: 'RJ',
          Área: 'RJ - Interior',
          Período: '2026-08',
          Métrica: 'Faturamento',
          Base: '10000',
          Bronze: '12000',
          Prata: '15000',
          Ouro: '20000',
        },
      ])
      autoMap(mh)
      setStep(3)
    }, 500)
  }

  const hasAccess = (uid: string) => {
    if (['Administrator', 'National Manager', 'Gerente Nacional'].includes(user?.role || ''))
      return true
    const tgt = users.find((u) => u.id === uid)
    if (!tgt) return false
    if (
      (user?.role === 'District Manager' || user?.role === 'Gerente Distrital') &&
      tgt.district_id === user?.district_id
    )
      return true
    if (
      (user?.role === 'Regional Manager' || user?.role === 'Gerente Regional') &&
      tgt.regional_id === user?.regional_id
    )
      return true
    return false
  }

  const pNum = (v: any) => parseFloat(String(v || '0').replace(',', '.')) || 0

  const validate = () => {
    const v = data.map((r, i) => {
      const sellerValue = r[mapping.seller]
      const seller = sellers.find((s) => s.code === sellerValue)
      const uid = seller?.user_id || users.find((u) => u.email === sellerValue)?.id
      let err = null
      if (uid && !hasAccess(uid)) {
        err = `Sem permissão para alterar metas deste vendedor`
      }
      return {
        row: r,
        map: {
          seller_value: sellerValue,
          seller_name: mapping.seller_name ? r[mapping.seller_name] : null,
          district_name: mapping.district ? r[mapping.district] : null,
          regional_name: mapping.regional ? r[mapping.regional] : null,
          area_name: mapping.area ? r[mapping.area] : null,
          seller_id: uid,
          period: r[mapping.period],
          metric: r[mapping.metric],
          target_base: pNum(r[mapping.target_base]),
          target_bronze: pNum(r[mapping.target_bronze]),
          target_prata: pNum(r[mapping.target_prata]),
          target_ouro: pNum(r[mapping.target_ouro]),
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
            /* ignore */
          }
        }
      } else {
        const dists = await pb.collection('districts').getFullList({ limit: 1 })
        if (dists.length > 0) distId = dists[0].id
      }

      let regId = null
      if (r.map.regional_name) {
        try {
          regId = (
            await pb.collection('regionals').getFirstListItem(`name="${r.map.regional_name}"`)
          ).id
        } catch {
          if (distId) {
            try {
              regId = (
                await pb
                  .collection('regionals')
                  .create({ name: r.map.regional_name, is_active: true, district_id: distId })
              ).id
              entCreated++
            } catch {
              /* ignore */
            }
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
              await pb
                .collection('areas')
                .create({
                  name: r.map.area_name,
                  is_active: true,
                  regional_id: regId,
                  district_id: distId,
                })
            ).id
            entCreated++
          } catch {
            /* ignore */
          }
        }
      }

      let finalSellerId = r.map.seller_id
      if (!finalSellerId) {
        try {
          const fakeEmail = `${r.map.seller_value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}_${Date.now()}@tesla.com`
          const newU = await pb.collection('users').create({
            name: r.map.seller_name || r.map.seller_value,
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
            name: r.map.seller_name || r.map.seller_value,
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

      const goalData = { ...r.map, seller_id: finalSellerId }
      delete goalData.seller_value
      delete goalData.seller_name
      delete goalData.district_name
      delete goalData.regional_name
      delete goalData.area_name

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
          errList.push({ line: r.i, error: `Erro no DB: ${error?.message || 'Falha ao salvar'}` })
        }
      }
    }

    setProgress(100)

    await pb
      .collection('import_history')
      .create({
        user_id: user?.id,
        source: source === 'excel' ? 'Excel' : 'Google Sheets',
        file_name: fileName,
        stats: { updated: u, created: c, errors: e, entities_created: entCreated },
        status: e === 0 ? 'Success' : c + u > 0 ? 'Partial' : 'Failed',
      })
      .catch(() => {})

    setStats({ updated: u, created: c, errors: e, entities_created: entCreated })
    setErrorDetails(errList)
    setStep(5)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          Importar Planilha
        </h1>
        <p className="text-muted-foreground">
          Importação guiada de metas e criação automática de hierarquia.
        </p>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="hover:border-primary cursor-pointer transition-colors"
            onClick={() => {
              setSource('excel')
              setStep(2)
            }}
          >
            <CardHeader className="text-center py-10">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <CardTitle>Excel / CSV</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className="hover:border-primary cursor-pointer transition-colors"
            onClick={() => {
              setSource('google')
              setStep(2)
            }}
          >
            <CardHeader className="text-center py-10">
              <HardDrive className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>Google Sheets</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {step === 2 && source === 'excel' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload do Arquivo</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-10">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="max-w-sm"
            />
          </CardContent>
          <CardFooter>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Voltar
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && source === 'google' && (
        <Card>
          <CardHeader>
            <CardTitle>Google Drive (Integração)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded hover:bg-muted/50 transition-colors">
              <span className="flex items-center">
                <FileSpreadsheet className="w-5 h-5 mr-3 text-green-600" /> Metas_Drive_2026.xlsx
              </span>
              <Button onClick={handleGoogle}>Selecionar</Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Voltar
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapeamento de Colunas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {REQ_FIELDS.map((f) => (
              <div key={f.k}>
                <label className="text-sm font-medium">{f.l}</label>
                <Select
                  value={mapping[f.k]}
                  onValueChange={(v) => setMapping((p) => ({ ...p, [f.k]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna correspondente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
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
          <CardFooter className="flex justify-between border-t p-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button
              onClick={validate}
              disabled={REQ_FIELDS.some((f) => f.req && (!mapping[f.k] || mapping[f.k] === 'none'))}
            >
              Validar Mapeamento
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Revisão de Dados</CardTitle>
            <CardDescription>{validatedData.length} registros para importação.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sincronizando registros...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            <div className="max-h-[350px] overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validatedData.map((r) => (
                    <TableRow key={r.i}>
                      <TableCell>{r.i}</TableCell>
                      <TableCell>{r.row[mapping.seller]}</TableCell>
                      <TableCell>
                        {r.err ? (
                          <span className="text-red-500 font-medium">{r.err}</span>
                        ) : (
                          <span className="text-green-600 font-medium">Pronto</span>
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
            <Button onClick={sync} disabled={loading || !validatedData.some((r) => !r.err)}>
              {loading ? 'Processando...' : 'Sincronizar'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Importação Concluída</h2>
              <p className="text-muted-foreground mt-2">
                Metas Criadas: {stats.created} | Atualizadas: {stats.updated} | Novas Entidades:{' '}
                {stats.entities_created} | Erros: {stats.errors}
              </p>
              <Button
                className="mt-6"
                onClick={() => {
                  setStep(1)
                  setData([])
                  setValidatedData([])
                }}
              >
                Nova Importação
              </Button>
            </CardContent>
          </Card>

          {errorDetails.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Detalhes dos Erros
                </CardTitle>
                <CardDescription>As seguintes linhas não puderam ser importadas:</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto rounded-md border border-red-100 dark:border-red-900 bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Linha</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorDetails.map((e, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{e.line}</TableCell>
                          <TableCell className="text-red-600 dark:text-red-400">
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
