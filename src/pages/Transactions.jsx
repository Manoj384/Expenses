import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/SkeletonLoader'
import CategoryManager from '../components/CategoryManager'
import PaymentMethodManager from '../components/PaymentMethodManager'
import AdminLockModal from '../components/AdminLockModal'
import StatementImportModal from '../components/StatementImportModal'
import SmsUpiParserModal from '../components/SmsUpiParserModal'
import MerchantAnalyticsModal from '../components/MerchantAnalyticsModal'
import AuditLogModal from '../components/AuditLogModal'
import { retryFetch } from '../utils/retryFetch'
import {
  Plus,
  SlidersHorizontal,
  X,
  Tag,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
  Store,
  ShieldCheck,
} from 'lucide-react'

const PAGE_SIZE = 25

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [showAdd, setShowAdd] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [showMerchantModal, setShowMerchantModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [showCat, setShowCat] = useState(false)
  const [showMethods, setShowMethods] = useState(false)
  const [showAdminLock, setShowAdminLock] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    payment_method_id: '',
    start_date: '',
    end_date: '',
  })

  const fetchFiltersData = useCallback(async () => {
    if (!user) return
    const [catsRes, pmRes] = await Promise.all([
      supabase.from('categories').select('id, name, type').eq('user_id', user.id).order('name'),
      supabase.from('payment_methods').select('id, name, type').eq('user_id', user.id).order('name'),
    ])
    setCategories(catsRes.data || [])
    setPaymentMethods(pmRes.data || [])
  }, [user])

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let q = supabase
        .from('transactions')
        .select('*, categories(name), payment_methods(id, name, type)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.type) q = q.eq('type', filters.type)
      if (filters.category_id) q = q.eq('category_id', filters.category_id)
      if (filters.payment_method_id) q = q.eq('payment_method_id', filters.payment_method_id)
      if (filters.start_date) q = q.gte('date', filters.start_date)
      if (filters.end_date) q = q.lte('date', filters.end_date)

      const { data, error: fetchErr, count } = await retryFetch(() => q)
      if (fetchErr) throw fetchErr
      setTransactions(data || [])
      setTotalCount(count || 0)
    } catch {
      setError('Unable to load transactions. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, filters, page])

  useEffect(() => {
    fetchFiltersData()
  }, [fetchFiltersData])

  useEffect(() => {
    fetchTransactions()

    if (!user) return
    const channel = supabase
      .channel(`realtime-tx-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => {
          fetchTransactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTransactions, user])

  const handleDelete = async (id) => {
    try {
      const { error: delErr } = await supabase.from('transactions').delete().eq('id', id)
      if (delErr) throw delErr
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('Unable to delete transaction. Please try again.')
    }
  }

  const handleFormSuccess = () => {
    setShowAdd(false)
    setEditTarget(null)
    fetchTransactions()
  }

  const handleFilterChange = (e) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const clearFilters = () => {
    setPage(1)
    setFilters({ type: '', category_id: '', payment_method_id: '', start_date: '', end_date: '' })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  const handleBatchImport = async (rows = []) => {
    if (!user || rows.length === 0) return
    try {
      const toInsert = []
      for (const r of rows) {
        // Match category ID
        const matchedCat = categories.find(c => c.name.toLowerCase() === (r.suggested_category || '').toLowerCase())
        toInsert.push({
          user_id: user.id,
          type: r.type || 'expense',
          amount: parseFloat(r.amount),
          note: r.description || null,
          category_id: matchedCat?.id || null,
          payment_method_id: paymentMethods[0]?.id || null,
          date: r.date || new Date().toISOString().slice(0, 10),
        })
      }

      const { error: insErr } = await supabase.from('transactions').insert(toInsert)
      if (insErr) throw insErr
      setSuccess(`Imported ${toInsert.length} transactions from statement!`)
      setTimeout(() => setSuccess(''), 4000)
      fetchTransactions()
    } catch (err) {
      setError('Statement import failed. Please try again.')
    }
  }

  return (
    <Layout title="Transactions">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg mb-4" role="status">
          {success}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Transaction
          </button>
          <button
            onClick={() => setShowSmsModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="Import Bank SMS & UPI payment alerts automatically"
          >
            <Smartphone className="h-3.5 w-3.5 text-indigo-200" />
            SMS / UPI Import
          </button>
          <button
            onClick={() => setShowMerchantModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="Inspect top vendors, order frequency and average spend"
          >
            <Store className="h-3.5 w-3.5 text-purple-200" />
            Merchants
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
            CSV / Statement
          </button>
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`btn-secondary flex items-center gap-2 ${hasFilters ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {hasFilters && <span className="bg-blue-600 text-white rounded-full text-xs px-1.5 py-0.5">ON</span>}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAuditModal(true)}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2"
            title="Security audit trail & API webhooks"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Audit & Hooks
          </button>
          <button onClick={() => setShowCat(true)} className="btn-secondary flex items-center gap-1.5 text-xs py-2">
            <Tag className="h-4 w-4 text-gray-500" /> Categories
          </button>
          <button onClick={() => setShowMethods(true)} className="btn-secondary flex items-center gap-1.5 text-xs py-2">
            <CreditCard className="h-4 w-4 text-gray-500" /> Payment Methods
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card mb-4 bg-gray-50/70 border-gray-200">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="label text-xs">Type</label>
              <select name="type" className="input-field text-sm py-1.5" value={filters.type} onChange={handleFilterChange}>
                <option value="">All Types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="debit">Debit</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Category</label>
              <select name="category_id" className="input-field text-sm py-1.5" value={filters.category_id} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Payment Method</label>
              <select
                name="payment_method_id"
                className="input-field text-sm py-1.5"
                value={filters.payment_method_id}
                onChange={handleFilterChange}
              >
                <option value="">All Methods</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">From Date</label>
              <input type="date" name="start_date" className="input-field text-sm py-1.5" value={filters.start_date} onChange={handleFilterChange} />
            </div>
            <div>
              <label className="label text-xs">To Date</label>
              <input type="date" name="end_date" className="input-field text-sm py-1.5" value={filters.end_date} onChange={handleFilterChange} />
            </div>
            {hasFilters && (
              <div className="flex items-end">
                <button onClick={clearFilters} className="btn-secondary text-sm flex items-center gap-1 py-1.5 text-gray-700">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="card">
        {loading ? (
          <SkeletonTable rows={8} />
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={setEditTarget}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1 py-2">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} transactions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Page {page} of {Math.ceil(totalCount / PAGE_SIZE)}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
              disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}


      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction">
        <TransactionForm onSuccess={handleFormSuccess} onCancel={() => setShowAdd(false)} />
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Transaction">
        {editTarget && (
          <TransactionForm
            editData={editTarget}
            onSuccess={handleFormSuccess}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Categories Manager Modal */}
      <Modal
        isOpen={showCat}
        onClose={() => {
          setShowCat(false)
          fetchFiltersData()
        }}
        title="Manage Categories"
        maxWidth="max-w-xl"
      >
        <CategoryManager onAdminRequest={() => setShowAdminLock(true)} />
      </Modal>

      {/* Payment Methods Manager Modal */}
      <Modal
        isOpen={showMethods}
        onClose={() => {
          setShowMethods(false)
          fetchFiltersData()
        }}
        title="Manage Payment Methods"
        maxWidth="max-w-xl"
      >
        <PaymentMethodManager onAdminRequest={() => setShowAdminLock(true)} />
      </Modal>

      {/* Admin Lock Modal */}
      <AdminLockModal
        isOpen={showAdminLock}
        onClose={() => setShowAdminLock(false)}
      />

      {/* Smart Statement & SMS Import Modal */}
      <StatementImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleBatchImport}
        categories={categories}
        paymentMethods={paymentMethods}
      />

      {/* Smart SMS & UPI Parser Modal */}
      <SmsUpiParserModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        onTransactionsImported={() => {
          fetchTransactions()
          setSuccess('Bank SMS & UPI transactions successfully imported!')
          setTimeout(() => setSuccess(''), 4000)
        }}
      />

      {/* Merchant Analytics Modal */}
      <MerchantAnalyticsModal
        isOpen={showMerchantModal}
        onClose={() => setShowMerchantModal(false)}
        transactions={transactions}
      />

      {/* Audit Log & Webhook Modal */}
      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        transactions={transactions}
      />
    </Layout>
  )
}
