/**
 * budgetRepository.js
 * Centralized Domain Repository for Budgets & Alert Thresholds
 */

import { supabase } from '../../../lib/supabaseClient'

export const budgetRepository = {
  /**
   * List all category budgets for authenticated user
   */
  async listBudgets({ userId }) {
    if (!userId) throw new Error('userId is required to list budgets.')

    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(id, name, type)')
      .eq('user_id', userId)

    if (error) throw error
    return data || []
  },

  /**
   * Upsert a category budget
   */
  async upsertBudget({ userId, budget }) {
    if (!userId) throw new Error('userId is required to save budget.')

    const payload = {
      ...budget,
      user_id: userId,
      monthly_limit: parseFloat(budget.monthly_limit) || 0,
      alert_threshold_pct: parseInt(budget.alert_threshold_pct, 10) || 80,
    }

    const { data, error } = await supabase
      .from('budgets')
      .upsert(payload, { onConflict: 'user_id,category_id' })
      .select('*, categories(id, name, type)')
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a budget
   */
  async deleteBudget({ userId, id }) {
    if (!userId || !id) throw new Error('userId and id are required to delete budget.')

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return true
  },
}
