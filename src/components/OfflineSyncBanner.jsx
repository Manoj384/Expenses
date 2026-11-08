import { useState, useEffect, useCallback } from 'react'
import { WifiOff, RefreshCw, CheckCircle2, Zap } from 'lucide-react'
import { getPendingOfflineMutations, drainOfflineQueue } from '../utils/offlineSyncQueue'
import { supabase } from '../lib/supabaseClient'

export default function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncedRecently, setSyncedRecently] = useState(false)

  const checkPending = useCallback(async () => {
    try {
      const pending = await getPendingOfflineMutations()
      setPendingCount(pending.length)
    } catch {
      // ignore
    }
  }, [])

  const triggerSync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return
    setIsSyncing(true)
    try {
      const res = await drainOfflineQueue(supabase)
      await checkPending()
      if (res?.syncedCount > 0) {
        setSyncedRecently(true)
        setTimeout(() => setSyncedRecently(false), 3500)
      }
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, checkPending])

  useEffect(() => {
    checkPending()

    const handleOnline = () => {
      setIsOnline(true)
      checkPending().then(() => {
        triggerSync()
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      checkPending()
    }

    const handleQueueChange = (e) => {
      checkPending()
      if (e.detail?.syncedCount > 0) {
        setSyncedRecently(true)
        setTimeout(() => setSyncedRecently(false), 3500)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('ft-offline-queue-change', handleQueueChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('ft-offline-queue-change', handleQueueChange)
    }
  }, [checkPending, triggerSync])

  if (syncedRecently) {
    return (
      <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-sm transition-all duration-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-200 animate-pulse" />
          <span className="font-medium">All pending changes synced seamlessly to cloud!</span>
        </div>
        <button
          onClick={() => setSyncedRecently(false)}
          className="text-[11px] underline text-emerald-100 hover:text-white"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <WifiOff className="h-4 w-4 text-amber-200 shrink-0" />
          <span>
            <strong className="font-bold">Offline Mode Active.</strong> Changes are safely saved in local IndexedDB
            {pendingCount > 0 && ` (${pendingCount} queued for auto-sync)`}.
          </span>
        </div>
        <span className="text-[10px] bg-amber-800/80 uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
          Auto-Sync on Reconnect
        </span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white text-xs px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 text-indigo-200 animate-spin shrink-0" />
          ) : (
            <Zap className="h-4 w-4 text-amber-300 shrink-0" />
          )}
          <span>
            <strong className="font-bold">{pendingCount} offline change{pendingCount > 1 ? 's' : ''}</strong> ready to sync.
          </span>
        </div>
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="text-xs bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-3 py-1 rounded-md transition-all shadow-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>
    )
  }

  return null
}
