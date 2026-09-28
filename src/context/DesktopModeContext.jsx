import { createContext, useContext, useState, useEffect } from 'react'

const DesktopModeContext = createContext(null)

const DESKTOP_MODE_KEY = 'ft_desktop_mode'

export function DesktopModeProvider({ children }) {
  const [isDesktopSite, setIsDesktopSite] = useState(() => {
    try {
      return localStorage.getItem(DESKTOP_MODE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(DESKTOP_MODE_KEY, String(isDesktopSite))
    } catch {}

    const root = document.documentElement
    const body = document.body
    let viewportMeta = document.querySelector('meta[name="viewport"]')

    if (!viewportMeta) {
      viewportMeta = document.createElement('meta')
      viewportMeta.name = 'viewport'
      document.head.appendChild(viewportMeta)
    }

    if (isDesktopSite) {
      root.classList.add('force-desktop-mode')
      body.classList.add('force-desktop-mode')
      viewportMeta.setAttribute(
        'content',
        'width=1280, initial-scale=0.3, minimum-scale=0.1, maximum-scale=3.0, user-scalable=yes'
      )
    } else {
      root.classList.remove('force-desktop-mode')
      body.classList.remove('force-desktop-mode')
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      )
    }
  }, [isDesktopSite])

  const toggleDesktopSite = () => {
    setIsDesktopSite((prev) => !prev)
  }

  return (
    <DesktopModeContext.Provider value={{ isDesktopSite, setIsDesktopSite, toggleDesktopSite }}>
      {children}
    </DesktopModeContext.Provider>
  )
}

export function useDesktopMode() {
  const ctx = useContext(DesktopModeContext)
  if (!ctx) {
    throw new Error('useDesktopMode must be used within a DesktopModeProvider')
  }
  return ctx
}
