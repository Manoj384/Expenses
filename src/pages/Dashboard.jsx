import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import SummaryCard from '../components/SummaryCard'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, startOfMonth, endOfMonth, isOverdue, daysUntil } from '../utils/dateUtils'
import { frequencyLabel } from '../utils/sipUtils'
import {
  TrendingUp, TrendingDown, PiggyBank, Wallet, CreditCard,
  ArrowDownRight, Clock, AlertCircle, ArrowUpRight, BarChart3,
  Smartphone, Banknote
} from 'lucide-react'

const TYPE_STYLES = {
  income:  'bg-emerald-100 text-emerald-800',
  expense: 'bg-rose-100 text-rose-800',
  debit:   'bg-amber-100 text-amber-800',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpense, setMonthExpense] = useState(0)
  const [activeSips, setActiveSips] = useState(0)
  const [totalDebt, setTotalDebt] = useState(0)
  const [recentTxns, setRecentTxns] = useState([])
  const [upcomingSips, setUpcomingSips] = useState([])
  const [paymentBreakdown, setPaymentBreakdown] = useState([])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const monthStart = startOfMonth()
      const monthEnd = endOfMonth()

      const [txRes, sipRes, debtRes, recentRes, upcomingRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('type, amount, payment_methods(name)')
          .eq('user_id', user.id)
          .gte('date', monthStart)
          .lte('date', monthEnd),

        supabase
          .from('sips')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('active', true),

        supabase
          .from('debts')
          .select('outstanding')
          .eq('user_id', user.id),

        supabase
          .from('transactions')
          .select('*, categories(name), payment_methods(name, type)')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(8),

        supabase
          .from('sips')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('next_due_date')
          .limit(5),
      ])

      if (txRes.error) throw txRes.error

      let income = 0
      let expense = 0
      const payMap = {}

      for (const tx of txRes.data || []) {
        const amt = Number(tx.amount)
        if (tx.type === 'income') {
          income += amt
        } else {
          expense += amt
          const pName = tx.payment_methods?.name || 'Cash / Direct'
          payMap[pName] = (payMap[pName] || 0) + amt
        }
      }

      setMonthIncome(income)
      setMonthExpense(expense)
      setActiveSips(sipRes.count || 0)
      setTotalDebt((debtRes.data || []).reduce((s, d) => s + Number(d.outstanding), 0))
      setRecentTxns(recentRes.data || [])
      setUpcomingSips(upcomingRes.data || [])

      const payArr = Object.entries(payMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
      setPaymentBreakdown(payArr)
    } catch {
      setError('Unable to load dashboard data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const netSavings = monthIncome - monthExpense
  const savingsRate = monthIncome > 0 ? ((netSavings / monthIncome) * 100).toFixed(0) : 0

  if (loading) {
    return (
      <Layout title="Dashboard">
        <LoadingSpinner text="Loading financial overview..." />
      </Layout>
    )
  }

  return (
    <Layout title="Financial Dashboard">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6" role="alert">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4 mb-8">
        <SummaryCard
          title="Monthly Income"
          value={formatCurrency(monthIncome)}
          icon={TrendingUp}
          color="green"
          subtitle="Current month"
        />
        <SummaryCard
          title="Total Outflow"
          value={formatCurrency(monthExpense)}
          icon={TrendingDown}
          color="red"
          subtitle="Expenses & Debits"
        />
        <SummaryCard
          title="Net Savings"
          value={formatCurrency(netSavings)}
          icon={netSavings >= 0 ? PiggyBank : ArrowDownRight}
          color={netSavings >= 0 ? 'blue' : 'red'}
          subtitle={`Savings Rate: ${savingsRate}%`}
        />
        <SummaryCard
          title="Active SIPs"
          value={activeSips}
          icon={Wallet}
          color="purple"
          subtitle="Active investments"
        />
        <SummaryCard
          title="Total Debt Balance"
          value={formatCurrency(totalDebt)}
          icon={CreditCard}
          color="yellow"
          subtitle="Outstanding sum"
        />
      </div>

      {/* Quick Visual Section: Payment Method Quick Breakdown + Quick Actions */}
      {paymentBreakdown.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Monthly Spend by Payment Method</h2>
            <Link to="/reports" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
              <BarChart3 className="h-3.5 w-3.5" /> Full Visuals
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {paymentBreakdown.map((pm, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium truncate">{pm.name}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency(pm.amount)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {monthExpense > 0 ? ((pm.amount / monthExpense) * 100).toFixed(0) : 0}% of spend
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Recent Transactions & Upcoming SIPs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-blue-600 hover:underline font-medium">
              View all
            </Link>
          </div>

          {recentTxns.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Record your first income or expense to populate this dashboard."
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTxns.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${TYPE_STYLES[tx.type] || 'bg-gray-100 text-gray-700'}`}>
                      {tx.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">
                        {tx.categories?.name || tx.note || 'Uncategorized'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{formatDate(tx.date)}</span>
                        {tx.payment_methods?.name && (
                          <span>• {tx.payment_methods.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className={`font-bold text-sm flex-shrink-0 ml-2 ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming SIPs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm">Upcoming SIP Schedules</h2>
            <Link to="/sips" className="text-xs text-blue-600 hover:underline font-medium">
              View all
            </Link>
          </div>

          {upcomingSips.length === 0 ? (
            <EmptyState title="No active SIPs" description="Add a recurring SIP investment to track scheduled dates." />
          ) : (
            <div className="space-y-3">
              {upcomingSips.map((sip) => {
                const overdue = isOverdue(sip.next_due_date)
                const days = daysUntil(sip.next_due_date)
                return (
                  <div
                    key={sip.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border ${
                      overdue ? 'border-red-200 bg-red-50/70' : 'border-gray-100 bg-gray-50/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{sip.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {overdue ? (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                        )}
                        <p className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {formatDate(sip.next_due_date)}
                          {days !== null && ` · ${overdue ? Math.abs(days) + ' days overdue' : days === 0 ? 'Due Today' : `in ${days}d`}`}
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{frequencyLabel(sip.frequency)}</p>
                    </div>
                    <p className="font-bold text-gray-900 flex-shrink-0 ml-3">{formatCurrency(sip.amount)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
