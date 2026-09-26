import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// SPA Route Restoration: handle redirect from 404.html on Render
// When 404.html fires, it saves the intended path to sessionStorage and redirects to /
// We pick it up here and silently restore the correct URL before React Router boots
;(function () {
  const redirect = sessionStorage.getItem('spa_redirect')
  if (redirect) {
    sessionStorage.removeItem('spa_redirect')
    // Only restore if it's different from current path (avoid infinite loop)
    if (redirect !== '/' && redirect !== window.location.pathname) {
      window.history.replaceState(null, '', redirect)
    }
  }
})()


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

