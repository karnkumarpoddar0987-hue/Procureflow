import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'

type Step = 'request' | 'verify'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('request')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const type = identifier.includes('@') ? 'email' : 'mobile'
      const res = await authApi.forgotPassword(identifier, type)
      setDemoOtp(res.data.demo_otp)
      setStep('verify')
      toast.success(t('auth.otpSent'))
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return toast.error(t('errors.passwordMismatch'))
    setLoading(true)
    try {
      const type = identifier.includes('@') ? 'email' : 'mobile'
      await authApi.resetPassword({
        ...(type === 'mobile' ? { mobile: identifier } : { email: identifier }),
        otp, new_password: newPassword, confirm_password: confirmPassword
      })
      toast.success('Password reset successfully!')
      navigate('/login/farmer')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex flex-col">
      <div className="flex items-center justify-between p-4">
        <Link to="/login/farmer" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('auth.backToLogin')}
        </Link>
        <div className="flex gap-2"><LanguageSwitcher /><ThemeSwitcher /></div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-card rounded-3xl shadow-xl border border-border p-8">
            <h1 className="text-2xl font-bold mb-2">{t('auth.forgotPasswordTitle')}</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {step === 'request' ? 'Enter your mobile or email to get OTP' : 'Enter OTP and new password'}
            </p>

            {step === 'request' ? (
              <form onSubmit={handleRequest} className="space-y-4">
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="input-field"
                  placeholder="Mobile or Email"
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? '...' : t('auth.sendOtp')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                {demoOtp && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      🔑 Demo OTP: <strong className="text-lg">{demoOtp}</strong>
                    </p>
                  </div>
                )}
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)} className="input-field text-center text-xl tracking-widest" placeholder="000000" maxLength={6} required />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" placeholder={t('auth.newPassword')} required minLength={6} />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" placeholder={t('auth.confirmPassword')} required />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? '...' : t('auth.resetPassword')}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
