import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, Activity, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Auditoria() {
  const [history, setHistory] = useState<any[]>([])
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadHistory = () => {
    pb.collection('import_history')
      .getList(1, 50, { sort: '-created', expand: 'user_id' })
      .then((res) => setHistory(res.items))
      .catch(() => {})
  }

  const loadDiagnostic = async () => {
    setLoading(true)
    try {
      const res = await pb.send('/backend/v1/audit/diagnostic', { method: 'GET' })
      setDiagnostic(res)
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
    loadDiagnostic()
  }, [])

  const runCleanup = async () => {
    if (!confirm('Tem certeza que deseja executar a limpeza de dados órfãos e correção de metas?'))
      return
    setLoading(true)
    try {
      await pb.send('/backend/v1/audit/cleanup', { method: 'POST' })
      toast({ title: 'Sucesso', description: 'Limpeza de órfãos e metas concluída.' })
      await loadDiagnostic()
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const runResetPartial = async () => {
    if (
      !confirm(
        'ATENÇÃO: Isso apagará TODAS as metas, performances, vendedores e usuários (exceto admins). A estrutura será mantida. Confirmar?',
      )
    )
      return
    if (prompt('Digite CONFIRMAR para prosseguir:') !== 'CONFIRMAR') return
    setLoading(true)
    try {
      await pb.send('/backend/v1/audit/reset-partial', { method: 'POST' })
      toast({ title: 'Sucesso', description: 'Reset parcial concluído com sucesso.' })
      await loadDiagnostic()
      loadHistory()
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const runResetFull = async () => {
    if (!confirm('PERIGO: Isso apagará TODO o banco de dados (exceto admins). Confirmar?')) return
    if (prompt('Digite DESTRUIR para prosseguir:') !== 'DESTRUIR') return
    setLoading(true)
    try {
      await pb.send('/backend/v1/audit/reset-full', { method: 'POST' })
      toast({ title: 'Sucesso', description: 'Reset total concluído com sucesso.' })
      await loadDiagnostic()
      loadHistory()
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getIntegrity = (total: number, issues: number) => {
    if (total === 0) return 100
    const pct = 100 - (issues / total) * 100
    return Math.max(0, Math.min(100, pct)).toFixed(1)
  }

  const DiagnosticCard = ({ title, count, issueCount, description, details }: any) => {
    const isError = issueCount > 0
    return (
      <Card
        className={cn(
          'transition-all',
          isError ? 'border-destructive/50 shadow-sm' : 'border-border',
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            {title}
            {isError ? (
              <AlertTriangle className="text-destructive w-5 h-5" />
            ) : (
              <CheckCircle2 className="text-green-500 w-5 h-5" />
            )}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Problemas</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  isError ? 'text-destructive' : 'text-green-500',
                )}
              >
                {issueCount || 0}
              </p>
            </div>
          </div>
          {isError && details && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
              {details}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ShieldAlert className="w-8 h-8" /> Auditoria & Integridade
        </h1>
        <p className="text-muted-foreground">
          Acompanhe as modificações, corrija inconsistências estruturais e gerencie o histórico.
        </p>
      </div>

      <Tabs defaultValue="diagnostic" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="diagnostic" className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> Diagnóstico do Sistema
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Histórico de Importação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostic" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-muted/30 border rounded-lg">
            <div>
              <h3 className="font-semibold text-lg">Painel de Correções</h3>
              <p className="text-sm text-muted-foreground">
                Utilize estas ferramentas para higienizar a base de dados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={runCleanup} disabled={loading} variant="default">
                Limpeza de Órfãos & Metas (Rec. Seguro)
              </Button>
              <Button
                onClick={runResetPartial}
                disabled={loading}
                variant="secondary"
                className="border-amber-500/50 text-amber-600 hover:bg-amber-50"
              >
                Reset Parcial (Dados)
              </Button>
              <Button onClick={runResetFull} disabled={loading} variant="destructive">
                Reset Total (Estrutura + Dados)
              </Button>
            </div>
          </div>

          {!diagnostic ? (
            <div className="p-10 text-center text-muted-foreground border rounded-lg">
              Carregando diagnóstico...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Integridade Usuários</p>
                    <p
                      className={cn(
                        'text-3xl font-bold',
                        Number(
                          getIntegrity(
                            diagnostic.totals.users,
                            diagnostic.issues.usersDuplicates + diagnostic.issues.usersOrphans,
                          ),
                        ) < 95
                          ? 'text-amber-500'
                          : 'text-green-500',
                      )}
                    >
                      {getIntegrity(
                        diagnostic.totals.users,
                        diagnostic.issues.usersDuplicates + diagnostic.issues.usersOrphans,
                      )}
                      %
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Integridade Vendedores</p>
                    <p
                      className={cn(
                        'text-3xl font-bold',
                        Number(
                          getIntegrity(
                            diagnostic.totals.sellers,
                            diagnostic.issues.sellersOrphans +
                              diagnostic.issues.sellersMissingHierarchy,
                          ),
                        ) < 95
                          ? 'text-amber-500'
                          : 'text-green-500',
                      )}
                    >
                      {getIntegrity(
                        diagnostic.totals.sellers,
                        diagnostic.issues.sellersOrphans +
                          diagnostic.issues.sellersMissingHierarchy,
                      )}
                      %
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Integridade Metas</p>
                    <p
                      className={cn(
                        'text-3xl font-bold',
                        Number(
                          getIntegrity(
                            diagnostic.totals.goals,
                            diagnostic.issues.goalsInvalidRefs +
                              diagnostic.issues.goalsDuplicates +
                              diagnostic.issues.goalsLogicViolations,
                          ),
                        ) < 95
                          ? 'text-amber-500'
                          : 'text-green-500',
                      )}
                    >
                      {getIntegrity(
                        diagnostic.totals.goals,
                        diagnostic.issues.goalsInvalidRefs +
                          diagnostic.issues.goalsDuplicates +
                          diagnostic.issues.goalsLogicViolations,
                      )}
                      %
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Integridade Desempenho</p>
                    <p
                      className={cn(
                        'text-3xl font-bold',
                        Number(
                          getIntegrity(
                            diagnostic.totals.performance,
                            diagnostic.issues.perfInvalidRefs,
                          ),
                        ) < 95
                          ? 'text-amber-500'
                          : 'text-green-500',
                      )}
                    >
                      {getIntegrity(
                        diagnostic.totals.performance,
                        diagnostic.issues.perfInvalidRefs,
                      )}
                      %
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DiagnosticCard
                  title="Usuários (Users)"
                  count={diagnostic.totals.users}
                  issueCount={diagnostic.issues.usersDuplicates + diagnostic.issues.usersOrphans}
                  description="Contas de acesso e autenticação."
                  details={`${diagnostic.issues.usersDuplicates} duplicados, ${diagnostic.issues.usersOrphans} órfãos sem vendedor vinculado.`}
                />
                <DiagnosticCard
                  title="Vendedores (Sellers)"
                  count={diagnostic.totals.sellers}
                  issueCount={
                    diagnostic.issues.sellersOrphans + diagnostic.issues.sellersMissingHierarchy
                  }
                  description="Entidades de vendas vinculadas aos usuários."
                  details={`${diagnostic.issues.sellersOrphans} sem usuário válido, ${diagnostic.issues.sellersMissingHierarchy} sem hierarquia.`}
                />
                <DiagnosticCard
                  title="Metas (Goals)"
                  count={diagnostic.totals.goals}
                  issueCount={
                    diagnostic.issues.goalsInvalidRefs +
                    diagnostic.issues.goalsDuplicates +
                    diagnostic.issues.goalsLogicViolations
                  }
                  description="Objetivos financeiros e de cobertura."
                  details={`${diagnostic.issues.goalsInvalidRefs} ref inválida, ${diagnostic.issues.goalsDuplicates} duplicadas, ${diagnostic.issues.goalsLogicViolations} erro de lógica.`}
                />
                <DiagnosticCard
                  title="Desempenho (Performance)"
                  count={diagnostic.totals.performance}
                  issueCount={diagnostic.issues.perfInvalidRefs}
                  description="Valores realizados por vendedor."
                  details={`${diagnostic.issues.perfInvalidRefs} com referências inválidas a metas ou vendedores.`}
                />
                <DiagnosticCard
                  title="Estrutura Regional"
                  count={
                    diagnostic.totals.regionals +
                    diagnostic.totals.districts +
                    diagnostic.totals.areas
                  }
                  issueCount={0}
                  description="Total de Distritos, Regionais e Áreas."
                  details={`0 problemas estruturais detectados.`}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Importação</CardTitle>
              <CardDescription>
                Registros de todas as importações de metas executadas no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Estatísticas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Nenhum registro de auditoria encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {format(new Date(record.created), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            {record.expand?.user_id?.name ||
                              record.expand?.user_id?.email ||
                              'Desconhecido'}
                          </TableCell>
                          <TableCell>{record.source}</TableCell>
                          <TableCell>{record.file_name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === 'Success'
                                  ? 'default'
                                  : record.status === 'Partial'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="text-green-600 font-medium">
                              C: {record.stats?.created || 0}
                            </span>{' '}
                            |{' '}
                            <span className="text-blue-600 font-medium">
                              A: {record.stats?.updated || 0}
                            </span>{' '}
                            |{' '}
                            <span className="text-red-600 font-medium">
                              E: {record.stats?.errors || 0}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
