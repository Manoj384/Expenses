import { useState } from 'react'
import { ShieldCheck, ShieldAlert, KeyRound, Lock, Unlock } from 'lucide-react'
import { useAdmin } from '../context/AdminContext'
import Modal from './Modal'

export default function AdminLockModal({ isOpen, onClose }) {
  const { isAdmin, enterAdmin, exitAdmin, changePin } = useAdmin()
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showChangePin, setShowChangePin] = useState(false)
  const [pinChangeForm, setPinChangeForm] = useState({ oldPin: '', newPin: '', confirmPin: '' })

  const handleUnlock = (e) => {
    e.preventDefault()
    setError('')
    const res = enterAdmin(pinInput)
    if (res.success) {
      setPinInput('')
      setSuccess('Admin Mode activated!')
      setTimeout(() => {
        setSuccess('')
        onClose()
      }, 700)
    } else {
      setError(res.error)
    }
  }

  const handleLock = () => {
    exitAdmin()
    onClose()
  }

  const handleChangePin = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (pinChangeForm.newPin !== pinChangeForm.confirmPin) {
      setError('New PINs do not match.')
      return
    }
    const res = changePin(pinChangeForm.oldPin, pinChangeForm.newPin)
    if (res.success) {
      setSuccess('PIN changed successfully!')
      setPinChangeForm({ oldPin: '', newPin: '', confirmPin: '' })
      setShowChangePin(false)
    } else {
      setError(res.error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isAdmin ? 'Admin Mode Activated' : 'Enter Admin PIN'}>
      <div className="space-y-4 py-1">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 text-sm">You are in Admin Mode</h4>
                <p className="text-xs text-amber-700 mt-1">
                  You have permissions to create, edit, seed, and delete Master Categories & Payment Methods.
                </p>
              </div>
            </div>

            {!showChangePin ? (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePin(true)}
                  className="btn-secondary flex items-center justify-center gap-2 text-sm"
                >
                  <KeyRound className="h-4 w-4" /> Change Admin PIN
                </button>
                <button
                  type="button"
                  onClick={handleLock}
                  className="btn-danger flex items-center justify-center gap-2 text-sm"
                >
                  <Lock className="h-4 w-4" /> Lock / Exit Admin Mode
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePin} className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-medium text-xs text-gray-700 uppercase tracking-wide">Change Security PIN</h4>
                <div>
                  <label className="label text-xs">Current PIN</label>
                  <input
                    type="password"
                    maxLength={8}
                    className="input-field text-sm py-1.5"
                    value={pinChangeForm.oldPin}
                    onChange={(e) => setPinChangeForm((p) => ({ ...p, oldPin: e.target.value }))}
                    placeholder="Enter current PIN"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs">New PIN (4+ digits)</label>
                  <input
                    type="password"
                    maxLength={8}
                    className="input-field text-sm py-1.5"
                    value={pinChangeForm.newPin}
                    onChange={(e) => setPinChangeForm((p) => ({ ...p, newPin: e.target.value }))}
                    placeholder="Enter new PIN"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs">Confirm New PIN</label>
                  <input
                    type="password"
                    maxLength={8}
                    className="input-field text-sm py-1.5"
                    value={pinChangeForm.confirmPin}
                    onChange={(e) => setPinChangeForm((p) => ({ ...p, confirmPin: e.target.value }))}
                    placeholder="Confirm new PIN"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="btn-primary text-xs py-1.5 px-3 flex-1">
                    Save New PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChangePin(false)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your Admin PIN to manage Master Categories and Payment Methods. (Default PIN: <strong className="text-gray-900">1234</strong>)
            </p>

            <div>
              <label className="label" htmlFor="admin-pin-input">Admin Security PIN</label>
              <div className="relative">
                <input
                  id="admin-pin-input"
                  type="password"
                  autoFocus
                  maxLength={8}
                  className="input-field text-center tracking-widest text-lg font-mono"
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Unlock className="h-4 w-4" /> Unlock Admin Mode
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
