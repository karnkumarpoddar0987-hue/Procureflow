import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor, Volume2, Type, Contrast, Wind } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { changeLanguage, SUPPORTED_LANGUAGES } from '@/i18n'
import { useAccessibility } from '@/hooks/useAccessibility'
import { useAssistedMode } from '@/hooks/useAssistedMode'
import { cn } from '@/utils/cn'
import type { Theme } from '@/types'

export default function FarmerSettings() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useThemeStore()
  const { prefs, toggle } = useAccessibility()
  const { speak } = useAssistedMode(prefs.assistedMode)

  const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light',  icon: Sun,     label: t('settings.themeLight') },
    { value: 'dark',   icon: Moon,    label: t('settings.themeDark') },
    { value: 'system', icon: Monitor, label: t('settings.themeSystem') },
  ]

  const accessibilityOptions = [
    {
      key: 'largerText' as const,
      icon: Type,
      label: t('settings.largerText'),
      desc: 'Increases base font size to 18px for easier reading',
    },
    {
      key: 'highContrast' as const,
      icon: Contrast,
      label: t('settings.highContrast'),
      desc: 'Enhances colour contrast for better visibility',
    },
    {
      key: 'reduceMotion' as const,
      icon: Wind,
      label: t('settings.reduceMotion'),
      desc: 'Removes animations and transitions',
    },
    {
      key: 'assistedMode' as const,
      icon: Volume2,
      label: t('settings.assistedMode'),
      desc: 'Reads important information aloud using device speakers',
      onToggle: () => {
        const next = !prefs.assistedMode
        toggle('assistedMode')
        if (next) {
          // Speak a welcome message when turning on
          setTimeout(() => speak(t('settings.assistedMode') + ' enabled'), 100)
        }
      },
    },
  ]

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* ── Language ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-4">{t('settings.language')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left',
                i18n.language === lang.code
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-border hover:border-primary-300',
              )}
            >
              <p>{lang.nativeName}</p>
              <p className="text-xs text-muted-foreground">{lang.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Theme ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-4">{t('settings.theme')}</h2>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all',
                theme === value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-border hover:border-primary-300',
              )}
            >
              <Icon size={20} className={theme === value ? 'text-primary-600' : 'text-muted-foreground'} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Accessibility ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-1">{t('settings.accessibility')}</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Preferences are saved and applied immediately
        </p>
        <div className="space-y-4">
          {accessibilityOptions.map(({ key, icon: Icon, label, desc, onToggle }) => {
            const active = prefs[key]
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      active
                        ? 'bg-primary-100 dark:bg-primary-900/30'
                        : 'bg-surface-alt',
                    )}
                  >
                    <Icon
                      size={17}
                      className={active ? 'text-primary-600' : 'text-muted-foreground'}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  role="switch"
                  aria-checked={active}
                  aria-label={label}
                  onClick={onToggle ?? (() => toggle(key))}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    active ? 'bg-primary-600' : 'bg-border',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      active ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            )
          })}
        </div>

        {/* Active summary */}
        {Object.values(prefs).some(Boolean) && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Active:{' '}
              {[
                prefs.largerText && t('settings.largerText'),
                prefs.highContrast && t('settings.highContrast'),
                prefs.reduceMotion && t('settings.reduceMotion'),
                prefs.assistedMode && t('settings.assistedMode'),
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* ── Assisted mode test ────────────────────────────────────── */}
      {prefs.assistedMode && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
          <p className="font-semibold text-violet-700 dark:text-violet-300 text-sm mb-2">
            🔊 {t('settings.assistedMode')} is ON
          </p>
          <button
            onClick={() => speak('Assisted mode is active. I will read important information aloud for you.')}
            className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Test Voice
          </button>
        </div>
      )}
    </div>
  )
}
