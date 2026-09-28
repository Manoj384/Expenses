import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Receipt,
  Plus,
} from 'lucide-react'

export default function CashFlowCalendarModal({ isOpen, onClose, transactions = [], bills = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of month & total days
  const firstDayIndex = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Map transactions by day
  const dailyData = useMemo(() => {
    const map = {}
    for (let d = 1; d <= totalDays; d++) {
      map[d] = { income: 0, expense: 0, items: [], bills: [] }
    }

    transactions.forEach(tx => {
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

    // Map recurring bills by due day
    bills.forEach(b => {
      const due = parseInt(b.due_day) || 1
      if (map[due]) {
        map[due].bills.push(b)
      }
    })

    return map
  }, [transactions, bills, year, month, totalDays])

  // Total Month Flow
  const monthTotals = useMemo(() => {
    let income = 0
    let expense = 0
    Object.values(dailyData).forEach(d => {
      income += d.income
      expense += d.expense
    })
    return { income, expense, net: income - expense }
  }, [dailyData])

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(1)
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(1)
  }

  const activeDayData = dailyData[selectedDay] || { income: 0, expense: 0, items: [], bills: [] }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cash Flow Calendar & Daily Activity" maxWidth="max-w-4xl">
      <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
        {/* Month Navigation & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-gray-100 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white min-w-[140px] text-center">
              {monthName}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-gray-100 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Inflow: +{formatCurrency(monthTotals.income)}
            </span>
            <span>•</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              Outflow: -{formatCurrency(monthTotals.expense)}
            </span>
            <span>•</span>
            <span className={`font-bold px-2 py-0.5 rounded-md ${
              monthTotals.net >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              Net: {monthTotals.net >= 0 ? '+' : ''}{formatCurrency(monthTotals.net)}
            </span>
          </div>
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
              const hasActivity = data.income > 0 || data.expense > 0 || data.bills.length > 0

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-16 p-1 rounded-xl flex flex-col justify-between text-left transition-all relative ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-600 shadow-xs'
                      : hasActivity
                      ? 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-400'
                      : 'bg-gray-50/60 dark:bg-slate-800/30 border border-transparent hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300'}`}>
                    {day}
                  </span>

                  <div className="space-y-0.5 overflow-hidden">
                    {data.income > 0 && (
                      <span className="block text-[8px] font-bold text-emerald-600 truncate">
                        +{formatCurrency(data.income)}
                      </span>
                    )}
                    {data.expense > 0 && (
                      <span className="block text-[8px] font-bold text-rose-600 truncate">
                        -{formatCurrency(data.expense)}
                      </span>
                    )}
                    {data.bills.length > 0 && (
                      <span className="block text-[8px] font-semibold text-amber-600 truncate">
                        ⚡ {data.bills.length} Bill{data.bills.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                Activity on {new Date(year, month, selectedDay).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h4>
            </div>
            <div className="flex gap-2 text-xs font-bold">
              {activeDayData.income > 0 && (
                <span className="text-emerald-600">+{formatCurrency(activeDayData.income)}</span>
              )}
              {activeDayData.expense > 0 && (
                <span className="text-rose-600">-{formatCurrency(activeDayData.expense)}</span>
              )}
            </div>
          </div>

          {activeDayData.items.length === 0 && activeDayData.bills.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">No transactions or scheduled bills on this day.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
              {activeDayData.bills.map((b, idx) => (
                <div key={`bill-${idx}`} className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">Bill Due</span>
                    <div>
                      <strong className="text-gray-900 dark:text-white block">{b.name}</strong>
                      <span className="text-[10px] text-gray-400 capitalize">{b.category}</span>
                    </div>
                  </div>
                  <strong className="text-rose-600 font-bold">{formatCurrency(b.amount)}</strong>
                </div>
              ))}

              {activeDayData.items.map(tx => (
                <div key={tx.id} className="pt-2 flex items-center justify-between text-xs">
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

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
