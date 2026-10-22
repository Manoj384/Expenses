/**
 * sharedTripService.js
 * Isolated Sharing & Real-Time Sync Service for Splitwise Trips / Groups
 */

import { supabase } from '../../../lib/supabaseClient'

/**
 * Generate a friendly alphanumeric share token
 */
export function generateShareToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = 'trip_'
  for (let i = 0; i < 9; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Publish / sync an active group to the shared cloud repository
 */
export async function publishOrSyncSharedGroup(group, userId = null) {
  if (!group) throw new Error('Group is required.')

  const shareToken = group.share_token || generateShareToken()
  const payload = {
    id: group.id,
    owner_id: userId || null,
    share_token: shareToken,
    name: group.name,
    description: group.description || '',
    icon: group.icon || '🏖️',
    budget: Number(group.budget || 0),
    members: group.members || [],
    expenses: group.expenses || [],
    updated_at: new Date().toISOString(),
  }

  // 1. Always cache locally for instant offline / fallback access
  try {
    localStorage.setItem(`ft_shared_trip_${shareToken}`, JSON.stringify(payload))
  } catch {}

  // 2. Upsert to Supabase shared_splitwise_groups
  try {
    const { data, error } = await supabase
      .from('shared_splitwise_groups')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      console.warn('[sharedTripService] Remote upsert failed (using local sync fallback):', error.message)
    } else if (data) {
      return { ...data, shareUrl: getShareUrl(shareToken) }
    }
  } catch (err) {
    console.warn('[sharedTripService] Network/database sync fallback:', err)
  }

  return { ...payload, shareUrl: getShareUrl(shareToken) }
}

/**
 * Fetch a shared trip by its share_token
 */
export async function fetchSharedGroupByToken(shareToken) {
  if (!shareToken) return { group: null, error: 'Invalid share link.' }

  // 1. Attempt remote database fetch
  try {
    const { data, error } = await supabase
      .from('shared_splitwise_groups')
      .select('*')
      .eq('share_token', shareToken)
      .maybeSingle()

    if (!error && data) {
      // Keep local shadow cache updated
      try {
        localStorage.setItem(`ft_shared_trip_${shareToken}`, JSON.stringify(data))
      } catch {}
      return { group: data, error: null }
    }
  } catch (err) {
    console.warn('[sharedTripService] Remote fetch error:', err)
  }

  // 2. Fallback to local storage
  try {
    const local = localStorage.getItem(`ft_shared_trip_${shareToken}`)
    if (local) {
      return { group: JSON.parse(local), error: null }
    }
  } catch {}

  return { group: null, error: 'Shared trip not found or link has expired.' }
}

/**
 * Update expenses or members in a shared trip (called by friends or owner)
 */
export async function updateSharedTripData(shareToken, { expenses, members, budget, name, description }) {
  if (!shareToken) return false

  const updates = {
    updated_at: new Date().toISOString(),
  }
  if (expenses !== undefined) updates.expenses = expenses
  if (members !== undefined) updates.members = members
  if (budget !== undefined) updates.budget = Number(budget)
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description

  // 1. Update local storage
  try {
    const local = localStorage.getItem(`ft_shared_trip_${shareToken}`)
    if (local) {
      const parsed = JSON.parse(local)
      const merged = { ...parsed, ...updates }
      localStorage.setItem(`ft_shared_trip_${shareToken}`, JSON.stringify(merged))
    }
  } catch {}

  // 2. Update remote database
  try {
    const { error } = await supabase
      .from('shared_splitwise_groups')
      .update(updates)
      .eq('share_token', shareToken)

    if (error) {
      console.warn('[sharedTripService] Remote update failed:', error.message)
    }
  } catch (err) {
    console.warn('[sharedTripService] Remote update network error:', err)
  }

  return true
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
