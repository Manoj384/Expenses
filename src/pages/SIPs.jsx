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
import { parseGrowwExcel, parseGrowwCsv } from '../utils/growwParser'
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
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react'

const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly']
const STANDARD_PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI (GPay / PhonePe / Paytm)' },
  { id: 'netbanking', name: 'Net Banking (IMPS / NEFT)' },
  { id: 'salary_account', name: 'Salary Account Transfer' },
  { id: 'debit_card', name: 'Debit Card' },
  { id: 'cash', name: 'Cash / Manual Deposit' },
]

import { getSchemeGroupKey, aggregateMatchingMutualFunds } from '../features/sips/utils/sipCalculations'
import SipTopUpModal from '../features/sips/components/SipTopUpModal'
import SipDetailsModal from '../features/sips/components/SipDetailsModal'
import SipImportModal from '../features/sips/components/SipImportModal'

const emptyForm = { name: '', amount: '', frequency: 'monthly', start_date: today(), fund_id: '' }

// Atomically credits units bought to a single target folio without double-counting aggregated folios
async function creditUnitsToPortfolio({
  schemeName,
  folioNumber,
  amount,
  user,
  currentMutualFunds,
  setMutualFundsState,
}) {
  const amt = Number(amount)
  if (!amt || amt <= 0) return

  let currentList = currentMutualFunds && currentMutualFunds.length > 0
    ? [...currentMutualFunds]
    : enrichFundsWithCachedNavs(savedGrowwData)

  const groupKey = getSchemeGroupKey(schemeName)
  const normSip = (schemeName || '').toLowerCase().trim()
  const firstWord = normSip.split(/\s+/)[0]

  // Find target individual folio (not aggregated)
  let targetIndex = currentList.findIndex((m) => {
    if (folioNumber && m.folio_number && String(m.folio_number) === String(folioNumber)) return true
    return false
  })

  if (targetIndex === -1) {
    targetIndex = currentList.findIndex((m) => {
      const mfKey = getSchemeGroupKey(m.scheme_name)
      if (mfKey && groupKey && mfKey === groupKey) return true
      const normMf = (m.scheme_name || '').toLowerCase().trim()
      if (normMf.includes(normSip) || normSip.includes(normMf)) return true
      if (firstWord && normMf.startsWith(firstWord)) return true
      return false
    })
  }

  const liveNav = targetIndex >= 0
    ? Number(currentList[targetIndex].current_nav || currentList[targetIndex].avg_nav || 100)
    : 100

  const unitsBought = liveNav > 0 ? parseFloat((amt / liveNav).toFixed(3)) : 0

  let updatedList = []
  if (targetIndex >= 0) {
    const existing = currentList[targetIndex]
    const newUnits = parseFloat((Number(existing.units || 0) + unitsBought).toFixed(3))
    const newInvested = parseFloat((Number(existing.invested_amount || 0) + amt).toFixed(2))
    const newCurrentVal = parseFloat((newUnits * liveNav).toFixed(2))
    const newAvgNav = newUnits > 0 ? parseFloat((newInvested / newUnits).toFixed(4)) : liveNav

    const updatedHolding = {
      ...existing,
      units: newUnits,
      invested_amount: newInvested,
      current_value: newCurrentVal,
      avg_nav: newAvgNav,
      current_nav: liveNav,
      last_updated: new Date().toISOString(),
    }

    updatedList = currentList.map((m, idx) => (idx === targetIndex ? updatedHolding : m))

    if (user && existing.id && !String(existing.id).startsWith('mf_') && !String(existing.id).startsWith('seed_')) {
      try {
        await supabase
          .from('mutual_funds')
          .update({
            units: newUnits,
            invested_amount: newInvested,
            current_value: newCurrentVal,
            avg_nav: newAvgNav,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } catch (err) {
        console.warn('Supabase MF update error:', err)
      }
    }
  } else {
    // New holding entry
    const newHolding = {
      id: `mf_${Date.now()}`,
      user_id: user?.id || null,
      scheme_name: schemeName,
      fund_house: `${schemeName.split(' ')[0]} Mutual Fund`,
      category: 'Equity',
      folio_number: folioNumber || `FOLIO-${Date.now().toString().slice(-6)}`,
      units: unitsBought,
      invested_amount: amt,
      current_nav: liveNav,
      avg_nav: liveNav,
      current_value: parseFloat((unitsBought * liveNav).toFixed(2)),
      last_updated: new Date().toISOString(),
    }
    updatedList = [newHolding, ...currentList]

    if (user) {
      try {
        const { data: insData } = await supabase
          .from('mutual_funds')
          .insert({
            user_id: user.id,
            scheme_name: schemeName,
            fund_house: newHolding.fund_house,
            category: 'Equity',
            folio_number: newHolding.folio_number,
            units: unitsBought,
            invested_amount: amt,
            current_nav: liveNav,
            avg_nav: liveNav,
            current_value: newHolding.current_value,
            last_updated: new Date().toISOString(),
          })
          .select('*')
        if (insData && insData[0]) {
          updatedList[0] = insData[0]
        }
      } catch (err) {
        console.warn('Supabase MF insert error:', err)
      }
    }
  }

  try {
    localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(updatedList))
  } catch {}

  if (setMutualFundsState) {
    setMutualFundsState(enrichFundsWithCachedNavs(updatedList))
  }

  window.dispatchEvent(new CustomEvent('mutual-funds-updated'))
  window.dispatchEvent(new CustomEvent('transaction-updated'))

  return updatedList
}

export default function SIPs() {
  const { user } = useAuth()
  const [sips, setSips] = useState([])
  const [mutualFunds, setMutualFunds] = useState(() => {
    try {
      const cached = localStorage.getItem('ft_cached_mutual_funds')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length >= savedGrowwData.length) {
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

  // Excel / CSV Import & Export State
  const [showImportModal, setShowImportModal] = useState(false)
  const [parsedPreview, setParsedPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Handle Excel (.xlsx) or CSV file upload from Groww / Broker
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const parsed = await parseGrowwExcel(buffer)
        if (parsed.length > 0) {
          setParsedPreview(parsed)
          flash(`✅ Found ${parsed.length} mutual fund holdings in Excel!`)
        } else {
          setError('Could not extract holdings from Excel file. Please ensure it is a valid Groww report.')
        }
      } else {
        const text = await file.text()
        const parsed = parseGrowwCsv(text)
        if (parsed.length > 0) {
          setParsedPreview(parsed)
          flash(`✅ Found ${parsed.length} mutual fund holdings in CSV!`)
        } else {
          setError('Could not parse CSV file.')
        }
      }
    } catch (err) {
      console.error('File parsing error:', err)
      setError('Failed to process file. Please ensure it is a valid Groww Excel / CSV report.')
    }
  }

  // Execute Excel Import into Portfolio & SIPs
  const handleExecuteImport = async () => {
    if (parsedPreview.length === 0) return
    setImporting(true)
    try {
      const enriched = enrichFundsWithCachedNavs(parsedPreview)

      // Save to localStorage immediately
      localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(enriched))
      setMutualFunds(enriched)

      // If user is logged in, sync to Supabase mutual_funds
      if (user) {
        const payload = enriched.map((h) => ({
          user_id: user.id,
          scheme_name: h.scheme_name,
          fund_house: h.fund_house || null,
          category: h.category || 'Equity',
          folio_number: h.folio_number || null,
          units: parseFloat(h.units) || 0,
          avg_nav: parseFloat(h.avg_nav) || 0,
          invested_amount: parseFloat(h.invested_amount) || 0,
          current_nav: parseFloat(h.current_nav) || 0,
          current_value: parseFloat(h.current_value) || 0,
          last_updated: new Date().toISOString(),
        }))

        await supabase.from('mutual_funds').delete().eq('user_id', user.id)
        await supabase.from('mutual_funds').insert(payload)
      }

      window.dispatchEvent(new CustomEvent('mutual-funds-updated'))
      window.dispatchEvent(new CustomEvent('transaction-updated'))

      flash(`🎉 Successfully imported ${parsedPreview.length} fund folios from Excel! Portfolio & SIPs updated!`)
      setShowImportModal(false)
      setParsedPreview([])
      await fetchSipsAndFunds()
    } catch (err) {
      console.error('Import execution error:', err)
      setError('Failed to import holdings. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  // Export SIPs & Portfolio to Excel (.xlsx)
  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      // Sheet 1: SIP Overview
      const sipRows = displaySips.map((s) => ({
        'SIP Name': s.name,
        'Frequency': s.frequency?.toUpperCase() || 'MONTHLY',
        'Installment Amount (₹)': s.amount,
        'Started On': s.start_date,
        'Next Due Date': s.next_due_date,
        'Status': s.active ? 'ACTIVE' : 'PAUSED',
        'Units Held': s.mutual_funds?.units || 0,
        'Total Invested (₹)': s.mutual_funds?.invested_amount || 0,
        'Current Value (₹)': s.mutual_funds?.current_value || 0,
        'Total Profit (₹)': s.mutual_funds?.returns || 0,
        'Folio(s)': s.mutual_funds?.folio_number || '—',
      }))
      const wsSips = XLSX.utils.json_to_sheet(sipRows)
      XLSX.utils.book_append_sheet(wb, wsSips, 'SIP Overview')

      // Sheet 2: Mutual Fund Holdings
      const activeMfList = mutualFunds.length > 0 ? mutualFunds : savedGrowwData
      const mfRows = activeMfList.map((m) => ({
        'Scheme Name': m.scheme_name,
        'Fund House': m.fund_house || '—',
        'Category': m.category || 'Equity',
        'Folio Number': m.folio_number || '—',
        'Units': m.units,
        'Average NAV (₹)': m.avg_nav,
        'Total Invested (₹)': m.invested_amount,
        'Current Live NAV (₹)': m.current_nav,
        'Current Valuation (₹)': m.current_value,
        'Returns (₹)': (Number(m.current_value || 0) - Number(m.invested_amount || 0)).toFixed(2),
        'XIRR': m.xirr || '—',
      }))
      const wsMf = XLSX.utils.json_to_sheet(mfRows)
      XLSX.utils.book_append_sheet(wb, wsMf, 'Mutual Fund Holdings')

      // Sheet 3: Payment History Log
      const localPayments = getCachedPayments(null, null, [])
      if (localPayments.length > 0) {
        const histRows = localPayments.map((p) => ({
          'Date & Time': p.paid_on ? formatDateTime(p.paid_on) : '—',
          'Scheme Name': p.sip_name || '—',
          'Type': p.payment_type === 'top_up' ? 'One-Time Top-Up' : 'Regular Installment',
          'Amount (₹)': p.amount,
          'Payment Method': p.payment_method || 'UPI',
          'Notes': p.notes || '',
        }))
        const wsHist = XLSX.utils.json_to_sheet(histRows)
        XLSX.utils.book_append_sheet(wb, wsHist, 'Payment & Top-Up History')
      }

      XLSX.writeFile(wb, `Groww_SIP_Portfolio_Report_${today()}.xlsx`)
      flash('📊 Excel report downloaded successfully!')
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to export Excel report.')
    } finally {
      setExporting(false)
    }
  }

  const fetchSipsAndFunds = useCallback(async () => {
    if (!user) {
      try {
        const cached = localStorage.getItem('ft_cached_sips')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSips(parsed)
          }
        }
      } catch {}
      try {
        const cachedMf = localStorage.getItem('ft_cached_mutual_funds')
        if (cachedMf) {
          const parsedMf = JSON.parse(cachedMf)
          if (Array.isArray(parsedMf) && parsedMf.length >= savedGrowwData.length) {
            setMutualFunds(enrichFundsWithCachedNavs(parsedMf))
            return
          }
        }
      } catch {}
      setMutualFunds(enrichFundsWithCachedNavs(savedGrowwData))
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

      let mfsData = mfRes.data || []
      if (mfsData.length < savedGrowwData.length) {
        const existingFolios = new Set(mfsData.map((f) => f.folio_number).filter(Boolean))
        const missingHoldings = savedGrowwData.filter((h) => !existingFolios.has(h.folio_number))
        mfsData = [...mfsData, ...missingHoldings]
      }
      const mfs = enrichFundsWithCachedNavs(mfsData)
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
  let activeMfRaw = mutualFunds.length > 0 ? mutualFunds : savedGrowwData
  if (activeMfRaw.length < savedGrowwData.length) {
    const existingFolios = new Set(activeMfRaw.map((f) => f.folio_number).filter(Boolean))
    const missing = savedGrowwData.filter((h) => !existingFolios.has(h.folio_number))
    activeMfRaw = [...activeMfRaw, ...missing]
  }
  const activeMfList = enrichFundsWithCachedNavs(activeMfRaw)

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
      const targetSip = displaySips.find((s) => s.id === id || (s.mergedSipIds && s.mergedSipIds.includes(id)))
      if (!targetSip) return

      const nextDate = calculateNextDueDate(targetSip.next_due_date || today(), targetSip.frequency || 'monthly')
      const paidOn = new Date().toISOString()

      // 1. Immediately advance local state so UI updates the date with zero delay
      const updatedList = displaySips.map((s) =>
        s.id === targetSip.id ? { ...s, next_due_date: nextDate } : s
      )
      setSips(updatedList)
      try {
        localStorage.setItem('ft_cached_sips', JSON.stringify(updatedList))
      } catch {}

      // Log to local cache immediately so history updates instantly in UI
      const newPayRecord = {
        id: `p_${Date.now()}`,
        sip_id: targetSip.id,
        sip_name: targetSip.name,
        amount: targetSip.amount,
        paid_on: paidOn,
        payment_type: 'installment',
        payment_method: 'UPI (Auto-Debit)',
        notes: 'Regular Monthly SIP Installment',
      }
      saveCachedPayment(newPayRecord)
      setHistory((prev) => [newPayRecord, ...prev])

      // 2. Credit Units into Target Mutual Fund Folio (both guest & authenticated modes)
      await creditUnitsToPortfolio({
        schemeName: targetSip.name,
        folioNumber: targetSip.folio_number,
        amount: targetSip.amount,
        user,
        currentMutualFunds: mutualFunds,
        setMutualFundsState: setMutualFunds,
      })

      if (user) {
        let realSipId = targetSip.id

        // If this SIP was an un-persisted preset, insert it to get a real database ID
        if (String(realSipId).startsWith('sip_')) {
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
          await supabase.from('sips').update({ next_due_date: nextDate }).eq('id', targetSip.id)
        }

        // 3. Log payment in sip_payments
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

        // 4. Log expense transaction in transactions table
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
          type: 'savings',
          amount: targetSip.amount,
          date: today(),
          note: `SIP Investment: ${targetSip.name}`,
          category_id: matchedCatId,
          payment_method_id: matchedPmId,
        })
      }

      flash(`✅ SIP of ${formatCurrency(targetSip.amount)} marked paid! Units credited to ${targetSip.name} portfolio!`)
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
      const selectedMethodName = STANDARD_PAYMENT_METHODS.find(p => p.id === topUpForm.payment_method)?.name || topUpForm.payment_method

      // 1. Credit units to mutual funds portfolio (in both guest & authenticated modes)
      await creditUnitsToPortfolio({
        schemeName: topUpTarget.name,
        folioNumber: topUpTarget.folio_number,
        amount: amt,
        user,
        currentMutualFunds: mutualFunds,
        setMutualFundsState: setMutualFunds,
      })

      // 2. Save to local payment cache immediately so Top-Up appears instantly in History
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

      // 3. Insert into Supabase if user is logged in
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

        // Insert transaction
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
          type: 'savings',
          amount: amt,
          date: paidOn,
          note: `SIP One-Time Top-Up (Investment): ${topUpTarget.name}${topUpForm.notes ? ` (${topUpForm.notes})` : ''}`,
          category_id: matchedCatId,
          payment_method_id: matchedPmId,
        })
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
            <p className="text-xs text-gray-500 uppercase font-semibold">Actions & Excel Sync</p>
            <p className="text-xs text-gray-600 mt-1">Upload Groww Excel report or schedule SIP</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              onClick={() => {
                setForm(emptyForm)
                setEditTarget(null)
                setShowAdd(true)
              }}
              className="btn-primary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add SIP
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
              title="Upload your downloaded Groww Excel or CSV file to sync all folios"
            >
              <Upload className="h-3.5 w-3.5" /> Upload Excel
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5"
              title="Download full Excel report with SIPs, mutual fund folios, and payment history"
            >
              <Download className="h-3.5 w-3.5 text-gray-600" />
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
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
      <SipTopUpModal
        topUpTarget={topUpTarget}
        onClose={() => setTopUpTarget(null)}
        topUpForm={topUpForm}
        setTopUpForm={setTopUpForm}
        handleSaveTopUp={handleSaveTopUp}
        topUpErr={topUpErr}
        topUpSaving={topUpSaving}
        standardPaymentMethods={STANDARD_PAYMENT_METHODS}
      />

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
      <SipDetailsModal
        detailsTarget={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        displaySips={displaySips}
        activeMfList={activeMfList}
        history={history}
        histLoading={histLoading}
        handleOpenTopUp={handleOpenTopUp}
        handleMarkPaid={handleMarkPaid}
        fetchHistory={fetchHistory}
        handleOpenEditPayment={handleOpenEditPayment}
        setDelPayTarget={setDelPayTarget}
        openEdit={openEdit}
      />

      {/* Upload Groww Report (.xlsx / .csv) Modal */}
      <SipImportModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setParsedPreview([])
        }}
        handleFileUpload={handleFileUpload}
        parsedPreview={parsedPreview}
        handleExecuteImport={handleExecuteImport}
        importing={importing}
      />

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

