import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { SUPPORTED_LANGUAGES, changeLanguage } from '@/i18n'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'

interface Props {
  compact?: boolean
}

export default function LanguageSwitcher({ compact }: Props) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0]

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
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border hover:bg-surface-alt transition-colors text-sm font-medium',
          compact && 'px-2 py-1'
        )}
        aria-label="Change language"
      >
        <Languages size={16} />
        {!compact && <span className="hidden sm:block">{currentLang.nativeName}</span>}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 lg:top-full lg:bottom-auto lg:mt-2 bg-card border border-border rounded-2xl shadow-xl p-2 w-52 z-50 max-h-64 overflow-y-auto">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                changeLanguage(lang.code)
                setOpen(false)
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors',
                i18n.language === lang.code
                  ? 'bg-primary-600 text-white'
                  : 'hover:bg-surface-alt text-foreground'
              )}
            >
              <span>{lang.nativeName}</span>
              <span className="text-xs opacity-60">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
