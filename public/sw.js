/**
 * Service Worker for Manoj's Finance Hub & AI Copilot
 * Provides offline caching, network-first strategy for dynamic assets,
 * and background push notification listeners for bill dues & budget alerts.
 */

const CACHE_NAME = 'manoj-finance-hub-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
]

// Install Event: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate Event: clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch Event: Network-first with cache fallback for HTML/CSS/JS
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  // Ignore chrome-extension or external analytics
  if (!url.protocol.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and update cache for same-origin static assets
        if (response.status === 200 && url.origin === self.location.origin) {
          const resClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone)
          })
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html')
        }
        return new Response('Offline - No cached version available', { status: 503, statusText: 'Offline' })
      })
  )
})

// Push Notification Event: handles incoming Web Push
self.addEventListener('push', (event) => {
  let data = { title: 'Finance AI Alert', body: 'You have a new financial reminder.', icon: '/pwa-192x192.png' }
  try {
    if (event.data) data = event.data.json()
  } catch {
    if (event.data) data.body = event.data.text()
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification Click Event: opens the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
