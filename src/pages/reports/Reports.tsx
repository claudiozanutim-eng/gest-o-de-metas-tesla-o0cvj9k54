import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileDown, FileText } from 'lucide-react'

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Relatórios</h1>
        <p className="text-muted-foreground">Gere extrações detalhadas para análise externa.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gerador de Relatórios
          </CardTitle>
          <CardDescription>
            Configure os filtros para baixar os dados em formato de planilha (.xlsx).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select defaultValue="consolidado">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consolidado">Consolidado Faturamento + Mix</SelectItem>
                  <SelectItem value="vendedores">Performance Analítica por Vendedor</SelectItem>
                  <SelectItem value="cobertura">Mapa de Cobertura de Território</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Período Inicial</Label>
                <Input type="month" defaultValue="2026-01" />
              </div>
              <div className="space-y-2">
                <Label>Período Final</Label>
                <Input type="month" defaultValue="2026-06" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nível Hierárquico</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visão Nacional (Todos)</SelectItem>
                  <SelectItem value="d1">Somente Regional Sul</SelectItem>
                  <SelectItem value="r1">Somente Regional Paraná</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full gap-2">
            <FileDown className="w-4 h-4" /> Exportar Dados
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
