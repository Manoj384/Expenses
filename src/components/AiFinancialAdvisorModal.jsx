import { useState, useEffect } from 'react'
import Modal from './Modal'
import {
  Sparkles,
  Bot,
  Send,
  RefreshCw,
  Key,
  HelpCircle,
  TrendingUp,
  CreditCard,
  PiggyBank,
  ShieldAlert,
  User,
} from 'lucide-react'
import { askFinancialAdvisorAi, getGeminiApiKey, setGeminiApiKey, getAiModel, setAiModel } from '../utils/aiService'
import { formatCurrency } from '../utils/formatCurrency'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import savedGrowwData from '../data/groww_holdings.json'
import defaultSips from '../data/default_sips.json'

const DEFAULT_QUESTIONS = [
  'How can I optimize my monthly savings & cut waste?',
  'What is the best strategy to pay off my debts & EMIs quickly?',
  'Review my Mutual Fund portfolio & SIP health',
  'How much emergency fund should I set aside?',
]

export default function AiFinancialAdvisorModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'ai',
      text: '👋 Hello! I am your AI Financial Advisor & Wealth Copilot. Ask me anything about budgeting, debt paydown strategies, mutual fund SIP allocations, or tax planning based on your live financial data.',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [financialContext, setFinancialContext] = useState({})
  const [showKeySettings, setShowKeySettings] = useState(false)
  const [apiKey, setApiKey] = useState(getGeminiApiKey())
  const [selectedModel, setSelectedModel] = useState(getAiModel())

  useEffect(() => {
    if (!user || !isOpen) return

    const loadContext = async () => {
      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

        // Transactions
        const { data: txns } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', user.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)

        let income = 0
        let expense = 0
        if (txns) {
          txns.forEach((t) => {
            if (t.type === 'income') income += Number(t.amount) || 0
            else expense += Number(t.amount) || 0
          })
        }

        // Debts
        const { data: debts } = await supabase
          .from('debts')
          .select('outstanding')
          .eq('user_id', user.id)
        const totalDebt = debts ? debts.reduce((sum, d) => sum + (Number(d.outstanding) || 0), 0) : 0

        // SIPs (with defaultSips fallback if empty in DB)
        const { data: sipsData } = await supabase
          .from('sips')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)

        const sipsList = sipsData && sipsData.length > 0 ? sipsData : defaultSips
        const activeSips = sipsList.length

        // Mutual Funds (with savedGrowwData fallback if empty in DB)
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
          totalMfGain += curVal - invVal
        })

        const netSavings = income - expense
        const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0

        // Goals (strictly from Supabase goals table)
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)

        const goalsCount = goalsData ? goalsData.length : 0
        const goalsTarget = goalsData ? goalsData.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0) : 0

        // Statements
        let statementTxnsCount = 0
        try {
          const savedStmts = localStorage.getItem('ft_statement_transactions')
          if (savedStmts) {
            statementTxnsCount = JSON.parse(savedStmts).length
          }
        } catch {}

        setFinancialContext({
          monthIncome: income,
          monthExpense: expense,
          netSavings,
          savingsRate,
          totalDebt,
          activeSips,
          sipsList,
          totalMfValue,
          totalMfGain,
          mfList,
          goalsCount,
          goalsTarget,
          statementTxnsCount,
        })
      } catch {}
    }

    loadContext()
  }, [user, isOpen])

  if (!isOpen) return null

  const handleAsk = async (queryText) => {
    const q = (queryText || question).trim()
    if (!q) return

    const updatedHistory = [...chatHistory, { sender: 'user', text: q }]
    setChatHistory(updatedHistory)
    setQuestion('')
    setLoading(true)

    try {
      const response = await askFinancialAdvisorAi(q, financialContext, updatedHistory)
      setChatHistory((prev) => [...prev, { sender: 'ai', text: response }])
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ Error fetching advice: ${err?.message || 'Please check your internet or API key.'}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ask AI Financial Advisor">
      <div className="space-y-4">
        {/* Financial Metrics Snapshot Pill Bar */}
        <div className="grid grid-cols-3 gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 p-3 rounded-2xl border border-blue-100 dark:border-slate-700 text-xs">
          <div>
            <span className="text-gray-400 dark:text-slate-400 text-[10px] block">Month Inflow</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(financialContext.monthIncome || 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-slate-400 text-[10px] block">Month Outflow</span>
            <span className="font-extrabold text-rose-600 dark:text-rose-400">
              {formatCurrency(financialContext.monthExpense || 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-slate-400 text-[10px] block">Total Liabilities</span>
            <span className="font-extrabold text-amber-600 dark:text-amber-400">
              {formatCurrency(financialContext.totalDebt || 0)}
            </span>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_QUESTIONS.map((item, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleAsk(item)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-300 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 transition-colors text-left"
            >
              💡 {item}
            </button>
          ))}
        </div>

        {/* Chat History Area */}
        <div className="max-h-72 overflow-y-auto space-y-3 p-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="p-1.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white h-fit mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-line leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white font-medium rounded-tr-xs'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 shadow-xs rounded-tl-xs'
                }`}
              >
                {msg.text}
              </div>

              {msg.sender === 'user' && (
                <div className="p-1.5 rounded-xl bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 h-fit mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 items-center text-xs text-blue-600 dark:text-blue-400 py-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Analyzing your financial profile with AI...</span>
            </div>
          )}
        </div>

        {/* Question Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAsk()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Ask anything (e.g. Can I afford a 15k smartphone this month?)..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="input-field text-xs flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Ask</span>
          </button>
        </form>

        {/* Settings bar */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500 pt-1">
          <button
            type="button"
            onClick={() => setShowKeySettings(!showKeySettings)}
            className="hover:underline flex items-center gap-1 text-gray-600 dark:text-slate-300 font-semibold"
          >
            <Key className="h-3 w-3 text-amber-500" />
            {getGeminiApiKey() ? `AI Configured (${selectedModel})` : 'Configure Free / Pro API Key'}
          </button>
          <span>Supports Gemini 1.5 Pro, Flash & OpenAI GPT-4o</span>
        </div>

        {showKeySettings && (
          <div className="p-3.5 bg-gray-100 dark:bg-slate-800 rounded-2xl space-y-3 border border-gray-200 dark:border-slate-700 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-slate-200 block mb-1">
                Select AI Engine / Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="input-field text-xs"
              >
                <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (100% Free / High Speed)</option>
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Pro Subscription / Deep Reasoning)</option>
                <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Fast & Cost Efficient)</option>
                <option value="gpt-4o">OpenAI GPT-4o (Pro / Flagship Multimodal)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-slate-200 block mb-1">
                API Key (Google AI Studio or OpenAI)
              </label>
              <input
                type="password"
                placeholder={selectedModel.startsWith('gpt') ? 'sk-proj-...' : 'AIzaSy...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-field text-xs font-mono"
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              <a
                href={selectedModel.startsWith('gpt') ? 'https://platform.openai.com/api-keys' : 'https://aistudio.google.com/app/apikey'}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                {selectedModel.startsWith('gpt') ? 'Get OpenAI Key →' : 'Get Gemini Key →'}
              </a>
              <button
                type="button"
                onClick={() => {
                  setGeminiApiKey(apiKey)
                  setAiModel(selectedModel)
                  setShowKeySettings(false)
                }}
                className="btn-primary text-xs py-1.5 px-4 font-bold"
              >
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
