import React from 'react'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="card max-w-md w-full text-center p-8 shadow-xl border border-red-100 dark:border-rose-900/40 bg-white dark:bg-slate-900 rounded-3xl">
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
              Your financial records and investments are completely safe in your cloud database.
            </p>
            {import.meta.env.DEV && this.state.error?.message && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl text-left font-mono mb-6 overflow-x-auto border border-rose-200 dark:border-rose-900/60 max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-2.5 font-bold shadow-xs"
              >
                <RotateCcw className="h-4 w-4" /> Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-xs py-2.5 font-bold"
              >
                <RefreshCw className="h-4 w-4" /> Reload Page
              </button>
              <a
                href="/"
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 pt-2 block font-medium"
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
