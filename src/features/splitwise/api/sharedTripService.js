/**
 * sharedTripService.js
 * Isolated Sharing & Real-Time Sync Service for Splitwise Trips / Groups
 */

import { supabase } from '../../../lib/supabaseClient'

export const SHARED_TRIP_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Save shared trip data to local storage with TTL timestamp
 */
export function saveSharedTripCache(shareToken, data) {
  if (!shareToken || !data) return
  try {
    const wrapped = {
      version: 2,
      savedAt: Date.now(),
      expiresAt: Date.now() + SHARED_TRIP_CACHE_TTL_MS,
      data,
    }
    localStorage.setItem(`ft_shared_trip_${shareToken}`, JSON.stringify(wrapped))
  } catch {}
}

/**
 * Load shared trip data from local cache, respecting TTL
 */
export function loadSharedTripCache(shareToken) {
  if (!shareToken) return null
  try {
    const raw = localStorage.getItem(`ft_shared_trip_${shareToken}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.version === 2 && parsed.data) {
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(`ft_shared_trip_${shareToken}`)
        return null
      }
      return parsed.data
    }
    // Legacy un-versioned raw object fallback
    return parsed
  } catch {
    return null
  }
}

/**
 * Clear cached trip data and any pending sync state for privacy/cleanup
 */
export function clearSharedTripCache(shareToken) {
  if (!shareToken) return
  try {
    localStorage.removeItem(`ft_shared_trip_${shareToken}`)
    localStorage.removeItem(`ft_pending_sync_${shareToken}`)
    localStorage.removeItem(`ft_shared_member_${shareToken}`)
  } catch {}
}

/**
 * Parse group description to extract clean description and structured activities
 */
export function parseGroupMetadata(rawDesc = '') {
  if (!rawDesc || typeof rawDesc !== 'string') return { description: '', activities: [] }
  const trimmed = rawDesc.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      return {
        description: parsed.text || '',
        activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      }
    } catch {}
  }
  return { description: rawDesc, activities: [] }
}

/**
 * Serialize clean description and structured activities into description column
 */
export function serializeGroupMetadata(descText = '', activities = []) {
  return JSON.stringify({
    text: descText || '',
    activities: (activities || []).slice(0, 50),
  })
}

/**
 * Generate an unguessable share token for an authenticated owner's trip.
 * The token is not a substitute for RLS: direct table access remains owner-only.
 */
export function generateShareToken() {
  const bytes = new Uint8Array(24)
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random number generation is unavailable in this browser.')
  }
  globalThis.crypto.getRandomValues(bytes)
  return `trip_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Publish / sync an active group to the shared cloud repository
 */
export async function publishOrSyncSharedGroup(group, userId = null) {
  if (!group) throw new Error('Group is required.')
  if (!userId) throw new Error('You must be signed in to publish a shared trip.')

  const shareToken = group.share_token || generateShareToken()
  const { description: cleanDesc, activities: parsedActs } = parseGroupMetadata(group.description)
  const allActs = group.activities || parsedActs || []
  const serializedDesc = serializeGroupMetadata(cleanDesc || group.description, allActs)

  const payload = {
    id: group.id,
    owner_id: userId || null,
    share_token: shareToken,
    name: group.name,
    description: serializedDesc,
    icon: group.icon || '✈️',
    budget: Number(group.budget || 0),
    members: group.members || [],
    expenses: group.expenses || [],
    updated_at: new Date().toISOString(),
  }

  const hydratedLocal = {
    ...payload,
    description: cleanDesc,
    activities: allActs,
  }

  // 1. Always cache locally for instant offline / fallback access
  saveSharedTripCache(shareToken, hydratedLocal)

  // 2. Upsert through owner-only RLS. Shared-link visitors cannot enumerate groups.
  try {
    const { data, error } = await supabase
      .from('shared_splitwise_groups')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) throw error
    const meta = parseGroupMetadata(data.description)
    const result = {
      ...data,
      description: meta.description,
      activities: meta.activities,
      shareUrl: getShareUrl(shareToken),
    }
    saveSharedTripCache(shareToken, result)
    return result
  } catch (err) {
    console.warn('[sharedTripService] Remote upsert failed; local data is pending sync:', err)
    return { ...hydratedLocal, shareUrl: getShareUrl(shareToken) }
  }
}

/**
 * Fetch a shared trip by its share_token
 */
export async function fetchSharedGroupByToken(shareToken) {
  if (!shareToken) return { group: null, error: 'Invalid share link.' }

  // 1. Shared links are resolved by the token-scoped Edge Function. This avoids
  // exposing the underlying groups table to anonymous clients.
  try {
    const { data, error } = await supabase.functions.invoke('shared-trip', {
      body: { action: 'get', shareToken },
    })
    if (error || !data?.group) throw new Error(error?.message || data?.error || 'Shared trip not found.')

    const meta = parseGroupMetadata(data.group.description)
    const groupWithActs = {
      ...data.group,
      description: meta.description,
      activities: meta.activities,
    }
    saveSharedTripCache(shareToken, groupWithActs)
    return { group: groupWithActs, error: null }
  } catch (err) {
    console.warn('[sharedTripService] Remote fetch error:', err)
  }

  // 2. Fallback to local storage
  const local = loadSharedTripCache(shareToken)
  if (local) {
    const meta = parseGroupMetadata(local.description)
    return {
      group: { ...local, description: meta.description, activities: local.activities || meta.activities },
      error: null,
      isCached: true,
    }
  }

  return { group: null, error: 'Shared trip not found or link has expired.' }
}

/**
 * Synchronize any pending offline updates with the cloud
 */
export async function syncPendingTripData(shareToken) {
  if (!shareToken) return { synced: true }
  try {
    const rawPending = localStorage.getItem(`ft_pending_sync_${shareToken}`)
    if (!rawPending) return { synced: true }
    const { updates } = JSON.parse(rawPending)
    if (!updates) {
      localStorage.removeItem(`ft_pending_sync_${shareToken}`)
      return { synced: true }
    }

    const { data, error } = await supabase.functions.invoke('shared-trip', {
      body: { action: 'update', shareToken, updates },
    })
    if (error || !data?.group) throw new Error(error?.message || data?.error || 'Shared trip sync failed.')

    localStorage.removeItem(`ft_pending_sync_${shareToken}`)
    const meta = parseGroupMetadata(data.group.description)
    const remoteGroup = {
      ...data.group,
      description: meta.description,
      activities: meta.activities,
    }
    saveSharedTripCache(shareToken, remoteGroup)
    return { synced: true, group: remoteGroup }
  } catch (err) {
    return { synced: false, error: err instanceof Error ? err.message : 'Sync failed' }
  }
}

/**
 * Update expenses, members, name, icon, description, activities in a shared trip
 */
export async function updateSharedTripData(shareToken, { expenses, members, budget, name, description, icon, activities }) {
  if (!shareToken) return { ok: false, synced: false, error: 'Missing share token.' }

  const updates = {
    updated_at: new Date().toISOString(),
  }
  if (expenses !== undefined) updates.expenses = expenses
  if (members !== undefined) updates.members = members
  if (budget !== undefined) updates.budget = Number(budget)
  if (name !== undefined) updates.name = name
  if (icon !== undefined) updates.icon = icon

  // Handle description & activities serialization
  if (description !== undefined || activities !== undefined) {
    let currentDesc = description
    let currentActs = activities
    const cached = loadSharedTripCache(shareToken)
    if (cached) {
      const meta = parseGroupMetadata(cached.description)
      if (currentDesc === undefined) currentDesc = meta.description
      if (currentActs === undefined) currentActs = cached.activities || meta.activities
    }
    updates.description = serializeGroupMetadata(currentDesc, currentActs)
  }

  // 1. Update local cache immediately
  const cached = loadSharedTripCache(shareToken) || {}
  const meta = parseGroupMetadata(updates.description || cached.description)
  const merged = {
    ...cached,
    ...updates,
    description: meta.description,
    activities: activities !== undefined ? activities : (cached.activities || meta.activities),
  }
  saveSharedTripCache(shareToken, merged)

  // 2. Update through the token-scoped Edge Function.
  try {
    const { data, error } = await supabase.functions.invoke('shared-trip', {
      body: { action: 'update', shareToken, updates },
    })
    if (error || !data?.group) throw new Error(error?.message || data?.error || 'Shared trip update failed.')

    try {
      localStorage.removeItem(`ft_pending_sync_${shareToken}`)
    } catch {}

    const updatedMeta = parseGroupMetadata(data.group.description)
    const remoteGroup = {
      ...data.group,
      description: updatedMeta.description,
      activities: updatedMeta.activities,
    }
    saveSharedTripCache(shareToken, remoteGroup)
    return { ok: true, synced: true, group: remoteGroup }
  } catch (err) {
    console.warn('[sharedTripService] Remote update failed; changes remain local:', err)
    try {
      localStorage.setItem(`ft_pending_sync_${shareToken}`, JSON.stringify({
        shareToken,
        updates,
        timestamp: Date.now(),
      }))
    } catch {}
    return { ok: true, synced: false, group: merged, error: err instanceof Error ? err.message : 'Shared trip sync pending.' }
  }
}

/**
 * Construct full shareable URL
 */
export function getShareUrl(shareToken) {
  const envBase = import.meta.env.VITE_APP_URL
  if (envBase) {
    return `${envBase.replace(/\/+$/, '')}/shared-trip/${shareToken}`
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  return `${origin}/shared-trip/${shareToken}`
}
