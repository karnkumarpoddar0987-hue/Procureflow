import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Leaf, Upload, CreditCard, Phone, Camera, X, CheckCircle, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'

type RegMethod = 'normal' | 'aadhaar_number' | 'aadhaar_scan'

export default function RegisterPage() {
  const { t } = useTranslation()
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [method, setMethod] = useState<RegMethod | null>(null)
  const [loading, setLoading] = useState(false)
  const [ekyc, setEkyc] = useState(false)

  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Success state — show generated credentials
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; mobile: string; password: string } | null>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', mobile: '', password: '', confirm_password: '',
    village: '', district: '', state: '', aadhaar_masked: '', consent: false
  })

  const setField = (k: keyof typeof form, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  // ── Camera functions ──────────────────────────────────────────────
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      setCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch {
      toast.error('Camera access denied. Please allow camera permission.')
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg')
    setCapturedImage(dataUrl)
    closeCamera()
    // Simulate eKYC processing
    processAadhaarImage()
  }

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  const processAadhaarImage = async () => {
    setEkyc(true)
    await new Promise(r => setTimeout(r, 1800))
    setForm(f => ({
      ...f,
      full_name: f.full_name || 'Ramesh Kumar Sahu',
      mobile: f.mobile || '9876543210',
      village: f.village || 'Dhanora',
      district: f.district || 'Raipur',
      state: f.state || 'Chhattisgarh',
      aadhaar_masked: 'XXXX-XXXX-5678'
    }))
    setEkyc(false)
    toast.success('Aadhaar scanned! Details autofilled.')
  }

  const handleAadhaarScan = async () => {
    setEkyc(true)
    await new Promise(r => setTimeout(r, 1800))
    setForm(f => ({
      ...f,
      full_name: 'Ramesh Kumar Sahu',
      mobile: '9876543210',
      village: 'Dhanora',
      district: 'Raipur',
      state: 'Chhattisgarh',
      aadhaar_masked: 'XXXX-XXXX-5678'
    }))
    setEkyc(false)
    toast.success('Demo eKYC complete! Details autofilled.')
  }

  const handleAadhaarNumber = async (num: string) => {
    if (num.length === 12) {
      setEkyc(true)
      await new Promise(r => setTimeout(r, 1200))
      setForm(f => ({
        ...f,
        aadhaar_masked: `XXXX-XXXX-${num.slice(-4)}`,
        village: 'Dhanora', district: 'Raipur', state: 'Chhattisgarh'
      }))
      setEkyc(false)
      toast.success('Demo eKYC complete!')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.consent) return toast.error('Please accept terms')
    if (form.password !== form.confirm_password) return toast.error(t('errors.passwordMismatch'))
    setLoading(true)
    try {
      const res = await authApi.register({
        ...form,
        kyc_method: method || 'normal',
        consent: form.consent
      })
      const { access_token, user_id, role, full_name } = res.data
      setAuth(access_token, { id: user_id, role, full_name, is_active: true })
      // Show credentials to user before redirecting
      setCreatedCredentials({
        email: form.email,
        mobile: form.mobile,
        password: form.password,
      })
      toast.success('Account created successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  // ── Success screen ────────────────────────────────────────────────
  if (createdCredentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card rounded-3xl shadow-xl border border-border p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={36} />
            </div>
            <h2 className="text-2xl font-bold mb-1">Account Created!</h2>
            <p className="text-muted-foreground text-sm mb-6">Save your login credentials below</p>

            <div className="bg-surface-alt rounded-2xl p-4 text-left space-y-3 mb-6">
              {createdCredentials.email && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Email / Login ID</p>
                    <p className="font-mono font-semibold">{createdCredentials.email}</p>
                  </div>
                  <button onClick={() => copyToClipboard(createdCredentials.email)} className="p-2 hover:bg-border rounded-lg">
                    <Copy size={15} className="text-muted-foreground" />
                  </button>
                </div>
              )}
              {createdCredentials.mobile && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile / Login ID</p>
                    <p className="font-mono font-semibold">{createdCredentials.mobile}</p>
                  </div>
                  <button onClick={() => copyToClipboard(createdCredentials.mobile)} className="p-2 hover:bg-border rounded-lg">
                    <Copy size={15} className="text-muted-foreground" />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="font-mono font-semibold">{createdCredentials.password}</p>
                </div>
                <button onClick={() => copyToClipboard(createdCredentials.password)} className="p-2 hover:bg-border rounded-lg">
                  <Copy size={15} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-6">
              ⚠️ Please save these credentials. Use Email/Mobile + Password to login.
            </p>

            <button
              onClick={() => navigate('/farmer/dashboard')}
              className="btn-primary w-full py-3.5"
            >
              Go to Dashboard →
            </button>
            <div className="mt-3">
              <Link to="/login/farmer" className="text-sm text-primary-600 hover:underline">
                Login with these credentials
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Method selection ──────────────────────────────────────────────
  if (!method) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Leaf className="text-primary-600" size={22} />
            <span className="font-bold text-primary-700 dark:text-primary-400">Procureflow</span>
          </div>
          <div className="flex gap-2"><LanguageSwitcher /><ThemeSwitcher /></div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="bg-card rounded-3xl shadow-xl border border-border p-8">
              <h1 className="text-2xl font-bold text-center mb-2">{t('register.title')}</h1>
              <p className="text-muted-foreground text-center text-sm mb-8">{t('register.selectMethod')}</p>
              <div className="space-y-3">
                {[
                  { method: 'aadhaar_scan' as RegMethod, icon: Upload, label: t('register.aadhaarScan'), desc: 'Upload or capture Aadhaar photo' },
                  { method: 'aadhaar_number' as RegMethod, icon: CreditCard, label: t('register.aadhaarNumber'), desc: 'Enter your 12-digit Aadhaar' },
                  { method: 'normal' as RegMethod, icon: Phone, label: t('register.normalReg'), desc: 'Register with mobile/email' },
                ].map(({ method: m, icon: Icon, label, desc }) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
                  >
                    <div className="w-10 h-10 bg-surface-alt rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-primary-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {t('auth.haveAccount')}{' '}
                <Link to="/login/farmer" className="text-primary-600 font-medium hover:underline">
                  {t('auth.login')}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // ── Registration form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex flex-col">

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="relative w-full max-w-lg">
            <video ref={videoRef} className="w-full rounded-2xl" playsInline />
            {/* Aadhaar frame guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-white/80 rounded-2xl w-4/5 h-48 flex items-center justify-center">
                <span className="text-white/70 text-sm">Align Aadhaar card here</span>
              </div>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-4 mt-6">
            <button
              onClick={capturePhoto}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"
            >
              <Camera size={28} className="text-gray-800" />
            </button>
            <button
              onClick={closeCamera}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
          <p className="text-white/60 text-sm mt-4">Tap camera button to capture</p>
        </div>
      )}

      <div className="flex items-center justify-between p-4">
        <button onClick={() => setMethod(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          ← {t('common.back')}
        </button>
        <div className="flex gap-2"><LanguageSwitcher /><ThemeSwitcher /></div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-card rounded-3xl shadow-xl border border-border p-6">
            <h1 className="text-xl font-bold mb-6">{t('register.title')}</h1>

            {/* Aadhaar scan — upload or camera */}
            {method === 'aadhaar_scan' && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3">{t('register.aadhaarNote')}</p>
                <div className="flex gap-2">
                  {/* Camera capture */}
                  <button
                    type="button"
                    onClick={openCamera}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <Camera size={16} /> Take Photo
                  </button>
                  {/* File upload */}
                  <label className="flex-1">
                    <input type="file" accept="image/*" className="hidden" onChange={handleAadhaarScan} />
                    <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl cursor-pointer text-sm font-medium transition-colors">
                      <Upload size={16} /> Upload File
                    </div>
                  </label>
                </div>
                {capturedImage && (
                  <div className="mt-3">
                    <img src={capturedImage} alt="Captured Aadhaar" className="w-full rounded-xl border-2 border-primary-300 max-h-32 object-cover" />
                    <p className="text-xs text-green-600 mt-1 font-medium">✓ Aadhaar photo captured</p>
                  </div>
                )}
                {ekyc && <p className="text-xs mt-2 text-amber-700 animate-pulse">Processing Aadhaar... please wait</p>}
              </div>
            )}

            {method === 'aadhaar_number' && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">{t('register.aadhaarNote')}</p>
                <input
                  type="text"
                  maxLength={12}
                  className="input-field"
                  placeholder="123456789012"
                  onChange={e => handleAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                />
                {ekyc && <p className="text-xs mt-2 animate-pulse">Verifying Aadhaar...</p>}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'full_name', label: t('register.fullName'), type: 'text', required: true },
                { key: 'mobile', label: t('register.mobile'), type: 'tel', required: false },
                { key: 'email', label: t('register.email'), type: 'email', required: false },
                { key: 'village', label: t('register.village'), type: 'text', required: false },
                { key: 'district', label: t('register.district'), type: 'text', required: false },
                { key: 'state', label: t('register.state'), type: 'text', required: false },
              ].map(({ key, label, type, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1.5">{label}{required && ' *'}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form] as string}
                    onChange={e => setField(key as keyof typeof form, e.target.value)}
                    className="input-field"
                    required={required}
                    autoComplete="off"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-1.5">{t('register.password')} *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  className="input-field"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t('register.confirmPassword')} *</label>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={e => setField('confirm_password', e.target.value)}
                  className="input-field"
                  required
                  autoComplete="new-password"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={e => setField('consent', e.target.checked)}
                  className="mt-1 w-4 h-4 accent-primary-600"
                />
                <span className="text-sm text-muted-foreground">{t('auth.consent')}</span>
              </label>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? t('auth.registering') : t('register.submit')}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
