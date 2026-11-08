import { createContext, useContext, useState, useEffect } from 'react'
import { setStoredPinPbkdf2, getStoredPinHashRecord, verifyPinWithHash } from '../utils/cryptoPin'

const AdminContext = createContext({})

const ADMIN_PIN_KEY = 'ft_admin_pin'
const ADMIN_STATE_KEY = 'ft_admin_active'
const DEFAULT_PIN = ''

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem(ADMIN_STATE_KEY) === 'true'
  })
  const [pin, setPin] = useState(() => {
    return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN
  })

  // Auto-upgrade legacy plain PIN to PBKDF2 salt + hash
  useEffect(() => {
    const rawPin = localStorage.getItem(ADMIN_PIN_KEY)
    const existingHash = getStoredPinHashRecord()
    if (rawPin && !existingHash) {
      setStoredPinPbkdf2(rawPin).catch(() => {})
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(ADMIN_STATE_KEY, isAdmin ? 'true' : 'false')
  }, [isAdmin])

  const verifyPin = (inputPin) => {
    const currentPin = localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN
    return Boolean(currentPin) && inputPin === currentPin
  }

  const verifyPinAsync = async (inputPin) => {
    const hashRecord = getStoredPinHashRecord()
    if (hashRecord) {
      return await verifyPinWithHash(inputPin, hashRecord)
    }
    return verifyPin(inputPin)
  }

  const enterAdmin = (inputPin) => {
    if (verifyPin(inputPin)) {
      setIsAdmin(true)
      return { success: true }
    }
    return { success: false, error: 'Incorrect PIN, or no local configuration PIN has been set.' }
  }

  const exitAdmin = () => {
    setIsAdmin(false)
  }

  const changePin = (oldPin, newPin) => {
    const hasExistingPin = Boolean(localStorage.getItem(ADMIN_PIN_KEY))
    if (hasExistingPin && !verifyPin(oldPin)) {
      return { success: false, error: 'Current PIN is incorrect.' }
    }
    if (!/^\d{4,8}$/.test(newPin || '')) {
      return { success: false, error: 'New PIN must contain 4 to 8 digits.' }
    }
    localStorage.setItem(ADMIN_PIN_KEY, newPin)
    setStoredPinPbkdf2(newPin).catch(() => {})
    setPin(newPin)
    return { success: true }
  }

  return (
    <AdminContext.Provider value={{
      isAdmin,
      enterAdmin,
      exitAdmin,
      changePin,
      verifyPin,
      verifyPinAsync,
      hasPin: Boolean(pin),
      currentPin: pin,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
