import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import SplitwiseStatementModal from '../components/SplitwiseStatementModal'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, today } from '../utils/dateUtils'
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  Send,
  CheckCircle2,
  ArrowRight,
  Receipt,
  DollarSign,
  Share2,
  Clock,
  Sparkles,
  ChevronRight,
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Download,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  PieChart,
  Percent,
  Sliders,
  Scale,
} from 'lucide-react'

const DEFAULT_GROUPS = [
  {
    id: 'grp-seed-1',
    name: '🏖️ Goa Vacation Trip',
    description: 'Flights, Airbnb, beach dinners and scooter rentals',
    members: [
      { id: 'm-1', name: 'You (Owner)', phone: '', isOwner: true },
      { id: 'm-2', name: 'Rahul S', phone: '9876543210', isOwner: false },
      { id: 'm-3', name: 'Sneha P', phone: '9876543211', isOwner: false },
      { id: 'm-4', name: 'Amit K', phone: '9876543212', isOwner: false },
    ],
    expenses: [
      {
        id: 'exp-1',
        title: 'Villa Stay & Airbnb Booking',
        amount: 24000,
        payer_mode: 'single',
        paid_by_id: 'm-1',
        date: '2026-09-20',
        split_type: 'equal',
        shares: { 'm-1': 6000, 'm-2': 6000, 'm-3': 6000, 'm-4': 6000 },
      },
      {
        id: 'exp-2',
        title: 'Seafood Beach Shack Dinner',
        amount: 6800,
        payer_mode: 'multiple',
        paid_by: { 'm-1': 4000, 'm-2': 2800 },
        date: '2026-09-21',
        split_type: 'exact',
        shares: { 'm-1': 2000, 'm-2': 1800, 'm-3': 1500, 'm-4': 1500 },
      },
      {
        id: 'exp-3',
        title: 'Scooters & Fuel',
        amount: 3600,
        payer_mode: 'single',
        paid_by_id: 'm-3',
        date: '2026-09-22',
        split_type: 'equal',
        shares: { 'm-1': 900, 'm-2': 900, 'm-3': 900, 'm-4': 900 },
      },
    ],
    settlements: [],
  },
  {
    id: 'grp-seed-2',
    name: '🏠 Flat 402 Utilities & Groceries',
    description: 'Rent, WiFi, maid, electricity and daily groceries',
    members: [
      { id: 'm-1', name: 'You (Owner)', phone: '', isOwner: true },
      { id: 'm-5', name: 'Karthik R', phone: '9123456780', isOwner: false },
      { id: 'm-6', name: 'Vikas M', phone: '9123456781', isOwner: false },
    ],
    expenses: [
      {
        id: 'exp-4',
        title: 'High-Speed Broadband WiFi',
        amount: 1499,
        payer_mode: 'single',
        paid_by_id: 'm-1',
        date: '2026-09-01',
        split_type: 'equal',
        shares: { 'm-1': 499.66, 'm-5': 499.67, 'm-6': 499.67 },
      },
      {
        id: 'exp-5',
        title: 'Monthly Supermarket Supplies',
        amount: 4500,
        payer_mode: 'single',
        paid_by_id: 'm-5',
        date: '2026-09-12',
        split_type: 'equal',
        shares: { 'm-1': 1500, 'm-5': 1500, 'm-6': 1500 },
      },
    ],
    settlements: [],
  },
]

export default function Splitwise() {
  const { user } = useAuth()
  const storageKey = `ft_splitwise_groups_${user?.id || 'guest'}`

  const [groups, setGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : DEFAULT_GROUPS
    } catch {
      return DEFAULT_GROUPS
    }
  })

  const [activeGroupId, setActiveGroupId] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      const list = saved ? JSON.parse(saved) : DEFAULT_GROUPS
      return list[0]?.id || null
    } catch {
      return DEFAULT_GROUPS[0]?.id || null
    }
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [editGroupTarget, setEditGroupTarget] = useState(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState(null)
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState(null)

  // Form states
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [memberForm, setMemberForm] = useState({ name: '', phone: '' })
  const [settleForm, setSettleForm] = useState({ from_id: '', to_id: '', amount: '' })

  // Advanced Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    date: today(),
    payer_mode: 'single', // 'single' | 'multiple'
    paid_by_id: '', // for single payer
    paid_by: {}, // { [memberId]: number } for multiple payers
    split_type: 'equal', // 'equal' | 'exact' | 'percent' | 'shares'
    selected_members: [], // member IDs participating
    exact_shares: {}, // { [memberId]: number } for exact split
    percent_shares: {}, // { [memberId]: number } for percent split
    ratio_shares: {}, // { [memberId]: number } for shares split
  })

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Sync to storage
  const saveGroups = useCallback((newGroups) => {
    setGroups(newGroups)
    try {
      localStorage.setItem(`ft_splitwise_groups_${user?.id || 'guest'}`, JSON.stringify(newGroups))
    } catch {}
  }, [user])

  // Active group data
  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === activeGroupId) || groups[0] || null
  }, [groups, activeGroupId])

  // Compute Balances & Simplified Settlement Matrix
  const balanceDetails = useMemo(() => {
    if (!activeGroup) return { totalSpend: 0, netBalances: {}, debts: [] }

    const members = activeGroup.members || []
    const expenses = activeGroup.expenses || []
    const settlements = activeGroup.settlements || []

    let totalSpend = 0
    const netBalances = {}
    members.forEach(m => { netBalances[m.id] = 0 })

    // 1. Process Expenses
    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount) || 0
      totalSpend += amt

      // Process Upfront Payer(s)
      if (exp.payer_mode === 'multiple' && exp.paid_by && typeof exp.paid_by === 'object') {
        Object.entries(exp.paid_by).forEach(([pId, pAmt]) => {
          if (netBalances[pId] !== undefined) {
            netBalances[pId] += parseFloat(pAmt) || 0
          }
        })
      } else {
        const payerId = exp.paid_by_id
        if (payerId && netBalances[payerId] !== undefined) {
          netBalances[payerId] += amt
        }
      }

      // Deduct each member's share
      Object.entries(exp.shares || {}).forEach(([memberId, share]) => {
        if (netBalances[memberId] !== undefined) {
          netBalances[memberId] -= parseFloat(share) || 0
        }
      })
    })

    // 2. Process Settlements
    settlements.forEach(s => {
      const amt = parseFloat(s.amount) || 0
      if (netBalances[s.from_id] !== undefined) netBalances[s.from_id] += amt
      if (netBalances[s.to_id] !== undefined) netBalances[s.to_id] -= amt
    })

    // 3. Compute Simplified Debts (Greedy settlement algorithm)
    const creditors = []
    const debtors = []

    Object.entries(netBalances).forEach(([memberId, bal]) => {
      const rounded = Math.round(bal * 100) / 100
      if (rounded > 0.5) creditors.push({ id: memberId, amount: rounded })
      else if (rounded < -0.5) debtors.push({ id: memberId, amount: -rounded })
    })

    creditors.sort((a, b) => b.amount - a.amount)
    debtors.sort((a, b) => b.amount - a.amount)

    const debts = []
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]
      const creditor = creditors[j]
      const settleAmount = Math.min(debtor.amount, creditor.amount)

      if (settleAmount > 0.5) {
        debts.push({
          from: members.find(m => m.id === debtor.id) || { id: debtor.id, name: 'Unknown' },
          to: members.find(m => m.id === creditor.id) || { id: creditor.id, name: 'Unknown' },
          amount: Math.round(settleAmount * 100) / 100,
        })
      }

      debtor.amount -= settleAmount
      creditor.amount -= settleAmount

      if (debtor.amount < 0.5) i++
      if (creditor.amount < 0.5) j++
    }

    return { totalSpend, netBalances, debts }
  }, [activeGroup])

  // WhatsApp Reminder Link
  const getWhatsAppLink = (debt) => {
    const phone = (debt.from.phone || '').replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Hi ${debt.from.name}! Just a friendly reminder: your split share for "${activeGroup?.name || 'our shared expense'}" is ${formatCurrency(debt.amount)}. You can pay via UPI when convenient!`
    )
    return phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`
  }

  // --- Group Handlers ---
  const handleSaveGroup = (e) => {
    e.preventDefault()
    if (!groupForm.name.trim()) return

    if (editGroupTarget) {
      const updated = groups.map(g =>
        g.id === editGroupTarget.id
          ? { ...g, name: groupForm.name.trim(), description: groupForm.description.trim() }
          : g
      )
      saveGroups(updated)
      flash('Group updated!')
    } else {
      const newGroup = {
        id: `grp_${Date.now()}`,
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        members: [
          { id: `m_owner_${Date.now()}`, name: 'You (Owner)', phone: '', isOwner: true },
        ],
        expenses: [],
        settlements: [],
      }
      const updated = [newGroup, ...groups]
      saveGroups(updated)
      setActiveGroupId(newGroup.id)
      flash('New Group created! Now add your friends.')
    }

    setShowGroupModal(false)
    setEditGroupTarget(null)
    setGroupForm({ name: '', description: '' })
  }

  const handleDeleteGroup = () => {
    if (!deleteGroupTarget) return
    const updated = groups.filter(g => g.id !== deleteGroupTarget.id)
    saveGroups(updated)
    setActiveGroupId(updated[0]?.id || null)
    setDeleteGroupTarget(null)
    flash('Group deleted.')
  }

  // --- Member Handlers ---
  const handleAddMember = (e) => {
    e.preventDefault()
    if (!memberForm.name.trim() || !activeGroup) return

    const newMember = {
      id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: memberForm.name.trim(),
      phone: memberForm.phone.trim(),
      isOwner: false,
    }

    const updated = groups.map(g =>
      g.id === activeGroup.id
        ? { ...g, members: [...(g.members || []), newMember] }
        : g
    )
    saveGroups(updated)
    setShowMemberModal(false)
    setMemberForm({ name: '', phone: '' })
    flash(`Added ${newMember.name} to ${activeGroup.name}!`)
  }

  // Open Expense Modal with Preloaded Defaults
  const openNewExpenseModal = () => {
    if (!activeGroup || !activeGroup.members?.length) return
    const members = activeGroup.members
    const defaultSelected = members.map(m => m.id)
    const initialExact = {}
    const initialPercent = {}
    const initialShares = {}
    const initialPaidBy = {}

    members.forEach(m => {
      initialExact[m.id] = ''
      initialPercent[m.id] = (100 / members.length).toFixed(1)
      initialShares[m.id] = 1
      initialPaidBy[m.id] = ''
    })

    setExpenseForm({
      title: '',
      amount: '',
      date: today(),
      payer_mode: 'single',
      paid_by_id: members[0]?.id || '',
      paid_by: initialPaidBy,
      split_type: 'equal',
      selected_members: defaultSelected,
      exact_shares: initialExact,
      percent_shares: initialPercent,
      ratio_shares: initialShares,
    })
    setShowExpenseModal(true)
  }

  // --- Dynamic Multi-Payer Validation & Calculation ---
  const multiPayerAllocatedTotal = useMemo(() => {
    if (expenseForm.payer_mode !== 'multiple') return Number(expenseForm.amount) || 0
    return Object.values(expenseForm.paid_by || {}).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  }, [expenseForm.payer_mode, expenseForm.paid_by, expenseForm.amount])

  // --- Dynamic Split Breakdown Calculation ---
  const calculatedSplitShares = useMemo(() => {
    const total = parseFloat(expenseForm.amount) || 0
    const activeMembers = activeGroup?.members || []
    const selectedIds = (expenseForm.selected_members || []).filter(id => activeMembers.some(m => m.id === id))
    const shares = {}

    if (total <= 0 || selectedIds.length === 0) return { shares: {}, isValid: false, message: 'Enter a valid amount and select participants.' }

    if (expenseForm.split_type === 'equal') {
      const perHead = Math.round((total / selectedIds.length) * 100) / 100
      let allocated = 0
      selectedIds.forEach((id, idx) => {
        if (idx === selectedIds.length - 1) {
          shares[id] = Math.round((total - allocated) * 100) / 100
        } else {
          shares[id] = perHead
          allocated += perHead
        }
      })
      return { shares, isValid: true, message: `Split equally (${formatCurrency(perHead)} / person)` }
    }

    if (expenseForm.split_type === 'exact') {
      let sum = 0
      selectedIds.forEach(id => {
        const val = parseFloat(expenseForm.exact_shares?.[id]) || 0
        shares[id] = val
        sum += val
      })
      const diff = Math.round((total - sum) * 100) / 100
      const isValid = Math.abs(diff) < 0.05
      return {
        shares,
        isValid,
        allocatedSum: sum,
        diff,
        message: isValid ? 'Exact amounts match total bill.' : `Remaining to allocate: ${formatCurrency(diff)}`
      }
    }

    if (expenseForm.split_type === 'percent') {
      let sumPct = 0
      selectedIds.forEach(id => {
        const pct = parseFloat(expenseForm.percent_shares?.[id]) || 0
        sumPct += pct
        shares[id] = Math.round(((pct / 100) * total) * 100) / 100
      })
      const diffPct = Math.round((100 - sumPct) * 10) / 10
      const isValid = Math.abs(diffPct) < 0.1
      return {
        shares,
        isValid,
        sumPct,
        diffPct,
        message: isValid ? 'Percentages add up to 100%.' : `Remaining percent: ${diffPct}%`
      }
    }

    if (expenseForm.split_type === 'shares') {
      let totalUnits = 0
      selectedIds.forEach(id => {
        const u = parseFloat(expenseForm.ratio_shares?.[id]) || 0
        totalUnits += u
      })

      if (totalUnits <= 0) return { shares: {}, isValid: false, message: 'Total shares must be greater than 0.' }

      let allocated = 0
      selectedIds.forEach((id, idx) => {
        const u = parseFloat(expenseForm.ratio_shares?.[id]) || 0
        if (idx === selectedIds.length - 1) {
          shares[id] = Math.round((total - allocated) * 100) / 100
        } else {
          const personShare = Math.round(((u / totalUnits) * total) * 100) / 100
          shares[id] = personShare
          allocated += personShare
        }
      })
      return { shares, isValid: true, totalUnits, message: `Allocated across ${totalUnits} total shares.` }
    }

    return { shares: {}, isValid: false, message: '' }
  }, [expenseForm, activeGroup])

  // --- Expense Handlers ---
  const handleAddExpense = (e) => {
    e.preventDefault()
    const amt = parseFloat(expenseForm.amount)
    if (!expenseForm.title.trim() || !amt || amt <= 0 || !activeGroup) return

    // Validate Multi-Payer
    if (expenseForm.payer_mode === 'multiple') {
      const diffPaid = Math.abs(amt - multiPayerAllocatedTotal)
      if (diffPaid > 0.05) {
        setError(`Upfront contributions sum (${formatCurrency(multiPayerAllocatedTotal)}) does not match total amount (${formatCurrency(amt)}).`)
        return
      }
    }

    // Validate Split
    if (!calculatedSplitShares.isValid) {
      setError(calculatedSplitShares.message || 'Please check split allocations.')
      return
    }

    const newExpense = {
      id: `exp_${Date.now()}`,
      title: expenseForm.title.trim(),
      amount: amt,
      date: expenseForm.date || today(),
      payer_mode: expenseForm.payer_mode,
      paid_by_id: expenseForm.payer_mode === 'single' ? expenseForm.paid_by_id : null,
      paid_by: expenseForm.payer_mode === 'multiple' ? expenseForm.paid_by : null,
      split_type: expenseForm.split_type,
      shares: calculatedSplitShares.shares,
    }

    const updated = groups.map(g =>
      g.id === activeGroup.id
        ? { ...g, expenses: [newExpense, ...(g.expenses || [])] }
        : g
    )
    saveGroups(updated)
    setShowExpenseModal(false)
    flash(`Expense "${newExpense.title}" (${formatCurrency(amt)}) recorded!`)
  }

  const handleDeleteExpense = () => {
    if (!deleteExpenseTarget || !activeGroup) return
    const updated = groups.map(g =>
      g.id === activeGroup.id
        ? { ...g, expenses: (g.expenses || []).filter(e => e.id !== deleteExpenseTarget.id) }
        : g
    )
    saveGroups(updated)
    setDeleteExpenseTarget(null)
    flash('Expense removed.')
  }

  // --- Settle Up Handler ---
  const handleSettleUp = (e) => {
    e.preventDefault()
    const amt = parseFloat(settleForm.amount)
    if (!settleForm.from_id || !settleForm.to_id || !amt || amt <= 0 || !activeGroup) return

    const newSettlement = {
      id: `set_${Date.now()}`,
      from_id: settleForm.from_id,
      to_id: settleForm.to_id,
      amount: amt,
      date: today(),
    }

    const updated = groups.map(g =>
      g.id === activeGroup.id
        ? { ...g, settlements: [newSettlement, ...(g.settlements || [])] }
        : g
    )
    saveGroups(updated)
    setShowSettleModal(false)
    setSettleForm({ from_id: '', to_id: '', amount: '' })
    flash(`Settlement of ${formatCurrency(amt)} recorded!`)
  }

  const quickSettle = (debt) => {
    setSettleForm({
      from_id: debt.from.id,
      to_id: debt.to.id,
      amount: String(debt.amount),
    })
    setShowSettleModal(true)
  }

  const handleExportCsv = () => {
    if (!activeGroup) return
    setShowStatementModal(true)
  }

  return (
    <Layout title="Splitwise & Group Bill Splitting">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold text-sm">×</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Group Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider pl-1">
            Groups:
          </span>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroupId(g.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeGroupId === g.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-300 dark:shadow-none'
                  : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setEditGroupTarget(null)
            setGroupForm({ name: '', description: '' })
            setShowGroupModal(true)
          }}
          className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <Plus className="h-3.5 w-3.5" /> New Group
        </button>
      </div>

      {activeGroup ? (
        <div className="space-y-6">
          {/* Active Group Hero Card */}
          <div className="card bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white p-6 border-none shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-blue-400" />
                  {activeGroup.members?.length || 0} Members in Group
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {activeGroup.name}
                </h2>
                {activeGroup.description && (
                  <p className="text-xs text-blue-200">{activeGroup.description}</p>
                )}
                <div className="flex items-center gap-4 pt-2 text-xs">
                  <span>Total Spent: <strong className="text-white font-bold">{formatCurrency(balanceDetails.totalSpend)}</strong></span>
                  <span>•</span>
                  <span>Expenses: <strong className="text-emerald-300 font-bold">{activeGroup.expenses?.length || 0}</strong></span>
                </div>
              </div>

              {/* Group Quick Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={openNewExpenseModal}
                  className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Expense
                </button>
                <button
                  onClick={() => setShowStatementModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-sm transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-300" /> Statement & CSV
                </button>
                <button
                  onClick={() => setShowMemberModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-sm transition-all"
                >
                  <UserPlus className="h-4 w-4 text-blue-300" /> Add Friend
                </button>
                <button
                  onClick={() => {
                    setEditGroupTarget(activeGroup)
                    setGroupForm({ name: activeGroup.name, description: activeGroup.description || '' })
                    setShowGroupModal(true)
                  }}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Edit Group"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteGroupTarget(activeGroup)}
                  className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-rose-300 transition-colors"
                  title="Delete Group"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Settle Up & Who Owes Whom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Net Balances Per Person */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Group Balances</h3>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Net Position</span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {activeGroup.members?.map(m => {
                  const bal = balanceDetails.netBalances[m.id] || 0
                  const isPositive = bal > 0.5
                  const isNegative = bal < -0.5

                  return (
                    <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-gray-900 dark:text-white block">{m.name}</strong>
                        {m.phone && <span className="text-[10px] text-gray-400">{m.phone}</span>}
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded-lg text-xs ${
                        isPositive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : isNegative
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {isPositive ? `+${formatCurrency(bal)} (Gets back)` : isNegative ? `-${formatCurrency(Math.abs(bal))} (Owes)` : 'Settled'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Smart Debt Simplification ("Who Owes Whom") & WhatsApp Share */}
            <div className="card lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Settlement Summary (Who Owes Whom)</h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Simplified minimum-transaction settlement routes</p>
                </div>
                <button
                  onClick={() => {
                    setSettleForm({
                      from_id: activeGroup.members?.[1]?.id || '',
                      to_id: activeGroup.members?.[0]?.id || '',
                      amount: '',
                    })
                    setShowSettleModal(true)
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3"
                >
                  <HandCoins className="h-3.5 w-3.5 text-blue-600" /> Settle Manually
                </button>
              </div>

              {balanceDetails.debts.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="inline-flex p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white">All Dues Settled!</h4>
                  <p className="text-xs text-gray-400">No one owes anyone in this group right now.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {balanceDetails.debts.map((debt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <strong className="text-rose-600 dark:text-rose-400 font-bold">{debt.from.name}</strong>
                        <span className="text-gray-400">owes</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{debt.to.name}</strong>
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                          {formatCurrency(debt.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 1-Click WhatsApp Reminder */}
                        <a
                          href={getWhatsAppLink(debt)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                          title="Send WhatsApp payment reminder"
                        >
                          <Send className="h-3 w-3" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>

                        {/* Settle Up Action */}
                        <button
                          onClick={() => quickSettle(debt)}
                          className="btn-secondary text-[11px] py-1 px-2.5 font-bold"
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Group Expense Timeline Log */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Shared Expenses ({activeGroup.expenses?.length || 0})
              </h3>
              <button
                onClick={openNewExpenseModal}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Bill
              </button>
            </div>

            {(!activeGroup.expenses || activeGroup.expenses.length === 0) ? (
              <div className="py-10 text-center space-y-2">
                <Receipt className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-400">No expenses recorded for this group yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-800">
                {activeGroup.expenses.map(exp => {
                  let payerSummary = ''
                  if (exp.payer_mode === 'multiple' && exp.paid_by) {
                    const payerList = Object.entries(exp.paid_by).map(([pId, pAmt]) => {
                      const mName = activeGroup.members?.find(m => m.id === pId)?.name || pId
                      return `${mName} (₹${pAmt})`
                    })
                    payerSummary = `Paid by ${payerList.join(', ')}`
                  } else {
                    const payer = activeGroup.members?.find(m => m.id === exp.paid_by_id) || { name: 'Unknown' }
                    payerSummary = `Paid by ${payer.name}`
                  }

                  const splitTypeBadge = {
                    equal: 'Equal Split',
                    exact: 'Exact Amounts',
                    percent: 'Percentage %',
                    shares: 'Share Ratios',
                  }[exp.split_type || 'equal']

                  return (
                    <div key={exp.id} className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-gray-900 dark:text-white">{exp.title}</strong>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            {splitTypeBadge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">
                          {payerSummary} • {formatDate(exp.date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <strong className="text-sm font-extrabold text-gray-900 dark:text-white block">
                            {formatCurrency(exp.amount)}
                          </strong>
                          <span className="text-[10px] text-gray-400">
                            Split {Object.keys(exp.shares || {}).length} ways
                          </span>
                        </div>

                        <button
                          onClick={() => setDeleteExpenseTarget(exp)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Expense"
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
        </div>
      ) : (
        <div className="card py-16 text-center space-y-3">
          <Users className="h-10 w-10 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">No Groups Created Yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Create groups for your trips, apartment flatmates, or shared dinners to split bills easily with friends.
          </p>
          <button
            onClick={() => setShowGroupModal(true)}
            className="btn-primary text-xs py-2 px-4"
          >
            Create Your First Group
          </button>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Group Create/Edit Modal */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title={editGroupTarget ? 'Edit Group' : 'Create New Group'}
      >
        <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
          <div>
            <label className="label">Group Name *</label>
            <input
              type="text"
              placeholder="e.g. 🏖️ Goa Trip, 🏠 Flat Rent"
              value={groupForm.name}
              onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-xs font-semibold"
              required
            />
          </div>
          <div>
            <label className="label">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Hotel, food, fuel and tickets"
              value={groupForm.description}
              onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
              className="input-field text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowGroupModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs">{editGroupTarget ? 'Save Changes' : 'Create Group'}</button>
          </div>
        </form>
      </Modal>

      {/* Add Friend / Member Modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title={`Add Friend to "${activeGroup?.name}"`}
      >
        <form onSubmit={handleAddMember} className="space-y-4 text-xs">
          <div>
            <label className="label">Friend's Name *</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={memberForm.name}
              onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-xs font-semibold"
              required
            />
          </div>
          <div>
            <label className="label">WhatsApp Phone Number (Optional)</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={memberForm.phone}
              onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
              className="input-field text-xs"
            />
            <span className="text-[10px] text-gray-400">Used for 1-click WhatsApp payment reminders</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowMemberModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs">Add Friend</button>
          </div>
        </form>
      </Modal>

      {/* Advanced Expense Modal with Unequal, Exact, Percent & Multi-Payer */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title={`Add Expense to ${activeGroup?.name}`}
        size="lg"
      >
        <form onSubmit={handleAddExpense} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Expense Title *</label>
              <input
                type="text"
                placeholder="e.g. Beach Shack Seafood, Flights"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                className="input-field text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="label">Total Amount (₹) *</label>
              <input
                type="number"
                placeholder="15000"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                className="input-field text-xs font-bold text-emerald-600"
                required
                step="any"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="label">Expense Date</label>
            <input
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          {/* 1. PAYER MODE: Single vs Multi-Payer */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 dark:text-white uppercase tracking-wider text-[11px]">
                1. Who Paid Upfront?
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-0.5 rounded-lg border border-gray-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setExpenseForm(prev => ({ ...prev, payer_mode: 'single' }))}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                    expenseForm.payer_mode === 'single'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-slate-300'
                  }`}
                >
                  Single Payer
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseForm(prev => ({ ...prev, payer_mode: 'multiple' }))}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                    expenseForm.payer_mode === 'multiple'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-slate-300'
                  }`}
                >
                  Multiple Payers
                </button>
              </div>
            </div>

            {expenseForm.payer_mode === 'single' ? (
              <select
                value={expenseForm.paid_by_id}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, paid_by_id: e.target.value }))}
                className="input-field text-xs font-semibold"
              >
                {activeGroup?.members?.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-gray-500">Enter amount contributed upfront by each member:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeGroup?.members?.map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                      <span className="font-semibold text-gray-800 dark:text-slate-200 truncate">{m.name}</span>
                      <div className="flex items-center gap-1 w-28">
                        <span className="text-gray-400">₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={expenseForm.paid_by?.[m.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setExpenseForm(prev => ({
                              ...prev,
                              paid_by: { ...prev.paid_by, [m.id]: val }
                            }))
                          }}
                          className="input-field text-xs py-1 px-2 text-right font-bold"
                          step="any"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multi-payer allocation balance check */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-500">
                    Allocated: <strong>{formatCurrency(multiPayerAllocatedTotal)}</strong> of {formatCurrency(expenseForm.amount || 0)}
                  </span>
                  <span className={`font-bold ${
                    Math.abs(multiPayerAllocatedTotal - (parseFloat(expenseForm.amount) || 0)) < 0.05
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}>
                    {Math.abs(multiPayerAllocatedTotal - (parseFloat(expenseForm.amount) || 0)) < 0.05
                      ? '✓ Matched'
                      : `Difference: ${formatCurrency((parseFloat(expenseForm.amount) || 0) - multiPayerAllocatedTotal)}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. SPLIT STRATEGY: Equal, Exact, Percent, Shares */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 dark:text-white uppercase tracking-wider text-[11px]">
                2. Split Strategy
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-0.5 rounded-lg border border-gray-200 dark:border-slate-600 flex-wrap">
                {[
                  { id: 'equal', label: 'Equal', icon: Scale },
                  { id: 'exact', label: 'Exact ₹', icon: DollarSign },
                  { id: 'percent', label: 'Percent %', icon: Percent },
                  { id: 'shares', label: 'Shares', icon: Sliders },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setExpenseForm(prev => ({ ...prev, split_type: id }))}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                      expenseForm.split_type === id
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Member Participation Checkboxes */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Select who was involved in this bill:</span>
                <button
                  type="button"
                  onClick={() => {
                    const allIds = activeGroup?.members?.map(m => m.id) || []
                    setExpenseForm(prev => ({
                      ...prev,
                      selected_members: prev.selected_members.length === allIds.length ? [] : allIds
                    }))
                  }}
                  className="text-blue-600 font-bold hover:underline"
                >
                  {expenseForm.selected_members.length === activeGroup?.members?.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-1.5">
                {activeGroup?.members?.map(m => {
                  const isSelected = expenseForm.selected_members.includes(m.id)
                  return (
                    <div
                      key={m.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-2xs'
                          : 'bg-gray-100/60 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setExpenseForm(prev => ({
                              ...prev,
                              selected_members: checked
                                ? [...prev.selected_members, m.id]
                                : prev.selected_members.filter(id => id !== m.id)
                            }))
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-semibold text-gray-900 dark:text-white text-xs">{m.name}</span>
                      </label>

                      {/* Custom inputs per mode */}
                      {isSelected && (
                        <div className="flex items-center gap-1.5">
                          {expenseForm.split_type === 'exact' && (
                            <div className="flex items-center gap-1 w-28">
                              <span className="text-gray-400 font-bold">₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={expenseForm.exact_shares?.[m.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setExpenseForm(prev => ({
                                    ...prev,
                                    exact_shares: { ...prev.exact_shares, [m.id]: val }
                                  }))
                                }}
                                className="input-field text-xs py-1 px-2 text-right font-bold text-emerald-600"
                                step="any"
                              />
                            </div>
                          )}

                          {expenseForm.split_type === 'percent' && (
                            <div className="flex items-center gap-1 w-24">
                              <input
                                type="number"
                                placeholder="0"
                                value={expenseForm.percent_shares?.[m.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setExpenseForm(prev => ({
                                    ...prev,
                                    percent_shares: { ...prev.percent_shares, [m.id]: val }
                                  }))
                                }}
                                className="input-field text-xs py-1 px-2 text-right font-bold"
                                step="any"
                              />
                              <span className="text-gray-400 font-bold">%</span>
                            </div>
                          )}

                          {expenseForm.split_type === 'shares' && (
                            <div className="flex items-center gap-1 w-24">
                              <input
                                type="number"
                                placeholder="1"
                                value={expenseForm.ratio_shares?.[m.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setExpenseForm(prev => ({
                                    ...prev,
                                    ratio_shares: { ...prev.ratio_shares, [m.id]: val }
                                  }))
                                }}
                                className="input-field text-xs py-1 px-2 text-right font-bold"
                                step="any"
                              />
                              <span className="text-[10px] text-gray-400">shr</span>
                            </div>
                          )}

                          <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 min-w-16 text-right">
                            {formatCurrency(calculatedSplitShares.shares?.[m.id] || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Status helper banner */}
              <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                calculatedSplitShares.isValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                <span>{calculatedSplitShares.message}</span>
                {calculatedSplitShares.isValid && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button
              type="submit"
              disabled={!calculatedSplitShares.isValid}
              className="btn-primary text-xs disabled:opacity-50"
            >
              Record & Split Bill
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Settlement Modal */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        title="Record Debt Settlement"
      >
        <form onSubmit={handleSettleUp} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Payer (Who paid?)</label>
              <select
                value={settleForm.from_id}
                onChange={(e) => setSettleForm(prev => ({ ...prev, from_id: e.target.value }))}
                className="input-field text-xs font-semibold"
                required
              >
                <option value="">Select Payer</option>
                {activeGroup?.members?.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Receiver (Paid to whom?)</label>
              <select
                value={settleForm.to_id}
                onChange={(e) => setSettleForm(prev => ({ ...prev, to_id: e.target.value }))}
                className="input-field text-xs font-semibold"
                required
              >
                <option value="">Select Receiver</option>
                {activeGroup?.members?.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Settlement Amount (₹) *</label>
            <input
              type="number"
              placeholder="1500"
              value={settleForm.amount}
              onChange={(e) => setSettleForm(prev => ({ ...prev, amount: e.target.value }))}
              className="input-field text-xs font-bold text-emerald-600"
              required
              step="any"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowSettleModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs">Record Settlement</button>
          </div>
        </form>
      </Modal>

      {/* Group Itemized Statement Modal */}
      <SplitwiseStatementModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        group={activeGroup}
        balanceDetails={balanceDetails}
      />

      {/* Delete Group Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteGroupTarget)}
        title="Delete Group?"
        message={`Are you sure you want to delete "${deleteGroupTarget?.name}" and all its recorded expenses?`}
        confirmLabel="Delete Group"
        danger
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupTarget(null)}
      />

      {/* Delete Expense Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteExpenseTarget)}
        title="Delete Expense?"
        message={`Remove "${deleteExpenseTarget?.title}" from group expenses?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteExpenseTarget(null)}
      />
    </Layout>
  )
}
