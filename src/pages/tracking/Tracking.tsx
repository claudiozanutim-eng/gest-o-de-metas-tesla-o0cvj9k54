import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/mock-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

// Mock Data specific for tracking
const sellersProgress = [
  { id: 1, name: 'João Silva', area: 'Curitiba', meta: 200000, realizado: 170000, avatar: '1' },
  { id: 2, name: 'Maria Santos', area: 'Curitiba', meta: 250000, realizado: 265000, avatar: '2' },
  {
    id: 3,
    name: 'Carlos Ferreira',
    area: 'Campinas',
    meta: 300000,
    realizado: 220000,
    avatar: '3',
  },
  { id: 4, name: 'Ana Costa', area: 'Londrina', meta: 180000, realizado: 205000, avatar: '4' },
]

const CategoryProgressBar = ({ percent }: { percent: number }) => {
  // Define markers
  const baseEnd = 80
  const bronzeEnd = 95
  const prataEnd = 110
  const maxVisual = 130

  const normalizedPercent = Math.min(percent, maxVisual)
  const visualWidth = (normalizedPercent / maxVisual) * 100

  // Function to get color based on current segment
  const getActiveColor = () => {
    if (percent < baseEnd) return 'bg-category-base'
    if (percent < bronzeEnd) return 'bg-category-bronze'
    if (percent < prataEnd) return 'bg-category-prata'
    return 'bg-category-ouro'
  }

  return (
    <div className="relative w-full pt-6 pb-2">
      {/* Markers */}
      <div className="absolute top-0 w-full flex text-[10px] font-medium text-muted-foreground">
        <div
          className="absolute"
          style={{ left: `${(baseEnd / maxVisual) * 100}%`, transform: 'translateX(-50%)' }}
        >
          80% (B)
        </div>
        <div
          className="absolute"
          style={{ left: `${(bronzeEnd / maxVisual) * 100}%`, transform: 'translateX(-50%)' }}
        >
          95% (Br)
        </div>
        <div
          className="absolute"
          style={{ left: `${(prataEnd / maxVisual) * 100}%`, transform: 'translateX(-50%)' }}
        >
          110% (P)
        </div>
      </div>

      {/* Background Track */}
      <div className="h-4 w-full bg-muted rounded-full relative overflow-hidden flex">
        {/* Fill */}
        <div
          className={`h-full transition-all duration-500 ease-in-out ${getActiveColor()}`}
          style={{ width: `${visualWidth}%` }}
        />

        {/* Separators */}
        <div
          className="absolute top-0 bottom-0 border-l border-background/50"
          style={{ left: `${(baseEnd / maxVisual) * 100}%` }}
        />
        <div
          className="absolute top-0 bottom-0 border-l border-background/50"
          style={{ left: `${(bronzeEnd / maxVisual) * 100}%` }}
        />
        <div
          className="absolute top-0 bottom-0 border-l border-background/50"
          style={{ left: `${(prataEnd / maxVisual) * 100}%` }}
        />
      </div>

      {/* Current % text marker */}
      <div
        className={`absolute top-10 text-xs font-bold transition-all duration-500`}
        style={{ left: `calc(${visualWidth}% - 12px)` }}
      >
        {percent}%
      </div>
    </div>
  )
}

export default function Tracking() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Acompanhamento</h1>
        <p className="text-muted-foreground">Monitoramento diário de metas e categorias.</p>
      </div>

      <div className="flex items-center gap-4 bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 shrink-0" />
        <div className="text-sm text-blue-900 dark:text-blue-100 flex-1">
          <strong>Regra de Categorização:</strong> Base (&lt;80%), Bronze (80-94%), Prata (95-109%),
          Ouro (≥110%). A categoria define o multiplicador de comissão no período.
        </div>
      </div>

      <div className="grid gap-4">
        {sellersProgress.map((seller) => {
          const percent = Math.round((seller.realizado / seller.meta) * 100)

          return (
            <Card key={seller.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Info */}
                  <div className="flex items-center gap-4 min-w-[250px]">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?gender=male&seed=${seller.avatar}`}
                      />
                      <AvatarFallback>{seller.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-base">{seller.name}</h3>
                      <p className="text-sm text-muted-foreground">{seller.area}</p>
                    </div>
                  </div>

                  {/* Numbers */}
                  <div className="flex gap-8 min-w-[200px]">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Realizado</p>
                      <p className="font-mono font-medium">{formatCurrency(seller.realizado)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Meta</p>
                      <p className="font-mono font-medium text-muted-foreground">
                        {formatCurrency(seller.meta)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="flex-1 min-w-[300px]">
                    <CategoryProgressBar percent={percent} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
