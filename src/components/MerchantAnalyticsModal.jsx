import { useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import {
  ShoppingBag,
  Store,
  TrendingUp,
  CreditCard,
  PieChart as PieIcon,
  Sparkles,
  Info,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#64748b']

export default function MerchantAnalyticsModal({ isOpen, onClose, transactions = [] }) {
  const { topMerchants, totalExpense, pieData } = useMemo(() => {
    const expenseTxs = transactions.filter(t => t.type === 'expense' && parseFloat(t.amount || 0) > 0)
    const total = expenseTxs.reduce((s, t) => s + parseFloat(t.amount || 0), 0)

    const map = {}
    expenseTxs.forEach(t => {
      // Clean merchant name from description
      let name = t.description?.split('(')[0]?.trim() || 'Direct Expense'
      if (!name || name.length < 2) name = 'Other Merchant'

      if (!map[name]) {
        map[name] = { name, total: 0, count: 0, category: t.category_name || 'General' }
      }
      map[name].total += parseFloat(t.amount || 0)
      map[name].count += 1
    })

    const sorted = Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(m => ({
        ...m,
        avg: m.total / m.count,
        pct: total > 0 ? (m.total / total) * 100 : 0
      }))

    const pie = sorted.slice(0, 6).map(m => ({
      name: m.name,
      value: m.total,
    }))

    return { topMerchants: sorted, totalExpense: total, pieData: pie }
  }, [transactions])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Merchant Spend Analytics" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Store className="h-5 w-5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-wide uppercase text-indigo-300">Merchant Intelligence</span>
            </div>
            <h3 className="text-2xl font-black">
              {formatCurrency(totalExpense)} <span className="text-xs font-normal text-indigo-200">Tracked Across All Vendors</span>
            </h3>
            <p className="text-xs text-indigo-200/80 mt-1">
              Identify where your money flows most frequently to negotiate subscriptions or curb impulse purchases.
            </p>
          </div>

          <div className="bg-white/10 px-4 py-2.5 rounded-xl text-xs text-right backdrop-blur-sm border border-white/10">
            <div className="text-indigo-300 font-medium">Top Merchant</div>
            <div className="text-base font-bold text-white truncate max-w-[160px]">
              {topMerchants[0]?.name || 'N/A'}
            </div>
          </div>
        </div>

        {topMerchants.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No expense transactions found to generate merchant analytics.
          </div>
        ) : (
          <>
            {/* Top Vendors Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  Top 5 Merchant Spend (₹)
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMerchants.slice(0, 5)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                  <PieIcon className="h-4 w-4 text-emerald-500" />
                  Vendor Share Distribution
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Merchant Leaderboard List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Top Merchant Leaderboard
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topMerchants.map((m, idx) => (
                  <div
                    key={m.name}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {m.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {m.count} orders • Avg {formatCurrency(m.avg)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-xs text-slate-900 dark:text-white">
                        {formatCurrency(m.total)}
                      </div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        {m.pct.toFixed(1)}% of expenses
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary text-xs px-4 py-2">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
