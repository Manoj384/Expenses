import { useState, useMemo } from 'react'
import Modal from './Modal'
import {
  debateFinancialDilemma,
  PRESET_DILEMMAS,
} from '../utils/advisorsCouncilEngine'
import {
  ShieldAlert,
  TrendingUp,
  Smile,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  MessageSquare,
} from 'lucide-react'

export default function FinancialAdvisorsModal({ isOpen = true, onClose = () => {}, isEmbedded = false, context = {} }) {
  const [selectedDilemma, setSelectedDilemma] = useState(PRESET_DILEMMAS[0].question)
  const [customInput, setCustomInput] = useState('')
  const [activeQuestion, setActiveQuestion] = useState(PRESET_DILEMMAS[0].question)

  const debateResult = useMemo(() => {
    return debateFinancialDilemma({
      dilemma: activeQuestion,
      context,
    })
  }, [activeQuestion, context])

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (customInput.trim()) {
      setActiveQuestion(customInput.trim())
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isEmbedded={isEmbedded} title="Multi-Agent Board of Financial Advisors" maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Intro */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Autonomous 3-Persona Financial Council
            </span>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              Get 3 balanced viewpoints (Risk, Compounding & Lifestyle) before making major money decisions.
            </p>
          </div>
        </div>

        {/* Preset Dilemmas */}
        <div>
          <label className="label text-xs mb-1.5">Select a Financial Dilemma or Ask Your Own:</label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESET_DILEMMAS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedDilemma(d.question)
                  setActiveQuestion(d.question)
                }}
                className={`text-xs px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                  activeQuestion === d.question
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50'
                }`}
              >
                {d.question}
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Can I afford to buy a ₹40,000 watch this month?"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="input text-xs py-2 px-3 flex-1"
            />
            <button type="submit" className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Debate</span>
            </button>
          </form>
        </div>

        {/* 3 Advisor Persona Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Marcus */}
          <div className="p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Marcus Vance</h4>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Risk & Debt Auditor</p>
                </div>
              </div>
              <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                "{debateResult.advisors[0].argument}"
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-medium pt-2 border-t border-amber-200/50 dark:border-amber-900/30">
              Focus: Safety buffer & capital protection
            </div>
          </div>

          {/* Aria */}
          <div className="p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Aria Chen</h4>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Wealth Compounding</p>
                </div>
              </div>
              <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                "{debateResult.advisors[1].argument}"
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-medium pt-2 border-t border-emerald-200/50 dark:border-emerald-900/30">
              Focus: 12-15% CAGR & opportunity cost
            </div>
          </div>

          {/* Leo */}
          <div className="p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Smile className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Leo Morales</h4>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">Lifestyle & Sustainability</p>
                </div>
              </div>
              <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                "{debateResult.advisors[2].argument}"
              </p>
            </div>
            <div className="text-[10px] text-gray-400 font-medium pt-2 border-t border-blue-200/50 dark:border-blue-900/30">
              Focus: Joy, guilt-free buckets, no burnout
            </div>
          </div>
        </div>

        {/* Unified Consensus Verdict */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-1.5 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Unified Board Consensus
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-100">
            {debateResult.consensus}
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
