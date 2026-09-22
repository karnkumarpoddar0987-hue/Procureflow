import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, Building2, Clock, CreditCard, TrendingUp,
  RefreshCw, AlertCircle, Filter, ChevronDown,
} from 'lucide-react'
import { officerApi } from '@/api/officer'
import { cn } from '@/utils/cn'
import DigitalIDCard from '@/components/shared/DigitalIDCard'

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

// ─── helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-surface-alt animate-pulse rounded-xl', className)} />
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: string | number; icon: typeof Users; color: string; sub?: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', color)}>
        <Icon size={18} />
      </div>
      <p className="text-xl font-bold">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-xs text-primary-600 font-medium mt-0.5">{sub}</p>}
    </div>
  )
}

const CROWD_BADGE: Record<string, string> = {
  LOW:    'badge-low',
  MEDIUM: 'badge-medium',
  HIGH:   'badge-high',
}

const STAGE_COLOR: Record<string, string> = {
  ARRIVED:               'bg-blue-100 dark:bg-blue-900/30 text-blue-700',
  WEIGHING:              'bg-purple-100 dark:bg-purple-900/30 text-purple-700',
  WEIGHING_COMPLETED:    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700',
  QUALITY_CHECK:         'bg-violet-100 dark:bg-violet-900/30 text-violet-700',
  QUALITY_COMPLETED:     'bg-teal-100 dark:bg-teal-900/30 text-teal-700',
  PROCUREMENT_COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700',
  PAYMENT_PROCESSING:    'bg-amber-100 dark:bg-amber-900/30 text-amber-700',
  PAYMENT_COMPLETED:     'bg-green-100 dark:bg-green-900/30 text-green-700',
}

const PAY_COLOR: Record<string, string> = {
  PENDING:    'bg-surface-alt text-muted-foreground',
  PROCESSING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700',
  COMPLETED:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700',
  FAILED:     'bg-red-100 dark:bg-red-900/30 text-red-700',
}

type Tab = 'overview' | 'centres' | 'procurements' | 'payments' | 'trends' | 'myid'

// ─── main ─────────────────────────────────────────────────────────────────────
export default function OfficerDashboard() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('overview')

  // procurement filters
  const [procCentre, setProcCentre]   = useState('')
  const [procStage,  setProcStage]    = useState('')
  const [procFrom,   setProcFrom]     = useState('')
  const [procTo,     setProcTo]       = useState('')

  // payment filters
  const [payCentre, setPayCentre]     = useState('')
  const [payStatus, setPayStatus]     = useState('')

  const { data: dash, isLoading: dashLoading, refetch } = useQuery({
    queryKey: ['officer-dashboard'],
    queryFn:  () => officerApi.getDashboard().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: centresData } = useQuery({
    queryKey: ['officer-centres'],
    queryFn:  () => officerApi.getCentres().then(r => r.data),
  })

  const { data: trendsData } = useQuery({
    queryKey: ['officer-trends'],
    queryFn:  () => officerApi.getTrends(14).then(r => r.data),
  })

  const { data: statsData } = useQuery({
    queryKey: ['officer-stats'],
    queryFn:  () => officerApi.getStatsSummary().then(r => r.data),
  })

  const { data: procsData, refetch: refetchProcs } = useQuery({
    queryKey: ['officer-procurements', procCentre, procStage, procFrom, procTo],
    queryFn:  () => officerApi.getProcurements({
      centre_id:  procCentre ? Number(procCentre) : undefined,
      stage:      procStage  || undefined,
      from_date:  procFrom   || undefined,
      to_date:    procTo     || undefined,
    }).then(r => r.data),
    enabled: tab === 'procurements',
  })

  const { data: paysData, refetch: refetchPays } = useQuery({
    queryKey: ['officer-payments', payCentre, payStatus],
    queryFn:  () => officerApi.getPayments({
      centre_id:     payCentre ? Number(payCentre) : undefined,
      status_filter: payStatus || undefined,
    }).then(r => r.data),
    enabled: tab === 'payments',
  })

  const centres   = centresData?.centres       ?? []
  const trends    = trendsData?.trends         ?? []
  const crops     = statsData?.by_crop         ?? []
  const procs     = procsData?.procurements    ?? []
  const pays      = paysData?.payments         ?? []

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',      label: 'Overview'                    },
    { id: 'centres',       label: t('officer.centrePerformance')},
    { id: 'procurements',  label: t('officer.procurementMonitoring') },
    { id: 'payments',      label: t('officer.paymentMonitoring') },
    { id: 'trends',        label: t('officer.trends')           },
    { id: 'myid',          label: '🪪 My ID Card'               },
  ]

  const STAGES = [
    'ARRIVED','WEIGHING','WEIGHING_COMPLETED','QUALITY_CHECK',
    'QUALITY_COMPLETED','PROCUREMENT_COMPLETED','PAYMENT_PROCESSING','PAYMENT_COMPLETED',
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('officer.dashboard')}</h1>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl hover:bg-surface-alt border border-border"
          aria-label="Refresh"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* ── KPI cards ───────────────────────────────────────── */}
      {dashLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label={t('officer.totalFarmers')}    value={dash?.total_farmers   ?? 0} icon={Users}      color="text-blue-600 bg-blue-100 dark:bg-blue-900/30" />
          <StatCard label={t('officer.activeCentres')}   value={dash?.active_centres  ?? 0} icon={Building2}  color="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" />
          <StatCard label={t('officer.waiting')}         value={dash?.waiting         ?? 0} icon={Clock}      color="text-amber-600 bg-amber-100 dark:bg-amber-900/30" />
          <StatCard label={t('officer.completed')}       value={dash?.completed_total ?? 0} icon={TrendingUp} color="text-violet-600 bg-violet-100 dark:bg-violet-900/30" />
          <StatCard label={t('officer.paymentCompleted')}value={dash?.payment_completed ?? 0} icon={CreditCard} color="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" />
          <StatCard label={t('officer.avgWait')}         value={`${dash?.avg_wait_minutes ?? 0}m`} icon={Clock} color="text-blue-600 bg-blue-100 dark:bg-blue-900/30" />
        </div>
      )}

      {/* ── Total amount banner ──────────────────────────────── */}
      {(dash?.total_amount_paid ?? 0) > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
          <p className="text-white/70 text-xs uppercase tracking-wide mb-1">
            {t('officer.totalAmountPaid')}
          </p>
          <p className="text-3xl font-bold">
            ₹{(dash?.total_amount_paid ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="text-white/70 text-sm mt-1">
            {dash?.payment_processing ?? 0} payments still processing
          </p>
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-1 bg-surface-alt p-1 rounded-2xl w-fit max-w-full">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB: Overview ═══════════════════════ */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Today stages */}
          {dash?.today_stages && Object.keys(dash.today_stages).length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Today's Stage Summary</h3>
              <div className="space-y-2">
                {Object.entries(dash.today_stages).map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      STAGE_COLOR[stage] ?? 'bg-surface-alt text-muted-foreground',
                    )}>
                      {stage.replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crop pie */}
          {crops.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold mb-4">By Crop</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={crops} dataKey="count" nameKey="crop"
                    cx="50%" cy="50%" outerRadius={75}
                    label={({ crop, percent }: any) =>
                      `${crop} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {crops.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* High load alerts */}
          {centres.filter((c: any) => c.crowd_level === 'HIGH').length > 0 && (
            <div className="md:col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-red-600 shrink-0" size={18} />
                <h3 className="font-semibold text-red-700 dark:text-red-400">
                  High Load Centres
                </h3>
              </div>
              <div className="space-y-2">
                {centres
                  .filter((c: any) => c.crowd_level === 'HIGH')
                  .map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-red-600">
                        {c.queue_length} waiting · ~{c.estimated_wait_minutes}m
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: Centres ════════════════════════ */}
      {tab === 'centres' && (
        <div className="space-y-3">
          {centres.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">{t('common.noData')}</p>
          )}
          {centres.map((c: any, i: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.district}, {c.state}</p>
                </div>
                <span className={CROWD_BADGE[c.crowd_level] ?? 'badge-info'}>
                  {c.crowd_level}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[
                  { label: 'Queue',        value: c.queue_length },
                  { label: 'Wait',         value: `~${c.estimated_wait_minutes}m` },
                  { label: 'Counters',     value: c.active_counters },
                  { label: 'Amount Paid',  value: `₹${(c.total_amount_paid ?? 0).toLocaleString('en-IN')}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ═══════════════ TAB: Procurements ═══════════════════ */}
      {tab === 'procurements' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={15} className="text-muted-foreground" />
              <h3 className="font-medium text-sm">{t('officer.filters')}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('officer.centre')}</label>
                <select
                  value={procCentre}
                  onChange={e => setProcCentre(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="">{t('officer.allCentres')}</option>
                  {centres.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('officer.stage')}</label>
                <select
                  value={procStage}
                  onChange={e => setProcStage(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="">All Stages</option>
                  {STAGES.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('officer.dateFrom')}</label>
                <input
                  type="date" value={procFrom}
                  onChange={e => setProcFrom(e.target.value)}
                  className="input-field py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('officer.dateTo')}</label>
                <input
                  type="date" value={procTo}
                  onChange={e => setProcTo(e.target.value)}
                  className="input-field py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => refetchProcs()}
              className="mt-3 btn-secondary text-sm py-2 px-4"
            >
              <RefreshCw size={13} className="inline mr-1.5" /> Apply Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {t('officer.procurementMonitoring')}
                <span className="text-muted-foreground font-normal ml-2">({procs.length})</span>
              </h3>
            </div>

            {procs.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">
                {t('common.noData')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt">
                    <tr>
                      {['Token', 'Farmer', 'Centre', 'Crop', 'Weight', 'Grade', 'Amount', 'Stage', 'Date'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {procs.map((p: any) => (
                      <tr key={p.id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-primary-600 whitespace-nowrap">
                          {p.token ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{p.farmer_name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{p.centre_name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.crop_name ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.net_weight != null ? `${p.net_weight} qtl` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {p.quality_grade
                            ? <span className="font-bold text-primary-600">{p.quality_grade}</span>
                            : '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {p.total_amount != null
                            ? `₹${p.total_amount.toLocaleString('en-IN')}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
                            STAGE_COLOR[p.stage ?? ''] ?? 'bg-surface-alt text-muted-foreground',
                          )}>
                            {(p.stage ?? '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {p.date ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: Payments ═══════════════════════ */}
      {tab === 'payments' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={15} className="text-muted-foreground" />
              <h3 className="font-medium text-sm">{t('officer.filters')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('officer.centre')}</label>
                <select
                  value={payCentre}
                  onChange={e => setPayCentre(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="">{t('officer.allCentres')}</option>
                  {centres.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('payment.status')}</label>
                <select
                  value={payStatus}
                  onChange={e => setPayStatus(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  {['PENDING','PROCESSING','COMPLETED','FAILED'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => refetchPays()}
              className="mt-3 btn-secondary text-sm py-2 px-4"
            >
              <RefreshCw size={13} className="inline mr-1.5" /> Apply Filters
            </button>
          </div>

          {/* Summary */}
          {paysData && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{paysData.total ?? 0}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary-600">
                  ₹{(paysData.total_amount ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">
                {t('officer.paymentMonitoring')}
                <span className="text-muted-foreground font-normal ml-2">({pays.length})</span>
              </h3>
            </div>

            {pays.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt">
                    <tr>
                      {['Token', 'Farmer', 'Centre', 'Amount', 'Mode', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pays.map((pay: any) => (
                      <tr key={pay.id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-primary-600 whitespace-nowrap">
                          {pay.token ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{pay.farmer_name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{pay.centre_name ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {pay.amount != null
                            ? `₹${pay.amount.toLocaleString('en-IN')}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{pay.payment_mode ?? 'NEFT'}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            PAY_COLOR[pay.status ?? ''] ?? 'bg-surface-alt text-muted-foreground',
                          )}>
                            {pay.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {pay.completed_at
                            ? new Date(pay.completed_at).toLocaleDateString()
                            : pay.initiated_at
                            ? new Date(pay.initiated_at).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: Trends ═════════════════════════ */}
      {tab === 'trends' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Daily Bookings vs Completions (14 days)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(l: string) => `Date: ${l}`} />
                <Line type="monotone" dataKey="bookings"  stroke="#3b82f6" strokeWidth={2} dot={false} name="Bookings" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Daily Payment Disbursement (₹)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trends}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']} />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Crop amounts bar */}
          {crops.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Amount Paid by Crop</h3>
              <ResponsiveContainer width="100%" height={Math.max(150, crops.length * 40)}>
                <BarChart data={crops} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="crop" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']} />
                  <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: My ID Card ══════════════════════ */}
      {tab === 'myid' && (
        <div className="flex justify-center py-4">
          <DigitalIDCard />
        </div>
      )}
    </div>
  )
}
