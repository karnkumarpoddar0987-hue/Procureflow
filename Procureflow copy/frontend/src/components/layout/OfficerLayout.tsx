import { Outlet, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { LogOut, BarChart3, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'

export default function OfficerLayout() {
  const { t } = useTranslation()
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-primary-600" />
          <div>
            <span className="font-bold text-primary-600">Procureflow</span>
            <span className="text-xs text-muted-foreground ml-2">{t('officer.dashboard')}</span>
          </div>
        </div>
        <div className="flex-1" />
        <Link to="/officer/profile"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:bg-surface-alt border border-border">
          <User size={15} /> Profile
        </Link>
        <LanguageSwitcher />
        <ThemeSwitcher />
        <button
          onClick={() => { logout(); navigate('/login/staff') }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:bg-surface-alt border border-border"
        >
          <LogOut size={16} /> {t('nav.logout')}
        </button>
      </header>
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 max-w-7xl mx-auto"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
