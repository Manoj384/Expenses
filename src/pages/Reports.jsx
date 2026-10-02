import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  IncomeExpenseBarChart,
  ExpensePieChart,
  PaymentMethodPieChart,
  DailySpendingAreaChart,
  YearOverYearBarChart,
} from '../components/Charts'
import { lastNMonths, monthLabel } from '../utils/dateUtils'
import { formatCurrency } from '../utils/formatCurrency'
import ShareableMonthlyReportModal from '../components/ShareableMonthlyReportModal'
import { TrendingUp, TrendingDown, PiggyBank, Tag, Printer, Download, FileSpreadsheet, Share2, Sparkles, Calculator } from 'lucide-react'


const PERIOD_OPTIONS = [3, 6, 12]

export default function Reports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState(6)
  const [showShareModal, setShowShareModal] = useState(false)


  const [barData, setBarData] = useState([])
  const [yoyData, setYoyData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [paymentData, setPaymentData] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    topCategory: '—',
    topMethod: '—',
  })

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const months = lastNMonths(period)
      const startDate = `${months[0].year}-${String(months[0].month).padStart(2, '0')}-01`
      const lastM = months[months.length - 1]
      const lastDay = new Date(lastM.year, lastM.month, 0).getDate()
      const endDate = `${lastM.year}-${String(lastM.month).padStart(2, '0')}-${lastDay}`

      const priorStartDate = `${months[0].year - 1}-${String(months[0].month).padStart(2, '0')}-01`
      const priorEndDate = `${lastM.year - 1}-${String(lastM.month).padStart(2, '0')}-${lastDay}`

      const [{ data: txns, error: txErr }, { data: priorTxns }] = await Promise.all([
        supabase
          .from('transactions')
          .select('type, amount, date, categories(name), payment_methods(name)')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true }),
        supabase
          .from('transactions')
          .select('type, amount, date')
          .eq('user_id', user.id)
          .gte('date', priorStartDate)
          .lte('date', priorEndDate)
      ])

      if (txErr) throw txErr

      // 1. Monthly Bar Chart Data
      const monthMap = {}
      months.forEach((m) => {
        const key = `${m.year}-${String(m.month).padStart(2, '0')}`
        monthMap[key] = { month: monthLabel(m.year, m.month), income: 0, expense: 0 }
      })

      let totalIncome = 0
      let totalExpense = 0
      const catMap = {}
      const payMap = {}
      const dayMap = {}

      for (const tx of txns || []) {
        const amount = Number(tx.amount)
        const mKey = tx.date.slice(0, 7)

        if (tx.type === 'income') {
          totalIncome += amount
          if (monthMap[mKey]) monthMap[mKey].income += amount
        } else {
          // expense or debit
          totalExpense += amount
          if (monthMap[mKey]) monthMap[mKey].expense += amount

          // Category distribution
          const catName = tx.categories?.name || 'Uncategorized'
          catMap[catName] = (catMap[catName] || 0) + amount

          // Payment method distribution
          const payName = tx.payment_methods?.name || 'Unspecified'
          payMap[payName] = (payMap[payName] || 0) + amount

          // Daily trend (last 30 days of data in range)
          dayMap[tx.date] = (dayMap[tx.date] || 0) + amount
        }
      }

      setBarData(Object.values(monthMap))

      // Year-over-Year (YoY) comparison data
      const yoyArr = months.map((m) => {
        const curKey = `${m.year}-${String(m.month).padStart(2, '0')}`
        const priorKey = `${m.year - 1}-${String(m.month).padStart(2, '0')}`
        const thisYearExp = monthMap[curKey]?.expense || 0
        const lastYearExp = (priorTxns || [])
          .filter((t) => t.date.startsWith(priorKey) && t.type !== 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0)

        return {
          month: monthLabel(m.year, m.month),
          thisYear: thisYearExp,
          lastYear: lastYearExp,
        }
      })
      setYoyData(yoyArr)

      // Category breakdown list
      const catArr = Object.entries(catMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
      setCategoryData(catArr)

      // Payment method breakdown list
      const payArr = Object.entries(payMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
      setPaymentData(payArr)

      // Daily area chart
      const dailyArr = Object.entries(dayMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, expense]) => ({
          date: date.slice(5), // MM-DD
          expense,
        }))
      setDailyData(dailyArr)

      const netSavings = totalIncome - totalExpense
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0

      setSummary({
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        topCategory: catArr[0]?.name || '—',
        topMethod: payArr[0]?.name || '—',
      })
    } catch {
      setError('Unable to load analytical report data.')
    } finally {
      setLoading(false)
    }
  }, [user, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExportCsv = () => {
    let csv = 'Month,Inflow (Income),Outflow (Expense),Net Savings\n'
    barData.forEach((row) => {
      csv += `"${row.month}",${row.income},${row.expense},${row.income - row.expense}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Financial_Report_${period}_Months.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrintReport = () => {
    window.print()
  }

  return (
    <Layout title="Analytics & Visual Reports">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Period selector & Export Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Reporting Range:</span>
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
              }`}
            >
              Last {p} Months
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-tax-planner'))}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            title="Calculate Old vs New Regime Tax (FY 2026-27)"
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Tax Planner</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            title="Generate Executive Monthly Wealth Summary Card"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Executive Report & PDF</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Download CSV statement of monthly totals"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Print or save as PDF"
          >
            <Printer className="h-3.5 w-3.5 text-blue-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>


      {loading ? (
        <LoadingSpinner text="Crunching financial graphs..." />
      ) : (
        <div className="space-y-6">
          {/* Key KPI summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-medium uppercase">Total Inflow</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalIncome)}</p>
              <p className="text-xs text-gray-400 mt-1">Over {period} months</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-medium uppercase">Total Outflow</span>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </div>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(summary.totalExpense)}</p>
              <p className="text-xs text-gray-400 mt-1">Expenses + Debits</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-medium uppercase">Net Savings</span>
                <PiggyBank className="h-4 w-4 text-blue-500" />
              </div>
              <p className={`text-2xl font-bold ${summary.netSavings >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                {formatCurrency(summary.netSavings)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Savings Rate: {summary.savingsRate}%</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-medium uppercase">Top Spend Driver</span>
                <Tag className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-lg font-bold text-gray-900 truncate">{summary.topCategory}</p>
              <p className="text-xs text-gray-400 mt-1">Top Method: {summary.topMethod}</p>
            </div>
          </div>

          {/* Monthly Comparison Bar Chart */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Monthly Inflow vs Outflow Comparison</h3>
            <IncomeExpenseBarChart data={barData} />
          </div>

          {/* Year-over-Year Outflow Comparison Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Year-over-Year (YoY) Expense Comparison</h3>
                <p className="text-xs text-gray-400 mt-0.5">Benchmark current spending against the exact same months of the previous year</p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                YoY Trend
              </span>
            </div>
            <YearOverYearBarChart data={yoyData} />
          </div>

          {/* Daily spending graph */}
          {dailyData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Daily Outflow Velocity & Trend</h3>
              <DailySpendingAreaChart data={dailyData} />
            </div>
          )}

          {/* 2-Column Grid: Category Breakdown vs Payment Method Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Expense Breakdown by Category</h3>
              <ExpensePieChart data={categoryData} />
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Expenses by Payment Method</h3>
              <PaymentMethodPieChart data={paymentData} />
            </div>
          </div>
        </div>
      )}

      {/* Shareable Executive Monthly Report Modal */}
      <ShareableMonthlyReportModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        month={new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        income={summary.totalIncome / (period || 1)}
        expense={summary.totalExpense / (period || 1)}
        debtsTotal={0}
      />
    </Layout>
  )
}

