import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Map, MapPin, MapPinned, Save, Loader2 } from 'lucide-react'
import type { NodeType, SelectedItem } from '@/components/admin/hierarchy-tree'

interface HierarchyInfoPanelProps {
  selected: SelectedItem | null
  regionalCount: number
  areaCount: number
  vendorCount: number
  parentName?: string
  onSave: (id: string, type: NodeType, newName: string) => Promise<boolean>
}

const TYPE_LABELS: Record<NodeType, string> = {
  district: 'Distrito',
  regional: 'Regional',
  area: 'Área',
}

const TYPE_ICONS: Record<NodeType, typeof Map> = {
  district: Map,
  regional: MapPin,
  area: MapPinned,
}

export function HierarchyInfoPanel({
  selected,
  regionalCount,
  areaCount,
  vendorCount,
  parentName,
  onSave,
}: HierarchyInfoPanelProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selected) {
      setName(selected.name)
      setError('')
    }
  }, [selected?.id, selected?.name])

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informações do Nível</CardTitle>
          <CardDescription>Selecione um item na árvore para ver detalhes.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-center text-muted-foreground py-12">
          Nenhum item selecionado.
        </CardContent>
      </Card>
    )
  }

  const Icon = TYPE_ICONS[selected.type]
  const label = TYPE_LABELS[selected.type]

  const handleSave = async () => {
    if (!name.trim()) {
      setError('O nome é obrigatório.')
      return
    }
    setError('')
    setSaving(true)
    await onSave(selected.id, selected.type, name.trim())
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          {label}
        </CardTitle>
        <CardDescription>Edite as informações do item selecionado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="item-name">Nome</Label>
          <Input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
            placeholder={`Nome do ${label.toLowerCase()}`}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="space-y-2">
          <Label>Detalhes</Label>
          <div className="flex flex-wrap gap-2">
            {selected.type === 'district' && (
              <Badge variant="secondary">{regionalCount} Regionais</Badge>
            )}
            {selected.type === 'regional' && (
              <>
                <Badge variant="secondary">{areaCount} Áreas</Badge>
                {parentName && <Badge variant="outline">Distrito: {parentName}</Badge>}
              </>
            )}
            {selected.type === 'area' && (
              <>
                <Badge variant="secondary">{vendorCount} Vendedores</Badge>
                {parentName && <Badge variant="outline">Regional: {parentName}</Badge>}
              </>
            )}
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !name.trim() || name.trim() === selected.name}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
