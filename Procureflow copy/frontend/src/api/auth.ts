import apiClient from './client'
import type { Token, AuthUser } from '@/types'

export const authApi = {
  farmerLogin: (identifier: string, password: string) =>
    apiClient.post<Token>('/api/v1/auth/farmer/login', { identifier, password }),

  staffLogin: (email: string, password: string) =>
    apiClient.post<Token>('/api/v1/auth/staff/login', { email, password }),

  register: (data: {
    full_name: string
    email?: string
    mobile?: string
    password: string
    confirm_password: string
    village?: string
    district?: string
    state?: string
    kyc_method?: string
    aadhaar_masked?: string
    consent: boolean
  }) => apiClient.post<Token>('/api/v1/auth/register', data),

  sendOtp: (identifier: string, type: 'mobile' | 'email' = 'mobile') =>
    apiClient.post('/api/v1/auth/otp/send', {
      mobile: type === 'mobile' ? identifier : undefined,
      email: type === 'email' ? identifier : undefined,
    }),

  verifyOtp: (identifier: string, otp: string, type: 'mobile' | 'email' = 'mobile') =>
    apiClient.post('/api/v1/auth/otp/verify', {
      mobile: type === 'mobile' ? identifier : undefined,
      email: type === 'email' ? identifier : undefined,
      otp,
    }),

  forgotPassword: (identifier: string, type: 'mobile' | 'email' = 'mobile') =>
    apiClient.post('/api/v1/auth/forgot-password', {
      mobile: type === 'mobile' ? identifier : undefined,
      email: type === 'email' ? identifier : undefined,
    }),

  resetPassword: (data: {
    mobile?: string
    email?: string
    otp: string
    new_password: string
    confirm_password: string
  }) => apiClient.post('/api/v1/auth/reset-password', data),

  me: () => apiClient.get<AuthUser>('/api/v1/auth/me'),
}
