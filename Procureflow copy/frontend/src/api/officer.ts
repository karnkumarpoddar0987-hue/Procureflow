import apiClient from './client'

export const officerApi = {
  getDashboard: () => apiClient.get('/api/v1/officer/dashboard'),
  getCentres: () => apiClient.get('/api/v1/officer/centres'),
  getCentrePerformance: (centreId: number, days = 7) =>
    apiClient.get(`/api/v1/officer/centres/${centreId}/performance?days=${days}`),
  getProcurements: (params?: { centre_id?: number; from_date?: string; to_date?: string; stage?: string }) =>
    apiClient.get('/api/v1/officer/procurements', { params }),
  getPayments: (params?: { status_filter?: string; centre_id?: number }) =>
    apiClient.get('/api/v1/officer/payments', { params }),
  getTrends: (days = 14) => apiClient.get(`/api/v1/officer/trends?days=${days}`),
  getStatsSummary: () => apiClient.get('/api/v1/officer/stats/summary'),
}
