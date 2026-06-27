import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from '@/services/notifications'

const typeConfig: Record<Notification['type'], { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min atrás`
  if (diffHour < 24) return `${diffHour}h atrás`
  if (diffDay < 7) return `${diffDay}d atrás`
  return date.toLocaleDateString('pt-BR')
}

export function NotificationPopover() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useRealtime('notifications', () => {
    loadNotifications()
  })

  const unreadNotifications = notifications.filter((n) => !n.is_read)
  const unreadCount = unreadNotifications.length
  const unreadIds = unreadNotifications.map((n) => n.id)

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
        )
      } catch {
        /* noop */
      }
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (unreadIds.length === 0) return
    try {
      await markAllAsRead(unreadIds)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      /* noop */
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground',
                'animate-fade-in',
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 md:w-96" collisionPadding={16}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[360px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">Nenhuma notificação encontrada</span>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => {
                const config = typeConfig[notification.type] ?? typeConfig.info
                const Icon = config.icon
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'flex gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50',
                      !notification.is_read && 'bg-primary/5',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        config.bg,
                      )}
                    >
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'truncate text-sm',
                            !notification.is_read ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {notification.title}
                        </span>
                        {!notification.is_read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <span className="mt-1 block text-[10px] text-muted-foreground/70">
                        {formatRelativeTime(notification.created)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
