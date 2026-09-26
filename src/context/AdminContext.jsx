import { createContext, useContext, useState, useEffect } from 'react'

const AdminContext = createContext({})

const ADMIN_PIN_KEY = 'ft_admin_pin'
const ADMIN_STATE_KEY = 'ft_admin_active'
const DEFAULT_PIN = '1234'

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem(ADMIN_STATE_KEY) === 'true'
  })
  const [pin, setPin] = useState(() => {
    return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN
  })

  useEffect(() => {
    sessionStorage.setItem(ADMIN_STATE_KEY, isAdmin ? 'true' : 'false')
  }, [isAdmin])

  const verifyPin = (inputPin) => {
    const currentPin = localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN
    return inputPin === currentPin
  }

  const enterAdmin = (inputPin) => {
    if (verifyPin(inputPin)) {
      setIsAdmin(true)
      return { success: true }
    }
    return { success: false, error: 'Incorrect PIN. Default PIN is 1234.' }
  }

  const exitAdmin = () => {
    setIsAdmin(false)
  }

  const changePin = (oldPin, newPin) => {
    if (!verifyPin(oldPin)) {
      return { success: false, error: 'Current PIN is incorrect.' }
    }
    if (!newPin || newPin.length < 4) {
      return { success: false, error: 'New PIN must be at least 4 digits.' }
    }
    localStorage.setItem(ADMIN_PIN_KEY, newPin)
    setPin(newPin)
    return { success: true }
  }

  return (
    <AdminContext.Provider value={{ isAdmin, enterAdmin, exitAdmin, changePin, currentPin: pin }}>
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
