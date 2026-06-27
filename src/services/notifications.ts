import pb from '@/lib/pocketbase/client'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  link: string
  created: string
  updated: string
}

export const getNotifications = async (): Promise<Notification[]> => {
  return await pb.collection('notifications').getFullList<Notification>({
    sort: '-created',
    filter: `user_id = "${pb.authStore.record?.id}"`,
  })
}

export const getUnreadCount = async (): Promise<number> => {
  return await pb
    .collection('notifications')
    .count(`user_id = "${pb.authStore.record?.id}" && is_read = false`)
}

export const markAsRead = async (id: string): Promise<void> => {
  await pb.collection('notifications').update(id, { is_read: true })
}

export const markAllAsRead = async (ids: string[]): Promise<void> => {
  await Promise.all(ids.map((id) => pb.collection('notifications').update(id, { is_read: true })))
}

export const createNotification = async (
  data: Omit<Notification, 'id' | 'created' | 'updated'>,
): Promise<Notification> => {
  return await pb.collection('notifications').create<Notification>(data)
}
