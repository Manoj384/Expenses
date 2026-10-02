// Cache version — bump this string on every deploy to force cache invalidation
const CACHE_NAME = 'ft-cache-v3'
const STATIC_ASSETS = ['/favicon.svg', '/manifest.json']

// Install: only cache non-HTML static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  // Immediately take control — don't wait for old SW to die
  self.skipWaiting()
})

// Activate: delete ALL old caches so stale content is cleared
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // ── 1. Supabase / external API calls → always Network Only (never cache)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis')) {
    return
  }

  // ── 2. HTML / navigation requests → Network First
  //    Always try the network so fresh HTML/JS is served after a deploy.
  //    Only fall back to cache if truly offline.
  const isNavigation =
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response for offline fallback
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // ── 3. JS / CSS / image assets → Stale-While-Revalidate
  //    Serve cached instantly, but ALSO fetch fresh in background and update cache.
  //    Vite hashes asset filenames so this is always safe.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone())
          return response
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
  )
})

// Handle mobile push notifications & background reminders
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: '⏰ Reminder Alarm', body: event.data ? event.data.text() : 'You have a scheduled reminder!' }
  }

  const options = {
    body: data.body || 'Time to check your scheduled expense or task!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'reminder-alarm',
    renotify: true,
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title || '⏰ Reminder Alarm', options))
})

// Handle background notification triggers from window
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_REMINDER_NOTIFICATION') {
    const { title, body, tag } = event.data
    self.registration.showNotification(title || '⏰ Reminder Alarm', {
      body: body || 'Time to complete your task!',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [300, 150, 300],
      tag: tag || 'reminder-alarm',
      renotify: true,
    })
  }
})

// Handle mobile push notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow('/')
    })
  )
})
