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
} from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import AiReceiptScannerModal from '../components/AiReceiptScannerModal'
import ReceiptPreviewModal from '../components/ReceiptPreviewModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, today } from '../utils/dateUtils'
import { SUPPORTED_CURRENCIES, convertToInr } from '../utils/currencyConverter'
import {
  fetchSharedGroupByToken,
  updateSharedTripData,
  publishOrSyncSharedGroup,
} from '../features/splitwise/api/sharedTripService'
import { supabase } from '../lib/supabaseClient'

export default function SharedTripPage() {
  const { shareToken } = useParams()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

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
  const [showAiScannerModal, setShowAiScannerModal] = useState(false)
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState('')
  const [editExpenseTarget, setEditExpenseTarget] = useState(null)
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState(null)
  const [expandedExpenseId, setExpandedExpenseId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Member join form
  const [newMemberForm, setNewMemberForm] = useState({ name: '', phone: '' })

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

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Load shared group from backend or fallback cache
  const loadGroupData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    setIsRefreshing(true)
    setError('')
    try {
      const { group: loaded, error: fetchErr } = await fetchSharedGroupByToken(shareToken)
      if (fetchErr || !loaded) {
        setError(fetchErr || 'Shared trip not found.')
      } else {
        setGroup(loaded)
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

  // Realtime subscription + background poll to sync multi-user edits
  useEffect(() => {
    if (!shareToken) return

    // Supabase Realtime channel
    const channel = supabase
      .channel(`realtime-shared-${shareToken}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_splitwise_groups', filter: `share_token=eq.${shareToken}` },
        (payload) => {
          if (payload.new) {
            setGroup(payload.new)
          }
        }
      )
      .subscribe()

    // Interval poll fallback (every 6s)
    const interval = setInterval(() => {
      loadGroupData(true)
    }, 6000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
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

  // --- Financial Balances & Settlements Calculation Engine ---
  const balanceDetails = useMemo(() => {
    if (!group) return { netBalances: {}, simplifiedDebts: [], totalSpend: 0, yourNet: 0, youOwe: 0, youAreOwed: 0 }

    const netBalances = {}
    members.forEach(m => { netBalances[m.id] = 0 })

    let totalSpend = 0

    expenses.forEach(exp => {
      const amt = Number(exp.amount) || 0
      totalSpend += amt

      // Credit payer(s)
      if (exp.payer_mode === 'multiple' && exp.paid_by) {
        Object.entries(exp.paid_by).forEach(([pId, pAmt]) => {
          netBalances[pId] = (netBalances[pId] || 0) + Number(pAmt || 0)
        })
      } else if (exp.paid_by_id) {
        netBalances[exp.paid_by_id] = (netBalances[exp.paid_by_id] || 0) + amt
      }

      // Debit participants
      if (exp.shares) {
        Object.entries(exp.shares).forEach(([mId, share]) => {
          netBalances[mId] = (netBalances[mId] || 0) - Number(share || 0)
        })
      }
    })

    // Compute Simplified Settlement Matrix
    const creditors = []
    const debtors = []

    Object.entries(netBalances).forEach(([mId, bal]) => {
      const rounded = Math.round(bal * 100) / 100
      const member = members.find(m => m.id === mId) || { id: mId, name: 'Unknown' }
      if (rounded > 0.05) creditors.push({ member, amount: rounded })
      else if (rounded < -0.05) debtors.push({ member, amount: -rounded })
    })

    creditors.sort((a, b) => b.amount - a.amount)
    debtors.sort((a, b) => b.amount - a.amount)

    const simplifiedDebts = []
    let cIdx = 0
    let dIdx = 0

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const cred = creditors[cIdx]
      const deb = debtors[dIdx]
      const settleAmt = Math.min(cred.amount, deb.amount)

      if (settleAmt > 0.05) {
        simplifiedDebts.push({
          from: deb.member,
          to: cred.member,
          amount: Math.round(settleAmt),
        })
      }

      cred.amount -= settleAmt
      deb.amount -= settleAmt

      if (cred.amount <= 0.05) cIdx++
      if (deb.amount <= 0.05) dIdx++
    }

    // Active viewer perspective
    let youNet = 0
    let youOwe = 0
    let youAreOwed = 0

    if (activeMemberId !== 'all') {
      youNet = netBalances[activeMemberId] || 0
      simplifiedDebts.forEach(d => {
        if (d.from.id === activeMemberId) youOwe += d.amount
        if (d.to.id === activeMemberId) youAreOwed += d.amount
      })
    }

    return { netBalances, simplifiedDebts, totalSpend, youNet, youOwe, youAreOwed }
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

    if (editExpenseTarget) {
      // Edit existing
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
      flash(`Updated "${updatedItem.title}"!`)
    } else {
      // Create new
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
      flash(`Added "${newItem.title}" (${formatCurrency(finalInrAmt)})!`)
    }

    setGroup(prev => ({ ...prev, expenses: updatedExpenses }))
    setShowExpenseModal(false)
    setEditExpenseTarget(null)

    // Sync to backend / local storage
    await updateSharedTripData(shareToken, { expenses: updatedExpenses })
  }

  const handleDeleteExpense = async () => {
    if (!deleteExpenseTarget) return
    const updated = expenses.filter(e => e.id !== deleteExpenseTarget.id)
    setGroup(prev => ({ ...prev, expenses: updated }))
    setDeleteExpenseTarget(null)
    flash('Expense removed.')
    await updateSharedTripData(shareToken, { expenses: updated })
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
      title: `🤝 Payment: ${payer} ➔ ${recipient}`,
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

    const updated = [settlementExpense, ...expenses]
    setGroup(prev => ({ ...prev, expenses: updated }))
    setShowSettleModal(false)
    setSettleForm({ from_id: '', to_id: '', amount: '', notes: '' })
    flash(`Recorded settlement payment of ${formatCurrency(amt)}!`)
    await updateSharedTripData(shareToken, { expenses: updated })
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

    const updatedMembers = [...members, newMember]
    setGroup(prev => ({ ...prev, members: updatedMembers }))
    setShowAddMemberModal(false)
    setNewMemberForm({ name: '', phone: '' })
    handleSelectMember(newMember.id)
    flash(`Welcome ${newMember.name}! You are now a participant in this trip.`)

    await updateSharedTripData(shareToken, { members: updatedMembers })
  }

  // Handle Bill Receipt File Upload
  const handleBillFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      setError('Bill file size must be less than 8MB.')
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

  // Budget calculations
  const tripBudget = Number(group.budget || 0)
  const budgetSpentPct = tripBudget > 0 ? Math.min(100, Math.round((balanceDetails.totalSpend / tripBudget) * 100)) : 0
  const budgetRemaining = tripBudget > 0 ? tripBudget - balanceDetails.totalSpend : 0

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-slate-950 text-gray-900 dark:text-white antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-1.5 bg-gray-100 dark:bg-slate-800 rounded-xl">{group.icon || '🏖️'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                  {group.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Shared Trip
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                {group.description || `${members.length} members sharing expenses`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadGroupData(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={openNewExpenseModal}
              className="btn-primary text-xs py-2 px-3.5 bg-[#ff652f] hover:bg-[#e55320] border-none font-extrabold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Alerts */}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Privacy & Scope Disclaimer Notice */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <strong className="text-emerald-950 dark:text-emerald-200 block text-xs">
                Private & Isolated Trip Ledger
              </strong>
              <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                You can view, add, or edit expenses for <strong>{group.name}</strong> only. Other accounts and groups are inaccessible.
              </span>
            </div>
          </div>

          {/* Member Identity Selector ("I am...") */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">I am:</span>
            <select
              value={activeMemberId}
              onChange={(e) => handleSelectMember(e.target.value)}
              className="input-field text-xs font-bold py-1 px-2.5 bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700"
            >
              <option value="all">👀 Everyone / Group Overview</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
              title="Add my name to this trip"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 3-Box Balance Bar */}
        <div className="card p-0 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-slate-800 text-center shadow-sm">
          <div className="p-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Trip Spend</span>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
              {formatCurrency(balanceDetails.totalSpend)}
            </p>
            <span className="text-[10px] text-gray-400">{expenses.length} expenses recorded</span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {activeMemberId === 'all' ? 'Pending Settlements' : 'You Owe'}
            </span>
            <p className="text-xl sm:text-2xl font-black text-[#ff652f] mt-1">
              {formatCurrency(activeMemberId === 'all' ? balanceDetails.simplifiedDebts.reduce((s, d) => s + d.amount, 0) : balanceDetails.youOwe)}
            </p>
            <span className="text-[10px] text-gray-400">
              {activeMemberId === 'all' ? `${balanceDetails.simplifiedDebts.length} debt paths` : 'to settle with friends'}
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {activeMemberId === 'all' ? 'Members Active' : 'You Are Owed'}
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {activeMemberId === 'all' ? members.length : formatCurrency(balanceDetails.youAreOwed)}
            </p>
            <span className="text-[10px] text-gray-400">
              {activeMemberId === 'all' ? 'travelers sharing costs' : 'pending from friends'}
            </span>
          </div>
        </div>

        {/* Trip Budget Gauge (if configured) */}
        {tripBudget > 0 && (
          <div className="card p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-gray-700 dark:text-slate-300">Trip Budget Pace</span>
              <span className="font-bold text-gray-500">
                {formatCurrency(balanceDetails.totalSpend)} of {formatCurrency(tripBudget)} ({budgetSpentPct}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${
                  budgetSpentPct >= 100 ? 'bg-rose-500' : budgetSpentPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetSpentPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>{budgetRemaining >= 0 ? `₹${Math.round(budgetRemaining)} remaining in budget` : `Over budget by ₹${Math.abs(Math.round(budgetRemaining))}`}</span>
              <span>Target: {formatCurrency(tripBudget)}</span>
            </div>
          </div>
        )}

        {/* Simplified Settlement Paths (Who owes who) */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-emerald-600" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
                Settlement Routes ({balanceDetails.simplifiedDebts.length})
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
              className="btn-secondary text-[11px] py-1 px-3 font-bold text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50"
            >
              Record Payment
            </button>
          </div>

          {balanceDetails.simplifiedDebts.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">All trip debts are settled!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {balanceDetails.simplifiedDebts.map((debt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <strong className="truncate text-gray-900 dark:text-white">{debt.from.name}</strong>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <strong className="truncate text-gray-900 dark:text-white">{debt.to.name}</strong>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(debt.amount)}
                    </span>
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

        {/* Expenses Feed */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Trip Expenses ({filteredExpenses.length})
              </h3>
              <p className="text-[11px] text-gray-400">Tap an expense to see who paid and split shares</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field text-xs pl-8 py-1.5 w-44 sm:w-56"
                />
              </div>

              <button
                onClick={handleExportCsv}
                className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 font-bold"
                title="Download CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Receipt className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-400">No expenses found for this trip.</p>
              <button
                onClick={openNewExpenseModal}
                className="btn-primary text-xs py-2 px-4 bg-[#ff652f] hover:bg-[#e55320] border-none font-bold"
              >
                Add First Expense
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredExpenses.map(exp => {
                const isExpanded = expandedExpenseId === exp.id
                const payerName = exp.payer_mode === 'single'
                  ? (members.find(m => m.id === exp.paid_by_id)?.name || 'Someone')
                  : 'Multiple people'

                const expDate = new Date(exp.date || today())
                const monthStr = expDate.toLocaleString('default', { month: 'short' }).toUpperCase()
                const dayStr = String(expDate.getDate()).padStart(2, '0')

                return (
                  <div key={exp.id} className="py-3">
                    <div
                      onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                      className="flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-all"
                    >
                      {/* Date Badge + Category Icon + Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center text-center font-bold flex-shrink-0">
                          <span className="text-[9px] text-gray-500 uppercase">{monthStr}</span>
                          <span className="text-xs text-gray-900 dark:text-white leading-none">{dayStr}</span>
                        </div>

                        <div className="min-w-0">
                          <strong className="text-gray-900 dark:text-white block truncate text-xs sm:text-sm">
                            {exp.title}
                          </strong>
                          <span className="text-[11px] text-gray-400">
                            Paid by <strong className="text-gray-700 dark:text-slate-300">{payerName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Amount & Arrow */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <strong className="text-sm font-black text-gray-900 dark:text-white block">
                            {formatCurrency(exp.amount)}
                          </strong>
                          {exp.receipt_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setPreviewReceiptUrl(exp.receipt_url)
                              }}
                              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 justify-end"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              <span>Bill</span>
                            </button>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded Breakdown */}
                    {isExpanded && (
                      <div className="mt-2.5 p-3.5 bg-gray-50 dark:bg-slate-800/80 rounded-xl space-y-3 text-xs border border-gray-100 dark:border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                              Split Allocations
                            </span>
                            <div className="space-y-1">
                              {Object.entries(exp.shares || {}).map(([mId, share]) => {
                                const mName = members.find(m => m.id === mId)?.name || mId
                                return (
                                  <div key={mId} className="flex items-center justify-between text-gray-700 dark:text-slate-300">
                                    <span>{mName}</span>
                                    <span className="font-mono font-bold">{formatCurrency(share)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                              Bill Invoice & Notes
                            </span>
                            {exp.receipt_url ? (
                              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
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
                              <p className="mt-2 text-gray-600 dark:text-slate-300 italic">
                                Note: {exp.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons: Edit & Delete */}
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
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODALS: Expense Create/Edit, AI Bill OCR, Member Join, Settle */}
      {/* ============================================================ */}

      {/* --- ADD / EDIT EXPENSE MODAL --- */}
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
                placeholder="e.g. Seafood Dinner, Scuba Diving, Taxi to Hotel"
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

      {/* --- ADD / JOIN MEMBER MODAL --- */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="Join this Trip"
      >
        <form onSubmit={handleAddMember} className="space-y-4 text-xs">
          <div>
            <label className="label">Your Name *</label>
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
            <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs font-bold">Add to Trip</button>
          </div>
        </form>
      </Modal>

      {/* --- SETTLE UP MODAL --- */}
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

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowSettleModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs font-bold">Record Settlement</button>
          </div>
        </form>
      </Modal>

      {/* --- AI RECEIPT SCANNER MODAL --- */}
      <AiReceiptScannerModal
        isOpen={showAiScannerModal}
        onClose={() => setShowAiScannerModal(false)}
        onApplyExtracted={handleApplyAiScan}
      />

      {/* --- RECEIPT PREVIEW MODAL --- */}
      <ReceiptPreviewModal
        isOpen={Boolean(previewReceiptUrl)}
        onClose={() => setPreviewReceiptUrl('')}
        receiptUrl={previewReceiptUrl}
        title="Trip Bill Receipt"
      />

      {/* --- DELETE CONFIRM DIALOG --- */}
      <ConfirmDialog
        isOpen={Boolean(deleteExpenseTarget)}
        title="Delete Expense?"
        message={`Remove "${deleteExpenseTarget?.title}" from this shared trip ledger?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteExpenseTarget(null)}
      />
    </div>
  )
}
