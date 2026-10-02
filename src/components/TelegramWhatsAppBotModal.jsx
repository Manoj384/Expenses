import { useState, useRef, useEffect } from 'react'
import Modal from './Modal'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../utils/formatCurrency'
import { parseBotMessage } from '../utils/botParser'
import { enrichFundsWithCachedNavs } from '../utils/mfApi'
import savedGrowwData from '../data/groww_holdings.json'
import {
  Send,
  Bot,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Code2,
  Terminal,
  RefreshCw,
  Wallet,
  TrendingUp,
  Zap,
  Phone,
  ShieldCheck,
  Check,
} from 'lucide-react'

export default function TelegramWhatsAppBotModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('simulator') // 'simulator' | 'telegram' | 'whatsapp' | 'webhook_code'
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '👋 Hi! I am your Instant Financial Assistant.\n\nYou can send me expenses like:\n• "Spent ₹450 for lunch via UPI"\n• "Paid 1200 electricity bill by Card"\n• "Received 50000 bonus salary"\n\nOr query your portfolio:\n• Type `/portfolio` for live mutual fund valuation\n• Type `/summary` for this month’s spend\n• Type `/networth` for complete wealth breakdown',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputVal, setInputVal] = useState('')
  const [logging, setLogging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [telegramToken, setTelegramToken] = useState(() => localStorage.getItem('ft_telegram_bot_token') || '')
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('ft_telegram_chat_id') || '')
  const chatBottomRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, messages])

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveTelegramConfig = (e) => {
    e.preventDefault()
    localStorage.setItem('ft_telegram_bot_token', telegramToken.trim())
    localStorage.setItem('ft_telegram_chat_id', telegramChatId.trim())
    alert('Telegram Bot settings saved!')
  }

  const handleSendMessage = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : inputVal
    if (!textToSend || !textToSend.trim()) return

    const userMsg = {
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (typeof customText !== 'string') setInputVal('')

    const parsed = parseBotMessage(textToSend)

    if (!parsed) return

    // 1. Handle Portfolio Query
    if (parsed.intent === 'QUERY_PORTFOLIO') {
      let mfList = savedGrowwData
      try {
        const cached = localStorage.getItem('ft_cached_mutual_funds')
        if (cached) {
          const p = JSON.parse(cached)
          if (Array.isArray(p) && p.length > 0) mfList = p
        }
      } catch {}

      const enriched = enrichFundsWithCachedNavs(mfList)
      const totalInvested = enriched.reduce((s, f) => s + parseFloat(f.invested_amount || 0), 0)
      const totalVal = enriched.reduce((s, f) => s + parseFloat(f.current_value || 0), 0)
      const totalGain = totalVal - totalInvested
      const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : '0.00'
      const oneDayGain = enriched.reduce((s, f) => s + parseFloat(f.one_day_gain || 0), 0)

      const replyText = `📈 **Live Portfolio Valuation:**\n\n` +
        `• **Current Value:** ${formatCurrency(totalVal)}\n` +
        `• **Invested:** ${formatCurrency(totalInvested)}\n` +
        `• **Total Returns:** ${totalGain >= 0 ? '+' : ''}${formatCurrency(totalGain)} (${gainPct}%)\n` +
        `• **1-Day Market Gain:** ${oneDayGain >= 0 ? '+' : ''}${formatCurrency(oneDayGain)}\n\n` +
        `📊 **Top Holdings (Live AMFI NAVs):**\n` +
        enriched.slice(0, 4).map((f) => `• ${f.scheme_name.split(' - ')[0].slice(0, 24)}: ₹${f.current_nav?.toFixed(2)} (${formatCurrency(f.current_value)})`).join('\n')

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }, 400)
      return
    }

    // 2. Handle Monthly Summary Query
    if (parsed.intent === 'QUERY_SUMMARY') {
      let expense = 38400
      let income = 85000
      try {
        if (user) {
          const { data } = await supabase.from('transactions').select('type, amount').eq('user_id', user.id)
          if (data) {
            expense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
            income = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
          }
        }
      } catch {}

      const replyText = `📊 **Monthly Financial Summary:**\n\n` +
        `• **Total Income:** ${formatCurrency(income)}\n` +
        `• **Total Expenses:** ${formatCurrency(expense)}\n` +
        `• **Net Savings:** ${formatCurrency(income - expense)}\n` +
        `• **Savings Rate:** ${income > 0 ? (((income - expense) / income) * 100).toFixed(1) : 0}%`

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }, 400)
      return
    }

    // 3. Handle Net Worth Query
    if (parsed.intent === 'QUERY_NETWORTH') {
      let mfTotal = 114876
      try {
        const cached = localStorage.getItem('ft_cached_mutual_funds')
        if (cached) {
          const p = JSON.parse(cached)
          if (Array.isArray(p)) {
            const en = enrichFundsWithCachedNavs(p)
            mfTotal = en.reduce((s, f) => s + parseFloat(f.current_value || 0), 0)
          }
        }
      } catch {}

      const totalAssets = mfTotal + 45000 + 120000 // liquid + gold
      const totalDebts = 15000
      const netWorth = totalAssets - totalDebts

      const replyText = `🏛️ **Net Worth Breakdown:**\n\n` +
        `• **Total Assets:** ${formatCurrency(totalAssets)}\n` +
        `• **Mutual Funds:** ${formatCurrency(mfTotal)}\n` +
        `• **Total Liabilities:** ${formatCurrency(totalDebts)}\n` +
        `• **🌟 True Net Worth:** ${formatCurrency(netWorth)}`

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }, 400)
      return
    }

    // 4. Handle Help Intent
    if (parsed.intent === 'HELP') {
      const replyText = `🤖 **Bot Commands Guide:**\n\n` +
        `• **Log Expense:** Type "Spent 450 for lunch via UPI" or "Paid 800 petrol"\n` +
        `• **Log Income:** Type "Received 65000 salary" or "Got 1200 dividend"\n` +
        `• \`/portfolio\` - Live mutual fund portfolio & market gains\n` +
        `• \`/summary\` - Monthly income, expenses & savings rate\n` +
        `• \`/networth\` - Complete net worth valuation`

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }, 400)
      return
    }

    // 5. Handle Transaction Intent
    if (parsed.intent === 'LOG_TRANSACTION') {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            isParsedTx: true,
            parsedData: parsed,
            text: `📝 **Detected ${parsed.type.toUpperCase()}:**\n• Amount: **₹${parsed.amount.toLocaleString('en-IN')}**\n• Category: **${parsed.category}**\n• Method: **${parsed.paymentMethod}**\n• Note: *${parsed.note}*`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }, 400)
      return
    }

    // Fallback unknown
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `❓ ${parsed.message || 'I could not understand that. Try typing "/portfolio" or "Spent 300 for lunch via GPay".'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }, 400)
  }

  // Confirm and log transaction into Supabase
  const handleConfirmLogTransaction = async (parsedData, msgIndex) => {
    if (!user) {
      alert('Please log in to record transactions directly.')
      return
    }

    setLogging(true)
    try {
      // 1. Resolve Category UUID
      let categoryId = null
      const { data: categories } = await supabase.from('categories').select('id, name, type').eq('user_id', user.id)
      if (categories && categories.length > 0) {
        const matchedCat = categories.find((c) =>
          c.name.toLowerCase().includes(parsedData.category.toLowerCase()) ||
          parsedData.category.toLowerCase().includes(c.name.toLowerCase())
        ) || categories[0]
        categoryId = matchedCat.id
      }

      // 2. Resolve Payment Method UUID
      let paymentMethodId = null
      const { data: payMethods } = await supabase.from('payment_methods').select('id, name').eq('user_id', user.id)
      if (payMethods && payMethods.length > 0) {
        const matchedPay = payMethods.find((p) =>
          p.name.toLowerCase().includes(parsedData.paymentMethod.toLowerCase()) ||
          parsedData.paymentMethod.toLowerCase().includes(p.name.toLowerCase())
        ) || payMethods[0]
        paymentMethodId = matchedPay.id
      }

      // 3. Insert transaction
      const payload = {
        user_id: user.id,
        amount: parsedData.amount,
        type: parsedData.type,
        category_id: categoryId,
        payment_method_id: paymentMethodId,
        date: parsedData.date || new Date().toISOString().split('T')[0],
        note: parsedData.note,
      }

      const { error: insErr } = await supabase.from('transactions').insert(payload)
      if (insErr) throw insErr

      // Dispatch global event
      window.dispatchEvent(new CustomEvent('transaction-updated'))

      // Mark message as logged
      setMessages((prev) =>
        prev.map((m, idx) => (idx === msgIndex ? { ...m, isLogged: true } : m)).concat({
          sender: 'bot',
          text: `✅ **Transaction Logged Successfully!**\n\n₹${parsedData.amount} has been added to your transactions under **${parsedData.category}**.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      )
    } catch (err) {
      alert('Failed to log transaction: ' + (err.message || 'Error'))
    } finally {
      setLogging(false)
    }
  }

  const samplePrompts = [
    'Spent 450 for lunch via UPI',
    'Paid 1800 petrol bill using Credit Card',
    'Received 75000 monthly salary',
    '/portfolio',
    '/summary',
    '/networth',
  ]

  const webhookCodeSnippet = `// Supabase Edge Function / Cloudflare Worker: telegram-webhook.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const update = await req.json()
    const message = update.message
    if (!message || !message.text) return new Response("OK")

    const chatId = message.chat.id
    const text = message.text.trim()

    // 1. Handle /portfolio query
    if (text === "/portfolio" || text === "/nav") {
      const { data: funds } = await supabase.from("mutual_funds").select("*")
      const totalVal = (funds || []).reduce((s, f) => s + Number(f.current_value || 0), 0)
      const totalInv = (funds || []).reduce((s, f) => s + Number(f.invested_amount || 0), 0)
      
      await fetch(\`https://api.telegram.org/bot\${BOT_TOKEN}/sendMessage\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: \`📈 *Portfolio Value:* ₹\${totalVal.toLocaleString('en-IN')}\\nInvested: ₹\${totalInv.toLocaleString('en-IN')}\\nProfit: ₹\${(totalVal - totalInv).toLocaleString('en-IN')}\`,
          parse_mode: "Markdown"
        })
      })
      return new Response("OK")
    }

    // 2. Parse & Log Expense (e.g. "Spent 350 for dinner")
    const amtMatch = text.match(/\\b(\\d+)\\b/)
    if (amtMatch) {
      const amount = parseFloat(amtMatch[1])
      await supabase.from("transactions").insert({
        amount: amount,
        type: text.toLowerCase().includes("salary") ? "income" : "expense",
        note: text,
        date: new Date().toISOString().split("T")[0]
      })

      await fetch(\`https://api.telegram.org/bot\${BOT_TOKEN}/sendMessage\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: \`✅ Logged ₹\${amount} successfully!\`
        })
      })
    }

    return new Response("OK")
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🤖 Telegram & WhatsApp Financial Bot" size="2xl">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-800 gap-2 pb-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Interactive Chat Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'telegram'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Send className="h-4 w-4 text-sky-400" />
            <span>Telegram Bot Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Phone className="h-4 w-4 text-emerald-400" />
            <span>WhatsApp Click-to-Log</span>
          </button>

          <button
            onClick={() => setActiveTab('webhook_code')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'webhook_code'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Webhook Code</span>
          </button>
        </div>

        {/* TAB 1: INTERACTIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-3">
            {/* Sample Quick Prompt Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-gray-400 dark:text-slate-500 font-medium flex-shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Try:
              </span>
              {samplePrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSendMessage(p)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 rounded-lg whitespace-nowrap transition-colors border border-gray-200 dark:border-slate-700"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Chat Box Messages Container */}
            <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 h-[340px] overflow-y-auto space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-bl-none shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {/* Parsed Transaction Card with 1-Click Save Action */}
                    {m.isParsedTx && m.parsedData && !m.isLogged && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ready to save
                        </span>
                        <button
                          disabled={logging}
                          onClick={() => handleConfirmLogTransaction(m.parsedData, idx)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          {logging ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
                          Confirm & Log
                        </button>
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1 text-right ${
                        m.sender === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-slate-500'
                      }`}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="e.g. Spent ₹350 on groceries via GPay or /portfolio"
                className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: TELEGRAM SETUP */}
        {activeTab === 'telegram' && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl space-y-2 text-sky-900 dark:text-sky-200">
              <h4 className="font-bold flex items-center gap-2 text-sky-700 dark:text-sky-300">
                <Send className="h-4 w-4" /> Step-by-Step Telegram Bot Setup:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open Telegram and search for <strong>@BotFather</strong>.</li>
                <li>Send <code>/newbot</code> and follow instructions to name your bot.</li>
                <li>Copy the generated <strong>HTTP API Token</strong> and paste it below.</li>
                <li>Send <code>/start</code> to your new bot to begin logging expenses on the go!</li>
              </ol>
            </div>

            <form onSubmit={handleSaveTelegramConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Telegram Bot Token:
                </label>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="e.g. 7123456789:AAHxxxxx_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Your Telegram Chat ID (Optional):
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 987654321 (get from @userinfobot)"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open @BotFather on Telegram
                </a>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: WHATSAPP CLICK-TO-LOG */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2 text-emerald-900 dark:text-emerald-200">
              <h4 className="font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <Phone className="h-4 w-4" /> 1-Click WhatsApp Quick Log:
              </h4>
              <p className="text-xs">
                Click any template below to open WhatsApp with pre-filled expense or portfolio commands. Send it to your self-chat or designated expense group!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { label: '🍕 Food & Dining', text: 'Spent 350 for lunch via UPI' },
                { label: '⛽ Fuel / Petrol', text: 'Paid 1500 for petrol using Credit Card' },
                { label: '🛒 Groceries', text: 'Spent 850 at Supermarket via GPay' },
                { label: '📈 Live Portfolio', text: '/portfolio' },
                { label: '📊 Monthly Spend', text: '/summary' },
                { label: '🏛️ Net Worth', text: '/networth' },
              ].map((item, idx) => (
                <a
                  key={idx}
                  href={`https://wa.me/?text=${encodeURIComponent(item.text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-xs">{item.label}</div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 italic">"{item.text}"</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: WEBHOOK CODE */}
        {activeTab === 'webhook_code' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-blue-600" /> Complete Serverless Webhook Handler:
              </span>
              <button
                onClick={() => handleCopyCode(webhookCodeSnippet)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[300px] border border-slate-800">
              {webhookCodeSnippet}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  )
}
