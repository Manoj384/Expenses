/**
 * transactionRepository.js
 * Centralized Domain Repository for Transaction Data Access
 */

import { supabase } from '../../../lib/supabaseClient'

export const transactionRepository = {
  /**
   * List transactions for authenticated user with optional filters & pagination
   */
  async listTransactions({ userId, startDate, endDate, type, categoryId, page = 1, limit = 50 } = {}) {
    if (!userId) throw new Error('userId is required to list transactions.')

    let query = supabase
      .from('transactions')
      .select('*, categories(id, name, type), payment_methods(id, name, type)', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)
    if (type) query = query.eq('type', type)
    if (categoryId) query = query.eq('category_id', categoryId)

    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    }

    const { data, count, error } = await query
    if (error) throw error
    return { transactions: data || [], totalCount: count || 0 }
  },

  /**
   * Create a single transaction with strict user isolation
   */
  async createTransaction({ userId, transaction }) {
    if (!userId) throw new Error('userId is required to create a transaction.')
    if (!transaction || !transaction.amount) throw new Error('Transaction payload is invalid.')

    const payload = {
      ...transaction,
      user_id: userId,
      amount: parseFloat(transaction.amount) || 0,
      date: transaction.date || new Date().toISOString().slice(0, 10),
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select('*, categories(id, name, type), payment_methods(id, name, type)')
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update an existing transaction
   */
  async updateTransaction({ userId, id, updates }) {
    if (!userId || !id) throw new Error('userId and id are required to update transaction.')

    const payload = { ...updates }
    delete payload.id
    delete payload.user_id

    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, categories(id, name, type), payment_methods(id, name, type)')
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete a transaction by ID
   */
  async deleteTransaction({ userId, id }) {
    if (!userId || !id) throw new Error('userId and id are required to delete transaction.')

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
    return true
  },

  /**
   * Bulk insert transactions (for statement imports / CSV)
   */
  async bulkCreateTransactions({ userId, transactions }) {
    if (!userId) throw new Error('userId is required for bulk creation.')
    if (!Array.isArray(transactions) || transactions.length === 0) return []

    const rows = transactions.map((t) => ({
      ...t,
      user_id: userId,
      amount: parseFloat(t.amount) || 0,
    }))

    const { data, error } = await supabase
      .from('transactions')
      .insert(rows)
      .select()

    if (error) throw error
    return data || []
  },
}
