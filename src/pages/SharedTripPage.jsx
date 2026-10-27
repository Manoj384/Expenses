import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  Receipt,
  Sparkles,
  Paperclip,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HandCoins,
  Send,
  Download,
  Printer,
  Search,
  Lock,
  ArrowRight,
  AlertCircle,
  Clock,
  UserPlus,
  RefreshCw,
  QrCode,
  Share2,
  DollarSign,
  MessageSquare,
  UserCheck,
  FileText,
  Copy,
  Check,
  Activity,
  History,
  Tag,
} from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import AiReceiptScannerModal from '../components/AiReceiptScannerModal'
import ReceiptPreviewModal from '../components/ReceiptPreviewModal'
import SplitwisePrintableSummaryModal from '../components/SplitwisePrintableSummaryModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, today } from '../utils/dateUtils'
import { SUPPORTED_CURRENCIES, convertToInr } from '../utils/currencyConverter'
import {
  fetchSharedGroupByToken,
  updateSharedTripData,
  publishOrSyncSharedGroup,
  serializeGroupMetadata,
  syncPendingTripData,
  clearSharedTripCache,
} from '../features/splitwise/api/sharedTripService'
import { calculateTripBalances } from '../features/splitwise/utils/splitwiseCalculations'
import {
  getExpenseCategoryVisuals,
  groupExpensesByMonth,
  formatSplitwiseCurrency,
} from '../utils/splitwiseVisuals'

function formatTimeAgo(isoString) {
  if (!isoString) return 'Recent'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return String(isoString)

  const diffMs = Date.now() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 45) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return `${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()}`
}

export default function SharedTripPage() {
  const { shareToken } = useParams()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced' | 'syncing' | 'failed'
  const [hasPendingSync, setHasPendingSync] = useState(false)
  const [showClearCacheModal, setShowClearCacheModal] = useState(false)

  // Selected viewer identity (e.g. "I am Rahul")
  const [activeMemberId, setActiveMemberId] = useState(() => {
    try {
      return localStorage.getItem(`ft_shared_member_${shareToken}`) || 'all'
    } catch {
      return 'all'
    }
  })

  // Modals & form state
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showEditMemberModal, setShowEditMemberModal] = useState(false)
  const [showEditTripModal, setShowEditTripModal] = useState(false)
  const [showPrintableSummaryModal, setShowPrintableSummaryModal] = useState(false)
  const [showAiScannerModal, setShowAiScannerModal] = useState(false)
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState('')
  const [editExpenseTarget, setEditExpenseTarget] = useState(null)
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState(null)
  const [expandedExpenseId, setExpandedExpenseId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Member join & edit forms
  const [newMemberForm, setNewMemberForm] = useState({ name: '', phone: '' })
  const [editingMember, setEditingMember] = useState(null)

  // Trip details edit form
  const [editTripForm, setEditTripForm] = useState({ name: '', description: '', icon: '✈️' })

  // Settle form
  const [settleForm, setSettleForm] = useState({ from_id: '', to_id: '', amount: '', notes: '' })

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    currency: 'INR',
    date: today(),
    notes: '',
    receipt_url: '',
    receipt_name: '',
    payer_mode: 'single',
    paid_by_id: '',
    paid_by: {},
    split_type: 'equal',
    selected_members: [],
    exact_shares: {},
    percent_shares: {},
    ratio_shares: {},
  })

  const billFileInputRef = useRef(null)
  const lastLocalEditRef = useRef(0)

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Load shared group from backend or fallback cache
  const loadGroupData = useCallback(async (isSilent = false) => {
    if (isSilent && Date.now() - lastLocalEditRef.current < 15000) {
      return
    }

    if (!isSilent) setLoading(true)
    setIsRefreshing(true)
    setError('')
    try {
      const { group: loaded, error: fetchErr } = await fetchSharedGroupByToken(shareToken)
      if (fetchErr || !loaded) {
        setError(fetchErr || 'Shared trip not found.')
      } else {
        setGroup(prev => {
          if (!prev) return loaded
          // If local pending sync exists, safely merge remote changes to prevent overwriting
          const pending = localStorage.getItem(`ft_pending_sync_${shareToken}`)
          if (pending) {
            setHasPendingSync(true)
            const localExpIds = new Set((prev.expenses || []).map(e => e.id))
            const newRemoteExpenses = (loaded.expenses || []).filter(e => !localExpIds.has(e.id))
            return {
              ...loaded,
              ...prev,
              expenses: [...newRemoteExpenses, ...(prev.expenses || [])],
              activities: prev.activities?.length ? prev.activities : loaded.activities,
            }
          }
          if (prev?.expenses && loaded.expenses && loaded.expenses.length < prev.expenses.length) {
            return { ...loaded, expenses: prev.expenses }
          }
          return loaded
        })
      }
    } catch (err) {
      setError(err?.message || 'Unable to connect to trip ledger.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [shareToken])

  useEffect(() => {
    loadGroupData()
  }, [loadGroupData])

  // Track pending offline changes and attach online sync listener
  useEffect(() => {
    if (!shareToken) return
    const checkPending = () => {
      try {
        const pending = localStorage.getItem(`ft_pending_sync_${shareToken}`)
        setHasPendingSync(Boolean(pending))
      } catch {}
    }
    checkPending()
    window.addEventListener('online', checkPending)
    return () => window.removeEventListener('online', checkPending)
  }, [shareToken])

  const handleRetrySync = async () => {
    setSyncStatus('syncing')
    setError('')
    const res = await syncPendingTripData(shareToken)
    if (res.synced) {
      setSyncStatus('synced')
      setHasPendingSync(false)
      if (res.group) setGroup(res.group)
      flash('Cloud sync completed successfully!')
    } else {
      setSyncStatus('failed')
      setError('Sync attempt failed: ' + (res.error || 'Server unreachable. Will retry automatically.'))
    }
  }

  const handleClearCache = () => {
    clearSharedTripCache(shareToken)
    setHasPendingSync(false)
    setSyncStatus('synced')
    setShowClearCacheModal(false)
    flash('Offline trip cache cleared for this device.')
    loadGroupData(false)
  }

  // Shared links use the token-scoped Edge Function rather than direct table
  // subscriptions. Polling keeps collaborative views fresh without exposing rows.
  useEffect(() => {
    if (!shareToken) return
    const interval = setInterval(() => {
      loadGroupData(true)
    }, 10_000)
    return () => clearInterval(interval)
  }, [shareToken, loadGroupData])

  // Save selected member identity
  const handleSelectMember = (mId) => {
    setActiveMemberId(mId)
    try {
      localStorage.setItem(`ft_shared_member_${shareToken}`, mId)
    } catch {}
  }

  // Members & Expenses derived lists
  const members = useMemo(() => group?.members || [], [group])
  const expenses = useMemo(() => group?.expenses || [], [group])

  // Active viewer object
  const activeViewer = useMemo(() => {
    return members.find(m => m.id === activeMemberId) || null
  }, [members, activeMemberId])

  // Helper to append and persist an audit activity log
  const recordActivity = useCallback((actionText, type = 'info', details = '') => {
    const actorName = activeViewer?.name || (members[0]?.name ? `${members[0].name} (Owner)` : 'Someone')
    const newLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      actor: actorName,
      action: actionText,
      type,
      details,
      timestamp: new Date().toISOString(),
    }

    const currentActs = group?.activities || []
    const updatedActs = [newLog, ...currentActs].slice(0, 50)
    setGroup(prev => ({ ...prev, activities: updatedActs }))
    return updatedActs
  }, [activeViewer, members, group?.activities])

  // Derived combined activities (synthesized if no explicit logs exist)
  const displayActivities = useMemo(() => {
    const explicit = group?.activities || []
    if (explicit.length > 0) return explicit

    // Auto-synthesize from existing expenses if empty
    const synthesized = []
    expenses.forEach(exp => {
      const payerName = members.find(m => m.id === exp.paid_by_id)?.name || 'Someone'
      const isSettle = exp.is_settlement || exp.title?.includes('paid')
      synthesized.push({
        id: `synth_${exp.id}`,
        actor: payerName,
        action: isSettle ? exp.title : `Added expense "${exp.title}" (${formatCurrency(exp.amount)})`,
        type: isSettle ? 'settlement' : 'expense_add',
        timestamp: exp.date || new Date().toISOString(),
      })
    })
    return synthesized
  }, [group?.activities, expenses, members])

  // --- Financial Balances & Settlements Calculation Engine (Modular) ---
  const balanceDetails = useMemo(() => {
    if (!group) return { netBalances: {}, simplifiedDebts: [], totalSpend: 0, youNet: 0, youOwe: 0, youAreOwed: 0 }
    return calculateTripBalances(members, expenses, activeMemberId)
  }, [group, members, expenses, activeMemberId])

  // Dynamic Split Allocation Computations inside Expense Form
  const multiPayerAllocatedTotal = useMemo(() => {
    return Object.values(expenseForm.paid_by || {}).reduce((s, a) => s + (parseFloat(a) || 0), 0)
  }, [expenseForm.paid_by])

  const calculatedSplitShares = useMemo(() => {
    const rawAmt = parseFloat(expenseForm.amount) || 0
    const sel = expenseForm.selected_members || []
    if (rawAmt <= 0 || sel.length === 0) return { shares: {}, isValid: false, message: 'Enter an amount and select members.' }

    if (expenseForm.split_type === 'equal') {
      const count = sel.length
      const base = Math.floor((rawAmt / count) * 100) / 100
      let rem = Math.round((rawAmt - base * count) * 100) / 100
      const shares = {}
      sel.forEach((mId, idx) => {
        const extra = idx === 0 ? rem : 0
        shares[mId] = Math.round((base + extra) * 100) / 100
      })
      return { shares, isValid: true, message: `Split equally (${formatCurrency(base)} each)` }
    }

    if (expenseForm.split_type === 'exact') {
      const sum = sel.reduce((acc, mId) => acc + (parseFloat(expenseForm.exact_shares[mId]) || 0), 0)
      const diff = Math.round((rawAmt - sum) * 100) / 100
      const isValid = Math.abs(diff) < 0.05
      const shares = {}
      sel.forEach(mId => { shares[mId] = parseFloat(expenseForm.exact_shares[mId]) || 0 })
      return {
        shares,
        isValid,
        message: isValid ? 'Split matched!' : `${diff > 0 ? `₹${diff} remaining to allocate` : `Overallocated by ₹${Math.abs(diff)}`}`,
      }
    }

    if (expenseForm.split_type === 'percent') {
      const sumPct = sel.reduce((acc, mId) => acc + (parseFloat(expenseForm.percent_shares[mId]) || 0), 0)
      const isValid = Math.abs(sumPct - 100) < 0.1
      const shares = {}
      sel.forEach(mId => {
        const pct = parseFloat(expenseForm.percent_shares[mId]) || 0
        shares[mId] = Math.round(((rawAmt * pct) / 100) * 100) / 100
      })
      return {
        shares,
        isValid,
        message: isValid ? '100% Allocated!' : `${(100 - sumPct).toFixed(1)}% remaining`,
      }
    }

    return { shares: {}, isValid: false, message: '' }
  }, [expenseForm])

  // --- Handlers: Expense Create / Edit / Delete ---
  const openNewExpenseModal = () => {
    const defaultSelected = members.map(m => m.id)
    const initialExact = {}
    const initialPercent = {}
    const initialPaidBy = {}

    members.forEach(m => {
      initialExact[m.id] = ''
      initialPercent[m.id] = (100 / (members.length || 1)).toFixed(1)
      initialPaidBy[m.id] = ''
    })

    const defaultPayerId = activeMemberId !== 'all' ? activeMemberId : (members[0]?.id || '')

    setEditExpenseTarget(null)
    setExpenseForm({
      title: '',
      amount: '',
      currency: 'INR',
      date: today(),
      notes: '',
      receipt_url: '',
      receipt_name: '',
      payer_mode: 'single',
      paid_by_id: defaultPayerId,
      paid_by: initialPaidBy,
      split_type: 'equal',
      selected_members: defaultSelected,
      exact_shares: initialExact,
      percent_shares: initialPercent,
      ratio_shares: {},
    })
    setShowExpenseModal(true)
  }

  const openEditExpenseModal = (exp) => {
    const initialExact = {}
    const initialPercent = {}
    const initialPaidBy = {}

    members.forEach(m => {
      initialExact[m.id] = exp.shares?.[m.id] !== undefined ? String(exp.shares[m.id]) : ''
      initialPercent[m.id] = exp.shares?.[m.id] && exp.amount > 0
        ? ((exp.shares[m.id] / exp.amount) * 100).toFixed(1)
        : (100 / (members.length || 1)).toFixed(1)
      initialPaidBy[m.id] = exp.paid_by?.[m.id] !== undefined ? String(exp.paid_by[m.id]) : ''
    })

    const selectedMembers = exp.shares && Object.keys(exp.shares).length > 0
      ? Object.keys(exp.shares)
      : members.map(m => m.id)

    setEditExpenseTarget(exp)
    setExpenseForm({
      title: exp.title || '',
      amount: String(exp.amount || ''),
      currency: exp.currency || 'INR',
      date: exp.date || today(),
      notes: exp.notes || '',
      receipt_url: exp.receipt_url || '',
      receipt_name: exp.receipt_name || (exp.receipt_url ? 'Attached Receipt' : ''),
      payer_mode: exp.payer_mode || (exp.paid_by && Object.keys(exp.paid_by).length > 0 ? 'multiple' : 'single'),
      paid_by_id: exp.paid_by_id || (members[0]?.id || ''),
      paid_by: exp.paid_by || initialPaidBy,
      split_type: exp.split_type || 'equal',
      selected_members: selectedMembers,
      exact_shares: exp.exact_shares || initialExact,
      percent_shares: exp.percent_shares || initialPercent,
      ratio_shares: exp.ratio_shares || {},
    })
    setShowExpenseModal(true)
  }

  const handleSaveExpense = async (e) => {
    e.preventDefault()
    let rawAmt = parseFloat(expenseForm.amount)
    if (!expenseForm.title.trim() || !rawAmt || rawAmt <= 0) return

    const isForeign = expenseForm.currency && expenseForm.currency !== 'INR'
    const finalInrAmt = isForeign ? Math.round(convertToInr(rawAmt, expenseForm.currency)) : rawAmt

    if (expenseForm.payer_mode === 'multiple') {
      const diffPaid = Math.abs(rawAmt - multiPayerAllocatedTotal)
      if (diffPaid > 0.05) {
        setError('Upfront contributions do not match total bill amount.')
        return
      }
    }

    if (!calculatedSplitShares.isValid) {
      setError(calculatedSplitShares.message || 'Please check split allocations.')
      return
    }

    let finalShares = calculatedSplitShares.shares
    if (isForeign) {
      finalShares = {}
      Object.entries(calculatedSplitShares.shares).forEach(([k, v]) => {
        finalShares[k] = Math.round(convertToInr(v, expenseForm.currency))
      })
    }

    let updatedExpenses = []
    let logAction = ''

    if (editExpenseTarget) {
      const updatedItem = {
        ...editExpenseTarget,
        title: isForeign
          ? `${expenseForm.title.trim()} (${expenseForm.amount} ${expenseForm.currency})`
          : expenseForm.title.trim(),
        amount: finalInrAmt,
        currency: expenseForm.currency,
        date: expenseForm.date || today(),
        notes: expenseForm.notes || '',
        receipt_url: expenseForm.receipt_url || '',
        receipt_name: expenseForm.receipt_name || '',
        payer_mode: expenseForm.payer_mode,
        paid_by_id: expenseForm.payer_mode === 'single' ? expenseForm.paid_by_id : null,
        paid_by: expenseForm.payer_mode === 'multiple' ? expenseForm.paid_by : null,
        split_type: expenseForm.split_type,
        shares: finalShares,
      }
      updatedExpenses = expenses.map(e => e.id === editExpenseTarget.id ? updatedItem : e)
      logAction = `Updated expense "${updatedItem.title}" (${formatCurrency(finalInrAmt)})`
      flash(`Updated "${updatedItem.title}"!`)
    } else {
      const newItem = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: isForeign
          ? `${expenseForm.title.trim()} (${expenseForm.amount} ${expenseForm.currency})`
          : expenseForm.title.trim(),
        amount: finalInrAmt,
        currency: expenseForm.currency,
        date: expenseForm.date || today(),
        notes: expenseForm.notes || '',
        receipt_url: expenseForm.receipt_url || '',
        receipt_name: expenseForm.receipt_name || '',
        payer_mode: expenseForm.payer_mode,
        paid_by_id: expenseForm.payer_mode === 'single' ? expenseForm.paid_by_id : null,
        paid_by: expenseForm.payer_mode === 'multiple' ? expenseForm.paid_by : null,
        split_type: expenseForm.split_type,
        shares: finalShares,
      }
      updatedExpenses = [newItem, ...expenses]
      logAction = `Added expense "${newItem.title}" (${formatCurrency(finalInrAmt)})`
      flash(`Added "${newItem.title}" (${formatCurrency(finalInrAmt)})!`)
    }

    const updatedActs = recordActivity(logAction, editExpenseTarget ? 'expense_edit' : 'expense_add')
    lastLocalEditRef.current = Date.now()
    setGroup(prev => ({ ...prev, expenses: updatedExpenses, activities: updatedActs }))
    setShowExpenseModal(false)
    setEditExpenseTarget(null)

    setSyncStatus('syncing')
    const syncRes = await updateSharedTripData(shareToken, { expenses: updatedExpenses, activities: updatedActs })
    if (syncRes?.synced) {
      setSyncStatus('synced')
      setHasPendingSync(false)
    } else {
      setSyncStatus('failed')
      setHasPendingSync(true)
    }
  }

  const handleDeleteExpense = async () => {
    if (!deleteExpenseTarget) return
    const logAction = `Deleted expense "${deleteExpenseTarget.title}" (${formatCurrency(deleteExpenseTarget.amount)})`
    const updatedActs = recordActivity(logAction, 'expense_delete')

    lastLocalEditRef.current = Date.now()
    const updated = expenses.filter(e => e.id !== deleteExpenseTarget.id)
    setGroup(prev => ({ ...prev, expenses: updated, activities: updatedActs }))
    setDeleteExpenseTarget(null)
    flash('Expense removed.')

    setSyncStatus('syncing')
    const syncRes = await updateSharedTripData(shareToken, { expenses: updated, activities: updatedActs })
    if (syncRes?.synced) {
      setSyncStatus('synced')
      setHasPendingSync(false)
    } else {
      setSyncStatus('failed')
      setHasPendingSync(true)
    }
  }

  // --- Handlers: Settle Up ---
  const handleSettleUp = async (e) => {
    e.preventDefault()
    const amt = parseFloat(settleForm.amount)
    if (!settleForm.from_id || !settleForm.to_id || !amt || amt <= 0) return

    const payer = members.find(m => m.id === settleForm.from_id)?.name || 'Someone'
    const recipient = members.find(m => m.id === settleForm.to_id)?.name || 'Someone'

    const settlementExpense = {
      id: `exp_settle_${Date.now()}`,
      title: `${payer} paid ${recipient}`,
      is_settlement: true,
      amount: amt,
      currency: 'INR',
      date: today(),
      notes: settleForm.notes || `Settlement: ${payer} paid ${recipient}`,
      payer_mode: 'single',
      paid_by_id: settleForm.from_id,
      split_type: 'exact',
      shares: {
        [settleForm.to_id]: amt,
      },
    }

    const logAction = `Recorded settlement: ${payer} paid ${recipient} ${formatCurrency(amt)}`
    const updatedActs = recordActivity(logAction, 'settlement')

    lastLocalEditRef.current = Date.now()
    const updated = [settlementExpense, ...expenses]
    setGroup(prev => ({ ...prev, expenses: updated, activities: updatedActs }))
    setShowSettleModal(false)
    setSettleForm({ from_id: '', to_id: '', amount: '', notes: '' })
    flash(`Recorded settlement payment of ${formatCurrency(amt)}!`)

    setSyncStatus('syncing')
    const syncRes = await updateSharedTripData(shareToken, { expenses: updated, activities: updatedActs })
    if (syncRes?.synced) {
      setSyncStatus('synced')
      setHasPendingSync(false)
    } else {
      setSyncStatus('failed')
      setHasPendingSync(true)
    }
  }

  // --- Handler: Edit Trip Name, Icon & Description ---
  const handleOpenEditTrip = () => {
    setEditTripForm({
      name: group?.name || '',
      description: group?.description || '',
      icon: group?.icon || '✈️',
    })
    setShowEditTripModal(true)
  }

  const handleSaveTripEdit = async (e) => {
    e.preventDefault()
    if (!editTripForm.name.trim()) return

    const newName = editTripForm.name.trim()
    const newDesc = (editTripForm.description || '').trim()
    const newIcon = editTripForm.icon || '✈️'
    const oldName = group?.name || 'Trip'

    const logAction = oldName !== newName
      ? `Renamed trip from "${oldName}" to "${newName}"`
      : `Updated trip details & icon`

    const updatedActs = recordActivity(logAction, 'trip_edit')

    lastLocalEditRef.current = Date.now()
    setGroup(prev => ({
      ...prev,
      name: newName,
      icon: newIcon,
      description: newDesc,
      activities: updatedActs,
    }))
    setShowEditTripModal(false)
    flash(`Trip updated to "${newName}"!`)

    setSyncStatus('syncing')
    const syncRes = await updateSharedTripData(shareToken, {
      name: newName,
      icon: newIcon,
      description: newDesc,
      activities: updatedActs,
    })
    if (syncRes?.synced) {
      setSyncStatus('synced')
      setHasPendingSync(false)
    } else {
      setSyncStatus('failed')
      setHasPendingSync(true)
    }
  }

  // --- Handler: Add / Join as new member to this trip ---
  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!newMemberForm.name.trim()) return

    const bgColors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600', 'bg-indigo-600']
    const newMember = {
      id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newMemberForm.name.trim(),
      phone: newMemberForm.phone.trim(),
      isOwner: false,
      avatarBg: bgColors[Math.floor(Math.random() * bgColors.length)],
    }

    const logAction = `Added new member "${newMember.name}" to trip`
    const updatedActs = recordActivity(logAction, 'member_add')

    const updatedMembers = [...members, newMember]
    setGroup(prev => ({ ...prev, members: updatedMembers, activities: updatedActs }))
    setShowAddMemberModal(false)
    setNewMemberForm({ name: '', phone: '' })
    handleSelectMember(newMember.id)
    flash(`Added "${newMember.name}" to trip members!`)

    setSyncStatus('syncing')
    const syncRes = await updateSharedTripData(shareToken, { members: updatedMembers, activities: updatedActs })
    if (syncRes?.synced) {
      setSyncStatus('synced')
      setHasPendingSync(false)
    } else {
      setSyncStatus('failed')
      setHasPendingSync(true)
    }
  }

  // --- Handler: Edit Member Name & Phone ---
  const handleStartEditMember = (m) => {
    setEditingMember({ id: m.id, name: m.name || '', phone: m.phone || '' })
    setShowEditMemberModal(true)
  }

  const handleSaveMemberEdit = async (e) => {
    e.preventDefault()
    if (!editingMember || !editingMember.name.trim()) return

    const trimmedName = editingMember.name.trim()
    const trimmedPhone = (editingMember.phone || '').trim()
    const oldName = members.find(m => m.id === editingMember.id)?.name || 'Member'

    const logAction = `Renamed member "${oldName}" ➔ "${trimmedName}"`
    const updatedActs = recordActivity(logAction, 'member_edit')

    const updatedMembers = members.map(m =>
      m.id === editingMember.id ? { ...m, name: trimmedName, phone: trimmedPhone } : m
    )

    lastLocalEditRef.current = Date.now()
    setGroup(prev => ({ ...prev, members: updatedMembers, activities: updatedActs }))
    setShowEditMemberModal(false)
    setEditingMember(null)
    flash(`Member name updated to "${trimmedName}"!`)

    setSyncStatus('syncing')
    const syncRes = await updateSharedTripData(shareToken, { members: updatedMembers, activities: updatedActs })
    if (syncRes?.synced) {
      setSyncStatus('synced')
      setHasPendingSync(false)
    } else {
      setSyncStatus('failed')
      setHasPendingSync(true)
    }
  }

  // --- Handler: Delete Empty Member ---
  const handleDeleteMember = async (memberId) => {
    const mem = members.find(m => m.id === memberId)
    const hasExpenses = expenses.some(e => e.paid_by_id === memberId || (e.paid_by && e.paid_by[memberId]))
    const hasShares = expenses.some(e => e.shares && Number(e.shares[memberId]) > 0)

    if (hasExpenses || hasShares) {
      setError('Cannot delete a member who has expenses or shares. Settle up or reallocate first.')
      return
    }

    const logAction = `Removed member "${mem?.name || 'Someone'}"`
    const updatedActs = recordActivity(logAction, 'member_delete')

    const updatedMembers = members.filter(m => m.id !== memberId)
    lastLocalEditRef.current = Date.now()
    setGroup(prev => ({ ...prev, members: updatedMembers, activities: updatedActs }))
    if (activeMemberId === memberId) {
      handleSelectMember('all')
    }
    flash('Member removed.')

    setSyncStatus('syncing')
    const syncRes = await updateSharedTripData(shareToken, { members: updatedMembers, activities: updatedActs })
    if (syncRes?.synced) {
      setSyncStatus('synced')
      setHasPendingSync(false)
    } else {
      setSyncStatus('failed')
      setHasPendingSync(true)
    }
  }

  // Handle Bill Receipt File Upload with validation
  const handleBillFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
      setError('Bill file size must be between 1 byte and 8MB.')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
    if (!allowedExts.includes(ext) || (file.type && !allowedMimes.includes(file.type.toLowerCase()))) {
      setError('Please select a valid image (JPEG, PNG, WebP) or PDF receipt.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setExpenseForm(prev => ({
        ...prev,
        receipt_url: reader.result,
        receipt_name: file.name,
      }))
    }
    reader.readAsDataURL(file)
  }

  // Handle AI Scan Result Extracted
  const handleApplyAiScan = ({ amount, date, note, previewUrl, file }) => {
    setExpenseForm(prev => ({
      ...prev,
      amount: amount ? String(amount) : prev.amount,
      date: date || prev.date,
      title: note || prev.title,
      receipt_url: previewUrl || prev.receipt_url,
      receipt_name: file?.name || 'Scanned Bill',
    }))
    flash('AI OCR scan applied! Verify allocations below.')
  }

  // Filtered expense ledger by search query
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses
    const q = searchQuery.toLowerCase()
    return expenses.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.notes?.toLowerCase().includes(q) ||
      String(e.amount).includes(q)
    )
  }, [expenses, searchQuery])

  // Grouped expenses by Month & Year for Splitwise signature grouping
  const expensesByMonth = useMemo(() => {
    return groupExpensesByMonth(filteredExpenses)
  }, [filteredExpenses])

  // WhatsApp quick payment reminder link
  const getWhatsAppLink = (debt) => {
    const fromMember = debt.from
    const amt = debt.amount
    const msg = encodeURIComponent(
      `Hey ${fromMember.name}! Regarding our "${group?.icon || '🏖️'} ${group?.name}" trip expenses, your outstanding split share is ${formatCurrency(amt)}. Let's settle up via UPI whenever convenient!`
    )
    return fromMember.phone
      ? `https://api.whatsapp.com/send?phone=${fromMember.phone.replace(/[^0-9]/g, '')}&text=${msg}`
      : `https://api.whatsapp.com/send?text=${msg}`
  }

  // Copy share link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
    flash('Shared trip link copied to clipboard!')
  }

  // CSV Export for this trip
  const handleExportCsv = () => {
    if (expenses.length === 0) return
    let csv = 'Date,Title,Amount,Paid By,Split Type,Receipt\n'
    expenses.forEach(e => {
      const payer = e.payer_mode === 'single'
        ? (members.find(m => m.id === e.paid_by_id)?.name || 'Someone')
        : 'Multiple'
      csv += `"${e.date}","${e.title.replace(/"/g, '""')}",${e.amount},"${payer}","${e.split_type}","${e.receipt_name || ''}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group.name.replace(/[^a-zA-Z0-9]/g, '_')}_expenses.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-6">
        <LoadingSpinner text="Connecting to Shared Trip Ledger..." />
      </div>
    )
  }

  if (error && !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-6">
        <div className="card max-w-md w-full p-6 text-center space-y-4 shadow-lg border border-red-100 dark:border-red-900/40">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Trip Link Not Found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{error}</p>
          </div>
          <Link to="/" className="btn-primary text-xs py-2 px-4 block">
            Return to Finance Tracker
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-950 text-gray-900 dark:text-white antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#e53935] text-white flex items-center justify-center text-base font-bold shadow-xs">
              {group.icon || '✈️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                  {group.name}
                </h1>
                <button
                  onClick={handleOpenEditTrip}
                  className="p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md"
                  title="Rename trip"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  hasPendingSync
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : syncStatus === 'syncing'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {hasPendingSync ? 'Sync Pending' : syncStatus === 'syncing' ? 'Syncing...' : 'Live Trip Sync'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                {group.description || `${members.length} people sharing expenses`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
              title="Copy trip share link"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share Link'}</span>
            </button>
            <button
              onClick={() => loadGroupData(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowClearCacheModal(true)}
              className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Clear offline cache for this trip"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Pending Sync Sticky Bar */}
        {hasPendingSync && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse" />
              <span><strong>Offline / Cloud sync pending:</strong> Changes are saved locally on this browser. Click to sync to cloud.</span>
            </div>
            <button
              onClick={handleRetrySync}
              disabled={syncStatus === 'syncing'}
              className="btn btn-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-3 py-1.5 flex items-center gap-1.5 font-bold shadow-xs transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Syncing...' : 'Retry Cloud Sync'}
            </button>
          </div>
        )}
        {/* Alerts */}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 3-Column Responsive Layout: Left (Members), Center (Ledger), Right (Recent Activity Logs) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ============================================================ */}
          {/* LEFT PANEL (lg:col-span-3): Members List, Edit Names, Settle */}
          {/* ============================================================ */}
          <div className="lg:col-span-3 space-y-5">

            {/* Trip Identity & Perspective Selector */}
            <div className="card p-4 space-y-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  Viewer Perspective
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  {activeMemberId === 'all' ? 'All Members' : activeViewer?.name || 'Selected'}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-slate-300 block">
                  Select who you are:
                </label>
                <select
                  value={activeMemberId}
                  onChange={(e) => handleSelectMember(e.target.value)}
                  className="input-field text-xs font-bold py-2 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                >
                  <option value="all">👀 Group Overview (Everyone)</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>👤 {m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TRIP MEMBERS LIST (WITH EDIT NAME CAPABILITY) */}
            <div className="card p-4 space-y-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-800 dark:text-slate-200">
                    Members ({members.length})
                  </h3>
                </div>

                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="text-[11px] font-extrabold text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {members.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400">
                  No members added yet. Click "+ Add" to invite friends.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {members.map(m => {
                    const netBal = balanceDetails.netBalances[m.id] || 0
                    const isPositive = netBal > 0.05
                    const isNegative = netBal < -0.05
                    const isActive = activeMemberId === m.id

                    return (
                      <div
                        key={m.id}
                        className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-between gap-2 text-xs ${
                          isActive
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div
                          onClick={() => handleSelectMember(m.id)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                          title="Click to view ledger as this person"
                        >
                          <div className={`w-8 h-8 rounded-full ${m.avatarBg || 'bg-emerald-600'} text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs`}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <strong className="text-gray-900 dark:text-white block truncate text-xs">
                              {m.name}
                            </strong>
                            <div className="text-[10px]">
                              {isPositive ? (
                                <span className="text-emerald-600 font-extrabold">gets back {formatCurrency(netBal)}</span>
                              ) : isNegative ? (
                                <span className="text-[#e53935] font-extrabold">owes {formatCurrency(Math.abs(netBal))}</span>
                              ) : (
                                <span className="text-gray-400">settled up</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Member Action Buttons: Edit Name & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEditMember(m)
                            }}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit member name / phone"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteMember(m.id)
                            }}
                            className="p-1.5 text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SIMPLIFIED SETTLEMENT PATHS */}
            <div className="card p-4 space-y-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <HandCoins className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-800 dark:text-slate-200">
                    Settlements ({balanceDetails.simplifiedDebts.length})
                  </h3>
                </div>

                <button
                  onClick={() => {
                    setSettleForm({
                      from_id: balanceDetails.simplifiedDebts[0]?.from.id || '',
                      to_id: balanceDetails.simplifiedDebts[0]?.to.id || '',
                      amount: String(balanceDetails.simplifiedDebts[0]?.amount || ''),
                      notes: 'Settlement payment',
                    })
                    setShowSettleModal(true)
                  }}
                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  Record
                </button>
              </div>

              {balanceDetails.simplifiedDebts.length === 0 ? (
                <div className="py-3 text-center space-y-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-gray-600 dark:text-slate-300">All dues are settled!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {balanceDetails.simplifiedDebts.map((debt, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <strong className="text-[#ff652f] truncate text-[11px]">{debt.from.name}</strong>
                          <span className="text-gray-400 text-[9px]">owes</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 truncate text-[11px]">{debt.to.name}</strong>
                        </div>
                        <span className="font-extrabold text-gray-900 dark:text-white font-mono text-xs">
                          {formatCurrency(debt.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={getWhatsAppLink(debt)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-[#25D366] text-white rounded-lg hover:bg-[#20ba59]"
                          title="Send WhatsApp reminder"
                        >
                          <Send className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QUICK ACTIONS: STATEMENT & EXPORT */}
            <div className="card p-3.5 space-y-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setShowPrintableSummaryModal(true)}
                className="w-full btn-secondary py-2 px-3 flex items-center justify-center gap-2 font-bold text-gray-700 dark:text-slate-200"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-600" />
                <span>Printable Summary (PDF)</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="w-full btn-secondary py-2 px-3 flex items-center justify-center gap-2 font-bold text-gray-700 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span>Download Spreadsheet (CSV)</span>
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CENTER PANEL (lg:col-span-6): Header, Balances & Expenses Feed */}
          {/* ============================================================ */}
          <div className="lg:col-span-6 space-y-5">

            {/* GROUP BANNER (EXACT REPLICA OF SCREENSHOT HEADER WITH EDIT TRIP BUTTON) */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {/* Airplane / Group Category Red Circle Badge */}
                <div className="w-12 h-12 rounded-full bg-[#e53935] text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
                  {group.icon || '✈️'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">
                      {group.name}
                    </h2>
                    <button
                      onClick={handleOpenEditTrip}
                      className="p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      title="Edit trip name & icon"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                    {members.length} people
                  </p>
                </div>
              </div>

              {/* Signature Orange & Teal Buttons (Splitwise Official) */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={openNewExpenseModal}
                  className="bg-[#ff652f] hover:bg-[#e8531f] text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add an expense</span>
                </button>

                <button
                  onClick={() => {
                    setSettleForm({
                      from_id: balanceDetails.simplifiedDebts[0]?.from.id || members[1]?.id || '',
                      to_id: balanceDetails.simplifiedDebts[0]?.to.id || members[0]?.id || '',
                      amount: String(balanceDetails.simplifiedDebts[0]?.amount || ''),
                      notes: 'Settlement payment',
                    })
                    setShowSettleModal(true)
                  }}
                  className="bg-[#5bc5a7] hover:bg-[#48b294] text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <HandCoins className="h-4 w-4" />
                  <span>Settle up</span>
                </button>
              </div>
            </div>

            {/* SPLITWISE 3-BOX BALANCE BAR */}
            <div className="grid grid-cols-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden divide-x divide-gray-100 dark:divide-slate-800 text-center">
              <div className="p-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Total Spend
                </span>
                <p className="text-sm sm:text-lg font-black text-gray-900 dark:text-white mt-0.5">
                  {formatCurrency(balanceDetails.totalSpend)}
                </p>
              </div>

              <div className="p-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {activeMemberId === 'all' ? 'Pending Debts' : 'You Owe'}
                </span>
                <p className="text-sm sm:text-lg font-black text-[#ff652f] mt-0.5">
                  {formatCurrency(activeMemberId === 'all' ? balanceDetails.simplifiedDebts.reduce((s, d) => s + d.amount, 0) : balanceDetails.youOwe)}
                </p>
              </div>

              <div className="p-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {activeMemberId === 'all' ? 'Active Members' : 'You Are Owed'}
                </span>
                <p className="text-sm sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {activeMemberId === 'all' ? members.length : formatCurrency(balanceDetails.youAreOwed)}
                </p>
              </div>
            </div>

            {/* EXPENSES LIST GROUPED BY MONTH (MATCHES SCREENSHOT) */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              {Object.keys(expensesByMonth).length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Receipt className="h-10 w-10 text-gray-300 mx-auto" />
                  <p className="text-sm font-bold text-gray-600 dark:text-slate-300">
                    No expenses recorded for this trip yet.
                  </p>
                  <button
                    onClick={openNewExpenseModal}
                    className="btn-primary text-xs py-2 px-4 bg-[#ff652f] hover:bg-[#e8531f] border-none font-extrabold"
                  >
                    Add First Expense
                  </button>
                </div>
              ) : (
                Object.entries(expensesByMonth).map(([monthYear, monthExpenses]) => (
                  <div key={monthYear}>
                    {/* Month Header Row with "View printable summary" Link */}
                    <div className="bg-[#f2f4f6] dark:bg-slate-800/80 px-4 py-2 flex items-center justify-between border-b border-gray-200 dark:border-slate-700">
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                        {monthYear}
                      </span>
                      <button
                        onClick={() => setShowPrintableSummaryModal(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        <span>View printable summary</span>
                      </button>
                    </div>

                    {/* Expenses under this month */}
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                      {monthExpenses.map(exp => {
                        const isExpanded = expandedExpenseId === exp.id
                        const isSettle =
                          exp.is_settlement === true ||
                          exp.id?.startsWith('exp_settle') ||
                          exp.title?.startsWith('🤝') ||
                          exp.title?.toLowerCase().includes(' paid ')

                        const expDate = new Date(exp.date || Date.now())
                        const monthAbbr = expDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()
                        const dayNum = String(expDate.getDate()).padStart(2, '0')

                        // Payer name
                        const payer = exp.payer_mode === 'single'
                          ? (members.find(m => m.id === exp.paid_by_id) || { name: 'Someone' })
                          : { name: 'Multiple people' }

                        // Calculations relative to active viewer
                        const activeShare = exp.shares?.[activeMemberId] || 0
                        const isActivePayer = exp.payer_mode === 'single' && exp.paid_by_id === activeMemberId
                        const youLent = isActivePayer ? (Number(exp.amount) - activeShare) : 0
                        const youBorrowed = !isActivePayer && activeShare > 0 ? activeShare : 0

                        // Category visuals (pastel icon square)
                        const categoryVisuals = getExpenseCategoryVisuals(exp.title, exp.notes)
                        const CategoryIcon = categoryVisuals.icon

                        // If it's a settlement payment item
                        if (isSettle) {
                          return (
                            <div
                              key={exp.id}
                              onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                              className="p-3 hover:bg-gray-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#5bc5a7] text-white flex items-center justify-center shrink-0">
                                  <DollarSign className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-gray-800 dark:text-slate-200 truncate">
                                  {exp.title} INR{Number(exp.amount).toFixed(2)}
                                </span>
                              </div>

                              <div className="text-right text-gray-400 text-[11px] font-medium shrink-0 italic">
                                not involved
                              </div>
                            </div>
                          )
                        }

                        // Regular Expense Row (Matches Screenshot 2026-10-22 200231.png)
                        return (
                          <div key={exp.id} className="group">
                            <div
                              onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                              className="p-3 hover:bg-gray-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              {/* Left: Date Badge + Category Icon + Title */}
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Date Badge */}
                                <div className="flex flex-col items-center justify-center w-8 text-center shrink-0 leading-tight">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                    {monthAbbr}
                                  </span>
                                  <span className="text-base font-bold text-gray-600 dark:text-slate-300">
                                    {dayNum}
                                  </span>
                                </div>

                                {/* Category Pastel Square Icon */}
                                <div className={`w-9 h-9 rounded-lg ${categoryVisuals.bgClass} ${categoryVisuals.textClass} flex items-center justify-center shrink-0 border ${categoryVisuals.borderClass}`}>
                                  <CategoryIcon className="h-4 w-4" />
                                </div>

                                {/* Title & Note/Bill Indicators */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-gray-900 dark:text-white truncate text-xs sm:text-sm">
                                      {exp.title}
                                    </span>
                                    {exp.notes && (
                                      <MessageSquare className="h-3 w-3 text-gray-400 shrink-0" title="Has notes" />
                                    )}
                                    {exp.receipt_url && (
                                      <Paperclip className="h-3 w-3 text-blue-500 shrink-0" title="Bill attached" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Columns: [Payer Column] & [Lent/Borrowed Column] */}
                              <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                                {/* Column 1: Payer */}
                                <div className="w-20 sm:w-24">
                                  <span className="text-[10px] text-gray-400 block truncate">
                                    {payer.name} paid
                                  </span>
                                  <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-mono block">
                                    INR{Number(exp.amount).toFixed(2)}
                                  </span>
                                </div>

                                {/* Column 2: Lent / Borrowed (Relative to active viewer) */}
                                <div className="w-24 sm:w-28">
                                  {activeMemberId === 'all' ? (
                                    <div>
                                      <span className="text-[10px] text-gray-400 block">split among</span>
                                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
                                        {Object.keys(exp.shares || {}).length} people
                                      </span>
                                    </div>
                                  ) : youLent > 0 ? (
                                    <div>
                                      <span className="text-[10px] text-gray-400 block truncate">you lent</span>
                                      <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                                        INR{youLent.toFixed(2)}
                                      </span>
                                    </div>
                                  ) : youBorrowed > 0 ? (
                                    <div>
                                      <span className="text-[10px] text-gray-400 block truncate">{payer.name} lent you</span>
                                      <span className="text-xs sm:text-sm font-black text-[#e53935] dark:text-rose-400 font-mono block">
                                        INR{youBorrowed.toFixed(2)}
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-[10px] text-gray-400 block">not involved</span>
                                      <span className="text-xs text-gray-400 block">—</span>
                                    </div>
                                  )}
                                </div>

                                {/* Delete trash button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteExpenseTarget(exp)
                                  }}
                                  className="text-gray-300 hover:text-rose-600 p-1 rounded transition-colors"
                                  title="Delete expense"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Detail Drawer */}
                            {isExpanded && (
                              <div className="bg-gray-50/90 dark:bg-slate-800/80 p-4 border-t border-gray-100 dark:border-slate-800 space-y-3 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Shares Breakdown */}
                                  <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                      Split Breakdown
                                    </span>
                                    <div className="space-y-1">
                                      {Object.entries(exp.shares || {}).map(([mId, share]) => {
                                        const mName = members.find(m => m.id === mId)?.name || mId
                                        return (
                                          <div key={mId} className="flex items-center justify-between text-gray-700 dark:text-slate-300">
                                            <span>{mName}</span>
                                            <span className="font-mono font-bold">INR{Number(share).toFixed(2)}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>

                                  {/* Attached Bill & Notes */}
                                  <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                      Bill & Notes
                                    </span>
                                    {exp.receipt_url ? (
                                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 mb-2">
                                        <Paperclip className="h-4 w-4 text-blue-600" />
                                        <span className="truncate flex-1 font-semibold">{exp.receipt_name || 'Bill Receipt'}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setPreviewReceiptUrl(exp.receipt_url)
                                          }}
                                          className="btn-secondary text-[11px] py-1 px-2.5 font-bold"
                                        >
                                          View Bill
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="text-gray-400 italic">No bill receipt attached.</p>
                                    )}

                                    {exp.notes && (
                                      <p className="text-gray-600 dark:text-slate-300 italic mt-1">
                                        Note: {exp.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditExpenseModal(exp)
                                    }}
                                    className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1"
                                  >
                                    <Pencil className="h-3.5 w-3.5" /> Edit Expense
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteExpenseTarget(exp)
                                    }}
                                    className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT PANEL (lg:col-span-3): RECENT ACTIVITY / AUDIT LOGS    */}
          {/* ============================================================ */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card p-4 space-y-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-800 dark:text-slate-200">
                      Recent Activity
                    </h3>
                    <span className="text-[10px] text-gray-400 block leading-tight">Live changes & audit feed</span>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                  {displayActivities.length} logs
                </span>
              </div>

              {displayActivities.length === 0 ? (
                <div className="py-6 text-center space-y-1 text-gray-400">
                  <Clock className="h-6 w-6 mx-auto text-gray-300 mb-1" />
                  <p className="text-xs font-bold">No activity recorded yet</p>
                  <p className="text-[10px]">Changes made by participants will appear here in real time.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {displayActivities.map((act) => {
                    const isDelete = act.type?.includes('delete')
                    const isAdd = act.type?.includes('add')
                    const isEdit = act.type?.includes('edit')
                    const isSettle = act.type === 'settlement'

                    const borderBadge = isDelete
                      ? 'border-l-2 border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                      : isAdd
                      ? 'border-l-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : isSettle
                      ? 'border-l-2 border-teal-500 bg-teal-50/40 dark:bg-teal-950/20'
                      : isEdit
                      ? 'border-l-2 border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-l-2 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'

                    return (
                      <div
                        key={act.id}
                        className={`p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 text-xs transition-all ${borderBadge}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <strong className="text-gray-900 dark:text-white truncate font-extrabold text-[11px]">
                            {act.actor}
                          </strong>
                          <span className="text-[9px] text-gray-400 font-medium shrink-0 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{formatTimeAgo(act.timestamp)}</span>
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-700 dark:text-slate-300 leading-snug">
                          {act.action}
                        </p>

                        {act.details && (
                          <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                            {act.details}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ============================================================ */}
      {/* MODALS: Trip Edit, Expense, Member Add/Edit, Settle, Summary */}
      {/* ============================================================ */}

      {/* 1. EDIT TRIP NAME & DETAILS MODAL */}
      <Modal
        isOpen={showEditTripModal}
        onClose={() => setShowEditTripModal(false)}
        title="Edit Trip Details & Name"
      >
        <form onSubmit={handleSaveTripEdit} className="space-y-4 text-xs">
          <div>
            <label className="label">Trip / Group Name *</label>
            <input
              type="text"
              placeholder="e.g. Bandaje trek, Goa Trip, Flat 402"
              value={editTripForm.name}
              onChange={(e) => setEditTripForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-xs font-bold text-sm"
              required
            />
          </div>

          <div>
            <label className="label">Trip Icon / Emoji</label>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl p-2 rounded-xl bg-gray-100 dark:bg-slate-800">{editTripForm.icon}</span>
              <input
                type="text"
                value={editTripForm.icon}
                onChange={(e) => setEditTripForm(prev => ({ ...prev, icon: e.target.value }))}
                className="input-field text-xs w-20 text-center"
                maxLength={4}
              />
            </div>
            {/* Quick Emoji Picks */}
            <div className="flex flex-wrap gap-1.5">
              {['✈️', '🏖️', '🏔️', '🏕️', '🚗', '🍽️', '🌴', '🎟️', '🛵', '🚢', '🏠', '🎉'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setEditTripForm(prev => ({ ...prev, icon: emoji }))}
                  className={`text-lg p-1.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${
                    editTripForm.icon === emoji ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Trip Description</label>
            <input
              type="text"
              placeholder="e.g. Flights, stay advance, and activities"
              value={editTripForm.description}
              onChange={(e) => setEditTripForm(prev => ({ ...prev, description: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowEditTripModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs font-bold bg-emerald-600 hover:bg-emerald-700">
              Save Trip Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. PRINTABLE SUMMARY MODAL (PDF LAYOUT) */}
      <SplitwisePrintableSummaryModal
        isOpen={showPrintableSummaryModal}
        onClose={() => setShowPrintableSummaryModal(false)}
        group={group}
      />

      {/* 3. EDIT MEMBER MODAL */}
      <Modal
        isOpen={showEditMemberModal}
        onClose={() => {
          setShowEditMemberModal(false)
          setEditingMember(null)
        }}
        title="Edit Member Name"
      >
        <form onSubmit={handleSaveMemberEdit} className="space-y-4 text-xs">
          <div>
            <label className="label">Member Name *</label>
            <input
              type="text"
              placeholder="e.g. Manoj Gowda"
              value={editingMember?.name || ''}
              onChange={(e) => setEditingMember(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Phone Number (Optional for WhatsApp)</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={editingMember?.phone || ''}
              onChange={(e) => setEditingMember(prev => ({ ...prev, phone: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setShowEditMemberModal(false)
                setEditingMember(null)
              }}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs font-bold bg-emerald-600 hover:bg-emerald-700">
              Save Member
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. ADD MEMBER MODAL */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="Add Friend to this Trip"
      >
        <form onSubmit={handleAddMember} className="space-y-4 text-xs">
          <div>
            <label className="label">Member Name *</label>
            <input
              type="text"
              placeholder="e.g. Vikram Verma"
              value={newMemberForm.name}
              onChange={(e) => setNewMemberForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Phone Number (Optional for WhatsApp reminders)</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={newMemberForm.phone}
              onChange={(e) => setNewMemberForm(prev => ({ ...prev, phone: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs font-bold">
              Add to Trip
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. ADD / EDIT EXPENSE MODAL */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false)
          setEditExpenseTarget(null)
        }}
        title={editExpenseTarget ? `Edit Expense: ${editExpenseTarget.title}` : `Add Expense to ${group.name}`}
        size="lg"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4 text-xs max-h-[82vh] overflow-y-auto pr-1">
          {/* AI Bill Scanner Button */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/60 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">AI Bill & Receipt Scanner</h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-300">
                  Snap or upload an invoice to extract amount, title & date automatically!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAiScannerModal(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Scan Bill</span>
            </button>
          </div>

          {/* Description & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Description / Title *</label>
              <input
                type="text"
                placeholder="e.g. Ice cream, Diesel, Room booking cost"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                className="input-field text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                className="input-field text-xs font-black text-emerald-600 text-right text-sm"
                required
              />
            </div>
          </div>

          {/* Date & Bill Attachment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="label">Bill / Invoice Attachment</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={billFileInputRef}
                  accept="image/*,application/pdf"
                  onChange={handleBillFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => billFileInputRef.current?.click()}
                  className="btn-secondary text-xs flex items-center gap-1.5 flex-1 truncate"
                >
                  <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                  <span className="truncate">{expenseForm.receipt_name || 'Upload Bill'}</span>
                </button>
                {expenseForm.receipt_url && (
                  <button
                    type="button"
                    onClick={() => setExpenseForm(prev => ({ ...prev, receipt_url: '', receipt_name: '' }))}
                    className="p-2 text-rose-500 hover:text-rose-700"
                    title="Remove Bill"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes / Comments (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Dinner with drinks, petrol bill on highway"
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          {/* Who Paid */}
          <div>
            <label className="label">Paid By</label>
            <select
              value={expenseForm.paid_by_id}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, paid_by_id: e.target.value }))}
              className="input-field text-xs font-bold"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Split Mode Selector */}
          <div>
            <label className="label">Split Allocation</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'equal', label: '= Split Equally' },
                { id: 'exact', label: '123 Exact Amounts' },
                { id: 'percent', label: '% Percentage' },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setExpenseForm(prev => ({ ...prev, split_type: st.id }))}
                  className={`py-2 px-2 rounded-xl text-xs font-bold text-center border transition-all ${
                    expenseForm.split_type === st.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-400 font-extrabold'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Members Split Checklist */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Participants in this Expense
            </span>
            <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {members.map(m => {
                const isChecked = expenseForm.selected_members.includes(m.id)
                return (
                  <div key={m.id} className="py-2 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...expenseForm.selected_members, m.id]
                            : expenseForm.selected_members.filter(id => id !== m.id)
                          setExpenseForm(prev => ({ ...prev, selected_members: next }))
                        }}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>{m.name}</span>
                    </label>

                    {isChecked && (
                      <div className="flex items-center gap-2 w-32">
                        {expenseForm.split_type === 'equal' && (
                          <span className="font-mono font-bold text-emerald-600 text-right w-full">
                            {formatCurrency(calculatedSplitShares.shares[m.id] || 0)}
                          </span>
                        )}
                        {expenseForm.split_type === 'exact' && (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="₹0"
                            value={expenseForm.exact_shares[m.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setExpenseForm(prev => ({
                                ...prev,
                                exact_shares: { ...prev.exact_shares, [m.id]: val },
                              }))
                            }}
                            className="input-field text-xs text-right py-1"
                          />
                        )}
                        {expenseForm.split_type === 'percent' && (
                          <div className="relative w-full">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={expenseForm.percent_shares[m.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setExpenseForm(prev => ({
                                  ...prev,
                                  percent_shares: { ...prev.percent_shares, [m.id]: val },
                                }))
                              }}
                              className="input-field text-xs text-right pr-6 py-1"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className={`p-2 rounded-lg text-[11px] font-bold flex items-center justify-between ${
              calculatedSplitShares.isValid
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-rose-50 text-rose-800'
            }`}>
              <span>{calculatedSplitShares.message}</span>
              {calculatedSplitShares.isValid && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setShowExpenseModal(false)
                setEditExpenseTarget(null)
              }}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!calculatedSplitShares.isValid}
              className="btn-primary text-xs bg-[#ff652f] hover:bg-[#e55320] border-none font-bold"
            >
              {editExpenseTarget ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. SETTLE UP MODAL */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        title="Record Debt Settlement"
      >
        <form onSubmit={handleSettleUp} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Who paid? *</label>
              <select
                value={settleForm.from_id}
                onChange={(e) => setSettleForm(prev => ({ ...prev, from_id: e.target.value }))}
                className="input-field text-xs font-bold"
                required
              >
                <option value="">Select payer</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Who received? *</label>
              <select
                value={settleForm.to_id}
                onChange={(e) => setSettleForm(prev => ({ ...prev, to_id: e.target.value }))}
                className="input-field text-xs font-bold"
                required
              >
                <option value="">Select recipient</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Amount Settled (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={settleForm.amount}
              onChange={(e) => setSettleForm(prev => ({ ...prev, amount: e.target.value }))}
              className="input-field text-xs font-black text-emerald-600 text-right"
              required
            />
          </div>

          <div>
            <label className="label">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via GPay / PhonePe"
              value={settleForm.notes}
              onChange={(e) => setSettleForm(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowSettleModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs font-bold bg-[#5bc5a7] hover:bg-[#48b294]">
              Record Settlement
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. AI RECEIPT SCANNER MODAL */}
      <AiReceiptScannerModal
        isOpen={showAiScannerModal}
        onClose={() => setShowAiScannerModal(false)}
        onApplyExtracted={handleApplyAiScan}
      />

      {/* 8. RECEIPT PREVIEW MODAL */}
      <ReceiptPreviewModal
        isOpen={Boolean(previewReceiptUrl)}
        onClose={() => setPreviewReceiptUrl('')}
        receiptUrl={previewReceiptUrl}
        title="Trip Bill Receipt"
      />

      {/* 9. DELETE EXPENSE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteExpenseTarget)}
        title="Delete Expense?"
        message={`Remove "${deleteExpenseTarget?.title}" from this shared trip ledger?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteExpenseTarget(null)}
      />

      {/* 10. CLEAR CACHE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={showClearCacheModal}
        title="Clear Local Trip Cache"
        message="Are you sure you want to clear the locally cached trip ledger and pending offline sync changes on this device? (Cloud data remains intact)"
        confirmLabel="Clear Cache"
        danger
        onConfirm={handleClearCache}
        onCancel={() => setShowClearCacheModal(false)}
      />
    </div>
  )
}
