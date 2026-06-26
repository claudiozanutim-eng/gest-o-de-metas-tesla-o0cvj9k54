import { Link, useLocation } from 'react-router-dom'
import logoUrl from '@/assets/image-247cf.png'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  Calculator,
  Bot,
  FileText,
  Settings,
  Users,
  Network,
  Map,
  MapPin,
  MapPinned,
  UserCog,
  Upload,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/use-auth-store'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import pb from '@/lib/pocketbase/client'

const mainNavItems = [
  { title: 'Painel', url: '/', icon: LayoutDashboard },
  { title: 'Metas', url: '/metas', icon: Target },
  { title: 'Acompanhamento', url: '/acompanhamento', icon: TrendingUp },
  { title: 'Simulação', url: '/simulacao', icon: Calculator },
  { title: 'Assistente IA', url: '/assistente', icon: Bot },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
]

const adminItems = [
  { title: 'Usuários', url: '/admin/usuarios', icon: UserCog },
  { title: 'Gestão de Distritos', url: '/admin/distritos', icon: Map },
  { title: 'Regionais', url: '/admin/regionais', icon: MapPin },
  { title: 'Áreas', url: '/admin/areas', icon: MapPinned },
  { title: 'Vendedores', url: '/admin/vendedores', icon: Users },
  { title: 'Estrutura Hierárquica', url: '/admin/estrutura', icon: Network },
  { title: 'Importação', url: '/admin/importacao', icon: Upload },
  { title: 'Configurações', url: '/admin/parametros', icon: Settings },
  { title: 'Auditoria', url: '/admin/auditoria', icon: ShieldAlert },
]

export function AppSidebar() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const isAdminOrManager = user?.role !== 'Vendedor'

  const avatarUrl = user?.avatar
    ? pb.files.getUrl(user, user.avatar, { thumb: '100x100' })
    : 'https://img.usecurling.com/ppl/thumbnail?gender=male&seed=1'

  const filteredNavItems = mainNavItems.filter((item) => {
    if (user?.role === 'Vendedor') {
      return ['/', '/metas', '/simulacao'].includes(item.url)
    }
    return true
  })

  const filteredAdminItems = adminItems.filter((item) => {
    if (user?.role === 'Administrador') {
      return true
    }
    const hideForManagers = ['/admin/parametros', '/admin/usuarios', '/admin/importacao']
    return !hideForManagers.includes(item.url)
  })

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center py-1">
          <img src={logoUrl} alt="Tesla Mecatrônica" className="h-8 w-auto object-contain" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdminOrManager && filteredAdminItems.length > 0 && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md p-2">
                  <span>Administração</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredAdminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                          <Link to={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src={avatarUrl} alt="User" className="w-8 h-8 rounded-full object-cover shrink-0" />
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium truncate">{user?.name || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.role || 'Usuário'}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
