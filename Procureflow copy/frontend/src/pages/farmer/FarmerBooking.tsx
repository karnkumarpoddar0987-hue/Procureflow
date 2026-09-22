import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Clock, Users, Star, QrCode, CheckCircle2,
  ChevronRight, ChevronLeft, Calendar, Leaf, Hash, X,
  RefreshCw, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { farmerApi } from '@/api/farmer'
import type { Centre, Slot, Crop, Booking } from '@/types'
import { cn } from '@/utils/cn'
import QRCodeComponent from '@/components/shared/QRCode'

const STEP_COUNT = 6

// ─── helpers ──────────────────────────────────────────────────────────────────

function CrowdBadge({ level }: { level?: string }) {
  if (!level) return null
  const cls = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high' } as Record<string, string>
  const ico = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🔴' } as Record<string, string>
  return (
    <span className={cls[level] ?? 'badge-info'}>
      {ico[level] ?? ''} {level}
    </span>
  )
}

function SlotCard({
  slot,
  selected,
  onSelect,
}: {
  slot: Slot
  selected: boolean
  onSelect: () => void
}) {
  const full = slot.status === 'FULL'
  return (
    <button
      onClick={onSelect}
      disabled={full}
      className={cn(
        'w-full text-left p-4 rounded-2xl border-2 transition-all',
        full
          ? 'opacity-50 cursor-not-allowed border-border'
          : selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-border hover:border-primary-300',
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">
            {slot.slot_start_time} – {slot.slot_end_time}
          </p>
          <p className="text-xs text-muted-foreground">{slot.slot_label}</p>
        </div>
        <div className="text-right">
          <CrowdBadge level={slot.crowd_level} />
          <p className="text-xs text-muted-foreground mt-1">{slot.available} left</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span>
          <Clock size={11} className="inline" /> ~{slot.estimated_wait_minutes} min
        </span>
        <div className="flex-1 bg-surface-alt rounded-full h-1.5">
          <div
            className="bg-primary-500 h-1.5 rounded-full"
            style={{ width: `${Math.min((slot.booked_count / slot.max_capacity) * 100, 100)}%` }}
          />
        </div>
        <span>
          {slot.booked_count}/{slot.max_capacity}
        </span>
      </div>
      {full && <span className="badge-high mt-2">Full</span>}
    </button>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

export default function FarmerBooking() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  // New booking wizard
  const [step, setStep] = useState(1)
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null)
  const [quantity, setQuantity] = useState('')
  const [mspRate, setMspRate] = useState('')
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Reschedule modal
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlot, setRescheduleSlot] = useState<Slot | null>(null)

  // ── Data fetching ──────────────────────────────────────────────
  const { data: crops = [] } = useQuery({
    queryKey: ['crops'],
    queryFn: () => farmerApi.getCrops().then(r => r.data),
  })

  const { data: centres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: () => farmerApi.getCentres().then(r => r.data),
  })

  const { data: slots = [], isFetching: slotsFetching } = useQuery({
    queryKey: ['slots', selectedCentre?.id, selectedDate],
    queryFn: () => farmerApi.getCentreSlots(selectedCentre!.id, selectedDate).then(r => r.data),
    enabled: !!selectedCentre && !!selectedDate,
  })

  const { data: rescheduleSlots = [], isFetching: rescheduleFetching } = useQuery({
    queryKey: ['reschedule-slots', rescheduleTarget?.slot?.centre_id, rescheduleDate],
    queryFn: () =>
      farmerApi
        .getCentreSlots(rescheduleTarget!.slot!.centre_id, rescheduleDate)
        .then(r => r.data),
    enabled: !!rescheduleTarget && !!rescheduleDate,
  })

  const { data: recommendation } = useQuery({
    queryKey: ['ai-recommend', selectedCentre?.id, selectedDate],
    queryFn: () =>
      farmerApi.getRecommendation(selectedCentre?.id, selectedDate).then(r => r.data),
    enabled: !!selectedCentre && !!selectedDate,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => farmerApi.getBookings().then(r => r.data),
  })

  // ── Mutations ──────────────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: () =>
      farmerApi.createBooking({
        slot_id: selectedSlot!.id,
        crop_id: selectedCrop?.id,
        quantity_quintals: parseFloat(quantity) || undefined,
      }),
    onSuccess: res => {
      setConfirmedBooking(res.data)
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['active-booking'] })
      qc.invalidateQueries({ queryKey: ['centres'] })
      toast.success(t('booking.confirmed'))
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || t('errors.generic')),
  })

  const cancelMutation = useMutation({
    mutationFn: () => farmerApi.cancelBooking(cancelTarget!.id, cancelReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['active-booking'] })
      setCancelTarget(null)
      setCancelReason('')
      if (confirmedBooking?.id === cancelTarget?.id) setConfirmedBooking(null)
      toast.success(t('booking.cancelSuccess'))
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || t('errors.generic')),
  })

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      farmerApi.rescheduleBooking(rescheduleTarget!.id, rescheduleSlot!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['active-booking'] })
      setRescheduleTarget(null)
      setRescheduleDate('')
      setRescheduleSlot(null)
      toast.success(t('booking.rescheduleSuccess'))
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || t('errors.generic')),
  })

  // ── Helpers ────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const rec = recommendation?.recommendation
  const activeBookings = bookings.filter((b: Booking) => b.status === 'CONFIRMED')

  const resetWizard = () => {
    setStep(1)
    setSelectedCrop(null)
    setQuantity('')
    setMspRate('')
    setSelectedCentre(null)
    setSelectedDate('')
    setSelectedSlot(null)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold">{t('booking.title')}</h1>

      {/* ── Booking confirmed view ──────────────────────────────── */}
      {confirmedBooking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white text-center shadow-lg">
            <CheckCircle2 className="mx-auto mb-3" size={48} />
            <h2 className="text-2xl font-bold">{t('booking.confirmed')}</h2>
            <div className="mt-4 bg-white/20 rounded-2xl p-4 space-y-2 text-left">
              <Row label={t('booking.token')} value={confirmedBooking.token_number} bold />
              {confirmedBooking.centre_name && (
                <Row label="Centre" value={confirmedBooking.centre_name} />
              )}
              {confirmedBooking.slot?.slot_date && (
                <Row label="Date" value={confirmedBooking.slot.slot_date} />
              )}
              {confirmedBooking.slot?.slot_start_time && (
                <Row
                  label="Slot"
                  value={`${confirmedBooking.slot.slot_start_time} – ${confirmedBooking.slot.slot_end_time}`}
                />
              )}
              {confirmedBooking.queue_position != null && (
                <Row label="Queue #" value={`#${confirmedBooking.queue_position}`} />
              )}
              {confirmedBooking.estimated_wait_minutes != null && (
                <Row
                  label="Est. Wait"
                  value={`~${confirmedBooking.estimated_wait_minutes} min`}
                />
              )}
            </div>
          </div>

          {/* QR code */}
          {confirmedBooking.qr_data && (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode size={20} className="text-primary-600" />
                <h3 className="font-semibold">{t('booking.qrPass')}</h3>
              </div>
              <QRCodeComponent value={confirmedBooking.qr_data} />
              <p className="text-xs text-muted-foreground mt-3">
                Show this QR code when you arrive at the centre
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setConfirmedBooking(null); resetWizard() }}
              className="btn-secondary text-sm py-2.5"
            >
              Book Another
            </button>
            <button
              onClick={() => setRescheduleTarget(confirmedBooking)}
              className="py-2.5 px-3 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium text-sm transition-colors"
            >
              {t('booking.reschedule')}
            </button>
            <button
              onClick={() => setCancelTarget(confirmedBooking)}
              className="py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm transition-colors"
            >
              {t('booking.cancel')}
            </button>
          </div>
        </motion.div>
      )}

      {/* ── New booking wizard ──────────────────────────────────── */}
      {!confirmedBooking && (
        <>
          {/* Step progress bar */}
          <div className="flex items-center gap-1">
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full flex-1 transition-all duration-300',
                  i + 1 <= step ? 'bg-primary-600' : 'bg-surface-alt',
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t(`booking.step${step}`)} · Step {step} of {STEP_COUNT}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {/* Step 1 – Crop */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">{t('booking.selectCrop')}</h2>
                    <a href="/farmer/crops"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-medium transition-colors">
                      + Add Crop
                    </a>
                  </div>
                  {crops.length === 0 ? (
                    <div className="text-center py-8 bg-surface-alt rounded-2xl">
                      <Leaf className="mx-auto mb-2 text-muted-foreground" size={32} />
                      <p className="text-muted-foreground text-sm mb-3">
                        No crops added yet.
                      </p>
                      <a href="/farmer/crops"
                        className="btn-primary inline-flex items-center gap-1.5 text-sm">
                        + Add Your First Crop
                      </a>
                    </div>
                  ) : (
                    crops.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCrop(c); setStep(2) }}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all',
                          selectedCrop?.id === c.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-border hover:border-primary-300',
                        )}
                      >
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center shrink-0">
                          <Leaf className="text-emerald-600" size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-semibold">{c.crop_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.crop_type} · {c.quantity_quintals} qtl
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground shrink-0" size={18} />
                      </button>
                    ))
                  )}
                  <button
                    onClick={() => { setSelectedCrop(null); setStep(2) }}
                    className="w-full py-3 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-primary-300 text-sm transition-colors"
                  >
                    Skip – no crop selected
                  </button>
                </div>
              )}

              {/* Step 2 – Quantity */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-semibold text-lg">{t('booking.enterQuantity')}</h2>
                  {selectedCrop && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 flex items-center gap-3">
                      <Leaf className="text-emerald-600 shrink-0" size={20} />
                      <div>
                        <p className="font-medium">{selectedCrop.crop_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Available: {selectedCrop.quantity_quintals ?? 0} qtl ({((selectedCrop.quantity_quintals ?? 0) * 100).toFixed(0)} kg)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* KG and Bags only — no quintals input */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Kilograms (kg)</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={quantity ? String(Math.round(parseFloat(quantity) * 100)) : ''}
                        onChange={e => setQuantity(e.target.value ? String(parseFloat(e.target.value) / 100) : '')}
                        className="input-field text-xl text-center font-bold"
                        placeholder="0"
                      />
                      <p className="text-xs text-center text-muted-foreground mt-1">Enter in kg</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-muted-foreground">50kg Bags</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={quantity ? String(Math.ceil(parseFloat(quantity) * 100 / 50)) : ''}
                        onChange={e => setQuantity(e.target.value ? String((parseFloat(e.target.value) * 50) / 100) : '')}
                        className="input-field text-xl text-center font-bold"
                        placeholder="0"
                      />
                      <p className="text-xs text-center text-muted-foreground mt-1">No. of bags</p>
                    </div>
                  </div>

                  {/* Live summary */}
                  {quantity && parseFloat(quantity) > 0 && (
                    <div className="bg-surface-alt rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-card rounded-xl p-2.5">
                          <p className="text-xs text-muted-foreground">Kilograms</p>
                          <p className="font-bold text-base">{(parseFloat(quantity) * 100).toFixed(0)} kg</p>
                        </div>
                        <div className="bg-card rounded-xl p-2.5">
                          <p className="text-xs text-muted-foreground">50kg Bags</p>
                          <p className="font-bold text-base">{Math.ceil(parseFloat(quantity) * 100 / 50)}</p>
                        </div>
                      </div>

                      {/* Rate inputs */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Rate (optional)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Rate per KG (₹)</label>
                            <input
                              type="number"
                              value={mspRate ? String((parseFloat(mspRate) / 100).toFixed(2)) : ''}
                              onChange={e => setMspRate(e.target.value ? String(parseFloat(e.target.value) * 100) : '')}
                              className="input-field text-sm py-2"
                              placeholder="e.g. 22.75"
                            />
                            {mspRate && parseFloat(mspRate) > 0 && (
                              <p className="text-xs text-emerald-600 mt-1 font-medium">
                                = ₹{(parseFloat(quantity) * 100 * (parseFloat(mspRate) / 100)).toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Rate per 50kg Bag (₹)</label>
                            <input
                              type="number"
                              value={mspRate ? String((parseFloat(mspRate) / 2).toFixed(0)) : ''}
                              onChange={e => setMspRate(e.target.value ? String(parseFloat(e.target.value) * 2) : '')}
                              className="input-field text-sm py-2"
                              placeholder="e.g. 1137"
                            />
                            {mspRate && parseFloat(mspRate) > 0 && (
                              <p className="text-xs text-emerald-600 mt-1 font-medium">
                                = ₹{(Math.ceil(parseFloat(quantity) * 100 / 50) * (parseFloat(mspRate) / 2)).toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick select 50kg bags */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Quick select (50kg bags)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 5, 10].map(bags => (
                        <button key={bags} onClick={() => setQuantity(String((bags * 50) / 100))}
                          className={cn('py-2 rounded-xl text-sm font-medium border-2 transition-all',
                            quantity === String((bags * 50) / 100) ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'border-border hover:border-primary-300')}>
                          {bags} bag{bags > 1 ? 's' : ''}
                          <span className="block text-xs opacity-60">{bags * 50}kg</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setStep(3)} disabled={!quantity}
                    className="btn-primary w-full">
                    {t('common.next')} <ChevronRight size={16} className="inline ml-1" />
                  </button>
                </div>
              )}

              {/* Step 3 – Centre */}
              {step === 3 && (
                <div className="space-y-3">
                  <h2 className="font-semibold text-lg">{t('booking.selectCentre')}</h2>
                  {centres.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCentre(c); setStep(4) }}
                      className={cn(
                        'w-full text-left p-4 rounded-2xl border-2 transition-all',
                        selectedCentre?.id === c.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-border hover:border-primary-300',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin size={11} />
                            {c.district}, {c.state}
                          </p>
                        </div>
                        <CrowdBadge level={c.crowd_level} />
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {c.queue_length} waiting
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> ~{c.estimated_wait_minutes} min
                        </span>
                        <span>{c.active_counters} counters open</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 4 – Date */}
              {step === 4 && (
                <div className="space-y-3">
                  <h2 className="font-semibold text-lg">{t('booking.selectDate')}</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {next14Days.map(d => {
                      const dt = new Date(d + 'T00:00:00')
                      return (
                        <button
                          key={d}
                          onClick={() => { setSelectedDate(d); setStep(5) }}
                          className={cn(
                            'p-3 rounded-2xl border-2 text-center transition-all',
                            selectedDate === d
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-border hover:border-primary-300',
                          )}
                        >
                          <p className="text-xs font-medium text-muted-foreground">
                            {dt.toLocaleDateString('en', { weekday: 'short' })}
                          </p>
                          <p className="font-bold text-lg">{dt.getDate()}</p>
                          <p className="text-xs text-muted-foreground">
                            {dt.toLocaleDateString('en', { month: 'short' })}
                          </p>
                          {d === today && (
                            <span className="text-xs text-primary-600 font-semibold">
                              {t('common.today')}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 5 – Slot */}
              {step === 5 && (
                <div className="space-y-3">
                  <h2 className="font-semibold text-lg">{t('booking.selectSlot')}</h2>

                  {/* AI recommendation banner */}
                  {rec && (
                    <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-4 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={15} />
                        <span className="font-semibold text-sm">{t('booking.aiRecommended')}</span>
                      </div>
                      <p className="font-bold">
                        {rec.slot_start_time} – {rec.slot_end_time} · {rec.slot_label}
                      </p>
                      <p className="text-white/80 text-xs mt-1">{rec.reason}</p>
                      <button
                        onClick={() => {
                          const s = slots.find(sl => sl.id === rec.slot_id)
                          if (s) { setSelectedSlot(s); setStep(6) }
                        }}
                        className="mt-3 bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        Select This Slot →
                      </button>
                    </div>
                  )}

                  {slotsFetching && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-surface-alt rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  )}

                  {!slotsFetching && slots.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      <AlertCircle className="mx-auto mb-2" size={32} />
                      {t('booking.noSlots')}
                    </div>
                  )}

                  {slots.map(slot => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      selected={selectedSlot?.id === slot.id}
                      onSelect={() => { setSelectedSlot(slot); setStep(6) }}
                    />
                  ))}
                </div>
              )}

              {/* Step 6 – Confirm */}
              {step === 6 && selectedSlot && (
                <div className="space-y-4">
                  <h2 className="font-semibold text-lg">{t('booking.confirm')}</h2>
                  <div className="bg-card border border-border rounded-2xl divide-y divide-border">
                    {selectedCrop && (
                      <ConfirmRow label="Crop" value={selectedCrop.crop_name} />
                    )}
                    {quantity && (
                      <ConfirmRow label="Quantity" value={`${quantity} qtl`} />
                    )}
                    {selectedCentre && (
                      <ConfirmRow label="Centre" value={selectedCentre.name} />
                    )}
                    <ConfirmRow label="Date" value={selectedDate} />
                    <ConfirmRow
                      label="Slot"
                      value={`${selectedSlot.slot_start_time} – ${selectedSlot.slot_end_time} (${selectedSlot.slot_label})`}
                    />
                    <ConfirmRow
                      label="Est. Wait"
                      value={`~${selectedSlot.estimated_wait_minutes} min`}
                    />
                    <ConfirmRow label="Crowd" value={<CrowdBadge level={selectedSlot.crowd_level} />} />
                  </div>
                  <button
                    onClick={() => bookMutation.mutate()}
                    disabled={bookMutation.isPending}
                    className="btn-primary w-full py-4 text-base"
                  >
                    {bookMutation.isPending ? 'Confirming...' : t('booking.confirm')}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Back button */}
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              <ChevronLeft size={16} /> {t('common.back')}
            </button>
          )}
        </>
      )}

      {/* ── Active bookings section ─────────────────────────────── */}
      {activeBookings.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">{t('dashboard.activeBooking')}</h3>
          <div className="space-y-2">
            {activeBookings.map((b: Booking) => (
              <div
                key={b.id}
                className="bg-card border border-border rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{b.token_number}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {b.centre_name} · {b.slot?.slot_date} · {b.slot?.slot_start_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setRescheduleTarget(b)}
                      className="p-1.5 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title={t('booking.reschedule')}
                    >
                      <RefreshCw size={15} />
                    </button>
                    <button
                      onClick={() => setCancelTarget(b)}
                      className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title={t('booking.cancel')}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cancel modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {cancelTarget && (
          <Modal onClose={() => setCancelTarget(null)}>
            <h3 className="font-bold text-lg mb-1">{t('booking.cancelConfirm')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Token: <strong>{cancelTarget.token_number}</strong>
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="input-field resize-none mb-4"
              rows={2}
              placeholder={t('booking.cancelReason')}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="btn-secondary flex-1"
              >
                {t('common.no')}
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {cancelMutation.isPending ? '...' : t('common.yes') + ' – Cancel'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Reschedule modal ────────────────────────────────────── */}
      <AnimatePresence>
        {rescheduleTarget && (
          <Modal onClose={() => { setRescheduleTarget(null); setRescheduleDate(''); setRescheduleSlot(null) }}>
            <h3 className="font-bold text-lg mb-1">{t('booking.rescheduleTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Current booking: <strong>{rescheduleTarget.token_number}</strong>
              {' · '}{rescheduleTarget.slot?.slot_date}
            </p>

            {/* Date picker */}
            <p className="text-sm font-medium mb-2">{t('booking.selectDate')}</p>
            <div className="grid grid-cols-4 gap-1.5 mb-4 max-h-32 overflow-y-auto">
              {next14Days.filter(d => d !== rescheduleTarget.slot?.slot_date).map(d => {
                const dt = new Date(d + 'T00:00:00')
                return (
                  <button
                    key={d}
                    onClick={() => { setRescheduleDate(d); setRescheduleSlot(null) }}
                    className={cn(
                      'p-2 rounded-xl border-2 text-center transition-all text-xs',
                      rescheduleDate === d
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-border hover:border-primary-300',
                    )}
                  >
                    <span className="block font-bold">{dt.getDate()}</span>
                    <span className="text-muted-foreground">
                      {dt.toLocaleDateString('en', { month: 'short' })}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Slot picker */}
            {rescheduleDate && (
              <>
                <p className="text-sm font-medium mb-2">{t('booking.selectSlot')}</p>
                {rescheduleFetching ? (
                  <div className="h-20 bg-surface-alt rounded-2xl animate-pulse" />
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('booking.noSlots')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {rescheduleSlots.map((slot: Slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        selected={rescheduleSlot?.id === slot.id}
                        onSelect={() => setRescheduleSlot(slot)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRescheduleTarget(null); setRescheduleDate(''); setRescheduleSlot(null) }}
                className="btn-secondary flex-1"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => rescheduleMutation.mutate()}
                disabled={!rescheduleSlot || rescheduleMutation.isPending}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {rescheduleMutation.isPending ? '...' : t('booking.reschedule')}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Small reusable sub-components ────────────────────────────────────────────

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: React.ReactNode
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/80 text-sm">{label}</span>
      <span className={cn('text-sm', bold ? 'font-bold text-base' : 'font-medium')}>
        {value}
      </span>
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[55%]">{value}</span>
    </div>
  )
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
