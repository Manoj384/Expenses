import { useState } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { CURRENCIES, useCurrency } from '../context/CurrencyContext'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Wallet,
  Target,
  Zap,
  TrendingUp,
  Coins,
  Shield,
  Building,
} from 'lucide-react'

const STEP_ICONS = [Wallet, Zap, Target, TrendingUp]

export default function OnboardingWizardModal({ isOpen, onClose, onComplete }) {
  const { currency, setCurrencyCode } = useCurrency()
  const [step, setStep] = useState(1)

  // Step 1: Income & Currency
  const [monthlyIncome, setMonthlyIncome] = useState('85000')

  // Step 2: Selected Categories
  const [selectedCats, setSelectedCats] = useState([
    'Food & Dining',
    'Rent & Utilities',
    'Fuel & Transport',
    'Shopping & Groceries',
    'OTT & Subscriptions',
  ])

  // Step 3: First Goal
  const [goalName, setGoalName] = useState('Emergency Shield Fund (6 Months)')
  const [goalAmount, setGoalAmount] = useState('250000')

  // Step 4: Monthly SIP
  const [sipAmount, setSipAmount] = useState('25000')
  const [sipFund, setSipFund] = useState('Parag Parikh Flexi Cap Fund')

  if (!isOpen) return null

  const handleFinish = () => {
    if (onComplete) {
      onComplete({
        income: parseFloat(monthlyIncome) || 85000,
        currency: currency.code,
        categories: selectedCats,
        goal: { name: goalName, amount: parseFloat(goalAmount) || 250000 },
        sip: { fund: sipFund, amount: parseFloat(sipAmount) || 25000 },
      })
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to Finance Tracker! ✨" maxWidth="max-w-xl">
      <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
        {/* Step Progress Dots */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100 dark:border-slate-800">
          {[1, 2, 3, 4].map((s) => {
            const Icon = STEP_ICONS[s - 1]
            const isDone = s < step
            const isCurrent = s === step
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100 dark:ring-blue-950'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[11px] font-bold hidden sm:inline ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                  {s === 1 ? 'Income' : s === 2 ? 'Categories' : s === 3 ? 'Goal' : 'Invest'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step 1: Income & Currency */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Step 1: Set Your Baseline Income</h3>
              <p className="text-xs text-gray-500">What is your expected monthly in-hand salary or take-home income?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Monthly In-Hand Income</label>
                <div className="relative">
                  <input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="input-field text-sm font-bold text-emerald-600"
                    placeholder="85000"
                  />
                </div>
              </div>

              <div>
                <label className="label">Preferred Currency</label>
                <select
                  value={currency.code}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="input-field text-xs font-semibold"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-blue-900 dark:text-blue-200">
              <span>💡 Your monthly income is used to calculate your live savings rate and budget caps.</span>
            </div>
          </div>
        )}

        {/* Step 2: Categories */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Step 2: Choose Your Spending Categories</h3>
              <p className="text-xs text-gray-500">Pick the main categories where you spend money every month:</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                'Food & Dining',
                'Rent & Utilities',
                'Fuel & Transport',
                'Shopping & Groceries',
                'OTT & Subscriptions',
                'Healthcare & Medical',
                'Entertainment & Movies',
                'Travel & Vacation',
                'Fitness & Sports',
              ].map(cat => {
                const isSelected = selectedCats.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (isSelected) setSelectedCats(selectedCats.filter(c => c !== cat))
                      else setSelectedCats([...selectedCats, cat])
                    }}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{cat}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: First Goal */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Step 3: Setup Your First Wealth Goal</h3>
              <p className="text-xs text-gray-500">Setting clear milestones is the fastest way to build long-term wealth:</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Goal Milestone Name</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="input-field text-xs font-semibold"
                  placeholder="e.g. Emergency Fund, New Car, Goa Trip"
                />
              </div>

              <div>
                <label className="label">Target Amount</label>
                <input
                  type="number"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  className="input-field text-sm font-bold text-indigo-600"
                  placeholder="250000"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Monthly SIP Compounding */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Step 4: Automate Wealth Compounding</h3>
              <p className="text-xs text-gray-500">Track your recurring SIP investments and growth trajectory:</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Mutual Fund Scheme</label>
                <input
                  type="text"
                  value={sipFund}
                  onChange={(e) => setSipFund(e.target.value)}
                  className="input-field text-xs font-semibold"
                />
              </div>

              <div>
                <label className="label">Monthly SIP Amount</label>
                <input
                  type="number"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(e.target.value)}
                  className="input-field text-sm font-bold text-emerald-600"
                  placeholder="25000"
                />
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary text-xs flex items-center gap-1 py-2 px-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          ) : (
            <button onClick={onClose} className="btn-secondary text-xs py-2 px-3">
              Skip for Now
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5 py-2 px-5 font-bold"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Complete Setup & Launch!</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
