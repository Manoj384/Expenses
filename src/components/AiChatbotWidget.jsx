import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles,
  Bot,
  Send,
  Mic,
  MicOff,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Trash2,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Calendar,
  Zap,
  Key,
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  askFinancialAdvisorAi,
  getGeminiApiKey,
  setGeminiApiKey,
  getAiModel,
  setAiModel,
} from '../utils/aiService'
import { parseVoiceExpense } from '../utils/voiceNlpParser'
import { formatCurrency } from '../utils/formatCurrency'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import savedGrowwData from '../data/groww_holdings.json'
import defaultSips from '../data/default_sips.json'

function parseSipTargetQuery(text) {
  const lower = text.toLowerCase()

  // 1. Extract Target Amount (e.g. 5 lakh, 5lakh, 1 crore, 50k, 500000)
  let target = 0
  const crMatch = lower.match(/([0-9.]+)\s*(?:cr|crore|crores)/)
  const lakhMatch = lower.match(/([0-9.]+)\s*(?:lakh|lakhs|lac|lacs|l\b)/)
  const kMatch = lower.match(/([0-9.]+)\s*(?:k|thousand)/)
  const numMatch = lower.match(/(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]+)?)/)

  if (crMatch) {
    target = parseFloat(crMatch[1]) * 10000000
  } else if (lakhMatch) {
    target = parseFloat(lakhMatch[1]) * 100000
  } else if (kMatch) {
    target = parseFloat(kMatch[1]) * 1000
  } else if (numMatch) {
    const rawVal = parseFloat(numMatch[1].replace(/,/g, ''))
    if (rawVal >= 1000) target = rawVal
  }

  // 2. Extract Duration in Years or Months
  let years = 0
  const yearMatch = lower.match(/([0-9.]+)\s*(?:year|years|yr|yrs)/)
  const monthMatch = lower.match(/([0-9.]+)\s*(?:month|months|mo|mos)/)

  if (yearMatch) {
    years = parseFloat(yearMatch[1])
  } else if (monthMatch) {
    years = parseFloat(monthMatch[1]) / 12
  }

  if (target > 0 && years > 0) {
    return { target, years }
  }
  return null
}

function calculateReverseSip(target, years) {
  const months = Math.round(years * 12)
  const calcForRate = (annualRate) => {
    const r = annualRate / 1200
    const p = (target * r) / ((Math.pow(1 + r, months) - 1) * (1 + r))
    const monthlySip = Math.round(p)
    const totalInvested = monthlySip * months
    const totalGain = Math.max(0, target - totalInvested)
    return { monthlySip, totalInvested, totalGain }
  }

  const moderate = calcForRate(12)
  const aggressive = calcForRate(14)
  const conservative = calcForRate(10)

  return `🎯 **SIP Target Goal Calculator:**\n\n• **Target Corpus:** **₹${target.toLocaleString('en-IN')}**\n• **Timeframe:** **${years} Years (${months} months)**\n\n📌 **Recommended Monthly SIP (@ 12% p.a. Balanced Growth):**\n• **Monthly Investment:** **₹${moderate.monthlySip.toLocaleString('en-IN')} / month**\n• **Total You Will Invest:** ₹${moderate.totalInvested.toLocaleString('en-IN')}\n• **Estimated Wealth Gain:** **+₹${moderate.totalGain.toLocaleString('en-IN')}**\n\n📊 **Alternative Return Scenarios:**\n• **Aggressive Mid/Small Cap (@ 14% p.a.):** **₹${aggressive.monthlySip.toLocaleString('en-IN')} / month** (Gain: +₹${aggressive.totalGain.toLocaleString('en-IN')})\n• **Conservative Hybrid/Large Cap (@ 10% p.a.):** **₹${conservative.monthlySip.toLocaleString('en-IN')} / month** (Gain: +₹${conservative.totalGain.toLocaleString('en-IN')})\n\n💡 **Action Plan:** Setting up an automated monthly SIP of **₹${moderate.monthlySip.toLocaleString('en-IN')}** in a diversified Flexi Cap or Large & Mid Cap fund will comfortably reach your **₹${target.toLocaleString('en-IN')}** goal in ${years} years!`
}

function calculateForwardSip(monthlyAmt, years) {
  const months = Math.round(years * 12)
  const calcForRate = (annualRate) => {
    const r = annualRate / 1200
    const fv = monthlyAmt * ((Math.pow(1 + r, months) - 1) / r) * (1 + r)
    const finalValue = Math.round(fv)
    const totalInvested = monthlyAmt * months
    const totalGain = Math.max(0, finalValue - totalInvested)
    return { finalValue, totalInvested, totalGain }
  }

  const moderate = calcForRate(12)
  const aggressive = calcForRate(14)

  return `📈 **SIP Wealth Growth Calculator:**\n\n• **Monthly SIP:** **₹${monthlyAmt.toLocaleString('en-IN')} / month**\n• **Duration:** **${years} Years (${months} months)**\n• **Total Invested:** ₹${moderate.totalInvested.toLocaleString('en-IN')}\n\n🏆 **Expected Maturity Value (@ 12% p.a.):**\n• **Final Portfolio Value:** **₹${moderate.finalValue.toLocaleString('en-IN')}**\n• **Wealth Gain:** **+₹${moderate.totalGain.toLocaleString('en-IN')}** (+${Math.round((moderate.totalGain / moderate.totalInvested) * 100)}% gain)\n\n• **At 14% Aggressive Return:** **₹${aggressive.finalValue.toLocaleString('en-IN')}** (Gain: +₹${aggressive.totalGain.toLocaleString('en-IN')})`
}

const QUICK_PROMPTS = [
  { label: '⏰ Time & Today Date', prompt: 'What is the current time and today date?' },
  { label: '🎯 5 Lakh in 4 Years SIP', prompt: 'how much SIP should i need to add to make 5lakh in 4 years' },
  { label: '📈 Review MF & SIP Health', prompt: 'Review my Mutual Fund portfolio & SIP health' },
  { label: '🍔 Food Spend this Month', prompt: 'What did I spend on Food this month?' },
  { label: '📅 Next SIP & Bills Due', prompt: 'When is my next SIP due?' },
  { label: '💳 Total Outstanding Debts', prompt: 'How much total debt do I owe?' },
  { label: '😄 Tell Me a Joke', prompt: 'Tell me a joke!' },
]

export default function AiChatbotWidget() {
  const { user } = useAuth()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(getAiModel())
  const [financialContext, setFinancialContext] = useState({})
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('ft_ai_chat_history')
      if (saved) return JSON.parse(saved)
    } catch {}
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: '👋 **Hello! I am your AI Copilot & Voice Assistant** (like an intelligent Alexa for your finances and daily questions).\n\n✨ **What I can do:**\n• **General Queries:** Ask *"What time is it?"*, *"What is today\'s date?"*, *"Calculate 15% of 85,000"*\n• **Fast & Voice Expense Logging:** *"Spent ₹350 on petrol via GPay"*\n• **Live Portfolio & Spending:** *"Review my Mutual Fund portfolio"*, *"What did I spend on Food this month?"*\n\nHow can I help you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]
  })

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  // Sync chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ft_ai_chat_history', JSON.stringify(chatHistory.slice(-30)))
    } catch {}
  }, [chatHistory])

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [isOpen, chatHistory, loading])

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-IN'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInputMessage(transcript)
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [])

  // Listen for global open event & keyboard shortcut (Ctrl + J)
  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true)
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener('open-ai-chat', handleOpenEvent)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('open-ai-chat', handleOpenEvent)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Load Real-time Financial Context from Supabase
  const loadFinancialContext = useCallback(async () => {
    if (!user) return
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

      // 1. Transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)

      let income = 0
      let expense = 0
      const categorySpend = {}
      if (txns) {
        txns.forEach((t) => {
          const amt = Number(t.amount) || 0
          if (t.type === 'income') {
            income += amt
          } else {
            expense += amt
            const cat = t.category || 'Other'
            categorySpend[cat] = (categorySpend[cat] || 0) + amt
          }
        })
      }

      // 2. Debts
      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)

      let totalDebt = 0
      if (debts) {
        debts.forEach((d) => {
          totalDebt += Number(d.outstanding) || 0
        })
      }

      // 3. SIPs (with defaultSips fallback if empty in DB)
      const { data: sipsData } = await supabase
        .from('sips')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)

      const sipsList = sipsData && sipsData.length > 0 ? sipsData : defaultSips

      // 4. Mutual Funds (with savedGrowwData fallback if empty in DB)
      const { data: mfsData } = await supabase
        .from('mutual_funds')
        .select('*')
        .eq('user_id', user.id)

      const mfList = mfsData && mfsData.length > 0 ? mfsData : savedGrowwData

      let totalMfValue = 0
      let totalMfGain = 0
      mfList.forEach((mf) => {
        const curVal = Number(mf.current_value) || (Number(mf.units || 0) * Number(mf.current_nav || mf.nav || 0))
        const invVal = Number(mf.invested_amount) || (Number(mf.units || 0) * Number(mf.avg_nav || mf.nav || 0))
        totalMfValue += curVal
        totalMfGain += (curVal - invVal)
      })

      // 5. Goals (strictly from Supabase goals table)
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)

      const goalsList = goalsData || []
      const goalsCount = goalsList.length
      const goalsTarget = goalsList.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0)

      const netSavings = income - expense
      const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0

      setFinancialContext({
        monthIncome: income,
        monthExpense: expense,
        netSavings,
        savingsRate,
        totalDebt,
        activeSips: sipsList.length,
        sipsList,
        debtsList: debts || [],
        totalMfValue,
        totalMfGain,
        mfList,
        goalsCount,
        goalsTarget,
        goalsList,
        categorySpend,
        recentTxns: txns || [],
      })
    } catch (err) {
      console.warn('Failed to load live AI financial context:', err)
    }
  }, [user])

  useEffect(() => {
    if (isOpen) {
      loadFinancialContext()
      setApiKeyInput(getGeminiApiKey())
      setSelectedModel(getAiModel())
    }
  }, [isOpen, loadFinancialContext])

  const toggleMic = () => {
    if (!speechSupported) {
      toast.warning('Voice dictation is not supported in this browser. Please use Chrome/Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current?.start()
      } catch {
        setIsListening(false)
      }
    }
  }

  // Handle direct database action commands (e.g. logging transactions into Supabase)
  const executeDatabaseIntent = async (text) => {
    const lower = text.toLowerCase().trim()

    // Transaction Logging Intent (e.g. "Spent 400 on petrol", "Paid 1200 for food", "Add expense 500")
    const isLogIntent =
      /^(paid|spent|bought|add expense|log expense|record expense|got income|received)\b/i.test(lower) ||
      (/\b(for|on|via|using|at)\b/i.test(lower) && /\b\d+\b/.test(lower) && !lower.includes('?') && !lower.includes('how') && !lower.includes('what') && !lower.includes('why') && !lower.includes('when') && !lower.includes('weather') && !lower.includes('rain'))

    if (isLogIntent && user) {
      const parsed = parseVoiceExpense(text)
      if (parsed && parsed.amount > 0) {
        try {
          // Fetch categories and payment methods
          const [catsRes, pmsRes] = await Promise.all([
            supabase.from('categories').select('id, name, type').eq('user_id', user.id),
            supabase.from('payment_methods').select('id, name, type').eq('user_id', user.id),
          ])

          const categories = catsRes.data || []
          const paymentMethods = pmsRes.data || []
          const targetType = parsed.type === 'income' ? 'income' : 'expense'

          let categoryId = null
          if (categories.length > 0) {
            const catQuery = (parsed.category || '').toLowerCase().trim()
            const matched = categories.find((c) =>
              c.name.toLowerCase() === catQuery ||
              c.name.toLowerCase().includes(catQuery) ||
              catQuery.includes(c.name.toLowerCase())
            )
            categoryId = matched?.id || categories.find(c => c.type === targetType)?.id || categories[0]?.id || null
          }

          let paymentMethodId = null
          if (paymentMethods.length > 0) {
            const pmQuery = (parsed.paymentMethod || '').toLowerCase().trim()
            const matched = paymentMethods.find((pm) =>
              pm.name.toLowerCase() === pmQuery ||
              pm.name.toLowerCase().includes(pmQuery) ||
              pmQuery.includes(pm.name.toLowerCase()) ||
              pm.type.toLowerCase().includes(pmQuery)
            )
            paymentMethodId = matched?.id || paymentMethods[0]?.id || null
          }

          const newTxn = {
            user_id: user.id,
            amount: Number(parsed.amount),
            type: targetType,
            category_id: categoryId,
            payment_method_id: paymentMethodId,
            note: parsed.description || 'Voice Logged Expense',
            date: parsed.date || new Date().toISOString().slice(0, 10),
          }

          const { data, error } = await supabase
            .from('transactions')
            .insert([newTxn])
            .select()

          if (!error && data && data.length > 0) {
            await loadFinancialContext()
            window.dispatchEvent(new CustomEvent('transaction-updated'))
            return {
              handled: true,
              isAction: true,
              actionType: 'TRANSACTION_CREATED',
              transaction: {
                ...data[0],
                description: parsed.description,
                category: parsed.category,
              },
              text: `✅ **Transaction Logged Successfully!**\n\n• **Amount:** ${formatCurrency(parsed.amount)}\n• **Category:** ${parsed.category}\n• **Type:** ${parsed.type.toUpperCase()}\n• **Payment Method:** ${parsed.paymentMethod}\n• **Description:** ${parsed.description}\n• **Date:** ${parsed.date}`,
            }
          }
        } catch (dbErr) {
          console.warn('Direct txn insert failed:', dbErr)
        }
      }
    }

    return { handled: false }
  }

  const handleSendMessage = async (customPrompt) => {
    const queryText = (customPrompt || inputMessage).trim()
    if (!queryText || loading) return

    setInputMessage('')

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setChatHistory((prev) => [...prev, userMessage])
    setLoading(true)

    try {
      // Step 1: Check for direct action execution or structured database answers
      const dbResult = await executeDatabaseIntent(queryText)
      if (dbResult.handled) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: dbResult.text,
          isAction: dbResult.isAction,
          transaction: dbResult.transaction,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setChatHistory((prev) => [...prev, aiMessage])
        setLoading(false)
        return
      }

      // Step 2: Query Gemini AI Advisor with full financial context
      const aiResponse = await askFinancialAdvisorAi(
        queryText,
        financialContext,
        chatHistory
      )

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponse || 'I could not process that request. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setChatHistory((prev) => [...prev, aiMessage])
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `⚠️ **Error Processing Request:** ${err.message || 'Unable to connect to AI engine. Please verify your Gemini API key in settings.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = () => {
    setGeminiApiKey(apiKeyInput)
    setAiModel(selectedModel)
    setShowSettings(false)
    toast.success('AI Model & API Key updated successfully!')
  }

  const handleClearHistory = () => {
    const welcome = [
      {
        id: 'welcome',
        sender: 'ai',
        text: '👋 **Chat history cleared.** How can I assist with your finances today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]
    setChatHistory(welcome)
    localStorage.removeItem('ft_ai_chat_history')
  }

  return (
    <>
      {/* Floating Chatbot Window (Triggered from Plus Menu, BottomNav & Shortcuts) */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden ${
            isExpanded
              ? 'inset-2 sm:inset-6 md:inset-10 rounded-2xl'
              : 'bottom-2 sm:bottom-6 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-[420px] md:w-[460px] h-[580px] max-h-[88vh] rounded-2xl'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md">
                <Bot className="h-5 w-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate flex items-center gap-1.5">
                  AI Copilot & Alexa Assistant
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-200 font-semibold border border-amber-300/30">
                    Live
                  </span>
                </h3>
                <p className="text-[10px] text-white/80 truncate">
                  Voice Logging, Live Wealth & General Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors ${showSettings ? 'bg-white/30 text-amber-200' : 'text-white/80'}`}
                title="Model & API Key Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:flex p-1.5 rounded-lg text-white/80 hover:bg-white/20 transition-colors"
                title={isExpanded ? 'Minimize Window' : 'Expand Window'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                title="Close Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Settings Panel Accordion */}
          {showSettings && (
            <div className="p-3.5 bg-gray-50 dark:bg-slate-800/90 border-b border-gray-200 dark:border-slate-700 text-xs space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between font-bold text-gray-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-indigo-500" />
                  AI Model & API Key Settings
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                  title="Clear conversation memory"
                >
                  <Trash2 className="h-3 w-3" /> Clear Chat
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Google Gemini API Key (100% Free):
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste AI Studio Gemini Key (AIzaSy...)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-slate-400 mb-1">
                  AI Model Engine:
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash (Recommended, High Speed)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o mini (requires sk- key)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-2.5 py-1 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages Area */}
          <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto bg-gray-50/50 dark:bg-slate-950/50 text-xs">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-100 dark:border-slate-700/80 rounded-tl-xs'
                  }`}
                >
                  {/* Markdown-style content rendering */}
                  <div className="space-y-1.5 whitespace-pre-wrap">
                    {msg.text.split('\n').map((line, idx) => {
                      if (!line.trim()) return <div key={idx} className="h-1" />
                      // Bold formatting (**text**)
                      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      return (
                        <p
                          key={idx}
                          dangerouslySetInnerHTML={{ __html: formatted }}
                          className="leading-relaxed"
                        />
                      )
                    })}
                  </div>

                  {/* Interactive Action Card if a transaction was logged */}
                  {msg.isAction && msg.transaction && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[11px] text-blue-900 dark:text-blue-200">
                          {msg.transaction.description}
                        </div>
                        <div className="text-[10px] text-blue-700 dark:text-blue-300">
                          {formatCurrency(msg.transaction.amount)} • {msg.transaction.category}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white">
                        Logged
                      </span>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs pl-9">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></span>
                  <span className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-2 w-2 bg-purple-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span>Analyzing finance data...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-1.5 bg-gray-100/80 dark:bg-slate-850 border-t border-gray-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium bg-white dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 transition-colors shadow-2xs"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input & Voice Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask a question or type 'Spent ₹350 on fuel'..."
                  disabled={loading}
                  className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />

                {/* Voice Dictation Mic Button */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                  title={isListening ? 'Listening... click to stop' : 'Voice Dictate'}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-colors"
                title="Send Message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
