import { useState, useMemo, useEffect } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import defaultSips from '../data/default_sips.json'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'

export default function CashFlowCalendarModal({ isOpen, onClose, transactions = [], bills = [], sips = [], debts = [] }) {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [activeFilter, setActiveFilter] = useState('all')

  const [liveTxns, setLiveTxns] = useState(transactions)
  const [liveSips, setLiveSips] = useState(sips)
  const [liveDebts, setLiveDebts] = useState(debts)
  const [liveBills, setLiveBills] = useState(bills)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    if (!isOpen || !user) return
    const fetchAll = async () => {
      try {
        const [txRes, sipRes, debtRes] = await Promise.all([
          transactions.length === 0 ? supabase.from('transactions').select('*, categories(name)').eq('user_id', user.id) : Promise.resolve({ data: transactions }),
          sips.length === 0 ? supabase.from('sips').select('*').eq('user_id', user.id) : Promise.resolve({ data: sips }),
          debts.length === 0 ? supabase.from('debts').select('*').eq('user_id', user.id) : Promise.resolve({ data: debts }),
        ])
        if (txRes.data) setLiveTxns(txRes.data)
        if (sipRes.data) setLiveSips(sipRes.data.length > 0 ? sipRes.data : defaultSips)
        if (debtRes.data) setLiveDebts(debtRes.data)
      } catch {}
    }
    fetchAll()
  }, [isOpen, user, transactions, sips, debts])

  const firstDayIndex = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const dailyData = useMemo(() => {
    const map = {}
    for (let d = 1; d <= totalDays; d++) {
      map[d] = { income: 0, expense: 0, items: [], bills: [], sips: [], emis: [] }
    }

    liveTxns.forEach(tx => {
      if (!tx.date) return
      const txDate = new Date(tx.date)
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        const day = txDate.getDate()
        if (map[day]) {
          const amt = parseFloat(tx.amount) || 0
          if (tx.type === 'income') map[day].income += amt
          else map[day].expense += amt
          map[day].items.push(tx)
        }
      }
    })

    liveSips.forEach(s => {
      if (s.active === false || !s.next_due_date) return
      const sDate = new Date(s.next_due_date)
      const day = sDate.getDate()
      if (map[day]) map[day].sips.push(s)
    })

    liveDebts.forEach(d => {
      if (d.status === 'cleared') return
      const dueDay = parseInt(d.due_day)
      if (dueDay && map[dueDay]) map[dueDay].emis.push(d)
    })

    liveBills.forEach(b => {
      const due = parseInt(b.due_day) || 1
      if (map[due]) map[due].bills.push(b)
    })

    return map
  }, [liveTxns, liveSips, liveDebts, liveBills, year, month, totalDays])

  const monthTotals = useMemo(() => {
    let income = 0, expense = 0, sipTotal = 0, emiTotal = 0
    Object.values(dailyData).forEach(d => {
      income += d.income
      expense += d.expense
      d.sips.forEach(s => sipTotal += parseFloat(s.amount || 0))
      d.emis.forEach(e => emiTotal += parseFloat(e.emi || e.outstanding || 0))
    })
    return { income, expense, sipTotal, emiTotal, net: income - expense }
  }, [dailyData])

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(1)
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(1)
  }

  const activeDayData = dailyData[selectedDay] || { income: 0, expense: 0, items: [], bills: [], sips: [], emis: [] }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Financial Dues & Cash Flow Calendar" maxWidth="max-w-4xl">
      <div className="space-y-4 text-xs text-gray-700 dark:text-slate-300">
        {/* Month Navigation & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-gray-100 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white min-w-[130px] text-center">
              {monthName}
            </h3>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-gray-100 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-semibold text-emerald-600">Inflow: +{formatCurrency(monthTotals.income)}</span>
            <span>•</span>
            <span className="font-semibold text-rose-600">Outflow: -{formatCurrency(monthTotals.expense)}</span>
            <span>•</span>
            <span className="font-semibold text-blue-600">SIPs: {formatCurrency(monthTotals.sipTotal)}</span>
            <span>•</span>
            <span className={`font-bold px-2 py-0.5 rounded-md ${monthTotals.net >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
              Net: {monthTotals.net >= 0 ? '+' : ''}{formatCurrency(monthTotals.net)}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="h-3.5 w-3.5 text-gray-400 mr-1" />
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'sips', label: '💎 SIP Investments' },
            { id: 'emis', label: '🏦 Loan EMIs & Dues' },
            { id: 'income', label: '🟢 Inflows' },
            { id: 'expense', label: '🔴 Outflows' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-3 shadow-xs">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-gray-400 pb-2 border-b border-gray-100 dark:border-slate-800">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 pt-2">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-16 rounded-xl bg-gray-50/40 dark:bg-slate-800/20" />
            ))}

            {/* Day Cells */}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const day = idx + 1
              const data = dailyData[day] || { income: 0, expense: 0, items: [], bills: [] }
              const isSelected = selectedDay === day
              const hasActivity = data.income > 0 || data.expense > 0 || data.sips.length > 0 || data.emis.length > 0 || data.bills.length > 0

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-16 p-1 rounded-xl flex flex-col justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-600 shadow-xs'
                      : hasActivity
                      ? 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-400'
                      : 'bg-gray-50/60 dark:bg-slate-800/30 border border-transparent hover:bg-gray-100'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300'}`}>
                    {day}
                  </span>

                  <div className="space-y-0.5 overflow-hidden">
                    {(activeFilter === 'all' || activeFilter === 'income') && data.income > 0 && (
                      <span className="block text-[8px] font-bold text-emerald-600 truncate">+{formatCurrency(data.income)}</span>
                    )}
                    {(activeFilter === 'all' || activeFilter === 'expense') && data.expense > 0 && (
                      <span className="block text-[8px] font-bold text-rose-600 truncate">-{formatCurrency(data.expense)}</span>
                    )}
                    {(activeFilter === 'all' || activeFilter === 'sips') && data.sips.length > 0 && (
                      <span className="block text-[8px] font-bold text-blue-600 truncate">💎 {data.sips.length} SIP</span>
                    )}
                    {(activeFilter === 'all' || activeFilter === 'emis') && data.emis.length > 0 && (
                      <span className="block text-[8px] font-bold text-amber-600 truncate">🏦 {data.emis.length} EMI</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                Activity on {new Date(year, month, selectedDay).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h4>
            </div>
            <div className="flex gap-2 text-xs font-bold">
              {activeDayData.income > 0 && <span className="text-emerald-600">+{formatCurrency(activeDayData.income)}</span>}
              {activeDayData.expense > 0 && <span className="text-rose-600">-{formatCurrency(activeDayData.expense)}</span>}
            </div>
          </div>

          {activeDayData.items.length === 0 && activeDayData.sips.length === 0 && activeDayData.emis.length === 0 && activeDayData.bills.length === 0 ? (
            <p className="text-xs text-gray-400 py-2.5 text-center">No transactions, SIPs, or scheduled EMIs on this day.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
              {activeDayData.sips.map((s, idx) => (
                <div key={`sip-${idx}`} className="pt-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-bold">💎 SIP Scheduled</span>
                    <strong className="text-gray-900 dark:text-white">{s.name}</strong>
                  </div>
                  <strong className="text-blue-600">{formatCurrency(s.amount)}</strong>
                </div>
              ))}

              {activeDayData.emis.map((e, idx) => (
                <div key={`emi-${idx}`} className="pt-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold">🏦 EMI Due</span>
                    <strong className="text-gray-900 dark:text-white">{e.name}</strong>
                  </div>
                  <strong className="text-rose-600">{formatCurrency(e.emi || e.outstanding)}</strong>
                </div>
              ))}

              {activeDayData.items.map(tx => (
                <div key={tx.id} className="pt-1.5 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-gray-900 dark:text-white block">{tx.note || tx.categories?.name || 'Transaction'}</strong>
                    <span className="text-[10px] text-gray-400">{tx.categories?.name || 'General'}</span>
                  </div>
                  <strong className={tx.type === 'income' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
