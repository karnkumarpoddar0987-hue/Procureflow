import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, UserRole } from '@/types'

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        localStorage.setItem('procureflow_token', token)
        set({ token, user, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('procureflow_token')
        set({ token: null, user: null, isAuthenticated: false })
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'procureflow_auth',
    }
  )
)
