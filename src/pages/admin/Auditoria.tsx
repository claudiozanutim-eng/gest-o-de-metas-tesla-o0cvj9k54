import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'

export default function Auditoria() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ShieldAlert className="w-8 h-8" /> Histórico de Auditoria
        </h1>
        <p className="text-muted-foreground">
          Acompanhe as modificações críticas realizadas no sistema.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Logs de Sistema</CardTitle>
          <CardDescription>
            Esta funcionalidade registrará todas as ações críticas em breve.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-20 text-center text-muted-foreground">
          Nenhum registro de auditoria encontrado no período atual.
        </CardContent>
      </Card>
    </div>
  )
}
