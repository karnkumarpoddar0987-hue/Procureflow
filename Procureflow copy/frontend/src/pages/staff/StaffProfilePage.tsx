import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Building2, User, Download, Phone, Mail,
  Calendar, Briefcase, Hash, Camera, Upload,
  Pencil, X, Check, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin'

// ── Digital ID Card (printable) ───────────────────────────────────────────────
function IDCard({ data, cardRef }: { data: any; cardRef: React.RefObject<HTMLDivElement> }) {
  const roleLabel = data.role === 'CENTRE_OPERATOR' ? 'Centre Operator' : 'Government Officer'
  return (
    <div ref={cardRef} style={{ width: 340, fontFamily: 'sans-serif' }}
      className="rounded-2xl overflow-hidden shadow-xl border-2 border-blue-300 bg-white">
      <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>Government of India</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: '2px 0 0' }}>Procureflow</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: 0 }}>Agricultural Procurement System</p>
          </div>
          <Building2 color="rgba(255,255,255,0.75)" size={28} />
        </div>
      </div>

      <div style={{ background: '#fff', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 72, height: 88, borderRadius: 10, overflow: 'hidden', border: '3px solid #bfdbfe', background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {data.photo
              ? <img src={data.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={30} color="#94a3b8" />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{data.full_name}</p>
            <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{roleLabel}</span>
            <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 2px' }}>{data.department}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>DOB: {data.dob}</p>
          </div>
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          {[
            { label: 'Employee ID', value: data.employee_id, bold: true, color: '#1d4ed8' },
            { label: 'Email', value: data.email },
            data.phone && { label: 'Phone', value: data.phone },
          ].filter(Boolean).map((row: any) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{row.label}</span>
              <span style={{ fontSize: row.bold ? 13 : 11, fontWeight: row.bold ? 700 : 400, color: row.color || '#0f172a', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Barcode */}
        <div style={{ display: 'flex', gap: 2, height: 22, alignItems: 'flex-end', marginTop: 10 }}>
          {Array.from({ length: 38 }).map((_, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 1, background: '#1e3a5f', height: `${40 + ((i * 41 + 7) % 60)}%`, opacity: 0.8 }} />
          ))}
        </div>
      </div>

      <div style={{ background: '#eff6ff', padding: '5px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#3b82f6', margin: 0 }}>Issued by Procureflow — Agricultural Procurement Authority</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffProfilePage() {
  const qc = useQueryClient()
  const cardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [editing, setEditing] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', dob: '', department: '', phone: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['staff-profile'],
    queryFn: () => adminApi.getMyProfile().then(r => r.data),
  })

  const updateMut = useMutation({
    mutationFn: (fd: FormData) => adminApi.updateMyProfile(fd),
    onSuccess: (res) => {
      qc.setQueryData(['staff-profile'], res.data)
      toast.success('Profile updated!')
      setEditing(false)
      setPhotoFile(null)
      setPhotoPreview(null)
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Update failed'),
  })

  const startEdit = () => {
    setEditForm({
      full_name: data?.full_name || '',
      dob: data?.dob || '',
      department: data?.department || '',
      phone: data?.phone || '',
    })
    setEditing(true)
  }

  const handleSave = () => {
    const fd = new FormData()
    if (editForm.full_name)  fd.append('full_name', editForm.full_name)
    if (editForm.dob)        fd.append('dob', editForm.dob)
    if (editForm.department) fd.append('department', editForm.department)
    if (editForm.phone)      fd.append('phone', editForm.phone)
    if (photoFile)           fd.append('photo', photoFile)
    updateMut.mutate(fd)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setCameraOpen(true)
      setTimeout(() => {
        if (cameraRef.current) { cameraRef.current.srcObject = stream; cameraRef.current.play() }
      }, 100)
    } catch { toast.error('Camera access denied') }
  }

  const capturePhoto = () => {
    if (!cameraRef.current || !canvasRef.current) return
    const v = cameraRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    c.toBlob(blob => {
      if (!blob) return
      setPhotoFile(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
      setPhotoPreview(c.toDataURL('image/jpeg'))
    }, 'image/jpeg', 0.9)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraOpen(false)
  }

  const downloadCard = async () => {
    if (!cardRef.current) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `${data?.employee_id || 'id-card'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('ID Card downloaded!')
    } catch { window.print() }
  }

 if (isLoading) return (
  <div className="space-y-4 max-w-2xl mx-auto">
    {[1, 2, 3].map(i => (
      <div
        key={i}
        className="h-24 bg-surface-alt animate-pulse rounded-2xl"
      ></div>
    ))}
  </div>
)

  const displayPhoto = photoPreview || data?.photo
  const roleLabel = data?.role === 'CENTRE_OPERATOR' ? 'Centre Operator' : 'Government Officer'
  const previewData = editing ? { ...data, ...editForm, photo: displayPhoto } : data

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <p className="text-white mb-4 text-sm">Position your face in the frame</p>
          <div className="relative w-full max-w-sm">
            <video ref={cameraRef} className="w-full rounded-2xl" playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-44 border-4 border-white/70 rounded-full" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-4 mt-6">
            <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Camera size={26} className="text-gray-800" />
            </button>
            <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setCameraOpen(false) }}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
              <X size={22} className="text-white" />
            </button>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        {data?.has_profile && !editing && (
          <button onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Pencil size={14} /> Edit Profile
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setPhotoFile(null); setPhotoPreview(null) }}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm hover:bg-surface-alt">
              <X size={14} /> Cancel
            </button>
            <button onClick={handleSave} disabled={updateMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium">
              {updateMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
          </div>
        )}
      </div>

      {!data?.has_profile ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <User size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-medium">No profile found</p>
          <p className="text-sm text-muted-foreground mt-1">Contact your admin to create your staff profile.</p>
        </div>
      ) : (
        <>
          {/* Personal Details */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-semibold text-base mb-4">Personal Details</h2>

            {/* Photo section */}
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
              <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-blue-200 bg-gray-100 flex items-center justify-center shrink-0">
                {displayPhoto
                  ? <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                  : <User size={30} className="text-gray-400" />}
              </div>
              {editing && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Update Photo</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={openCamera}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-medium">
                      <Camera size={13} /> Camera
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 border border-border hover:bg-surface-alt rounded-xl text-xs">
                      <Upload size={13} /> Upload
                    </button>
                  </div>
                  {photoPreview && <p className="text-xs text-green-600">✓ New photo selected</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                  {editing
                    ? <input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                        className="input-field text-sm py-1.5" />
                    : <p className="font-semibold">{data.full_name}</p>}
                </div>
              </div>

              {/* Employee ID — read only */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Hash size={14} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Employee ID</p>
                  <p className="font-mono font-bold text-blue-600">{data.employee_id}</p>
                </div>
              </div>

              {/* Role — read only */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Role</p>
                  <p className="font-semibold">{roleLabel}</p>
                </div>
              </div>

              {/* Department */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 size={14} className="text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-0.5">Department</p>
                  {editing
                    ? <input value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                        className="input-field text-sm py-1.5" />
                    : <p className="font-semibold">{data.department}</p>}
                </div>
              </div>

              {/* DOB */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar size={14} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-0.5">Date of Birth</p>
                  {editing
                    ? <input type="date" value={editForm.dob} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))}
                        className="input-field text-sm py-1.5" />
                    : <p className="font-semibold">{data.dob}</p>}
                </div>
              </div>

              {/* Email — read only */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={14} className="text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="font-semibold break-all text-sm">{data.email}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Phone size={14} className="text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  {editing
                    ? <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                        className="input-field text-sm py-1.5" placeholder="+91 XXXXX XXXXX" />
                    : <p className="font-semibold">{data.phone || '—'}</p>}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Digital ID Card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">🪪 Digital ID Card</h2>
              <button onClick={downloadCard}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                <Download size={14} /> Download PNG
              </button>
            </div>
            <div className="flex justify-center">
              <IDCard data={previewData} cardRef={cardRef} />
            </div>
            {editing && photoPreview && (
              <p className="text-xs text-center text-primary-600 mt-3">
                ↑ ID card preview with new photo — save to apply
              </p>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}
