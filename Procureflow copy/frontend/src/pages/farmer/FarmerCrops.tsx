import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Leaf, Edit2, Trash2, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { farmerApi } from '@/api/farmer'
import type { Crop } from '@/types'

const CROP_TYPES = ['Rabi', 'Kharif', 'Zaid', 'Other']

export default function FarmerCrops() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Crop | null>(null)
  const [form, setForm] = useState({ crop_name: '', crop_type: 'Rabi', quantity_quintals: '', season: '', year: new Date().getFullYear().toString(), notes: '' })

  const { data: crops = [], isLoading } = useQuery({
    queryKey: ['crops'],
    queryFn: () => farmerApi.getCrops().then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => farmerApi.addCrop({ ...data, quantity_quintals: parseFloat(data.quantity_quintals) || undefined, year: parseInt(data.year) || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crops'] }); setShowModal(false); toast.success('Crop added!') },
    onError: () => toast.error(t('errors.generic'))
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Crop> }) => farmerApi.updateCrop(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crops'] }); setEditing(null); toast.success('Crop updated!') },
    onError: () => toast.error(t('errors.generic'))
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => farmerApi.deleteCrop(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crops'] }); toast.success('Crop removed') },
    onError: () => toast.error(t('errors.generic'))
  })

  const openEdit = (crop: Crop) => {
    setEditing(crop)
    setForm({ crop_name: crop.crop_name, crop_type: crop.crop_type || 'Rabi', quantity_quintals: String(crop.quantity_quintals || ''), season: crop.season || '', year: String(crop.year || ''), notes: crop.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) updateMutation.mutate({ id: editing.id, data: { ...form, quantity_quintals: parseFloat(form.quantity_quintals) || undefined, year: parseInt(form.year) || undefined } })
    else addMutation.mutate(form)
  }

  const resetModal = () => { setShowModal(false); setEditing(null); setForm({ crop_name: '', crop_type: 'Rabi', quantity_quintals: '', season: '', year: new Date().getFullYear().toString(), notes: '' }) }

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('crops.title')}</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 py-2.5 px-4">
          <Plus size={18} /> {t('crops.add')}
        </button>
      </div>

      {isLoading && (
        <div className="grid gap-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-surface-alt rounded-2xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && crops.length === 0 && (
        <div className="text-center py-16">
          <Leaf className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground">{t('crops.noCrops')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('crops.addFirst')}</p>
        </div>
      )}

      <div className="grid gap-3">
        <AnimatePresence>
          {crops.map((crop, i) => (
            <motion.div key={crop.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center shrink-0">
                <Leaf className="text-emerald-600" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{crop.crop_name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {crop.crop_type && <span className="text-xs text-muted-foreground">{crop.crop_type}</span>}
                  {crop.quantity_quintals && <span className="text-xs text-muted-foreground">{crop.quantity_quintals} {t('common.quintals')}</span>}
                  {crop.season && <span className="text-xs text-muted-foreground">{crop.season}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(crop)} className="p-2 rounded-xl hover:bg-surface-alt text-muted-foreground transition-colors">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => deleteMutation.mutate(crop.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="bg-card rounded-3xl border border-border shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{editing ? t('crops.edit') : t('crops.add')}</h2>
                <button onClick={resetModal} className="p-2 rounded-xl hover:bg-surface-alt"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('crops.cropName')} *</label>
                  <input type="text" value={form.crop_name} onChange={e => setForm(f => ({ ...f, crop_name: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('crops.cropType')}</label>
                  <select value={form.crop_type} onChange={e => setForm(f => ({ ...f, crop_type: e.target.value }))} className="input-field">
                    {CROP_TYPES.map(ct => <option key={ct}>{ct}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('crops.quantity')}</label>
                  <input type="number" step="0.1" value={form.quantity_quintals} onChange={e => setForm(f => ({ ...f, quantity_quintals: e.target.value }))} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('crops.season')}</label>
                    <input type="text" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} className="input-field" placeholder="Rabi 2025-26" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('crops.year')}</label>
                    <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('crops.notes')}</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field resize-none" rows={2} />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={resetModal} className="btn-secondary flex-1">{t('common.cancel')}</button>
                  <button type="submit" disabled={addMutation.isPending || updateMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Save size={16} /> {t('crops.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
