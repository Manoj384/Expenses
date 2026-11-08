import { supabase } from '../lib/supabaseClient.js'

/**
 * Goal Service & Repository
 * Centralizes financial goals management in Supabase.
 */

export async function fetchGoals(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function saveGoal({ userId, goal, id = null }) {
  if (!userId) throw new Error('User ID is required')

  const payload = {
    user_id: userId,
    name: goal.name,
    target_amount: parseFloat(goal.target_amount),
    current_amount: parseFloat(goal.current_amount || 0),
    target_date: goal.target_date || null,
    category: goal.category || 'General',
  }

  if (id) {
    const { data, error } = await supabase
      .from('goals')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('goals')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteGoal(id) {
  if (!id) throw new Error('Goal ID is required')
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
  return true
}
