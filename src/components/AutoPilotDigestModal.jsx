import { useState, useEffect, useMemo } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/formatCurrency'
import { generateAutoPilotDigest } from '../utils/autoPilotDigest'
import {
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  Copy,
  CheckCircle2,
  Calendar,
  CreditCard,
  TrendingDown,
  ShieldCheck,
  Users,
  BellRing,
  Clock,
  ExternalLink,
  Bot,
} from 'lucide-react'

export default function AutoPilotDigestModal({ isOpen, onClose, isEmbedded = false }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [bills, setBills] = useState([])
  const [splitwiseGroups, setSplitwiseGroups] = useState([])
  const [copied, setCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoTime, setAutoTime] = useState(() => localStorage.getItem('ft_autopilot_time') || '08:30')
  const [autoEnabled, setAutoEnabled] = useState(() => localStorage.getItem('ft_autopilot_enabled') === 'true')

  useEffect(() => {
    if (!isOpen) return
    const fetchData = async () => {
      setLoading(true)
      try {
        // Load Splitwise groups from localStorage
        const storageKey = `ft_splitwise_groups_${user?.id || 'guest'}`
        const savedGroups = localStorage.getItem(storageKey)
        if (savedGroups) setSplitwiseGroups(JSON.parse(savedGroups))

        if (user) {
          const [{ data: txns }, { data: billList }] = await Promise.all([
            supabase.from('transactions').select('id, amount, date, type, note').eq('user_id', user.id).limit(100),
            supabase.from('bills').select('id, name, amount, due_day, is_paid').eq('user_id', user.id),
          ])
          if (txns) setTransactions(txns)
          if (billList) setBills(billList)
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isOpen, user])

  const digest = useMemo(() => {
    return generateAutoPilotDigest({
      transactions,
      bills: bills.length ? bills : [
        { name: 'High-Speed Broadband WiFi', amount: 1499, due_day: new Date().getDate() + 2 },
        { name: 'Apartment Maintenance', amount: 3200, due_day: new Date().getDate() + 4 },
      ],
      splitwiseGroups,
      monthlyBudget: 60000,
      userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member',
      refDate: new Date(),
    })
  }, [transactions, bills, splitwiseGroups, user])

  // Speech synthesis
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      window.speechSynthesis.cancel()
      const spokenText = `${digest.greeting}! Here is your automated briefing for ${digest.dateStr}. ` +
        (digest.dueSoonBills.length > 0
          ? `You have ${digest.dueSoonBills.length} upcoming bills totaling ${formatCurrency(digest.totalDuesAmount)}. `
          : `You have no upcoming bills due this week. `) +
        (digest.topCard
          ? `For today's purchases, we recommend using your ${digest.topCard.card.name} to maximize your ${digest.topCard.interestFreeDaysRemaining} days of interest-free float. `
          : ``) +
        `Your safe daily discretionary budget is ${formatCurrency(digest.safeDailyBudget)}. Have a productive day!`

      const utterance = new SpeechSynthesisUtterance(spokenText)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(digest.textDigest)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleWhatsAppDispatch = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(digest.textDigest)}`
    window.open(url, '_blank')
  }

  const handleTelegramDispatch = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://finance.app')}&text=${encodeURIComponent(digest.textDigest)}`
    window.open(url, '_blank')
  }

  const saveAutoSchedule = (enabled, time) => {
    setAutoEnabled(enabled)
    setAutoTime(time)
    localStorage.setItem('ft_autopilot_enabled', String(enabled))
    localStorage.setItem('ft_autopilot_time', time)
  }

  return (
    <Modal isOpen={isOpen} isEmbedded={isEmbedded} onClose={() => {
      if (isSpeaking) window.speechSynthesis.cancel()
      onClose()
    }} title="Autonomous AI Financial Auto-Pilot (Morning Briefing)" size="2xl">
      <div className="space-y-6 text-xs">
        {/* Top Hero Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-blue-500/30 text-blue-300 font-extrabold px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-blue-400/40">
              <Bot className="h-3.5 w-3.5 text-cyan-300" />
              Autonomous Morning Briefing
            </span>
            <h3 className="text-lg font-black text-white">{digest.greeting}, {digest.dateStr}</h3>
            <p className="text-xs text-blue-200">AI has compiled your bills, card float, budget pace, and Splitwise receivables.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSpeech}
              className={`p-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isSpeaking
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md'
              }`}
              title="Listen to briefing via AI voice"
            >
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-cyan-300" />}
              <span>{isSpeaking ? 'Stop Voice' : 'Read Aloud'}</span>
            </button>
          </div>
        </div>

        {/* 4 Multi-Dimension Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Bills Due */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold">Upcoming Bills</span>
              <Calendar className="h-4 w-4 text-rose-500" />
            </div>
            <span className="text-lg font-black text-gray-900 dark:text-white block">
              {formatCurrency(digest.totalDuesAmount)}
            </span>
            <span className="text-[11px] text-gray-500">{digest.dueSoonBills.length} dues in next 5 days</span>
          </div>

          {/* Card 2: Today's Smart Card Float */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold">Recommended Card</span>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 truncate block">
              {digest.topCard ? digest.topCard.card.name.split(' ')[0] : 'Any Card'}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
              {digest.topCard ? `${digest.topCard.interestFreeDaysRemaining} Days Float` : 'Standard'}
            </span>
          </div>

          {/* Card 3: Safe Daily Budget */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold">Safe Daily Limit</span>
              <TrendingDown className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400 block">
              {formatCurrency(digest.safeDailyBudget)}/day
            </span>
            <span className="text-[11px] text-gray-500">{formatCurrency(digest.budgetRemaining)} remaining</span>
          </div>

          {/* Card 4: Splitwise Receivables */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] uppercase font-bold">Friends Owe You</span>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400 block">
              {formatCurrency(digest.totalReceivable)}
            </span>
            <span className="text-[11px] text-gray-500">{digest.debtors.length} pending collections</span>
          </div>
        </div>

        {/* Live Auto-Pilot Briefing Raw View */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-800">
            <span className="font-bold text-gray-800 dark:text-slate-200 text-xs">Formatted Daily Briefing Preview</span>
            <button
              onClick={handleCopy}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-gray-700 dark:text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
            {digest.textDigest}
          </pre>
        </div>

        {/* 1-Click Dispatch & Automation Schedule */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="space-y-0.5">
            <strong className="text-xs font-bold text-emerald-950 dark:text-emerald-100 block">Instant 1-Click Dispatch:</strong>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300">Push this briefing to your WhatsApp or Telegram right now.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppDispatch}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              <span>WhatsApp Me</span>
            </button>

            <button
              onClick={handleTelegramDispatch}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Telegram</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Close</button>
        </div>
      </div>
    </Modal>
  )
}
