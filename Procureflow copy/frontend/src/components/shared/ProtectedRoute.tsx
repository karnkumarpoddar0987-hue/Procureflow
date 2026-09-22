import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

interface Props {
  children: React.ReactNode
  role?: UserRole
}

export default function ProtectedRoute({ children, role }: Props) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login/farmer" replace />
  }

  if (role && user.role !== role) {
    // Redirect based on actual role
    if (user.role === 'FARMER') return <Navigate to="/farmer/dashboard" replace />
    if (user.role === 'CENTRE_OPERATOR') return <Navigate to="/operator/dashboard" replace />
    if (user.role === 'GOVERNMENT_OFFICER') return <Navigate to="/officer/dashboard" replace />
    return <Navigate to="/login/farmer" replace />
  }

  return <>{children}</>
}
