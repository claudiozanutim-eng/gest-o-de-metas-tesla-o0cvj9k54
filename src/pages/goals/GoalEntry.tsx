import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { UploadCloud, FileSpreadsheet } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function GoalEntry() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sellers, setSellers] = useState<any[]>([])

  useEffect(() => {
    pb.collection('users')
      .getFullList({ filter: 'role = "Seller"' })
      .then(setSellers)
      .catch(console.error)
  }, [])

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const seller_id = formData.get('vendedor') as string
    const period = formData.get('periodo') as string
    const faturamento = Number(formData.get('faturamento'))
    const mix_f1 = Number(formData.get('mix_f1'))
    const mix_f2 = Number(formData.get('mix_f2'))
    const cobertura = Number(formData.get('cobertura'))

    try {
      const datePeriod = new Date(period + '-01T12:00:00.000Z').toISOString()

      if (faturamento > 0)
        await pb
          .collection('goals')
          .create({ seller_id, period: datePeriod, type: 'Revenue', target_value: faturamento })
      if (mix_f1 > 0)
        await pb
          .collection('goals')
          .create({ seller_id, period: datePeriod, type: 'Mix_F1', target_value: mix_f1 })
      if (mix_f2 > 0)
        await pb
          .collection('goals')
          .create({ seller_id, period: datePeriod, type: 'Mix_F2', target_value: mix_f2 })
      if (cobertura > 0)
        await pb
          .collection('goals')
          .create({ seller_id, period: datePeriod, type: 'Coverage', target_value: cobertura })

      toast({
        title: 'Meta lançada com sucesso',
        description: 'Os valores foram atualizados no sistema.',
      })
      e.currentTarget.reset()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao lançar meta',
        description: 'Verifique as permissões e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAllowedToEdit = user?.role === 'Administrator' || user?.role === 'Sales Assistant'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Lançamento de Metas</h1>
        <p className="text-muted-foreground">Defina os objetivos para vendedores e áreas.</p>
      </div>

      {!isAllowedToEdit && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Você não tem permissão para lançar metas.
        </div>
      )}

      {isAllowedToEdit && (
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Entrada Manual</TabsTrigger>
            <TabsTrigger value="lote">Importação em Lote</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Nova Meta Individual</CardTitle>
                <CardDescription>
                  Preencha os dados para lançar a meta de um vendedor específico.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="periodo">Período</Label>
                      <Input
                        id="periodo"
                        name="periodo"
                        type="month"
                        defaultValue="2026-06"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendedor">Vendedor</Label>
                      <Select name="vendedor" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {sellers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name || s.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="faturamento">Meta de Faturamento (R$)</Label>
                    <Input
                      id="faturamento"
                      name="faturamento"
                      type="number"
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="mix_f1">Meta Mix F1 (%)</Label>
                      <Input
                        id="mix_f1"
                        name="mix_f1"
                        type="number"
                        placeholder="0"
                        defaultValue="40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mix_f2">Meta Mix F2 (%)</Label>
                      <Input
                        id="mix_f2"
                        name="mix_f2"
                        type="number"
                        placeholder="0"
                        defaultValue="30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cobertura">Cobertura (%)</Label>
                      <Input
                        id="cobertura"
                        name="cobertura"
                        type="number"
                        placeholder="0"
                        defaultValue="100"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Salvando...' : 'Salvar Meta'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lote">
            <Card>
              <CardHeader>
                <CardTitle>Importação via Planilha</CardTitle>
                <CardDescription>Faça o upload de um arquivo Excel/CSV.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <UploadCloud className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">Arraste seu arquivo aqui</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    ou clique para procurar (.xlsx, .csv)
                  </p>
                  <Button variant="outline">Selecionar Arquivo</Button>
                </div>
                <div className="mt-6 flex items-start gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Modelo Padrão
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Baixe a planilha modelo com a estrutura correta.
                    </p>
                    <Button
                      variant="link"
                      className="px-0 h-auto text-blue-600 dark:text-blue-400 mt-2"
                    >
                      Baixar Modelo.xlsx
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
