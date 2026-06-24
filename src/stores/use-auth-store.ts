import { create } from 'zustand'

type Role = 'Admin' | 'Gerente Nacional' | 'Gerente Regional' | 'Vendedor'

interface User {
  id: string
  name: string
  role: Role
  contexto: string // e.g., 'Regional Sul'
}

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
  selectedContext: string
  setSelectedContext: (context: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: 'u1',
    name: 'Roberto Almeida',
    role: 'Gerente Regional',
    contexto: 'Regional Paraná',
  },
  selectedContext: 'Regional Paraná',
  setUser: (user) => set({ user }),
  setSelectedContext: (selectedContext) => set({ selectedContext }),
}))
