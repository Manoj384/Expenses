import { useState, useMemo } from 'react'
import Modal from './Modal'
import {
  calculateTaxHarvestingOpportunities,
  ANNUAL_LTCG_EXEMPTION_LIMIT,
} from '../utils/taxHarvestingEngine'
import { formatCurrency } from '../utils/formatCurrency'
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Info,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Percent,
} from 'lucide-react'

export default function TaxHarvestingModal({ isOpen = true, onClose = () => {}, mutualFunds = [], isEmbedded = false }) {
  const [alreadyHarvested, setAlreadyHarvested] = useState(0)

  const analysis = useMemo(() => {
    return calculateTaxHarvestingOpportunities({
      mutualFunds,
      alreadyHarvestedLtcg: alreadyHarvested,
    })
  }, [mutualFunds, alreadyHarvested])

  const {
    annualLimit,
    remainingExemption,
    totalUnrealizedLtcg,
    optimalHarvestAmount,
    potentialTaxSaved,
    harvestingCandidates,
    deadlineDate,
  } = analysis

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isEmbedded={isEmbedded} title="Sec 112A Capital Gains & Tax-Loss Harvesting" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Top Tax-Free Exemption Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Sec 112A Annual Exemption: {formatCurrency(annualLimit)}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                FY 2026-27 Slabs
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {formatCurrency(potentialTaxSaved)} <span className="text-xs font-normal text-slate-300">potential tax savings</span>
            </div>
            <p className="text-xs text-slate-300">
              Harvest up to {formatCurrency(optimalHarvestAmount)} in long-term gains at <strong className="text-emerald-300">0% tax rate</strong> before {deadlineDate}.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400">Available Tax-Free Quota:</span>
            <p className="text-xl font-black text-white">{formatCurrency(remainingExemption)}</p>
          </div>
        </div>

        {/* Mutual Funds Harvesting Opportunities Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Eligible Mutual Funds for Cost-Basis Step-Up:
            </span>
            <span className="text-[11px] text-gray-500">
              Total Unrealized Gains: {formatCurrency(totalUnrealizedLtcg)}
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {harvestingCandidates.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed text-center text-xs text-gray-400">
                No active equity mutual funds with harvestable long-term capital gains found.
              </div>
            ) : (
              harvestingCandidates.map((fund) => {
                const taxSavedOnFund = Math.round(fund.unrealizedGain * 0.125)
                return (
                  <div
                    key={fund.id}
                    className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate max-w-[280px]">
                        {fund.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Invested: {formatCurrency(fund.invested)} • Value: {formatCurrency(fund.current)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(fund.unrealizedGain)}
                      </span>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                        Saves {formatCurrency(taxSavedOnFund)} tax
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Step-by-Step Educational Callout */}
        <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
            <Info className="h-4 w-4 text-blue-600" />
            <span>How Tax-Gain Harvesting Works (Legally 100% Compliant):</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-slate-300 text-[11px] leading-relaxed">
            <li>Redeem mutual fund units on Groww/Zerodha containing up to <strong>₹1,25,000</strong> of gains before March 31.</li>
            <li>File Sec 112A exemption on your ITR: <strong>₹0 tax is due</strong> on these gains.</li>
            <li>Re-invest the money into the fund on the next business day. Your purchase NAV steps up to the higher price, eliminating future tax liability!</li>
          </ol>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
