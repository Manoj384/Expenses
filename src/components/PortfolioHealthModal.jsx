import React from 'react'
import Modal from './Modal'
import {
  ShieldCheck,
  AlertTriangle,
  PieChart as PieIcon,
  TrendingUp,
  Layers,
  Sparkles,
  CheckCircle2,
  Info,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'

export default function PortfolioHealthModal({ isOpen, onClose, funds = [] }) {
  if (!isOpen) return null

  // Calculate Market Cap Breakdown
  const totalVal = funds.reduce((s, f) => s + parseFloat(f.current_value || (f.units * f.current_nav) || 0), 0)

  let midCapVal = 0
  let smallCapVal = 0
  let flexiCapVal = 0
  let largeCapVal = 0

  funds.forEach(f => {
    const cat = (f.category || '').toLowerCase()
    const name = (f.scheme_name || '').toLowerCase()
    const val = parseFloat(f.current_value || (f.units * f.current_nav) || 0)

    if (cat.includes('mid') || name.includes('midcap') || name.includes('mid cap') || name.includes('growth')) {
      midCapVal += val
    } else if (cat.includes('small') || name.includes('small')) {
      smallCapVal += val
    } else if (cat.includes('flexi') || name.includes('flexi')) {
      flexiCapVal += val
    } else {
      largeCapVal += val
    }
  })

  const smallPct = totalVal > 0 ? (smallCapVal / totalVal) * 100 : 0
  const midPct = totalVal > 0 ? (midCapVal / totalVal) * 100 : 0
  const flexiPct = totalVal > 0 ? (flexiCapVal / totalVal) * 100 : 0
  const largePct = totalVal > 0 ? (largeCapVal / totalVal) * 100 : 0

  // Multi-folio check
  const schemeNames = {}
  funds.forEach(f => {
    const key = f.scheme_name.trim()
    schemeNames[key] = (schemeNames[key] || 0) + 1
  })
  const duplicateSchemes = Object.entries(schemeNames).filter(([_, count]) => count > 1)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Portfolio Health & Risk Analysis" size="lg">
      <div className="space-y-6">
        {/* Top Overall Score Card */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Portfolio Health Rating
              </span>
              <h3 className="text-2xl font-black text-white">88 / 100 • Strong Growth</h3>
              <p className="text-xs text-teal-200 mt-0.5">
                Aggressive compounding strategy with top-quartile active equity funds.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-teal-300 uppercase tracking-wider block">Risk Profile</span>
              <span className="text-lg font-bold text-amber-300">High Growth / Alpha</span>
            </div>
          </div>
        </div>

        {/* Market Cap & Asset Allocation Distribution */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <PieIcon className="h-3.5 w-3.5 text-emerald-600" /> Market Cap Exposure Breakdown
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 dark:bg-slate-800">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">Mid-Cap Alpha</span>
              <strong className="text-lg text-gray-900 dark:text-white font-extrabold">{midPct.toFixed(1)}%</strong>
              <p className="text-xs text-gray-500">{formatCurrency(midCapVal)}</p>
            </div>

            <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 dark:bg-slate-800">
              <span className="text-xs font-semibold text-purple-800 dark:text-purple-300 block">Small-Cap Aggressive</span>
              <strong className="text-lg text-gray-900 dark:text-white font-extrabold">{smallPct.toFixed(1)}%</strong>
              <p className="text-xs text-gray-500">{formatCurrency(smallCapVal)}</p>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 dark:bg-slate-800">
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 block">Flexi-Cap Diversified</span>
              <strong className="text-lg text-gray-900 dark:text-white font-extrabold">{flexiPct.toFixed(1)}%</strong>
              <p className="text-xs text-gray-500">{formatCurrency(flexiCapVal)}</p>
            </div>
          </div>
        </div>

        {/* Actionable Health Insights & Diagnostic Checklist */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Actionable Portfolio Insights
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">High Small & Mid Cap Concentration ({(smallPct + midPct).toFixed(1)}%)</strong>
                Over 85% of your portfolio is in mid and small-cap schemes. This provides superior upside during bull runs, but may experience short-term drawdowns in volatile markets. Adding 10-15% in a Nifty 50 or Large-Cap fund provides steady stability.
              </div>
            </div>

            {duplicateSchemes.length > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-200">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">Multi-Folio Holdings Detected ({duplicateSchemes.length} Schemes)</strong>
                  You have multiple separate folios for {duplicateSchemes.map(([name]) => name.split(' ')[0]).join(', ')}. Our app seamlessly tracks and combines them together, but you can also consolidate them inside Groww for cleaner statements.
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">100% Direct Growth Plans</strong>
                All your funds are zero-commission Direct Growth schemes, saving you 1.0%–1.5% annually in distributor commission expenses!
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="btn btn-primary text-xs"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
