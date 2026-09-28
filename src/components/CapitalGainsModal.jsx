import { useState } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { Calculator, Info } from 'lucide-react'

const STCG_RATE = 0.20
const LTCG_RATE = 0.125
const LTCG_EXEMPT = 125000

export default function CapitalGainsModal({ isOpen, onClose, funds = [] }) {
  const [mode, setMode] = useState('ltcg')
  const [customMap, setCustomMap] = useState({})

  if (!isOpen) return null

  let totInv = 0, totVal = 0, ltcgGain = 0, stcgGain = 0

  const items = funds.map((f) => {
    const inv = parseFloat(f.invested_amount || 0)
    const val = parseFloat(f.current_value || (f.units * f.current_nav) || 0)
    const gain = val - inv
    const hMode = mode === 'custom' ? (customMap[f.scheme_name] || 'ltcg') : mode

    totInv += inv
    totVal += val
    if (gain > 0) {
      if (hMode === 'ltcg') ltcgGain += gain
      else stcgGain += gain
    }
    return { ...f, inv, val, gain, hMode }
  })

  const totGain = totVal - totInv
  const stcgTax = stcgGain * STCG_RATE
  const ltcgTaxable = Math.max(0, ltcgGain - LTCG_EXEMPT)
  const ltcgTax = ltcgTaxable * LTCG_RATE
  const totTax = stcgTax + ltcgTax

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Capital Gains Tax Estimator (LTCG / STCG)">
      <div className="space-y-4 text-xs">
        <div className="bg-slate-900 text-white rounded-xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-blue-400 block font-semibold">Total Estimated Tax</span>
            <h3 className="text-xl font-bold">{formatCurrency(totTax)}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-400 block">Post-Tax Value</span>
            <h3 className="text-lg font-bold">{formatCurrency(totVal - totTax)}</h3>
          </div>
        </div>

        <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-2 rounded-lg">
          <span className="font-semibold text-gray-800 dark:text-gray-200">Holding Assumption:</span>
          <div className="flex gap-1">
            {['ltcg', 'stcg', 'custom'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2 py-1 rounded text-xs font-semibold ${mode === m ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300'}`}
              >
                {m === 'ltcg' ? 'LTCG (>1y)' : m === 'stcg' ? 'STCG (<1y)' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 border rounded-lg dark:border-slate-800">
            <span className="text-gray-400 text-[10px] block">LTCG Tax (@12.5%)</span>
            <strong className="text-rose-600">{formatCurrency(ltcgTax)}</strong>
          </div>
          <div className="p-2 border rounded-lg dark:border-slate-800">
            <span className="text-gray-400 text-[10px] block">STCG Tax (@20%)</span>
            <strong className="text-amber-600">{formatCurrency(stcgTax)}</strong>
          </div>
        </div>

        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-900 dark:text-amber-200">
          <strong>Tax Rules:</strong> LTCG (&gt;12 mos) is taxed at 12.5% on gains exceeding ₹1.25 Lakh. STCG is taxed at flat 20%.
        </div>

        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 border rounded-lg">
          {items.map((f, i) => (
            <div key={i} className="p-2 flex justify-between items-center text-xs">
              <div className="truncate max-w-[180px]">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{f.scheme_name}</p>
                <p className="text-[10px] text-gray-400">Invested: {formatCurrency(f.inv)}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${f.gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {f.gain >= 0 ? '+' : ''}{formatCurrency(f.gain)}
                </p>
                {mode === 'custom' && (
                  <select
                    value={customMap[f.scheme_name] || 'ltcg'}
                    onChange={(e) => setCustomMap({ ...customMap, [f.scheme_name]: e.target.value })}
                    className="text-[10px] border rounded"
                  >
                    <option value="ltcg">LTCG</option>
                    <option value="stcg">STCG</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t dark:border-slate-800">
          <button
            onClick={() => {
              const headers = ['Scheme Name', 'Invested (INR)', 'Current Value (INR)', 'Gain (INR)', 'Holding Mode', 'Tax Rate']
              const rows = items.map(f => [
                `"${f.scheme_name.replace(/"/g, '""')}"`,
                f.inv,
                f.val,
                f.gain,
                f.hMode.toUpperCase(),
                f.hMode === 'ltcg' ? '12.5% (>1.25L Exemption)' : '20%',
              ])
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `ITR_Capital_Gains_Report_${new Date().getFullYear()}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <span>📥 Export ITR Statement (CSV)</span>
          </button>

          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-5">Done</button>
        </div>
      </div>
    </Modal>
  )
}

