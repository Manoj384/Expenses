import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, LineChart, Line
} from 'recharts'
import { formatCurrency } from '../utils/formatCurrency'

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#d97706', '#059669'
]

function INRTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export function IncomeExpenseBarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Not enough data to display this chart.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis
          tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`}
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <Tooltip content={<INRTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ExpensePieChart({ data, title = "Expense Breakdown" }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No expenses recorded for this period.</p>
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center">
      <div className="w-full lg:w-3/5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={105}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [formatCurrency(value), 'Amount']} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown Legend List */}
      <div className="w-full lg:w-2/5 max-h-72 overflow-y-auto space-y-2 pr-2">
        {data.map((entry, i) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0
          return (
            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="text-gray-700 truncate font-medium">{entry.name}</span>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="font-semibold text-gray-900">{formatCurrency(entry.value)}</span>
                <span className="text-gray-400 text-[10px] w-9 text-right">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PaymentMethodPieChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No payment method data available.</p>
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center">
      <div className="w-full lg:w-3/5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={105}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[(i + 4) % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [formatCurrency(value), 'Spent']} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full lg:w-2/5 max-h-72 overflow-y-auto space-y-2 pr-2">
        {data.map((entry, i) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0
          return (
            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PALETTE[(i + 4) % PALETTE.length] }}
                />
                <span className="text-gray-700 truncate font-medium">{entry.name}</span>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="font-semibold text-gray-900">{formatCurrency(entry.value)}</span>
                <span className="text-gray-400 text-[10px] w-9 text-right">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DailySpendingAreaChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Not enough data to graph daily trends.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis
          tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`}
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <Tooltip content={<INRTooltip />} />
        <Area
          type="monotone"
          dataKey="expense"
          name="Daily Expense"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#spendGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
