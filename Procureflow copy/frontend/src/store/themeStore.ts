import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '@/types'

interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  syncSystemTheme: () => void
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),

      setTheme: (theme) => {
        const resolved = theme === 'system' ? getSystemTheme() : theme
        applyTheme(resolved)
        set({ theme, resolvedTheme: resolved })
      },

      syncSystemTheme: () => {
        const { theme } = get()
        if (theme === 'system') {
          const resolved = getSystemTheme()
          applyTheme(resolved)
          set({ resolvedTheme: resolved })
        }
      },
    }),
    {
      name: 'procureflow_theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = state.theme === 'system' ? getSystemTheme() : state.theme
          applyTheme(resolved)
          state.resolvedTheme = resolved
        }
      },
    }
  )
)

// Listen for OS theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    useThemeStore.getState().syncSystemTheme()
  })
}
