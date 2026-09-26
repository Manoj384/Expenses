import { useState, useEffect } from 'react'
import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react'

export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setTimeout(() => setWasOffline(false), 3000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  if (isOnline && !wasOffline) return null

  return (
    <div
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
        isOnline
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
      }`}
      title={isOnline ? 'Online - Cloud Sync Active' : 'Offline Mode - Data served from Local Shadow Cache'}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3 text-emerald-600" />
          <span>Back Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-amber-600" />
          <span>Offline (Shadow Cache Active)</span>
        </>
      )}
    </div>
  )
}
