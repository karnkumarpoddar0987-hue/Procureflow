import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Calendar, Leaf, Package, CreditCard, Bell,
  ChevronRight, Clock, Hash, MapPin, Zap,
  CheckCircle2, Loader2, AlertCircle,
} from 'lucide-react'
import { farmerApi } from '@/api/farmer'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'

// ─── skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-surface-alt animate-pulse rounded-2xl', className)} />
  )
}

// ─── gradient per action ──────────────────────────────────────────────────────
const ACTION_GRADIENTS: Record<string, string> = {
  BOOK_SLOT:            'from-emerald-500 to-teal-600',
  UPCOMING:             'from-blue-500 to-indigo-600',
  TODAY:                'from-blue-500 to-cyan-600',
  WAITING:              'from-amber-500 to-orange-500',
  TURN_APPROACHING:     'from-orange-500 to-red-500',
  CALLED:               'from-red-500 to-pink-500',
  ARRIVED:              'from-blue-400 to-indigo-500',
  WEIGHING:             'from-purple-500 to-violet-600',
  QUALITY_PENDING:      'from-indigo-500 to-blue-600',
  QUALITY_CHECK:        'from-indigo-500 to-blue-600',
  QUALITY_DONE:         'from-teal-500 to-emerald-600',
  PROCUREMENT_COMPLETED:'from-emerald-500 to-green-600',
  PAYMENT_PROCESSING:   'from-amber-500 to-yellow-600',
  PAYMENT_COMPLETED:    'from-emerald-600 to-primary-600',
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'PAYMENT_COMPLETED') return <CheckCircle2 size={32} className="text-white" />
  if (action === 'CALLED') return <Zap size={32} className="text-white" />
  if (['WEIGHING', 'QUALITY_CHECK'].includes(action))
    return <Loader2 size={32} className="text-white animate-spin" />
  if (action === 'BOOK_SLOT') return <Calendar size={32} className="text-white" />
  return <Hash size={32} className="text-white" />
}

// ─── main component ───────────────────────────────────────────────────────────
export default function FarmerDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['farmer-dashboard'],
    queryFn: () => farmerApi.getDashboard().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: activeBooking, isLoading: abLoading } = useQuery({
    queryKey: ['active-booking'],
    queryFn: () => farmerApi.getActiveBooking().then(r => r.data),
    refetchInterval: 15_000,
  })

  const action   = activeBooking?.action   ?? 'BOOK_SLOT'
  const gradient = ACTION_GRADIENTS[action] ?? ACTION_GRADIENTS.BOOK_SLOT

  const stats = [
    {
      label: t('dashboard.totalCrops'),
      value: dashData?.total_crops ?? 0,
      icon:  Leaf,
      to:    '/farmer/crops',
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    },
    {
      label: t('dashboard.totalBookings'),
      value: dashData?.total_bookings ?? 0,
      icon:  Calendar,
      to:    '/farmer/booking',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    },
    {
      label: t('dashboard.completed_proc'),
      value: dashData?.completed_procurements ?? 0,
      icon:  Package,
      to:    '/farmer/procurement',
      color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    },
    {
      label: t('nav.notifications'),
      value: dashData?.unread_notifications ?? 0,
      icon:  Bell,
      to:    '/farmer/notifications',
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    },
  ]

  return (
    <div className="space-y-6 pb-24 lg:pb-6">

      {/* ── Greeting ──────────────────────────────────────────── */}
      <div>
        <p className="text-muted-foreground text-sm">{t('dashboard.greeting')},</p>
        <h1 className="text-2xl font-bold">
          {dashData?.farmer_name ?? user?.full_name ?? 'Farmer'} 👋
        </h1>
      </div>

      {/* ── "Aaj Kya Karna Hai?" card ────────────────────────── */}
      {abLoading ? (
        <Skeleton className="h-44" />
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'relative overflow-hidden rounded-3xl bg-gradient-to-r p-6 text-white shadow-lg',
            gradient,
          )}
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-8 -mb-8 pointer-events-none" />

          <div className="relative z-10">
            <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">
              {t('dashboard.todayAction')}
            </p>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold leading-snug mb-3">
                  {activeBooking?.action_message ?? t('dashboard.bookSlot')}
                </h2>

                {activeBooking?.booking && (
                  <div className="space-y-1">
                    {activeBooking.booking.token_number && (
                      <p className="flex items-center gap-1.5 text-white/90 text-sm">
                        <Hash size={13} />
                        Token: <strong>{activeBooking.booking.token_number}</strong>
                      </p>
                    )}
                    {activeBooking.booking.centre?.name && (
                      <p className="flex items-center gap-1.5 text-white/90 text-sm">
                        <MapPin size={13} />
                        {activeBooking.booking.centre.name}
                      </p>
                    )}
                    {activeBooking.booking.slot?.date && (
                      <p className="flex items-center gap-1.5 text-white/90 text-sm">
                        <Calendar size={13} />
                        {activeBooking.booking.slot.date}
                        {activeBooking.booking.slot.start_time && (
                          <> · {activeBooking.booking.slot.start_time}</>
                        )}
                      </p>
                    )}
                    {activeBooking.queue?.estimated_wait_minutes != null && (
                      <p className="flex items-center gap-1.5 text-white/90 text-sm">
                        <Clock size={13} />
                        ~{activeBooking.queue.estimated_wait_minutes} min wait
                      </p>
                    )}
                  </div>
                )}
              </div>
              <ActionIcon action={action} />
            </div>

            <div className="mt-4">
              {action === 'BOOK_SLOT' ? (
                <Link
                  to="/farmer/booking"
                  className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('dashboard.bookSlot')} <ChevronRight size={14} />
                </Link>
              ) : (
                <Link
                  to="/farmer/queue"
                  className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {t('queue.title')} <ChevronRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Stats grid ────────────────────────────────────────── */}
      {dashLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, icon: Icon, to, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={to}
                className="block bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-all active:scale-95"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', color)}>
                  <Icon size={18} />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Quick actions ──────────────────────────────────────── */}
      <div>
        <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
          {t('common.actions')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/farmer/booking',     label: t('nav.booking'),     icon: Calendar,  color: 'bg-blue-600' },
            { to: '/farmer/queue',       label: t('nav.queue'),       icon: Clock,     color: 'bg-amber-500' },
            { to: '/farmer/procurement', label: t('nav.procurement'), icon: Package,   color: 'bg-violet-600' },
            { to: '/farmer/payment',     label: t('nav.payment'),     icon: CreditCard,color: 'bg-emerald-600' },
          ].map(({ to, label, icon: Icon, color }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 + i * 0.05 }}
            >
              <Link
                to={to}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:shadow-md transition-all active:scale-95"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', color)}>
                  <Icon size={18} className="text-white" />
                </div>
                <span className="font-medium text-sm leading-tight">{label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── KYC nudge ─────────────────────────────────────────── */}
      {dashData && !dashData.kyc_verified && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t('profile.kycPending')}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Complete your KYC to access all features.{' '}
              <Link to="/farmer/profile" className="font-medium underline">
                {t('profile.edit')}
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
