import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Hash, Clock, Users, Loader2, CheckCircle2,
  Zap, AlertCircle, RefreshCw, MapPin,
} from 'lucide-react'
import { farmerApi } from '@/api/farmer'
import { useAssistedMode } from '@/hooks/useAssistedMode'
import { useAccessibility } from '@/hooks/useAccessibility'
import { cn } from '@/utils/cn'
import type { ProcurementStage } from '@/types'

// ─── helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-surface-alt animate-pulse rounded-2xl', className)} />
}

const STAGE_ORDER: ProcurementStage[] = [
  'ARRIVED',
  'WEIGHING',
  'WEIGHING_COMPLETED',
  'QUALITY_CHECK',
  'QUALITY_COMPLETED',
  'PROCUREMENT_COMPLETED',
  'PAYMENT_PROCESSING',
  'PAYMENT_COMPLETED',
]

function stageIndex(stage?: ProcurementStage | null) {
  if (!stage) return -1
  return STAGE_ORDER.indexOf(stage)
}

const QUEUE_STATUS_STYLE: Record<string, string> = {
  WAITING:     'text-amber-600  bg-amber-50  dark:bg-amber-900/20',
  CALLED:      'text-red-600    bg-red-50    dark:bg-red-900/20',
  IN_PROGRESS: 'text-blue-600   bg-blue-50   dark:bg-blue-900/20',
  COMPLETED:   'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  SKIPPED:     'text-muted-foreground bg-surface-alt',
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function FarmerQueue() {
  const { t } = useTranslation()
  const { prefs } = useAccessibility()
  const { speak } = useAssistedMode(prefs.assistedMode)

  const { data: activeData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['active-booking'],
    queryFn:  () => farmerApi.getActiveBooking().then(r => r.data),
    refetchInterval: 5_000,
  })

  // Speak action message when it changes
  const actionMsg = activeData?.action_message
  // (calling speak directly causes infinite renders if placed here; use useEffect)
  // See the useEffect block below

  if (isLoading) {
    return (
      <div className="space-y-4 pb-24 lg:pb-6">
        <h1 className="text-2xl font-bold">{t('queue.title')}</h1>
        <Skeleton className="h-32" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!activeData?.booking) {
    return (
      <div className="pb-24 lg:pb-6">
        <h1 className="text-2xl font-bold mb-6">{t('queue.title')}</h1>
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <AlertCircle className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="font-semibold text-lg">{t('dashboard.noBooking')}</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Book a slot to see your queue position and live status.
          </p>
          <Link to="/farmer/booking" className="btn-primary inline-flex">
            {t('dashboard.bookSlot')}
          </Link>
        </div>
      </div>
    )
  }

  const { booking, queue, procurement, payment, action, action_message } = activeData
  const queueStatus = queue?.status ?? 'WAITING'
  const procStageIdx = stageIndex(procurement?.stage ?? null)

  const timelineSteps = [
    { label: t('procurement.arrived'),         done: procStageIdx >= 0,  active: procStageIdx === 0  },
    { label: t('procurement.weighing'),         done: procStageIdx >= 2,  active: procStageIdx === 1  },
    { label: t('procurement.weighingDone'),     done: procStageIdx >= 2,  active: false               },
    { label: t('procurement.qualityCheck'),     done: procStageIdx >= 4,  active: procStageIdx === 3  },
    { label: t('procurement.qualityDone'),      done: procStageIdx >= 4,  active: false               },
    { label: t('procurement.procurementDone'),  done: procStageIdx >= 5,  active: procStageIdx === 5  },
    { label: t('procurement.paymentProcessing'),done: procStageIdx >= 7,  active: procStageIdx === 6  },
    { label: t('procurement.paymentDone'),      done: procStageIdx >= 7,  active: false               },
  ]

  const actionBg =
    action === 'CALLED'            ? 'from-red-500 to-pink-600'
    : action === 'PAYMENT_COMPLETED' ? 'from-emerald-500 to-teal-600'
    : action === 'TURN_APPROACHING'  ? 'from-orange-500 to-red-500'
    : null

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('queue.title')}</h1>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-xl hover:bg-surface-alt border border-border transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Action banner ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-3xl p-5',
          actionBg
            ? `bg-gradient-to-r ${actionBg} text-white`
            : 'bg-card border border-border',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-medium uppercase tracking-wide mb-1',
              actionBg ? 'text-white/70' : 'text-muted-foreground')}>
              {t('dashboard.todayAction')}
            </p>
            <h2 className="text-lg font-bold leading-snug">{action_message}</h2>
            {/* Show live queue info in waiting state */}
            {queue && !procurement && queueStatus === 'WAITING' && (
              <div className="mt-2 flex flex-wrap gap-3">
                <span className={cn('text-sm font-medium', actionBg ? 'text-white/80' : 'text-muted-foreground')}>
                  🎫 Position: #{queue.position}
                </span>
                <span className={cn('text-sm font-medium', actionBg ? 'text-white/80' : 'text-muted-foreground')}>
                  👥 {queue.people_ahead != null ? queue.people_ahead : Math.max(0, (queue.position ?? 1) - 1)} people ahead
                </span>
                <span className={cn('text-sm font-medium', actionBg ? 'text-white/80' : 'text-muted-foreground')}>
                  ⏱ Est. wait: {(() => {
                    const ahead = queue.people_ahead != null ? queue.people_ahead : Math.max(0, (queue.position ?? 1) - 1)
                    const wait = queue.estimated_wait_minutes ?? ahead * 12
                    return `~${Math.max(0, wait)} min`
                  })()}
                </span>
              </div>
            )}
          </div>
          {action === 'CALLED'            && <Zap size={28}          className="text-white shrink-0" />}
          {action === 'PAYMENT_COMPLETED' && <CheckCircle2 size={28} className="text-white shrink-0" />}
          {['WEIGHING','QUALITY_CHECK'].includes(action) && (
            <Loader2 size={28} className="animate-spin text-violet-600 shrink-0" />
          )}
        </div>
      </motion.div>

      {/* ── Token card ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {t('queue.yourToken')}
            </p>
            <p className="text-4xl font-bold text-primary-600 tracking-wider">
              {booking.token_number}
            </p>
          </div>
          {queue && (
            <span
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-semibold',
                QUEUE_STATUS_STYLE[queueStatus] ?? 'bg-surface-alt text-muted-foreground',
              )}
            >
              {t(`queue.${queueStatus.toLowerCase()}`) || queueStatus}
            </span>
          )}
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          {booking.slot?.date && (
            <p className="flex items-center gap-1.5">
              <Clock size={13} />
              {booking.slot.date}
              {booking.slot.start_time && ` · ${booking.slot.start_time}–${booking.slot.end_time}`}
            </p>
          )}
          {booking.centre?.name && (
            <p className="flex items-center gap-1.5">
              <MapPin size={13} />
              {booking.centre.name}
            </p>
          )}
        </div>
      </div>

      {/* ── Queue stats (only when waiting/called) ─────────────── */}
      {queue && !procurement && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: t('queue.position'),
              value: `#${queue.position ?? '–'}`,
              icon: Hash,
              color: 'text-blue-600'
            },
            {
              label: 'People Ahead',
              value: queue.people_ahead != null
                ? queue.people_ahead
                : queue.position != null
                ? Math.max(0, queue.position - 1)
                : 0,
              icon: Users,
              color: 'text-amber-600'
            },
            {
              label: t('queue.estimatedWait'),
              value: (() => {
                const ahead = queue.people_ahead != null
                  ? queue.people_ahead
                  : queue.position != null ? Math.max(0, queue.position - 1) : 0
                const wait = queue.estimated_wait_minutes != null
                  ? queue.estimated_wait_minutes
                  : ahead * 12
                return `~${Math.max(0, wait)}m`
              })(),
              icon: Clock,
              color: 'text-green-600'
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-3 text-center">
              <Icon className={`mx-auto mb-1 ${color}`} size={18} />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Procurement timeline ───────────────────────────────── */}
      {procurement && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-5">{t('procurement.timeline')}</h3>
          <div className="relative">
            {/* vertical rail */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {timelineSteps.map(({ label, done, active }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 relative"
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10 border-2 transition-all',
                      done
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : active
                        ? 'bg-white dark:bg-card border-primary-500 shadow-md shadow-primary-200'
                        : 'bg-card border-border',
                    )}
                  >
                    {done ? (
                      <CheckCircle2 size={12} />
                    ) : active ? (
                      <Loader2 size={11} className="animate-spin text-primary-600" />
                    ) : (
                      <span className="text-[9px] text-muted-foreground font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      done ? 'text-foreground font-medium'
                        : active ? 'text-primary-600 font-semibold'
                        : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                  {active && (
                    <span className="ml-auto text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">
                      In Progress
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          {(procurement.net_weight || procurement.quality_grade || procurement.total_amount) && (
            <div className="mt-5 pt-4 border-t border-border space-y-2">
              {procurement.net_weight && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('procurement.netWeight')}</span>
                  <span className="font-medium">{procurement.net_weight} qtl</span>
                </div>
              )}
              {procurement.quality_grade && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('procurement.grade')}</span>
                  <span className="font-semibold text-primary-600">{procurement.quality_grade}</span>
                </div>
              )}
              {procurement.msp_per_quintal && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('procurement.msp')}</span>
                  <span className="font-medium">₹{procurement.msp_per_quintal}/qtl</span>
                </div>
              )}
              {procurement.total_amount && (
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                  <span>{t('procurement.totalAmount')}</span>
                  <span className="text-primary-600">
                    ₹{procurement.total_amount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Payment summary ────────────────────────────────────── */}
      {payment && (
        <div
          className={cn(
            'rounded-2xl p-5 border',
            payment.status === 'COMPLETED'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : payment.status === 'PROCESSING'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'bg-card border-border',
          )}
        >
          <div className="flex items-center gap-3">
            {payment.status === 'COMPLETED'
              ? <CheckCircle2 className="text-emerald-600" size={22} />
              : <Loader2 className="text-amber-600 animate-spin" size={22} />}
            <div>
              <p className="text-xs text-muted-foreground">{t('payment.status')}</p>
              <p className="font-bold">
                {payment.status}
                {payment.amount && (
                  <span className="text-primary-600 ml-2">
                    ₹{payment.amount.toLocaleString('en-IN')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Live refresh indicator ──────────────────────────────── */}
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
        {isFetching ? 'Updating…' : 'Auto-refreshes every 8 seconds'}
      </p>
    </div>
  )
}
