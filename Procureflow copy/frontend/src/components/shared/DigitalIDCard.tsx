import { useQuery } from '@tanstack/react-query'
import { Building2, User } from 'lucide-react'
import { adminApi } from '@/api/admin'

export default function DigitalIDCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['staff-profile'],
    queryFn: () => adminApi.getMyProfile().then(r => r.data),
  })

  if (isLoading) {
    return <div className="h-48 bg-surface-alt animate-pulse rounded-2xl" />
  }

  if (!data?.has_profile) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 text-center text-muted-foreground text-sm">
        <User size={32} className="mx-auto mb-2 opacity-40" />
        <p>No digital ID card found.</p>
        <p className="text-xs mt-1">Contact admin to create your staff profile.</p>
      </div>
    )
  }

  const roleLabel = data.role === 'CENTRE_OPERATOR' ? 'Centre Operator' : 'Government Officer'

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border-2 border-blue-200 dark:border-blue-800 max-w-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Procureflow</p>
          <p className="text-white font-bold text-sm">Digital Identity Card</p>
        </div>
        <Building2 className="text-white/80" size={24} />
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-gray-900 px-4 py-4">
        <div className="flex gap-3 items-start">
          {/* Photo */}
          <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-blue-200 shrink-0 bg-gray-100 flex items-center justify-center">
            {data.photo ? (
              <img src={data.photo} alt="Staff" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-gray-400" />
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight">{data.full_name}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
              {roleLabel}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{data.department}</p>
            <p className="text-xs text-muted-foreground">DOB: {data.dob}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border space-y-1">
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Employee ID</span>
            <span className="font-mono text-sm font-bold text-blue-600">{data.employee_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="text-xs truncate ml-2 max-w-[160px]">{data.email}</span>
          </div>
          {data.phone && (
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Phone</span>
              <span className="text-xs">{data.phone}</span>
            </div>
          )}
        </div>

        {/* Barcode decoration */}
        <div className="mt-3 flex gap-px h-5 items-end">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="flex-1 bg-blue-800 dark:bg-blue-400 rounded-sm"
              style={{ height: `${40 + (i * 37 + 13) % 60}%`, opacity: 0.75 }} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-blue-50 dark:bg-blue-950/40 px-4 py-1.5 text-center">
        <p className="text-xs text-blue-600/70">Government of India — Agricultural Procurement System</p>
      </div>
    </div>
  )
}
