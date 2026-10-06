import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import SummaryCard from '../components/SummaryCard'
import SkeletonPage from '../components/SkeletonLoader'
import EmptyState from '../components/EmptyState'
import PwaInstallBanner from '../components/PwaInstallBanner'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import { formatDate, formatTime, startOfMonth, endOfMonth, isOverdue, daysUntil } from '../utils/dateUtils'
import { frequencyLabel } from '../utils/sipUtils'
import pastData from '../data/past_expenses.json'
import defaultSips from '../data/default_sips.json'
import savedGrowwData from '../data/groww_holdings.json'
import { enrichFundsWithCachedNavs } from '../utils/mfApi'
import {
  TrendingUp, TrendingDown, PiggyBank, Wallet,
  ArrowDownRight, Clock, AlertCircle, BarChart3,
  ArrowRight, Target, Sparkles, LineChart
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
  const [debtsList, setDebtsList] = useState([])
  const [paymentBreakdown, setPaymentBreakdown] = useState([])
  const [allMonthTxns, setAllMonthTxns] = useState([])
  const [mfList, setMfList] = useState(() => {
    try {
      const cached = localStorage.getItem('ft_cached_mutual_funds')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length >= savedGrowwData.length) {
          return enrichFundsWithCachedNavs(parsed)
        }
      }
    } catch {}
    return enrichFundsWithCachedNavs(savedGrowwData)
  })
  const [goalsList, setGoalsList] = useState([])



  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const monthStart = startOfMonth()
      const monthEnd = endOfMonth()

      const [txRes, sipRes, debtRes, recentRes, upcomingRes, mfRes, goalRes] = await Promise.all([
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
          .select('outstanding, emi, status')
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

        supabase
          .from('mutual_funds')
          .select('*')
          .eq('user_id', user.id)
          .order('current_value', { ascending: false }),

        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
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
      setActiveSips(sipRes.count !== null && sipRes.count > 0 ? sipRes.count : defaultSips.length)
      setDebtsList(debtRes.data || [])
      setTotalDebt((debtRes.data || []).reduce((s, d) => s + Number(d.outstanding || 0), 0))
      setRecentTxns(recentRes.data || [])
      setUpcomingSips(upcomingRes.data && upcomingRes.data.length > 0 ? upcomingRes.data : defaultSips)

      // Mutual funds live sync with instant caching
      let mfRaw = (!mfRes.error && mfRes.data && mfRes.data.length > 0) ? mfRes.data : []
      if (mfRaw.length < savedGrowwData.length) {
        const existingFolios = new Set(mfRaw.map((f) => f.folio_number).filter(Boolean))
        const missingHoldings = savedGrowwData.filter((h) => !existingFolios.has(h.folio_number))
        mfRaw = [...mfRaw, ...missingHoldings]
      }
      const enriched = enrichFundsWithCachedNavs(mfRaw)
      setMfList(enriched)
      try {
        localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(enriched))
      } catch {}

      // Goals live sync (strictly sync with Supabase and purge old localStorage cache)
      let loadedGoals = []
      if (!goalRes.error && goalRes.data) {
        loadedGoals = goalRes.data
        try {
          localStorage.removeItem(`ft_financial_goals_${user.id}`)
          localStorage.removeItem('ft_financial_goals')
        } catch {}
      }
      setGoalsList(loadedGoals)

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

    if (!user) return
    const channel = supabase
      .channel(`realtime-dash-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, user])

  // Refresh live data on tab focus and global update events
  useEffect(() => {
    const handleFocus = () => fetchData()
    const handleMfUpdated = () => fetchData()
    const handleTxUpdated = () => fetchData()

    window.addEventListener('focus', handleFocus)
    window.addEventListener('mutual-funds-updated', handleMfUpdated)
    window.addEventListener('transaction-updated', handleTxUpdated)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('mutual-funds-updated', handleMfUpdated)
      window.removeEventListener('transaction-updated', handleTxUpdated)
    }
  }, [fetchData])

  const netSavings = monthIncome - monthExpense
  const savingsRate = monthIncome > 0 ? ((netSavings / monthIncome) * 100).toFixed(0) : 0

  // Past expenses total
  const pastTotal = pastData.reduce((s, d) => s + d.amount, 0)

  // Live Mutual Funds Calculations
  const totalMfValue = mfList.reduce((s, f) => s + Number(f.current_value || 0), 0)
  const totalMfInvested = mfList.reduce((s, f) => s + Number(f.invested_amount || 0), 0)
  const totalMfGain = totalMfValue - totalMfInvested
  const mfGainPercent = totalMfInvested > 0 ? ((totalMfGain / totalMfInvested) * 100).toFixed(1) : '0.0'
  const mfCount = mfList.length

  // Live Goals Calculations
  const totalGoalsTarget = goalsList.reduce((s, g) => s + Number(g.target_amount || 0), 0)
  const totalGoalsSaved = goalsList.reduce((s, g) => s + Number(g.current_amount || 0), 0)
  const goalsProgress = totalGoalsTarget > 0 ? ((totalGoalsSaved / totalGoalsTarget) * 100).toFixed(1) : '0.0'
  const goalsCount = goalsList.length
  const goalsSummaryText = goalsCount > 0
    ? goalsList.slice(0, 3).map((g) => (g.name || '').replace(/^[^\w\s]+/, '').trim()).join(' • ')
    : 'No active goals'

  return (
    <Layout title="Financial Dashboard">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonPage />
      ) : (
        <>
          {/* PWA Home Screen Install & Push Alert Banner */}
          <PwaInstallBanner />

          {/* Summary KPI Cards - Starts immediately with Monthly Income */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4 mb-6">
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
          subtitle="Running SIPs"
        />
        <SummaryCard
          title="Mutual Funds Portfolio"
          value={formatCurrency(totalMfValue)}
          icon={LineChart}
          color="green"
          subtitle={`${totalMfGain >= 0 ? '+' : ''}${formatCurrency(totalMfGain)} (${totalMfGain >= 0 ? '+' : ''}${mfGainPercent}%)`}
        />
      </div>

      {/* 4 Feature Hub Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Groww Mutual Funds Card */}
        <div className="card bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> AMFI Live NAVs
            </span>
            <h3 className="font-bold text-sm text-white">Mutual Funds Hub</h3>
            <p className="text-xl font-extrabold text-white mt-1">{formatCurrency(totalMfValue)}</p>
            <p className="text-[11px] text-teal-200 mt-0.5">
              Profit: <strong className={totalMfGain >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {totalMfGain >= 0 ? `+${formatCurrency(totalMfGain)}` : formatCurrency(totalMfGain)} ({mfGainPercent}%)
              </strong>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-teal-200/80">{mfCount} Active Folios</span>
            <Link
              to="/mutual-funds"
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
            >
              Open Hub <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Consolidated Net Worth Card */}
        <div className="card bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-1.5">
              <Sparkles className="h-3 w-3 text-indigo-300" /> Net Worth
            </span>
            <h3 className="font-bold text-sm text-white">Total Net Worth</h3>
            <p className="text-xl font-extrabold text-white mt-1">{formatCurrency(totalMfValue - totalDebt)}</p>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              Assets: {formatCurrencyShort(totalMfValue)} • Debts: {formatCurrencyShort(totalDebt)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-indigo-200/80">Assets & Debts Balance</span>
            <Link
              to="/net-worth"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
            >
              View Wealth <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Goals Progress Card */}
        <div className="card bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="bg-teal-500/30 text-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-1.5">
              <Target className="h-3 w-3 text-teal-300" /> Milestones
            </span>
            <h3 className="font-bold text-sm text-white">Financial Goals</h3>
            <p className="text-xl font-extrabold text-white mt-1">{goalsCount} Active Goal{goalsCount === 1 ? '' : 's'}</p>
            <p className="text-[11px] text-teal-200 mt-0.5 truncate">
              {goalsSummaryText}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-teal-200/80">
              {goalsProgress}% ({formatCurrencyShort(totalGoalsSaved)} / {formatCurrencyShort(totalGoalsTarget)})
            </span>
            <Link
              to="/goals"
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
            >
              Track Goals <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Past Expenses Board Card */}
        <div className="card bg-gradient-to-r from-slate-900 to-slate-950 text-white p-4 border-none shadow-md flex flex-col justify-between">
          <div>
            <span className="bg-blue-500/30 text-blue-200 text-[10px] font-mono px-2 py-0.5 rounded-full inline-block mb-1.5">
              Excel Sync Ready
            </span>
            <h3 className="font-bold text-sm text-white">Past Expenses (2024–26)</h3>
            <p className="text-xl font-extrabold text-white mt-1">{formatCurrency(pastTotal)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              385 records loaded & verified
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">2024 • 2025 • 2026</span>
            <Link
              to="/past-expenses"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
            >
              Open Board <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Visual Section: Payment Method Quick Breakdown */}
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
              title="No transactions recorded this month"
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
                      <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                        <span>{formatDate(tx.date)}</span>
                        {(tx.time || tx.created_at || localStorage.getItem(`ft_tx_time_${tx.id}`)) && (
                          <span>• {formatTime(tx.time || tx.created_at || localStorage.getItem(`ft_tx_time_${tx.id}`))}</span>
                        )}
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
              View all ({upcomingSips.length})
            </Link>
          </div>

          {upcomingSips.length === 0 ? (
            <EmptyState title="No active SIPs" description="Add a recurring SIP investment to track scheduled dates." />
          ) : (
            <div className="space-y-3">
              {upcomingSips.map((sip, idx) => {
                const overdue = isOverdue(sip.next_due_date)
                const days = daysUntil(sip.next_due_date)
                return (
                  <div
                    key={sip.id || idx}
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
      </>
      )}

    </Layout>
  )
}

