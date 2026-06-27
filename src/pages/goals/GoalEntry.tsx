import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GoalManualEntry from './GoalManualEntry'
import BatchImportGoals from './BatchImportGoals'
import GoalDashboard from './GoalDashboard'
import { useAuth } from '@/hooks/use-auth'

export default function GoalEntry() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Lançamento de Metas</h1>
        <p className="text-muted-foreground">
          Gerencie e acompanhe metas de faturamento e cobertura.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="dashboard">Visualização</TabsTrigger>
          <TabsTrigger value="manual">Entrada Manual</TabsTrigger>
          <TabsTrigger value="lote">Importação em Lote</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-0">
          <GoalDashboard />
        </TabsContent>
        <TabsContent value="manual" className="mt-0">
          <GoalManualEntry />
        </TabsContent>
        <TabsContent value="lote" className="mt-0">
          <BatchImportGoals user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
