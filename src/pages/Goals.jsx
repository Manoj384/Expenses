import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import SkeletonPage from '../components/SkeletonLoader'
import { retryFetch } from '../utils/retryFetch'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import defaultSips from '../data/default_sips.json'
import { fireMilestoneConfetti } from '../utils/confetti'
import {
  Target,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  Flag,
  Award,
  Link2,
  Layers,
  Clock,
} from 'lucide-react'

const DEFAULT_GOALS = [
  {
    id: 'goal-seed-1',
    name: '🛡️ 6-Month Emergency Fund',
    target_amount: 300000,
    current_amount: 112340,
    target_date: '2027-12-31',
    category: 'Emergency',
    notes: 'Liquid reserve for unexpected life expenses',
  },
  {
    id: 'goal-seed-2',
    name: '🚗 New Car Down Payment',
    target_amount: 400000,
    current_amount: 75000,
    target_date: '2028-06-30',
    category: 'Purchase',
    notes: 'Down payment for family car',
  },
  {
    id: 'goal-seed-3',
    name: '🏖️ International Vacation',
    target_amount: 150000,
    current_amount: 45000,
    target_date: '2027-08-15',
    category: 'Travel',
    notes: 'Family trip fund',
  },
]

export default function Goals() {
  const { user } = useAuth()

  const [goals, setGoals] = useState([])
  const [sips, setSips] = useState([])
  const [sipLinks, setSipLinks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ft_goal_sip_links') || '{}')
    } catch {
      return {}
    }
  })
  const [goalNotes, setGoalNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ft_goal_notes') || '{}')
    } catch {
      return {}
    }
  })
  const [selectedSipId, setSelectedSipId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [activeGoal, setActiveGoal] = useState(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '0',
    target_date: '',
    category: 'Savings',
    notes: '',
  })

  const fetchGoals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const [goalsRes, sipsRes] = await Promise.all([
        retryFetch(() =>
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ),
        supabase
          .from('sips')
          .select('*')
          .eq('user_id', user.id)
      ])

      if (goalsRes.error) throw goalsRes.error
      const savedNotes = (() => {
        try {
          return JSON.parse(localStorage.getItem('ft_goal_notes') || '{}')
        } catch {
          return {}
        }
      })()

      const enrichedGoals = (goalsRes.data || []).map((g) => ({
        ...g,
        notes: savedNotes[g.id] || g.notes || '',
      }))

      setGoals(enrichedGoals)
      setSips(sipsRes.data?.length ? sipsRes.data : defaultSips)
    } catch {
      setError('Unable to load goals. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])


  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Aggregate stats
  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount || 0), 0)
  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  const handleSaveGoal = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.target_amount) {
      setError('Please provide goal name and target amount.')
      return
    }
    if (saving) return

    setSaving(true)
    setError('')
    try {
      // Supabase payload only contains columns present in schema
      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        target_amount: parseFloat(form.target_amount) || 0,
        current_amount: parseFloat(form.current_amount) || 0,
        target_date: form.target_date || null,
        category: form.category || 'Savings',
      }

      let savedId = editTarget?.id
      if (editTarget?.id) {
        const { error: upErr } = await supabase
          .from('goals').update(payload).eq('id', editTarget.id)
        if (upErr) throw upErr
        setGoals(prev => prev.map(g => g.id === editTarget.id ? { ...g, ...payload, notes: form.notes } : g))
        flash('Financial Goal updated!')
      } else {
        const { data, error: insErr } = await supabase
          .from('goals').insert(payload).select()
        if (insErr) throw insErr
        savedId = data[0]?.id
        setGoals(prev => [{ ...data[0], notes: form.notes }, ...prev])
        flash('New Financial Goal created!')
      }

      // Persist SIP linkage & Notes locally
      if (savedId) {
        const updatedLinks = { ...sipLinks, [savedId]: selectedSipId || null }
        setSipLinks(updatedLinks)
        localStorage.setItem('ft_goal_sip_links', JSON.stringify(updatedLinks))

        const updatedNotes = { ...goalNotes, [savedId]: form.notes.trim() || null }
        setGoalNotes(updatedNotes)
        localStorage.setItem('ft_goal_notes', JSON.stringify(updatedNotes))
      }

      setShowAddModal(false)
      setEditTarget(null)
      setSelectedSipId('')
    } catch (err) {
      setError(err.message || 'Unable to save goal.')
    } finally {
      setSaving(false)
    }
  }

  const handleContribute = async (e) => {
    e.preventDefault()
    const amt = parseFloat(contributeAmount)
    if (!amt || amt <= 0 || !activeGoal || saving) return

    setSaving(true)
    try {
      const newAmt = parseFloat(activeGoal.current_amount || 0) + amt
      const isTargetReached = newAmt >= parseFloat(activeGoal.target_amount || 0)

      const { error: upErr } = await supabase
        .from('goals').update({ current_amount: newAmt }).eq('id', activeGoal.id)
      if (upErr) throw upErr
      setGoals(prev => prev.map(g => g.id === activeGoal.id ? { ...g, current_amount: newAmt } : g))

      if (isTargetReached) {
        fireMilestoneConfetti()
        flash(`🎉 100% GOAL ACHIEVED! You reached your milestone for ${activeGoal.name}!`)
      } else {
        flash(`Added ${formatCurrency(amt)} towards ${activeGoal.name}!`)
      }

      setShowContributeModal(false)
      setActiveGoal(null)
      setContributeAmount('')
    } catch {
      setError('Failed to record contribution.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGoal = async () => {
    if (!deleteTarget?.id) return
    try {
      const { error: delErr } = await supabase
        .from('goals').delete().eq('id', deleteTarget.id)
      if (delErr) throw delErr
      setGoals(prev => prev.filter(g => g.id !== deleteTarget.id))
      flash(`"${deleteTarget.name}" removed.`)
      setDeleteTarget(null)
    } catch {
      setError('Unable to delete goal.')

    }
  }

  return (
    <Layout title="Financial Goals Tracker">
      {error && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4">{error}</div>}
      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <SkeletonPage type="goals" />
      ) : (
      <>
      {/* Top Banner */}
      <div className="card mb-6 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 border-none shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5 mb-2">
              <Target className="h-3 w-3 text-emerald-400" />
              Target Goals & Milestones
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {formatCurrency(totalSaved)} <span className="text-sm font-normal text-teal-200">saved of {formatCurrency(totalTarget)}</span>
            </h2>
            <div className="w-full max-w-md bg-white/10 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-teal-200 mt-1.5 font-medium">
              {overallProgress.toFixed(1)}% Overall Goal Completion Across {goals.length} Goals
            </p>
          </div>

          <div>
            <button
              onClick={() => {
                setEditTarget(null)
                setForm({ name: '', target_amount: '', current_amount: '0', target_date: '', category: 'Savings', notes: '' })
                setShowAddModal(true)
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" /> Create New Goal
            </button>
          </div>
        </div>
      </div>

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const target = parseFloat(goal.target_amount || 0)
          const current = parseFloat(goal.current_amount || 0)
          const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0
          const remaining = Math.max(target - current, 0)
          const isComplete = current >= target

          // Months remaining calculation
          let monthlyReq = null
          if (goal.target_date && !isComplete) {
            const monthsLeft = Math.max(
              1,
              Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24 * 30.44))
            )
            monthlyReq = remaining / monthsLeft
          }

          // Linked SIP computation
          const linkedSipId = sipLinks[goal.id] || (goal.id === 'goal-seed-1' ? 'sip_motilal' : goal.id === 'goal-seed-2' ? 'sip_quant' : null)
          const linkedSip = sips.find(s => s.id === linkedSipId)
          let projectedMonths = 0
          let estGoalDate = ''
          if (linkedSip && linkedSip.amount > 0 && remaining > 0) {
            projectedMonths = Math.ceil(remaining / linkedSip.amount)
            const targetDateObj = new Date()
            targetDateObj.setMonth(targetDateObj.getMonth() + projectedMonths)
            estGoalDate = targetDateObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          }

          return (
            <div key={goal.id} className="card flex flex-col justify-between hover:shadow-md transition-shadow border border-emerald-50 dark:border-slate-800">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {goal.name}
                  </h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isComplete
                      ? 'bg-emerald-100 text-emerald-800'
                      : progress > 50
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isComplete ? '🎉 Done' : `${progress.toFixed(0)}%`}
                  </span>
                </div>

                {goal.notes && (
                  <p className="text-xs text-gray-500 mb-3">{goal.notes}</p>
                )}

                {/* Linked SIP Info Badge */}
                {linkedSip && (
                  <div className="mb-3 p-2 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-indigo-900/40 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 truncate max-w-[200px]" title={linkedSip.name}>
                        <Link2 className="h-3 w-3 text-indigo-500 shrink-0" /> {linkedSip.name}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white shrink-0">{formatCurrency(linkedSip.amount)}/mo</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Funded by SIP:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {isComplete ? 'Complete' : `~${projectedMonths} mo (${estGoalDate})`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1 my-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(current)}</span>
                    <span className="text-gray-500">{formatCurrency(target)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isComplete ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Insights / Timeline */}
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 pt-2 border-t border-gray-100 dark:border-slate-800">
                  {goal.target_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Target Date:
                      </span>
                      <span className="font-medium">{formatDate(goal.target_date)}</span>
                    </div>
                  )}

                  {monthlyReq && (
                    <div className="flex items-center justify-between font-semibold text-emerald-700 dark:text-emerald-400">
                      <span>Monthly Saving Needed:</span>
                      <span>{formatCurrency(monthlyReq)}/mo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setActiveGoal(goal)
                    setContributeAmount('')
                    setShowContributeModal(true)
                  }}
                  className="btn btn-primary text-xs flex-1 flex items-center justify-center gap-1 py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Funds
                </button>

                <button
                  onClick={() => {
                    setEditTarget(goal)
                    setSelectedSipId(sipLinks[goal.id] || '')
                    setForm({
                      name: goal.name,
                      target_amount: String(goal.target_amount),
                      current_amount: String(goal.current_amount || 0),
                      target_date: goal.target_date || '',
                      category: goal.category || 'Savings',
                      notes: goal.notes || '',
                    })
                    setShowAddModal(true)
                  }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeleteTarget(goal)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add / Edit Goal Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setSelectedSipId('')
          }}
          title={editTarget ? 'Edit Financial Goal' : 'Create Financial Goal'}
        >
          <form onSubmit={handleSaveGoal} className="space-y-4">
            <div>
              <label className="label">Goal Name</label>
              <input
                type="text"
                placeholder="e.g. 🏠 House Down Payment, 🎓 Higher Education"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Target Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={form.target_amount}
                  onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Already Saved (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.current_amount}
                  onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Target Date (Optional)</label>
                <input
                  type="date"
                  value={form.target_date}
                  onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input"
                >
                  <option value="Savings">Savings Reserve</option>
                  <option value="Emergency">Emergency Fund</option>
                  <option value="Purchase">Major Purchase</option>
                  <option value="Travel">Vacation / Travel</option>
                  <option value="Retirement">Retirement</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Link Monthly Mutual Fund SIP (Optional)</label>
              <select
                value={selectedSipId}
                onChange={(e) => setSelectedSipId(e.target.value)}
                className="input text-xs"
              >
                <option value="">-- No Linked SIP --</option>
                {sips.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatCurrency(s.amount)}/mo)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Directs this monthly SIP toward accelerating this goal milestone.
              </p>
            </div>

            <div>
              <label className="label">Notes / Motivation</label>
              <input
                type="text"
                placeholder="e.g. Target 20% down payment by Dec 2028"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-xs"
              >
                {saving ? 'Saving...' : editTarget ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Contribute Funds Modal */}
      {showContributeModal && activeGoal && (
        <Modal
          isOpen={showContributeModal}
          onClose={() => setShowContributeModal(false)}
          title={`Add Funds to ${activeGoal.name}`}
        >
          <form onSubmit={handleContribute} className="space-y-4">
            <div>
              <label className="label">Contribution Amount (₹)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                className="input"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-2">
              {[1000, 2500, 5000, 10000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setContributeAmount(String(quick))}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                >
                  +{formatCurrencyShort(quick)}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowContributeModal(false)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-xs"
              >
                {saving ? 'Saving...' : 'Add Contribution'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Goal?"
        message={`Are you sure you want to remove "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeleteTarget(null)}
      />
      </>
      )}
    </Layout>
  )
}
