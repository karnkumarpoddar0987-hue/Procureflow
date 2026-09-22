import apiClient from './client'
import type { FarmerProfile, Crop, Centre, Slot, Booking, QueueEntry, Procurement, Payment, Notification, ActiveBookingResponse } from '@/types'

export const farmerApi = {
  // Profile
  getProfile: () => apiClient.get<FarmerProfile>('/api/v1/farmer/profile'),
  updateProfile: (data: Partial<FarmerProfile>) => apiClient.put<FarmerProfile>('/api/v1/farmer/profile', data),

  // Dashboard
  getDashboard: () => apiClient.get('/api/v1/farmer/dashboard'),

  // Crops
  getCrops: () => apiClient.get<Crop[]>('/api/v1/farmer/crops'),
  addCrop: (data: Omit<Crop, 'id' | 'farmer_id' | 'is_active' | 'created_at'>) =>
    apiClient.post<Crop>('/api/v1/farmer/crops', data),
  updateCrop: (id: number, data: Partial<Crop>) => apiClient.put<Crop>(`/api/v1/farmer/crops/${id}`, data),
  deleteCrop: (id: number) => apiClient.delete(`/api/v1/farmer/crops/${id}`),

  // Centres
  getCentres: () => apiClient.get<Centre[]>('/api/v1/farmer/centres'),
  getCentre: (id: number) => apiClient.get<Centre>(`/api/v1/farmer/centres/${id}`),
  getCentreSlots: (centreId: number, date?: string) =>
    apiClient.get<Slot[]>(`/api/v1/farmer/centres/${centreId}/slots${date ? `?booking_date=${date}` : ''}`),

  // AI Recommendation
  getRecommendation: (centreId?: number, date?: string) => {
    const params = new URLSearchParams()
    if (centreId) params.set('centre_id', String(centreId))
    if (date) params.set('booking_date', date)
    return apiClient.get(`/api/v1/farmer/ai/recommend?${params}`)
  },

  // Bookings
  getBookings: () => apiClient.get<Booking[]>('/api/v1/farmer/bookings'),
  getActiveBooking: () => apiClient.get<ActiveBookingResponse>('/api/v1/farmer/bookings/active'),
  createBooking: (data: { slot_id: number; crop_id?: number; quantity_quintals?: number; notes?: string }) =>
    apiClient.post<Booking>('/api/v1/farmer/bookings', data),
  cancelBooking: (bookingId: number, reason?: string) =>
    apiClient.post(`/api/v1/farmer/bookings/${bookingId}/cancel`, { reason }),
  rescheduleBooking: (bookingId: number, newSlotId: number) =>
    apiClient.post(`/api/v1/farmer/bookings/${bookingId}/reschedule`, { new_slot_id: newSlotId }),

  // Queue
  getQueueStatus: (bookingId: number) => apiClient.get<QueueEntry>(`/api/v1/farmer/queue/${bookingId}`),

  // Procurement
  getProcurement: (bookingId: number) => apiClient.get<Procurement>(`/api/v1/farmer/procurement/${bookingId}`),

  // Payment
  getPayment: (bookingId: number) => apiClient.get<Payment>(`/api/v1/farmer/payment/${bookingId}`),

  // Notifications
  getNotifications: () => apiClient.get<Notification[]>('/api/v1/farmer/notifications'),
  markNotificationsRead: (ids: number[]) =>
    apiClient.post('/api/v1/farmer/notifications/mark-read', { notification_ids: ids }),
}
