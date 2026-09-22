import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { User, Edit2, Save, X, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { farmerApi } from '@/api/farmer'
import type { FarmerProfile } from '@/types'

export default function FarmerProfilePage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<FarmerProfile>>({})

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => farmerApi.getProfile().then(r => r.data),
  })

  // Populate form when data arrives
  if (profile && !form.full_name) setForm(profile)

  const updateMutation = useMutation({
    mutationFn: (data: Partial<FarmerProfile>) => farmerApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      setEditing(false)
      toast.success('Profile updated!')
    },
    onError: () => toast.error(t('errors.generic'))
  })

  if (isLoading) return <div className="h-48 bg-surface-alt rounded-2xl animate-pulse" />

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
            <Edit2 size={15} /> {t('profile.edit')}
          </button>
        ) : (
          <button onClick={() => setEditing(false)} className="p-2 hover:bg-surface-alt rounded-xl">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-5">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
          <User className="text-primary-600" size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold">{profile?.full_name}</h2>
          <p className="text-sm text-muted-foreground">{profile?.mobile || profile?.email}</p>
          {profile?.kyc_verified && (
            <span className="badge-success mt-1">
              <ShieldCheck size={12} /> {t('profile.kycVerified')}
            </span>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="grid gap-4">
          {[
            { key: 'full_name', label: t('profile.fullName'), type: 'text' },
            { key: 'mobile', label: t('profile.mobile'), type: 'tel' },
            { key: 'email', label: t('profile.email'), type: 'email' },
            { key: 'village', label: t('profile.village'), type: 'text' },
            { key: 'district', label: t('profile.district'), type: 'text' },
            { key: 'state', label: t('profile.state'), type: 'text' },
            { key: 'pincode', label: t('profile.pincode'), type: 'text' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
              {editing ? (
                <input type={type} value={form[key as keyof typeof form] as string || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="input-field" />
              ) : (
                <p className="text-foreground">{profile?.[key as keyof FarmerProfile] as string || '—'}</p>
              )}
            </div>
          ))}
        </div>

        {editing && (
          <div className="flex gap-3 mt-6">
            <button onClick={() => setEditing(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save size={16} /> {t('profile.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
