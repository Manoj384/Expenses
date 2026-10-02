import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import {
  POPULAR_INDIAN_CREDIT_CARDS,
  calculateCardGracePeriod,
  recommendBestCardForExpense,
} from '../utils/creditCardOptimizer'
import {
  CreditCard,
  Sparkles,
  Calendar,
  Clock,
  Zap,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShieldCheck,
  Award,
  Info,
} from 'lucide-react'

const SPEND_CATEGORIES = [
  { id: 'online', label: 'Online Shopping (Amazon/Flipkart)', icon: '🛍️' },
  { id: 'dining', label: 'Dining & Food (Swiggy/Zomato)', icon: '🍔' },
  { id: 'groceries', label: 'Groceries & Instamart', icon: '🛒' },
  { id: 'travel', label: 'Flights & Hotel Bookings', icon: '✈️' },
  { id: 'utilities', label: 'Bills, WiFi & Recharges', icon: '⚡' },
  { id: 'fuel', label: 'Fuel & Petrol', icon: '⛽' },
  { id: 'general', label: 'General / In-Store Spends', icon: '💳' },
]

export default function CreditCardSmartPayerModal({ isOpen, onClose, isEmbedded = false }) {
  const [selectedCategory, setSelectedCategory] = useState('online')
  const [amount, setAmount] = useState(12000)
  const [cards, setCards] = useState(() => {
    try {
      const saved = localStorage.getItem('ft_user_credit_cards')
      return saved ? JSON.parse(saved) : POPULAR_INDIAN_CREDIT_CARDS
    } catch {
      return POPULAR_INDIAN_CREDIT_CARDS
    }
  })

  const [showAddCard, setShowAddCard] = useState(false)
  const [newCardForm, setNewCardForm] = useState({
    name: '',
    bank: '',
    statementDay: 15,
    graceDaysAfterStatement: 20,
    onlineReward: 2.0,
    diningReward: 2.0,
  })

  const evaluation = useMemo(() => {
    return recommendBestCardForExpense(cards, {
      amount: Number(amount) || 0,
      category: selectedCategory,
      refDate: new Date(),
    })
  }, [cards, amount, selectedCategory])

  const { bestCard, evaluatedCards } = evaluation

  const handleSaveCard = (e) => {
    e.preventDefault()
    if (!newCardForm.name.trim()) return

    const cardToAdd = {
      id: `custom-card-${Date.now()}`,
      name: newCardForm.name.trim(),
      bank: newCardForm.bank.trim() || 'My Bank',
      network: 'Visa',
      statementDay: Number(newCardForm.statementDay) || 15,
      graceDaysAfterStatement: Number(newCardForm.graceDaysAfterStatement) || 20,
      annualFee: 0,
      rewardRates: {
        online: Number(newCardForm.onlineReward) || 1.0,
        dining: Number(newCardForm.diningReward) || 1.0,
        groceries: Number(newCardForm.onlineReward) || 1.0,
        travel: 1.5,
        shopping: Number(newCardForm.onlineReward) || 1.0,
        utilities: 1.0,
        fuel: 1.0,
        general: 1.0,
      },
      specialPerks: 'Custom credit card profile',
    }

    const updated = [cardToAdd, ...cards]
    setCards(updated)
    try {
      localStorage.setItem('ft_user_credit_cards', JSON.stringify(updated))
    } catch {}
    setShowAddCard(false)
    setNewCardForm({ name: '', bank: '', statementDay: 15, graceDaysAfterStatement: 20, onlineReward: 2.0, diningReward: 2.0 })
  }

  return (
    <Modal isOpen={isOpen} isEmbedded={isEmbedded} onClose={onClose} title="Credit Card Grace Period & Smart Payer Engine" size="2xl">
      <div className="space-y-6 text-xs">
        {/* Top Spend Simulator Controls */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              1. Simulate Upcoming Purchase
            </span>
            <button
              onClick={() => setShowAddCard(prev => !prev)}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showAddCard ? 'Hide Form' : 'Add My Card'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Purchase Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input-field text-xs font-bold text-emerald-600"
                step="500"
                placeholder="10000"
              />
            </div>

            <div>
              <label className="label">Spending Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field text-xs font-semibold"
              >
                {SPEND_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Category Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {SPEND_CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === c.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-100'
                }`}
              >
                {c.icon} {c.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Add Custom Card Form Drawer */}
        {showAddCard && (
          <form onSubmit={handleSaveCard} className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
            <h4 className="font-bold text-blue-950 dark:text-blue-200 text-xs">Add Your Credit Card</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Card Name (e.g. HDFC Regalia Gold)"
                value={newCardForm.name}
                onChange={(e) => setNewCardForm(prev => ({ ...prev, name: e.target.value }))}
                className="input-field text-xs bg-white dark:bg-slate-900"
                required
              />
              <input
                type="text"
                placeholder="Bank Name (e.g. HDFC Bank)"
                value={newCardForm.bank}
                onChange={(e) => setNewCardForm(prev => ({ ...prev, bank: e.target.value }))}
                className="input-field text-xs bg-white dark:bg-slate-900"
              />
              <div>
                <label className="text-[10px] text-gray-500">Statement Generation Day (1–31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newCardForm.statementDay}
                  onChange={(e) => setNewCardForm(prev => ({ ...prev, statementDay: e.target.value }))}
                  className="input-field text-xs bg-white dark:bg-slate-900"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Grace Days After Statement (e.g. 20)</label>
                <input
                  type="number"
                  min="15"
                  max="30"
                  value={newCardForm.graceDaysAfterStatement}
                  onChange={(e) => setNewCardForm(prev => ({ ...prev, graceDaysAfterStatement: e.target.value }))}
                  className="input-field text-xs bg-white dark:bg-slate-900"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowAddCard(false)} className="btn-secondary text-xs">Cancel</button>
              <button type="submit" className="btn-primary text-xs">Save Card</button>
            </div>
          </form>
        )}

        {/* Top Recommendation Hero Card */}
        {bestCard && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-emerald-500/30 text-emerald-300 font-extrabold px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-emerald-400/40">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                AI Smart Pick: Maximum Yield & Float
              </span>
              <span className="text-xl font-black text-emerald-300">
                +{formatCurrency(bestCard.estimatedCashback)} Value
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white">{bestCard.card.name}</h3>
                <p className="text-xs text-emerald-200">{bestCard.card.bank} • {bestCard.card.specialPerks}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-right border border-white/10">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Interest-Free Float</span>
                <span className="text-base font-extrabold text-white">{bestCard.interestFreeDaysRemaining} Days</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px]">
              <div>
                <span className="text-gray-300 block">Reward Rate:</span>
                <strong className="text-emerald-300 font-bold">{bestCard.rewardRatePct}% Cashback/Points</strong>
              </div>
              <div>
                <span className="text-gray-300 block">Next Statement:</span>
                <strong className="text-white">{bestCard.formattedStatementDate}</strong>
              </div>
              <div>
                <span className="text-gray-300 block">Payment Due:</span>
                <strong className="text-amber-300">{bestCard.formattedDueDate}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Comparison List of All Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
              2. Ranked Card Comparison Matrix ({evaluatedCards.length} Cards)
            </h4>
            <span className="text-[10px] text-gray-400">Sorted by Combined Reward & Float Score</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {evaluatedCards.map((ec, idx) => {
              const isTop = idx === 0
              const progressPct = Math.min(100, Math.round((ec.interestFreeDaysRemaining / 50) * 100))

              return (
                <div
                  key={ec.card.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isTop
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-gray-900 dark:text-white">{ec.card.name}</strong>
                        {isTop && (
                          <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                            Best Choice
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        {ec.card.bank} • Next Bill: {ec.formattedStatementDate} • Due: <span className="font-semibold text-gray-800 dark:text-slate-200">{ec.formattedDueDate}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Cashback</span>
                        <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(ec.estimatedCashback)} ({ec.rewardRatePct}%)
                        </strong>
                      </div>

                      <div className="min-w-24">
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Float</span>
                        <strong className="text-xs font-bold text-gray-800 dark:text-slate-200">
                          {ec.interestFreeDaysRemaining} Days
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Grace period visual progress bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ec.interestFreeDaysRemaining > 35
                            ? 'bg-emerald-500'
                            : ec.interestFreeDaysRemaining > 20
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Smart Rules & Pro Tip */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2 text-[11px]">
          <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>The 50-Day Float Rule:</strong> Always make major purchases 1 to 2 days <em>after</em> your statement generation date. This gives you the maximum ~50 days of interest-free credit float before the due date, allowing your funds to earn interest in liquid mutual funds or high-yield savings accounts in the meantime.
          </span>
        </div>

        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Close</button>
        </div>
      </div>
    </Modal>
  )
}
