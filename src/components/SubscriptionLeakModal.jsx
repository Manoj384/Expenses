import { useState, useMemo, useEffect } from 'react'
import Modal from './Modal'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import {
  Skull,
  Tv,
  Sparkles,
  Bot,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  ExternalLink,
  ShieldAlert,
  Coins,
  RefreshCw,
} from 'lucide-react'

const DEFAULT_SUBSCRIPTIONS = [
  { id: 'sub-1', name: 'Netflix Premium 4K', category: 'OTT', cost: 649, frequency: 'monthly', cancelUrl: 'https://www.netflix.com/youraccount', isZombie: true, active: true },
  { id: 'sub-2', name: 'Amazon Prime Video', category: 'OTT', cost: 125, frequency: 'monthly', cancelUrl: 'https://www.amazon.in/mc/manage', isZombie: false, active: true },
  { id: 'sub-3', name: 'Spotify Individual', category: 'Music', cost: 119, frequency: 'monthly', cancelUrl: 'https://www.spotify.com/account/subscription/', isZombie: false, active: true },
  { id: 'sub-4', name: 'YouTube Premium', category: 'OTT', cost: 149, frequency: 'monthly', cancelUrl: 'https://www.youtube.com/paid_memberships', isZombie: false, active: true },
  { id: 'sub-5', name: 'ChatGPT Plus (OpenAI)', category: 'SaaS / AI', cost: 1999, frequency: 'monthly', cancelUrl: 'https://chatgpt.com/#settings/Subscription', isZombie: false, active: true },
  { id: 'sub-6', name: 'Google One 100GB', category: 'Cloud', cost: 130, frequency: 'monthly', cancelUrl: 'https://one.google.com/storage', isZombie: false, active: true },
  { id: 'sub-7', name: 'Apple iCloud+ 50GB', category: 'Cloud', cost: 75, frequency: 'monthly', cancelUrl: 'https://appleid.apple.com', isZombie: true, active: true },
  { id: 'sub-8', name: 'Cult.fit / Gym Membership', category: 'Fitness', cost: 1500, frequency: 'monthly', cancelUrl: 'https://www.cult.fit', isZombie: true, active: true },
  { id: 'sub-9', name: 'Disney+ Hotstar Super', category: 'OTT', cost: 299, frequency: 'monthly', cancelUrl: 'https://www.hotstar.com/in/my-account', isZombie: true, active: true },
]

export default function SubscriptionLeakModal({ isOpen, onClose }) {
  const [subscriptions, setSubscriptions] = useState(() => {
    try {
      const saved = localStorage.getItem('ft_subscriptions_leak')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_SUBSCRIPTIONS
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [newSub, setNewSub] = useState({
    name: '',
    category: 'OTT',
    cost: '',
    frequency: 'monthly',
  })

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('ft_subscriptions_leak', JSON.stringify(subscriptions))
    } catch {}
  }, [subscriptions])

  // Active subscriptions calculation
  const activeSubs = useMemo(() => subscriptions.filter(s => s.active), [subscriptions])
  const cancelledSubs = useMemo(() => subscriptions.filter(s => !s.active), [subscriptions])

  const monthlyOutflow = useMemo(() => {
    return activeSubs.reduce((sum, s) => {
      const cost = Number(s.cost) || 0
      return sum + (s.frequency === 'yearly' ? cost / 12 : cost)
    }, 0)
  }, [activeSubs])

  const annualBurnRate = monthlyOutflow * 12

  const monthlySaved = useMemo(() => {
    return cancelledSubs.reduce((sum, s) => {
      const cost = Number(s.cost) || 0
      return sum + (s.frequency === 'yearly' ? cost / 12 : cost)
    }, 0)
  }, [cancelledSubs])

  // 10-Year Opportunity Cost: Compounding monthly burn rate at 12% p.a.
  const tenYearOpportunityCost = useMemo(() => {
    const monthlyRate = 0.12 / 12
    const totalMonths = 120
    if (monthlyOutflow <= 0) return 0
    return Math.round(
      monthlyOutflow * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate)
    )
  }, [monthlyOutflow])

  const zombieSubsCount = useMemo(() => {
    return activeSubs.filter(s => s.isZombie).length
  }, [activeSubs])

  const toggleSubStatus = (id) => {
    setSubscriptions(prev =>
      prev.map(s => (s.id === id ? { ...s, active: !s.active } : s))
    )
  }

  const deleteSub = (id) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id))
  }

  const handleAddSub = (e) => {
    e.preventDefault()
    if (!newSub.name.trim() || !newSub.cost) return
    const created = {
      id: `sub-${Date.now()}`,
      name: newSub.name.trim(),
      category: newSub.category,
      cost: Number(newSub.cost) || 0,
      frequency: newSub.frequency,
      isZombie: false,
      active: true,
      cancelUrl: '',
    }
    setSubscriptions(prev => [created, ...prev])
    setNewSub({ name: '', category: 'OTT', cost: '', frequency: 'monthly' })
    setShowAddForm(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Zombie Subscription & Digital Leak Detector" maxWidth="max-w-4xl">
      <div className="space-y-4 text-xs text-gray-700 dark:text-slate-300">
        {/* Top Hero Banner */}
        <div className="p-4 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white rounded-2xl border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 mb-1.5 border border-purple-500/30">
              <Skull className="h-3.5 w-3.5 text-purple-400" />
              Digital Leak & Recurring Subscription Intelligence
            </span>
            <h3 className="text-2xl font-black text-white">
              {formatCurrency(annualBurnRate)}/year
            </h3>
            <p className="text-xs text-purple-200/80 mt-0.5">
              {formatCurrency(monthlyOutflow)}/month recurring across {activeSubs.length} active digital services
            </p>
          </div>

          <div className="bg-white/10 dark:bg-slate-800/80 border border-white/15 p-3 rounded-2xl text-right min-w-[170px]">
            <span className="text-[10px] text-amber-300 uppercase tracking-wider block font-bold">
              10-Yr Compounded Loss (@12%)
            </span>
            <span className="text-xl font-black text-amber-400">
              {formatCurrency(tenYearOpportunityCost)}
            </span>
            <span className="text-[11px] text-gray-300 block">
              if invested in Equity SIP
            </span>
          </div>
        </div>

        {/* Zombie Leak Alert Summary */}
        {zombieSubsCount > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <strong className="text-amber-900 dark:text-amber-200 block font-bold">
                  {zombieSubsCount} Potential Zombie Subscriptions Flagged!
                </strong>
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  Multiple overlapping streaming platforms or high-cost auto-renewals detected.
                </span>
              </div>
            </div>
            {monthlySaved > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] whitespace-nowrap">
                🎉 Saving {formatCurrency(monthlySaved)}/mo
              </span>
            )}
          </div>
        )}

        {/* Action button to add custom subscription */}
        <div className="flex justify-between items-center pt-1">
          <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
            Detected Digital Charges & Memberships ({activeSubs.length} Active, {cancelledSubs.length} Cancelled)
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Subscription
          </button>
        </div>

        {/* Add subscription inline form */}
        {showAddForm && (
          <form onSubmit={handleAddSub} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Service Name (e.g. Disney+ Hotstar)"
                value={newSub.name}
                onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                className="input-field text-xs sm:col-span-2"
                required
              />
              <input
                type="number"
                placeholder="Cost (₹)"
                value={newSub.cost}
                onChange={e => setNewSub({ ...newSub, cost: e.target.value })}
                className="input-field text-xs font-bold"
                required
              />
              <select
                value={newSub.category}
                onChange={e => setNewSub({ ...newSub, category: e.target.value })}
                className="input-field text-xs"
              >
                <option value="OTT">OTT / Streaming</option>
                <option value="Music">Music</option>
                <option value="SaaS / AI">AI / SaaS</option>
                <option value="Cloud">Cloud Storage</option>
                <option value="Fitness">Fitness / Gym</option>
                <option value="Food / Delivery">Food Delivery</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary text-xs py-1 px-3">
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs py-1 px-4 font-bold">
                Save
              </button>
            </div>
          </form>
        )}
        {/* Subscriptions Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {subscriptions.map(sub => (
            <div
              key={sub.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                sub.active
                  ? sub.isZombie
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  : 'border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleSubStatus(sub.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    sub.active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-gray-200 text-gray-400 dark:bg-slate-800'
                  }`}
                  title={sub.active ? 'Click to Mark Cancelled & Save Money' : 'Click to Reactivate'}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className={`block truncate text-xs ${sub.active ? 'text-gray-900 dark:text-white' : 'line-through text-gray-400'}`}>
                      {sub.name}
                    </strong>
                    {sub.isZombie && sub.active && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                        Zombie
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    {sub.category} • {formatCurrency(sub.cost)}/{sub.frequency}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {sub.cancelUrl && sub.active && (
                  <a
                    href={sub.cancelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    title="Open Official Cancel Plan Page"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => deleteSub(sub.id)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Remove from list"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
          <button onClick={onClose} className="btn-primary text-xs px-5 py-2 font-bold">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}

