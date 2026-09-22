import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Calendar, Users, Leaf, Package, CreditCard,
  User, Bell, HelpCircle, Settings, LogOut, Menu, X,
} from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'
import { farmerApi } from '@/api/farmer'

const navItems = [
  { to: '/farmer/dashboard',     icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/farmer/booking',       icon: Calendar,        key: 'nav.booking' },
  { to: '/farmer/queue',         icon: Users,           key: 'nav.queue' },
  { to: '/farmer/crops',         icon: Leaf,            key: 'nav.crops' },
  { to: '/farmer/procurement',   icon: Package,         key: 'nav.procurement' },
  { to: '/farmer/payment',       icon: CreditCard,      key: 'nav.payment' },
  { to: '/farmer/profile',       icon: User,            key: 'nav.profile' },
  { to: '/farmer/notifications', icon: Bell,            key: 'nav.notifications' },
  { to: '/farmer/help',          icon: HelpCircle,      key: 'nav.help' },
  { to: '/farmer/settings',      icon: Settings,        key: 'nav.settings' },
]

// Bottom-nav shows first 5 items
const bottomNavItems = navItems.slice(0, 5)

export default function FarmerLayout() {
  const { t } = useTranslation()
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()           // ← proper hook, not window.location
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Unread notification badge
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => farmerApi.getNotifications().then(r => r.data),
    refetchInterval: 30_000,
    select: data => data.filter((n: any) => !n.is_read),
  })
  const unreadCount = notifications.length

  const handleLogout = () => {
    logout()
    navigate('/login/farmer')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold text-primary-600">Procureflow</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('app.tagline').split('.')[0]}.
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-surface-alt"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, key }) => {
            const isNotif = to === '/farmer/notifications'
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground',
                  )
                }
              >
                <div className="relative">
                  <Icon size={18} />
                  {isNotif && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="flex-1">{t(key)}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom controls */}
        <div className="p-3 border-t border-border space-y-1 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
          >
            <LogOut size={18} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-surface-alt"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
          {/* Notification bell with badge */}
          <NavLink
            to="/farmer/notifications"
            className="relative p-2 rounded-xl hover:bg-surface-alt"
            aria-label={t('nav.notifications')}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        </header>

        {/* Page content — key on pathname so Framer re-animates on route change */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 md:p-6 max-w-4xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-card/95 backdrop-blur border-t border-border flex items-center justify-around px-1 py-1 safe-area-bottom">
        {bottomNavItems.map(({ to, icon: Icon, key }) => {
          const isNotif = to === '/farmer/notifications'
          const isActive = location.pathname === to
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-0',
                isActive ? 'text-primary-600' : 'text-muted-foreground',
              )}
            >
              <div className="relative">
                <Icon size={21} />
                {isNotif && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] truncate max-w-[48px]">
                {t(key).split(' ')[0]}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
