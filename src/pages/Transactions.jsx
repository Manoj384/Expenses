import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import CategoryManager from '../components/CategoryManager'
import PaymentMethodManager from '../components/PaymentMethodManager'
import AdminLockModal from '../components/AdminLockModal'
import StatementImportModal from '../components/StatementImportModal'
import { Plus, SlidersHorizontal, X, Tag, CreditCard, FileSpreadsheet, Sparkles } from 'lucide-react'

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
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
      let q = supabase
        .from('transactions')
        .select('*, categories(name), payment_methods(id, name, type)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.type) q = q.eq('type', filters.type)
      if (filters.category_id) q = q.eq('category_id', filters.category_id)
      if (filters.payment_method_id) q = q.eq('payment_method_id', filters.payment_method_id)
      if (filters.start_date) q = q.gte('date', filters.start_date)
      if (filters.end_date) q = q.lte('date', filters.end_date)

      const { data, error: fetchErr } = await q
      if (fetchErr) throw fetchErr
      setTransactions(data || [])
    } catch {
      setError('Unable to load transactions. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user, filters])

  useEffect(() => {
    fetchFiltersData()
  }, [fetchFiltersData])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

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

  const handleFilterChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const clearFilters = () =>
    setFilters({ type: '', category_id: '', payment_method_id: '', start_date: '', end_date: '' })

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
            onClick={() => setShowImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
            Statement & SMS Parser
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
          <LoadingSpinner text="Loading transactions..." />
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={setEditTarget}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modals */}
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
    </Layout>
  )
}
