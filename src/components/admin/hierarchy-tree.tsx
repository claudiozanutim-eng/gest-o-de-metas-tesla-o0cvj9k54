import { useState } from 'react'
import { ChevronRight, ChevronDown, Pencil, Trash2, MoreVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type NodeType = 'district' | 'regional' | 'area'

export interface SelectedItem {
  id: string
  type: NodeType
  name: string
}

interface HierarchyTreeProps {
  districts: any[]
  regionals: any[]
  areas: any[]
  vendedores: any[]
  selectedId: string | null
  onSelect: (item: SelectedItem) => void
  onSaveRename: (id: string, type: NodeType, newName: string) => Promise<boolean>
  onDeleteRequest: (id: string, type: NodeType, name: string) => void
}

function NodeActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="hover:scale-110 transition-transform p-0.5"
        >
          <Pencil className="w-4 h-4 text-blue-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="hover:scale-110 transition-transform p-0.5"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button onClick={(e) => e.stopPropagation()} className="p-1">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2 text-blue-500" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-500">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

export function HierarchyTree({
  districts,
  regionals,
  areas,
  vendedores,
  selectedId,
  onSelect,
  onSaveRename,
  onDeleteRequest,
}: HierarchyTreeProps) {
  const [expD, setExpD] = useState<Set<string>>(new Set())
  const [expR, setExpR] = useState<Set<string>>(new Set())
  const [editId, setEditId] = useState<string | null>(null)
  const [tempName, setTempName] = useState('')

  const toggleSet = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const startEdit = (id: string, name: string) => {
    setEditId(id)
    setTempName(name)
  }

  const commitEdit = async (id: string, type: NodeType) => {
    if (!tempName.trim()) {
      setEditId(null)
      return
    }
    const ok = await onSaveRename(id, type, tempName.trim())
    if (ok) setEditId(null)
  }

  const renderRow = (
    id: string,
    name: string,
    type: NodeType,
    expanded: boolean,
    onToggle: () => void,
    badge?: string,
    hasChildren = true,
  ) => {
    const isEditing = editId === id
    const isSelected = selectedId === id
    return (
      <div
        key={id}
        className={cn(
          'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-200',
          'hover:bg-muted/50',
          isSelected && 'bg-primary/10 ring-1 ring-primary/20',
        )}
        onClick={() => onSelect({ id, type, name })}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="transition-transform duration-200 shrink-0"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {isEditing ? (
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(id, type)
              if (e.key === 'Escape') setEditId(null)
            }}
            className="h-7 max-w-[200px]"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn(
              'text-sm flex-1 truncate',
              type === 'district' && 'font-semibold',
              type === 'regional' && 'font-medium',
              type === 'area' && 'font-normal text-muted-foreground',
            )}
          >
            {name}
          </span>
        )}
        {!isEditing && badge && (
          <Badge variant="secondary" className="text-xs hidden sm:inline-flex shrink-0">
            {badge}
          </Badge>
        )}
        {!isEditing && (
          <NodeActions
            onEdit={() => startEdit(id, name)}
            onDelete={() => onDeleteRequest(id, type, name)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {districts.map((d) => {
        const regs = regionals.filter((r) => r.district_id === d.id)
        const isExp = expD.has(d.id)
        return (
          <div key={d.id}>
            {renderRow(
              d.id,
              d.name,
              'district',
              isExp,
              () => toggleSet(expD, d.id, setExpD),
              `${regs.length} Reg.`,
            )}
            {isExp && (
              <div className="ml-6 animate-fade-in space-y-0.5">
                {regs.map((r) => {
                  const ars = areas.filter((a) => a.regional_id === r.id)
                  const isExpR = expR.has(r.id)
                  return (
                    <div key={r.id}>
                      {renderRow(
                        r.id,
                        r.name,
                        'regional',
                        isExpR,
                        () => toggleSet(expR, r.id, setExpR),
                        `${ars.length} Áreas`,
                      )}
                      {isExpR && (
                        <div className="ml-6 animate-fade-in space-y-0.5">
                          {ars.map((a) => {
                            const vends = vendedores.filter((v) => v.area_id === a.id)
                            return renderRow(
                              a.id,
                              a.name,
                              'area',
                              false,
                              () => {},
                              `${vends.length} Vend.`,
                              false,
                            )
                          })}
                          {ars.length === 0 && (
                            <p className="text-xs text-muted-foreground pl-7 py-1">Nenhuma área</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {regs.length === 0 && (
                  <p className="text-xs text-muted-foreground pl-7 py-1">Nenhuma regional</p>
                )}
              </div>
            )}
          </div>
        )
      })}
      {districts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum distrito encontrado.
        </p>
      )}
    </div>
  )
}
