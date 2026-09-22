import apiClient from './client'

export const operatorApi = {
  getDashboard: () => apiClient.get('/api/v1/operator/dashboard'),
  getQueue: () => apiClient.get('/api/v1/operator/queue'),
  getTodaysFarmers: () => apiClient.get('/api/v1/operator/farmers/today'),

  callNext: () => apiClient.post('/api/v1/operator/queue/call-next'),

  startWeighing: (bookingId: number) =>
    apiClient.post('/api/v1/operator/weighing/start', { booking_id: bookingId }),
  completeWeighing: (bookingId: number, grossWeight: number, netWeight: number, moisturePercent?: number) =>
    apiClient.post('/api/v1/operator/weighing/complete', {
      booking_id: bookingId,
      gross_weight: grossWeight,
      net_weight: netWeight,
      moisture_percent: moisturePercent,
    }),

  startQuality: (bookingId: number) =>
    apiClient.post('/api/v1/operator/quality/start', { booking_id: bookingId }),
  completeQuality: (bookingId: number, grade: string, moisturePercent?: number, notes?: string) =>
    apiClient.post('/api/v1/operator/quality/complete', {
      booking_id: bookingId,
      quality_grade: grade,
      moisture_percent: moisturePercent,
      notes,
    }),

  completeProcurement: (bookingId: number, mspPerQuintal?: number, notes?: string) =>
    apiClient.post('/api/v1/operator/procurement/complete', {
      booking_id: bookingId,
      msp_per_quintal: mspPerQuintal,
      notes,
    }),

  updatePayment: (bookingId: number, status: string, txnRef?: string, notes?: string) =>
    apiClient.post('/api/v1/operator/payment/update', {
      booking_id: bookingId,
      status,
      transaction_reference: txnRef,
      notes,
    }),

  getAnalytics: (days = 30) =>
    apiClient.get(`/api/v1/operator/analytics?days=${days}`),
}
