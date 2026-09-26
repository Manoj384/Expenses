import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast])
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur || 6000), [addToast])
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast])
  const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border text-xs transition-all transform translate-y-0 duration-200 animate-slide-up ${
              t.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700'
                : t.type === 'error'
                ? 'bg-rose-900/95 text-rose-100 border-rose-700'
                : t.type === 'warning'
                ? 'bg-amber-900/95 text-amber-100 border-amber-700'
                : 'bg-slate-900/95 text-slate-100 border-slate-700'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />}

            <div className="flex-1 font-medium leading-relaxed">{t.message}</div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-white/60 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback safe dummy functions if outside provider
    return {
      success: (msg) => console.log('Toast:', msg),
      error: (msg) => console.error('Toast Error:', msg),
      info: (msg) => console.log('Toast Info:', msg),
      warning: (msg) => console.warn('Toast Warning:', msg),
    }
  }
  return ctx
}
