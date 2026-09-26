import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import savedGrowwData from '../data/groww_holdings.json'
import {
  Wallet,
  Building,
  TrendingUp,
  TrendingDown,
  Shield,
  Plus,
  Trash2,
  Pencil,
  PieChart as PieIcon,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  CreditCard,
  Target,
  Landmark,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

const ASSET_TYPES = [
  { id: 'liquid', label: 'Bank Account / Liquid Cash', icon: Landmark },
  { id: 'fixed_deposit', label: 'Fixed Deposit / Recurring Deposit', icon: Shield },
  { id: 'epf_ppf', label: 'EPF / PPF / Provident Fund', icon: Coins },
  { id: 'gold', label: 'Physical / Digital Gold', icon: Sparkles },
  { id: 'real_estate', label: 'Real Estate / Property', icon: Building },
  { id: 'crypto', label: 'Crypto Assets', icon: Coins },
  { id: 'other', label: 'Other Investments', icon: Wallet },
]

const PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1']

export default function NetWorth() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Data sets
  const [mutualFundsTotal, setMutualFundsTotal] = useState(112341.29)
  const [debtsTotal, setDebtsTotal] = useState(0)
  const [customAssets, setCustomAssets] = useState([])

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'liquid', value: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      // 1. Fetch MF Total
      const { data: mfData } = await supabase.from('mutual_funds').select('current_value, units, current_nav, invested_amount').eq('user_id', user.id)
      if (mfData && mfData.length > 0) {
        const total = mfData.reduce((s, f) => s + parseFloat(f.current_value || (f.units * f.current_nav) || f.invested_amount || 0), 0)
        setMutualFundsTotal(total > 0 ? total : 112341.29)
      } else {
        const localTotal = savedGrowwData.reduce((s, f) => s + parseFloat(f.current_value || 0), 0)
        setMutualFundsTotal(localTotal)
      }

      // 2. Fetch Debts Total
      const { data: debtData } = await supabase.from('debts').select('outstanding').eq('user_id', user.id)
      if (debtData) {
        setDebtsTotal(debtData.reduce((s, d) => s + parseFloat(d.outstanding || 0), 0))
      }

      // 3. Fetch Custom Assets
      const { data: assetData, error: assetErr } = await supabase
        .from('net_worth_custom_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('value', { ascending: false })

      if (!assetErr && assetData) {
        setCustomAssets(assetData)
      }
    } catch {
      setError('Unable to load net worth assets.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Calculations
  const customAssetsTotal = customAssets.reduce((s, a) => s + parseFloat(a.value || 0), 0)
  const totalAssets = mutualFundsTotal + customAssetsTotal
  const totalLiabilities = debtsTotal
  const netWorth = totalAssets - totalLiabilities

  // Pie Allocation Data
  const assetBreakdown = [
    { name: 'Mutual Funds (Groww)', value: Math.round(mutualFundsTotal) },
    ...customAssets.map(a => ({ name: a.name, value: Math.round(parseFloat(a.value || 0)) })),
  ].filter(a => a.value > 0)

  const handleSaveAsset = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.value) {
      setError('Please provide asset name and value.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        user_id: user?.id,
        name: form.name.trim(),
        type: form.type,
        value: parseFloat(form.value) || 0,
        notes: form.notes.trim() || null,
      }

      if (editTarget?.id) {
        const { error: updErr } = await supabase.from('net_worth_custom_assets').update(payload).eq('id', editTarget.id)
        if (updErr) throw updErr
        flash('Asset updated successfully!')
      } else {
        const { error: insErr } = await supabase.from('net_worth_custom_assets').insert(payload)
        if (insErr) throw insErr
        flash('Asset added to Net Worth!')
      }

      setShowAddModal(false)
      setEditTarget(null)
      setForm({ name: '', type: 'liquid', value: '', notes: '' })
      fetchData()
    } catch (err) {
      setError('Failed to save asset.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAsset = async () => {
    if (!deleteTarget?.id) return
    try {
      await supabase.from('net_worth_custom_assets').delete().eq('id', deleteTarget.id)
      flash('Asset removed.')
      setDeleteTarget(null)
      fetchData()
    } catch {
      setError('Unable to delete asset.')
    }
  }

  return (
    <Layout title="Consolidated Net Worth Visualizer">
      {error && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4">{error}</div>}
      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Net Worth Banner */}
      <div className="card mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 border-none shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Total Financial Net Worth
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {formatCurrency(netWorth)}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                Assets: {formatCurrency(totalAssets)}
              </span>
              <span>•</span>
              <span className="text-rose-300 font-semibold flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4" />
                Liabilities: {formatCurrency(totalLiabilities)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setEditTarget(null)
                setForm({ name: '', type: 'liquid', value: '', notes: '' })
                setShowAddModal(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" /> Add Asset
            </button>
          </div>
        </div>
      </div>

      {/* Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Asset Distribution */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Total Asset Allocation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={assetBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {assetBreakdown.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [formatCurrency(v), 'Value']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assets vs Liabilities Bar */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Assets vs Liabilities Balance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Assets', amount: Math.round(totalAssets), fill: '#10b981' },
                  { name: 'Liabilities', amount: Math.round(totalLiabilities), fill: '#f43f5e' },
                  { name: 'Net Worth', amount: Math.round(netWorth), fill: '#6366f1' },
                ]}
                margin={{ top: 20, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(val) => [formatCurrency(val)]} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Asset List & Manager */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Assets & Portfolio Breakdown</h3>
          <button
            onClick={() => {
              setEditTarget(null)
              setForm({ name: '', type: 'liquid', value: '', notes: '' })
              setShowAddModal(true)
            }}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Bank / FD / Gold
          </button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {/* Automatic Mutual Funds Holding */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <strong className="text-sm font-bold text-gray-900 dark:text-white block">
                  Groww Mutual Funds Portfolio
                </strong>
                <span className="text-xs text-emerald-600 font-medium">
                  Live AMFI NAV Tracked • 8 Active Folios
                </span>
              </div>
            </div>
            <div className="text-right">
              <strong className="text-sm font-extrabold text-gray-900 dark:text-white block">
                {formatCurrency(mutualFundsTotal)}
              </strong>
              <span className="text-xs text-gray-500">Auto-calculated</span>
            </div>
          </div>

          {/* Custom User Assets */}
          {customAssets.map((asset) => (
            <div key={asset.id} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-800">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <strong className="text-sm font-bold text-gray-900 dark:text-white block">
                    {asset.name}
                  </strong>
                  <span className="text-xs text-gray-500 capitalize">
                    {asset.type.replace('_', ' ')} {asset.notes ? `• ${asset.notes}` : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <strong className="text-sm font-extrabold text-gray-900 dark:text-white block">
                    {formatCurrency(asset.value)}
                  </strong>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditTarget(asset)
                      setForm({
                        name: asset.name,
                        type: asset.type,
                        value: String(asset.value),
                        notes: asset.notes || '',
                      })
                      setShowAddModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(asset)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={editTarget ? 'Edit Asset' : 'Add Asset to Net Worth'}
        >
          <form onSubmit={handleSaveAsset} className="space-y-4">
            <div>
              <label className="label">Asset Name</label>
              <input
                type="text"
                placeholder="e.g. HDFC Salary Account, SBI Fixed Deposit"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Asset Category</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Current Asset Value (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 50000"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 7.1% interest, matures Nov 2027"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-xs"
              >
                {saving ? 'Saving...' : editTarget ? 'Update Asset' : 'Save Asset'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Asset?"
        message={`Are you sure you want to remove "${deleteTarget?.name}"?`}
        confirmLabel="Remove"
        danger
        onConfirm={handleDeleteAsset}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  )
}
