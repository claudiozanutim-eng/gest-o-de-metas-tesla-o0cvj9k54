import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GoalManualEntry from './GoalManualEntry'
import BatchImportGoals from './BatchImportGoals'

export default function GoalEntry() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lançamento de Metas</h1>
        <p className="text-muted-foreground">Gerencie e importe metas comerciais</p>
      </div>
      <Tabs defaultValue="manual" className="w-full">
        <TabsList>
          <TabsTrigger value="manual">Entrada Manual</TabsTrigger>
          <TabsTrigger value="batch">Importação em Lote</TabsTrigger>
        </TabsList>
        <TabsContent value="manual">
          <GoalManualEntry refreshTrigger={refreshTrigger} />
        </TabsContent>
        <TabsContent value="batch">
          <BatchImportGoals onImportSuccess={() => setRefreshTrigger((prev) => prev + 1)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
