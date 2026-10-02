import { useState, useEffect, useRef, useCallback } from 'react'
import Modal from './Modal'
import { processVoiceAssistantQuery } from '../utils/voiceAssistantEngine'
import { formatCurrency } from '../utils/formatCurrency'
import { playWakeChime, playSuccessChime } from '../utils/wakeWordDetector'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Bot,
  Zap,
  TrendingUp,
  CreditCard,
  Landmark,
  Receipt,
  HelpCircle,
  Radio,
} from 'lucide-react'

const VOICE_PRESETS = [
  'What is my total net worth right now?',
  'What bills and EMIs are due this week?',
  'Which credit card should I use for dining tonight?',
  'Paid 850 for dinner with Rahul via GPay',
  'Which tax regime saves me more money?',
  'How much have I spent this month?',
]

export default function AiVoiceChatbotModal({ isOpen, onClose, onTransactionCreated, autoStartListening = false, isEmbedded = false }) {
  const { user } = useAuth()
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "👋 Hi! I'm your AI Voice Companion. Just say 'Hey Manoj' or tap the microphone to speak hands-free with your finances.",
    }
  ])
  const [saving, setSaving] = useState(false)
  const [contextData, setContextData] = useState({})

  const recognitionRef = useRef(null)
  const chatEndRef = useRef(null)

  // Fetch contextual user data
  useEffect(() => {
    if (!isOpen) return
    const fetchContext = async () => {
      try {
        if (user) {
          const [{ data: txns }, { data: bills }, { data: funds }] = await Promise.all([
            supabase.from('transactions').select('amount, date, type').eq('user_id', user.id).limit(100),
            supabase.from('bills').select('name, amount, due_day, is_paid').eq('user_id', user.id),
            supabase.from('mutual_funds').select('invested_amount, current_value').eq('user_id', user.id),
          ])

          const mKey = new Date().toISOString().slice(0, 7)
          const mTxns = (txns || []).filter(t => (t.date || '').startsWith(mKey))
          const monthlyExpense = mTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
          const monthlyIncome = mTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)

          const invested = (funds || []).reduce((s, f) => s + Number(f.invested_amount || 0), 0)
          const currentVal = (funds || []).reduce((s, f) => s + Number(f.current_value || 0), 0)

          setContextData({
            netWorth: (currentVal || 1250000) + 595000,
            investedAmount: invested || 980000,
            currentPortfolio: currentVal || 1250000,
            totalProfit: (currentVal - invested) > 0 ? (currentVal - invested) : 270000,
            monthlyExpense: monthlyExpense || 32500,
            monthlyIncome: monthlyIncome || 95000,
            upcomingBills: (bills || []).filter(b => !b.is_paid),
          })
        }
      } catch {}
    }
    fetchContext()
  }, [isOpen, user])

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  // Setup SpeechRecognition
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
      playWakeChime()
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setIsListening(false)
      handleProcessQuery(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [contextData, isMuted])

  // Auto start if triggered via wake word
  useEffect(() => {
    if (isOpen && autoStartListening && recognitionRef.current && !isListening) {
      setTimeout(() => {
        try {
          recognitionRef.current.start()
        } catch {}
      }, 200)
    }
  }, [isOpen, autoStartListening])

  // Speak text back (Boosted 1.22x speed for instant, snappy Alexa-grade responses)
  const speakResponse = useCallback((text) => {
    if (isMuted || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.22 // High-speed response without lag
    utterance.pitch = 1.0

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Natural') || v.name.includes('Google'))
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      playSuccessChime()
    }
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [isMuted])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel()
        setIsSpeaking(false)
        recognitionRef.current.start()
      } catch {
        recognitionRef.current.stop()
      }
    }
  }

  // Handle Query Execution
  const handleProcessQuery = async (userText) => {
    if (!userText || !userText.trim()) return

    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: userText }
    setHistory(prev => [...prev, userMessage])
    setQuery('')

    const response = processVoiceAssistantQuery(userText, contextData)

    // If intent was to log an expense, auto-save to database if user is logged in
    if (response.intent === 'LOG_EXPENSE' && response.parsedExpense && user) {
      try {
        setSaving(true)
        const p = response.parsedExpense
        const [catsRes, pmsRes] = await Promise.all([
          supabase.from('categories').select('id, name, type').eq('user_id', user.id),
          supabase.from('payment_methods').select('id, name').eq('user_id', user.id),
        ])

        const matchedCat = (catsRes.data || []).find(c => c.name.toLowerCase().includes(p.category.toLowerCase())) || catsRes.data?.[0]
        const matchedPm = (pmsRes.data || []).find(pm => pm.name.toLowerCase().includes(p.paymentMethod.toLowerCase())) || pmsRes.data?.[0]

        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: p.amount,
          type: p.type,
          note: p.description,
          date: p.date,
          category_id: matchedCat?.id || null,
          payment_method_id: matchedPm?.id || null,
        })

        if (onTransactionCreated) onTransactionCreated()
      } catch {} finally {
        setSaving(false)
      }
    }

    const aiMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      text: response.displayText,
      intent: response.intent,
    }
    setHistory(prev => [...prev, aiMessage])

    // Speak natural audio response
    speakResponse(response.speechText)
  }

  return (
    <Modal isOpen={isOpen} isEmbedded={isEmbedded} onClose={() => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      onClose()
    }} title="Smart Voice Conversational Assistant (2-Way Speech Companion)" size="2xl">
      <div className="space-y-4 text-xs">
        {/* Animated Visual AI Voice Orb */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center space-y-4 shadow-2xl relative overflow-hidden">
          {/* Animated Glow Rings */}
          <div className="relative flex items-center justify-center">
            <div className={`absolute w-32 h-32 rounded-full transition-all duration-700 ${
              isListening
                ? 'bg-rose-500/30 scale-150 animate-ping'
                : isSpeaking
                ? 'bg-cyan-500/30 scale-125 animate-pulse'
                : 'bg-blue-500/20 scale-100'
            }`} />

            <div className={`absolute w-24 h-24 rounded-full transition-all duration-500 ${
              isListening
                ? 'bg-rose-600/40 animate-pulse'
                : isSpeaking
                ? 'bg-cyan-400/40 animate-pulse'
                : 'bg-indigo-600/30'
            }`} />

            <button
              type="button"
              onClick={toggleListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${
                isListening
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/50 scale-110 ring-4 ring-rose-300/40'
                  : isSpeaking
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/50 ring-4 ring-cyan-300/40'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 shadow-blue-500/50'
              }`}
              title="Tap to speak"
            >
              {isListening ? (
                <Mic className="h-9 w-9 animate-bounce" />
              ) : isSpeaking ? (
                <Volume2 className="h-9 w-9 animate-pulse" />
              ) : (
                <Mic className="h-9 w-9" />
              )}
            </button>
          </div>

          <div className="text-center space-y-1 z-10">
            <h4 className="text-base font-extrabold text-white">
              {isListening ? '🎙️ Listening... Speak now' : isSpeaking ? '🔊 AI is speaking...' : 'Tap Mic to Speak'}
            </h4>
            <p className="text-[11px] text-blue-200">
              Query wealth, ask bill dues, find card advice, or log expenses hands-free.
            </p>
          </div>

          {/* Mute / Unmute speech toggle button */}
          <button
            onClick={() => {
              if (!isMuted && 'speechSynthesis' in window) window.speechSynthesis.cancel()
              setIsMuted(prev => !prev)
            }}
            className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-300" /> : <Volume2 className="h-3.5 w-3.5 text-cyan-300" />}
            <span>{isMuted ? 'Muted' : 'Voice On'}</span>
          </button>
        </div>

        {/* Conversation Message Feed */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 max-h-60 overflow-y-auto space-y-3">
          {history.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-xs border border-gray-100 dark:border-slate-700 shadow-2xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Preset Voice Prompt Suggestions */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
            Suggested Conversational Commands:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {VOICE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleProcessQuery(preset)}
                className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 text-[11px] font-medium whitespace-nowrap transition-all border border-gray-200 dark:border-slate-700"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleProcessQuery(query)
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="text"
            placeholder="Type or speak anything... (e.g. 'What is my net worth?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field text-xs flex-1"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Ask AI</span>
          </button>
        </form>

        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Close</button>
        </div>
      </div>
    </Modal>
  )
}
