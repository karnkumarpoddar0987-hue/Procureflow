import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { farmerApi } from '@/api/farmer'
import { cn } from '@/utils/cn'
import { formatDistanceToNow } from 'date-fns'

const typeColors: Record<string, string> = {
  BOOKING_CONFIRMED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700',
  BOOKING_CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700',
  FARMER_CALLED: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700',
  WEIGHING_STARTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700',
  QUALITY_COMPLETED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700',
  PROCUREMENT_COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700',
  PAYMENT_UPDATED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700',
}

export default function FarmerNotifications() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => farmerApi.getNotifications().then(r => r.data),
    refetchInterval: 20000,
  })

  const markReadMutation = useMutation({
    mutationFn: (ids: number[]) => farmerApi.markNotificationsRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  })

  const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
        {unreadIds.length > 0 && (
          <button onClick={() => markReadMutation.mutate(unreadIds)} className="btn-secondary flex items-center gap-1.5 text-sm py-2">
            <CheckCheck size={15} /> {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {unreadIds.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl px-3 py-1.5 text-sm text-primary-700 dark:text-primary-400">
          {unreadIds.length} {t('notifications.unread')}
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface-alt rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16">
          <Bell className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground">{t('notifications.noNotifications')}</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n, i) => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            onClick={() => !n.is_read && markReadMutation.mutate([n.id])}
            className={cn('bg-card border border-border rounded-2xl p-4 cursor-pointer transition-colors', !n.is_read && 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10')}>
            <div className="flex items-start gap-3">
              <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', n.is_read ? 'bg-border' : 'bg-primary-600')} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                </p>
              </div>
              {n.notification_type && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', typeColors[n.notification_type] || 'bg-surface-alt text-muted-foreground')}>
                  {n.notification_type.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
