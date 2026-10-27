import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [swReg, setSwReg] = useState(null)

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

    const handlePwaUpdate = (e) => {
      setUpdateAvailable(true)
      setSwReg(e.detail?.registration || null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('pwa-update-available', handlePwaUpdate)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('pwa-update-available', handlePwaUpdate)
    }
  }, [wasOffline])

  const handleApplyUpdate = () => {
    if (swReg?.waiting) {
      swReg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    window.location.reload()
  }

  if (updateAvailable) {
    return (
      <div className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-300 shadow-xs">
        <RefreshCw className="h-3 w-3 text-blue-600 animate-spin" />
        <span>New version available!</span>
        <button
          onClick={handleApplyUpdate}
          className="ml-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded-full"
        >
          Update
        </button>
      </div>
    )
  }

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
