/**
 * debtRepository.js
 * Centralized Domain Repository for Debts, Borrowings & Loans
 */

import { supabase } from '../../../lib/supabaseClient'

export const debtRepository = {
  /**
   * List all borrowings and money lent for authenticated user
   */
  async listDebts({ userId }) {
    if (!userId) throw new Error('userId is required to list debts.')

    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Create a debt or lent money record
   */
  async createDebt({ userId, debt }) {
    if (!userId) throw new Error('userId is required to create a debt.')

    const principal = parseFloat(debt.principal) || 0
    const outstanding = debt.outstanding !== undefined ? parseFloat(debt.outstanding) : principal

    const payload = {
      ...debt,
      user_id: userId,
      principal,
      outstanding,
      emi: parseFloat(debt.emi) || 0,
      status: outstanding <= 0 ? 'cleared' : 'active',
    }

    const { data, error } = await supabase
      .from('debts')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update debt details
   */
  async updateDebt({ userId, id, updates }) {
    if (!userId || !id) throw new Error('userId and id are required to update debt.')

    const payload = { ...updates }
    delete payload.id
    delete payload.user_id

    const { data, error } = await supabase
      .from('debts')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete debt record
   */
  async deleteDebt({ userId, id }) {
    if (!userId || !id) throw new Error('userId and id are required to delete debt.')

    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return true
  },
}
