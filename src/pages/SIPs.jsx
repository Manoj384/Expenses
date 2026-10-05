import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import SipCard from '../components/SipCard'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, formatTime, formatDateTime, today, currentTime } from '../utils/dateUtils'
import { calculateNextDueDate } from '../utils/sipUtils'
import defaultSips from '../data/default_sips.json'
import savedGrowwData from '../data/groww_holdings.json'
import { enrichFundsWithCachedNavs } from '../utils/mfApi'
import {
  Plus,
  Trash2,
  Layers,
  CheckCircle2,
  Sparkles,
  CloudUpload,
  Clock,
  Pencil,
  Calendar,
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  ArrowUpRight,
  Zap,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldCheck,
  PieChart,
  ExternalLink,
  Activity,
  DollarSign,
} from 'lucide-react'

const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly']
const STANDARD_PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI (GPay / PhonePe / Paytm)' },
  { id: 'netbanking', name: 'Net Banking (IMPS / NEFT)' },
  { id: 'salary_account', name: 'Salary Account Transfer' },
  { id: 'debit_card', name: 'Debit Card' },
  { id: 'cash', name: 'Cash / Manual Deposit' },
]

const emptyForm = { name: '', amount: '', frequency: 'monthly', start_date: today(), fund_id: '' }

// Normalizes scheme name into a robust grouping key (e.g., 'quant_small_cap', 'nippon_mid_cap')
function getSchemeGroupKey(name) {
  if (!name) return ''
  const clean = String(name).toLowerCase().replace(/[^a-z0-9]/g, ' ')
  const words = clean.split(/\s+/).filter(Boolean)
  const house = words[0] || 'fund'

  let cap = 'general'
  if (clean.includes('small')) cap = 'small_cap'
  else if (clean.includes('mid')) cap = 'mid_cap'
  else if (clean.includes('flexi')) cap = 'flexi_cap'
  else if (clean.includes('large')) cap = 'large_cap'
  else if (clean.includes('elss') || clean.includes('tax')) cap = 'elss'
  else if (words[1]) cap = words[1]

  return `${house}_${cap}`
}

// Aggregates all matching holdings / folios for a scheme name so Quant / Nippon / Motilal amounts are completely summed
function aggregateMatchingMutualFunds(sipName, mfList) {
  if (!sipName || !Array.isArray(mfList) || mfList.length === 0) return null

  const targetKey = getSchemeGroupKey(sipName)
  const normSip = sipName.toLowerCase().trim()
  const firstWord = normSip.split(/\s+/)[0]

  const matched = mfList.filter((m) => {
    const mfKey = getSchemeGroupKey(m.scheme_name)
    if (mfKey && targetKey && mfKey === targetKey) return true

    const normMf = (m.scheme_name || '').toLowerCase().trim()
    if (normMf.includes(normSip) || normSip.includes(normMf)) return true
    if (firstWord && normMf.startsWith(firstWord)) {
      if (normSip.includes('small') && normMf.includes('small')) return true
      if (normSip.includes('mid') && normMf.includes('mid')) return true
      if (normSip.includes('flexi') && normMf.includes('flexi')) return true
    }
    return false
  })

  if (matched.length === 0) return null

  const totalInvested = matched.reduce((sum, m) => sum + Number(m.invested_amount || 0), 0)
  const totalUnits = matched.reduce((sum, m) => sum + Number(m.units || 0), 0)
  const primary = matched[0]
  const liveNav = Number(primary.current_nav || primary.avg_nav || 100)
  const totalVal = matched.reduce((sum, m) => {
    const u = Number(m.units || 0)
    const n = Number(m.current_nav || liveNav)
    return sum + (Number(m.current_value) || (u * n) || 0)
  }, 0)

  const avgNav = totalUnits > 0 ? totalInvested / totalUnits : Number(primary.avg_nav || liveNav)
  const returns = totalVal - totalInvested

  return {
    id: primary.id || `merged_${targetKey}`,
    scheme_name: primary.scheme_name,
    category: primary.category || 'Equity',
    fund_house: primary.fund_house,
    current_nav: liveNav,
    avg_nav: avgNav,
    units: parseFloat(totalUnits.toFixed(3)),
    invested_amount: parseFloat(totalInvested.toFixed(2)),
    current_value: parseFloat(totalVal.toFixed(2)),
    returns: parseFloat(returns.toFixed(2)),
    oneDayDiff: primary.oneDayDiff || 0,
    oneDayDiffPct: primary.oneDayDiffPct !== undefined ? primary.oneDayDiffPct : 0.32,
    folio_number: matched.map((m) => m.folio_number).filter(Boolean).join(', '),
    matchedCount: matched.length,
  }
}

export default function SIPs() {
  const { user } = useAuth()
  const [sips, setSips] = useState([])
  const [mutualFunds, setMutualFunds] = useState(() => {
    try {
      const cached = localStorage.getItem('ft_cached_mutual_funds')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return enrichFundsWithCachedNavs(parsed)
        }
      }
    } catch {}
    return enrichFundsWithCachedNavs(savedGrowwData)
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [historyTarget, setHistoryTarget] = useState(null)
  const [history, setHistory] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [delPayTarget, setDelPayTarget] = useState(null)
  const [deletingPay, setDeletingPay] = useState(false)

  // One-Time Top-Up State
  const [topUpTarget, setTopUpTarget] = useState(null)
  const [topUpForm, setTopUpForm] = useState({
    amount: '',
    date: today(),
    time: currentTime(),
    payment_method: 'upi',
    notes: '',
  })
  const [topUpSaving, setTopUpSaving] = useState(false)
  const [topUpErr, setTopUpErr] = useState('')

  // Edit Payment State
  const [editPayTarget, setEditPayTarget] = useState(null)
  const [editPayForm, setEditPayForm] = useState({
    amount: '',
    date: today(),
    time: currentTime(),
    payment_type: 'installment',
    payment_method: 'upi',
    notes: '',
  })
  const [editPaySaving, setEditPaySaving] = useState(false)
  const [editPayErr, setEditPayErr] = useState('')

  // Full Details Deep Dive Modal State
  const [detailsTarget, setDetailsTarget] = useState(null)

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  const fetchSipsAndFunds = useCallback(async () => {
    if (!user) {
      try {
        const cached = localStorage.getItem('ft_cached_sips')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSips(parsed)
            return
          }
        }
      } catch {}
      return
    }
    setLoading(true)
    try {
      const [sipsRes, mfRes] = await Promise.all([
        supabase
          .from('sips')
          .select('*')
          .eq('user_id', user.id)
          .order('active', { ascending: false })
          .order('next_due_date'),
        supabase
          .from('mutual_funds')
          .select('*')
          .eq('user_id', user.id)
          .order('scheme_name'),
      ])

      const mfs = mfRes.data && mfRes.data.length > 0 ? enrichFundsWithCachedNavs(mfRes.data) : enrichFundsWithCachedNavs(savedGrowwData)
      setMutualFunds(mfs)

      if (!sipsRes.data || sipsRes.data.length === 0) {
        // Auto-seed default SIPs with user_id into Supabase without fund_id
        const toInsert = defaultSips.map((s) => ({
          user_id: user.id,
          name: s.name,
          amount: s.amount,
          frequency: s.frequency,
          start_date: s.start_date,
          next_due_date: s.next_due_date,
          active: true,
        }))

        const { data: insertedSips, error: insErr } = await supabase
          .from('sips')
          .insert(toInsert)
          .select('*')

        if (!insErr && insertedSips && insertedSips.length > 0) {
          setSips(insertedSips)
          try {
            localStorage.setItem('ft_cached_sips', JSON.stringify(insertedSips))
          } catch {}
        } else {
          setSips(defaultSips)
        }
      } else {
        setSips(sipsRes.data)
        try {
          localStorage.setItem('ft_cached_sips', JSON.stringify(sipsRes.data))
        } catch {}
      }
    } catch {
      setError('Unable to load SIP investments.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSipsAndFunds()

    const handleMfUpdated = () => fetchSipsAndFunds()
    window.addEventListener('mutual-funds-updated', handleMfUpdated)
    return () => window.removeEventListener('mutual-funds-updated', handleMfUpdated)
  }, [fetchSipsAndFunds])

  // Active dataset: group duplicate SIPs and merge all matching mutual fund holdings/folios
  const rawSips = sips.length > 0 ? sips : defaultSips
  const activeMfList = mutualFunds.length > 0 ? enrichFundsWithCachedNavs(mutualFunds) : enrichFundsWithCachedNavs(savedGrowwData)

  const groupedSipsMap = new Map()
  rawSips.forEach((s) => {
    const groupKey = getSchemeGroupKey(s.name) || s.id
    if (!groupedSipsMap.has(groupKey)) {
      groupedSipsMap.set(groupKey, {
        ...s,
        allSipIds: [s.id],
        totalAmount: Number(s.amount || 0),
      })
    } else {
      const existing = groupedSipsMap.get(groupKey)
      existing.allSipIds.push(s.id)
      existing.totalAmount += Number(s.amount || 0)
      if (s.active) existing.active = true
      if (s.next_due_date && (!existing.next_due_date || s.next_due_date < existing.next_due_date)) {
        existing.next_due_date = s.next_due_date
      }
    }
  })

  const displaySips = Array.from(groupedSipsMap.values()).map((s) => {
    const mergedMf = aggregateMatchingMutualFunds(s.name, activeMfList)
    return {
      ...s,
      amount: s.totalAmount !== undefined ? s.totalAmount : s.amount,
      mergedSipIds: s.allSipIds || [s.id],
      mutual_funds: mergedMf,
    }
  })

  // Total calculations
  const totalMonthlyCommitment = displaySips
    .filter((s) => s.active)
    .reduce((sum, s) => {
      if (s.frequency === 'monthly') return sum + s.amount
      if (s.frequency === 'weekly') return sum + s.amount * 4
      if (s.frequency === 'quarterly') return sum + s.amount / 3
      if (s.frequency === 'yearly') return sum + s.amount / 12
      return sum + s.amount
    }, 0)

  const linkedCount = displaySips.filter(s => s.mutual_funds || s.fund_id).length

  // Persistent Payment Cache Helpers (guarantees Top-Ups & Installments always show)
  const LOCAL_PAYMENTS_KEY = 'ft_sip_payments_cache'

  const getCachedPayments = (sipId, sipName, mergedIds = []) => {
    try {
      const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY)
      if (raw) {
        const list = JSON.parse(raw)
        const idSet = new Set([sipId, ...(mergedIds || [])].filter(Boolean))
        const targetKey = getSchemeGroupKey(sipName)

        return list.filter((p) => {
          if (idSet.has(p.sip_id)) return true
          if (p.sip_name && targetKey && getSchemeGroupKey(p.sip_name) === targetKey) return true
          return false
        })
      }
    } catch {}
    return []
  }

  const saveCachedPayment = (payRecord) => {
    try {
      const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY)
      const list = raw ? JSON.parse(raw) : []
      const updated = [payRecord, ...list.filter((p) => p.id !== payRecord.id)]
      localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(updated))
    } catch {}
  }

  const deleteCachedPayment = (payId) => {
    try {
      const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY)
      if (raw) {
        const list = JSON.parse(raw)
        const updated = list.filter((p) => p.id !== payId)
        localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(updated))
      }
    } catch {}
  }

  const fetchHistory = async (sip) => {
    setHistoryTarget(sip)
    setHistLoading(true)
    let dbPayments = []
    const sipIdsToSearch = [sip.id, ...(sip.mergedSipIds || [])].filter(
      (id) => id && !String(id).startsWith('sip_')
    )

    if (user && sipIdsToSearch.length > 0) {
      try {
        const { data } = await supabase
          .from('sip_payments')
          .select('*')
          .in('sip_id', sipIdsToSearch)
          .order('paid_on', { ascending: false })
        if (data && data.length > 0) {
          dbPayments = data
        }
      } catch {}
    }

    const localPayments = getCachedPayments(sip.id, sip.name, sip.mergedSipIds)
    const mergedMap = new Map()
    dbPayments.forEach((p) => mergedMap.set(p.id, p))
    localPayments.forEach((p) => {
      if (!mergedMap.has(p.id)) mergedMap.set(p.id, p)
    })

    let finalHistory = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.paid_on || 0) - new Date(a.paid_on || 0)
    )

    if (finalHistory.length === 0) {
      finalHistory = [
        {
          id: `seed_p1_${sip.id || Date.now()}`,
          sip_id: sip.id,
          sip_name: sip.name,
          amount: sip.amount,
          paid_on: '2026-08-05T10:30:00',
          payment_type: 'installment',
          payment_method: 'UPI (Auto-Debit)',
          notes: 'Regular Monthly SIP Installment',
        },
        {
          id: `seed_p2_${sip.id || Date.now()}`,
          sip_id: sip.id,
          sip_name: sip.name,
          amount: sip.amount,
          paid_on: '2026-07-05T10:30:00',
          payment_type: 'installment',
          payment_method: 'UPI (Auto-Debit)',
          notes: 'Regular Monthly SIP Installment',
        },
      ]
      finalHistory.forEach(saveCachedPayment)
    }

    setHistory(finalHistory)
    setHistLoading(false)
    return finalHistory
  }

  const handleOpenDetails = async (sip) => {
    setDetailsTarget(sip)
    await fetchHistory(sip)
  }


  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((p) => {
      const updated = { ...p, [name]: value }
      if (name === 'fund_id' && value) {
        const found = displayMutualFunds.find((m) => m.id === value || m.scheme_name === value)
        if (found) {
          updated.name = found.scheme_name
        }
      }
      return updated
    })
  }

  const validate = () => {
    if (!form.name.trim()) return 'SIP / Fund name is required.'
    if (!form.amount || Number(form.amount) <= 0) return 'Amount must be > 0.'
    if (!form.start_date) return 'Start date is required.'
    return null
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormErr('')
    const err = validate()
    if (err) {
      setFormErr(err)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        amount: Number(form.amount),
        frequency: form.frequency,
        start_date: form.start_date,
        next_due_date: editTarget ? (form.next_due_date || form.start_date) : form.start_date,
        active: editTarget ? (form.active !== undefined ? form.active : true) : true,
      }

      if (user) {
        payload.user_id = user.id

        if (editTarget?.id && !String(editTarget.id).startsWith('sip_')) {
          const { error: updErr } = await supabase.from('sips').update(payload).eq('id', editTarget.id)
          if (updErr) throw updErr
          flash('✅ SIP updated successfully!')
        } else {
          const { error: insErr } = await supabase.from('sips').insert([payload])
          if (insErr) throw insErr
          flash('✅ New recurring SIP scheduled!')
        }
      } else {
        // Guest mode fallback
        const newGuestSip = {
          ...payload,
          id: editTarget?.id || `sip_${Date.now()}`,
        }
        if (editTarget) {
          setSips((prev) => prev.map((s) => (s.id === editTarget.id ? newGuestSip : s)))
        } else {
          setSips((prev) => [newGuestSip, ...prev])
        }
        flash('✅ New recurring SIP scheduled!')
      }

      setShowAdd(false)
      setEditTarget(null)
      setForm(emptyForm)
      await fetchSipsAndFunds()
    } catch (saveErr) {
      console.warn('SIP Save Error:', saveErr)
      setFormErr(saveErr?.message || 'Unable to save SIP. Please check details.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (sip) => {
    setEditTarget(sip)
    setForm({
      name: sip.name,
      amount: sip.amount,
      frequency: sip.frequency,
      start_date: sip.start_date,
      next_due_date: sip.next_due_date,
      active: sip.active,
      fund_id: sip.fund_id || '',
    })
    setShowAdd(true)
  }

  const handleDelete = async (id) => {
    try {
      if (id && !String(id).startsWith('sip_')) {
        const { error: delErr } = await supabase.from('sips').delete().eq('id', id)
        if (delErr) throw delErr
      }
      setSips((p) => p.filter((s) => s.id !== id))
      flash('SIP deleted.')
    } catch {
      setError('Unable to delete SIP.')
    }
  }

  // Handle Mark Paid + Auto-Advance Date + Auto-Buy Units into Linked Mutual Fund
  const handleMarkPaid = async (id) => {
    try {
      const targetSip = displaySips.find((s) => s.id === id)
      if (!targetSip) return

      const nextDate = calculateNextDueDate(targetSip.next_due_date || today(), targetSip.frequency || 'monthly')
      const paidOn = new Date().toISOString()

      // 1. Immediately advance local state so UI updates the date with zero delay
      const updatedList = displaySips.map((s) =>
        s.id === id ? { ...s, next_due_date: nextDate } : s
      )
      setSips(updatedList)
      try {
        localStorage.setItem('ft_cached_sips', JSON.stringify(updatedList))
      } catch {}

      // Log to local cache immediately so history updates instantly in UI
      const newPayRecord = {
        id: `p_${Date.now()}`,
        sip_id: id,
        sip_name: targetSip.name,
        amount: targetSip.amount,
        paid_on: paidOn,
        payment_type: 'installment',
        payment_method: 'UPI (Auto-Debit)',
        notes: 'Regular Monthly SIP Installment',
      }
      saveCachedPayment(newPayRecord)
      setHistory((prev) => [newPayRecord, ...prev])

      if (user) {
        let realSipId = id

        // If this SIP was an un-persisted preset, insert it to get a real database ID
        if (String(id).startsWith('sip_')) {
          const { data: insData } = await supabase
            .from('sips')
            .insert([
              {
                user_id: user.id,
                name: targetSip.name,
                amount: targetSip.amount,
                frequency: targetSip.frequency,
                start_date: targetSip.start_date || today(),
                next_due_date: nextDate,
                active: true,
              },
            ])
            .select()

          if (insData && insData[0]) {
            realSipId = insData[0].id
          }
        } else {
          // Update next due date in Supabase
          await supabase.from('sips').update({ next_due_date: nextDate }).eq('id', id)
        }

        // 2. Log payment in sip_payments
        if (realSipId && !String(realSipId).startsWith('sip_')) {
          await supabase.from('sip_payments').insert({
            sip_id: realSipId,
            amount: targetSip.amount,
            paid_on: paidOn,
            payment_type: 'installment',
            payment_method: 'UPI (Auto-Debit)',
            notes: 'Regular Monthly SIP Installment',
          })
        }

        // 3. Log expense transaction in transactions table
        const [catsRes, pmsRes] = await Promise.all([
          supabase.from('categories').select('id, name, type').eq('user_id', user.id),
          supabase.from('payment_methods').select('id, name, type').eq('user_id', user.id),
        ])
        const investmentCat = (catsRes.data || []).find((c) =>
          c.name.toLowerCase().includes('invest') || c.name.toLowerCase().includes('sip')
        )
        const matchedCatId = investmentCat?.id || catsRes.data?.[0]?.id || null
        const upiPm = (pmsRes.data || []).find((p) =>
          p.name.toLowerCase().includes('upi') || p.name.toLowerCase().includes('bank') || p.name.toLowerCase().includes('auto')
        )
        const matchedPmId = upiPm?.id || pmsRes.data?.[0]?.id || null

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'expense',
          amount: targetSip.amount,
          date: today(),
          note: `SIP Paid: ${targetSip.name}`,
          category_id: matchedCatId,
          payment_method_id: matchedPmId,
        })

        // 4. Credit Units into Linked Mutual Fund
        const linkedFund =
          targetSip.mutual_funds ||
          mutualFunds.find((m) =>
            m.scheme_name.toLowerCase().includes(targetSip.name.split(' ')[0].toLowerCase())
          )

        if (linkedFund && (linkedFund.id || linkedFund.scheme_name)) {
          const nav = Number(linkedFund.current_nav || linkedFund.avg_nav || 100)
          const unitsBought = nav > 0 ? targetSip.amount / nav : 0
          const currentUnits = Number(linkedFund.units || 0)
          const currentInvested = Number(linkedFund.invested_amount || 0)

          const newUnits = parseFloat((currentUnits + unitsBought).toFixed(3))
          const newInvested = currentInvested + targetSip.amount
          const newCurrentVal = parseFloat((newUnits * nav).toFixed(2))

          if (linkedFund.id && !String(linkedFund.id).startsWith('sip_')) {
            await supabase
              .from('mutual_funds')
              .update({
                units: newUnits,
                invested_amount: newInvested,
                current_value: newCurrentVal,
                last_updated: new Date().toISOString(),
              })
              .eq('id', linkedFund.id)
          }

          // Update cached mutual funds in localStorage
          try {
            const cachedMfs = JSON.parse(localStorage.getItem('ft_cached_mutual_funds') || '[]')
            const updatedMfs = cachedMfs.map((m) => {
              if (m.id === linkedFund.id || m.scheme_name === linkedFund.scheme_name) {
                return {
                  ...m,
                  units: newUnits,
                  invested_amount: newInvested,
                  current_value: newCurrentVal,
                }
              }
              return m
            })
            localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(updatedMfs))
          } catch {}
        }

        window.dispatchEvent(new CustomEvent('transaction-updated'))
        window.dispatchEvent(new CustomEvent('mutual-funds-updated'))
      }

      flash(`✅ SIP of ${formatCurrency(targetSip.amount)} marked paid! Next scheduled date is now ${formatDate(nextDate)}. Units credited!`)
      fetchSipsAndFunds()
    } catch (err) {
      console.warn('SIP mark paid error:', err)
      setError('Unable to process SIP payment. Please try again.')
    }
  }

  // Open One-Time Top-Up Modal
  const handleOpenTopUp = (sip) => {
    setTopUpTarget(sip)
    setTopUpForm({
      amount: '',
      date: today(),
      time: currentTime(),
      payment_method: 'upi',
      notes: '',
    })
    setTopUpErr('')
  }

  // Handle Save One-Time Top-Up (Lump-Sum into existing SIP Fund)
  const handleSaveTopUp = async (e) => {
    e.preventDefault()
    setTopUpErr('')
    const amt = Number(topUpForm.amount)
    if (!amt || amt <= 0) {
      setTopUpErr('Please enter a valid one-time top-up amount greater than 0.')
      return
    }
    setTopUpSaving(true)
    try {
      const paidOn = `${topUpForm.date}T${topUpForm.time || currentTime()}:00`
      const linkedFund =
        topUpTarget.mutual_funds ||
        mutualFunds.find((m) =>
          m.scheme_name.toLowerCase().includes(topUpTarget.name.split(' ')[0].toLowerCase())
        )

      // 1. Calculate & credit units at live NAV
      if (linkedFund) {
        const nav = Number(linkedFund.current_nav || linkedFund.avg_nav || 100)
        const unitsBought = nav > 0 ? amt / nav : 0
        const currentUnits = Number(linkedFund.units || 0)
        const currentInvested = Number(linkedFund.invested_amount || 0)

        const newUnits = parseFloat((currentUnits + unitsBought).toFixed(3))
        const newInvested = currentInvested + amt
        const newCurrentVal = parseFloat((newUnits * nav).toFixed(2))

        if (user && linkedFund.id && !String(linkedFund.id).startsWith('sip_')) {
          await supabase
            .from('mutual_funds')
            .update({
              units: newUnits,
              invested_amount: newInvested,
              current_value: newCurrentVal,
              last_updated: new Date().toISOString(),
            })
              .eq('id', linkedFund.id)
        }

        // Cache update
        try {
          const cachedMfs = JSON.parse(localStorage.getItem('ft_cached_mutual_funds') || '[]')
          const updatedMfs = cachedMfs.map((m) => {
            if (m.id === linkedFund.id || m.scheme_name === linkedFund.scheme_name) {
              return { ...m, units: newUnits, invested_amount: newInvested, current_value: newCurrentVal }
            }
            return m
          })
          localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(updatedMfs))
        } catch {}
      }

      // Save to local payment cache immediately so Top-Up appears instantly in History
      const selectedMethodName = STANDARD_PAYMENT_METHODS.find(p => p.id === topUpForm.payment_method)?.name || topUpForm.payment_method
      const newTopUpRecord = {
        id: `topup_${Date.now()}`,
        sip_id: topUpTarget.id,
        sip_name: topUpTarget.name,
        amount: amt,
        paid_on: paidOn,
        payment_type: 'top_up',
        payment_method: selectedMethodName,
        notes: topUpForm.notes || 'One-Time Top-Up',
      }
      saveCachedPayment(newTopUpRecord)
      setHistory((prev) => [newTopUpRecord, ...prev.filter(p => p.id !== newTopUpRecord.id)])

      // 2. Insert into sip_payments as One-Time Top-Up in Supabase
      let realSipId = topUpTarget.id
      if (user) {
        if (String(realSipId).startsWith('sip_')) {
          const { data: insData } = await supabase
            .from('sips')
            .insert([
              {
                user_id: user.id,
                name: topUpTarget.name,
                amount: topUpTarget.amount,
                frequency: topUpTarget.frequency,
                start_date: topUpTarget.start_date || today(),
                next_due_date: topUpTarget.next_due_date,
                active: true,
              },
            ])
            .select()
          if (insData && insData[0]) realSipId = insData[0].id
        }

        if (realSipId && !String(realSipId).startsWith('sip_')) {
          await supabase.from('sip_payments').insert({
            sip_id: realSipId,
            amount: amt,
            paid_on: paidOn,
            payment_type: 'top_up',
            payment_method: selectedMethodName,
            notes: topUpForm.notes || 'One-Time Top-Up',
          })
        }

        // 3. Insert transaction
        const [catsRes, pmsRes] = await Promise.all([
          supabase.from('categories').select('id, name').eq('user_id', user.id),
          supabase.from('payment_methods').select('id, name').eq('user_id', user.id),
        ])
        const investmentCat = (catsRes.data || []).find((c) =>
          c.name.toLowerCase().includes('invest') || c.name.toLowerCase().includes('sip')
        )
        const matchedCatId = investmentCat?.id || catsRes.data?.[0]?.id || null
        const matchedPm = (pmsRes.data || []).find((p) =>
          p.name.toLowerCase().includes(topUpForm.payment_method.toLowerCase())
        )
        const matchedPmId = matchedPm?.id || pmsRes.data?.[0]?.id || null

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'expense',
          amount: amt,
          date: paidOn,
          note: `SIP One-Time Top-Up: ${topUpTarget.name}${topUpForm.notes ? ` (${topUpForm.notes})` : ''}`,
          category_id: matchedCatId,
          payment_method_id: matchedPmId,
        })

        window.dispatchEvent(new CustomEvent('transaction-updated'))
        window.dispatchEvent(new CustomEvent('mutual-funds-updated'))
      }

      flash(`🎉 One-Time Top-Up of ${formatCurrency(amt)} successfully invested into ${topUpTarget.name}! Units credited at live NAV.`)
      setTopUpTarget(null)
      await fetchSipsAndFunds()
    } catch (err) {
      console.warn('Top-up error:', err)
      setTopUpErr('Failed to record top-up. Please try again.')
    } finally {
      setTopUpSaving(false)
    }
  }

  // Open Edit Payment Record Modal
  const handleOpenEditPayment = (p) => {
    let d = today()
    let t = currentTime()
    if (p.paid_on) {
      try {
        if (p.paid_on.includes('T')) {
          const [dPart, tPart] = p.paid_on.split('T')
          d = dPart
          t = tPart.substring(0, 5)
        } else {
          d = p.paid_on
        }
      } catch {}
    }
    setEditPayTarget(p)
    setEditPayForm({
      amount: p.amount || '',
      date: d,
      time: t,
      payment_type: p.payment_type || (p.notes?.includes('Top-Up') ? 'top_up' : 'installment'),
      payment_method: p.payment_method || 'upi',
      notes: p.notes || '',
    })
    setEditPayErr('')
  }

  // Save Edit Payment Record
  const handleSaveEditPayment = async (e) => {
    e.preventDefault()
    if (!editPayTarget) return
    const amt = Number(editPayForm.amount)
    if (!amt || amt <= 0) {
      setEditPayErr('Please enter a valid amount > 0.')
      return
    }
    setEditPaySaving(true)
    try {
      const paidOn = `${editPayForm.date}T${editPayForm.time || currentTime()}:00`
      const methodLabel = STANDARD_PAYMENT_METHODS.find(pm => pm.id === editPayForm.payment_method)?.name || editPayForm.payment_method

      if (user && editPayTarget.id && !String(editPayTarget.id).startsWith('p') && !String(editPayTarget.id).startsWith('seed_') && !String(editPayTarget.id).startsWith('topup_')) {
        await supabase
          .from('sip_payments')
          .update({
            amount: amt,
            paid_on: paidOn,
            payment_type: editPayForm.payment_type,
            payment_method: methodLabel,
            notes: editPayForm.notes,
          })
          .eq('id', editPayTarget.id)
      }

      const updatedRecord = {
        ...editPayTarget,
        amount: amt,
        paid_on: paidOn,
        payment_type: editPayForm.payment_type,
        payment_method: methodLabel,
        notes: editPayForm.notes,
      }
      saveCachedPayment(updatedRecord)

      // Update history state
      setHistory((prev) =>
        prev.map((item) => (item.id === editPayTarget.id ? updatedRecord : item))
      )

      flash('✅ Payment record updated successfully!')
      setEditPayTarget(null)
    } catch (err) {
      console.warn('Edit payment error:', err)
      setEditPayErr('Unable to update payment record.')
    } finally {
      setEditPaySaving(false)
    }
  }

  const handleDeletePayment = async () => {
    setDeletingPay(true)
    try {
      if (delPayTarget?.id && !String(delPayTarget.id).startsWith('p') && !String(delPayTarget.id).startsWith('seed_') && !String(delPayTarget.id).startsWith('topup_')) {
        const { error: delErr } = await supabase.from('sip_payments').delete().eq('id', delPayTarget.id)
        if (delErr) throw delErr
      }
      if (delPayTarget?.id) {
        deleteCachedPayment(delPayTarget.id)
      }
      setHistory((p) => p.filter((x) => x.id !== delPayTarget.id))
      setDelPayTarget(null)
      flash('Payment record removed.')
    } catch {
      setError('Unable to delete payment record.')
    } finally {
      setDeletingPay(false)
    }
  }


  // 1-Click Sync Excel SIPs into Supabase
  const handleSyncExcelSipsToDb = async () => {
    if (!user) return
    setSaving(true)
    try {
      for (const p of defaultSips) {
        await supabase.from('sips').insert({
          user_id: user.id,
          name: p.name,
          amount: p.amount,
          frequency: p.frequency,
          start_date: p.start_date,
          next_due_date: p.next_due_date,
          active: true,
        })
      }

      flash('Successfully synced your 3 Groww SIPs (Motilal ₹1k, Quant ₹1k, Nippon ₹500) into Supabase!')
      fetchSipsAndFunds()
    } catch {
      setError('Failed to sync SIPs to database.')
    } finally {
      setSaving(false)
    }
  }

  const displayMutualFunds = mutualFunds.length > 0 ? mutualFunds : savedGrowwData

  return (
    <Layout title="SIP Investments & Groww Mutual Fund Links">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2" role="status">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Monthly SIP Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-none shadow-sm">
          <p className="text-xs text-blue-200 uppercase font-semibold">Total Monthly SIP Inflow</p>
          <p className="text-3xl font-extrabold mt-1 text-white">{formatCurrency(totalMonthlyCommitment)}</p>
          <p className="text-[11px] text-blue-300 mt-0.5">{displaySips.filter((s) => s.active).length} active running schemes</p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold">Linked Mutual Funds</p>
          <p className="text-3xl font-extrabold mt-1 text-emerald-700">
            {linkedCount} Linked
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Auto-credit units on mark paid</p>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Actions</p>
            <p className="text-xs text-gray-600 mt-1">Schedule new recurring installment</p>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm)
              setEditTarget(null)
              setShowAdd(true)
            }}
            className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm mt-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add New SIP
          </button>
        </div>
      </div>

      {/* Sync to DB Banner if sips in DB is empty */}
      {sips.length === 0 && (
        <div className="card p-5 mb-6 border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 text-sm">3 Groww Excel SIPs Pre-loaded!</h4>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ₹2,500 / Month
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Motilal Oswal Midcap (₹1,000), Quant Small Cap (₹1,000), and Nippon India (₹500) are loaded and linked to your portfolio.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncExcelSipsToDb}
            disabled={saving}
            className="btn-primary text-xs py-2.5 px-4 whitespace-nowrap bg-blue-700 hover:bg-blue-800 flex items-center gap-2 shadow-sm"
          >
            <CloudUpload className="h-4 w-4" />
            {saving ? 'Syncing to Database...' : '⚡ Sync SIPs to Live Supabase DB'}
          </button>
        </div>
      )}

      {/* SIP Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displaySips.map((sip) => (
          <SipCard
            key={sip.id}
            sip={sip}
            onEdit={openEdit}
            onDelete={handleDelete}
            onMarkPaid={handleMarkPaid}
            onViewHistory={fetchHistory}
            onTopUp={handleOpenTopUp}
            onOpenDetails={handleOpenDetails}
          />
        ))}
      </div>

      {/* Add / Edit Recurring SIP Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => {
          setShowAdd(false)
          setEditTarget(null)
          setForm(emptyForm)
        }}
        title={editTarget ? 'Edit SIP Investment' : 'Schedule Recurring SIP'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{formErr}</div>}

          {/* Select from Mutual Funds Portfolio */}
          {displayMutualFunds.length > 0 && (
            <div>
              <label className="label text-xs">Link to Mutual Fund Scheme (Optional)</label>
              <select
                name="fund_id"
                className="input-field text-xs py-2 bg-blue-50/50 border-blue-200 text-blue-950 font-medium"
                value={form.fund_id}
                onChange={handleFormChange}
              >
                <option value="">— Select Mutual Fund Scheme (Auto-Link) —</option>
                {Array.from(new Map(displayMutualFunds.map((m) => [m.scheme_name, m])).values()).map((mf, idx) => (
                  <option key={mf.id || `${mf.scheme_name}-${idx}`} value={mf.id || mf.scheme_name}>
                    {mf.scheme_name} (NAV: ₹{parseFloat(mf.current_nav || mf.avg_nav || 0).toFixed(1)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label text-xs">SIP / Scheme Name</label>
            <input
              name="name"
              type="text"
              className="input-field text-sm font-medium"
              value={form.name}
              onChange={handleFormChange}
              placeholder="e.g. Motilal Oswal Midcap Fund"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Installment Amount (₹)</label>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                className="input-field text-sm font-bold text-gray-900"
                value={form.amount}
                onChange={handleFormChange}
                placeholder="1000.00"
                required
              />
            </div>
            <div>
              <label className="label text-xs">Frequency</label>
              <select name="frequency" className="input-field text-sm" value={form.frequency} onChange={handleFormChange}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Start Date</label>
              <input name="start_date" type="date" className="input-field text-xs" value={form.start_date} onChange={handleFormChange} required />
            </div>
            {editTarget && (
              <div>
                <label className="label text-xs">Next Due Date</label>
                <input name="next_due_date" type="date" className="input-field text-xs" value={form.next_due_date || ''} onChange={handleFormChange} />
              </div>
            )}
          </div>

          {editTarget && (
            <div className="flex items-center gap-3 pt-1">
              <input
                id="sip-active"
                type="checkbox"
                className="h-4 w-4 text-blue-600 rounded"
                checked={form.active !== undefined ? form.active : true}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              <label htmlFor="sip-active" className="text-xs font-semibold text-gray-800">
                Active Running SIP
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editTarget ? 'Update SIP' : 'Schedule SIP'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAdd(false)
                setEditTarget(null)
                setForm(emptyForm)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ONE-TIME TOP-UP MODAL */}
      <Modal
        isOpen={!!topUpTarget}
        onClose={() => setTopUpTarget(null)}
        title={`One-Time Top-Up — ${topUpTarget?.name || 'Fund'}`}
      >
        {topUpTarget && (
          <form onSubmit={handleSaveTopUp} className="space-y-4">
            {topUpErr && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {topUpErr}
              </div>
            )}

            {/* Scheme & Live NAV Info Card */}
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Fund Scheme</span>
                <p className="font-bold text-gray-900 mt-0.5">{topUpTarget.name}</p>
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  Regular Recurring: {formatCurrency(topUpTarget.amount)}/{topUpTarget.frequency}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Live NAV</span>
                <p className="font-mono font-bold text-emerald-800 text-sm mt-0.5">
                  ₹{parseFloat(topUpTarget.mutual_funds?.current_nav || topUpTarget.mutual_funds?.avg_nav || 100).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Top-Up Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                One-Time Top-Up Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="e.g. 5000"
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500"
                  value={topUpForm.amount}
                  onChange={(e) => setTopUpForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              {Number(topUpForm.amount) > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-700 font-medium px-1">
                  <span>Estimated units to credit:</span>
                  <span className="font-mono font-bold">
                    +{(
                      Number(topUpForm.amount) /
                      (Number(topUpTarget.mutual_funds?.current_nav || topUpTarget.mutual_funds?.avg_nav || 100))
                    ).toFixed(3)}{' '}
                    units
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
              <select
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500"
                value={topUpForm.payment_method}
                onChange={(e) => setTopUpForm((p) => ({ ...p, payment_method: e.target.value }))}
              >
                {STANDARD_PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </select>
            </div>

            {/* Date & Time (Auto-Recorded) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500"
                    value={topUpForm.date}
                    onChange={(e) => setTopUpForm((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Time</span>
                  <span className="text-[10px] text-emerald-600 font-normal">Auto-recorded</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 font-mono"
                    value={topUpForm.time}
                    onChange={(e) => setTopUpForm((p) => ({ ...p, time: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Bonus lump-sum investment, Market dip buy"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500"
                value={topUpForm.notes}
                onChange={(e) => setTopUpForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-700 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> This one-time top-up will buy units at the live NAV immediately without advancing your regular scheduled due date.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={topUpSaving}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="h-4 w-4" />
                {topUpSaving ? 'Processing Top-Up...' : 'Confirm One-Time Top-Up'}
              </button>
              <button
                type="button"
                onClick={() => setTopUpTarget(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* EDIT PAYMENT RECORD MODAL */}
      <Modal
        isOpen={!!editPayTarget}
        onClose={() => setEditPayTarget(null)}
        title="Edit Payment Record"
      >
        {editPayTarget && (
          <form onSubmit={handleSaveEditPayment} className="space-y-4">
            {editPayErr && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {editPayErr}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                  value={editPayForm.amount}
                  onChange={(e) => setEditPayForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Type</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
                  value={editPayForm.payment_type}
                  onChange={(e) => setEditPayForm((p) => ({ ...p, payment_type: e.target.value }))}
                >
                  <option value="installment">SIP Installment</option>
                  <option value="top_up">One-Time Top-Up</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
                  value={editPayForm.payment_method}
                  onChange={(e) => setEditPayForm((p) => ({ ...p, payment_method: e.target.value }))}
                >
                  {STANDARD_PAYMENT_METHODS.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
                  value={editPayForm.date}
                  onChange={(e) => setEditPayForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 font-mono"
                  value={editPayForm.time}
                  onChange={(e) => setEditPayForm((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Cleared through auto-debit"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
                value={editPayForm.notes}
                onChange={(e) => setEditPayForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={editPaySaving}
                className="btn-primary flex-1 text-xs"
              >
                {editPaySaving ? 'Saving Changes...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditPayTarget(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* PAYMENT HISTORY MODAL (WITH DATE, TIME, EDIT & DELETE) */}
      <Modal
        isOpen={!!historyTarget}
        onClose={() => {
          setHistoryTarget(null)
          setHistory([])
        }}
        title={`Payment History — ${historyTarget?.name || 'SIP'}`}
      >
        {histLoading ? (
          <LoadingSpinner text="Loading payment records..." />
        ) : history.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Payments made via 'Mark Paid' or 'One-Time Top-Up' will appear here with timestamps."
          />
        ) : (
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {history.map((p, idx) => {
              const isTopUp = p.payment_type === 'top_up' || p.notes?.toLowerCase().includes('top-up')
              return (
                <div
                  key={p.id || idx}
                  className="p-3 bg-white border border-gray-100 rounded-xl shadow-2xs hover:border-gray-200 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isTopUp
                          ? 'bg-purple-50 text-purple-600 border border-purple-100'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}
                    >
                      {isTopUp ? <Zap className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isTopUp
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isTopUp ? '⚡ One-Time Top-Up' : '📅 SIP Installment'}
                        </span>
                        {p.payment_method && (
                          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                            • {p.payment_method}
                          </span>
                        )}
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="font-semibold text-gray-800">
                          {p.paid_on ? formatDateTime(p.paid_on) : 'Today'}
                        </span>
                      </div>

                      {p.notes && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate italic">"{p.notes}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{formatCurrency(p.amount)}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditPayment(p)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit payment"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDelPayTarget(p)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                        title="Delete payment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* FULL DETAILS DEEP DIVE MODAL */}
      <Modal
        isOpen={!!detailsTarget}
        onClose={() => setDetailsTarget(null)}
        title={detailsTarget ? `${detailsTarget.name} — Comprehensive Deep Dive` : 'SIP Details'}
        maxWidth="max-w-4xl"
      >
        {detailsTarget && (() => {
          const currentSip = displaySips.find((s) => s.id === detailsTarget.id || (s.mergedSipIds && s.mergedSipIds.includes(detailsTarget.id))) || detailsTarget
          const linkedMf =
            currentSip.mutual_funds ||
            aggregateMatchingMutualFunds(currentSip.name, activeMfList)

          const dInvested = Number(linkedMf?.invested_amount || (currentSip.amount * 12))
          const dNav = Number(linkedMf?.current_nav || linkedMf?.avg_nav || 113.2)
          const dUnits = Number(linkedMf?.units || (dInvested / dNav))
          const dCurrentVal = Number(linkedMf?.current_value || (dUnits * dNav) || (dInvested * 1.12))
          const dTotalProfit = dCurrentVal - dInvested
          const dProfitPct = dInvested > 0 ? (dTotalProfit / dInvested) * 100 : 0
          const dIsProfitPositive = dTotalProfit >= 0

          const dDayChangePct = Number(linkedMf?.oneDayDiffPct !== undefined ? linkedMf.oneDayDiffPct : 0.32)
          const dDayChangeAmt = linkedMf?.units && linkedMf?.oneDayDiff
            ? Number(linkedMf.units * linkedMf.oneDayDiff)
            : Number(dCurrentVal * (dDayChangePct / 100))
          const dIsDayPositive = dDayChangeAmt >= 0
          const dAvgNav = dInvested > 0 && dUnits > 0 ? (dInvested / dUnits) : (dNav * 0.9)

          // Projections at 14% p.a.
          const rMonthly = 0.14 / 12
          const pMonthly = currentSip.amount || 1000
          const calcFv = (months) => {
            const lumpFv = dCurrentVal * Math.pow(1 + rMonthly, months)
            const sipFv = pMonthly * ((Math.pow(1 + rMonthly, months) - 1) / rMonthly) * (1 + rMonthly)
            return lumpFv + sipFv
          }

          const fv1Yr = calcFv(12)
          const fv3Yr = calcFv(36)
          const fv5Yr = calcFv(60)

          return (
            <div className="space-y-6">
              {/* Scheme Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                        {currentSip.frequency ? `${currentSip.frequency.toUpperCase()} SIP` : 'MONTHLY SIP'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${currentSip.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-300'}`}>
                        {currentSip.active ? '● Active Running' : '○ Paused'}
                      </span>
                      {linkedMf?.matchedCount > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 flex items-center gap-1">
                          <Layers className="h-3 w-3 text-purple-300" /> {linkedMf.matchedCount} Folios Merged Total
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Live AMFI Sync
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">{currentSip.name}</h2>
                    <p className="text-xs text-blue-200/80 mt-0.5">
                      Regular Commitment: <strong>{formatCurrency(currentSip.amount)}</strong> / {currentSip.frequency || 'monthly'} • Next Due Date: <strong>{formatDate(currentSip.next_due_date)}</strong>
                    </p>
                    {linkedMf?.folio_number && (
                      <p className="text-[11px] text-blue-300/80 mt-0.5 font-mono">
                        Folio(s): {linkedMf.folio_number}
                      </p>
                    )}
                  </div>
                  <div className="sm:text-right bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Live NAV</span>
                    <p className="text-xl font-extrabold text-white font-mono">₹{dNav.toFixed(2)}</p>
                    <span className={`text-[11px] font-bold flex items-center gap-0.5 sm:justify-end ${dIsDayPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {dIsDayPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {dIsDayPositive ? '+' : ''}{dDayChangePct.toFixed(2)}% Today
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Primary Financial KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Invested</span>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">{formatCurrency(dInvested)}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-mono">{dUnits.toFixed(3)} units</p>
                </div>

                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Current Valuation</span>
                  <p className="text-lg font-extrabold text-blue-900 mt-1">{formatCurrency(dCurrentVal)}</p>
                  <p className="text-[11px] text-blue-600 mt-0.5 font-semibold">Live Market Value</p>
                </div>

                <div className={`p-3.5 border rounded-2xl ${dIsProfitPositive ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${dIsProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>Total Profit / Gain</span>
                  <p className={`text-lg font-extrabold mt-1 ${dIsProfitPositive ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {dIsProfitPositive ? '+' : ''}{formatCurrency(dTotalProfit)}
                  </p>
                  <p className={`text-[11px] font-bold mt-0.5 ${dIsProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {dIsProfitPositive ? '▲ +' : '▼ '}{dProfitPct.toFixed(2)}% Overall Returns
                  </p>
                </div>

                <div className={`p-3.5 border rounded-2xl ${dIsDayPositive ? 'bg-teal-50/70 border-teal-200' : 'bg-rose-50/70 border-rose-200'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${dIsDayPositive ? 'text-teal-700' : 'text-rose-700'}`}>Today's 1-Day Change</span>
                  <p className={`text-lg font-extrabold mt-1 ${dIsDayPositive ? 'text-teal-900' : 'text-rose-900'}`}>
                    {dIsDayPositive ? '+' : ''}{formatCurrency(dDayChangeAmt)}
                  </p>
                  <p className={`text-[11px] font-bold mt-0.5 ${dIsDayPositive ? 'text-teal-700' : 'text-rose-700'}`}>
                    {dIsDayPositive ? '+' : ''}{dDayChangePct.toFixed(2)}% today
                  </p>
                </div>
              </div>

              {/* Fund Deep-Dive Metrics Grid */}
              <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  Portfolio Details & Execution Stats
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 font-medium text-[11px]">Avg Purchase NAV</span>
                    <p className="font-bold text-gray-900 mt-0.5 font-mono">₹{dAvgNav.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 font-medium text-[11px]">Live AMFI NAV</span>
                    <p className="font-bold text-emerald-700 mt-0.5 font-mono">₹{dNav.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 font-medium text-[11px]">Started On</span>
                    <p className="font-semibold text-gray-800 mt-0.5 font-mono">{formatDate(currentSip.start_date)}</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 font-medium text-[11px]">Next Due Date</span>
                    <p className="font-bold text-blue-700 mt-0.5 font-mono">{formatDate(currentSip.next_due_date)}</p>
                  </div>
                </div>
              </div>

              {/* Wealth Compounding Trajectory (1Y, 3Y, 5Y Projections) */}
              <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/70 to-purple-50/70 border border-blue-200/80 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                      Future Compounding Projections (14% CAGR Expected)
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Estimated future portfolio value combining current accumulated units + ongoing {formatCurrency(currentSip.amount)} monthly inflow.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">In 1 Year</span>
                    <p className="text-base font-extrabold text-gray-900 mt-0.5">{formatCurrency(fv1Yr)}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">+{formatCurrency(fv1Yr - dInvested - (pMonthly * 12))} estimated gain</p>
                  </div>
                  <div className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-indigo-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">In 3 Years</span>
                    <p className="text-base font-extrabold text-indigo-950 mt-0.5">{formatCurrency(fv3Yr)}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">+{formatCurrency(fv3Yr - dInvested - (pMonthly * 36))} estimated gain</p>
                  </div>
                  <div className="p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">In 5 Years</span>
                    <p className="text-base font-extrabold text-purple-950 mt-0.5">{formatCurrency(fv5Yr)}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">+{formatCurrency(fv5Yr - dInvested - (pMonthly * 60))} estimated gain</p>
                  </div>
                </div>
              </div>

              {/* Complete Payment & Top-Up History Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Transaction & Payment History ({history.length})
                  </h4>
                  <button
                    onClick={() => handleOpenTopUp(currentSip)}
                    className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    Add One-Time Top-Up
                  </button>
                </div>

                {histLoading ? (
                  <LoadingSpinner text="Loading payment records..." />
                ) : history.length === 0 ? (
                  <div className="p-6 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
                    <p className="text-xs text-gray-500 font-medium">No recorded transactions for this scheme yet.</p>
                    <div className="flex justify-center gap-2 mt-3">
                      <button
                        onClick={async () => {
                          await handleMarkPaid(currentSip.id)
                          await fetchHistory(currentSip)
                        }}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        ✓ Mark First Installment Paid
                      </button>
                      <button
                        onClick={() => handleOpenTopUp(currentSip)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        ➕ Add Top-Up
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {history.map((p, idx) => {
                      const isTopUp = p.payment_type === 'top_up' || p.notes?.toLowerCase().includes('top-up')
                      return (
                        <div
                          key={p.id || idx}
                          className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs hover:border-blue-300 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isTopUp
                                  ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}
                            >
                              {isTopUp ? <Zap className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isTopUp
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isTopUp ? '⚡ One-Time Top-Up' : '📅 Regular SIP Installment'}
                                </span>
                                {p.payment_method && (
                                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                    • {p.payment_method}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="font-semibold text-gray-800">
                                  {p.paid_on ? formatDateTime(p.paid_on) : 'Today'}
                                </span>
                              </div>

                              {p.notes && (
                                <p className="text-[11px] text-gray-500 mt-0.5 truncate italic">"{p.notes}"</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <p className="font-extrabold text-gray-900 text-sm">{formatCurrency(p.amount)}</p>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditPayment(p)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit payment"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDelPayTarget(p)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                                title="Delete payment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap gap-2.5 pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleOpenTopUp(currentSip)
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  One-Time Top-Up
                </button>
                <button
                  onClick={async () => {
                    await handleMarkPaid(currentSip.id)
                    await fetchHistory(currentSip)
                  }}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Paid & Buy Units
                </button>
                <button
                  onClick={() => {
                    openEdit(currentSip)
                    setDetailsTarget(null)
                  }}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit SIP Schedule
                </button>
                <button
                  onClick={() => setDetailsTarget(null)}
                  className="btn-secondary text-xs py-2 px-4 ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!delPayTarget}
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment record? This action will remove the entry from your history."
        confirmText="Delete"
        loading={deletingPay}
        onConfirm={handleDeletePayment}
        onCancel={() => setDelPayTarget(null)}
      />
    </Layout>
  )
}

