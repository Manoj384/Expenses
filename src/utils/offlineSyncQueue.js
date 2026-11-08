/**
 * True Offline-First IndexedDB Mutation Queue Engine
 * Buffers offline transactions, budgets, goals, and mutations,
 * then auto-drains and synchronizes them to Supabase when network connectivity restores.
 */

const DB_NAME = 'FinanceTrackerOfflineDB'
const DB_VERSION = 1
const STORE_NAME = 'pending_mutations'

// In-memory fallback for environments without IndexedDB (e.g. Node tests / SSR)
const memoryStore = new Map()

function isIndexedDBAvailable() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

/**
 * Open or create the IndexedDB store
 */
export function openOfflineDB() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return resolve(null)
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      resolve(event.target.result)
    }

    request.onerror = (event) => {
      console.warn('[OfflineQueue] IndexedDB open error:', event.target.error)
      resolve(null)
    }
  })
}

/**
 * Enqueue a mutation for offline sync
 */
export async function enqueueOfflineMutation(mutation) {
  const item = {
    id: mutation.id || `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: mutation.type || 'insert', // 'insert' | 'update' | 'delete'
    table: mutation.table || 'transactions',
    payload: mutation.payload || {},
    timestamp: Date.now(),
    status: 'pending',
    retries: 0,
    clientMeta: mutation.clientMeta || {},
  }

  const db = await openOfflineDB()
  if (db) {
    await new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.put(item)
        req.onsuccess = () => resolve(true)
        req.onerror = () => reject(req.error)
      } catch (err) {
        reject(err)
      }
    }).catch(err => {
      console.warn('[OfflineQueue] Failed to put into IndexedDB, falling back to memory:', err)
      memoryStore.set(item.id, item)
    })
  } else {
    memoryStore.set(item.id, item)
  }

  notifyQueueChange()
  return item
}

/**
 * Retrieve all pending offline mutations
 */
export async function getPendingOfflineMutations() {
  const db = await openOfflineDB()
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => resolve(Array.from(memoryStore.values()))
      } catch {
        resolve(Array.from(memoryStore.values()))
      }
    })
  }
  return Array.from(memoryStore.values())
}

/**
 * Get count of pending offline mutations
 */
export async function getPendingQueueCount() {
  const list = await getPendingOfflineMutations()
  return list.length
}

/**
 * Remove a mutation from the queue after successful sync
 */
export async function removeOfflineMutation(id) {
  const db = await openOfflineDB()
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.delete(id)
        req.onsuccess = () => resolve(true)
        req.onerror = () => resolve(false)
      } catch {
        resolve(false)
      }
    })
  }
  memoryStore.delete(id)
  notifyQueueChange()
}

/**
 * Clear the entire offline queue
 */
export async function clearOfflineQueue() {
  const db = await openOfflineDB()
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.clear()
        req.onsuccess = () => resolve(true)
        req.onerror = () => resolve(false)
      } catch {
        resolve(false)
      }
    })
  }
  memoryStore.clear()
  notifyQueueChange()
}

/**
 * Drain and push all pending mutations to Supabase
 */
export async function drainOfflineQueue(supabaseClient) {
  if (!supabaseClient) return { syncedCount: 0, failedCount: 0, pending: 0 }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, pending: await getPendingQueueCount() }
  }

  const items = await getPendingOfflineMutations()
  if (items.length === 0) return { syncedCount: 0, failedCount: 0, pending: 0 }

  let syncedCount = 0
  let failedCount = 0

  for (const item of items) {
    try {
      const { table, type, payload } = item
      let res

      if (type === 'insert') {
        res = await supabaseClient.from(table).insert([payload])
      } else if (type === 'update') {
        const idCol = payload.id ? 'id' : 'uuid'
        res = await supabaseClient.from(table).update(payload).eq(idCol, payload[idCol])
      } else if (type === 'delete') {
        res = await supabaseClient.from(table).delete().eq('id', payload.id)
      }

      if (res?.error) {
        // If it's a conflict/duplicate or 409, consider it already persisted
        if (res.error.code === '23505') {
          await removeOfflineMutation(item.id)
          syncedCount++
        } else {
          failedCount++
        }
      } else {
        await removeOfflineMutation(item.id)
        syncedCount++
      }
    } catch {
      failedCount++
    }
  }

  notifyQueueChange({ syncedCount, failedCount })
  return {
    syncedCount,
    failedCount,
    pending: await getPendingQueueCount(),
  }
}

function notifyQueueChange(detail = {}) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('ft-offline-queue-change', { detail }))
  }
}

// Global auto-sync trigger when network comes back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    try {
      const { supabase } = await import('../lib/supabaseClient.js')
      await drainOfflineQueue(supabase)
    } catch (err) {
      console.warn('[OfflineQueue] Auto-drain on reconnect failed:', err)
    }
  })
}
