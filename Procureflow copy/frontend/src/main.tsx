import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import App from './App'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import './index.css'
import './i18n'

// ─── TanStack Query – global error handler ────────────────────────────────────
function getErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong.'
  // Axios error
  const axiosDetail = (error as any)?.response?.data?.detail
  if (axiosDetail) return typeof axiosDetail === 'string' ? axiosDetail : JSON.stringify(axiosDetail)
  // Standard error
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Suppress 401s (the axios interceptor redirects those)
      if ((error as any)?.response?.status === 401) return
      // Only surface errors for queries that have successfully fetched before
      if (query.state.data !== undefined) {
        toast.error(`Failed to refresh: ${getErrorMessage(error)}`)
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if ((error as any)?.response?.status === 401) return
      // Mutations show errors inline via onError in the component,
      // but catch anything not handled there
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors or not-found
        const status = (error as any)?.response?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 2
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '12px',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '14px',
                maxWidth: '380px',
              },
              success: {
                iconTheme: { primary: '#16a34a', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#dc2626', secondary: '#fff' },
                duration: 5000,
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
