import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, Loader2, Package,
  MapPin, Clock, Hash, RefreshCw,
} from 'lucide-react'
import { farmerApi } from '@/api/farmer'
import { cn } from '@/utils/cn'
import type { ProcurementStage } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-surface-alt animate-pulse rounded-2xl', className)} />
}

const ALL_STAGES: { stage: ProcurementStage; labelKey: string }[] = [
  { stage: 'ARRIVED',              labelKey: 'procurement.arrived'          },
  { stage: 'WEIGHING',             labelKey: 'procurement.weighing'         },
  { stage: 'WEIGHING_COMPLETED',   labelKey: 'procurement.weighingDone'     },
  { stage: 'QUALITY_CHECK',        labelKey: 'procurement.qualityCheck'     },
  { stage: 'QUALITY_COMPLETED',    labelKey: 'procurement.qualityDone'      },
  { stage: 'PROCUREMENT_COMPLETED',labelKey: 'procurement.procurementDone'  },
  { stage: 'PAYMENT_PROCESSING',   labelKey: 'procurement.paymentProcessing'},
  { stage: 'PAYMENT_COMPLETED',    labelKey: 'procurement.paymentDone'      },
]

const STAGE_ORDER = ALL_STAGES.map(s => s.stage)

export default function FarmerProcurement() {
  const { t } = useTranslation()

  const { data: activeData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['active-booking'],
    queryFn:  () => farmerApi.getActiveBooking().then(r => r.data),
    refetchInterval: 10_000,
  })

  const procurement = activeData?.procurement
  const booking     = activeData?.booking
  const payment     = activeData?.payment

  if (isLoading) {
    return (
      <div className="space-y-4 pb-24 lg:pb-6">
        <h1 className="text-2xl font-bold">{t('procurement.title')}</h1>
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!procurement) {
    return (
      <div className="pb-24 lg:pb-6">
        <h1 className="text-2xl font-bold mb-6">{t('procurement.title')}</h1>
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Package className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="font-semibold text-lg">No active procurement</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Procurement details will appear after you are called at the centre.
          </p>
          <Link to="/farmer/queue" className="btn-primary inline-flex">
            {t('queue.title')}
          </Link>
        </div>
      </div>
    )
  }

  const currentStageIdx = STAGE_ORDER.indexOf(procurement.stage as ProcurementStage)

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('procurement.title')}</h1>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-xl hover:bg-surface-alt border border-border"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Token / centre summary */}
      {booking && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
              <Hash className="text-primary-600" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{t('queue.yourToken')}</p>
              <p className="text-2xl font-bold text-primary-600">{booking.token_number}</p>
              {booking.centre?.name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {booking.centre.name}
                </p>
              )}
            </div>
            <span
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-xl',
                procurement.stage === 'PAYMENT_COMPLETED'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
              )}
            >
              {procurement.stage?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-5">{t('procurement.timeline')}</h2>
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
          <div className="space-y-5">
            {ALL_STAGES.map(({ stage, labelKey }, i) => {
              const done   = i < currentStageIdx
              const active = i === currentStageIdx
              const future = i > currentStageIdx

              // find timestamp
              const tsMap: Partial<Record<ProcurementStage, string | undefined>> = {
                ARRIVED:               procurement.arrived_at,
                WEIGHING_COMPLETED:    procurement.weighing_completed_at,
                QUALITY_COMPLETED:     procurement.quality_completed_at,
                PROCUREMENT_COMPLETED: procurement.procurement_completed_at,
              }
              const ts = tsMap[stage]

              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-4 relative"
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10 border-2 mt-0.5 transition-all',
                      done   ? 'bg-primary-600 border-primary-600 text-white'
                      : active ? 'bg-white dark:bg-card border-primary-500 shadow shadow-primary-200/50'
                      : 'bg-card border-border',
                    )}
                  >
                    {done   ? <CheckCircle2 size={12} />
                    : active ? <Loader2 size={11} className="animate-spin text-primary-600" />
                    : <span className="text-[9px] text-muted-foreground">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        done   ? 'text-foreground'
                        : active ? 'text-primary-600 font-semibold'
                        : 'text-muted-foreground',
                      )}
                    >
                      {t(labelKey)}
                    </p>
                    {ts && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock size={10} className="inline mr-1" />
                        {new Date(ts).toLocaleString()}
                      </p>
                    )}
                    {active && (
                      <span className="inline-block mt-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">
                        In Progress
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Metrics */}
      {(procurement.net_weight || procurement.quality_grade || procurement.total_amount) && (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {procurement.net_weight && (
            <MRow label={t('procurement.netWeight')} value={`${procurement.net_weight} qtl`} />
          )}
          {procurement.quality_grade && (
            <MRow label={t('procurement.grade')} value={procurement.quality_grade} highlight />
          )}
          {procurement.msp_per_quintal && (
            <MRow label={t('procurement.msp')} value={`₹${procurement.msp_per_quintal}/qtl`} />
          )}
          {procurement.total_amount && (
            <MRow
              label={t('procurement.totalAmount')}
              value={`₹${procurement.total_amount.toLocaleString('en-IN')}`}
              highlight
              large
            />
          )}
        </div>
      )}

      {/* Payment */}
      {payment && (
        <div
          className={cn(
            'rounded-2xl p-5 flex items-center gap-4',
            payment.status === 'COMPLETED'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
          )}
        >
          {payment.status === 'COMPLETED'
            ? <CheckCircle2 className="text-emerald-600 shrink-0" size={28} />
            : <Loader2 className="text-amber-600 animate-spin shrink-0" size={28} />}
          <div>
            <p className="font-bold">{t('payment.title')}: {payment.status}</p>
            {payment.amount && (
              <p className="text-sm text-muted-foreground">
                ₹{payment.amount.toLocaleString('en-IN')} via NEFT
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MRow({
  label, value, highlight, large,
}: {
  label: string
  value: string
  highlight?: boolean
  large?: boolean
}) {
  return (
    <div className="flex justify-between items-center px-5 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', large ? 'text-xl' : 'text-sm', highlight && 'text-primary-600')}>
        {value}
      </span>
    </div>
  )
}
