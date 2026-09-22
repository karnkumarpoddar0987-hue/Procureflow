import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'

// Auth pages
import FarmerLoginPage from '@/pages/auth/FarmerLoginPage'
import StaffLoginPage from '@/pages/auth/StaffLoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import StaffRegisterPage from '@/pages/auth/StaffRegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'

// Farmer pages
import FarmerLayout from '@/components/layout/FarmerLayout'
import FarmerDashboard from '@/pages/farmer/FarmerDashboard'
import FarmerBooking from '@/pages/farmer/FarmerBooking'
import FarmerQueue from '@/pages/farmer/FarmerQueue'
import FarmerCrops from '@/pages/farmer/FarmerCrops'
import FarmerProfile from '@/pages/farmer/FarmerProfile'
import FarmerNotifications from '@/pages/farmer/FarmerNotifications'
import FarmerHelp from '@/pages/farmer/FarmerHelp'
import FarmerSettings from '@/pages/farmer/FarmerSettings'
import FarmerProcurement from '@/pages/farmer/FarmerProcurement'
import FarmerPayment from '@/pages/farmer/FarmerPayment'

// Operator pages
import OperatorLayout from '@/components/layout/OperatorLayout'
import OperatorDashboard from '@/pages/operator/OperatorDashboard'
import OperatorAnalyticsPage from '@/pages/operator/OperatorAnalyticsPage'
import StaffProfilePage from '@/pages/staff/StaffProfilePage'

// Officer pages
import OfficerLayout from '@/components/layout/OfficerLayout'
import OfficerDashboard from '@/pages/officer/OfficerDashboard'

// Guards
import ProtectedRoute from '@/components/shared/ProtectedRoute'

export default function App() {
  const { setTheme, theme } = useThemeStore()

  // Apply persisted theme on mount
  useEffect(() => {
    setTheme(theme)
  }, [])

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login/farmer" replace />} />

      {/* Auth */}
      <Route path="/login/farmer" element={<FarmerLoginPage />} />
      <Route path="/login/staff" element={<StaffLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/staff" element={<StaffRegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Farmer Portal */}
      <Route
        path="/farmer"
        element={
          <ProtectedRoute role="FARMER">
            <FarmerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/farmer/dashboard" replace />} />
        <Route path="dashboard" element={<FarmerDashboard />} />
        <Route path="booking" element={<FarmerBooking />} />
        <Route path="queue" element={<FarmerQueue />} />
        <Route path="crops" element={<FarmerCrops />} />
        <Route path="procurement" element={<FarmerProcurement />} />
        <Route path="payment" element={<FarmerPayment />} />
        <Route path="profile" element={<FarmerProfile />} />
        <Route path="notifications" element={<FarmerNotifications />} />
        <Route path="help" element={<FarmerHelp />} />
        <Route path="settings" element={<FarmerSettings />} />
      </Route>

      {/* Operator Portal */}
      <Route
        path="/operator"
        element={
          <ProtectedRoute role="CENTRE_OPERATOR">
            <OperatorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/operator/dashboard" replace />} />
        <Route path="dashboard" element={<OperatorDashboard />} />
        <Route path="analytics" element={<OperatorAnalyticsPage />} />
        <Route path="profile" element={<StaffProfilePage />} />
      </Route>

      {/* Officer Portal */}
      <Route
        path="/officer"
        element={
          <ProtectedRoute role="GOVERNMENT_OFFICER">
            <OfficerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/officer/dashboard" replace />} />
        <Route path="dashboard" element={<OfficerDashboard />} />
        <Route path="profile" element={<StaffProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login/farmer" replace />} />
    </Routes>
  )
}
