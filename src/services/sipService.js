import { supabase } from '../lib/supabaseClient.js'
import { calculateNextDueDate } from '../utils/sipUtils.js'

/**
 * SIP Service & Repository
 * Centralizes Systematic Investment Plan scheduling, payments, and Supabase persistence.
 */

export async function fetchSips(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('sips')
    .select('*, categories(*)')
    .eq('user_id', userId)
    .order('next_due_date', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createSip({ userId, sip }) {
  if (!userId) throw new Error('User ID is required')

  const payload = {
    user_id: userId,
    name: sip.name,
    amount: parseFloat(sip.amount),
    frequency: sip.frequency || 'monthly',
    next_due_date: sip.next_due_date,
    category_id: sip.category_id || null,
    is_active: sip.is_active !== undefined ? sip.is_active : true,
    step_up_percent: parseFloat(sip.step_up_percent || 0),
  }

  const { data, error } = await supabase
    .from('sips')
    .insert(payload)
    .select('*, categories(*)')
    .single()

  if (error) throw error
  return data
}

export async function updateSip({ id, sip }) {
  if (!id) throw new Error('SIP ID is required')

  const payload = {
    name: sip.name,
    amount: parseFloat(sip.amount),
    frequency: sip.frequency,
    next_due_date: sip.next_due_date,
    category_id: sip.category_id || null,
    is_active: sip.is_active,
    step_up_percent: parseFloat(sip.step_up_percent || 0),
  }

  const { data, error } = await supabase
    .from('sips')
    .update(payload)
    .eq('id', id)
    .select('*, categories(*)')
    .single()

  if (error) throw error
  return data
}

export async function deleteSip(id) {
  if (!id) throw new Error('SIP ID is required')
  const { error } = await supabase.from('sips').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function markSipPaid({ id, currentDueDate, frequency }) {
  if (!id) throw new Error('SIP ID is required')

  const nextDate = calculateNextDueDate(currentDueDate, frequency)
  const { data, error } = await supabase
    .from('sips')
    .update({ next_due_date: nextDate })
    .eq('id', id)
    .select('*, categories(*)')
    .single()

  if (error) throw error
  return data
}
