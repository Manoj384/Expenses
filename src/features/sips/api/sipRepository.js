/**
 * sipRepository.js
 * Centralized Domain Repository for Systematic Investment Plans (SIPs) & Payments
 */

import { supabase } from '../../../lib/supabaseClient'

export const sipRepository = {
  /**
   * List all SIPs for authenticated user
   */
  async listSips({ userId }) {
    if (!userId) throw new Error('userId is required to list SIPs.')

    const { data, error } = await supabase
      .from('sips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Create an SIP (never sends invalid columns like fund_id to DB)
   */
  async createSip({ userId, sip }) {
    if (!userId) throw new Error('userId is required to create an SIP.')

    const payload = {
      user_id: userId,
      name: sip.name?.trim(),
      amount: parseFloat(sip.amount) || 0,
      frequency: sip.frequency || 'monthly',
      start_date: sip.start_date || new Date().toISOString().slice(0, 10),
    }

    const { data, error } = await supabase
      .from('sips')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update an SIP
   */
  async updateSip({ userId, id, updates }) {
    if (!userId || !id) throw new Error('userId and id are required to update SIP.')

    const payload = { ...updates }
    delete payload.id
    delete payload.user_id
    delete payload.fund_id // Column safety guardrail

    const { data, error } = await supabase
      .from('sips')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete an SIP
   */
  async deleteSip({ userId, id }) {
    if (!userId || !id) throw new Error('userId and id are required to delete SIP.')

    const { error } = await supabase
      .from('sips')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return true
  },

  /**
   * List payment history for an SIP
   */
  async listSipPayments({ sipId }) {
    if (!sipId) return []

    const { data, error } = await supabase
      .from('sip_payments')
      .select('*')
      .eq('sip_id', sipId)
      .order('paid_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Record an SIP payment
   */
  async recordSipPayment({ sipId, payment }) {
    if (!sipId) throw new Error('sipId is required to record payment.')

    const payload = {
      sip_id: sipId,
      amount: parseFloat(payment.amount) || 0,
      paid_date: payment.paid_date || new Date().toISOString().slice(0, 10),
    }

    const { data, error } = await supabase
      .from('sip_payments')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
