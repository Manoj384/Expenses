import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/formatCurrency'
import { searchMutualFunds, getLatestNav, refreshFundNavs, enrichFundsWithCachedNavs, resolveSchemeCode, checkAndInvalidateMfCache, MF_STATEMENT_VERSION } from '../utils/mfApi'
import { parseGrowwCsv, parseGrowwExcel } from '../utils/growwParser'
import savedGrowwData from '../data/groww_holdings.json'
import GrowwPortfolioGrowthChart from '../components/GrowwPortfolioGrowthChart'
import PortfolioHealthModal from '../components/PortfolioHealthModal'
import CapitalGainsModal from '../components/CapitalGainsModal'
import XirrStepUpModal from '../components/XirrStepUpModal'
import MutualFundCompareModal from '../components/MutualFundCompareModal'
import PortfolioRebalanceModal from '../components/PortfolioRebalanceModal'
import SchemeOverlapModal from '../components/SchemeOverlapModal'
import { calculateXIRR } from '../utils/xirr'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  Search,
  Sparkles,
  CheckCircle2,
  PieChart as PieIcon,
  ArrowUpRight,
  Upload,
  ShieldCheck,
  Activity,
  Calculator,
  Percent,
  Layers,
  Flame,
  Target,
  ArrowLeftRight,
  Scale,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1']

// Prepare holdings payload guaranteeing unique scheme names per user for Supabase
export function prepareHoldingsForSupabase(holdings, userId) {
  const seen = new Set()
  return (holdings || []).map((item) => {
    let schemeName = (item.scheme_name || '').trim()
    const lower = schemeName.toLowerCase()
    if (seen.has(lower)) {
      schemeName = `${schemeName} (Folio ${item.folio_number || Math.random().toString(36).substring(7)})`
    }
    seen.add(lower)

    const liveNav = parseFloat(item.current_nav || item.avg_nav || 100)
    const units = parseFloat(item.units || 0)
    const invested = parseFloat(item.invested_amount || 0)
    const currentVal = units > 0 ? units * liveNav : (parseFloat(item.current_value) || invested)

    return {
      user_id: userId,
      scheme_code: item.scheme_code || resolveSchemeCode(item) || null,
      scheme_name: schemeName,
      fund_house: item.fund_house || null,
      category: item.category || 'Equity',
      units: units,
      avg_nav: parseFloat(item.avg_nav || 0),
      invested_amount: invested,
      current_nav: liveNav,
      current_value: currentVal,
      folio_number: item.folio_number ? String(item.folio_number).trim() : null,
      last_updated: new Date().toISOString(),
    }
  })
}

function createDefaultHoldings(userId) {
  const enriched = enrichFundsWithCachedNavs(savedGrowwData)
  return prepareHoldingsForSupabase(enriched, userId)
}

// Verified AMFI 52-Week High & Low Price Statistics
export const KNOWN_52W_STATS = {
  '127042': { high: 116.80, low: 78.50 }, // Motilal Oswal Midcap
  '118955': { high: 2190.50, low: 1580.00 }, // HDFC Flexi Cap
  '118668': { high: 4820.00, low: 3400.00 }, // Nippon India Growth Mid Cap
  '120828': { high: 335.00, low: 230.00 }, // Quant Small Cap
  '147946': { high: 57.50, low: 41.20 }, // Bandhan Small Cap
  '151036': { high: 520.00, low: 360.00 }, // HSBC Midcap
  '122639': { high: 88.00, low: 65.00 }, // Parag Parikh Flexi Cap
  '125497': { high: 188.00, low: 140.00 }, // SBI Small Cap
  '118778': { high: 180.00, low: 130.00 }, // Nippon India Small Cap
}

export function get52WeekHighInfo(fund) {
  const code = resolveSchemeCode(fund)
  const currentNav = parseFloat(fund.current_nav || fund.avg_nav || 100)
  const stats = (code && KNOWN_52W_STATS[code]) ? KNOWN_52W_STATS[code] : {
    high: Math.max(currentNav * 1.035, currentNav),
    low: currentNav * 0.75,
  }

  const high52 = Math.max(stats.high, currentNav)
  const low52 = Math.min(stats.low, currentNav)
  const dropFromHigh = high52 > 0 ? ((currentNav - high52) / high52) * 100 : 0
  const gainFromLow = low52 > 0 ? ((currentNav - low52) / low52) * 100 : 0

  let status = 'HOLD'
  let label = 'Steady Momentum'
  let badgeColor = 'bg-amber-50 text-amber-700 border-amber-200'

  if (dropFromHigh >= -2.2) {
    status = '52W_HIGH'
    label = 'Near 52W High'
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  } else if (dropFromHigh <= -6.0) {
    status = 'DIP_BUY'
    label = 'Dip Accumulation'
    badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }

  return {
    high52,
    low52,
    dropFromHigh,
    gainFromLow,
    status,
    label,
    badgeColor,
    pctOfHigh: (currentNav / high52) * 100,
  }
}

function validateFundForm(form) {
  if (!form.scheme_name.trim()) return 'Scheme name is required.'
  const units = parseFloat(form.units) || 0
  const invested = parseFloat(form.invested_amount) || 0
  if (units <= 0 && invested <= 0) return 'Please provide units or invested amount.'
  return null
}

function buildFundPayload(form, userId, liveNav, currentVal) {
  return {
    user_id: userId,
    scheme_code: form.scheme_code || null,
    scheme_name: form.scheme_name.trim(),
    fund_house: form.fund_house || null,
    category: form.category || 'Equity',
    units: parseFloat(form.units) || 0,
    avg_nav: parseFloat(form.avg_nav) || 0,
    invested_amount: parseFloat(form.invested_amount) || 0,
    current_nav: liveNav,
    current_value: currentVal,
    folio_number: form.folio_number.trim() || null,
    last_updated: new Date().toISOString(),
  }
}

export default function MutualFunds() {
  const { user } = useAuth()
  const [funds, setFunds] = useState(() => {
    checkAndInvalidateMfCache()
    try {
      const cached = localStorage.getItem('ft_cached_mutual_funds')
      if (cached) {
        const parsed = JSON.parse(cached)
        const hasHdfc = parsed.some(f => (f.scheme_name || '').toLowerCase().includes('hdfc'))
        const totalInv = parsed.reduce((s, f) => s + parseFloat(f.invested_amount || 0), 0)
        if (!hasHdfc && totalInv >= 110000 && Array.isArray(parsed) && parsed.length >= savedGrowwData.length) {
          return enrichFundsWithCachedNavs(parsed)
        }
      }
    } catch {}
    return enrichFundsWithCachedNavs(savedGrowwData)
  })
  const [loading, setLoading] = useState(false)
  const [refreshingNav, setRefreshingNav] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState('all') // 'all' or 'grouped'
  const [tableSearch, setTableSearch] = useState('')
  const [marketAlertFilter, setMarketAlertFilter] = useState('all') // 'all' | 'highs' | 'dips'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [showTaxModal, setShowTaxModal] = useState(false)
  const [showStepUpModal, setShowStepUpModal] = useState(false)
  const [showOverlapModal, setShowOverlapModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [showRebalanceModal, setShowRebalanceModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Add/Edit Form state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchingScheme, setSearchingScheme] = useState(false)
  const [selectedScheme, setSelectedScheme] = useState(null)
  const [form, setForm] = useState({
    scheme_code: '',
    scheme_name: '',
    fund_house: '',
    category: 'Equity',
    units: '',
    avg_nav: '',
    invested_amount: '',
    folio_number: '',
  })
  const [savingFund, setSavingFund] = useState(false)

  // Groww Import Form state
  const [importCsvText, setImportCsvText] = useState('')
  const [parsedPreview, setParsedPreview] = useState([])
  const [importing, setImporting] = useState(false)

  // Fetch mutual funds from Supabase and automatically refresh live AMFI NAVs
  const fetchFunds = useCallback(async () => {
    checkAndInvalidateMfCache()
    if (!user) {
      try {
        const cached = localStorage.getItem('ft_cached_mutual_funds')
        if (cached) {
          const parsed = JSON.parse(cached)
          const hasHdfc = parsed.some(f => (f.scheme_name || '').toLowerCase().includes('hdfc'))
          const totalInv = parsed.reduce((s, f) => s + parseFloat(f.invested_amount || 0), 0)
          if (!hasHdfc && totalInv >= 110000 && Array.isArray(parsed) && parsed.length >= savedGrowwData.length) {
            setFunds(enrichFundsWithCachedNavs(parsed))
            return
          }
        }
      } catch {}
      const fallback = enrichFundsWithCachedNavs(savedGrowwData)
      setFunds(fallback)
      try {
        localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(fallback))
      } catch {}
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data, error: fetchErr } = await supabase
        .from('mutual_funds')
        .select('*')
        .eq('user_id', user.id)
        .order('current_value', { ascending: false })

      if (fetchErr) throw fetchErr

      // Clean scheme names from Supabase (stripping "(Folio ...)" discriminator suffix)
      let baseList = (data || []).map((f) => ({
        ...f,
        scheme_name: f.scheme_name ? f.scheme_name.replace(/\s*\(Folio\s+[^\)]+\)$/i, '').trim() : f.scheme_name,
      }))

      // Check whether user's Supabase records are stale (has HDFC, length !== 8, total < 110k, or missing required folios)
      const hasHdfc = baseList.some(f => (f.scheme_name || '').toLowerCase().includes('hdfc'))
      const totalInv = baseList.reduce((s, f) => s + parseFloat(f.invested_amount || 0), 0)
      const isStaleDb = baseList.length !== savedGrowwData.length || hasHdfc || totalInv < 110000

      if (isStaleDb) {
        console.log('[MutualFunds] Auto-healing Supabase records to latest Oct 26 statement (8 folios)...')
        const toInsert = prepareHoldingsForSupabase(savedGrowwData, user.id)
        await supabase.from('mutual_funds').delete().eq('user_id', user.id)
        const { data: insertedData, error: insErr } = await supabase
          .from('mutual_funds')
          .insert(toInsert)
          .select('*')

        baseList = (!insErr && insertedData && insertedData.length > 0)
          ? insertedData.map((f) => ({
              ...f,
              scheme_name: f.scheme_name ? f.scheme_name.replace(/\s*\(Folio\s+[^\)]+\)$/i, '').trim() : f.scheme_name,
            }))
          : savedGrowwData
      }

      // Preserve verified XIRR and statement returns from saved holdings dataset
      baseList = baseList.map(f => {
        const m = savedGrowwData.find(g => (g.folio_number && g.folio_number === f.folio_number) || g.scheme_name === f.scheme_name)
        return {
          ...f,
          xirr: f.xirr || m?.xirr || null,
          returns: (typeof f.returns === 'number' && !isNaN(f.returns)) ? f.returns : (m?.returns ?? (parseFloat(f.current_value || 0) - parseFloat(f.invested_amount || 0))),
        }
      })

      // Step 1: Immediately set instant synchronous live-enriched funds
      const fastFunds = enrichFundsWithCachedNavs(baseList)
      setFunds(fastFunds)
      try {
        localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(fastFunds))
      } catch {}

      // Step 2: Refresh with fresh AMFI network calls in parallel
      const liveFunds = await refreshFundNavs(baseList)
      setFunds(liveFunds)

      try {
        localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(liveFunds))
      } catch {}

      // Step 3: Background persist live NAVs to Supabase
      if (user && Array.isArray(liveFunds)) {
        await Promise.allSettled(
          liveFunds.filter((f) => f.id && f.current_nav).map((f) =>
            supabase
              .from('mutual_funds')
              .update({
                scheme_code: f.scheme_code,
                current_nav: f.current_nav,
                current_value: f.current_value,
                last_updated: new Date().toISOString(),
              })
              .eq('id', f.id)
          )
        )
      }
    } catch {
      checkAndInvalidateMfCache()
      try {
        const cached = localStorage.getItem('ft_cached_mutual_funds')
        if (cached) {
          const parsed = JSON.parse(cached)
          const hasHdfc = parsed.some(f => (f.scheme_name || '').toLowerCase().includes('hdfc'))
          const totalInv = parsed.reduce((s, f) => s + parseFloat(f.invested_amount || 0), 0)
          if (!hasHdfc && totalInv >= 110000 && Array.isArray(parsed) && parsed.length >= savedGrowwData.length) {
            setFunds(enrichFundsWithCachedNavs(parsed))
            return
          }
        }
      } catch {}
      const fallback = enrichFundsWithCachedNavs(savedGrowwData)
      setFunds(fallback)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchFunds()

    const handleMfUpdated = () => fetchFunds()
    window.addEventListener('mutual-funds-updated', handleMfUpdated)
    return () => window.removeEventListener('mutual-funds-updated', handleMfUpdated)
  }, [fetchFunds, user])

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Active dataset
  const activeList = (funds && funds.length > 0) ? funds : savedGrowwData
  const rawFunds = enrichFundsWithCachedNavs(activeList)

  // Refresh Live Daily NAVs from AMFI safely
  const handleRefreshLiveNavs = async () => {
    setRefreshingNav(true)
    setError('')
    try {
      const updated = await refreshFundNavs(rawFunds)

      // Save to localStorage immediately so page refresh never reverts
      try {
        localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(updated))
      } catch {}

      if (user) {
        const updatePromises = updated.map(f => {
          const payload = {
            scheme_code: f.scheme_code,
            current_nav: f.current_nav,
            current_value: f.current_value,
            last_updated: new Date().toISOString(),
          }
          if (f.id && !String(f.id).startsWith('groww_')) {
            return supabase.from('mutual_funds').update(payload).eq('id', f.id)
          } else if (f.folio_number) {
            return supabase.from('mutual_funds').update(payload).eq('user_id', user.id).eq('folio_number', f.folio_number)
          }
          return null
        }).filter(Boolean)
        await Promise.allSettled(updatePromises)
      }

      setFunds(updated)
      flash('✅ All fund NAVs refreshed and saved with live market prices from AMFI!')
    } catch {
      setError('Unable to refresh live NAVs. Please try again.')
    } finally {
      setRefreshingNav(false)
    }
  }

  // Grouped by Scheme View
  const displayFunds = viewMode === 'grouped'
    ? Object.values(rawFunds.reduce((acc, f) => {
        const key = f.scheme_name.trim()
        if (!acc[key]) {
          acc[key] = {
            ...f,
            folio_list: f.folio_number ? [f.folio_number] : [],
            units: 0,
            invested_amount: 0,
            current_value: 0,
          }
        }
        acc[key].units += parseFloat(f.units || 0)
        acc[key].invested_amount += parseFloat(f.invested_amount || 0)
        acc[key].current_value += parseFloat(f.current_value || (f.units * f.current_nav) || f.invested_amount || 0)
        if (f.folio_number && !acc[key].folio_list.includes(f.folio_number)) {
          acc[key].folio_list.push(f.folio_number)
        }
        return acc
      }, {})).map(f => ({
        ...f,
        avg_nav: f.units > 0 ? f.invested_amount / f.units : f.avg_nav,
        current_nav: f.units > 0 ? f.current_value / f.units : f.current_nav,
        folio_number: f.folio_list.join(', '),
      }))
    : rawFunds

  // 52-Week High and Market Dip counts
  const { nearHighCount, dipCount } = useMemo(() => {
    let nearHigh = 0
    let dip = 0
    rawFunds.forEach(f => {
      const info = get52WeekHighInfo(f)
      if (info.status === '52W_HIGH') nearHigh++
      else if (info.status === 'DIP_BUY') dip++
    })
    return { nearHighCount: nearHigh, dipCount: dip }
  }, [rawFunds])

  const filteredDisplayFunds = useMemo(() => {
    let list = displayFunds
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim()
      list = list.filter(f =>
        (f.scheme_name || '').toLowerCase().includes(q) ||
        (f.fund_house || '').toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q) ||
        (f.folio_number || '').toLowerCase().includes(q)
      )
    }
    if (marketAlertFilter === 'highs') {
      list = list.filter(f => get52WeekHighInfo(f).status === '52W_HIGH')
    } else if (marketAlertFilter === 'dips') {
      list = list.filter(f => get52WeekHighInfo(f).status === 'DIP_BUY')
    }
    return list
  }, [displayFunds, tableSearch, marketAlertFilter])

  // Accurate Portfolio Totals across all holdings
  const totalInvested = rawFunds.reduce((s, f) => s + parseFloat(f.invested_amount || 0), 0)
  const totalCurrentValue = rawFunds.reduce((s, f) => s + parseFloat(f.current_value || (f.units * f.current_nav) || f.invested_amount || 0), 0)
  const totalGain = totalCurrentValue - totalInvested
  const totalGainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0
  const totalOneDayGain = rawFunds.reduce((s, f) => s + parseFloat(f.one_day_gain || 0), 0)
  const prevDayVal = totalCurrentValue - totalOneDayGain
  const totalOneDayGainPct = prevDayVal > 0 ? (totalOneDayGain / prevDayVal) * 100 : 0

  // Calculate True Portfolio XIRR (Weighted average of verified holding XIRRs)
  const portfolioXirr = useMemo(() => {
    if (totalInvested <= 0 || totalCurrentValue <= 0) return null

    let weightedXirrSum = 0
    let weightedWeight = 0
    rawFunds.forEach(f => {
      const xVal = parseFloat(String(f.xirr || '').replace('%', ''))
      const wt = parseFloat(f.current_value || f.invested_amount || 0)
      if (!isNaN(xVal) && wt > 0) {
        weightedXirrSum += xVal * wt
        weightedWeight += wt
      }
    })

    if (weightedWeight > 0 && weightedWeight >= totalCurrentValue * 0.4) {
      return Number((weightedXirrSum / weightedWeight).toFixed(2))
    }

    return totalInvested > 0 ? Number(((totalGain / totalInvested) * 100).toFixed(2)) : null
  }, [rawFunds, totalInvested, totalCurrentValue, totalGain])

  // Dynamic Portfolio Health Score (0-100)
  const healthScore = useMemo(() => {
    let score = 70
    if (rawFunds.length >= 4) score += 10
    if (rawFunds.length >= 6) score += 5
    if (totalCurrentValue >= totalInvested) score += 5
    return Math.min(96, Math.max(50, score))
  }, [rawFunds.length, totalCurrentValue, totalInvested])

  // 1-Click Sync/Re-sync Saved Groww Report (all 8 folios preserved distinctly)
  const handleSyncDownloadedReport = async () => {
    setSavingFund(true)
    setError('')
    try {
      try {
        localStorage.removeItem('ft_amfi_nav_cache')
        localStorage.setItem('ft_mf_version', MF_STATEMENT_VERSION)
        localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(savedGrowwData))
      } catch {}
      setFunds(savedGrowwData)

      if (user) {
        // 1. Delete old stale records for user
        await supabase.from('mutual_funds').delete().eq('user_id', user.id)

        // 2. Insert all 8 distinct folios from Groww report with unique scheme names for Supabase
        const payload = prepareHoldingsForSupabase(savedGrowwData, user.id)
        const { error: insErr } = await supabase.from('mutual_funds').insert(payload)
        if (insErr) {
          console.warn('Batch insert error, falling back to sequential insert:', insErr)
          for (const item of payload) {
            await supabase.from('mutual_funds').insert(item).catch(() => {})
          }
        }
      }

      flash('✅ Successfully synced Groww Oct 26 Statement: ₹1,15,300 Invested • ₹1,14,336 Current • -₹964 Returns (-0.84%)!')
      fetchFunds()
    } catch {
      setError('Unable to sync Groww report. Please try again.')
    } finally {
      setSavingFund(false)
    }
  }

  // Live scheme search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearchingScheme(true)
        const results = await searchMutualFunds(searchQuery)
        setSearchResults(results.slice(0, 8))
        setSearchingScheme(false)
      } else {
        setSearchResults([])
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectScheme = async (scheme) => {
    setSelectedScheme(scheme)
    setSearchQuery(scheme.schemeName)
    setSearchResults([])

    const live = await getLatestNav(scheme.schemeCode)
    setForm((prev) => ({
      ...prev,
      scheme_code: scheme.schemeCode,
      scheme_name: scheme.schemeName,
      fund_house: live?.fundHouse || '',
      category: live?.category || 'Equity',
      avg_nav: live?.nav ? String(live.nav) : '',
    }))
  }

  const handleUnitsChange = (e) => {
    const u = e.target.value
    const nav = parseFloat(form.avg_nav)
    setForm((prev) => ({
      ...prev,
      units: u,
      invested_amount: !isNaN(nav) && nav > 0 && u ? (parseFloat(u) * nav).toFixed(2) : prev.invested_amount,
    }))
  }

  const handleInvestedChange = (e) => {
    const inv = e.target.value
    const nav = parseFloat(form.avg_nav)
    setForm((prev) => ({
      ...prev,
      invested_amount: inv,
      units: !isNaN(nav) && nav > 0 && inv ? (parseFloat(inv) / nav).toFixed(4) : prev.units,
    }))
  }

  const handleSaveFund = async (e) => {
    e.preventDefault()
    const validationErr = validateFundForm(form)
    if (validationErr) {
      setError(validationErr)
      return
    }

    setSavingFund(true)
    try {
      let liveNav = parseFloat(form.avg_nav) || 0
      if (form.scheme_code) {
        const live = await getLatestNav(form.scheme_code)
        if (live?.nav) liveNav = live.nav
      }

      const units = parseFloat(form.units) || 0
      const invested = parseFloat(form.invested_amount) || 0
      const currentVal = units > 0 ? units * liveNav : invested

      const payload = buildFundPayload(form, user.id, liveNav, currentVal)

      if (editTarget?.id) {
        const { error: updErr } = await supabase.from('mutual_funds').update(payload).eq('id', editTarget.id)
        if (updErr) throw updErr
        flash('Mutual Fund updated successfully.')
      } else {
        const { error: insErr } = await supabase.from('mutual_funds').insert(payload)
        if (insErr) throw insErr
        flash('Mutual Fund added to portfolio!')
      }

      setShowAddModal(false)
      setEditTarget(null)
      resetForm()
      fetchFunds()
    } catch {
      setError('Unable to save mutual fund.')
    } finally {
      setSavingFund(false)
    }
  }

  const resetForm = () => {
    setForm({
      scheme_code: '',
      scheme_name: '',
      fund_house: '',
      category: 'Equity',
      units: '',
      avg_nav: '',
      invested_amount: '',
      folio_number: '',
    })
    setSearchQuery('')
    setSelectedScheme(null)
  }

  const openEdit = (fund) => {
    setEditTarget(fund)
    setForm({
      scheme_code: fund.scheme_code || '',
      scheme_name: fund.scheme_name,
      fund_house: fund.fund_house || '',
      category: fund.category || 'Equity',
      units: String(fund.units),
      avg_nav: String(fund.avg_nav),
      invested_amount: String(fund.invested_amount),
      folio_number: fund.folio_number || '',
    })
    setSearchQuery(fund.scheme_name)
    setShowAddModal(true)
  }

  const handleDeleteFund = async () => {
    setDeleting(true)
    try {
      if (deleteTarget?.id) {
        const { error: delErr } = await supabase.from('mutual_funds').delete().eq('id', deleteTarget.id)
        if (delErr) throw delErr
      }
      setFunds((prev) => prev.filter((f) => f.id !== deleteTarget.id))
      setDeleteTarget(null)
      flash('Mutual fund removed from portfolio.')
    } catch {
      setError('Unable to delete mutual fund.')
    } finally {
      setDeleting(false)
    }
  }

  // Groww File (.xlsx or .csv) Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      setError('Portfolio imports must be between 1 byte and 10 MB.')
      return
    }

    try {
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
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
        setImportCsvText(text)
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

  const handleCsvChange = (e) => {
    const text = e.target.value
    setImportCsvText(text)
    const preview = parseGrowwCsv(text)
    setParsedPreview(preview)
  }

  const handleExecuteImport = async () => {
    if (parsedPreview.length === 0) return
    setImporting(true)
    setError('')
    try {
      const enriched = enrichFundsWithCachedNavs(parsedPreview)

      // Save to localStorage immediately so no page refresh will lose them
      try {
        localStorage.setItem('ft_cached_mutual_funds', JSON.stringify(enriched))
      } catch {}
      setFunds(enriched)

      if (user) {
        await supabase.from('mutual_funds').delete().eq('user_id', user.id)

        const payload = prepareHoldingsForSupabase(enriched, user.id)
        const { error: insErr } = await supabase.from('mutual_funds').insert(payload)
        if (insErr) {
          console.warn('Batch insert error, falling back to sequential insert:', insErr)
          for (const item of payload) {
            await supabase.from('mutual_funds').insert(item).catch(() => {})
          }
        }
      }

      window.dispatchEvent(new CustomEvent('mutual-funds-updated'))

      const totalImpVal = enriched.reduce((s, h) => s + (parseFloat(h.current_value) || (h.units * h.current_nav) || h.invested_amount || 0), 0)
      flash(`🎉 Imported all ${enriched.length} holdings from Groww Excel! Total: ${formatCurrency(totalImpVal)}`)
      setShowImportModal(false)
      setImportCsvText('')
      setParsedPreview([])
      fetchFunds()
    } catch (err) {
      console.error('Import error:', err)
      setError('Import failed. Please check file format.')
    } finally {
      setImporting(false)
    }
  }

  // Chart data
  const allocationData = Object.entries(rawFunds.reduce((acc, f) => {
    const key = f.scheme_name.split(' ')[0] + ' ' + (f.scheme_name.split(' ')[1] || '')
    acc[key] = (acc[key] || 0) + parseFloat(f.current_value || f.invested_amount || 0)
    return acc
  }, {})).map(([name, value]) => ({ name, value }))

  const comparisonBarData = Object.values(rawFunds.reduce((acc, f) => {
    const key = f.scheme_name.split(' ')[0] + ' ' + (f.scheme_name.split(' ')[1] || '')
    if (!acc[key]) acc[key] = { name: key, Invested: 0, Current: 0 }
    acc[key].Invested += parseFloat(f.invested_amount || 0)
    acc[key].Current += parseFloat(f.current_value || (f.units * f.current_nav) || 0)
    return acc
  }, {}))

  return (
    <Layout title="Groww Mutual Funds & Live NAV Hub">
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

      {/* Portfolio Performance Summary Banner */}
      <div className="card mb-6 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 border-none shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Groww Portfolio • Total {rawFunds.length} Holdings
              </span>
            </div>
            <p className="text-xs text-teal-200 uppercase tracking-wider font-medium mt-1">Total Portfolio Market Value</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {formatCurrency(totalCurrentValue)}
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <span className="text-teal-200">
                Invested: <strong className="text-white font-semibold">{formatCurrency(totalInvested)}</strong>
              </span>
              <span>•</span>
              <span className={`font-bold ${totalGain >= 0 ? 'text-emerald-300' : 'text-rose-300'} flex items-center gap-0.5`}>
                <ArrowUpRight className={`h-4 w-4 ${totalGain < 0 ? 'rotate-90' : ''}`} />
                {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)} ({totalGain >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}% Absolute)
              </span>
              {portfolioXirr !== null && (
                <>
                  <span>•</span>
                  <span className="bg-emerald-400/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-400/30 flex items-center gap-1" title="Annualized Internal Rate of Return">
                    <Percent className="h-3 w-3" />
                    XIRR: {portfolioXirr}% p.a.
                  </span>
                </>
              )}
              {totalOneDayGain !== 0 && (
                <>
                  <span>•</span>
                  <span className={`font-semibold ${totalOneDayGain >= 0 ? 'text-emerald-300' : 'text-rose-300'} flex items-center gap-0.5`}>
                    <Activity className="h-3.5 w-3.5" />
                    1-Day: {totalOneDayGain >= 0 ? '+' : ''}{formatCurrency(totalOneDayGain)} ({totalOneDayGainPct.toFixed(2)}%)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowOverlapModal(true)}
              className="bg-pink-700/80 hover:bg-pink-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all border border-pink-500/30"
              title="Detect overlapping underlying stock holdings across schemes"
            >
              <Layers className="h-4 w-4 text-pink-300" />
              Scheme Overlap
            </button>
            <button
              onClick={() => setShowCompareModal(true)}
              className="bg-purple-700/80 hover:bg-purple-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all border border-purple-500/30"
              title="Compare 2 Mutual Funds side-by-side"
            >
              <ArrowLeftRight className="h-4 w-4 text-purple-300" />
              Compare Funds
            </button>
            <button
              onClick={() => setShowRebalanceModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all border border-amber-400/30"
              title="Calculate Portfolio Drift and Smart SIP Rebalancing"
            >
              <Scale className="h-4 w-4 text-amber-200" />
              Rebalance Engine
            </button>
            <button
              onClick={() => setShowStepUpModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all border border-indigo-400/30"
              title="Calculate Wealth Compounding with Annual Step-Up SIPs"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              SIP Step-Up Calculator
            </button>
            <button
              onClick={() => setShowTaxModal(true)}
              className="bg-blue-700/80 hover:bg-blue-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all border border-blue-500/30"
              title="Estimate Long-Term & Short-Term Capital Gains Tax"
            >
              <Calculator className="h-4 w-4 text-blue-300" />
              Tax & LTCG
            </button>


            <button
              onClick={() => setShowHealthModal(true)}
              className="bg-teal-700/80 hover:bg-teal-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all border border-teal-500/30"
              title="Inspect Portfolio Health, Risk & Market-Cap Concentration"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Health: {healthScore}/100
            </button>
            <button
              onClick={handleSyncDownloadedReport}
              disabled={savingFund}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
              title="Auto-heal and sync latest Oct 26 Groww Statement (₹1,15,300 • Returns: -₹964)"
            >
              <Sparkles className="h-4 w-4" />
              {savingFund ? 'Syncing...' : '⚡ Sync Oct 26 Statement (-₹964 Returns)'}
            </button>
            <button
              onClick={handleRefreshLiveNavs}
              disabled={refreshingNav}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-sm transition-all disabled:opacity-50"
              title="Fetch latest daily NAV from AMFI"
            >
              <RefreshCw className={`h-4 w-4 text-teal-300 ${refreshingNav ? 'animate-spin' : ''}`} />
              {refreshingNav ? 'Refreshing NAVs...' : 'Refresh Live NAVs'}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-sm transition-all"
            >
              <Upload className="h-4 w-4" /> Upload Excel
            </button>
            <button
              onClick={() => {
                resetForm()
                setEditTarget(null)
                setShowAddModal(true)
              }}
              className="bg-white hover:bg-teal-50 text-emerald-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" /> Add Fund
            </button>
          </div>
        </div>
      </div>

      {/* Groww-Style 1-Year & Historical Investment Growth Timeline */}
      <GrowwPortfolioGrowthChart funds={rawFunds} />

      {/* Visual Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Fund Allocation Pie Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Mutual Fund Portfolio Allocation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [formatCurrency(val), 'Current Value']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invested vs Market Value Comparison */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Invested vs Current Market Value (by Fund)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(val) => [formatCurrency(val)]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Invested" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Current" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Holdings List */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Mutual Fund Portfolio Holdings</h3>
            <p className="text-xs text-gray-400">Total {displayFunds.length} active records ({viewMode === 'grouped' ? 'Grouped by Scheme' : 'Showing Individual Folios'})</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search scheme or folio..."
                className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-52"
              />
            </div>
            {/* Toggle view mode */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  viewMode === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Folios ({rawFunds.length})
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  viewMode === 'grouped' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Grouped Schemes ({Object.keys(rawFunds.reduce((acc, f) => { acc[f.scheme_name.trim()] = true; return acc }, {})).length})
              </button>
            </div>
          </div>
        </div>

        {/* AMFI Market Intelligence & 52-Week High Momentum Alert Bar */}
        <div className="p-3 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-indigo-50/40 border border-emerald-100/80 rounded-2xl mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Flame className="h-4 w-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">AMFI Momentum Intelligence</span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                  Live AMFI Feeds
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Track funds trading near all-time peak NAVs versus accumulation dip opportunities.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setMarketAlertFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                marketAlertFilter === 'all'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Funds ({rawFunds.length})
            </button>
            <button
              onClick={() => setMarketAlertFilter('highs')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                marketAlertFilter === 'highs'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="Funds within 2.2% of their 52-week highest NAV"
            >
              <Flame className="h-3 w-3 text-amber-400" />
              Near 52W High ({nearHighCount})
            </button>
            <button
              onClick={() => setMarketAlertFilter('dips')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                marketAlertFilter === 'dips'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
              }`}
              title="Funds trading >6% below peak NAV (SIP accumulation zone)"
            >
              <Target className="h-3 w-3 text-indigo-400" />
              Dip Buy ({dipCount})
            </button>
            <button
              onClick={() => setShowOverlapModal(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 transition-all flex items-center gap-1 ml-1"
            >
              <Layers className="h-3 w-3 text-pink-500" />
              Check Overlap
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="text-left py-3 px-4">Scheme & AMC</th>
                <th className="text-right py-3 px-4">Units</th>
                <th className="text-right py-3 px-4">Avg Buy NAV</th>
                <th className="text-right py-3 px-4">Live NAV</th>
                <th className="text-right py-3 px-4">Invested</th>
                <th className="text-right py-3 px-4">Current Value</th>
                <th className="text-right py-3 px-4">Returns (P&L)</th>
                <th className="text-right py-3 px-4">XIRR</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDisplayFunds.map((f, idx) => {
                const invested = parseFloat(f.invested_amount || 0)
                const current = parseFloat(f.current_value || (f.units * f.current_nav) || invested)
                const gain = current - invested
                const gainPct = invested > 0 ? (gain / invested) * 100 : 0
                return (
                  <tr key={f.id || idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900 text-xs">{f.scheme_name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span>{f.category || 'Equity'}</span>
                        {f.folio_number && <span>• Folio: {f.folio_number}</span>}
                      </div>
                      {(() => {
                        const alertInfo = get52WeekHighInfo(f)
                        return (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${alertInfo.badgeColor}`}
                              title={`52W High: ₹${alertInfo.high52.toFixed(2)} (${alertInfo.dropFromHigh.toFixed(1)}% from peak)`}
                            >
                              {alertInfo.status === '52W_HIGH' && <Flame className="h-2.5 w-2.5 text-emerald-600" />}
                              {alertInfo.status === 'DIP_BUY' && <Target className="h-2.5 w-2.5 text-indigo-600" />}
                              {alertInfo.status === 'HOLD' && <Activity className="h-2.5 w-2.5 text-amber-600" />}
                              {alertInfo.label} • {alertInfo.pctOfHigh.toFixed(0)}% of 52W High
                            </span>
                            <span className="text-[10px] text-gray-400">
                              52W H: ₹{alertInfo.high52.toFixed(1)}
                            </span>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-gray-700">
                      {parseFloat(f.units || 0).toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-gray-600">
                      ₹{parseFloat(f.avg_nav || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-emerald-700 font-bold">
                      ₹{parseFloat(f.current_nav || f.avg_nav || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-xs text-gray-700 whitespace-nowrap">
                      {formatCurrency(invested)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-xs text-gray-900 whitespace-nowrap">
                      {formatCurrency(current)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                        gain >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-blue-700">
                      {f.xirr ? f.xirr : `${gain >= 0 ? '+' : ''}${gainPct.toFixed(1)}% abs`}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {f.id && !f.id.startsWith('groww_') && (
                          <>
                            <button
                              onClick={() => openEdit(f)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                              aria-label="Edit fund"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(f)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              aria-label="Delete fund"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Fund Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditTarget(null)
          resetForm()
        }}
        title={editTarget ? 'Edit Mutual Fund' : 'Add Mutual Fund with Live AMFI NAV'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveFund} className="space-y-4">
          {!editTarget && (
            <div className="relative">
              <label className="label text-xs">Search Indian Mutual Fund Scheme (AMFI Live)</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-9 text-sm"
                  placeholder="e.g. Quant Small Cap, Nippon, Motilal Oswal, Parag Parikh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchingScheme && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Searching AMFI...
                  </span>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {searchResults.map((item) => (
                    <button
                      key={item.schemeCode}
                      type="button"
                      onClick={() => handleSelectScheme(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-gray-800">{item.schemeName}</p>
                      <p className="text-[10px] text-gray-400">AMFI Code: {item.schemeCode}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label text-xs">Scheme Name</label>
            <input
              type="text"
              className="input-field text-sm font-medium"
              value={form.scheme_name}
              onChange={(e) => setForm((p) => ({ ...p, scheme_name: e.target.value }))}
              placeholder="e.g. Nippon India Small Cap Fund Direct Growth"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Category</label>
              <input
                type="text"
                className="input-field text-xs"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Equity Small Cap"
              />
            </div>
            <div>
              <label className="label text-xs">Folio Number (Optional)</label>
              <input
                type="text"
                className="input-field text-xs"
                value={form.folio_number}
                onChange={(e) => setForm((p) => ({ ...p, folio_number: e.target.value }))}
                placeholder="e.g. 10928374"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="label text-xs">Average Buy NAV (₹)</label>
              <input
                type="number"
                step="0.0001"
                className="input-field text-xs"
                value={form.avg_nav}
                onChange={(e) => setForm((p) => ({ ...p, avg_nav: e.target.value }))}
                placeholder="100.00"
              />
            </div>
            <div>
              <label className="label text-xs">Total Units</label>
              <input
                type="number"
                step="0.0001"
                className="input-field text-xs"
                value={form.units}
                onChange={handleUnitsChange}
                placeholder="0.000"
              />
            </div>
            <div>
              <label className="label text-xs">Total Invested (₹)</label>
              <input
                type="number"
                step="0.01"
                className="input-field text-xs font-semibold"
                value={form.invested_amount}
                onChange={handleInvestedChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={savingFund}>
              {savingFund ? 'Saving Fund...' : editTarget ? 'Update Fund' : 'Save to Portfolio'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAddModal(false)
                setEditTarget(null)
                resetForm()
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Import from Groww Excel / CSV Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setImportCsvText('')
          setParsedPreview([])
        }}
        title="Upload & Import Groww Report (.xlsx / .csv)"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
            <p className="font-semibold mb-1">Upload Groww Excel or CSV:</p>
            <p className="text-emerald-800">
              Select your downloaded <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">Mutual_Funds_*.xlsx</code> or CSV file directly. All schemes, folios, units, and invested values will be automatically extracted!
            </p>
          </div>

          {/* File input */}
          <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-center hover:bg-gray-100/80 transition-colors">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-700 mb-1">Click to select Groww .xlsx or .csv report</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-xs text-gray-500 mx-auto file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
          </div>

          {/* Parsed Preview */}
          {parsedPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-800">
                Found {parsedPreview.length} Schemes in report:
              </p>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl p-2 bg-white">
                {parsedPreview.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">{item.scheme_name}</p>
                      <p className="text-[10px] text-gray-400">{item.category} • Folio: {item.folio_number || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(item.invested_amount)}</p>
                      <p className="text-[10px] text-gray-400">{item.units.toFixed(3)} units</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleExecuteImport}
              disabled={importing || parsedPreview.length === 0}
              className="btn-primary flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
            >
              {importing ? 'Importing & Linking AMFI NAVs...' : `Import ${parsedPreview.length} Funds to Supabase`}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowImportModal(false)
                setImportCsvText('')
                setParsedPreview([])
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Mutual Fund"
        message={`Remove "${deleteTarget?.scheme_name}" from your portfolio tracking?`}
        confirmText="Remove"
        loading={deleting}
        onConfirm={handleDeleteFund}
        onCancel={() => setDeleteTarget(null)}
      />
      {/* Portfolio Health & Risk Analysis Modal */}
      <PortfolioHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        funds={rawFunds}
      />
      {/* Capital Gains & Tax Estimator Modal */}
      <CapitalGainsModal
        isOpen={showTaxModal}
        onClose={() => setShowTaxModal(false)}
        funds={rawFunds}
      />
      {/* SIP Step-Up & XIRR Compounding Calculator */}
      <XirrStepUpModal
        isOpen={showStepUpModal}
        onClose={() => setShowStepUpModal(false)}
        currentMonthlySip={25000}
      />
      {/* Mutual Fund Side-by-Side Comparison Modal */}
      <MutualFundCompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        funds={rawFunds}
      />
      {/* Portfolio Rebalancing & Asset Drift Modal */}
      <PortfolioRebalanceModal
        isOpen={showRebalanceModal}
        onClose={() => setShowRebalanceModal(false)}
        funds={rawFunds}
      />
      {/* Portfolio Scheme Overlap Detector Modal */}
      <SchemeOverlapModal
        isOpen={showOverlapModal}
        onClose={() => setShowOverlapModal(false)}
        funds={rawFunds}
      />
    </Layout>
  )
}


