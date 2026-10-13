/**
 * goalRepository.js
 * Centralized Domain Repository for Financial Goals Data Access
 */

import { supabase } from '../../../lib/supabaseClient'

function getFallbackTargetDate() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export const goalRepository = {
  /**
   * List goals for user
   */
  async listGoals({ userId }) {
    if (!userId) throw new Error('userId is required to list goals.')

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Create a goal with guaranteed non-null target_date
   */
  async createGoal({ userId, goal }) {
    if (!userId) throw new Error('userId is required to create a goal.')

    const payload = {
      user_id: userId,
      name: goal.name?.trim(),
      target_amount: parseFloat(goal.target_amount) || 0,
      current_amount: parseFloat(goal.current_amount) || 0,
      target_date: goal.target_date?.trim() || getFallbackTargetDate(),
      category: goal.category || 'Savings',
    }

    const { data, error } = await supabase
      .from('goals')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update goal details or progress
   */
  async updateGoal({ userId, id, updates }) {
    if (!userId || !id) throw new Error('userId and id are required to update goal.')

    const payload = { ...updates }
    delete payload.id
    delete payload.user_id

    if (payload.target_date === '' || payload.target_date === null) {
      payload.target_date = getFallbackTargetDate()
    }

    const { data, error } = await supabase
      .from('goals')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete goal
   */
  async deleteGoal({ userId, id }) {
    if (!userId || !id) throw new Error('userId and id are required to delete goal.')

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return true
  },
}
