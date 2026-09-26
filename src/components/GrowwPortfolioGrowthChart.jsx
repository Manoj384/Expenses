import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calculator,
  PieChart as PieIcon,
  HelpCircle,
} from 'lucide-react'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import { buildPortfolioTimeline } from '../utils/mfApi'

const TIMEFRAMES = [
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
  { id: '1Y', label: '1Y (Year)' },
  { id: 'ALL', label: 'All Time' },
]

export default function GrowwPortfolioGrowthChart({ funds = [] }) {
  const [timeframe, setTimeframe] = useState('1Y')
  const [selectedScheme, setSelectedScheme] = useState('ALL') // 'ALL' or scheme code
  const [chartData, setChartData] = useState([])
  const [loadingChart, setLoadingChart] = useState(true)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // SIP Future Wealth Projection State
  const [showSipCalculator, setShowSipCalculator] = useState(false)
  const [sipAmount, setSipAmount] = useState(2500)
  const [sipRate, setSipRate] = useState(15)
  const [sipYears, setSipYears] = useState(5)

  // Unique schemes list for selector
  const schemeOptions = [
    { code: 'ALL', name: '✨ Entire Portfolio (All Funds)' },
    ...Object.values(funds.reduce((acc, f) => {
      const name = f.scheme_name
      if (!acc[name]) {
        acc[name] = {
          code: f.scheme_code || name,
          name: name.replace('Direct Growth', '').replace('Direct Plan Growth', '').trim(),
          current_value: 0,
        }
      }
      acc[name].current_value += parseFloat(f.current_value || (f.units * f.current_nav) || 0)
      return acc
    }, {})).map(s => ({
      code: s.code,
      name: `${s.name} (${formatCurrencyShort(s.current_value)})`,
    }))
  ]

  // Load / Update Chart timeline
  useEffect(() => {
    let isMounted = true
    async function loadTimeline() {
      setLoadingChart(true)
      try {
        const filterCode = selectedScheme === 'ALL' ? null : selectedScheme
        const points = await buildPortfolioTimeline(funds, timeframe, filterCode)
        if (isMounted) {
          setChartData(points)
          setHoveredPoint(null)
        }
      } catch (err) {
        console.warn('Chart timeline load error:', err)
      } finally {
        if (isMounted) setLoadingChart(false)
      }
    }
    loadTimeline()
    return () => { isMounted = false }
  }, [funds, timeframe, selectedScheme])

  // Calculation for Period Stats
  const startPoint = chartData[0] || {}
  const endPoint = chartData[chartData.length - 1] || {}
  const currentInvested = endPoint.invested || 0
  const currentVal = endPoint.currentValue || 0

  // Values shown in banner (either hovered or latest)
  const activeVal = hoveredPoint ? hoveredPoint.currentValue : currentVal
  const activeInvested = hoveredPoint ? hoveredPoint.invested : currentInvested
  const activeProfit = activeVal - activeInvested
  const activeProfitPct = activeInvested > 0 ? ((activeProfit / activeInvested) * 100).toFixed(2) : '0.00'
  const activeDate = hoveredPoint ? hoveredPoint.fullDate : (endPoint.fullDate || 'Latest')

  // Period High / Low
  const periodValues = chartData.map(d => d.currentValue).filter(v => v > 0)
  const periodHigh = periodValues.length > 0 ? Math.max(...periodValues) : currentVal
  const periodLow = periodValues.length > 0 ? Math.min(...periodValues) : currentVal

  // SIP Future Value formula: FV = P * [((1 + i)^n - 1) / i] * (1 + i)
  const monthlyRate = (sipRate / 100) / 12
  const totalMonths = sipYears * 12
  const sipInvestedTotal = sipAmount * totalMonths
  const sipFutureValue = Math.round(
    sipAmount * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate)
  )
  const sipEstimatedGain = sipFutureValue - sipInvestedTotal

  return (
    <div className="card mb-6 overflow-hidden border border-emerald-100 dark:border-slate-800 shadow-sm">
      {/* Groww Header Controls */}
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-slate-900 dark:to-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                <Activity className="h-3 w-3 text-emerald-600 animate-pulse" />
                Groww Live Investment & Year Timeline
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                • {activeDate}
              </span>
            </div>

            {/* Dynamic Value Preview on Hover */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {formatCurrency(activeVal)}
              </span>
              <span className={`inline-flex items-center text-sm font-bold ${activeProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {activeProfit >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {activeProfit >= 0 ? '+' : ''}{formatCurrency(activeProfit)} ({activeProfitPct}%)
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Invested: <strong className="text-gray-700 dark:text-gray-200 font-semibold">{formatCurrency(activeInvested)}</strong>
              </span>
            </div>
          </div>

          {/* Controls: Timeframe Pills & Scheme Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scheme Dropdown */}
            <select
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value)}
              className="text-xs font-medium bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-200 shadow-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {schemeOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name}
                </option>
              ))}
            </select>

            {/* Timeframe Buttons */}
            <div className="inline-flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    timeframe === tf.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Calculator Toggle */}
            <button
              onClick={() => setShowSipCalculator(!showSipCalculator)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                showSipCalculator
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-slate-800 dark:text-teal-300'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              SIP Wealth Projector
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Area */}
      <div className="p-4 sm:p-6">
        {loadingChart ? (
          <div className="h-72 flex flex-col items-center justify-center text-gray-400 gap-2">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Computing live historical AMFI NAV progression...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-gray-400">
            <p className="text-sm font-medium">No historical NAV series found for this range.</p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                onMouseMove={(e) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    setHoveredPoint(e.activePayload[0].payload)
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="growwEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="growwInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => formatCurrencyShort(val)}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                          <p className="font-semibold text-teal-300 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                            <span>📅 {data.fullDate}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{timeframe}</span>
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Market Value:</span>
                            <strong className="text-emerald-400 font-bold">{formatCurrency(data.currentValue)}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-300">Invested:</span>
                            <span className="text-slate-200">{formatCurrency(data.invested)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                            <span className="text-slate-300">Net Profit:</span>
                            <strong className={data.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {data.profit >= 0 ? '+' : ''}{formatCurrency(data.profit)} ({data.profitPct}%)
                            </strong>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="currentValue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#growwEmeraldGrad)"
                  name="Current Value"
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Invested Amount"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Graph Bottom Legend & Stats Chips */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
              Current Market Value
            </span>
            <span className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
              <span className="w-3 h-0.5 bg-indigo-500 border-t border-dashed border-indigo-500"></span>
              Invested Capital Baseline
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
            <span>
              Period Low: <strong className="font-semibold text-gray-800 dark:text-white">{formatCurrency(periodLow)}</strong>
            </span>
            <span>•</span>
            <span>
              Period High (Peak): <strong className="font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(periodHigh)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Interactive SIP Wealth Projection Calculator Modal / Section */}
      {showSipCalculator && (
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white border-t border-teal-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-400" />
              <h4 className="text-sm font-bold tracking-wide uppercase text-teal-200">
                SIP Future Wealth Projector (Groww Calculator)
              </h4>
            </div>
            <button
              onClick={() => setShowSipCalculator(false)}
              className="text-xs text-teal-300 hover:text-white underline"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sliders */}
            <div className="space-y-4 md:col-span-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-teal-200">Monthly SIP Amount:</span>
                  <strong className="text-white font-bold">{formatCurrency(sipAmount)}/mo</strong>
                </div>
                <input
                  type="range"
                  min="500"
                  max="50000"
                  step="500"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-2 bg-teal-950 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-teal-200">Expected Annual Return (CAGR):</span>
                  <strong className="text-white font-bold">{sipRate}% p.a.</strong>
                </div>
                <input
                  type="range"
                  min="8"
                  max="25"
                  step="0.5"
                  value={sipRate}
                  onChange={(e) => setSipRate(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-2 bg-teal-950 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-teal-200">Time Horizon:</span>
                  <strong className="text-white font-bold">{sipYears} Years ({totalMonths} Installments)</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={sipYears}
                  onChange={(e) => setSipYears(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-2 bg-teal-950 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Projected Result Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-xs text-teal-300 font-medium">Expected Total Wealth</span>
                <h3 className="text-2xl font-black text-white mt-0.5">{formatCurrency(sipFutureValue)}</h3>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-white/10 text-xs">
                <div className="flex justify-between">
                  <span className="text-teal-200">Total Invested:</span>
                  <span className="font-semibold text-white">{formatCurrency(sipInvestedTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-200">Estimated Returns:</span>
                  <span className="font-bold text-emerald-300">+{formatCurrency(sipEstimatedGain)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-200">Wealth Multiplier:</span>
                  <span className="font-bold text-teal-300">{(sipFutureValue / (sipInvestedTotal || 1)).toFixed(2)}x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
