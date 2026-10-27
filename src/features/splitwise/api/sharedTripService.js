/**
 * sharedTripService.js
 * Isolated Sharing & Real-Time Sync Service for Splitwise Trips / Groups
 */

import { supabase } from '../../../lib/supabaseClient'

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
    icon: group.icon || '🏖️',
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
  try {
    localStorage.setItem(`ft_shared_trip_${shareToken}`, JSON.stringify(hydratedLocal))
  } catch {}

  // 2. Upsert through owner-only RLS. Shared-link visitors cannot enumerate groups.
  try {
    const { data, error } = await supabase
      .from('shared_splitwise_groups')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) throw error
    const meta = parseGroupMetadata(data.description)
    return {
      ...data,
      description: meta.description,
      activities: meta.activities,
      shareUrl: getShareUrl(shareToken),
    }
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
    try {
      localStorage.setItem(`ft_shared_trip_${shareToken}`, JSON.stringify(groupWithActs))
    } catch {}
    return { group: groupWithActs, error: null }
  } catch (err) {
    console.warn('[sharedTripService] Remote fetch error:', err)
  }

  // 2. Fallback to local storage
  try {
    const local = localStorage.getItem(`ft_shared_trip_${shareToken}`)
    if (local) {
      const parsed = JSON.parse(local)
      const meta = parseGroupMetadata(parsed.description)
      return {
        group: { ...parsed, description: meta.description, activities: parsed.activities || meta.activities },
        error: null,
      }
    }
  } catch {}

  return { group: null, error: 'Shared trip not found or link has expired.' }
}

/**
 * Update expenses, members, name, icon, description, activities in a shared trip
 */
export async function updateSharedTripData(shareToken, { expenses, members, budget, name, description, icon, activities }) {
  if (!shareToken) return false

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
    try {
      const local = localStorage.getItem(`ft_shared_trip_${shareToken}`)
      if (local) {
        const parsed = JSON.parse(local)
        const meta = parseGroupMetadata(parsed.description)
        if (currentDesc === undefined) currentDesc = meta.description
        if (currentActs === undefined) currentActs = parsed.activities || meta.activities
      }
    } catch {}
    updates.description = serializeGroupMetadata(currentDesc, currentActs)
  }

  // 1. Update local storage immediately
  try {
    const local = localStorage.getItem(`ft_shared_trip_${shareToken}`)
    const parsed = local ? JSON.parse(local) : {}
    const meta = parseGroupMetadata(updates.description || parsed.description)
    const merged = {
      ...parsed,
      ...updates,
      description: meta.description,
      activities: activities !== undefined ? activities : (parsed.activities || meta.activities),
    }
    localStorage.setItem(`ft_shared_trip_${shareToken}`, JSON.stringify(merged))
  } catch {}

  // 2. Update through the token-scoped Edge Function.
  try {
    const { data, error } = await supabase.functions.invoke('shared-trip', {
      body: { action: 'update', shareToken, updates },
    })
    if (error || !data?.group) throw new Error(error?.message || data?.error || 'Shared trip update failed.')
    return { ok: true, synced: true, group: data.group }
  } catch (err) {
    console.warn('[sharedTripService] Remote update failed; changes remain local:', err)
    return { ok: false, synced: false, error: err instanceof Error ? err.message : 'Shared trip sync failed.' }
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
