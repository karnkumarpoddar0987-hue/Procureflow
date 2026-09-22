import { useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Leaf, Phone, Lock, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'

type Mode = 'password' | 'otp'

export default function FarmerLoginPage() {
  const { t } = useTranslation()
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  // All form state starts completely empty — no defaults, no demo values
  const [mode, setMode] = useState<Mode>('password')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [demoOtp, setDemoOtp] = useState('')

  // Unique IDs so browser cannot match saved passwords by name/id
  const uid = useId()
  const identifierId = `${uid}-identifier`
  const passwordId = `${uid}-password`

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.farmerLogin(identifier, password)
      const { access_token, user_id, role, full_name } = res.data
      setAuth(access_token, { id: user_id, role, full_name, is_active: true })
      toast.success(`Welcome back, ${full_name || 'Farmer'}!`)
      navigate('/farmer/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('errors.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    if (!identifier) return toast.error('Enter your mobile or email first')
    setLoading(true)
    try {
      const type = identifier.includes('@') ? 'email' : 'mobile'
      const res = await authApi.sendOtp(identifier, type)
      setDemoOtp(res.data.demo_otp)
      setOtpSent(true)
      toast.success(t('auth.otpSent'))
    } catch {
      toast.error(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ position: 'relative' }}>

      {/* ── Background image ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Subtle dark overlay for readability */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(0,0,0,0.35)' }} />

      {/* ── Page content ── */}
      <div style={{ position: 'relative', zIndex: 2 }} className="flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl">
            <Leaf className="text-primary-600" size={22} />
            <span className="font-bold text-primary-700 dark:text-primary-300">Procureflow</span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>

        {/* Centered login card */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-border p-8">

              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Leaf className="text-primary-600" size={28} />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t('auth.farmerLogin')}</h1>
                <p className="text-muted-foreground text-sm mt-1">{t('auth.loginSubtitle')}</p>
              </div>

              {/* Mode tabs */}
              <div className="flex rounded-xl bg-surface-alt p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setMode('password')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'password' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <Lock size={14} /> {t('auth.password')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('otp')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    mode === 'otp' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  <MessageSquare size={14} /> OTP
                </button>
              </div>

              {/*
                autoComplete="off" on form + unique generated id/name on inputs
                prevents browser from matching saved credentials to these fields
              */}
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">

                {/* Mobile / Email */}
                <div>
                  <label htmlFor={identifierId} className="block text-sm font-medium mb-1.5">
                    {t('auth.mobile')} / {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={17} />
                    <input
                      id={identifierId}
                      name={identifierId}
                      type="search"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      className="input-field pl-10"
                      placeholder=""
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck={false}
                      style={{ paddingLeft: '2.5rem' }}
                      onAnimationStart={e => {
                        if ((e.target as HTMLInputElement).value !== identifier) {
                          setIdentifier('')
                        }
                      }}
                      required
                    />
                  </div>
                </div>

                {mode === 'password' ? (
                  <div>
                    <label htmlFor={passwordId} className="block text-sm font-medium mb-1.5">
                      {t('auth.password')}
                    </label>
                    <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={17} />
                      <input
                        id={passwordId}
                        name={passwordId}
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-field pr-10"
                        placeholder=""
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
                        style={{ paddingLeft: '2.5rem' }}
                        onAnimationStart={e => {
                          if ((e.target as HTMLInputElement).value !== password) {
                            setPassword('')
                          }
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    <div className="text-right mt-1">
                      <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                        {t('auth.forgotPassword')}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="btn-primary w-full"
                      >
                        {loading ? '...' : t('auth.sendOtp')}
                      </button>
                    ) : (
                      <>
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            🔑 Demo OTP: <span className="font-bold text-lg">{demoOtp}</span>
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                            (Demo system - no real SMS sent)
                          </p>
                        </div>
                        <input
                          type="text"
                          value={otp}
                          onChange={e => setOtp(e.target.value)}
                          className="input-field text-center text-xl tracking-widest"
                          placeholder="000000"
                          maxLength={6}
                          autoComplete="one-time-code"
                        />
                      </>
                    )}
                  </div>
                )}

                {(mode === 'password' || otpSent) && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full text-base py-3.5"
                  >
                    {loading ? t('auth.loggingIn') : t('auth.login')}
                  </button>
                )}
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('auth.noAccount')}{' '}
                  <Link to="/register" className="text-primary-600 font-medium hover:underline">
                    {t('auth.register')}
                  </Link>
                </p>
              </div>
            </div>

            {/* Staff login link */}
            <div className="text-center mt-4">
              <Link to="/login/staff" className="text-sm text-white/80 hover:text-white drop-shadow">
                {t('auth.centreOfficerLogin')} →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
