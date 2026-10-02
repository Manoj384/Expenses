import { useState, useEffect } from 'react'
import {
  Fingerprint,
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  isBiometricsAvailable,
  isBiometricsEnabled,
  authenticateBiometrics,
} from '../utils/webAuthn'
import { useAdmin } from '../context/AdminContext'

export default function BiometricAppLockOverlay({ isLocked, onUnlock }) {
  const { verifyPin } = useAdmin()
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [hasBiometrics, setHasBiometrics] = useState(false)
  const [showPinInput, setShowPinInput] = useState(false)

  useEffect(() => {
    isBiometricsAvailable().then(avail => setHasBiometrics(avail))
  }, [])

  // Prompt biometrics on lock activation
  useEffect(() => {
    if (isLocked && isBiometricsEnabled()) {
      handleBiometricUnlock()
    }
  }, [isLocked])

  const handleBiometricUnlock = async () => {
    setError('')
    setIsVerifying(true)
    try {
      const res = await authenticateBiometrics()
      if (res.success) {
        onUnlock()
      } else if (res.error && !res.error.includes('cancelled')) {
        setError(res.error)
        setShowPinInput(true)
      }
    } catch {
      setShowPinInput(true)
    } finally {
      setIsVerifying(false)
    }
  }

  const handlePinUnlock = (e) => {
    e.preventDefault()
    setError('')
    if (verifyPin ? verifyPin(pinInput) : pinInput === '1234') {
      setPinInput('')
      onUnlock()
    } else {
      setError('Incorrect security PIN. Default PIN is 1234.')
    }
  }

  if (!isLocked) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl shadow-indigo-950/50">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
          <Lock className="h-8 w-8 text-indigo-400 animate-pulse" />
        </div>

        <div>
          <h3 className="text-xl font-black text-white tracking-tight">App Locked</h3>
          <p className="text-xs text-slate-400 mt-1">
            Personal Wealth & Finance Tracker is secured
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 text-left">
            <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Biometric trigger button */}
        {!showPinInput && isBiometricsEnabled() && (
          <div className="space-y-3">
            <button
              onClick={handleBiometricUnlock}
              disabled={isVerifying}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold flex flex-col items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-98"
            >
              <Fingerprint className="h-8 w-8 text-indigo-200" />
              <span className="text-xs">
                {isVerifying ? 'Scanning Sensor...' : 'Touch Sensor to Unlock'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowPinInput(true)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Unlock with 4-Digit Security PIN
            </button>
          </div>
        )}

        {/* PIN Input form */}
        {(showPinInput || !isBiometricsEnabled()) && (
          <form onSubmit={handlePinUnlock} className="space-y-3">
            <input
              type="password"
              maxLength={6}
              placeholder="Enter 4-Digit PIN (1234)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center tracking-widest text-lg font-mono py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
              autoFocus
            />
            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-xs font-bold"
            >
              Unlock Application
            </button>

            {isBiometricsEnabled() && (
              <button
                type="button"
                onClick={() => setShowPinInput(false)}
                className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto pt-1"
              >
                <Fingerprint className="h-3.5 w-3.5" /> Use Biometrics
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
