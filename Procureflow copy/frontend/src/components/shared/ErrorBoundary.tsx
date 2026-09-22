import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary.
 * Catches rendering errors anywhere in the tree and shows a safe fallback.
 * Must be a class component — React requires it.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in development; swap for a real error-reporting service in production
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-600" size={28} />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mb-6">
              An unexpected error occurred. Your work is safe — please try refreshing.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw size={15} /> Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary flex items-center gap-2"
              >
                Reload Page
              </button>
            </div>
            {(import.meta as any).env?.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Developer details
                </summary>
                <pre className="mt-2 text-xs bg-surface-alt rounded-xl p-3 overflow-auto max-h-40 text-red-600">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
