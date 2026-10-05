import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import SkeletonPage from '../components/SkeletonLoader'
import { retryFetch } from '../utils/retryFetch'
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency'
import { formatDate, formatTime, formatDateTime, today, currentTime } from '../utils/dateUtils'
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
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  History,
  Info,
  ChevronRight,
  Receipt,
  Eye,
  Check,
  RotateCcw,
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

const STANDARD_PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI (GPay / PhonePe / Paytm)', type: 'online' },
  { id: 'netbanking', name: 'Net Banking (IMPS / NEFT)', type: 'bank' },
  { id: 'salary_account', name: 'Salary Account Transfer', type: 'bank' },
  { id: 'credit_card', name: 'Credit Card', type: 'card' },
  { id: 'debit_card', name: 'Debit Card', type: 'card' },
  { id: 'cash', name: 'Cash Deposit', type: 'cash' },
]

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function generateSafeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID()
    } catch {}
  }
  return `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export default function Goals() {
  const { user } = useAuth()

  // Local storage backed goals with initial fallback
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem(`ft_cached_goals_${user?.id || 'default'}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_GOALS
  })

  const [sips, setSips] = useState(defaultSips)
  const [paymentMethods, setPaymentMethods] = useState(STANDARD_PAYMENT_METHODS)

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

  const [goalContributions, setGoalContributions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ft_goal_contributions') || '{}')
    } catch {
      return {}
    }
  })

  const [selectedSipId, setSelectedSipId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [selectedGoalForDetails, setSelectedGoalForDetails] = useState(null)
  const [activeGoal, setActiveGoal] = useState(null)
  const [editContributionTarget, setEditContributionTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteContributionTarget, setDeleteContributionTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  // Add / Edit Goal form
  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '0',
    target_date: '',
    category: 'Savings',
    notes: '',
  })

  // Add / Edit Money (Contribution) Form
  const [contributeForm, setContributeForm] = useState({
    amount: '',
    payment_method_id: '',
    payment_method_name: 'UPI (GPay / PhonePe / Paytm)',
    date: today(),
    time: currentTime(),
    notes: '',
  })

  // Helper to persist goals locally
  const persistGoalsLocally = useCallback((updatedGoals) => {
    setGoals(updatedGoals)
    try {
      localStorage.setItem(`ft_cached_goals_${user?.id || 'default'}`, JSON.stringify(updatedGoals))
    } catch {}
  }, [user])

  const fetchGoals = useCallback(async () => {
    if (!user) return
    setError('')
    try {
      const [goalsRes, sipsRes, pmRes] = await Promise.allSettled([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sips')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('payment_methods')
          .select('id, name, type')
          .eq('user_id', user.id)
          .order('name'),
      ])

      const savedNotes = (() => {
        try {
          return JSON.parse(localStorage.getItem('ft_goal_notes') || '{}')
        } catch {
          return {}
        }
      })()

      // If Supabase returned goals, merge them
      if (goalsRes.status === 'fulfilled' && goalsRes.value.data && goalsRes.value.data.length > 0) {
        const enrichedGoals = goalsRes.value.data.map((g) => ({
          ...g,
          notes: savedNotes[g.id] || g.notes || '',
        }))
        persistGoalsLocally(enrichedGoals)
      } else {
        // Fallback to local cache enriched with saved notes
        setGoals((prev) => {
          const list = prev.length > 0 ? prev : DEFAULT_GOALS
          return list.map((g) => ({
            ...g,
            notes: savedNotes[g.id] || g.notes || '',
          }))
        })
      }

      if (sipsRes.status === 'fulfilled' && sipsRes.value.data?.length) {
        setSips(sipsRes.value.data)
      }

      if (pmRes.status === 'fulfilled' && pmRes.value.data?.length) {
        setPaymentMethods(pmRes.value.data)
      }
    } catch {
      // Offline fallback: keep cached goals
    }
  }, [user, persistGoalsLocally])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4500)
  }

  // Aggregate stats
  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount || 0), 0)
  const totalSaved = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  // 1. SAVE / EDIT GOAL
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
      const payload = {
        user_id: user?.id || 'local-user',
        name: form.name.trim(),
        target_amount: parseFloat(form.target_amount) || 0,
        current_amount: parseFloat(form.current_amount) || 0,
        target_date: form.target_date || null,
        category: form.category || 'Savings',
      }

      let savedId = editTarget?.id

      if (editTarget?.id) {
        // Edit existing goal
        if (user && isUuid(editTarget.id)) {
          try {
            await supabase.from('goals').update(payload).eq('id', editTarget.id)
          } catch {}
        }
        const updated = goals.map((g) =>
          g.id === editTarget.id ? { ...g, ...payload, notes: form.notes } : g
        )
        persistGoalsLocally(updated)

        if (selectedGoalForDetails?.id === editTarget.id) {
          setSelectedGoalForDetails({ ...selectedGoalForDetails, ...payload, notes: form.notes })
        }
        flash('Financial Goal updated successfully!')
      } else {
        // Create new goal
        let newId = generateSafeId()
        if (user) {
          try {
            const { data, error: insErr } = await supabase.from('goals').insert(payload).select()
            if (!insErr && data?.[0]?.id) {
              newId = data[0].id
            }
          } catch {}
        }
        savedId = newId
        const newGoalObj = { id: newId, ...payload, notes: form.notes }
        persistGoalsLocally([newGoalObj, ...goals])
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

  // 2. OPEN CONTRIBUTE MODAL (FOR ADDING OR EDITING MONEY)
  const openContributeModal = (goal, contributionToEdit = null, e) => {
    if (e) e.stopPropagation()
    setActiveGoal(goal)
    setEditContributionTarget(contributionToEdit)

    if (contributionToEdit) {
      setContributeForm({
        amount: String(contributionToEdit.amount || ''),
        payment_method_id: contributionToEdit.payment_method_id || '',
        payment_method_name: contributionToEdit.payment_method || 'UPI (GPay / PhonePe / Paytm)',
        date: contributionToEdit.date || today(),
        time: contributionToEdit.time || currentTime(),
        notes: contributionToEdit.notes || '',
      })
    } else {
      const defaultPm = paymentMethods[0]
      setContributeForm({
        amount: '',
        payment_method_id: defaultPm?.id || '',
        payment_method_name: defaultPm?.name || 'UPI (GPay / PhonePe / Paytm)',
        date: today(),
        time: currentTime(),
        notes: '',
      })
    }
    setShowContributeModal(true)
  }

  // 3. HANDLE SUBMIT CONTRIBUTION (ADD OR EDIT)
  const handleContribute = async (e) => {
    e.preventDefault()
    const amt = parseFloat(contributeForm.amount)
    if (!amt || amt <= 0 || !activeGoal || saving) return

    setSaving(true)
    setError('')
    try {
      const finalTime = contributeForm.time || currentTime()
      const combinedDateTime = new Date(`${contributeForm.date}T${finalTime}:00`).toISOString()
      const existingGoalTxns = goalContributions[activeGoal.id] || []

      let newGoalCurrentAmount = parseFloat(activeGoal.current_amount || 0)

      if (editContributionTarget) {
        // Editing existing contribution: calculate delta
        const oldAmt = parseFloat(editContributionTarget.amount || 0)
        const diff = amt - oldAmt
        newGoalCurrentAmount = Math.max(0, newGoalCurrentAmount + diff)

        const updatedTxList = existingGoalTxns.map((c) => {
          if (c.id === editContributionTarget.id) {
            return {
              ...c,
              amount: amt,
              payment_method: contributeForm.payment_method_name || 'UPI',
              payment_method_id: contributeForm.payment_method_id || null,
              date: contributeForm.date,
              time: finalTime,
              notes: contributeForm.notes.trim(),
              created_at: combinedDateTime,
            }
          }
          return c
        })

        const updatedAll = {
          ...goalContributions,
          [activeGoal.id]: updatedTxList,
        }
        setGoalContributions(updatedAll)
        localStorage.setItem('ft_goal_contributions', JSON.stringify(updatedAll))

        // Update transaction in Supabase if UUID
        if (user && isUuid(editContributionTarget.id)) {
          try {
            await supabase.from('transactions').update({
              amount: amt,
              payment_method_id: contributeForm.payment_method_id || null,
              note: `🎯 Goal: ${activeGoal.name}${contributeForm.notes ? ` - ${contributeForm.notes.trim()}` : ''}`,
              date: contributeForm.date,
              created_at: combinedDateTime,
            }).eq('id', editContributionTarget.id)
          } catch {}
        }

        flash(`Contribution updated to ${formatCurrency(amt)}!`)
      } else {
        // Adding brand new contribution
        newGoalCurrentAmount = newGoalCurrentAmount + amt
        const newContributionId = isUuid(activeGoal.id) ? generateSafeId() : `gtx-${Date.now()}`

        // Try inserting to Supabase transactions
        if (user) {
          try {
            const txPayload = {
              user_id: user.id,
              type: 'expense',
              amount: amt,
              payment_method_id: contributeForm.payment_method_id || null,
              note: `🎯 Goal: ${activeGoal.name}${contributeForm.notes ? ` - ${contributeForm.notes.trim()}` : ''}`,
              date: contributeForm.date,
              created_at: combinedDateTime,
            }
            await supabase.from('transactions').insert(txPayload)
          } catch {}
        }

        const newContribution = {
          id: newContributionId,
          goal_id: activeGoal.id,
          amount: amt,
          payment_method: contributeForm.payment_method_name || 'UPI',
          payment_method_id: contributeForm.payment_method_id || null,
          date: contributeForm.date,
          time: finalTime,
          notes: contributeForm.notes.trim(),
          created_at: combinedDateTime,
        }

        const updatedGoalTxns = [newContribution, ...existingGoalTxns]
        const updatedAll = {
          ...goalContributions,
          [activeGoal.id]: updatedGoalTxns,
        }
        setGoalContributions(updatedAll)
        localStorage.setItem('ft_goal_contributions', JSON.stringify(updatedAll))

        const isTargetReached = newGoalCurrentAmount >= parseFloat(activeGoal.target_amount || 0)
        if (isTargetReached) {
          fireMilestoneConfetti()
          flash(`🎉 100% GOAL ACHIEVED! You reached your target milestone for ${activeGoal.name}!`)
        } else {
          flash(`Added ${formatCurrency(amt)} via ${contributeForm.payment_method_name} towards ${activeGoal.name}!`)
        }
      }

      // Update goal current_amount in Supabase if valid UUID
      if (user && isUuid(activeGoal.id)) {
        try {
          await supabase.from('goals').update({ current_amount: newGoalCurrentAmount }).eq('id', activeGoal.id)
        } catch {}
      }

      // Update goal in local state & storage
      const updatedGoals = goals.map((g) =>
        g.id === activeGoal.id ? { ...g, current_amount: newGoalCurrentAmount } : g
      )
      persistGoalsLocally(updatedGoals)

      if (selectedGoalForDetails?.id === activeGoal.id) {
        setSelectedGoalForDetails({ ...selectedGoalForDetails, current_amount: newGoalCurrentAmount })
      }

      setShowContributeModal(false)
      setActiveGoal(null)
      setEditContributionTarget(null)
    } catch (err) {
      setError(err?.message || 'Failed to record contribution.')
    } finally {
      setSaving(false)
    }
  }

  // 4. DELETE CONTRIBUTION
  const handleDeleteContribution = async () => {
    if (!deleteContributionTarget) return
    const { goalId, contribution } = deleteContributionTarget

    try {
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return

      const newAmt = Math.max(0, parseFloat(goal.current_amount || 0) - parseFloat(contribution.amount || 0))

      if (user && isUuid(goalId)) {
        try {
          await supabase.from('goals').update({ current_amount: newAmt }).eq('id', goalId)
        } catch {}
      }

      if (user && isUuid(contribution.id)) {
        try {
          await supabase.from('transactions').delete().eq('id', contribution.id)
        } catch {}
      }

      const filtered = (goalContributions[goalId] || []).filter((c) => c.id !== contribution.id)
      const updatedAll = { ...goalContributions, [goalId]: filtered }
      setGoalContributions(updatedAll)
      localStorage.setItem('ft_goal_contributions', JSON.stringify(updatedAll))

      const updatedGoals = goals.map((g) => (g.id === goalId ? { ...g, current_amount: newAmt } : g))
      persistGoalsLocally(updatedGoals)

      if (selectedGoalForDetails?.id === goalId) {
        setSelectedGoalForDetails({ ...selectedGoalForDetails, current_amount: newAmt })
      }

      flash('Contribution removed and goal balance adjusted.')
      setDeleteContributionTarget(null)
    } catch {
      setError('Failed to remove contribution.')
    }
  }

  // 5. DELETE GOAL
  const handleDeleteGoal = async () => {
    if (!deleteTarget?.id) return
    try {
      if (user && isUuid(deleteTarget.id)) {
        try {
          await supabase.from('goals').delete().eq('id', deleteTarget.id)
        } catch {}
      }

      const updatedGoals = goals.filter((g) => g.id !== deleteTarget.id)
      persistGoalsLocally(updatedGoals)

      // Clean up linked local storage
      const newLinks = { ...sipLinks }
      delete newLinks[deleteTarget.id]
      setSipLinks(newLinks)
      localStorage.setItem('ft_goal_sip_links', JSON.stringify(newLinks))

      const newNotes = { ...goalNotes }
      delete newNotes[deleteTarget.id]
      setGoalNotes(newNotes)
      localStorage.setItem('ft_goal_notes', JSON.stringify(newNotes))

      const newContribs = { ...goalContributions }
      delete newContribs[deleteTarget.id]
      setGoalContributions(newContribs)
      localStorage.setItem('ft_goal_contributions', JSON.stringify(newContribs))

      flash(`"${deleteTarget.name}" removed successfully.`)
      setDeleteTarget(null)
      if (selectedGoalForDetails?.id === deleteTarget.id) {
        setSelectedGoalForDetails(null)
      }
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
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
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
          const txHistory = goalContributions[goal.id] || []

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
            <div
              key={goal.id}
              onClick={() => setSelectedGoalForDetails(goal)}
              className="card flex flex-col justify-between hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer border border-emerald-50 dark:border-slate-800 group relative"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5 block">
                      {goal.category || 'Savings'}
                    </span>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {goal.name}
                    </h3>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                    isComplete
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : progress > 50
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {isComplete ? '🎉 Done' : `${progress.toFixed(0)}%`}
                  </span>
                </div>

                {goal.notes && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">{goal.notes}</p>
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

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <History className="h-3 w-3" /> Recorded Contributions:
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {txHistory.length} entries
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-gray-100 dark:border-slate-800"
              >
                <button
                  onClick={(e) => openContributeModal(goal, null, e)}
                  className="btn btn-primary text-xs flex-1 flex items-center justify-center gap-1 py-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Money
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedGoalForDetails(goal)
                  }}
                  className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="View Goal Details & Transactions"
                >
                  <Eye className="h-4 w-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
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
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Edit Goal"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(goal)
                  }}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Delete Goal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Goal Details & Transactions History Modal */}
      {selectedGoalForDetails && (
        <Modal
          isOpen={Boolean(selectedGoalForDetails)}
          onClose={() => setSelectedGoalForDetails(null)}
          title={`Goal Dossier: ${selectedGoalForDetails.name}`}
          maxWidth="max-w-3xl"
        >
          {(() => {
            const goal = goals.find(g => g.id === selectedGoalForDetails.id) || selectedGoalForDetails
            const target = parseFloat(goal.target_amount || 0)
            const current = parseFloat(goal.current_amount || 0)
            const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0
            const remaining = Math.max(target - current, 0)
            const isComplete = current >= target
            const contributions = goalContributions[goal.id] || []

            const linkedSipId = sipLinks[goal.id]
            const linkedSip = sips.find(s => s.id === linkedSipId)

            return (
              <div className="space-y-6">
                {/* Stats Header */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-2xl shadow-md space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                        {goal.category || 'Savings Goal'}
                      </span>
                      <h3 className="text-xl font-black mt-1 text-white">{goal.name}</h3>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isComplete ? 'bg-emerald-400 text-emerald-950' : 'bg-white/20 text-white'
                    }`}>
                      {isComplete ? '🎉 Milestone Complete' : `${progress.toFixed(1)}% Achieved`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                    <div className="p-2.5 bg-white/5 rounded-xl">
                      <p className="text-[11px] text-slate-300">Target Goal</p>
                      <p className="text-base sm:text-lg font-bold text-white">{formatCurrency(target)}</p>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl">
                      <p className="text-[11px] text-emerald-300">Total Saved</p>
                      <p className="text-base sm:text-lg font-bold text-emerald-400">{formatCurrency(current)}</p>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl">
                      <p className="text-[11px] text-amber-300">Remaining</p>
                      <p className="text-base sm:text-lg font-bold text-amber-300">{formatCurrency(remaining)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>{goal.target_date ? `Target: ${formatDate(goal.target_date)}` : 'No deadline'}</span>
                      <span>{remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Goal Fulfilled!'}</span>
                    </div>
                  </div>
                </div>

                {/* Notes & Linked SIP Info */}
                {(goal.notes || linkedSip) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {goal.notes && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                          <Info className="h-3.5 w-3.5 text-blue-500" /> Goal Notes
                        </span>
                        <p className="text-slate-600 dark:text-slate-400">{goal.notes}</p>
                      </div>
                    )}
                    {linkedSip && (
                      <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 mb-1">
                          <Link2 className="h-3.5 w-3.5 text-indigo-500" /> Linked Mutual Fund SIP
                        </span>
                        <p className="text-indigo-900 dark:text-indigo-200 font-semibold">{linkedSip.name}</p>
                        <p className="text-indigo-600 dark:text-indigo-400 text-[11px]">{formatCurrency(linkedSip.amount)}/month automated allocation</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Transactions / Contributions Table with BOTH Edit & Delete */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <History className="h-4 w-4 text-emerald-600" />
                      Goal Transactions & Contribution History ({contributions.length})
                    </h4>
                    <button
                      onClick={() => openContributeModal(goal, null)}
                      className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Money Now
                    </button>
                  </div>

                  {contributions.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      <Receipt className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No transaction contributions recorded yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click "Add Money Now" above to record a new payment contribution with date, time, and method.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-700">
                            <th className="py-2.5 px-3 text-left">Date & Time</th>
                            <th className="py-2.5 px-3 text-left">Payment Method</th>
                            <th className="py-2.5 px-3 text-left">Notes / Purpose</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {contributions.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {formatDate(c.date)}
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span>{formatTime(c.time || c.created_at)}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                  <Smartphone className="h-3 w-3 text-emerald-500" />
                                  {c.payment_method || 'Online'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                                {c.notes || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-sm">
                                +{formatCurrency(c.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Edit Contribution Button */}
                                  <button
                                    onClick={() => openContributeModal(goal, c)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                                    title="Edit Contribution (Amount, Date, Time, Payment Method, Notes)"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>

                                  {/* Delete Contribution Button */}
                                  <button
                                    onClick={() => setDeleteContributionTarget({ goalId: goal.id, contribution: c })}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                                    title="Delete Contribution"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
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
                      className="btn btn-secondary text-xs flex items-center gap-1 py-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit Goal
                    </button>
                    <button
                      onClick={() => setDeleteTarget(goal)}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Goal
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedGoalForDetails(null)}
                    className="btn btn-secondary text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )
          })()}
        </Modal>
      )}

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
                className="btn btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-xs cursor-pointer"
              >
                {saving ? 'Saving...' : editTarget ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Contribute Funds / Add or Edit Money Modal */}
      {showContributeModal && activeGoal && (
        <Modal
          isOpen={showContributeModal}
          onClose={() => {
            setShowContributeModal(false)
            setEditContributionTarget(null)
          }}
          title={
            editContributionTarget
              ? `Edit Contribution for ${activeGoal.name}`
              : `Add Money to ${activeGoal.name}`
          }
        >
          <form onSubmit={handleContribute} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="label">Contribution Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 5000"
                value={contributeForm.amount}
                onChange={(e) => setContributeForm({ ...contributeForm, amount: e.target.value })}
                className="input text-lg font-bold"
                autoFocus
                required
              />
            </div>

            {/* Quick Amount Pills */}
            <div className="flex flex-wrap gap-2">
              {[1000, 2500, 5000, 10000, 25000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setContributeForm({ ...contributeForm, amount: String(quick) })}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                  +{formatCurrencyShort(quick)}
                </button>
              ))}
            </div>

            {/* Payment Method */}
            <div>
              <label className="label">Payment Method</label>
              <select
                value={contributeForm.payment_method_id}
                onChange={(e) => {
                  const selectedId = e.target.value
                  const selectedObj = paymentMethods.find(pm => String(pm.id) === String(selectedId))
                  setContributeForm({
                    ...contributeForm,
                    payment_method_id: selectedId,
                    payment_method_name: selectedObj?.name || 'UPI',
                  })
                }}
                className="input text-xs"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Date & Time (Editable) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span>Date</span>
                </label>
                <input
                  type="date"
                  value={contributeForm.date}
                  onChange={(e) => setContributeForm({ ...contributeForm, date: e.target.value })}
                  className="input font-medium"
                  required
                />
              </div>

              <div>
                <label className="label flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>Time (Auto Recorded)</span>
                </label>
                <input
                  type="time"
                  value={contributeForm.time}
                  onChange={(e) => setContributeForm({ ...contributeForm, time: e.target.value })}
                  className="input font-mono font-medium"
                  required
                />
              </div>
            </div>

            {/* Notes (Optional) */}
            <div>
              <label className="label">Notes / Purpose (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Diwali bonus, Monthly savings allocation"
                value={contributeForm.notes}
                onChange={(e) => setContributeForm({ ...contributeForm, notes: e.target.value })}
                className="input"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowContributeModal(false)
                  setEditContributionTarget(null)
                }}
                className="btn btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                {saving
                  ? 'Saving...'
                  : editContributionTarget
                  ? 'Update Contribution'
                  : 'Add Contribution'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Goal Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Goal?"
        message={`Are you sure you want to remove "${deleteTarget?.name}"? All associated progress and data will be removed.`}
        confirmLabel="Delete Goal"
        danger
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Delete Contribution Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteContributionTarget)}
        title="Delete Contribution Entry?"
        message={`Are you sure you want to remove the ${formatCurrency(deleteContributionTarget?.contribution?.amount || 0)} contribution made on ${formatDate(deleteContributionTarget?.contribution?.date)}? Your goal's saved amount will be automatically adjusted.`}
        confirmLabel="Delete Entry"
        danger
        onConfirm={handleDeleteContribution}
        onCancel={() => setDeleteContributionTarget(null)}
      />
      </>
      )}
    </Layout>
  )
}
