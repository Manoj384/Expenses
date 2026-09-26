import { useState, useMemo, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import pastData from '../data/past_expenses.json'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  Search,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function PastExpenses() {
  const { user } = useAuth()
  const [selectedYear, setSelectedYear] = useState('ALL')
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedPayment, setSelectedPayment] = useState('ALL')
  const [search, setSearch] = useState('')

  // Supabase sync states
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [liveDbCount, setLiveDbCount] = useState(null)

  // Check live Supabase records
  const checkLiveDb = useCallback(async () => {
    if (!user) return
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (!error) setLiveDbCount(count ?? 0)
    } catch {}
  }, [user])

  useEffect(() => {
    checkLiveDb()
  }, [checkLiveDb])

  // Import / Sync all Excel data into Supabase live DB
  const handleSyncToSupabase = async () => {
    if (!user) {
      setSyncStatus({ type: 'error', message: 'You must be logged in to sync to Supabase.' })
      return
    }

    setSyncing(true)
    setSyncStatus(null)
    try {
      // 1. Fetch or create all categories for user
      const { data: existingCats } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user.id)

      const catMap = new Map((existingCats || []).map(c => [c.name.toLowerCase(), c.id]))

      // Collect missing categories
      const uniqueCats = new Set(pastData.map(d => d.category))
      const toInsertCats = []
      for (const catName of uniqueCats) {
        if (!catMap.has(catName.toLowerCase())) {
          toInsertCats.push({ user_id: user.id, name: catName, type: 'expense' })
        }
      }

      if (toInsertCats.length > 0) {
        const { data: newCats, error: catErr } = await supabase
          .from('categories')
          .insert(toInsertCats)
          .select('id, name')
        if (!catErr && newCats) {
          newCats.forEach(c => catMap.set(c.name.toLowerCase(), c.id))
        }
      }

      // 2. Fetch or create all payment methods for user
      const { data: existingMethods } = await supabase
        .from('payment_methods')
        .select('id, name')
        .eq('user_id', user.id)

      const payMap = new Map((existingMethods || []).map(m => [m.name.toLowerCase(), m.id]))

      const uniqueMethods = new Set(pastData.map(d => d.payment_method))
      const toInsertMethods = []
      for (const mName of uniqueMethods) {
        if (!payMap.has(mName.toLowerCase())) {
          toInsertMethods.push({ user_id: user.id, name: mName, type: 'online' })
        }
      }

      if (toInsertMethods.length > 0) {
        const { data: newMethods, error: mErr } = await supabase
          .from('payment_methods')
          .insert(toInsertMethods)
          .select('id, name')
        if (!mErr && newMethods) {
          newMethods.forEach(m => payMap.set(m.name.toLowerCase(), m.id))
        }
      }

      // 3. Insert transactions in chunks
      const batchSize = 100
      let insertedCount = 0

      for (let i = 0; i < pastData.length; i += batchSize) {
        const chunk = pastData.slice(i, i + batchSize).map(tx => ({
          user_id: user.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          note: tx.raw_reason || null,
          category_id: catMap.get(tx.category.toLowerCase()) || null,
          payment_method_id: payMap.get(tx.payment_method.toLowerCase()) || null,
        }))

        const { error: txErr } = await supabase.from('transactions').insert(chunk)
        if (txErr) throw txErr
        insertedCount += chunk.length
      }

      setSyncStatus({
        type: 'success',
        message: `Successfully synced all ${insertedCount} historical transactions directly to your live Supabase database!`,
      })
      checkLiveDb()
    } catch (err) {
      setSyncStatus({ type: 'error', message: err?.message || 'Sync failed. Please check connection.' })
    } finally {
      setSyncing(false)
    }
  }

  // Filtered dataset
  const filteredData = useMemo(() => {
    return pastData.filter(item => {
      const itemYear = item.date.slice(0, 4)
      const itemMonth = item.date.slice(5, 7)

      if (selectedYear !== 'ALL' && itemYear !== selectedYear) return false
      if (selectedMonth !== 'ALL' && itemMonth !== selectedMonth) return false
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false
      if (selectedPayment !== 'ALL' && item.payment_method !== selectedPayment) return false

      if (search) {
        const q = search.toLowerCase()
        const matchReason = (item.raw_reason || '').toLowerCase().includes(q)
        const matchCat = item.category.toLowerCase().includes(q)
        const matchPay = item.payment_method.toLowerCase().includes(q)
        const matchAmt = String(item.amount).includes(q)
        if (!matchReason && !matchCat && !matchPay && !matchAmt) return false
      }
      return true
    })
  }, [selectedYear, selectedMonth, selectedCategory, selectedPayment, search])

  // Analytics KPIs
  const totalAmount = useMemo(() => filteredData.reduce((s, d) => s + d.amount, 0), [filteredData])
  const totalCount = filteredData.length
  const avgPerTx = totalCount > 0 ? (totalAmount / totalCount).toFixed(0) : 0

  // Category breakdown
  const categoryChartData = useMemo(() => {
    const map = {}
    filteredData.forEach(d => {
      map[d.category] = (map[d.category] || 0) + d.amount
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredData])

  // Payment method breakdown
  const paymentChartData = useMemo(() => {
    const map = {}
    filteredData.forEach(d => {
      map[d.payment_method] = (map[d.payment_method] || 0) + d.amount
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredData])

  // Yearly comparison bar data
  const yearlyBarData = useMemo(() => {
    const map = { '2024': 0, '2025': 0, '2026': 0 }
    pastData.forEach(d => {
      const y = d.date.slice(0, 4)
      if (map[y] !== undefined) map[y] += d.amount
    })
    return Object.entries(map).map(([year, amount]) => ({ year, amount }))
  }, [])

  // Unique options
  const categoriesList = useMemo(() => Array.from(new Set(pastData.map(d => d.category))).sort(), [])
  const paymentMethodsList = useMemo(() => Array.from(new Set(pastData.map(d => d.payment_method))).sort(), [])

  return (
    <Layout title="Past Expenses Board (2024 - 2026)">
      {/* Live Sync Banner */}
      <div className="card mb-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-none shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-5 w-5 text-blue-300" />
              <h2 className="text-lg font-bold">Historical Excel Data Hub</h2>
              <span className="bg-blue-500/30 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-mono">
                385 Records Loaded
              </span>
            </div>
            <p className="text-xs text-blue-200/90 max-w-xl">
              All records from your <code className="bg-blue-950/50 px-1 py-0.5 rounded text-blue-100">2024</code>, <code className="bg-blue-950/50 px-1 py-0.5 rounded text-blue-100">2025</code>, and <code className="bg-blue-950/50 px-1 py-0.5 rounded text-blue-100">2026</code> Excel sheets are processed. You can explore them here or sync directly into your live Supabase cloud database.
            </p>
            {liveDbCount !== null && (
              <p className="text-xs text-emerald-300 mt-2 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Live Supabase Database has {liveDbCount} total transactions
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToSupabase}
              disabled={syncing}
              className="bg-white hover:bg-blue-50 text-blue-900 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <CloudUpload className="h-4 w-4 text-blue-600" />
              {syncing ? 'Syncing to Supabase...' : 'Sync All into Live Supabase DB'}
            </button>
          </div>
        </div>

        {syncStatus && (
          <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
            syncStatus.type === 'success' ? 'bg-emerald-800/80 text-emerald-100' : 'bg-rose-800/80 text-rose-100'
          }`}>
            {syncStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{syncStatus.message}</span>
          </div>
        )}
      </div>

      {/* KPI Cards for filtered view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtered Spend</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{totalCount} transactions</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average / Transaction</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(avgPerTx)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Average ticket size</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Top Spend Category</p>
          <p className="text-lg font-bold text-purple-700 mt-1 truncate">{categoryChartData[0]?.name || '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(categoryChartData[0]?.value || 0)}</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Top Payment Channel</p>
          <p className="text-lg font-bold text-emerald-700 mt-1 truncate">{paymentChartData[0]?.name || '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(paymentChartData[0]?.value || 0)}</p>
        </div>
      </div>

      {/* Year Selector Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Year:</span>
        {['ALL', '2026', '2025', '2024'].map(yr => (
          <button
            key={yr}
            onClick={() => setSelectedYear(yr)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedYear === yr
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {yr === 'ALL' ? 'All Years (2024–2026)' : yr}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="card p-4 mb-6 bg-gray-50/70 border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Month */}
          <div>
            <label className="label text-xs">Month</label>
            <select
              className="input-field text-xs py-1.5"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="ALL">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="label text-xs">Category</label>
            <select
              className="input-field text-xs py-1.5"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="label text-xs">Payment Method</label>
            <select
              className="input-field text-xs py-1.5"
              value={selectedPayment}
              onChange={e => setSelectedPayment(e.target.value)}
            >
              <option value="ALL">All Payment Methods</option>
              {paymentMethodsList.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="label text-xs">Search Reason / Notes</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input-field text-xs py-1.5 pl-8"
                placeholder="Search Biryani, Petrol, Coffee..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Graphs for Past Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Historical Category Breakdown</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-full sm:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryChartData.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={val => [formatCurrency(val), 'Spent']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 max-h-60 overflow-y-auto space-y-1.5 text-xs pr-1">
              {categoryChartData.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-700 truncate font-medium">{c.name}</span>
                  <span className="font-bold text-gray-900">{formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Yearly Expense Volume Bar Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Total Spending by Year (2024 vs 2025 vs 2026)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={yearlyBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip formatter={val => [formatCurrency(val), 'Total Outflow']} />
              <Bar dataKey="amount" name="Yearly Spend" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Transactions Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Past Expense Records</h3>
            <p className="text-xs text-gray-500">Showing {filteredData.length} records</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Reason / Notes</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-left py-3 px-4">Payment Method</th>
                <th className="text-right py-3 px-4">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-2.5 px-4 text-gray-700 whitespace-nowrap text-xs font-mono">
                    {formatDate(item.date)}
                  </td>
                  <td className="py-2.5 px-4 text-gray-800 font-medium text-xs">
                    {item.raw_reason || '—'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-md text-xs font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                      {item.payment_method}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap text-xs">
                    -{formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
