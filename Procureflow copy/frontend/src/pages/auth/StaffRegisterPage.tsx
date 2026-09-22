import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Camera, Upload, X, CheckCircle, Copy, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import ThemeSwitcher from '@/components/shared/ThemeSwitcher'

interface CreatedStaff {
  employee_id: string
  email: string
  full_name: string
  role: string
  department: string
  dob: string
  photo: string
}

export default function StaffRegisterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [created, setCreated] = useState<CreatedStaff | null>(null)

  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    role: 'CENTRE_OPERATOR', dob: '', department: '',
    employee_id: '', phone: '',
  })

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof typeof form, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      }, 100)
    } catch {
      toast.error('Camera access denied')
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    c.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      setPhotoFile(file)
      setPhotoPreview(c.toDataURL('image/jpeg'))
    }, 'image/jpeg', 0.9)
    closeCamera()
  }

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photoFile) return toast.error('Photo is required — please capture or upload a photo')

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    fd.append('photo', photoFile)

    setLoading(true)
    try {
      const res = await adminApi.registerStaff(fd)
      const d = res.data
      setCreated({
        employee_id: d.employee_id,
        email: d.email,
        full_name: d.full_name,
        role: d.role,
        department: form.department,
        dob: form.dob,
        photo: photoPreview!,
      })
      toast.success('Staff account created!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!') }

  // ── Success: Digital ID Card ──────────────────────────────────────
  if (created) {
    const roleLabel = created.role === 'CENTRE_OPERATOR' ? 'Centre Operator' : 'Government Officer'
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900 flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <p className="text-center text-sm text-muted-foreground mb-4">Account created successfully ✓</p>

          {/* Digital ID Card */}
          <div className="rounded-3xl overflow-hidden shadow-2xl border-2 border-blue-200 dark:border-blue-800">
            {/* Card header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Procureflow</p>
                <p className="text-white font-bold text-sm">Digital Identity Card</p>
              </div>
              <Building2 className="text-white/80" size={28} />
            </div>

            {/* Card body */}
            <div className="bg-white dark:bg-gray-900 px-5 py-5">
              <div className="flex gap-4 items-start">
                {/* Photo */}
                <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-blue-200 shrink-0 bg-gray-100">
                  <img src={created.photo} alt="Staff" className="w-full h-full object-cover" />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-base leading-tight">{created.full_name}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                    {roleLabel}
                  </span>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">{created.department}</p>
                    <p className="text-xs text-muted-foreground">DOB: {created.dob}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Employee ID</span>
                  <span className="font-mono text-sm font-bold text-blue-600">{created.employee_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Email</span>
                  <span className="text-xs font-medium truncate ml-2">{created.email}</span>
                </div>
              </div>

              {/* Barcode-like decoration */}
              <div className="mt-4 flex gap-0.5 h-6 items-end">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-blue-800 dark:bg-blue-400 rounded-sm"
                    style={{ height: `${Math.random() * 100}%`, opacity: 0.7 + Math.random() * 0.3 }} />
                ))}
              </div>
            </div>

            {/* Card footer */}
            <div className="bg-blue-50 dark:bg-blue-950/40 px-5 py-2 text-center">
              <p className="text-xs text-blue-600/70">Government of India — Agricultural Procurement System</p>
            </div>
          </div>

          {/* Credentials */}
          <div className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-border p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Login Credentials</p>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Email</p><p className="font-mono text-sm">{created.email}</p></div>
              <button onClick={() => copy(created.email)} className="p-1.5 hover:bg-surface-alt rounded-lg"><Copy size={14} /></button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">Password</p><p className="font-mono text-sm">••••••• (as set)</p></div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={() => navigate('/login/staff')} className="btn-primary flex-1 py-3">
              Go to Login
            </button>
            <button onClick={() => { setCreated(null); setForm({ full_name:'',email:'',password:'',role:'CENTRE_OPERATOR',dob:'',department:'',employee_id:'',phone:'' }); setPhotoFile(null); setPhotoPreview(null) }}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-surface-alt transition-colors">
              Add Another
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Registration Form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900 flex flex-col">

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <p className="text-white mb-4 text-sm">Position face clearly in frame</p>
          <div className="relative w-full max-w-sm">
            <video ref={videoRef} className="w-full rounded-2xl" playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-44 border-4 border-white/70 rounded-full" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-4 mt-6">
            <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Camera size={28} className="text-gray-800" />
            </button>
            <button onClick={closeCamera} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Building2 className="text-primary-600" size={22} />
          <span className="font-bold text-primary-700">Procureflow — Admin</span>
        </div>
        <div className="flex gap-2"><LanguageSwitcher /><ThemeSwitcher /></div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-border p-6">
            <h1 className="text-xl font-bold mb-1">Register Staff Member</h1>
            <p className="text-sm text-muted-foreground mb-6">Admin only — creates Centre Operator or Officer account</p>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

              {/* Photo — required */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Staff Photo <span className="text-red-500">*</span>
                  <span className="text-xs text-muted-foreground ml-1">(required for ID card)</span>
                </label>
                {photoPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={photoPreview} alt="Preview" className="w-16 h-20 object-cover rounded-xl border-2 border-primary-300" />
                    <div className="space-y-2">
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={13} /> Photo captured</p>
                      <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"><X size={12} /> Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={openCamera}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
                      <Camera size={16} /> Take Photo
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border hover:border-primary-400 rounded-xl text-sm text-muted-foreground transition-colors">
                      <Upload size={16} /> Upload
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Role <span className="text-red-500">*</span></label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className="input-field">
                  <option value="CENTRE_OPERATOR">Centre Operator</option>
                  <option value="GOVERNMENT_OFFICER">Government Officer</option>
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  className="input-field" required autoComplete="off" />
              </div>

              {/* DOB */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)}
                  className="input-field" required />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Department <span className="text-red-500">*</span></label>
                <input type="text" value={form.department} onChange={e => set('department', e.target.value)}
                  placeholder="e.g. Agricultural Procurement" className="input-field" required autoComplete="off" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="input-field" required autoComplete="off" />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="input-field" autoComplete="off" />
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Employee ID <span className="text-xs text-muted-foreground">(auto-generated if blank)</span>
                </label>
                <input type="text" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}
                  placeholder="PF-OP-0001" className="input-field" autoComplete="off" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className="input-field pr-10" required minLength={6} autoComplete="new-password" />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
                {loading ? 'Creating Account...' : 'Create Staff Account'}
              </button>
            </form>
          </div>

          <div className="text-center mt-4">
            <Link to="/login/staff" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Staff Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
