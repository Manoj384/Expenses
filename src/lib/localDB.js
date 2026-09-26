/**
 * localDB.js — Simple localStorage-based data layer.
 * Mimics basic CRUD operations for all tables.
 *
 * Tables: categories, transactions, sips, sip_payments, debts
 */

const KEYS = {
  categories:   'ft_categories',
  transactions: 'ft_transactions',
  sips:         'ft_sips',
  sip_payments: 'ft_sip_payments',
  debts:        'ft_debts',
}

// ─── Core helpers ────────────────────────────────────────────────────────────

function load(table) {
  try {
    const raw = localStorage.getItem(KEYS[table])
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(table, data) {
  localStorage.setItem(KEYS[table], JSON.stringify(data))
}

function newId() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

// ─── categories ──────────────────────────────────────────────────────────────

export const categories = {
  getAll() {
    return load('categories').sort((a, b) => a.name.localeCompare(b.name))
  },

  getByType(type) {
    return load('categories')
      .filter(c => c.type === type)
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  insert({ name, type }) {
    const rows = load('categories')
    const duplicate = rows.find(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type)
    if (duplicate) throw new Error('Category already exists.')
    const row = { id: newId(), name, type, created_at: now() }
    save('categories', [...rows, row])
    return row
  },

  update(id, { name }) {
    const rows = load('categories').map(c => c.id === id ? { ...c, name } : c)
    save('categories', rows)
  },

  delete(id) {
    // Also null out category_id on transactions
    const txns = load('transactions').map(t => t.category_id === id ? { ...t, category_id: null } : t)
    save('transactions', txns)
    save('categories', load('categories').filter(c => c.id !== id))
  },

  seedDefaults() {
    const expense = ['Food', 'Travel', 'Shopping', 'Bills', 'Rent', 'Utilities', 'Fuel', 'Entertainment', 'Medical', 'Other']
    const income  = ['Salary', 'Freelance', 'Business', 'Interest', 'Bonus', 'Other']
    const existing = load('categories')
    const toAdd = []
    expense.forEach(name => {
      if (!existing.find(c => c.name === name && c.type === 'expense'))
        toAdd.push({ id: newId(), name, type: 'expense', created_at: now() })
    })
    income.forEach(name => {
      if (!existing.find(c => c.name === name && c.type === 'income'))
        toAdd.push({ id: newId(), name, type: 'income', created_at: now() })
    })
    save('categories', [...existing, ...toAdd])
  },
}

// ─── transactions ─────────────────────────────────────────────────────────────

export const transactions = {
  getAll(filters = {}) {
    let rows = load('transactions')
    const cats = load('categories')
    // Join category name
    rows = rows.map(t => ({
      ...t,
      categories: cats.find(c => c.id === t.category_id) || null,
    }))
    // Apply filters
    if (filters.type)        rows = rows.filter(t => t.type === filters.type)
    if (filters.category_id) rows = rows.filter(t => t.category_id === filters.category_id)
    if (filters.start_date)  rows = rows.filter(t => t.date >= filters.start_date)
    if (filters.end_date)    rows = rows.filter(t => t.date <= filters.end_date)
    // Sort newest first
    return rows.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date)
      return b.created_at.localeCompare(a.created_at)
    })
  },

  getRecent(limit = 10) {
    return this.getAll().slice(0, limit)
  },

  getByMonthRange(startDate, endDate) {
    return load('transactions').filter(t => t.date >= startDate && t.date <= endDate)
  },

  insert(payload) {
    const rows = load('transactions')
    const row = { id: newId(), created_at: now(), ...payload }
    save('transactions', [...rows, row])
    return row
  },

  update(id, payload) {
    const rows = load('transactions').map(t => t.id === id ? { ...t, ...payload } : t)
    save('transactions', rows)
  },

  delete(id) {
    save('transactions', load('transactions').filter(t => t.id !== id))
  },
}

// ─── sips ─────────────────────────────────────────────────────────────────────

export const sips = {
  getAll() {
    return load('sips').sort((a, b) => {
      // Active first, then by next_due_date
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.next_due_date.localeCompare(b.next_due_date)
    })
  },

  getActive() {
    return load('sips').filter(s => s.active)
  },

  getUpcoming(limit = 5) {
    return load('sips')
      .filter(s => s.active)
      .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
      .slice(0, limit)
  },

  insert(payload) {
    const rows = load('sips')
    const row = { id: newId(), created_at: now(), ...payload }
    save('sips', [...rows, row])
    return row
  },

  update(id, payload) {
    const rows = load('sips').map(s => s.id === id ? { ...s, ...payload } : s)
    save('sips', rows)
  },

  delete(id) {
    save('sips', load('sips').filter(s => s.id !== id))
    // Cascade delete payments
    save('sip_payments', load('sip_payments').filter(p => p.sip_id !== id))
  },
}

// ─── sip_payments ─────────────────────────────────────────────────────────────

export const sip_payments = {
  getBySip(sip_id) {
    return load('sip_payments')
      .filter(p => p.sip_id === sip_id)
      .sort((a, b) => b.paid_on.localeCompare(a.paid_on))
  },

  insert(payload) {
    const rows = load('sip_payments')
    const row = { id: newId(), ...payload }
    save('sip_payments', [...rows, row])
    return row
  },

  delete(id) {
    save('sip_payments', load('sip_payments').filter(p => p.id !== id))
  },
}

// ─── debts ────────────────────────────────────────────────────────────────────

export const debts = {
  getAll() {
    return load('debts').sort((a, b) => a.created_at.localeCompare(b.created_at))
  },

  getTotalOutstanding() {
    return load('debts').reduce((sum, d) => sum + Number(d.outstanding), 0)
  },

  insert(payload) {
    const rows = load('debts')
    const row = { id: newId(), created_at: now(), ...payload }
    save('debts', [...rows, row])
    return row
  },

  update(id, payload) {
    const rows = load('debts').map(d => d.id === id ? { ...d, ...payload } : d)
    save('debts', rows)
  },

  delete(id) {
    save('debts', load('debts').filter(d => d.id !== id))
  },
}

// ─── markSipPaid (atomic) ─────────────────────────────────────────────────────

export function markSipPaid(sipId) {
  const allSips = load('sips')
  const sip = allSips.find(s => s.id === sipId)
  if (!sip) throw new Error('SIP not found.')

  // Record payment
  sip_payments.insert({ sip_id: sipId, amount: sip.amount, paid_on: today() })

  // Calculate next due date
  const nextDate = calcNextDueDate(sip.next_due_date, sip.frequency)
  sips.update(sipId, { next_due_date: nextDate })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function calcNextDueDate(currentDue, frequency) {
  const date = new Date(currentDue + 'T00:00:00')
  const originalDay = date.getDate()

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      if (date.getDate() !== originalDay) date.setDate(0)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      if (date.getDate() !== originalDay) date.setDate(0)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      if (date.getDate() !== originalDay) date.setDate(0)
      break
    default:
      date.setMonth(date.getMonth() + 1)
  }
  return date.toISOString().split('T')[0]
}
