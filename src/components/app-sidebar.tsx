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

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Lançamento de Metas', url: '/metas', icon: Target },
  { title: 'Acompanhamento', url: '/acompanhamento', icon: TrendingUp },
  { title: 'Simulação de Ganho', url: '/simulacao', icon: Calculator },
  { title: 'Assistente IA', url: '/assistente', icon: Bot },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
]

const adminItems = [
  { title: 'Usuários', url: '/admin/usuarios', icon: UserCog },
  { title: 'Distritos', url: '/admin/distritos', icon: Map },
  { title: 'Regionais', url: '/admin/regionais', icon: MapPin },
  { title: 'Áreas', url: '/admin/areas', icon: MapPinned },
  { title: 'Vendedores', url: '/admin/vendedores', icon: Users },
  { title: 'Estrutura Hierárquica', url: '/admin/estrutura', icon: Network },
  { title: 'Importar Planilha', url: '/admin/importacao', icon: Upload },
  { title: 'Parâmetros', url: '/admin/parametros', icon: Settings },
  { title: 'Auditoria', url: '/admin/auditoria', icon: ShieldAlert },
]

export function AppSidebar() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'Administrator' || user?.role === 'National Manager'

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
              {mainNavItems.map((item) => (
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

        {isAdmin && (
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
                    {adminItems.map((item) => (
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
        <div className="flex items-center gap-3">
          <img
            src="https://img.usecurling.com/ppl/thumbnail?gender=male&seed=1"
            alt="User"
            className="w-8 h-8 rounded-full"
          />
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.role}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
