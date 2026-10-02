import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { parseVoiceExpense } from '../utils/voiceNlpParser'
import { formatCurrency } from '../utils/formatCurrency'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  Volume2,
  Bot,
  Zap,
} from 'lucide-react'

const SAMPLE_UTTERANCES = [
  'Paid 800 for dinner with Rahul via GPay',
  'Spent 350 on petrol at Shell',
  'Bought groceries from Zepto for 620 using Credit Card',
  'Got 85000 salary from Infosys today',
]

export default function AiVoiceChatbotModal({ isOpen, onClose, onTransactionCreated }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [parsedResult, setParsedResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const recognitionRef = useRef(null)

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
      setError('')
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      const parsed = parseVoiceExpense(transcript)
      setParsedResult(parsed)
      setIsListening(false)
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'no-speech') {
        setError(`Microphone error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser. Please type your expense instead.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setParsedResult(null)
      setError('')
      try {
        recognitionRef.current.start()
      } catch {
        recognitionRef.current.stop()
      }
    }
  }

  const handleManualParse = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    const parsed = parseVoiceExpense(query)
    if (!parsed || parsed.amount <= 0) {
      setError('Could not detect an amount. E.g. "Paid 450 for coffee via UPI"')
      return
    }
    setParsedResult(parsed)
  }

  const handleApplySample = (sample) => {
    setQuery(sample)
    const parsed = parseVoiceExpense(sample)
    setParsedResult(parsed)
  }

  const handleSaveTransaction = async () => {
    if (!parsedResult || parsedResult.amount <= 0 || saving) return
    setSaving(true)
    setError('')
    try {
      if (!user) {
        throw new Error('Please log in to save transactions.')
      }

      // Fetch user's categories & payment methods to resolve UUID foreign keys
      const [catsRes, pmsRes] = await Promise.all([
        supabase.from('categories').select('id, name, type').eq('user_id', user.id),
        supabase.from('payment_methods').select('id, name, type').eq('user_id', user.id),
      ])

      const categories = catsRes.data || []
      const paymentMethods = pmsRes.data || []

      const targetType = parsedResult.type === 'income' ? 'income' : 'expense'

      // 1. Resolve category_id
      let categoryId = null
      if (categories.length > 0) {
        const catQuery = (parsedResult.category || '').toLowerCase().trim()
        const matched = categories.find((c) =>
          c.name.toLowerCase() === catQuery ||
          c.name.toLowerCase().includes(catQuery) ||
          catQuery.includes(c.name.toLowerCase())
        )
        if (matched) {
          categoryId = matched.id
        } else {
          const fallback = categories.find((c) => c.type === targetType)
          categoryId = fallback?.id || categories[0]?.id || null
        }
      }

      // 2. Resolve payment_method_id
      let paymentMethodId = null
      if (paymentMethods.length > 0) {
        const pmQuery = (parsedResult.paymentMethod || '').toLowerCase().trim()
        const matched = paymentMethods.find((pm) =>
          pm.name.toLowerCase() === pmQuery ||
          pm.name.toLowerCase().includes(pmQuery) ||
          pmQuery.includes(pm.name.toLowerCase()) ||
          pm.type.toLowerCase().includes(pmQuery)
        )
        if (matched) {
          paymentMethodId = matched.id
        } else {
          paymentMethodId = paymentMethods[0]?.id || null
        }
      }

      const payload = {
        user_id: user.id,
        amount: Number(parsedResult.amount),
        type: targetType,
        category_id: categoryId,
        payment_method_id: paymentMethodId,
        note: parsedResult.description || 'Voice Logged Expense',
        date: parsedResult.date || new Date().toISOString().slice(0, 10),
      }

      const { error: insErr } = await supabase.from('transactions').insert([payload])
      if (insErr) throw insErr

      // Dispatch global event so all pages (Dashboard, Transactions, Reports) refresh live
      window.dispatchEvent(new CustomEvent('transaction-updated'))

      setSuccess(`✅ Successfully added ${formatCurrency(parsedResult.amount)} for "${parsedResult.description}" to your Transactions!`)
      if (onTransactionCreated) onTransactionCreated()
      setTimeout(() => {
        setSuccess('')
        setParsedResult(null)
        setQuery('')
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to save transaction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Voice & Conversational Expense Logger" maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Banner */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Natural Language Voice Assistant</h4>
              <p className="text-xs text-purple-200">
                Speak or type naturally. AI extracts the amount, merchant, method, and category!
              </p>
            </div>
          </div>
        </div>

        {error && <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2 font-medium">{error}</div>}
        {success && (
          <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {success}
          </div>
        )}

        {/* Voice Trigger & Input */}
        <div className="flex flex-col items-center justify-center pt-2 pb-1">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-lg ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-300 dark:ring-rose-900'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105'
            }`}
            title={isListening ? 'Click to stop listening' : 'Click and speak your expense'}
          >
            {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-2.5">
            {isListening ? '🎙️ Listening... Speak now!' : 'Tap mic to dictate expense'}
          </p>
        </div>

        {/* Text prompt form */}
        <form onSubmit={handleManualParse} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (parsedResult) setParsedResult(null)
            }}
            placeholder="e.g. Paid 800 for dinner with Rahul via GPay"
            className="input text-xs flex-1 py-2.5"
          />
          <button type="submit" className="btn-primary text-xs px-4 flex items-center gap-1.5 shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
            Parse
          </button>
        </form>

        {/* Quick sample chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Or Try a Sample Phrase
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_UTTERANCES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleApplySample(sample)}
                className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 px-2.5 py-1 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 text-left"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>

        {/* Parsed Result Preview Card */}
        {parsedResult && (
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                AI Extracted Details
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {parsedResult.type === 'income' ? '+' : '-'}{formatCurrency(parsedResult.amount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Description</span>
                <p className="font-semibold text-slate-900 dark:text-white">{parsedResult.description}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Category</span>
                <p className="font-semibold text-indigo-600 dark:text-indigo-400">{parsedResult.category}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Payment Method</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{parsedResult.paymentMethod}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Date</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{parsedResult.date}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setParsedResult(null)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveTransaction}
                disabled={saving}
                className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Confirm & Log Transaction'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
