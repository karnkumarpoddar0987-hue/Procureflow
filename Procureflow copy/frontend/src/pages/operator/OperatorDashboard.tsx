import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Hash, CheckCircle2, Loader2, Scale,
  CreditCard, RefreshCw, ChevronDown, ChevronUp,
  Bell, MapPin, AlertCircle, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { operatorApi } from '@/api/operator'
import { cn } from '@/utils/cn'
import DigitalIDCard from '@/components/shared/DigitalIDCard'

// ─── types ────────────────────────────────────────────────────────────────────
interface QueueEntry {
  queue_id: number
  position: number
  status: string
  booking_id: number
  token_number: string
  farmer_name: string
  farmer_mobile?: string
  crop_name?: string
  quantity?: number
  procurement_stage?: string
  called_at?: string
  estimated_wait_minutes?: number
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-surface-alt animate-pulse rounded-2xl', className)} />
}

function StatCard({
  label, value, color,
}: {
  label: string; value: number | string; color: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-2xl font-bold">{value}</p>
      <span className={cn('text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block', color)}>
        {label}
      </span>
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
          className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-alt">
              <X size={18} />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── stage badge ──────────────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  ARRIVED:               'bg-blue-100 dark:bg-blue-900/30 text-blue-700',
  WEIGHING:              'bg-purple-100 dark:bg-purple-900/30 text-purple-700',
  WEIGHING_COMPLETED:    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700',
  QUALITY_CHECK:         'bg-violet-100 dark:bg-violet-900/30 text-violet-700',
  QUALITY_COMPLETED:     'bg-teal-100 dark:bg-teal-900/30 text-teal-700',
  PROCUREMENT_COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700',
  PAYMENT_PROCESSING:    'bg-amber-100 dark:bg-amber-900/30 text-amber-700',
  PAYMENT_COMPLETED:     'bg-green-100 dark:bg-green-900/30 text-green-700',
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function OperatorDashboard() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  // active farmer being processed
  const [activeId, setActiveId]     = useState<number | null>(null)
  const [showWeigh, setShowWeigh]   = useState(false)
  const [showQuality, setShowQuality] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showToday, setShowToday]   = useState(false)

  const [weighForm,   setWeighForm]   = useState({ gross: '', net: '', moisture: '' })
  const [qualityForm, setQualityForm] = useState({ grade: 'A', moisture: '', notes: '' })

  // ── queries ────────────────────────────────────────────────
  const { data: dash, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ['operator-dashboard'],
    queryFn:  () => operatorApi.getDashboard().then(r => r.data),
    refetchInterval: 10_000,
  })

  const { data: queueData, refetch: refetchQueue } = useQuery({
    queryKey: ['operator-queue'],
    queryFn:  () => operatorApi.getQueue().then(r => r.data),
    refetchInterval: 8_000,
  })

  const { data: todayData } = useQuery({
    queryKey: ['operator-today'],
    queryFn:  () => operatorApi.getTodaysFarmers().then(r => r.data),
    refetchInterval: 15_000,
  })

  const queue: QueueEntry[] = queueData?.queue ?? []
  const todayFarmers: any[] = todayData?.farmers ?? []

  // current farmer = first CALLED or IN_PROGRESS entry
  const currentFarmer = queue.find(q =>
    q.status === 'CALLED' || q.status === 'IN_PROGRESS',
  )

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['operator-dashboard'] })
    qc.invalidateQueries({ queryKey: ['operator-queue'] })
    qc.invalidateQueries({ queryKey: ['operator-today'] })
  }

  // ── mutations ──────────────────────────────────────────────
  const callNextMut = useMutation({
    mutationFn: () => operatorApi.callNext(),
    onSuccess: res => {
      if (res.data.success) {
        toast.success(`Called: ${res.data.farmer_name} (${res.data.token_number})`)
      } else {
        toast.error(res.data.message || t('operator.noQueue'))
      }
      invalidate()
    },
    onError: () => toast.error(t('errors.generic')),
  })

  const startWeighMut = useMutation({
    mutationFn: (bid: number) => operatorApi.startWeighing(bid),
    onSuccess: () => { toast.success('Weighing started'); invalidate() },
    onError: () => toast.error(t('errors.generic')),
  })

  const completeWeighMut = useMutation({
    mutationFn: () => operatorApi.completeWeighing(
      activeId!,
      parseFloat(weighForm.gross),
      parseFloat(weighForm.net),
      weighForm.moisture ? parseFloat(weighForm.moisture) : undefined,
    ),
    onSuccess: () => {
      toast.success('Weighing completed')
      setShowWeigh(false)
      setWeighForm({ gross: '', net: '', moisture: '' })
      invalidate()
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('errors.generic')),
  })

  const startQualityMut = useMutation({
    mutationFn: (bid: number) => operatorApi.startQuality(bid),
    onSuccess: () => { toast.success('Quality check started'); invalidate() },
    onError: () => toast.error(t('errors.generic')),
  })

  const completeQualityMut = useMutation({
    mutationFn: () => operatorApi.completeQuality(
      activeId!,
      qualityForm.grade,
      qualityForm.moisture ? parseFloat(qualityForm.moisture) : undefined,
      qualityForm.notes || undefined,
    ),
    onSuccess: () => {
      toast.success('Quality check completed')
      setShowQuality(false)
      setQualityForm({ grade: 'A', moisture: '', notes: '' })
      invalidate()
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('errors.generic')),
  })

  const completeProcMut = useMutation({
    mutationFn: (bid: number) => operatorApi.completeProcurement(bid),
    onSuccess: () => { toast.success('Procurement completed!'); invalidate() },
    onError: (err: any) => toast.error(err.response?.data?.detail || t('errors.generic')),
  })

  const completePayMut = useMutation({
    mutationFn: (bid: number) => operatorApi.updatePayment(bid, 'COMPLETED', `TXN${Date.now()}`),
    onSuccess: async (res, bid) => {
      toast.success('Payment marked complete!')
      setShowPayment(false)
      invalidate()
      // Auto-generate payment slip PDF
      try {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const queue = queueData?.queue ?? []
        const farmer = queue.find((q: any) => q.booking_id === bid)
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
        const W = doc.internal.pageSize.getWidth()
        doc.setFillColor(5, 150, 105)
        doc.rect(0, 0, W, 25, 'F')
        doc.setTextColor(255,255,255)
        doc.setFontSize(14); doc.setFont('helvetica','bold')
        doc.text('Procureflow — Payment Receipt', 14, 11)
        doc.setFontSize(8); doc.setFont('helvetica','normal')
        doc.text(`${dash?.centre_name || ''} | ${new Date().toLocaleDateString('en-IN')}`, 14, 19)
        doc.setTextColor(0)
        autoTable(doc, {
          startY: 32,
          head: [['Field', 'Details']],
          body: [
            ['Farmer Name',   farmer?.farmer_name || '—'],
            ['Token',         farmer?.token_number || '—'],
            ['Crop',          farmer?.crop_name || '—'],
            ['Net Weight',    `${farmer?.quantity || 0} qtl`],
            ['Payment Mode',  'NEFT'],
            ['Transaction ID', `TXN${Date.now()}`],
            ['Status',        'COMPLETED'],
            ['Date',          new Date().toLocaleDateString('en-IN')],
          ],
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105] },
          margin: { left: 14, right: 14 },
        })
        doc.setFontSize(8); doc.setTextColor(100)
        doc.text('This is an auto-generated receipt. Procureflow — Agricultural Procurement System',
          14, doc.internal.pageSize.getHeight() - 8)
        doc.save(`Payment_Slip_${farmer?.token_number || bid}.pdf`)
      } catch (e) { console.error('Slip error', e) }
    },
    onError: () => toast.error(t('errors.generic')),
  })

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('operator.dashboard')}</h1>
          {dash?.centre_name && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin size={13} /> {dash.centre_name}
            </p>
          )}
        </div>
        <button
          onClick={() => { refetchDash(); refetchQueue() }}
          className="p-2 rounded-xl hover:bg-surface-alt border border-border"
          aria-label="Refresh"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────── */}
      {dashLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={t('operator.waiting')}    value={dash?.waiting ?? 0}         color="bg-amber-100 dark:bg-amber-900/30 text-amber-700" />
          <StatCard label={t('operator.inProgress')} value={dash?.in_progress ?? 0}     color="bg-blue-100 dark:bg-blue-900/30 text-blue-700" />
          <StatCard label={t('operator.completed')}  value={dash?.completed_today ?? 0} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" />
          <StatCard label={t('operator.activeCounters')} value={dash?.active_counters ?? 0} color="bg-violet-100 dark:bg-violet-900/30 text-violet-700" />
        </div>
      )}

      {/* ── Current token banner ─────────────────────────────── */}
      {dash?.current_token && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide">{t('operator.currentToken')}</p>
            <p className="text-4xl font-bold tracking-wider">{dash.current_token}</p>
          </div>
          <Bell size={28} className="text-white/40" />
        </div>
      )}

      {/* ── Primary action: Call Next ────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">{t('common.actions')}</h2>

        <button
          onClick={() => callNextMut.mutate()}
          disabled={callNextMut.isPending}
          className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base"
        >
          {callNextMut.isPending
            ? <Loader2 className="animate-spin" size={20} />
            : <Users size={20} />}
          {t('operator.callNext')}
        </button>

        {/* ── Workflow buttons for current farmer ──────────── */}
        {currentFarmer && (
          <div className="bg-surface-alt rounded-2xl p-4 space-y-3">
            {/* Farmer info header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{currentFarmer.farmer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {currentFarmer.token_number}
                  {currentFarmer.crop_name && ` · ${currentFarmer.crop_name}`}
                  {currentFarmer.quantity && ` · ${currentFarmer.quantity} qtl`}
                </p>
              </div>
              <span className={cn(
                'text-xs px-2 py-1 rounded-lg font-medium shrink-0',
                STAGE_COLORS[currentFarmer.procurement_stage ?? ''] ?? 'bg-surface-alt text-muted-foreground',
              )}>
                {(currentFarmer.procurement_stage ?? currentFarmer.status).replace(/_/g, ' ')}
              </span>
            </div>

            {/* Action buttons based on stage */}
            <div className="grid grid-cols-1 gap-2">

              {/* No stage yet → Start Weighing */}
              {!currentFarmer.procurement_stage && (
                <button
                  onClick={() => {
                    setActiveId(currentFarmer.booking_id)
                    startWeighMut.mutate(currentFarmer.booking_id)
                  }}
                  disabled={startWeighMut.isPending}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  <Scale size={16} />
                  {startWeighMut.isPending ? '...' : t('operator.startWeighing')}
                </button>
              )}

              {currentFarmer.procurement_stage === 'ARRIVED' && (
                <button
                  onClick={() => {
                    setActiveId(currentFarmer.booking_id)
                    startWeighMut.mutate(currentFarmer.booking_id)
                  }}
                  disabled={startWeighMut.isPending}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  <Scale size={16} />
                  {startWeighMut.isPending ? '...' : t('operator.startWeighing')}
                </button>
              )}

              {currentFarmer.procurement_stage === 'WEIGHING' && (
                <button
                  onClick={() => { setActiveId(currentFarmer.booking_id); setShowWeigh(true) }}
                  className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  {t('operator.completeWeighing')}
                </button>
              )}

              {currentFarmer.procurement_stage === 'WEIGHING_COMPLETED' && (
                <button
                  onClick={() => {
                    setActiveId(currentFarmer.booking_id)
                    startQualityMut.mutate(currentFarmer.booking_id)
                  }}
                  disabled={startQualityMut.isPending}
                  className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                >
                  {startQualityMut.isPending ? '...' : t('operator.startQuality')}
                </button>
              )}

              {currentFarmer.procurement_stage === 'QUALITY_CHECK' && (
                <button
                  onClick={() => { setActiveId(currentFarmer.booking_id); setShowQuality(true) }}
                  className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                >
                  {t('operator.completeQuality')}
                </button>
              )}

              {currentFarmer.procurement_stage === 'QUALITY_COMPLETED' && (
                <button
                  onClick={() => {
                    setActiveId(currentFarmer.booking_id)
                    completeProcMut.mutate(currentFarmer.booking_id)
                  }}
                  disabled={completeProcMut.isPending}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                  {completeProcMut.isPending ? '...' : t('operator.completeProcurement')}
                </button>
              )}

              {currentFarmer.procurement_stage === 'PAYMENT_PROCESSING' && (
                <button
                  onClick={() => { setActiveId(currentFarmer.booking_id); setShowPayment(true) }}
                  className="flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
                >
                  <CreditCard size={16} />
                  {t('operator.updatePayment')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Live queue list ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">
            {t('operator.queue')}{' '}
            <span className="text-sm text-muted-foreground font-normal">
              ({queue.length})
            </span>
          </h2>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <AlertCircle className="mx-auto mb-2" size={28} />
            <p className="text-sm">{t('operator.noQueue')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {queue.map((entry, i) => (
              <motion.div
                key={entry.queue_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-5 py-3"
              >
                <span className="w-7 h-7 bg-surface-alt rounded-lg flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {entry.position}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.farmer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.token_number}
                    {entry.crop_name && ` · ${entry.crop_name}`}
                  </p>
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                  entry.status === 'CALLED'      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700'
                  : entry.status === 'IN_PROGRESS' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700'
                  : 'bg-surface-alt text-muted-foreground',
                )}>
                  {entry.status}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Today's farmers table ────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowToday(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-alt transition-colors"
        >
          <h2 className="font-semibold">
            {t('operator.todayFarmers')}{' '}
            <span className="text-sm text-muted-foreground font-normal">
              ({todayFarmers.length})
            </span>
          </h2>
          {showToday ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <AnimatePresence>
          {showToday && (
            <motion.div
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden"
            >
              {todayFarmers.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">
                  No farmers booked for today
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-alt">
                      <tr>
                        {['Token', 'Farmer', 'Crop', 'Qty', 'Slot', 'Status'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {todayFarmers.map((f: any) => (
                        <tr key={f.booking_id} className="hover:bg-surface-alt/50 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-semibold text-primary-600">
                            {f.token_number}
                          </td>
                          <td className="px-4 py-2.5">{f.farmer_name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{f.crop_name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {f.quantity ? `${f.quantity} qtl` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{f.slot_time}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-medium',
                              STAGE_COLORS[f.procurement_stage ?? ''] ?? 'bg-surface-alt text-muted-foreground',
                            )}>
                              {(f.procurement_stage ?? f.queue_status ?? 'WAITING').replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── My Digital ID Card ───────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold mb-3">🪪 My Digital ID Card</h2>
        <DigitalIDCard />
      </div>

      {/* ── Weigh modal ──────────────────────────────────────── */}
      {showWeigh && (
        <Modal title={t('operator.completeWeighing')} onClose={() => setShowWeigh(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('operator.grossWeight')} (qtl) *</label>
              <input
                type="number" step="0.01" min="0"
                value={weighForm.gross}
                onChange={e => setWeighForm(f => ({ ...f, gross: e.target.value }))}
                className="input-field" placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('operator.netWeight')} (qtl) *</label>
              <input
                type="number" step="0.01" min="0"
                value={weighForm.net}
                onChange={e => setWeighForm(f => ({ ...f, net: e.target.value }))}
                className="input-field" placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('operator.moisture')} (%)</label>
              <input
                type="number" step="0.1" min="0" max="100"
                value={weighForm.moisture}
                onChange={e => setWeighForm(f => ({ ...f, moisture: e.target.value }))}
                className="input-field" placeholder="14.0"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowWeigh(false)} className="btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button
              onClick={() => completeWeighMut.mutate()}
              disabled={!weighForm.gross || !weighForm.net || completeWeighMut.isPending}
              className="btn-primary flex-1"
            >
              {completeWeighMut.isPending ? '...' : t('common.confirm')}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Quality modal ────────────────────────────────────── */}
      {showQuality && (
        <Modal title={t('operator.completeQuality')} onClose={() => setShowQuality(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">{t('operator.grade')} *</label>
              <div className="flex gap-2">
                {['A', 'B', 'C'].map(g => (
                  <button
                    key={g}
                    onClick={() => setQualityForm(f => ({ ...f, grade: g }))}
                    className={cn(
                      'flex-1 py-3 rounded-xl font-bold text-lg border-2 transition-all',
                      qualityForm.grade === g
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700'
                        : 'border-border hover:border-primary-300',
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('operator.moisture')} (%)</label>
              <input
                type="number" step="0.1"
                value={qualityForm.moisture}
                onChange={e => setQualityForm(f => ({ ...f, moisture: e.target.value }))}
                className="input-field" placeholder="14.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={qualityForm.notes}
                onChange={e => setQualityForm(f => ({ ...f, notes: e.target.value }))}
                className="input-field resize-none" rows={2}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowQuality(false)} className="btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button
              onClick={() => completeQualityMut.mutate()}
              disabled={completeQualityMut.isPending}
              className="btn-primary flex-1"
            >
              {completeQualityMut.isPending ? '...' : t('common.confirm')}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Payment modal ────────────────────────────────────── */}
      {showPayment && (
        <Modal title={t('operator.updatePayment')} onClose={() => setShowPayment(false)}>
          <p className="text-sm text-muted-foreground mb-6">
            Mark the payment as completed for this farmer? This will notify the farmer
            and update their payment status.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowPayment(false)} className="btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button
              onClick={() => completePayMut.mutate(activeId!)}
              disabled={completePayMut.isPending}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
            >
              {completePayMut.isPending ? '...' : '✓ Mark Completed'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}