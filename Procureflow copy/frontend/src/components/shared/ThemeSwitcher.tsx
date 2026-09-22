import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useTranslation } from 'react-i18next'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'
import type { Theme } from '@/types'

interface Props {
  compact?: boolean
}

const themes: { value: Theme; icon: typeof Sun; key: string }[] = [
  { value: 'light',  icon: Sun,     key: 'settings.themeLight' },
  { value: 'dark',   icon: Moon,    key: 'settings.themeDark' },
  { value: 'system', icon: Monitor, key: 'settings.themeSystem' },
]

export default function ThemeSwitcher({ compact }: Props) {
  const { theme, setTheme } = useThemeStore()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = themes.find(th => th.value === theme) || themes[2]
  const Icon = current.icon

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border hover:bg-surface-alt transition-colors text-sm"
        aria-label="Change theme"
      >
        <Icon size={16} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 lg:top-full lg:bottom-auto lg:mt-2 bg-card border border-border rounded-2xl shadow-xl p-2 w-44 z-50">
          {themes.map(({ value, icon: TIcon, key }) => (
            <button
              key={value}
              onClick={() => { setTheme(value); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
                theme === value ? 'bg-primary-600 text-white' : 'hover:bg-surface-alt text-foreground'
              )}
            >
              <TIcon size={15} />
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
