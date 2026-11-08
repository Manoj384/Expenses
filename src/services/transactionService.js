import { supabase } from '../lib/supabaseClient.js'
import { enqueueOfflineMutation } from '../utils/offlineSyncQueue.js'

/**
 * Transaction Service & Repository
 * Centralizes all Supabase database queries, user isolation, and pagination
 * for financial transactions.
 */

export const PAGE_SIZE = 50

export async function fetchTransactions({ userId, filters = {}, page = 1, pageSize = PAGE_SIZE }) {
  if (!userId) throw new Error('User ID is required to fetch transactions')

  let query = supabase
    .from('transactions')
    .select('*, categories(*), payment_methods(*)', { count: 'exact' })
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.type) {
    query = query.eq('type', filters.type)
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  if (filters.payment_method_id) {
    query = query.eq('payment_method_id', filters.payment_method_id)
  }
  if (filters.start_date) {
    query = query.gte('date', filters.start_date)
  }
  if (filters.end_date) {
    query = query.lte('date', filters.end_date)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query
  if (error) throw error

  return { data: data || [], totalCount: count || 0 }
}

export async function createTransaction({ userId, transaction }) {
  if (!userId) throw new Error('User ID is required')
  if (!transaction.amount || transaction.amount <= 0) {
    throw new Error('Valid transaction amount is required')
  }

  const payload = {
    user_id: userId,
    type: transaction.type,
    amount: parseFloat(transaction.amount),
    category_id: transaction.category_id || null,
    payment_method_id: transaction.payment_method_id || null,
    note: transaction.note || null,
    date: transaction.date,
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select('*, categories(*), payment_methods(*)')
      .single()

    if (error) throw error
    return data
  } catch (err) {
    if ((typeof navigator !== 'undefined' && !navigator.onLine) || err?.message?.includes('fetch') || err?.message?.includes('network')) {
      const syntheticId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const syntheticItem = { ...payload, id: syntheticId, created_at: new Date().toISOString(), _isOffline: true }
      await enqueueOfflineMutation({
        id: syntheticId,
        type: 'insert',
        table: 'transactions',
        payload,
      })
      return syntheticItem
    }
    throw err
  }
}

export async function updateTransaction({ id, transaction }) {
  if (!id) throw new Error('Transaction ID is required')

  const payload = {
    type: transaction.type,
    amount: parseFloat(transaction.amount),
    category_id: transaction.category_id || null,
    payment_method_id: transaction.payment_method_id || null,
    note: transaction.note || null,
    date: transaction.date,
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select('*, categories(*), payment_methods(*)')
      .single()

    if (error) throw error
    return data
  } catch (err) {
    if ((typeof navigator !== 'undefined' && !navigator.onLine) || err?.message?.includes('fetch') || err?.message?.includes('network')) {
      await enqueueOfflineMutation({
        id: `update_${id}_${Date.now()}`,
        type: 'update',
        table: 'transactions',
        payload: { ...payload, id },
      })
      return { ...payload, id, _isOffline: true }
    }
    throw err
  }
}

export async function deleteTransaction(id) {
  if (!id) throw new Error('Transaction ID is required')
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    if ((typeof navigator !== 'undefined' && !navigator.onLine) || err?.message?.includes('fetch') || err?.message?.includes('network')) {
      await enqueueOfflineMutation({
        id: `delete_${id}_${Date.now()}`,
        type: 'delete',
        table: 'transactions',
        payload: { id },
      })
      return true
    }
    throw err
  }
}

export async function fetchMonthSummary({ userId, startDate, endDate }) {
  if (!userId) return { income: 0, expense: 0, savings: 0, debit: 0 }

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, date')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw error

  let income = 0
  let expense = 0
  let savings = 0
  let debit = 0

  ;(data || []).forEach((t) => {
    const val = parseFloat(t.amount || 0)
    if (t.type === 'income') income += val
    else if (t.type === 'expense') expense += val
    else if (t.type === 'savings') savings += val
    else if (t.type === 'debit') debit += val
  })

  return { income, expense, savings, debit, netSavings: income - expense }
}
