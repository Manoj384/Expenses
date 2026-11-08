import { useState, useRef, useEffect, useCallback } from 'react'
import { RefreshCw, ArrowDown } from 'lucide-react'
import { hapticHeavy, hapticSuccess } from '../utils/haptics'

export default function PullToRefresh({ children, onRefresh, pullThreshold = 70, disabled = false }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canTrigger, setCanTrigger] = useState(false)
  
  const touchStartY = useRef(0)
  const isPulling = useRef(false)
  const hasTriggeredHaptic = useRef(false)

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
    if (scrollTop <= 1) {
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
      hasTriggeredHaptic.current = false
    }
  }

  const handleTouchMove = (e) => {
    if (!isPulling.current || disabled || isRefreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY.current

    if (diff > 0) {
      // Apply rubber-band resistance curve
      const resistanceDistance = Math.min(Math.pow(diff, 0.85) * 1.5, 120)
      setPullDistance(resistanceDistance)

      if (resistanceDistance >= pullThreshold && !hasTriggeredHaptic.current) {
        hapticHeavy()
        hasTriggeredHaptic.current = true
        setCanTrigger(true)
      } else if (resistanceDistance < pullThreshold) {
        setCanTrigger(false)
      }
    } else {
      setPullDistance(0)
      setCanTrigger(false)
    }
  }

  const handleEndPull = useCallback(async () => {
    if (!isPulling.current) return
    isPulling.current = false

    if (canTrigger && onRefresh && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(pullThreshold)
      try {
        await onRefresh()
        hapticSuccess()
      } catch (err) {
        console.warn('[PullToRefresh] onRefresh failed:', err)
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
        setCanTrigger(false)
      }
    } else {
      setPullDistance(0)
      setCanTrigger(false)
    }
  }, [canTrigger, onRefresh, isRefreshing, pullThreshold])

  const handleTouchEnd = () => {
    handleEndPull()
  }

  const handleTouchCancel = () => {
    handleEndPull()
  }

  useEffect(() => {
    return () => {
      isPulling.current = false
    }
  }, [])

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className="relative min-h-full"
    >
      {/* Pull Indicator Pill */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="w-full flex items-center justify-center transition-transform duration-200 pointer-events-none z-20 py-2"
          style={{ height: `${Math.min(pullDistance, 80)}px` }}
        >
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md transition-all ${
              canTrigger || isRefreshing
                ? 'bg-blue-600 text-white shadow-blue-500/30 scale-105'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isRefreshing ? 'animate-spin text-white' : canTrigger ? 'rotate-180 transition-transform' : ''
              }`}
            />
            <span>
              {isRefreshing
                ? 'Refreshing data...'
                : canTrigger
                ? 'Release to refresh'
                : 'Pull down to refresh'}
            </span>
            {!isRefreshing && !canTrigger && (
              <ArrowDown className="h-3 w-3 text-slate-400 animate-bounce" />
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
