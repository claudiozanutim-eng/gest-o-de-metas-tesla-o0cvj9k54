import { useState } from 'react'
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
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from 'lucide-react'

export default function GoalEntry() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: 'Meta lançada com sucesso',
        description: 'Os valores foram atualizados no sistema.',
      })
    }, 1000)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Lançamento de Metas</h1>
        <p className="text-muted-foreground">Defina os objetivos para vendedores e áreas.</p>
      </div>

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
                    <Select defaultValue="2026-06">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2026-06">Junho/2026</SelectItem>
                        <SelectItem value="2026-07">Julho/2026</SelectItem>
                        <SelectItem value="2026-08">Agosto/2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendedor">Vendedor</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="v1">João Silva (Curitiba)</SelectItem>
                        <SelectItem value="v2">Maria Santos (Curitiba)</SelectItem>
                        <SelectItem value="v3">Carlos Ferreira (Campinas)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faturamento">Meta de Faturamento (R$)</Label>
                  <Input id="faturamento" type="number" placeholder="0,00" required />
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="mix_f1">Meta Mix F1 (%)</Label>
                    <Input id="mix_f1" type="number" placeholder="0" defaultValue="40" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mix_f2">Meta Mix F2 (%)</Label>
                    <Input id="mix_f2" type="number" placeholder="0" defaultValue="30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cobertura">Cobertura (%)</Label>
                    <Input id="cobertura" type="number" placeholder="0" defaultValue="100" />
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
              <CardDescription>
                Faça o upload de um arquivo Excel/CSV no formato padrão para atualizar múltiplas
                metas.
              </CardDescription>
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
                    Baixe a planilha modelo com a estrutura correta (Vendedor ID, Período,
                    Faturamento, Mix) para evitar erros de importação.
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
    </div>
  )
}
