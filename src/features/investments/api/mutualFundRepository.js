/**
 * mutualFundRepository.js
 * Centralized Domain Repository for Mutual Funds & AMFI Portfolio Data
 */

import { supabase } from '../../../lib/supabaseClient'
import { enrichFundsWithCachedNavs } from '../../../utils/mfApi'

export const mutualFundRepository = {
  /**
   * List all mutual fund holdings for user with cached AMFI NAVs
   */
  async listMutualFunds({ userId }) {
    if (!userId) throw new Error('userId is required to list mutual funds.')

    const { data, error } = await supabase
      .from('mutual_funds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return enrichFundsWithCachedNavs(data || [])
  },

  /**
   * Upsert or create mutual fund folio
   */
  async saveMutualFund({ userId, fund }) {
    if (!userId) throw new Error('userId is required to save mutual fund.')

    const payload = {
      ...fund,
      user_id: userId,
      units: parseFloat(fund.units) || 0,
      invested_amount: parseFloat(fund.invested_amount) || 0,
    }

    const { data, error } = await supabase
      .from('mutual_funds')
      .upsert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete mutual fund folio
   */
  async deleteMutualFund({ userId, id }) {
    if (!userId || !id) throw new Error('userId and id are required to delete fund.')

    const { error } = await supabase
      .from('mutual_funds')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return true
  },
}
