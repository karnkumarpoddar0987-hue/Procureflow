import { apiClient } from './client'

export const adminApi = {
  registerStaff: (formData: FormData) =>
    apiClient.post('/api/v1/admin/staff/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  listStaff: () => apiClient.get('/api/v1/admin/staff'),

  getMyProfile: () => apiClient.get('/api/v1/admin/staff/me/profile'),

  updateMyProfile: (formData: FormData) =>
    apiClient.put('/api/v1/admin/staff/me/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
