import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { AlertTriangle } from 'lucide-react'

export default function CashflowForecastModal({ isOpen, onClose, sips = [], debts = [] }) {
  const [horizon, setHorizon] = useState(60)
  const [currBal, setCurrBal] = useState('65000')
  const [salary, setSalary] = useState('110000')
  const [salDay, setSalDay] = useState('1')
  const [dSpend, setDSpend] = useState('600')

  const sipTot = sips.filter(s => s.active !== false).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
  const emiTot = debts.filter(d => d.status !== 'cleared').reduce((sum, d) => sum + parseFloat(d.emi || 0), 0)

  const { chartData, minBal, endBal } = useMemo(() => {
    const data = []
    let b = parseFloat(currBal) || 0
    let m = b
    const s = parseFloat(salary) || 0
    const d = parseFloat(dSpend) || 0
    const sd = parseInt(salDay) || 1
    const today = new Date()

    for (let day = 0; day <= horizon; day++) {
      const dt = new Date(today.getTime() + day * 86400000)
      const dayOfMonth = dt.getDate()

      if (day > 0) b -= d
      if (dayOfMonth === sd && day > 0) b += s
      if (dayOfMonth === 5 && day > 0 && sipTot > 0) b -= sipTot
      if (dayOfMonth === 10 && day > 0 && emiTot > 0) b -= emiTot

      if (b < m) m = b
      if (day % 3 === 0 || day === horizon) {
        data.push({ day: `${dt.getDate()}/${dt.getMonth() + 1}`, balance: Math.round(b) })
      }
    }
    return { chartData: data, minBal: Math.round(m), endBal: Math.round(b) }
  }, [horizon, currBal, salary, salDay, dSpend, sipTot, emiTot])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Predictive 90-Day Cashflow Forecast">
      <div className="space-y-3.5 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-xl">
          <div>
            <label className="label text-[10px]">Bank Bal (₹)</label>
            <input type="number" value={currBal} onChange={e => setCurrBal(e.target.value)} className="input-field text-xs py-1" />
          </div>
          <div>
            <label className="label text-[10px]">Salary (₹)</label>
            <input type="number" value={salary} onChange={e => setSalary(e.target.value)} className="input-field text-xs py-1" />
          </div>
          <div>
            <label className="label text-[10px]">Salary Date</label>
            <select value={salDay} onChange={e => setSalDay(e.target.value)} className="input-field text-xs py-1">
              {[1, 5, 10, 15, 25, 30].map(d => <option key={d} value={d}>{d}th</option>)}
            </select>
          </div>
          <div>
            <label className="label text-[10px]">Daily Spend (₹)</label>
            <input type="number" value={dSpend} onChange={e => setDSpend(e.target.value)} className="input-field text-xs py-1" />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <div>
            Min: <strong className={minBal < 15000 ? 'text-rose-600' : 'text-emerald-600'}>{formatCurrency(minBal)}</strong> | End: <strong className="text-blue-600">{formatCurrency(endBal)}</strong>
          </div>
          <div className="flex gap-1">
            {[30, 60, 90].map(h => (
              <button key={h} onClick={() => setHorizon(h)} className={`px-2 py-0.5 rounded font-semibold ${horizon === h ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700'}`}>
                {h}d
              </button>
            ))}
          </div>
        </div>

        <div className="h-44 w-full bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 9 }} />
              <Tooltip formatter={v => [formatCurrency(v), 'Balance']} />
              <Area type="monotone" dataKey="balance" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {minBal < 15000 && (
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-[11px]">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            <span>Low balance warning: Projected minimum dips to {formatCurrency(minBal)}.</span>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs py-1 px-4">Done</button>
        </div>
      </div>
    </Modal>
  )
}
