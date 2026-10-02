import { useState, useRef } from 'react'
import Modal from './Modal'
import {
  Sparkles,
  UploadCloud,
  FileText,
  Check,
  RefreshCw,
  AlertCircle,
  Key,
  Calendar,
  Tag,
  Store,
  Camera,
  ListOrdered,
} from 'lucide-react'
import { scanReceiptWithAi, getGeminiApiKey, setGeminiApiKey } from '../utils/aiService'
import { formatCurrency } from '../utils/formatCurrency'

export default function AiReceiptScannerModal({ isOpen, onClose, onApplyExtracted }) {
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [apiKey, setApiKey] = useState(getGeminiApiKey())

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setError('')
    setScanResult(null)
    setFile(selected)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result
      setPreviewUrl(base64)
      await performScan(base64, selected.type || 'image/jpeg')
    }
    reader.readAsDataURL(selected)
  }

  const performScan = async (base64, mimeType) => {
    setIsScanning(true)
    setError('')
    try {
      const result = await scanReceiptWithAi(base64, mimeType)
      setScanResult(result)
    } catch (err) {
      setError(err?.message || 'Failed to scan receipt. Please enter details manually.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleApply = () => {
    if (!scanResult) return
    onApplyExtracted({
      amount: scanResult.amount || '',
      date: scanResult.date || '',
      note: scanResult.merchant ? `${scanResult.merchant}${scanResult.note ? ` - ${scanResult.note}` : ''}` : (scanResult.note || ''),
      category: scanResult.category || '',
      payment_method: scanResult.payment_method || '',
      previewUrl,
      file,
    })
    handleClose()
  }

  const handleClose = () => {
    setFile(null)
    setPreviewUrl('')
    setScanResult(null)
    setError('')
    onClose()
  }

  const isPdf = previewUrl.startsWith('data:application/pdf') || file?.name?.endsWith('.pdf')

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="AI Bill & Receipt Vision Scanner">
      <div className="space-y-4 text-xs">
        {/* Banner */}
        <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white flex-shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-gray-900 dark:text-white">
              Instant OCR Bill & Receipt Vision Extraction
            </h4>
            <p className="text-gray-600 dark:text-slate-300">
              Snap a picture or upload an invoice. AI will automatically extract the store, amount, date, and individual items.
            </p>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!previewUrl ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/50 flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
                <Camera className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                📸 Snap with Camera
              </p>
              <p className="text-[11px] text-gray-400">
                Direct mobile / webcam receipt snap
              </p>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50 flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-2xl">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                📁 Upload Photo or PDF
              </p>
              <p className="text-[11px] text-gray-400">
                PNG, JPG, WebP, PDF (Max 5MB)
              </p>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-slate-950 flex items-center justify-center max-h-48">
              {isPdf ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-300">
                  <FileText className="h-12 w-12 text-rose-500 mb-2" />
                  <span className="text-xs font-mono">{file?.name}</span>
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Receipt Preview"
                  className="max-h-48 object-contain w-full"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Change Bill Image / Document
            </button>
          </div>
        )}

        {/* Scanning State */}
        {isScanning && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                Reading bill with Vision AI...
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Detecting total amount, merchant, and line items
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Extracted Details Preview */}
        {scanResult && !isScanning && (
          <div className="p-3.5 bg-emerald-50/60 dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-slate-700 pb-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" /> Extracted Bill Summary
              </span>
              {scanResult.confidence && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  {scanResult.confidence}% confidence
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <Store className="h-3 w-3" /> Merchant / Store
                </span>
                <p className="font-bold text-gray-900 dark:text-white">
                  {scanResult.merchant || 'Unknown Merchant'}
                </p>
              </div>

              <div>
                <span className="text-gray-400 dark:text-slate-400 text-[11px]">
                  Total Amount
                </span>
                <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                  {formatCurrency(scanResult.amount || 0)}
                </p>
              </div>

              <div>
                <span className="text-gray-400 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <Calendar className="h-3 w-3" /> Date
                </span>
                <p className="font-medium text-gray-800 dark:text-slate-200">
                  {scanResult.date || 'Today'}
                </p>
              </div>

              <div>
                <span className="text-gray-400 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                  <Tag className="h-3 w-3" /> Category
                </span>
                <p className="font-medium text-gray-800 dark:text-slate-200">
                  {scanResult.category || 'Expense'}
                </p>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            {Array.isArray(scanResult.items) && scanResult.items.length > 0 && (
              <div className="pt-2 border-t border-emerald-200/50 dark:border-slate-700 space-y-1.5">
                <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                  <ListOrdered className="h-3 w-3 text-blue-600" /> Itemized Breakdown ({scanResult.items.length} items):
                </span>
                <div className="max-h-32 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700 border border-gray-100 dark:border-slate-700 rounded-lg p-1.5 bg-white dark:bg-slate-900 text-[11px]">
                  {scanResult.items.map((it, idx) => (
                    <div key={idx} className="py-1 flex items-center justify-between">
                      <span className="truncate max-w-[180px] font-medium text-gray-800 dark:text-slate-200">
                        {it.name || `Item #${idx + 1}`}
                      </span>
                      <strong className="text-gray-900 dark:text-white font-mono">
                        {formatCurrency(it.price || 0)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Key settings toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 font-medium"
          >
            <Key className="h-3 w-3" /> {getGeminiApiKey() ? 'API Key Configured (Click to edit)' : 'Configure Free Gemini API Key'}
          </button>

          {showKeyInput && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-2 border border-gray-200 dark:border-slate-700">
              <input
                type="password"
                placeholder="Enter Gemini API Key (Free)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-field text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  setGeminiApiKey(apiKey)
                  setShowKeyInput(false)
                }}
                className="btn-primary text-xs py-1 px-3 font-semibold"
              >
                Save Key
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary flex-1 py-2 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!scanResult}
            onClick={handleApply}
            className="btn-primary flex-1 py-2 text-xs font-bold disabled:opacity-50 shadow-xs"
          >
            Auto-fill Details into Form
          </button>
        </div>
      </div>
    </Modal>
  )
}
