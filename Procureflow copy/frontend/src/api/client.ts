import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('procureflow_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor: handle 401 ────────────────────────────────────────
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear stale credentials and redirect to farmer login
      localStorage.removeItem('procureflow_token')
      localStorage.removeItem('procureflow_auth')
      // Avoid redirect loop if already on a login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login/farmer'
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
