import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import SplitwiseStatementModal from '../components/SplitwiseStatementModal'
import SplitwisePrintableSummaryModal from '../components/SplitwisePrintableSummaryModal'
import AiReceiptScannerModal from '../components/AiReceiptScannerModal'
import ReceiptPreviewModal from '../components/ReceiptPreviewModal'
import ShareTripModal from '../components/ShareTripModal'
import { publishOrSyncSharedGroup, fetchSharedGroupByToken, updateSharedTripData } from '../features/splitwise/api/sharedTripService'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, today } from '../utils/dateUtils'
import { SUPPORTED_CURRENCIES, convertToInr } from '../utils/currencyConverter'
import { getExpenseCategoryVisuals, groupExpensesByMonth } from '../utils/splitwiseVisuals'
import {
  Users,
  User,
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
  ChevronDown,
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
  Paperclip,
  Activity,
  List,
  Search,
  Filter,
  Check,
  X,
  FileText,
  UploadCloud,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'

const DEFAULT_MEMBERS = [
  { id: 'm-1', name: 'You (Owner)', email: 'you@example.com', phone: '', isOwner: true, avatarBg: 'bg-emerald-600' },
  { id: 'm-2', name: 'Rahul Sharma', email: 'rahul@example.com', phone: '9876543210', isOwner: false, avatarBg: 'bg-blue-600' },
  { id: 'm-3', name: 'Sneha Patel', email: 'sneha@example.com', phone: '9876543211', isOwner: false, avatarBg: 'bg-purple-600' },
  { id: 'm-4', name: 'Amit Kumar', email: 'amit@example.com', phone: '9876543212', isOwner: false, avatarBg: 'bg-amber-600' },
  { id: 'm-5', name: 'Karthik Rao', email: 'karthik@example.com', phone: '9123456780', isOwner: false, avatarBg: 'bg-indigo-600' },
  { id: 'm-6', name: 'Vikas Mishra', email: 'vikas@example.com', phone: '9123456781', isOwner: false, avatarBg: 'bg-rose-600' },
]

const DEFAULT_GROUPS = [
  {
    id: 'grp-seed-1',
    name: '🏖️ Goa Vacation Trip',
    description: 'Flights, Airbnb, beach dinners and scooter rentals',
    icon: '🏖️',
    members: [
      { id: 'm-1', name: 'You (Owner)', phone: '', isOwner: true },
      { id: 'm-2', name: 'Rahul Sharma', phone: '9876543210', isOwner: false },
      { id: 'm-3', name: 'Sneha Patel', phone: '9876543211', isOwner: false },
      { id: 'm-4', name: 'Amit Kumar', phone: '9876543212', isOwner: false },
    ],
    expenses: [
      {
        id: 'exp-1',
        title: 'Villa Stay & Airbnb Booking',
        amount: 24000,
        currency: 'INR',
        payer_mode: 'single',
        paid_by_id: 'm-1',
        date: '2026-09-20',
        split_type: 'equal',
        shares: { 'm-1': 6000, 'm-2': 6000, 'm-3': 6000, 'm-4': 6000 },
        receipt_url: '',
        notes: '3-night stay at Candolim beach villa',
      },
      {
        id: 'exp-2',
        title: 'Seafood Beach Shack Dinner',
        amount: 6800,
        currency: 'INR',
        payer_mode: 'multiple',
        paid_by: { 'm-1': 4000, 'm-2': 2800 },
        date: '2026-09-21',
        split_type: 'exact',
        shares: { 'm-1': 2000, 'm-2': 1800, 'm-3': 1500, 'm-4': 1500 },
        receipt_url: '',
        notes: 'Crab, prawns, drinks and dessert',
      },
      {
        id: 'exp-3',
        title: 'Scooters & Fuel',
        amount: 3600,
        currency: 'INR',
        payer_mode: 'single',
        paid_by_id: 'm-3',
        date: '2026-09-22',
        split_type: 'equal',
        shares: { 'm-1': 900, 'm-2': 900, 'm-3': 900, 'm-4': 900 },
        receipt_url: '',
        notes: '4 Activas rented for 3 days',
      },
    ],
    settlements: [],
  },
  {
    id: 'grp-seed-2',
    name: '🏠 Flat 402 Utilities & Groceries',
    description: 'Rent, WiFi, maid, electricity and daily groceries',
    icon: '🏠',
    members: [
      { id: 'm-1', name: 'You (Owner)', phone: '', isOwner: true },
      { id: 'm-5', name: 'Karthik Rao', phone: '9123456780', isOwner: false },
      { id: 'm-6', name: 'Vikas Mishra', phone: '9123456781', isOwner: false },
    ],
    expenses: [
      {
        id: 'exp-4',
        title: 'High-Speed Broadband WiFi',
        amount: 1499,
        currency: 'INR',
        payer_mode: 'single',
        paid_by_id: 'm-1',
        date: '2026-09-01',
        split_type: 'equal',
        shares: { 'm-1': 499.66, 'm-5': 499.67, 'm-6': 499.67 },
        receipt_url: '',
        notes: 'Airtel Xstream Fiber 300 Mbps',
      },
      {
        id: 'exp-5',
        title: 'Monthly Supermarket Supplies',
        amount: 4500,
        currency: 'INR',
        payer_mode: 'single',
        paid_by_id: 'm-5',
        date: '2026-09-12',
        split_type: 'equal',
        shares: { 'm-1': 1500, 'm-5': 1500, 'm-6': 1500 },
        receipt_url: '',
        notes: 'Rice, oil, spices, cleaning supplies',
      },
    ],
    settlements: [],
  },
]

export default function Splitwise() {
  const { user } = useAuth()
  const storageGroupsKey = `ft_splitwise_groups_${user?.id || 'guest'}`
  const storageFriendsKey = `ft_splitwise_friends_${user?.id || 'guest'}`
  const storageActivitiesKey = `ft_splitwise_activities_${user?.id || 'guest'}`

  // --- Core Persistence States ---
  const [groups, setGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(storageGroupsKey)
      return saved ? JSON.parse(saved) : DEFAULT_GROUPS
    } catch {
      return DEFAULT_GROUPS
    }
  })

  const [friends, setFriends] = useState(() => {
    try {
      const saved = localStorage.getItem(storageFriendsKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      return DEFAULT_MEMBERS.filter(m => !m.isOwner)
    } catch {
      return DEFAULT_MEMBERS.filter(m => !m.isOwner)
    }
  })

  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(storageActivitiesKey)
      return saved ? JSON.parse(saved) : [
        { id: 'act-1', text: 'You added "Villa Stay & Airbnb Booking" in 🏖️ Goa Vacation Trip', date: '2026-09-20', time: '14:30' },
        { id: 'act-2', text: 'Sneha Patel added "Scooters & Fuel" in 🏖️ Goa Vacation Trip', date: '2026-09-22', time: '11:15' },
        { id: 'act-3', text: 'Karthik Rao added "Monthly Supermarket Supplies" in 🏠 Flat 402 Utilities & Groceries', date: '2026-09-12', time: '18:40' },
      ]
    } catch {
      return []
    }
  })

  // Reload groups, friends, and activities when authenticated user resolves
  useEffect(() => {
    if (!user?.id) return
    try {
      const userGroupsKey = `ft_splitwise_groups_${user.id}`
      const userFriendsKey = `ft_splitwise_friends_${user.id}`
      const userActivitiesKey = `ft_splitwise_activities_${user.id}`

      const savedGroups = localStorage.getItem(userGroupsKey)
      const guestGroups = localStorage.getItem('ft_splitwise_groups_guest')
      if (savedGroups) {
        setGroups(JSON.parse(savedGroups))
      } else if (guestGroups) {
        setGroups(JSON.parse(guestGroups))
        localStorage.setItem(userGroupsKey, guestGroups)
      }

      const savedFriends = localStorage.getItem(userFriendsKey)
      const guestFriends = localStorage.getItem('ft_splitwise_friends_guest')
      if (savedFriends) {
        setFriends(JSON.parse(savedFriends))
      } else if (guestFriends) {
        setFriends(JSON.parse(guestFriends))
        localStorage.setItem(userFriendsKey, guestFriends)
      }

      const savedActivities = localStorage.getItem(userActivitiesKey)
      if (savedActivities) {
        setActivities(JSON.parse(savedActivities))
      }
    } catch {}
  }, [user?.id])

  // --- Navigation & View Mode State ---
  // view: 'dashboard' | 'recent_activity' | 'all_expenses' | 'group' | 'friend'
  const [currentView, setCurrentView] = useState('dashboard')
  const [activeGroupId, setActiveGroupId] = useState(() => groups[0]?.id || null)
  const [activeFriendId, setActiveFriendId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedExpenseId, setExpandedExpenseId] = useState(null)

  // Feedback states
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showFriendModal, setShowFriendModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [showPrintableSummaryModal, setShowPrintableSummaryModal] = useState(false)
  const [editingGroupMember, setEditingGroupMember] = useState(null)
  const [showEditGroupMemberModal, setShowEditGroupMemberModal] = useState(false)
  const [showAiScannerModal, setShowAiScannerModal] = useState(false)
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState('')
  const [editGroupTarget, setEditGroupTarget] = useState(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState(null)
  const [editExpenseTarget, setEditExpenseTarget] = useState(null)
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState(null)
  const [editFriendTarget, setEditFriendTarget] = useState(null)
  const [deleteFriendTarget, setDeleteFriendTarget] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [activeShareGroup, setActiveShareGroup] = useState(null)
  const [groupCategoryFilter, setGroupCategoryFilter] = useState('all')

  // Forms
  const [groupForm, setGroupForm] = useState({ name: '', description: '', icon: '👥' })
  const [friendForm, setFriendForm] = useState({ name: '', phone: '', email: '' })
  const [settleForm, setSettleForm] = useState({ from_id: '', to_id: '', amount: '', notes: '' })

  // Expense Form with Receipt / Bill Attachment State
  const [expenseForm, setExpenseForm] = useState({
    split_target_type: 'group', // 'group' | 'friend'
    friend_id: '',
    group_id: '',
    title: '',
    amount: '',
    currency: 'INR',
    date: today(),
    notes: '',
    receipt_url: '',
    receipt_name: '',
    payer_mode: 'single', // 'single' | 'multiple'
    paid_by_id: 'm-1',
    paid_by: {},
    split_type: 'equal', // 'equal' | 'exact' | 'percent' | 'shares'
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

  // --- Persistence Handlers ---
  const saveGroups = useCallback((newGroups) => {
    setGroups(newGroups)
    try {
      localStorage.setItem(storageGroupsKey, JSON.stringify(newGroups))
    } catch {}
  }, [storageGroupsKey])

  const saveFriends = useCallback((newFriends) => {
    setFriends(newFriends)
    try {
      localStorage.setItem(storageFriendsKey, JSON.stringify(newFriends))
    } catch {}
  }, [storageFriendsKey])

  const logActivity = useCallback((text) => {
    const act = {
      id: `act_${Date.now()}`,
      text,
      date: today(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setActivities(prev => {
      const next = [act, ...prev].slice(0, 50)
      try {
        localStorage.setItem(storageActivitiesKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [storageActivitiesKey])

  // Current active group
  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === activeGroupId) || groups[0] || null
  }, [groups, activeGroupId])

  // Current active friend
  const activeFriend = useMemo(() => {
    return friends.find(f => f.id === activeFriendId) || null
  }, [friends, activeFriendId])

  // --- Global Balance Calculations across ALL Groups & Friends ---
  const globalBalances = useMemo(() => {
    // You are considered m-1 or member with isOwner: true
    const youIds = new Set(['m-1'])

    // Person net balance map: { [personId]: number }
    const friendNetBalances = {}
    friends.forEach(f => { friendNetBalances[f.id] = 0 })

    // Track detailed debts per group
    const allDebts = []

    groups.forEach(grp => {
      const members = grp.members || []
      const expenses = grp.expenses || []
      const settlements = grp.settlements || []

      const groupNet = {}
      members.forEach(m => {
        groupNet[m.id] = 0
        if (m.isOwner) youIds.add(m.id)
      })

      // 1. Process Expenses
      expenses.forEach(exp => {
        const amt = parseFloat(exp.amount) || 0
        if (exp.payer_mode === 'multiple' && exp.paid_by && typeof exp.paid_by === 'object') {
          Object.entries(exp.paid_by).forEach(([pId, pAmt]) => {
            if (groupNet[pId] !== undefined) groupNet[pId] += parseFloat(pAmt) || 0
          })
        } else if (exp.paid_by_id && groupNet[exp.paid_by_id] !== undefined) {
          groupNet[exp.paid_by_id] += amt
        }

        Object.entries(exp.shares || {}).forEach(([mId, share]) => {
          if (groupNet[mId] !== undefined) groupNet[mId] -= parseFloat(share) || 0
        })
      })

      // 2. Process Settlements
      settlements.forEach(s => {
        const amt = parseFloat(s.amount) || 0
        if (groupNet[s.from_id] !== undefined) groupNet[s.from_id] += amt
        if (groupNet[s.to_id] !== undefined) groupNet[s.to_id] -= amt
      })

      // 3. Compute simplified debts for this group (Greedy algorithm)
      const creditors = []
      const debtors = []

      Object.entries(groupNet).forEach(([mId, bal]) => {
        const rounded = Math.round(bal * 100) / 100
        if (rounded > 0.5) creditors.push({ id: mId, amount: rounded })
        else if (rounded < -0.5) debtors.push({ id: mId, amount: -rounded })
      })

      creditors.sort((a, b) => b.amount - a.amount)
      debtors.sort((a, b) => b.amount - a.amount)

      let i = 0, j = 0
      while (i < debtors.length && j < creditors.length) {
        const d = debtors[i]
        const c = creditors[j]
        const settle = Math.min(d.amount, c.amount)

        if (settle > 0.5) {
          const fromMember = members.find(m => m.id === d.id) || { id: d.id, name: 'Someone' }
          const toMember = members.find(m => m.id === c.id) || { id: c.id, name: 'Someone' }

          allDebts.push({
            group: grp,
            from: fromMember,
            to: toMember,
            amount: Math.round(settle * 100) / 100,
          })

          // Add to friend net balances
          if (youIds.has(fromMember.id)) {
            // You owe someone
            friendNetBalances[toMember.id] = (friendNetBalances[toMember.id] || 0) - settle
          } else if (youIds.has(toMember.id)) {
            // Someone owes you
            friendNetBalances[fromMember.id] = (friendNetBalances[fromMember.id] || 0) + settle
          }
        }

        d.amount -= settle
        c.amount -= settle
        if (d.amount < 0.5) i++
        if (c.amount < 0.5) j++
      }
    })

    // Compute splitwise signature 3-box numbers
    let youOweTotal = 0
    let youAreOwedTotal = 0

    const youOweList = []
    const youAreOwedList = []

    Object.entries(friendNetBalances).forEach(([fId, bal]) => {
      const friendObj = friends.find(f => f.id === fId) || { id: fId, name: 'Friend' }
      const rounded = Math.round(bal * 100) / 100

      if (rounded > 0.5) {
        youAreOwedTotal += rounded
        youAreOwedList.push({ friend: friendObj, amount: rounded })
      } else if (rounded < -0.5) {
        const oweAmt = Math.abs(rounded)
        youOweTotal += oweAmt
        youOweList.push({ friend: friendObj, amount: oweAmt })
      }
    })

    const totalBalance = Math.round((youAreOwedTotal - youOweTotal) * 100) / 100

    return {
      totalBalance,
      youOweTotal: Math.round(youOweTotal * 100) / 100,
      youAreOwedTotal: Math.round(youAreOwedTotal * 100) / 100,
      youOweList,
      youAreOwedList,
      allDebts,
      friendNetBalances,
    }
  }, [groups, friends])

  // Active Group specific calculation
  const activeGroupBalanceDetails = useMemo(() => {
    if (!activeGroup) return { totalSpend: 0, netBalances: {}, debts: [] }

    const members = activeGroup.members || []
    const expenses = activeGroup.expenses || []
    const settlements = activeGroup.settlements || []

    let totalSpend = 0
    const netBalances = {}
    members.forEach(m => { netBalances[m.id] = 0 })

    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount) || 0
      totalSpend += amt

      if (exp.payer_mode === 'multiple' && exp.paid_by && typeof exp.paid_by === 'object') {
        Object.entries(exp.paid_by).forEach(([pId, pAmt]) => {
          if (netBalances[pId] !== undefined) netBalances[pId] += parseFloat(pAmt) || 0
        })
      } else if (exp.paid_by_id && netBalances[exp.paid_by_id] !== undefined) {
        netBalances[exp.paid_by_id] += amt
      }

      Object.entries(exp.shares || {}).forEach(([mId, share]) => {
        if (netBalances[mId] !== undefined) netBalances[mId] -= parseFloat(share) || 0
      })
    })

    settlements.forEach(s => {
      const amt = parseFloat(s.amount) || 0
      if (netBalances[s.from_id] !== undefined) netBalances[s.from_id] += amt
      if (netBalances[s.to_id] !== undefined) netBalances[s.to_id] -= amt
    })

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
      const d = debtors[i]
      const c = creditors[j]
      const settleAmount = Math.min(d.amount, c.amount)

      if (settleAmount > 0.5) {
        debts.push({
          from: members.find(m => m.id === d.id) || { id: d.id, name: 'Unknown' },
          to: members.find(m => m.id === c.id) || { id: c.id, name: 'Unknown' },
          amount: Math.round(settleAmount * 100) / 100,
        })
      }

      d.amount -= settleAmount
      c.amount -= settleAmount
      if (d.amount < 0.5) i++
      if (c.amount < 0.5) j++
    }

    return { totalSpend, netBalances, debts }
  }, [activeGroup])

  // WhatsApp Reminder Link Generator
  const getWhatsAppLink = (debt) => {
    const phone = (debt.from?.phone || '').replace(/\D/g, '')
    const groupName = debt.group?.name || activeGroup?.name || 'our shared expense'
    const msg = encodeURIComponent(
      `Hi ${debt.from?.name || 'Friend'}! Friendly reminder: your Splitwise share for "${groupName}" is ${formatCurrency(debt.amount)}. You can pay via UPI whenever convenient!`
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
          ? { ...g, name: groupForm.name.trim(), description: groupForm.description.trim(), icon: groupForm.icon || '👥' }
          : g
      )
      saveGroups(updated)
      flash('Group updated!')
      logActivity(`You updated the group details for "${groupForm.name.trim()}"`)
    } else {
      const newGroup = {
        id: `grp_${Date.now()}`,
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        icon: groupForm.icon || '👥',
        members: [
          { id: 'm-1', name: 'You (Owner)', phone: '', isOwner: true },
          ...friends.map(f => ({ id: f.id, name: f.name, phone: f.phone || '', isOwner: false })),
        ],
        expenses: [],
        settlements: [],
      }
      const updated = [newGroup, ...groups]
      saveGroups(updated)
      setActiveGroupId(newGroup.id)
      setCurrentView('group')
      flash(`Group "${newGroup.name}" created!`)
      logActivity(`You created group "${newGroup.name}"`)
    }

    setShowGroupModal(false)
    setEditGroupTarget(null)
    setGroupForm({ name: '', description: '', icon: '👥' })
  }

  const handleDeleteGroup = () => {
    if (!deleteGroupTarget) return
    const updated = groups.filter(g => g.id !== deleteGroupTarget.id)
    saveGroups(updated)
    setActiveGroupId(updated[0]?.id || null)
    setDeleteGroupTarget(null)
    flash('Group deleted.')
    logActivity(`You deleted group "${deleteGroupTarget.name}"`)
  }

  // --- Group Member Edit Handler ---
  const handleSaveGroupMemberEdit = (e) => {
    e.preventDefault()
    if (!editingGroupMember || !editingGroupMember.name.trim() || !activeGroup) return
    const trimmedName = editingGroupMember.name.trim()
    const trimmedPhone = (editingGroupMember.phone || '').trim()

    const updatedGroups = groups.map(g => {
      if (g.id !== activeGroup.id) return g
      const updatedMembers = (g.members || []).map(m =>
        m.id === editingGroupMember.id ? { ...m, name: trimmedName, phone: trimmedPhone } : m
      )
      return { ...g, members: updatedMembers }
    })

    saveGroups(updatedGroups)

    if (activeGroup.share_token) {
      updateSharedTripData(activeGroup.share_token, {
        members: (activeGroup.members || []).map(m =>
          m.id === editingGroupMember.id ? { ...m, name: trimmedName, phone: trimmedPhone } : m
        )
      })
    }

    setShowEditGroupMemberModal(false)
    setEditingGroupMember(null)
    flash(`Updated member name: ${trimmedName}`)
  }

  // --- Share Trip Handler ---
  const handleOpenShareTrip = async (grp = null) => {
    const targetGroup = grp || activeGroup
    if (!targetGroup) return
    try {
      const synced = await publishOrSyncSharedGroup(targetGroup, user?.id)
      const updated = groups.map(g => g.id === targetGroup.id ? { ...g, share_token: synced.share_token, is_shared: true, budget: synced.budget } : g)
      saveGroups(updated)
      setActiveShareGroup({ ...targetGroup, share_token: synced.share_token, budget: synced.budget })
      setShowShareModal(true)
      flash(`Trip link ready for "${targetGroup.name}"! Anyone with the link can edit.`)
    } catch {
      setActiveShareGroup(targetGroup)
      setShowShareModal(true)
    }
  }

  // Real-time synchronization check for active shared trip
  useEffect(() => {
    if (!activeGroup?.share_token || !activeGroup?.is_shared) return

    const syncSharedTrip = async () => {
      // 1. Guard: Never overwrite local data if user made changes in the last 15 seconds
      if (Date.now() - lastLocalEditRef.current < 15000) {
        return
      }

      try {
        const { group: remoteGroup } = await fetchSharedGroupByToken(activeGroup.share_token)
        if (!remoteGroup) return

        const localExpenses = activeGroup.expenses || []
        const remoteExpenses = remoteGroup.expenses || []

        // 2. Guard: If remote has fewer expenses than local, remote is behind! Push local to remote, never delete local!
        if (remoteExpenses.length < localExpenses.length) {
          updateSharedTripData(activeGroup.share_token, {
            expenses: localExpenses,
            members: activeGroup.members || [],
            budget: activeGroup.budget || 0,
          })
          return
        }

        // 3. Check for genuine new remote items (e.g. friend added an expense from their phone)
        const localIds = new Set(localExpenses.map(e => e.id))
        const hasNewRemoteExpenses = remoteExpenses.some(e => !localIds.has(e.id))
        const hasDifferentMembers = (remoteGroup.members || []).length !== (activeGroup.members || []).length

        if (hasNewRemoteExpenses || hasDifferentMembers) {
          // Merge safely: preserve all local expenses and append new remote expenses
          const mergedExpenses = [...localExpenses]
          remoteExpenses.forEach(re => {
            if (!localIds.has(re.id)) {
              mergedExpenses.push(re)
            }
          })
          const updated = groups.map(g =>
            g.id === activeGroup.id
              ? {
                  ...g,
                  expenses: mergedExpenses,
                  members: remoteGroup.members || g.members,
                  budget: remoteGroup.budget ?? g.budget,
                }
              : g
          )
          saveGroups(updated)
        }
      } catch {}
    }

    const interval = setInterval(syncSharedTrip, 6000)
    return () => clearInterval(interval)
  }, [activeGroup, groups, saveGroups])

  // --- Friend Handlers ---
  const handleSaveFriend = (e) => {
    e.preventDefault()
    if (!friendForm.name.trim()) return

    if (editFriendTarget) {
      const updatedFriend = {
        ...editFriendTarget,
        name: friendForm.name.trim(),
        phone: friendForm.phone.trim(),
        email: friendForm.email.trim(),
      }

      const updatedFriends = friends.map(f => f.id === editFriendTarget.id ? updatedFriend : f)
      saveFriends(updatedFriends)

      // Also update member name and phone in all groups
      const updatedGroups = groups.map(g => ({
        ...g,
        members: (g.members || []).map(m => m.id === editFriendTarget.id ? { ...m, name: updatedFriend.name, phone: updatedFriend.phone } : m),
      }))
      saveGroups(updatedGroups)

      setShowFriendModal(false)
      setEditFriendTarget(null)
      setFriendForm({ name: '', phone: '', email: '' })
      flash(`Updated details for ${updatedFriend.name}!`)
      logActivity(`You updated friend "${updatedFriend.name}"`)
      return
    }

    const bgColors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600', 'bg-indigo-600']
    const newFriend = {
      id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: friendForm.name.trim(),
      phone: friendForm.phone.trim(),
      email: friendForm.email.trim(),
      isOwner: false,
      avatarBg: bgColors[Math.floor(Math.random() * bgColors.length)],
    }

    const updatedFriends = [...friends, newFriend]
    saveFriends(updatedFriends)

    // Also add to active group if currently in group view
    if (activeGroup && currentView === 'group') {
      const updatedGroups = groups.map(g =>
        g.id === activeGroup.id
          ? { ...g, members: [...(g.members || []), { id: newFriend.id, name: newFriend.name, phone: newFriend.phone, isOwner: false }] }
          : g
      )
      saveGroups(updatedGroups)
    }

    setShowFriendModal(false)
    setFriendForm({ name: '', phone: '', email: '' })
    flash(`Added ${newFriend.name} as a friend!`)
    logActivity(`You added ${newFriend.name} to your Splitwise friends`)
  }

  const handleDeleteFriend = () => {
    if (!deleteFriendTarget) return

    const friendId = deleteFriendTarget.id
    const updatedFriends = friends.filter(f => f.id !== friendId)
    saveFriends(updatedFriends)

    const updatedGroups = groups.map(g => ({
      ...g,
      members: (g.members || []).filter(m => m.id !== friendId),
    }))
    saveGroups(updatedGroups)

    if (activeFriendId === friendId) {
      setActiveFriendId(null)
      setCurrentView('dashboard')
    }

    flash(`Friend "${deleteFriendTarget.name}" removed.`)
    logActivity(`You removed friend "${deleteFriendTarget.name}"`)
    setDeleteFriendTarget(null)
  }

  // --- Open Add Expense Modal with Smart Defaults ---
  const openNewExpenseModal = (targetGroupId = null, targetFriendId = null) => {
    // 1. Direct friend split request
    if (targetFriendId || (currentView === 'friend' && activeFriendId)) {
      const fId = targetFriendId || activeFriendId
      const targetFriend = friends.find(f => f.id === fId) || friends[0]
      const participants = [
        { id: 'm-1', name: 'You (Owner)', isOwner: true },
        targetFriend,
      ].filter(Boolean)

      const initialExact = {}
      const initialPercent = {}
      const initialShares = {}
      const initialPaidBy = {}
      participants.forEach(m => {
        initialExact[m.id] = ''
        initialPercent[m.id] = (100 / (participants.length || 1)).toFixed(1)
        initialShares[m.id] = 1
        initialPaidBy[m.id] = ''
      })

      setEditExpenseTarget(null)
      setExpenseForm({
        split_target_type: 'friend',
        friend_id: targetFriend?.id || '',
        group_id: '',
        title: '',
        amount: '',
        currency: 'INR',
        date: today(),
        notes: '',
        receipt_url: '',
        receipt_name: '',
        payer_mode: 'single',
        paid_by_id: 'm-1',
        paid_by: initialPaidBy,
        split_type: 'equal',
        selected_members: participants.map(m => m.id),
        exact_shares: initialExact,
        percent_shares: initialPercent,
        ratio_shares: initialShares,
      })
      setShowExpenseModal(true)
      return
    }

    // 2. Group split
    const targetGroup = groups.find(g => g.id === (targetGroupId || activeGroupId)) || groups[0]
    if (!targetGroup) return

    // Auto-enrich: If the group only has You (Owner), pull in friends from friends list so friends always appear!
    let members = [...(targetGroup.members || [])]
    if (members.length <= 1 && friends.length > 0) {
      const missingFriends = friends.filter(f => !members.some(m => m.id === f.id)).slice(0, 4)
      members = [...members, ...missingFriends.map(f => ({ id: f.id, name: f.name, phone: f.phone || '', isOwner: false }))]
      const updated = groups.map(g => g.id === targetGroup.id ? { ...g, members } : g)
      saveGroups(updated)
    }

    const defaultSelected = members.map(m => m.id)
    const initialExact = {}
    const initialPercent = {}
    const initialShares = {}
    const initialPaidBy = {}

    members.forEach(m => {
      initialExact[m.id] = ''
      initialPercent[m.id] = (100 / (members.length || 1)).toFixed(1)
      initialShares[m.id] = 1
      initialPaidBy[m.id] = ''
    })

    setEditExpenseTarget(null)
    setExpenseForm({
      split_target_type: 'group',
      friend_id: '',
      group_id: targetGroup.id,
      title: '',
      amount: '',
      currency: 'INR',
      date: today(),
      notes: '',
      receipt_url: '',
      receipt_name: '',
      payer_mode: 'single',
      paid_by_id: 'm-1',
      paid_by: initialPaidBy,
      split_type: 'equal',
      selected_members: defaultSelected,
      exact_shares: initialExact,
      percent_shares: initialPercent,
      ratio_shares: initialShares,
    })
    setShowExpenseModal(true)
  }

  // --- Open Edit Expense Modal with Existing Details ---
  const openEditExpenseModal = (exp, targetGroup = null) => {
    const parentGroup = targetGroup || groups.find(g => (g.expenses || []).some(e => e.id === exp.id)) || activeGroup
    if (!parentGroup) return

    const members = parentGroup.members || []
    const initialExact = {}
    const initialPercent = {}
    const initialShares = {}
    const initialPaidBy = {}

    members.forEach(m => {
      initialExact[m.id] = exp.shares?.[m.id] !== undefined ? String(exp.shares[m.id]) : ''
      initialPercent[m.id] = exp.shares?.[m.id] && exp.amount > 0
        ? ((exp.shares[m.id] / exp.amount) * 100).toFixed(1)
        : (100 / (members.length || 1)).toFixed(1)
      initialShares[m.id] = 1
      initialPaidBy[m.id] = exp.paid_by?.[m.id] !== undefined ? String(exp.paid_by[m.id]) : ''
    })

    const selectedMembers = exp.shares && Object.keys(exp.shares).length > 0
      ? Object.keys(exp.shares)
      : members.map(m => m.id)

    setEditExpenseTarget(exp)
    setExpenseForm({
      split_target_type: parentGroup.direct_friend_id ? 'friend' : 'group',
      friend_id: parentGroup.direct_friend_id || '',
      group_id: parentGroup.id,
      title: exp.title || '',
      amount: String(exp.amount || ''),
      currency: exp.currency || 'INR',
      date: exp.date || today(),
      notes: exp.notes || '',
      receipt_url: exp.receipt_url || '',
      receipt_name: exp.receipt_name || (exp.receipt_url ? 'Attached Receipt' : ''),
      payer_mode: exp.payer_mode || (exp.paid_by && Object.keys(exp.paid_by).length > 0 ? 'multiple' : 'single'),
      paid_by_id: exp.paid_by_id || 'm-1',
      paid_by: exp.paid_by || initialPaidBy,
      split_type: exp.split_type || 'equal',
      selected_members: selectedMembers,
      exact_shares: exp.exact_shares || initialExact,
      percent_shares: exp.percent_shares || initialPercent,
      ratio_shares: exp.ratio_shares || initialShares,
    })
    setShowExpenseModal(true)
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
      title: note || prev.title || 'Restaurant / Bill',
      receipt_url: previewUrl || prev.receipt_url,
      receipt_name: file?.name || 'Scanned_Bill_Receipt.jpg',
    }))
    flash('✨ Bill scanned successfully! Amount, store & date auto-populated.')
  }

  // Calculate Multi-Payer Allocated Total
  const multiPayerAllocatedTotal = useMemo(() => {
    if (expenseForm.payer_mode !== 'multiple') return Number(expenseForm.amount) || 0
    return Object.values(expenseForm.paid_by || {}).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  }, [expenseForm.payer_mode, expenseForm.paid_by, expenseForm.amount])

  // Active Expense Participants (resolves group members or direct friend)
  const activeExpenseParticipants = useMemo(() => {
    if (expenseForm.split_target_type === 'friend') {
      const selectedFriend = friends.find(f => f.id === expenseForm.friend_id) || friends[0]
      const ownerMember = { id: 'm-1', name: 'You (Owner)', isOwner: true }
      return selectedFriend ? [ownerMember, selectedFriend] : [ownerMember]
    }
    const targetGroup = groups.find(g => g.id === expenseForm.group_id) || activeGroup
    return targetGroup?.members || []
  }, [expenseForm.split_target_type, expenseForm.friend_id, expenseForm.group_id, groups, activeGroup, friends])

  // Calculate Split Shares Dynamically
  const calculatedSplitShares = useMemo(() => {
    const total = parseFloat(expenseForm.amount) || 0
    const activeMembers = activeExpenseParticipants
    const selectedIds = (expenseForm.selected_members || []).filter(id => activeMembers.some(m => m.id === id))
    const shares = {}

    if (total <= 0 || selectedIds.length === 0) {
      return { shares: {}, isValid: false, message: 'Enter a valid amount and select participants.' }
    }

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
  }, [expenseForm, groups, activeGroup])

  // --- Save Expense Handler ---
  const handleSaveExpense = (e) => {
    e.preventDefault()
    let rawAmt = parseFloat(expenseForm.amount)
    if (!expenseForm.title.trim() || !rawAmt || rawAmt <= 0) return

    let targetGroup = null
    let workingGroups = [...groups]

    if (expenseForm.split_target_type === 'friend') {
      const friendObj = friends.find(f => f.id === expenseForm.friend_id) || friends[0]
      if (!friendObj) {
        setError('Please select a valid friend to split with.')
        return
      }
      targetGroup = groups.find(g => g.direct_friend_id === friendObj.id || (g.members?.length === 2 && g.members.some(m => m.id === friendObj.id)))
      if (!targetGroup) {
        targetGroup = {
          id: `grp_direct_${friendObj.id}`,
          direct_friend_id: friendObj.id,
          name: `🤝 ${friendObj.name}`,
          description: `Direct 1-on-1 expenses with ${friendObj.name}`,
          icon: '🤝',
          members: [
            { id: 'm-1', name: 'You (Owner)', isOwner: true },
            { id: friendObj.id, name: friendObj.name, phone: friendObj.phone || '', isOwner: false },
          ],
          expenses: [],
          settlements: [],
        }
        workingGroups = [targetGroup, ...groups]
      }
    } else {
      targetGroup = groups.find(g => g.id === expenseForm.group_id) || activeGroup
      if (!targetGroup) {
        setError('Please select a valid group.')
        return
      }
    }

    const isForeign = expenseForm.currency && expenseForm.currency !== 'INR'
    const finalInrAmt = isForeign ? Math.round(convertToInr(rawAmt, expenseForm.currency)) : rawAmt

    if (expenseForm.payer_mode === 'multiple') {
      const diffPaid = Math.abs(rawAmt - multiPayerAllocatedTotal)
      if (diffPaid > 0.05) {
        setError(`Upfront contributions do not match total bill amount.`)
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

    if (editExpenseTarget) {
      // Editing existing expense
      const updatedExpense = {
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
        exact_shares: expenseForm.exact_shares,
        percent_shares: expenseForm.percent_shares,
        ratio_shares: expenseForm.ratio_shares,
      }

      const updated = workingGroups.map(g => {
        if (g.id === targetGroup.id) {
          const exists = (g.expenses || []).some(e => e.id === editExpenseTarget.id)
          return {
            ...g,
            expenses: exists
              ? g.expenses.map(e => e.id === editExpenseTarget.id ? updatedExpense : e)
              : [updatedExpense, ...(g.expenses || [])],
          }
        }
        return {
          ...g,
          expenses: (g.expenses || []).filter(e => e.id !== editExpenseTarget.id),
        }
      })
      saveGroups(updated)
      lastLocalEditRef.current = Date.now()
      const postGroup = updated.find(g => g.id === targetGroup.id)
      if (postGroup?.share_token) {
        updateSharedTripData(postGroup.share_token, {
          expenses: postGroup.expenses,
          members: postGroup.members,
          budget: postGroup.budget,
        })
      }
      setEditExpenseTarget(null)
      setShowExpenseModal(false)
      flash(`Expense "${updatedExpense.title}" updated!`)
      logActivity(`You edited expense "${updatedExpense.title}" in ${targetGroup.name}`)
      return
    }

    // Adding new expense
    const newExpense = {
      id: `exp_${Date.now()}`,
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
      exact_shares: expenseForm.exact_shares,
      percent_shares: expenseForm.percent_shares,
      ratio_shares: expenseForm.ratio_shares,
    }

    const updated = workingGroups.map(g =>
      g.id === targetGroup.id
        ? { ...g, expenses: [newExpense, ...(g.expenses || [])] }
        : g
    )
    saveGroups(updated)
    lastLocalEditRef.current = Date.now()
    const postGroup = updated.find(g => g.id === targetGroup.id)
    if (postGroup?.share_token) {
      updateSharedTripData(postGroup.share_token, {
        expenses: postGroup.expenses,
        members: postGroup.members,
        budget: postGroup.budget,
      })
    }
    setShowExpenseModal(false)
    flash(`Expense "${newExpense.title}" (${formatCurrency(finalInrAmt)}) added!`)
    logActivity(`You added "${newExpense.title}" in ${targetGroup.name}`)
  }

  // Delete Expense Handler
  const handleDeleteExpense = () => {
    if (!deleteExpenseTarget) return
    const updated = groups.map(g => ({
      ...g,
      expenses: (g.expenses || []).filter(e => e.id !== deleteExpenseTarget.id),
    }))
    saveGroups(updated)
    lastLocalEditRef.current = Date.now()
    if (activeGroup?.share_token) {
      const remainingExpenses = (activeGroup.expenses || []).filter(e => e.id !== deleteExpenseTarget.id)
      updateSharedTripData(activeGroup.share_token, {
        expenses: remainingExpenses,
      })
    }
    setDeleteExpenseTarget(null)
    flash('Expense deleted.')
    logActivity(`You deleted expense "${deleteExpenseTarget.title}"`)
  }

  // --- Settle Up Handler ---
  const handleSettleUp = (e) => {
    e.preventDefault()
    const amt = parseFloat(settleForm.amount)
    if (!settleForm.from_id || !settleForm.to_id || !amt || amt <= 0) return

    const targetGroup = activeGroup || groups[0]
    if (!targetGroup) return

    const newSettlement = {
      id: `set_${Date.now()}`,
      from_id: settleForm.from_id,
      to_id: settleForm.to_id,
      amount: amt,
      date: today(),
      notes: settleForm.notes || '',
    }

    const updated = groups.map(g =>
      g.id === targetGroup.id
        ? { ...g, settlements: [newSettlement, ...(g.settlements || [])] }
        : g
    )
    saveGroups(updated)
    lastLocalEditRef.current = Date.now()
    const postGroup = updated.find(g => g.id === targetGroup.id)
    if (postGroup?.share_token) {
      updateSharedTripData(postGroup.share_token, {
        expenses: postGroup.expenses,
      })
    }
    setShowSettleModal(false)

    const fromPerson = targetGroup.members?.find(m => m.id === settleForm.from_id)?.name || 'Someone'
    const toPerson = targetGroup.members?.find(m => m.id === settleForm.to_id)?.name || 'Someone'

    setSettleForm({ from_id: '', to_id: '', amount: '', notes: '' })
    flash(`Payment of ${formatCurrency(amt)} recorded between ${fromPerson} and ${toPerson}!`)
    logActivity(`${fromPerson} settled up with ${toPerson} for ${formatCurrency(amt)}`)
  }

  const quickSettle = (debt) => {
    setSettleForm({
      from_id: debt.from.id,
      to_id: debt.to.id,
      amount: String(debt.amount),
      notes: 'Recorded via Splitwise Quick Settle',
    })
    setShowSettleModal(true)
  }

  // All Expenses unified collection
  const allExpensesList = useMemo(() => {
    const list = []
    groups.forEach(g => {
      (g.expenses || []).forEach(e => {
        list.push({ ...e, groupName: g.name, groupIcon: g.icon, groupId: g.id })
      })
    })
    list.sort((a, b) => new Date(b.date) - new Date(a.date))
    return list
  }, [groups])

  // Filtered expenses based on search
  const filteredAllExpenses = useMemo(() => {
    if (!searchQuery.trim()) return allExpensesList
    const q = searchQuery.toLowerCase()
    return allExpensesList.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.groupName.toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q)
    )
  }, [allExpensesList, searchQuery])

  // Expenses for the active friend view
  const activeFriendExpenses = useMemo(() => {
    if (!activeFriend) return []
    return allExpensesList.filter(e =>
      (e.shares && e.shares[activeFriend.id] !== undefined) ||
      e.paid_by_id === activeFriend.id ||
      (e.paid_by && e.paid_by[activeFriend.id] !== undefined)
    )
  }, [allExpensesList, activeFriend])

  return (
    <Layout title="Splitwise & Group Expenses">
      {/* Notifications / Alerts */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-center justify-between">
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

      {/* ============================================================ */}
      {/* SPLITWISE CLASSIC THREE-COLUMN LAYOUT CONTAINER */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* ========================================================== */}
        {/* LEFT COLUMN: Splitwise Navigation Sidebar (3.5 cols on desktop) */}
        {/* ========================================================== */}
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          {/* Main Views Navigation */}
          <div className="card p-2 space-y-1 shadow-sm">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <PieChart className="h-4 w-4" />
              <span>Dashboard</span>
              {globalBalances.totalBalance !== 0 && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  currentView === 'dashboard' ? 'bg-white/20 text-white' : globalBalances.totalBalance > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {globalBalances.totalBalance > 0 ? `+₹${Math.round(globalBalances.totalBalance)}` : `-₹${Math.round(Math.abs(globalBalances.totalBalance))}`}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('recent_activity')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView === 'recent_activity'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Recent Activity</span>
              <span className="ml-auto text-[10px] text-gray-400 font-mono">{activities.length}</span>
            </button>

            <button
              onClick={() => setCurrentView('all_expenses')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView === 'all_expenses'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <List className="h-4 w-4" />
              <span>All Expenses</span>
              <span className="ml-auto text-[10px] text-gray-400 font-mono">{allExpensesList.length}</span>
            </button>
          </div>

          {/* GROUPS Section */}
          <div className="card p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Groups</span>
              <button
                onClick={() => {
                  setEditGroupTarget(null)
                  setGroupForm({ name: '', description: '', icon: '🏖️' })
                  setShowGroupModal(true)
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                <Plus className="h-3.5 w-3.5" /> add
              </button>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {groups.map(grp => {
                const isActive = currentView === 'group' && activeGroupId === grp.id
                return (
                  <button
                    key={grp.id}
                    onClick={() => {
                      setActiveGroupId(grp.id)
                      setCurrentView('group')
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 font-bold'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base">{grp.icon || '👥'}</span>
                    <span className="truncate flex-1">{grp.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {grp.members?.length || 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* FRIENDS Section */}
          <div className="card p-3 space-y-2 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Friends</span>
              <button
                onClick={() => {
                  setFriendForm({ name: '', phone: '', email: '' })
                  setShowFriendModal(true)
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                <Plus className="h-3.5 w-3.5" /> add
              </button>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {friends.map(f => {
                const bal = globalBalances.friendNetBalances[f.id] || 0
                const isPositive = bal > 0.5
                const isNegative = bal < -0.5
                const isActive = currentView === 'friend' && activeFriendId === f.id

                return (
                  <div
                    key={f.id}
                    className={`group/friend w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 font-bold'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveFriendId(f.id)
                        setCurrentView('friend')
                      }}
                      className="flex items-center gap-2 truncate flex-1 min-w-0 text-left"
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${f.avatarBg || 'bg-emerald-600'}`}>
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate flex-1 min-w-0">
                        <span className="truncate block font-semibold">{f.name}</span>
                        <span className={`text-[10px] block ${
                          isPositive ? 'text-emerald-600 font-bold' : isNegative ? 'text-amber-600 font-bold' : 'text-gray-400'
                        }`}>
                          {isPositive ? `owes you ₹${Math.round(bal)}` : isNegative ? `you owe ₹${Math.round(Math.abs(bal))}` : 'settled up'}
                        </span>
                      </div>
                    </button>

                    <div className="hidden group-hover/friend:flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditFriendTarget(f)
                          setFriendForm({ name: f.name || '', phone: f.phone || '', email: f.email || '' })
                          setShowFriendModal(true)
                        }}
                        className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        title="Edit Friend"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteFriendTarget(f)
                        }}
                        className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        title="Delete Friend"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* CENTER / RIGHT COLUMN: Main Splitwise Panel (8.5 cols)     */}
        {/* ========================================================== */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          {/* Top Splitwise Header Bar with Action Buttons */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                {currentView === 'dashboard' && 'Dashboard'}
                {currentView === 'recent_activity' && 'Recent Activity'}
                {currentView === 'all_expenses' && 'All Expenses'}
                {currentView === 'group' && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e53935] text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0">
                      {activeGroup?.icon || '✈️'}
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                        {activeGroup?.name || 'Group'}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        {activeGroup?.members?.length || 0} people
                      </p>
                    </div>
                  </div>
                )}
                {currentView === 'friend' && (
                  <>
                    <User className="h-6 w-6 text-emerald-600" />
                    <span>{activeFriend?.name || 'Friend'}</span>
                  </>
                )}
              </h2>
              {currentView === 'group' && activeGroup?.description && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{activeGroup.description}</p>
              )}
            </div>

            {/* Splitwise Signature Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (currentView === 'friend' && activeFriendId) {
                    openNewExpenseModal(null, activeFriendId)
                  } else if (currentView === 'group' && activeGroup) {
                    openNewExpenseModal(activeGroup.id)
                  } else {
                    openNewExpenseModal()
                  }
                }}
                className="bg-[#ff652f] hover:bg-[#e8531f] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add an expense</span>
              </button>

              <button
                onClick={() => {
                  setSettleForm({
                    from_id: activeGroup?.members?.[1]?.id || friends[0]?.id || '',
                    to_id: 'm-1',
                    amount: '',
                    notes: '',
                  })
                  setShowSettleModal(true)
                }}
                className="bg-[#5bc5a7] hover:bg-[#48b294] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <HandCoins className="h-4 w-4" />
                <span>Settle up</span>
              </button>

              {currentView === 'group' && (
                <>
                  <button
                    onClick={() => handleOpenShareTrip(activeGroup)}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
                    title="Share this specific group / trip with friends"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share Trip</span>
                  </button>

                  <button
                    onClick={() => setShowStatementModal(true)}
                    className="btn-secondary text-xs py-2.5 px-3 flex items-center gap-1.5"
                    title="Export Group Statement & CSV"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span className="hidden sm:inline">Statement</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SPLITWISE SIGNATURE 3-BOX BALANCE BAR                     */}
          {/* ======================================================== */}
          <div className="grid grid-cols-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-x divide-gray-100 dark:divide-slate-800 text-center">
            {/* Box 1: Total Balance */}
            <div className="p-3 sm:p-4">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">total balance</span>
              <p className={`text-base sm:text-xl font-extrabold mt-0.5 ${
                globalBalances.totalBalance > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : globalBalances.totalBalance < 0
                  ? 'text-[#ff652f]'
                  : 'text-gray-500'
              }`}>
                {globalBalances.totalBalance > 0 ? `+${formatCurrency(globalBalances.totalBalance)}` : globalBalances.totalBalance < 0 ? `-${formatCurrency(Math.abs(globalBalances.totalBalance))}` : '₹0.00'}
              </p>
            </div>

            {/* Box 2: You Owe */}
            <div className="p-3 sm:p-4">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">you owe</span>
              <p className="text-base sm:text-xl font-extrabold text-[#ff652f] mt-0.5">
                {formatCurrency(globalBalances.youOweTotal)}
              </p>
            </div>

            {/* Box 3: You Are Owed */}
            <div className="p-3 sm:p-4">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">you are owed</span>
              <p className="text-base sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(globalBalances.youAreOwedTotal)}
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* VIEW 1: DASHBOARD VIEW (Splitwise 2-Column: You Owe vs You Are Owed) */}
          {/* ======================================================== */}
          {currentView === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: YOU OWE */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                    You Owe ({globalBalances.youOweList.length})
                  </h3>
                  <span className="text-xs font-bold text-[#ff652f]">
                    {formatCurrency(globalBalances.youOweTotal)}
                  </span>
                </div>

                {globalBalances.youOweList.length === 0 ? (
                  <div className="py-10 text-center space-y-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-gray-600 dark:text-slate-300">You do not owe anything!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-slate-800">
                    {globalBalances.youOweList.map(({ friend, amount }) => (
                      <div key={friend.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${friend.avatarBg || 'bg-amber-600'}`}>
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-gray-900 dark:text-white block">{friend.name}</strong>
                            <span className="text-[11px] text-[#ff652f] font-semibold">
                              you owe {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSettleForm({
                              from_id: 'm-1',
                              to_id: friend.id,
                              amount: String(amount),
                              notes: 'Settled via Dashboard',
                            })
                            setShowSettleModal(true)
                          }}
                          className="btn-secondary text-[11px] py-1 px-3 font-bold text-[#ff652f] border-[#ff652f]/30 hover:bg-[#ff652f]/10"
                        >
                          Settle
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: YOU ARE OWED */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                  <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                    You Are Owed ({globalBalances.youAreOwedList.length})
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(globalBalances.youAreOwedTotal)}
                  </span>
                </div>

                {globalBalances.youAreOwedList.length === 0 ? (
                  <div className="py-10 text-center space-y-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-gray-600 dark:text-slate-300">You are not owed anything!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-slate-800">
                    {globalBalances.youAreOwedList.map(({ friend, amount }) => {
                      const debtObj = globalBalances.allDebts.find(d => d.from.id === friend.id) || { from: friend, amount }
                      return (
                        <div key={friend.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${friend.avatarBg || 'bg-emerald-600'}`}>
                              {friend.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong className="text-gray-900 dark:text-white block">{friend.name}</strong>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                owes you {formatCurrency(amount)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={getWhatsAppLink(debtObj)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                              title="Send WhatsApp reminder"
                            >
                              <Send className="h-3 w-3" />
                              <span className="hidden sm:inline">Remind</span>
                            </a>

                            <button
                              onClick={() => {
                                setSettleForm({
                                  from_id: friend.id,
                                  to_id: 'm-1',
                                  amount: String(amount),
                                  notes: 'Settled via Dashboard',
                                })
                                setShowSettleModal(true)
                              }}
                              className="btn-secondary text-[11px] py-1 px-2.5 font-bold"
                            >
                              Settle
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: GROUP EXPENSES & BALANCES VIEW                    */}
          {/* ======================================================== */}
          {currentView === 'group' && activeGroup && (
            <div className="space-y-6">
              {/* Group Overview Banner */}
              <div className="card p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-none shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Group Overview
                    </span>
                    <h3 className="text-2xl font-black">{activeGroup.name}</h3>
                    <p className="text-xs text-blue-200/80">
                      Total spent: <strong>{formatCurrency(activeGroupBalanceDetails.totalSpend)}</strong> across {activeGroup.expenses?.length || 0} expenses
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenShareTrip(activeGroup)}
                      className="px-3 py-2 bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 border border-purple-400/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      title="Share trip with friends"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditGroupTarget(activeGroup)
                        setGroupForm({ name: activeGroup.name, description: activeGroup.description || '', icon: activeGroup.icon || '👥' })
                        setShowGroupModal(true)
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                      title="Edit group"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteGroupTarget(activeGroup)}
                      className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold"
                      title="Delete group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {activeGroup.budget > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-blue-200">
                      <span>Trip Budget: {formatCurrency(activeGroup.budget)}</span>
                      <span className="font-bold">
                        {formatCurrency(activeGroupBalanceDetails.totalSpend)} ({Math.min(100, Math.round((activeGroupBalanceDetails.totalSpend / activeGroup.budget) * 100))}% spent)
                      </span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (activeGroupBalanceDetails.totalSpend / activeGroup.budget) >= 1
                            ? 'bg-rose-400'
                            : (activeGroupBalanceDetails.totalSpend / activeGroup.budget) >= 0.8
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, (activeGroupBalanceDetails.totalSpend / activeGroup.budget) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Group Balances & Simplified Debts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Net positions per member in this group */}
                <div className="card space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Group Member Balances
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(true)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Add Member</span>
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-slate-800">
                    {activeGroup.members?.map(m => {
                      const bal = activeGroupBalanceDetails.netBalances[m.id] || 0
                      const isPositive = bal > 0.5
                      const isNegative = bal < -0.5
                      return (
                        <div key={m.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-white truncate">{m.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGroupMember({ id: m.id, name: m.name, phone: m.phone || '' })
                                setShowEditGroupMemberModal(true)
                              }}
                              className="text-gray-400 hover:text-emerald-600 p-0.5 rounded transition-colors"
                              title="Edit member name"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                          <span className={`font-bold px-2 py-0.5 rounded-lg text-xs shrink-0 ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : isNegative
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {isPositive ? `+${formatCurrency(bal)}` : isNegative ? `-${formatCurrency(Math.abs(bal))}` : 'settled'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Who Owes Whom (Simplified Debts) */}
                <div className="card lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Settlement Summary (Who Owes Whom)
                    </h4>
                    <span className="text-[10px] text-gray-400">Simplified Route</span>
                  </div>

                  {activeGroupBalanceDetails.debts.length === 0 ? (
                    <div className="py-8 text-center space-y-1">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                      <p className="text-xs text-gray-500">All dues in this group are settled up!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {activeGroupBalanceDetails.debts.map((debt, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-[#ff652f]">{debt.from.name}</strong>
                            <span className="text-gray-400">owes</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">{debt.to.name}</strong>
                            <span className="font-extrabold text-gray-900 dark:text-white ml-1">
                              {formatCurrency(debt.amount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={getWhatsAppLink(debt)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                              title="Send WhatsApp payment reminder"
                            >
                              <Send className="h-3 w-3" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                            <button
                              onClick={() => quickSettle(debt)}
                              className="btn-secondary text-[10px] py-1 px-2.5 font-bold"
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

              {/* Group Expenses Feed (Splitwise Signature Monthly Format) */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    Expenses ({activeGroup.expenses?.length || 0})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPrintableSummaryModal(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 mr-2"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Printable Summary</span>
                    </button>
                    <button
                      onClick={() => openNewExpenseModal(activeGroup.id)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add an expense
                    </button>
                  </div>
                </div>

                {(!activeGroup.expenses || activeGroup.expenses.length === 0) ? (
                  <div className="py-12 text-center space-y-2">
                    <Receipt className="h-8 w-8 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-400">No expenses recorded for this group yet.</p>
                    <button
                      onClick={() => openNewExpenseModal(activeGroup.id)}
                      className="btn-primary text-xs py-2 px-4"
                    >
                      Add First Expense
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupExpensesByMonth(activeGroup.expenses || [])).map(([monthYear, monthExps]) => (
                      <div key={monthYear} className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
                        {/* Month Header Row (Matches Splitwise Screenshot 2026-10-22 200231.png) */}
                        <div className="bg-gray-50 dark:bg-slate-800/80 px-4 py-2 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
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

                        <div className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {monthExps.map(exp => {
                            const isExpanded = expandedExpenseId === exp.id
                            const yourShare = exp.shares?.['m-1'] || 0
                            const payerName = exp.payer_mode === 'single'
                              ? (activeGroup.members?.find(m => m.id === exp.paid_by_id)?.name || 'Someone')
                              : 'Multiple people'

                            const isYouPayer = exp.payer_mode === 'single' && exp.paid_by_id === 'm-1'
                            const youLent = isYouPayer ? (exp.amount - yourShare) : 0
                            const youBorrowed = !isYouPayer && yourShare > 0 ? yourShare : 0

                            const expDate = new Date(exp.date || today())
                            const monthStr = expDate.toLocaleString('default', { month: 'short' }).toUpperCase()
                            const dayStr = String(expDate.getDate()).padStart(2, '0')

                            // Category pastel square icon
                            const catVisuals = getExpenseCategoryVisuals(exp.title, exp.notes)
                            const CatIcon = catVisuals.icon

                            return (
                              <div key={exp.id} className="group">
                                <div
                                  onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                                  className="flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-800/40 p-3 transition-all"
                                >
                                  {/* Left: Date Badge + Category Pastel Icon + Title */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Date Block */}
                                    <div className="flex flex-col items-center justify-center w-8 text-center shrink-0 leading-tight">
                                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                        {monthStr}
                                      </span>
                                      <span className="text-base font-bold text-gray-600 dark:text-slate-300">
                                        {dayStr}
                                      </span>
                                    </div>

                                    {/* Category Pastel Square Icon */}
                                    <div className={`w-9 h-9 rounded-lg ${catVisuals.bgClass} ${catVisuals.textClass} flex items-center justify-center shrink-0 border ${catVisuals.borderClass}`}>
                                      <CatIcon className="h-4 w-4" />
                                    </div>

                                    {/* Title & Notes */}
                                    <div className="min-w-0">
                                      <div className="font-extrabold text-gray-900 dark:text-white text-sm truncate flex items-center gap-1.5">
                                        <span>{exp.title}</span>
                                        {exp.notes && (
                                          <MessageSquare className="h-3 w-3 text-gray-400 shrink-0" title="Notes attached" />
                                        )}
                                        {exp.receipt_url && (
                                          <Paperclip className="h-3 w-3 text-blue-500 shrink-0" title="Bill attached" />
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Columns: Payer & Net Impact */}
                                  <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0">
                                    {/* Column 1: Payer */}
                                    <div className="w-24 sm:w-28">
                                      <span className="text-[10px] text-gray-400 block truncate">
                                        {payerName} paid
                                      </span>
                                      <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-mono block">
                                        INR{Number(exp.amount).toFixed(2)}
                                      </span>
                                    </div>

                                    {/* Column 2: Net Impact */}
                                    <div className="w-24 sm:w-28">
                                      {youLent > 0 ? (
                                        <div>
                                          <span className="text-[10px] text-gray-400 block truncate">you lent</span>
                                          <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                                            INR{youLent.toFixed(2)}
                                          </span>
                                        </div>
                                      ) : youBorrowed > 0 ? (
                                        <div>
                                          <span className="text-[10px] text-gray-400 block truncate">{payerName} lent you</span>
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

                                    {/* Delete Trash Icon */}
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

                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </div>

                                {/* Expanded Detailed Breakdown */}
                                {isExpanded && (
                                  <div className="p-3.5 bg-gray-50 dark:bg-slate-800/80 rounded-b-xl space-y-3 text-xs border-t border-gray-100 dark:border-slate-800">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Split Breakdown</span>
                                        <div className="space-y-1">
                                          {Object.entries(exp.shares || {}).map(([mId, share]) => {
                                            const mName = activeGroup.members?.find(m => m.id === mId)?.name || mId
                                            return (
                                              <div key={mId} className="flex items-center justify-between text-gray-700 dark:text-slate-300">
                                                <span>{mName}</span>
                                                <span className="font-mono font-bold">{formatCurrency(share)}</span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>

                                      {/* Attached Bill Receipt Section */}
                                      <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Attached Bill / Invoice</span>
                                        {exp.receipt_url ? (
                                          <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                                            <Paperclip className="h-4 w-4 text-blue-600" />
                                            <span className="truncate flex-1 font-semibold">{exp.receipt_name || 'Bill Receipt'}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setPreviewReceiptUrl(exp.receipt_url)
                                              }}
                                              className="btn-secondary text-[11px] py-1 px-2.5"
                                            >
                                              View Bill
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-gray-400 italic">No bill receipt attached to this expense.</p>
                                        )}

                                        {exp.notes && (
                                          <div className="mt-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Notes</span>
                                            <p className="text-gray-600 dark:text-slate-300 italic">{exp.notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openEditExpenseModal(exp, activeGroup)
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
                                        <Trash2 className="h-3.5 w-3.5" /> Delete Expense
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: INDIVIDUAL FRIEND 1-ON-1 VIEW                     */}
          {/* ======================================================== */}
          {currentView === 'friend' && activeFriend && (
            <div className="space-y-6">
              {/* Friend Balance Hero */}
              <div className="card p-5 bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-lg ${activeFriend.avatarBg || 'bg-emerald-600'}`}>
                    {activeFriend.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">{activeFriend.name}</h3>
                    {activeFriend.phone && <p className="text-xs text-gray-400">{activeFriend.phone}</p>}
                    <p className="text-xs font-bold mt-1">
                      {globalBalances.friendNetBalances[activeFriend.id] > 0.5 ? (
                        <span className="text-emerald-600">{activeFriend.name} owes you {formatCurrency(globalBalances.friendNetBalances[activeFriend.id])}</span>
                      ) : globalBalances.friendNetBalances[activeFriend.id] < -0.5 ? (
                        <span className="text-[#ff652f]">You owe {activeFriend.name} {formatCurrency(Math.abs(globalBalances.friendNetBalances[activeFriend.id]))}</span>
                      ) : (
                        <span className="text-gray-500">You and {activeFriend.name} are all settled up!</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setSettleForm({
                        from_id: globalBalances.friendNetBalances[activeFriend.id] > 0 ? activeFriend.id : 'm-1',
                        to_id: globalBalances.friendNetBalances[activeFriend.id] > 0 ? 'm-1' : activeFriend.id,
                        amount: String(Math.abs(Math.round(globalBalances.friendNetBalances[activeFriend.id] || 0))),
                        notes: `Settlement with ${activeFriend.name}`,
                      })
                      setShowSettleModal(true)
                    }}
                    className="btn-primary text-xs py-2 px-3"
                  >
                    Settle up
                  </button>

                  <a
                    href={getWhatsAppLink({ from: activeFriend, amount: Math.abs(globalBalances.friendNetBalances[activeFriend.id] || 0) })}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={() => {
                      setEditFriendTarget(activeFriend)
                      setFriendForm({
                        name: activeFriend.name || '',
                        phone: activeFriend.phone || '',
                        email: activeFriend.email || '',
                      })
                      setShowFriendModal(true)
                    }}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                    title="Edit friend details"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setDeleteFriendTarget(activeFriend)}
                    className="btn-secondary text-xs py-2 px-3 text-rose-600 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center gap-1.5 font-bold"
                    title="Delete friend"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Shared Expenses with this friend */}
              <div className="card space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
                  Shared Expenses with {activeFriend.name} ({activeFriendExpenses.length})
                </h4>

                {activeFriendExpenses.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No shared expenses with {activeFriend.name} yet.</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {activeFriendExpenses.map(exp => (
                      <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-gray-900 dark:text-white block">{exp.title}</strong>
                          <span className="text-[11px] text-gray-400">{exp.groupName} • {formatDate(exp.date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-gray-900 dark:text-white">
                            {formatCurrency(exp.amount)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditExpenseModal(exp)}
                              className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Expense"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteExpenseTarget(exp)}
                              className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 4: RECENT ACTIVITY VIEW                             */}
          {/* ======================================================== */}
          {currentView === 'recent_activity' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Recent Activity Log</h3>
                <span className="text-xs text-gray-400">Chronological feed</span>
              </div>

              {activities.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">No activity recorded yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {activities.map(act => (
                    <div key={act.id} className="py-3 flex items-start gap-3 text-xs">
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0 mt-0.5">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-800 dark:text-slate-200 font-semibold">{act.text}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(act.date)} at {act.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 5: ALL EXPENSES VIEW                                */}
          {/* ======================================================== */}
          {currentView === 'all_expenses' && (
            <div className="card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  All Expenses Ledger ({filteredAllExpenses.length})
                </h3>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field text-xs pl-8 py-1.5 w-full"
                  />
                </div>
              </div>

              {filteredAllExpenses.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">No matching expenses found.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredAllExpenses.map(exp => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-gray-900 dark:text-white block">{exp.title}</strong>
                        <span className="text-[11px] text-gray-400">{exp.groupIcon} {exp.groupName} • {formatDate(exp.date)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <strong className="text-gray-900 dark:text-white font-extrabold block">{formatCurrency(exp.amount)}</strong>
                          {exp.receipt_url && (
                            <button
                              onClick={() => setPreviewReceiptUrl(exp.receipt_url)}
                              className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                              View Bill
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditExpenseModal(exp)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Expense"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteExpenseTarget(exp)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODALS                                                       */}
      {/* ============================================================ */}

      {/* --- ADD / EDIT EXPENSE MODAL WITH BILL ATTACHMENT & AI BILL SCAN --- */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false)
          setEditExpenseTarget(null)
        }}
        title={editExpenseTarget ? `Edit Expense: ${editExpenseTarget.title}` : "Add an Expense"}
        size="lg"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4 text-xs max-h-[82vh] overflow-y-auto pr-1">
          {/* Target Split Mode Switcher: Group vs 1-on-1 Friend */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                const targetGrp = groups.find(g => g.id === expenseForm.group_id) || activeGroup || groups[0]
                const mList = targetGrp?.members || []
                setExpenseForm(prev => ({
                  ...prev,
                  split_target_type: 'group',
                  group_id: targetGrp?.id || '',
                  paid_by_id: mList[0]?.id || 'm-1',
                  selected_members: mList.map(m => m.id),
                }))
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                expenseForm.split_target_type === 'group'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>With a Group</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const fId = expenseForm.friend_id || friends[0]?.id || ''
                setExpenseForm(prev => ({
                  ...prev,
                  split_target_type: 'friend',
                  friend_id: fId,
                  selected_members: ['m-1', fId].filter(Boolean),
                }))
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                expenseForm.split_target_type === 'friend'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>1-on-1 with a Friend</span>
            </button>
          </div>

          {/* Group or Friend Selector */}
          {expenseForm.split_target_type === 'group' ? (
            <div>
              <label className="label">Group *</label>
              <select
                value={expenseForm.group_id}
                onChange={(e) => {
                  const newGid = e.target.value
                  const targetGrp = groups.find(g => g.id === newGid)
                  const newMembers = targetGrp?.members || []
                  setExpenseForm(prev => ({
                    ...prev,
                    group_id: newGid,
                    paid_by_id: newMembers[0]?.id || 'm-1',
                    selected_members: newMembers.map(m => m.id),
                  }))
                }}
                className="input-field text-xs font-bold"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.icon} {g.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="label">Friend to Split With *</label>
              <select
                value={expenseForm.friend_id || friends[0]?.id}
                onChange={(e) => {
                  const fId = e.target.value
                  setExpenseForm(prev => ({
                    ...prev,
                    friend_id: fId,
                    selected_members: ['m-1', fId],
                  }))
                }}
                className="input-field text-xs font-bold text-emerald-600 dark:text-emerald-400"
              >
                {friends.map(f => (
                  <option key={f.id} value={f.id}>👤 {f.name} {f.phone ? `(${f.phone})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* AI Bill Scanner One-Click Trigger Button */}
          <div className="p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:to-indigo-950/60 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">AI Bill & Receipt Vision Scanner</h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-300">
                  Snap or upload an invoice. Gemini AI vision will extract amount, title, date & attach the bill!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAiScannerModal(true)}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-xs text-xs flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Scan Bill</span>
            </button>
          </div>

          {/* Description & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Description / Title *</label>
              <input
                type="text"
                placeholder="e.g. Seafood Dinner, Uber Ride, Villa Rent"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                className="input-field text-xs font-semibold"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Total Amount *</label>
                {expenseForm.currency !== 'INR' && expenseForm.amount && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    ≈ ₹{Math.round(convertToInr(expenseForm.amount, expenseForm.currency)).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={expenseForm.currency}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="input-field text-xs font-bold w-24 flex-shrink-0 bg-gray-50 dark:bg-slate-800"
                >
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="input-field text-xs font-bold text-emerald-600 flex-1"
                  required
                  step="any"
                />
              </div>
            </div>
          </div>

          {/* Date & Bill Attachment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Expense Date</label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                className="input-field text-xs"
              />
            </div>

            {/* Bill / Receipt Attachment Upload */}
            <div>
              <label className="label">Attach Bill / Receipt Photo</label>
              <input
                type="file"
                ref={billFileInputRef}
                accept="image/*,.pdf"
                onChange={handleBillFileUpload}
                className="hidden"
              />
              {expenseForm.receipt_url ? (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <Paperclip className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate flex-1 font-semibold text-emerald-800 dark:text-emerald-300">
                    {expenseForm.receipt_name || 'Bill Attached'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpenseForm(prev => ({ ...prev, receipt_url: '', receipt_name: '' }))}
                    className="p-1 hover:bg-emerald-100 rounded text-rose-500"
                    title="Remove bill"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => billFileInputRef.current?.click()}
                  className="w-full border border-dashed border-gray-300 dark:border-slate-700 hover:border-emerald-500 p-2 rounded-xl text-center flex items-center justify-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Attach Bill Receipt (JPG/PNG/PDF)</span>
                </button>
              )}
            </div>
          </div>

          {/* 1. Who Paid Upfront? */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 dark:text-white uppercase tracking-wider text-[11px]">
                1. Paid By
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-0.5 rounded-lg border border-gray-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setExpenseForm(prev => ({ ...prev, payer_mode: 'single' }))}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                    expenseForm.payer_mode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-500'
                  }`}
                >
                  Single Payer
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseForm(prev => ({ ...prev, payer_mode: 'multiple' }))}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                    expenseForm.payer_mode === 'multiple' ? 'bg-blue-600 text-white' : 'text-gray-500'
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
                {activeExpenseParticipants.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {activeExpenseParticipants.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                    <span className="font-semibold truncate">{m.name}</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={expenseForm.paid_by?.[m.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setExpenseForm(prev => ({
                          ...prev,
                          paid_by: { ...prev.paid_by, [m.id]: val },
                        }))
                      }}
                      className="input-field text-xs py-1 px-2 text-right font-bold w-24"
                      step="any"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Split Strategy */}
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
                    className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                      expenseForm.split_type === id ? 'bg-blue-600 text-white' : 'text-gray-500'
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
              {activeExpenseParticipants.map(m => {
                const isSelected = expenseForm.selected_members.includes(m.id)
                return (
                  <div
                    key={m.id}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 shadow-2xs'
                        : 'bg-gray-100/60 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setExpenseForm(prev => ({
                            ...prev,
                            selected_members: checked
                              ? [...prev.selected_members, m.id]
                              : prev.selected_members.filter(id => id !== m.id),
                          }))
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="font-semibold text-xs text-gray-900 dark:text-white">{m.name}</span>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-1.5">
                        {expenseForm.split_type === 'exact' && (
                          <input
                            type="number"
                            placeholder="0"
                            value={expenseForm.exact_shares?.[m.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setExpenseForm(prev => ({
                                ...prev,
                                exact_shares: { ...prev.exact_shares, [m.id]: val },
                              }))
                            }}
                            className="input-field text-xs py-1 px-2 text-right font-bold w-24 text-emerald-600"
                            step="any"
                          />
                        )}

                        {expenseForm.split_type === 'percent' && (
                          <div className="flex items-center gap-1 w-20">
                            <input
                              type="number"
                              placeholder="0"
                              value={expenseForm.percent_shares?.[m.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setExpenseForm(prev => ({
                                  ...prev,
                                  percent_shares: { ...prev.percent_shares, [m.id]: val },
                                }))
                              }}
                              className="input-field text-xs py-1 px-2 text-right font-bold"
                              step="any"
                            />
                            <span className="text-gray-400 font-bold">%</span>
                          </div>
                        )}

                        {expenseForm.split_type === 'shares' && (
                          <input
                            type="number"
                            placeholder="1"
                            value={expenseForm.ratio_shares?.[m.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setExpenseForm(prev => ({
                                ...prev,
                                ratio_shares: { ...prev.ratio_shares, [m.id]: val },
                              }))
                            }}
                            className="input-field text-xs py-1 px-2 text-right font-bold w-16"
                            step="any"
                          />
                        )}

                        <span className="text-[11px] font-bold min-w-16 text-right">
                          {formatCurrency(calculatedSplitShares.shares?.[m.id] || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Quick Add Other Friends to Group Split */}
              {expenseForm.split_target_type === 'group' && friends.filter(f => !activeExpenseParticipants.some(m => m.id === f.id)).length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 block mb-1.5">
                    + Include other friends from your account into this split:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {friends.filter(f => !activeExpenseParticipants.some(m => m.id === f.id)).map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          const newMember = { id: f.id, name: f.name, phone: f.phone || '', isOwner: false }
                          const currentGid = expenseForm.group_id || activeGroup?.id
                          const updated = groups.map(g => g.id === currentGid ? { ...g, members: [...(g.members || []), newMember] } : g)
                          saveGroups(updated)
                          lastLocalEditRef.current = Date.now()
                          setExpenseForm(prev => ({
                            ...prev,
                            selected_members: [...prev.selected_members, f.id],
                          }))
                        }}
                        className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-2.5 py-1 flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
              calculatedSplitShares.isValid
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
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
              className="btn-primary text-xs bg-[#ff652f] hover:bg-[#e8531f] border-none font-bold"
            >
              {editExpenseTarget ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- AI RECEIPT SCANNER MODAL --- */}
      <AiReceiptScannerModal
        isOpen={showAiScannerModal}
        onClose={() => setShowAiScannerModal(false)}
        onApplyExtracted={handleApplyAiScan}
      />

      {/* --- BILL RECEIPT FULL HIGH-RES PREVIEW MODAL --- */}
      <ReceiptPreviewModal
        isOpen={Boolean(previewReceiptUrl)}
        onClose={() => setPreviewReceiptUrl('')}
        receiptUrl={previewReceiptUrl}
        title="Attached Bill / Invoice"
      />

      {/* --- SETTLE UP MODAL --- */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        title="Settle Up Debt"
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
                {Array.from(new Map([
                  ['m-1', { id: 'm-1', name: 'You (Owner)' }],
                  ...((activeGroup?.members || []).map(m => [m.id, m])),
                  ...friends.map(f => [f.id, f]),
                ]).values()).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Receiver (Paid to?)</label>
              <select
                value={settleForm.to_id}
                onChange={(e) => setSettleForm(prev => ({ ...prev, to_id: e.target.value }))}
                className="input-field text-xs font-semibold"
                required
              >
                <option value="">Select Receiver</option>
                {Array.from(new Map([
                  ['m-1', { id: 'm-1', name: 'You (Owner)' }],
                  ...((activeGroup?.members || []).map(m => [m.id, m])),
                  ...friends.map(f => [f.id, f]),
                ]).values()).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Amount (₹) *</label>
            <input
              type="number"
              placeholder="0.00"
              value={settleForm.amount}
              onChange={(e) => setSettleForm(prev => ({ ...prev, amount: e.target.value }))}
              className="input-field text-xs font-bold text-emerald-600"
              required
              step="any"
            />
          </div>

          <div>
            <label className="label">Payment Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via Google Pay / PhonePe UPI"
              value={settleForm.notes}
              onChange={(e) => setSettleForm(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowSettleModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs bg-[#5bc5a7] hover:bg-[#48b294] border-none font-bold">
              Record Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* --- CREATE / EDIT GROUP MODAL --- */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title={editGroupTarget ? 'Edit Group' : 'Create New Group'}
      >
        <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <label className="label">Icon</label>
              <input
                type="text"
                value={groupForm.icon}
                onChange={(e) => setGroupForm(prev => ({ ...prev, icon: e.target.value }))}
                className="input-field text-center text-lg"
              />
            </div>
            <div className="col-span-3">
              <label className="label">Group Name *</label>
              <input
                type="text"
                placeholder="e.g. 🏖️ Manali Trip, 🏠 Flat 301"
                value={groupForm.name}
                onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                className="input-field text-xs font-semibold"
                required
              />
            </div>
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

          <div>
            <label className="label">Group Members ({friends.length + 1})</label>
            <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5 p-1">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>You (Owner)</span>
              </div>
              {friends.map(f => (
                <div key={f.id} className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5 p-1">
                  <Check className="h-3.5 w-3.5 text-blue-600" />
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              All friends in your account are automatically available to split expenses in this group.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowGroupModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs">{editGroupTarget ? 'Save Changes' : 'Create Group'}</button>
          </div>
        </form>
      </Modal>

      {/* --- ADD / EDIT FRIEND MODAL --- */}
      <Modal
        isOpen={showFriendModal}
        onClose={() => {
          setShowFriendModal(false)
          setEditFriendTarget(null)
          setFriendForm({ name: '', phone: '', email: '' })
        }}
        title={editFriendTarget ? `Edit Friend: ${editFriendTarget.name}` : "Add a Friend to Splitwise"}
      >
        <form onSubmit={handleSaveFriend} className="space-y-4 text-xs">
          <div>
            <label className="label">Friend's Name *</label>
            <input
              type="text"
              placeholder="e.g. Priya Sharma"
              value={friendForm.name}
              onChange={(e) => setFriendForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Phone Number (Optional for WhatsApp)</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={friendForm.phone}
              onChange={(e) => setFriendForm(prev => ({ ...prev, phone: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="label">Email Address (Optional)</label>
            <input
              type="email"
              placeholder="e.g. priya@example.com"
              value={friendForm.email}
              onChange={(e) => setFriendForm(prev => ({ ...prev, email: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setShowFriendModal(false)
                setEditFriendTarget(null)
                setFriendForm({ name: '', phone: '', email: '' })
              }}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs font-bold">
              {editFriendTarget ? 'Save Changes' : 'Add Friend'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- ADD MEMBER TO ACTIVE GROUP MODAL --- */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title={`Add Member to ${activeGroup?.name || 'Group'}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-500 dark:text-slate-400">
            Select a friend from your list to add into <strong>{activeGroup?.name}</strong>:
          </p>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {friends.filter(f => !(activeGroup?.members || []).some(m => m.id === f.id)).length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-gray-400">All your friends are already in this group!</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setFriendForm({ name: '', phone: '', email: '' })
                    setShowFriendModal(true)
                  }}
                  className="btn-primary text-xs mx-auto flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add New Friend to Splitwise</span>
                </button>
              </div>
            ) : (
              friends.filter(f => !(activeGroup?.members || []).some(m => m.id === f.id)).map(f => (
                <div key={f.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${f.avatarBg || 'bg-emerald-600'}`}>
                      {f.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block">{f.name}</span>
                      {f.phone && <span className="text-[10px] text-gray-400">{f.phone}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newMember = { id: f.id, name: f.name, phone: f.phone || '', isOwner: false }
                      const updated = groups.map(g => g.id === activeGroup.id ? { ...g, members: [...(g.members || []), newMember] } : g)
                      saveGroups(updated)
                      lastLocalEditRef.current = Date.now()
                      if (activeGroup?.share_token) {
                        updateSharedTripData(activeGroup.share_token, {
                          members: [...(activeGroup.members || []), newMember],
                        })
                      }
                      setShowAddMemberModal(false)
                      flash(`Added ${f.name} to ${activeGroup.name}!`)
                    }}
                    className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddMemberModal(false)}
              className="btn-secondary text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* --- EDIT GROUP MEMBER MODAL --- */}
      <Modal
        isOpen={showEditGroupMemberModal}
        onClose={() => {
          setShowEditGroupMemberModal(false)
          setEditingGroupMember(null)
        }}
        title="Edit Group Member Name"
      >
        <form onSubmit={handleSaveGroupMemberEdit} className="space-y-4 text-xs">
          <div>
            <label className="label">Member Name *</label>
            <input
              type="text"
              placeholder="e.g. Manoj Gowda"
              value={editingGroupMember?.name || ''}
              onChange={(e) => setEditingGroupMember(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="label">Phone Number (Optional for WhatsApp reminders)</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={editingGroupMember?.phone || ''}
              onChange={(e) => setEditingGroupMember(prev => ({ ...prev, phone: e.target.value }))}
              className="input-field text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setShowEditGroupMemberModal(false)
                setEditingGroupMember(null)
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

      {/* --- STATEMENT & PRINTABLE SUMMARY MODAL (PDF LAYOUT) --- */}
      <SplitwisePrintableSummaryModal
        isOpen={showPrintableSummaryModal || showStatementModal}
        onClose={() => {
          setShowPrintableSummaryModal(false)
          setShowStatementModal(false)
        }}
        group={activeGroup}
      />

      {/* --- CONFIRM DIALOGS --- */}
      <ConfirmDialog
        isOpen={Boolean(deleteGroupTarget)}
        title="Delete Group?"
        message={`Are you sure you want to delete "${deleteGroupTarget?.name}"?`}
        confirmLabel="Delete Group"
        danger
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroupTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteFriendTarget)}
        title="Delete Friend?"
        message={`Remove "${deleteFriendTarget?.name}" from your Splitwise friends list? Historical expense records will be preserved.`}
        confirmLabel="Delete Friend"
        danger
        onConfirm={handleDeleteFriend}
        onCancel={() => setDeleteFriendTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteExpenseTarget)}
        title="Delete Expense?"
        message={`Remove "${deleteExpenseTarget?.title}" from group expenses?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteExpenseTarget(null)}
      />

      {/* --- SHARE TRIP / GROUP MODAL --- */}
      <ShareTripModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        group={activeShareGroup || activeGroup}
        onUpdateBudget={async (newBudget) => {
          if (activeGroup) {
            const updated = groups.map(g => g.id === activeGroup.id ? { ...g, budget: newBudget } : g)
            saveGroups(updated)
            await publishOrSyncSharedGroup({ ...activeGroup, budget: newBudget }, user?.id)
            flash(`Trip budget set to ${formatCurrency(newBudget)}!`)
          }
        }}
      />
    </Layout>
  )
}
