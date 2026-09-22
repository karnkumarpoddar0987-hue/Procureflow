import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, CheckCircle2, Clock, AlertCircle,
  Smartphone, QrCode, Download, Building2,
  IndianRupee, Hash, Calendar, Wheat, Scale,
  History, ChevronDown, ChevronUp,
} from 'lucide-react'
import { farmerApi } from '@/api/farmer'
import { cn } from '@/utils/cn'

// ── Payment method icons & labels ─────────────────────────────────────────────
const METHODS = [
  { id: 'UPI',         label: 'UPI',          icon: Smartphone,  color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  { id: 'DEBIT_CARD',  label: 'Debit Card',   icon: CreditCard,  color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  { id: 'CREDIT_CARD', label: 'Credit Card',  icon: CreditCard,  color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  { id: 'QR_CODE',     label: 'QR Code',      icon: QrCode,      color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  { id: 'NEFT',        label: 'NEFT / Bank',  icon: Building2,   color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
]

// ── Payment Slip component ─────────────────────────────────────────────────────
function PaymentSlip({ payment, procurement, booking, slipRef }: {
  payment: any; procurement: any; booking: any; slipRef: React.RefObject<HTMLDivElement>
}) {
  const txnId = payment.transaction_reference || `TXN${Date.now()}`
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div ref={slipRef} style={{ fontFamily: 'sans-serif', maxWidth: 400 }}
      className="bg-white rounded-2xl border-2 border-green-200 overflow-hidden shadow-lg">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#059669,#10b981)', padding: '16px 20px' }}>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
              Government of India
            </p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '2px 0 0' }}>Procureflow</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>Payment Receipt</p>
          </div>
          <CheckCircle2 color="rgba(255,255,255,0.85)" size={34} />
        </div>
      </div>

      {/* Amount */}
      <div className="bg-green-50 px-5 py-4 text-center border-b border-green-100">
        <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Amount Credited</p>
        <p className="text-4xl font-bold text-green-700 mt-1">
          ₹{(payment.amount || 0).toLocaleString('en-IN')}
        </p>
        <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
          {payment.status}
        </span>
      </div>

      {/* Details */}
      <div className="px-5 py-4 space-y-2.5">
        {[
          { icon: Hash,         label: 'Transaction ID',  value: txnId },
          { icon: Hash,         label: 'Token Number',    value: booking?.token_number || '—' },
          { icon: CreditCard,   label: 'Payment Mode',    value: payment.payment_mode || '—' },
          { icon: Wheat,        label: 'Crop',            value: procurement?.crop_name || procurement?.stage ? procurement.crop_name || '—' : '—' },
          { icon: Scale,        label: 'Net Weight',      value: procurement?.net_weight ? `${procurement.net_weight} qtl (${(procurement.net_weight * 100).toFixed(0)} kg)` : '—' },
          { icon: IndianRupee,  label: 'MSP Rate',        value: procurement?.msp_per_quintal ? `₹${procurement.msp_per_quintal}/qtl` : '—' },
          { icon: IndianRupee,  label: 'Total Amount',    value: `₹${(payment.amount || 0).toLocaleString('en-IN')}` },
          { icon: Calendar,     label: 'Date',            value: today },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Icon size={12} /> {label}
            </div>
            <span className="text-xs font-semibold text-gray-800 text-right max-w-[180px]">{value}</span>
          </div>
        ))}
      </div>

      {/* Barcode */}
      <div className="px-5 pb-2 flex gap-0.5 h-8 items-end">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} style={{ flex: 1, borderRadius: 1, background: '#064e3b',
            height: `${35 + ((i * 37 + 13) % 65)}%`, opacity: 0.75 }} />
        ))}
      </div>

      {/* Footer */}
      <div className="bg-green-50 px-5 py-2 text-center border-t border-green-100">
        <p style={{ fontSize: 9, color: '#065f46' }}>
          This is an auto-generated receipt. Procureflow — Agricultural Procurement System
        </p>
      </div>
    </div>
  )
}

// ── QR Code display ────────────────────────────────────────────────────────────
function UPIQRDisplay({ amount, onAmountChange }: { amount: number; onAmountChange: (v: number) => void }) {
  // Real UPI QR using QRCode component
  const upiStr = `upi://pay?pa=procureflow@okaxis&pn=Procureflow+Govt&am=${amount}&cu=INR&tn=Procurement+Payment`
  return (
    <div className="text-center space-y-3">
      <div className="w-48 h-48 mx-auto bg-white border-2 border-green-300 rounded-2xl flex items-center justify-center p-3">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiStr)}&bgcolor=ffffff&color=000000&margin=2`}
          alt="UPI QR Code"
          className="w-full h-full object-contain rounded-xl"
        />
      </div>
      <p className="text-xs text-muted-foreground">Scan with PhonePe / GPay / Paytm / any UPI app</p>
      <p className="font-mono text-xs bg-surface-alt px-3 py-1.5 rounded-xl">procureflow@okaxis</p>
      <div className="flex items-center gap-2 justify-center">
        <span className="text-sm font-medium text-muted-foreground">₹</span>
        <input
          type="number"
          value={amount || ''}
          onChange={e => onAmountChange(Number(e.target.value))}
          className="input-field text-center text-xl font-bold text-green-600 w-36 py-2"
          min={1}
          placeholder="Enter amount"
        />
      </div>
      <p className="text-xs text-muted-foreground">QR updates with amount</p>
    </div>
  )
}

// ── Card payment form ──────────────────────────────────────────────────────────
function CardForm({ type }: { type: 'DEBIT_CARD' | 'CREDIT_CARD' }) {
  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl p-4 text-white', type === 'DEBIT_CARD'
        ? 'bg-gradient-to-r from-blue-600 to-blue-800'
        : 'bg-gradient-to-r from-orange-500 to-orange-700')}>
        <p className="text-xs opacity-70 mb-3">{type === 'DEBIT_CARD' ? 'Debit Card' : 'Credit Card'}</p>
        <p className="font-mono text-lg tracking-widest">•••• •••• •••• ••••</p>
        <div className="flex justify-between mt-3 text-xs opacity-80">
          <span>CARDHOLDER NAME</span><span>MM/YY</span>
        </div>
      </div>
      <input type="text" placeholder="Card Number" className="input-field font-mono" maxLength={19} />
      <div className="grid grid-cols-2 gap-3">
        <input type="text" placeholder="MM / YY" className="input-field" maxLength={5} />
        <input type="text" placeholder="CVV" className="input-field" maxLength={3} />
      </div>
      <input type="text" placeholder="Cardholder Name" className="input-field" />
      <p className="text-xs text-muted-foreground text-center">🔒 Demo mode — no real transaction</p>
    </div>
  )
}

// ── NEFT details ───────────────────────────────────────────────────────────────
function NEFTDetails({ amount }: { amount: number }) {
  return (
    <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl p-4 space-y-2.5">
      <p className="font-semibold text-cyan-800 dark:text-cyan-300 text-sm">Bank Transfer Details</p>
      {[
        ['Account Name',   'Procureflow Govt. Fund'],
        ['Account Number', '1234 5678 9012 3456'],
        ['IFSC Code',      'PROC0001234'],
        ['Bank',           'State Bank of India'],
        ['Amount',         `₹${amount.toLocaleString('en-IN')}`],
        ['Reference',      'Procurement Payment'],
      ].map(([label, value]) => (
        <div key={label} className="flex justify-between text-xs">
          <span className="text-cyan-700 dark:text-cyan-400">{label}</span>
          <span className="font-mono font-semibold">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Payment History Section ────────────────────────────────────────────────────
function PaymentHistorySection({ bookings, onPay }: { bookings: any[]; onPay?: (amount: number) => void }) {
  const [open, setOpen] = useState(true)
  const [paidIds, setPaidIds] = useState<number[]>([])

  const completed = bookings.filter((b: any) => b.status === 'COMPLETED')
  const pending = bookings.filter((b: any) => b.status === 'CONFIRMED' && !paidIds.includes(b.id))

  if (bookings.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Pending payments */}
      {pending.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Clock size={15} /> Pending Payments ({pending.length})
            </p>
          </div>
          <div className="space-y-3">
            {pending.map((b: any) => {
              // Use estimated_wait_minutes field as proxy — real amount comes from procurement
              // quantity_quintals * MSP (wheat default 2275, show as estimated)
              const qty = b.quantity_quintals || 0
              // We show actual amount only if available, else show quantity info
              return (
                <div key={b.id} className="bg-white dark:bg-gray-900/40 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-mono text-sm font-bold text-amber-700">{b.token_number}</p>
                      <p className="text-xs text-muted-foreground">{b.centre_name}</p>
                      <p className="text-xs text-muted-foreground">{b.slot?.slot_date} · {b.slot?.slot_start_time}</p>
                      {qty > 0 && (
                        <p className="text-xs text-amber-700 font-medium mt-1">
                          {qty} qtl = {(qty * 100).toFixed(0)} kg
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full mb-1">
                        Pending
                      </span>
                      {qty > 0 && (
                        <p className="text-xs text-muted-foreground">
                          After weighing
                        </p>
                      )}
                    </div>
                  </div>
                  {onPay && null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payment history */}
      {completed.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-alt transition-colors">
            <div className="flex items-center gap-2">
              <History size={16} className="text-emerald-600" />
              <p className="font-semibold text-sm">Payment History ({completed.length})</p>
            </div>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {open && (
            <div className="divide-y divide-border">
              {completed.map((b: any) => (
                <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold">{b.token_number}</p>
                    <p className="text-xs text-muted-foreground">{b.centre_name} · {b.slot?.slot_date}</p>
                  </div>
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 text-xs font-semibold rounded-full">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FarmerPayment() {
  const { t } = useTranslation()
  const slipRef = useRef<HTMLDivElement>(null)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [editableAmount, setEditableAmount] = useState<number>(0)
  const [txnId] = useState(`TXN${Date.now().toString().slice(-10)}`)
  const [showHistory, setShowHistory] = useState(false)

  const { data: activeData, isLoading } = useQuery({
    queryKey: ['active-booking'],
    queryFn: () => farmerApi.getActiveBooking().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: allBookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => farmerApi.getBookings().then(r => r.data),
  })

  const payment = activeData?.payment
  const procurement = activeData?.procurement
  const booking = activeData?.booking

  // Initialize editable amount from procurement when data loads
  const procAmount = procurement?.total_amount || 0
  const displayAmount = editableAmount > 0 ? editableAmount : procAmount

  const downloadSlip = async () => {
    if (!slipRef.current) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(slipRef.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true })
      const link = document.createElement('a')
      link.download = `Payment_Slip_${booking?.token_number || 'receipt'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { window.print() }
  }

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Clock className="animate-spin text-primary-600" size={32} />
    </div>
  )

  // ── No payment yet — show pending only ──────────────────────────────────
  if (!payment || payment.status === 'PENDING') {
    return (
      <div className="space-y-5 pb-24 lg:pb-6 max-w-lg">
        <h1 className="text-2xl font-bold">{t('payment.title')}</h1>
        <PaymentHistorySection bookings={allBookings} />
      </div>
    )
  }

  // ── Payment exists — show slip ─────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-24 lg:pb-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('payment.title')}</h1>
        <button onClick={downloadSlip}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium">
          <Download size={14} /> Download Slip
        </button>
      </div>

      <PaymentSlip payment={payment} procurement={procurement} booking={booking} slipRef={slipRef} />

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        {procurement?.total_amount && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Calculation</span>
            <span className="text-sm">{procurement.net_weight} qtl × ₹{procurement.msp_per_quintal} = <strong className="text-primary-600">₹{procurement.total_amount?.toLocaleString('en-IN')}</strong></span>
          </div>
        )}
        {payment.initiated_at && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Initiated</span>
            <span>{new Date(payment.initiated_at).toLocaleDateString('en-IN')}</span>
          </div>
        )}
        {payment.completed_at && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completed</span>
            <span className="text-emerald-600 font-medium">{new Date(payment.completed_at).toLocaleDateString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* Payment History */}
      <PaymentHistorySection bookings={allBookings} onPay={(amount) => setEditableAmount(amount)} />
    </div>
  )
}
