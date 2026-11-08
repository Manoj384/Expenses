import { useState, useMemo } from 'react'
import Modal from './Modal'
import { parseIncomingTransactionMessage } from '../utils/quickIngestParser'
import { formatCurrency } from '../utils/formatCurrency'
import { createTransaction } from '../services/transactionService'
import { useAuth } from '../context/AuthContext'
import { hapticSuccess, hapticError } from '../utils/haptics'
import {
  MessageSquare,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Zap,
  ArrowRight,
  Send,
  Smartphone,
} from 'lucide-react'

const SAMPLE_MESSAGES = [
  'Paid 450 to Swiggy via UPI for dinner',
  'HDFC Bank: Rs 1,850.00 debited from a/c **4921 to SHELL PETROL on 28-SEP-26. UPI: 987654321',
  'Spent 2499 on Amazon via Credit Card',
  'Salary credited Rs 95,500 into HDFC Bank',
]

export default function QuickIngestModal({ isOpen = true, onClose = () => {}, onTransactionAdded = () => {}, isEmbedded = false }) {
  const { user } = useAuth()
  const [inputText, setInputText] = useState(SAMPLE_MESSAGES[0])
  const [activeTab, setActiveTab] = useState('paste') // 'paste' | 'webhook'
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [copiedUrl, setCopiedUrl] = useState(false)

  const parsed = useMemo(() => {
    return parseIncomingTransactionMessage(inputText)
  }, [inputText])

  const handleCommit = async () => {
    if (!parsed || !user || saving) return
    setSaving(true)
    try {
      await createTransaction({
        userId: user.id,
        transaction: {
          type: parsed.type,
          amount: parsed.amount,
          note: parsed.note,
          date: parsed.date,
        },
      })
      hapticSuccess()
      setSuccessMsg(`Logged ${formatCurrency(parsed.amount)} under ${parsed.categoryName}!`)
      if (onTransactionAdded) onTransactionAdded()
      window.dispatchEvent(new CustomEvent('transaction-updated'))
      setTimeout(() => {
        setSuccessMsg('')
        onClose()
      }, 1500)
    } catch (err) {
      hapticError()
      console.warn('Quick ingest error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyWebhook = () => {
    const url = `${window.location.origin}/api/webhook/ingest?token=${user?.id ? user.id.slice(0, 12) : 'demo-key'}`
    navigator.clipboard?.writeText(url)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isEmbedded={isEmbedded} title="Zero-Friction Quick Ingest & Webhooks" maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Tab switch */}
        <div className="flex border-b border-gray-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2 px-3 font-bold border-b-2 transition-all ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Instant Message & SMS Logger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            className={`pb-2 px-3 font-bold border-b-2 transition-all ${
              activeTab === 'webhook'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            WhatsApp / Telegram Webhook Setup
          </button>
        </div>

        {activeTab === 'paste' ? (
          <>
            {/* Input & Sample Chips */}
            <div className="space-y-2">
              <label className="label text-xs" htmlFor="quick-input-text">
                Type naturally or paste forwarded SMS / WhatsApp message:
              </label>
              <textarea
                id="quick-input-text"
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. Paid 350 for coffee via GPay..."
                className="input text-xs w-full p-2.5 font-mono"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-gray-400 font-semibold">Try sample:</span>
                {SAMPLE_MESSAGES.map((msg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(msg)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200"
                  >
                    Sample {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Live NLP Parse Preview */}
            {parsed ? (
              <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    AI Parse Preview
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 uppercase">
                    {parsed.confidence} Match
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Amount</span>
                    <p className="font-black text-gray-900 dark:text-white text-base">
                      {formatCurrency(parsed.amount)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Type</span>
                    <p className="font-bold text-blue-600 capitalize">{parsed.type}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Category</span>
                    <p className="font-semibold text-gray-800 dark:text-slate-200">{parsed.categoryName}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Method</span>
                    <p className="font-semibold text-gray-800 dark:text-slate-200">{parsed.paymentMethodName}</p>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-slate-400 border-t border-blue-100 dark:border-blue-900/40 pt-2">
                  Note to log: <strong>"{parsed.note}"</strong>
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-center text-xs text-gray-400">
                Type an amount or paste an SMS message above to see instant AI extraction.
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-3">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={!parsed || saving}
                className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{saving ? 'Logging...' : 'Log into Ledger'}</span>
              </button>
            </div>
          </>
        ) : (
          /* Webhook Tab */
          <div className="space-y-3 text-xs">
            <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
              Connect a WhatsApp Business Webhook or Telegram Bot to automatically record expenses on the fly without opening the application:
            </p>

            <div className="p-3 rounded-xl bg-gray-900 text-emerald-400 font-mono text-[11px] flex items-center justify-between">
              <span className="truncate pr-2">
                POST {window.location.origin}/api/webhook/ingest
              </span>
              <button
                onClick={handleCopyWebhook}
                className="text-white hover:text-emerald-300 p-1 shrink-0"
                title="Copy Webhook Endpoint"
              >
                {copiedUrl ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-850 space-y-1.5">
              <span className="font-bold text-gray-800 dark:text-slate-200">How to configure:</span>
              <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-slate-400 text-[11px]">
                <li>Paste the webhook URL into your Telegram BotFather or Twilio / Meta WhatsApp webhook config.</li>
                <li>When you text <code className="bg-gray-200 dark:bg-slate-700 px-1 py-0.5 rounded">₹450 Swiggy</code> to the bot, it forwards the JSON payload.</li>
                <li>The server logs it into your private Supabase ledger and replies with your remaining daily allowance!</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
