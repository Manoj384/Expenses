import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import {
  ArrowLeftRight,
  TrendingUp,
  ShieldAlert,
  Percent,
  Sparkles,
  Building,
  CheckCircle2,
} from 'lucide-react'

export default function MutualFundCompareModal({ isOpen, onClose, funds = [] }) {
  const [fundAId, setFundAId] = useState(funds[0]?.id || '')
  const [fundBId, setFundBId] = useState(funds[1]?.id || '')

  const fundA = useMemo(() => funds.find(f => f.id === fundAId) || funds[0] || null, [funds, fundAId])
  const fundB = useMemo(() => funds.find(f => f.id === fundBId) || funds[1] || null, [funds, fundBId])

  if (!isOpen) return null

  const getGain = (f) => {
    if (!f) return { inv: 0, val: 0, gain: 0, gainPct: 0 }
    const inv = parseFloat(f.invested_amount || 0)
    const val = parseFloat(f.current_value || (f.units * f.current_nav) || 0)
    const gain = val - inv
    const gainPct = inv > 0 ? (gain / inv) * 100 : 0
    return { inv, val, gain, gainPct }
  }

  const statA = getGain(fundA)
  const statB = getGain(fundB)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mutual Fund Side-by-Side Comparison" maxWidth="max-w-3xl">
      <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
        {/* Fund Selection Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-2">
            <label className="label text-blue-900 dark:text-blue-300 font-bold">Primary Fund (A)</label>
            <select
              value={fundAId}
              onChange={(e) => setFundAId(e.target.value)}
              className="input-field text-xs font-semibold"
            >
              {funds.map(f => (
                <option key={f.id} value={f.id}>{f.scheme_name}</option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
            <label className="label text-indigo-900 dark:text-indigo-300 font-bold">Comparison Fund (B)</label>
            <select
              value={fundBId}
              onChange={(e) => setFundBId(e.target.value)}
              className="input-field text-xs font-semibold"
            >
              {funds.map(f => (
                <option key={f.id} value={f.id}>{f.scheme_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Metrics Table */}
        {fundA && fundB && (
          <div className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-slate-800/80 p-3 font-bold text-gray-500 uppercase tracking-wider text-[11px]">
              <span>Metric</span>
              <span className="text-center text-blue-600 dark:text-blue-400 truncate">{fundA.scheme_name}</span>
              <span className="text-center text-indigo-600 dark:text-indigo-400 truncate">{fundB.scheme_name}</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
              <div className="grid grid-cols-3 p-3 items-center">
                <span className="font-semibold text-gray-500">Fund House / AMC</span>
                <span className="text-center font-bold">{fundA.fund_house || '—'}</span>
                <span className="text-center font-bold">{fundB.fund_house || '—'}</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <span className="font-semibold text-gray-500">Category & Mandate</span>
                <span className="text-center font-bold">{fundA.category || 'Equity'}</span>
                <span className="text-center font-bold">{fundB.category || 'Equity'}</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <span className="font-semibold text-gray-500">Current NAV</span>
                <span className="text-center font-bold">₹{parseFloat(fundA.current_nav || 0).toFixed(2)}</span>
                <span className="text-center font-bold">₹{parseFloat(fundB.current_nav || 0).toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <span className="font-semibold text-gray-500">Your Invested Capital</span>
                <span className="text-center font-bold">{formatCurrency(statA.inv)}</span>
                <span className="text-center font-bold">{formatCurrency(statB.inv)}</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <span className="font-semibold text-gray-500">Current Market Value</span>
                <span className="text-center font-black text-sm">{formatCurrency(statA.val)}</span>
                <span className="text-center font-black text-sm">{formatCurrency(statB.val)}</span>
              </div>

              <div className="grid grid-cols-3 p-3 items-center bg-gray-50/50 dark:bg-slate-800/40">
                <span className="font-bold text-gray-800 dark:text-white">Absolute Profit / Gain</span>
                <span className={`text-center font-black text-sm ${statA.gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  +{formatCurrency(statA.gain)} (+{statA.gainPct.toFixed(2)}%)
                </span>
                <span className={`text-center font-black text-sm ${statB.gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  +{formatCurrency(statB.gain)} (+{statB.gainPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-5">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
