import { useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Building2, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'

export default function StaffLoginPage() {
  const { t } = useTranslation()
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const uid = useId()
  const emailId = `${uid}-email`
  const passwordId = `${uid}-pw`

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.staffLogin(email, password)
      const { access_token, user_id, role, full_name } = res.data
      setAuth(access_token, { id: user_id, role, full_name, is_active: true })
      toast.success('Logged in successfully')
      if (role === 'CENTRE_OPERATOR') navigate('/operator/dashboard')
      else if (role === 'GOVERNMENT_OFFICER') navigate('/officer/dashboard')
      else navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('errors.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col">

      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(0,0,0,0.35)' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }} className="flex flex-col min-h-screen">

        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl">
            <Building2 className="text-primary-600" size={22} />
            <span className="font-bold text-primary-700 dark:text-primary-400">Procureflow</span>
          </div>
          <div className="flex gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-border p-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="text-blue-600" size={28} />
                </div>
                <h1 className="text-2xl font-bold">{t('auth.centreOfficerLogin')}</h1>
                <p className="text-muted-foreground text-sm mt-1">{t('auth.loginSubtitle')}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                <div>
                  <label htmlFor={emailId} className="block text-sm font-medium mb-1.5">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={17} />
                    <input
                      id={emailId}
                      name={emailId}
                      type="search"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field"
                      placeholder=""
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      style={{ paddingLeft: '2.5rem' }}
                      onAnimationStart={e => {
                        if ((e.target as HTMLInputElement).value !== email) setEmail('')
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={passwordId} className="block text-sm font-medium mb-1.5">{t('auth.password')}</label>
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
                        if ((e.target as HTMLInputElement).value !== password) setPassword('')
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  {loading ? t('auth.loggingIn') : t('auth.login')}
                </button>
              </form>
            </div>

            <div className="text-center mt-4">
              <Link to="/login/farmer" className="text-sm text-white/80 hover:text-white drop-shadow">
                ← {t('auth.farmerLogin')}
              </Link>
            </div>

            {/* Demo credentials */}
            <div className="mt-4 bg-white/90 dark:bg-gray-900/90 rounded-2xl p-4 text-sm">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Demo Accounts</p>
              {[
                { role: 'Centre Operator', email: 'operator@demo.com', password: 'operator123' },
                { role: 'Government Officer', email: 'officer@demo.com', password: 'officer123' },
              ].map(({ role, email, password }) => (
                <div key={email} className="mb-3 last:mb-0 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-primary-600 mb-1.5">{role}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">Email</span>
                      <code
                        onClick={() => { navigator.clipboard.writeText(email) }}
                        className="text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded cursor-pointer hover:bg-primary-50 border border-gray-200 select-all"
                        title="Click to copy"
                      >{email}</code>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">Password</span>
                      <code
                        onClick={() => { navigator.clipboard.writeText(password) }}
                        className="text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded cursor-pointer hover:bg-primary-50 border border-gray-200 select-all"
                        title="Click to copy"
                      >{password}</code>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 text-center mt-2">Click any value to copy</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
