import { useState, useRef } from 'react'
import Modal from './Modal'
import { createWorker } from 'tesseract.js'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import confetti from 'canvas-confetti'
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  Sparkles,
  Calendar,
  Tag,
  CreditCard,
  Trash2,
} from 'lucide-react'

// Common merchant pattern recognition for Indian receipts
const COMMON_MERCHANTS = [
  'Swiggy', 'Zomato', 'Starbucks', 'McDonald', 'KFC', 'Domino', 'Subway', 'Pizza Hut',
  'D-Mart', 'DMart', 'Reliance Fresh', 'BigBasket', 'Blinkit', 'Zepto', 'Instamart', 'Nature Basket',
  'Shell', 'HPCL', 'BPCL', 'Indian Oil', 'Fuel', 'Petrol',
  'Apollo Pharmacy', 'MedPlus', 'Pharmeasy', 'Netmeds',
  'Amazon', 'Flipkart', 'Myntra', 'Zara', 'H&M', 'Decathlon',
  'Uber', 'Ola', 'Rapido', 'MakeMyTrip', 'IRCTC', 'IndiGo',
  'Cult.fit', 'Urban Company', 'Netflix', 'Spotify', 'Airtel', 'Jio'
]

export default function ReceiptScannerModal({ isOpen, onClose, onTransactionCreated }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  // Extracted transaction draft
  const [form, setForm] = useState({
    amount: '',
    merchant: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'Food & Dining',
    paymentMethod: 'UPI / GPay',
    rawText: '',
  })

  if (!isOpen) return null

  // Handle Image Selection
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setScanComplete(false)
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result)
      runOcr(file)
    }
    reader.readAsDataURL(file)
  }

  // Run Tesseract OCR on the image
  const runOcr = async (imageSource) => {
    setIsScanning(true)
    setOcrProgress(10)
    setOcrStatus('Initializing OCR engine…')

    try {
      const worker = await createWorker('eng')
      setOcrProgress(40)
      setOcrStatus('Extracting receipt text…')

      const ret = await worker.recognize(imageSource)
      const text = ret.data.text
      setOcrProgress(80)
      setOcrStatus('Analyzing total, merchant & date…')

      await worker.terminate()

      // Parse fields from OCR text
      const parsed = parseReceiptText(text)
      setForm({
        amount: parsed.amount || '',
        merchant: parsed.merchant || 'Retail Merchant',
        date: parsed.date || new Date().toISOString().slice(0, 10),
        category: parsed.category || 'Food & Dining',
        paymentMethod: parsed.paymentMethod || 'UPI / GPay',
        rawText: text,
      })

      setOcrProgress(100)
      setOcrStatus('Receipt scanned successfully!')
      setScanComplete(true)
    } catch (err) {
      setError('Could not scan receipt. Please try another image or enter manually.')
    } finally {
      setIsScanning(false)
    }
  }

  // Intelligent text parser for receipts
  const parseReceiptText = (rawText) => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

    // 1. Merchant Detection
    let matchedMerchant = ''
    for (const line of lines.slice(0, 8)) {
      for (const cm of COMMON_MERCHANTS) {
        if (line.toLowerCase().includes(cm.toLowerCase())) {
          matchedMerchant = cm
          break
        }
      }
      if (matchedMerchant) break
    }
    if (!matchedMerchant && lines.length > 0) {
      matchedMerchant = lines[0].replace(/[^a-zA-Z0-9\s&]/g, '').slice(0, 25).trim()
    }

    // 2. Amount Detection: search for lines with total / amount / net / subtotal or highest currency match
    let detectedAmount = ''
    const amountRegexes = [
      /(?:total|grand\s*total|net\s*amount|bill\s*amount|amount\s*paid|subtotal)[\s:₹Rs.]*([\d,]+(?:\.\d{2})?)/i,
      /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{2})?)/i,
    ]

    for (const regex of amountRegexes) {
      const match = rawText.match(regex)
      if (match && match[1]) {
        const cleanAmt = match[1].replace(/,/g, '')
        if (!isNaN(cleanAmt) && Number(cleanAmt) > 0) {
          detectedAmount = cleanAmt
          break
        }
      }
    }

    // Fallback: Find highest number in the lower half of receipt
    if (!detectedAmount) {
      const numbers = rawText.match(/\b\d+(?:\.\d{2})?\b/g) || []
      const validNumbers = numbers
        .map(n => parseFloat(n))
        .filter(n => !isNaN(n) && n > 10 && n < 100000 && n !== 2024 && n !== 2025 && n !== 2026)
      if (validNumbers.length > 0) {
        detectedAmount = String(Math.max(...validNumbers))
      }
    }

    // 3. Date Detection
    let detectedDate = ''
    const dateMatch = rawText.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/)
    if (dateMatch) {
      let [_, d, m, y] = dateMatch
      if (y.length === 2) y = '20' + y
      const day = d.padStart(2, '0')
      const month = m.padStart(2, '0')
      detectedDate = `${y}-${month}-${day}`
    }

    // 4. Category Mapping
    let category = 'Food & Dining'
    const lower = rawText.toLowerCase()
    if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel') || lower.includes('shell') || lower.includes('hpcl')) {
      category = 'Fuel & Transport'
    } else if (lower.includes('pharmacy') || lower.includes('apollo') || lower.includes('medicine') || lower.includes('hospital')) {
      category = 'Healthcare'
    } else if (lower.includes('dmart') || lower.includes('supermarket') || lower.includes('grocer') || lower.includes('blinkit') || lower.includes('zepto')) {
      category = 'Groceries'
    } else if (lower.includes('cinema') || lower.includes('pvr') || lower.includes('movie') || lower.includes('netflix')) {
      category = 'Entertainment'
    } else if (lower.includes('uber') || lower.includes('ola') || lower.includes('flight') || lower.includes('irctc')) {
      category = 'Travel'
    }

    return {
      amount: detectedAmount,
      merchant: matchedMerchant || 'Scanned Merchant',
      date: detectedDate || new Date().toISOString().slice(0, 10),
      category,
      paymentMethod: 'UPI / GPay'
    }
  }

  // Save parsed receipt into Supabase
  const handleSaveTransaction = async (e) => {
    e.preventDefault()
    if (!form.amount || !user) return

    try {
      setIsSaving(true)

      const [catsRes, pmsRes] = await Promise.all([
        supabase.from('categories').select('id, name, type').eq('user_id', user.id),
        supabase.from('payment_methods').select('id, name').eq('user_id', user.id),
      ])

      const matchedCat = (catsRes.data || []).find(c => c.name.toLowerCase().includes(form.category.toLowerCase())) || catsRes.data?.[0]
      const matchedPm = (pmsRes.data || []).find(pm => pm.name.toLowerCase().includes(form.paymentMethod.toLowerCase())) || pmsRes.data?.[0]

      const { error: insertErr } = await supabase.from('transactions').insert({
        user_id: user.id,
        amount: parseFloat(form.amount),
        type: 'expense',
        note: `📸 Receipt: ${form.merchant}`,
        date: form.date,
        category_id: matchedCat?.id || null,
        payment_method_id: matchedPm?.id || null,
      })

      if (insertErr) throw insertErr

      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } })
      } catch {}

      if (onTransactionCreated) onTransactionCreated()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save expense')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📸 AI Receipt & Bill OCR Scanner" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Upload Zone */}
        {!imagePreview && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-400/50 dark:border-blue-500/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-all shadow-sm">
              <Camera className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Take Photo or Upload Receipt Image
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm">
              Supports restaurant bills, grocery slips, fuel receipts, and e-invoices (PNG, JPG, WebP).
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5">
                <UploadCloud className="h-3.5 w-3.5" />
                Select Receipt Image
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}

        {/* OCR Scanning Progress */}
        {isScanning && (
          <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>{ocrStatus}</span>
              </div>
              <span className="font-mono font-bold text-blue-600">{ocrProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Scan Results & Extracted Form */}
        {imagePreview && !isScanning && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Preview */}
            <div className="rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden bg-slate-950 relative max-h-72 flex items-center justify-center">
              <img
                src={imagePreview}
                alt="Receipt Preview"
                className="max-h-72 w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null)
                  setScanComplete(false)
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs backdrop-blur-sm"
                title="Scan another receipt"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Extracted Editable Draft Form */}
            <form onSubmit={handleSaveTransaction} className="space-y-3 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs pb-1">
                <Sparkles className="h-4 w-4" />
                <span>Extracted Receipt Telemetry:</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 block mb-1">
                  Total Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 1450"
                  className="input-field text-sm font-bold text-blue-600 dark:text-blue-400 w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 block mb-1">
                  Merchant / Vendor
                </label>
                <input
                  type="text"
                  required
                  value={form.merchant}
                  onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                  placeholder="e.g. Starbucks / Swiggy"
                  className="input-field text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input-field text-xs w-full"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-field text-xs w-full"
                  >
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Fuel & Transport">Fuel & Transport</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Utilities">Utilities</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !form.amount}
                  className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Save to Expenses</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  )
}
