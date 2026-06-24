import { create } from 'zustand'
import pb from '@/lib/pocketbase/client'

export const useAuthStore = create<any>((set) => ({
  user: pb.authStore.record,
  selectedContext: 'Global',
  setUser: (user: any) => set({ user }),
  setSelectedContext: (selectedContext: string) => set({ selectedContext }),
}))

pb.authStore.onChange((_token, record) => {
  useAuthStore.setState({ user: record })
})
