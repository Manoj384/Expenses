/**
 * Crash-Resilient Offline Storage & Shadow Caching Engine
 */

const STORAGE_PREFIX = 'ft_shadow_'

export function saveShadowCache(key, data) {
  try {
    const payload = {
      timestamp: Date.now(),
      data: data,
    }
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(payload))
  } catch (err) {
    console.warn(`[ShadowCache] Failed to write cache for ${key}:`, err)
  }
}

export function getShadowCache(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed?.data !== undefined ? parsed.data : fallback
  } catch (err) {
    console.warn(`[ShadowCache] Failed to read cache for ${key}:`, err)
    return fallback
  }
}

export function clearShadowCache(key) {
  try {
    if (key) {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(STORAGE_PREFIX))
        .forEach(k => localStorage.removeItem(k))
    }
  } catch {}
}

/**
 * Export Entire Local/Cloud Database as a JSON File for instant disaster recovery
 */
export function downloadBackupFile(dataObj, filename = 'finance_tracker_backup.json') {
  try {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (err) {
    console.error('Backup download failed:', err)
    return false
  }
}
