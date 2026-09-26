import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Download,
  Trash2,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Eye,
  Database,
  Save,
} from 'lucide-react'
import { formatCurrency } from '../utils/formatCurrency'
import { parseStatementWithAi, getGeminiApiKey, setGeminiApiKey, getAiModel, setAiModel } from '../utils/aiService'
import { useToast } from '../context/ToastContext'

const STORAGE_KEY = 'ft_statement_transactions'

export default function Statements() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const fileInputRef = useRef(null)

  const [statementData, setStatementData] = useState(() => {
    try {
      const key = user?.id ? `ft_statement_transactions_${user.id}` : STORAGE_KEY
      const saved = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [selectedFileName, setSelectedFileName] = useState('')
  const [selectedFileSize, setSelectedFileSize] = useState('')
  const [filePreview, setFilePreview] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSavingToDb, setIsSavingToDb] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey())
  const [selectedModel, setSelectedModel] = useState(getAiModel())

  // Re-sync storage when user changes
  useEffect(() => {
    const key = user?.id ? `ft_statement_transactions_${user.id}` : STORAGE_KEY
    try {
      const saved = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setStatementData(JSON.parse(saved))
      }
    } catch {}
  }, [user])

  // Save to active local storage
  useEffect(() => {
    const key = user?.id ? `ft_statement_transactions_${user.id}` : STORAGE_KEY
    try {
      localStorage.setItem(key, JSON.stringify(statementData))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statementData))
    } catch {}
  }, [statementData, user])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFileName(file.name)
    setSelectedFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB')

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = reader.result
      setFilePreview(base64Data)
      setIsProcessing(true)

      try {
        const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
        const results = await parseStatementWithAi(base64Data, mimeType, file.name, statementData)

        if (Array.isArray(results) && results.length > 0) {
          const timestamp = Date.now()
          const formatted = results.map((item, idx) => ({
            id: `stmt_${timestamp}_${idx}`,
            date: item.date || new Date().toISOString().slice(0, 10),
            description: item.description || 'Unknown Transaction',
            category: item.category || 'General',
            amount: Number(item.amount) || 0,
            type: item.type === 'credit' ? 'credit' : 'debit',
            payment_method: item.payment_method || (file.name.toLowerCase().includes('onecard') ? 'OneCard' : 'Credit Card'),
            source_file: file.name,
          }))

          // Smart Deduplication Key: date + amount + description snippet
          const existingKeys = new Set(
            statementData.map((r) => `${r.date}_${r.amount}_${(r.description || '').trim().toLowerCase().slice(0, 25)}`)
          )

          const newUniqueRows = formatted.filter(
            (r) => !existingKeys.has(`${r.date}_${r.amount}_${(r.description || '').trim().toLowerCase().slice(0, 25)}`)
          )

          if (newUniqueRows.length > 0) {
            setStatementData((prev) => [...newUniqueRows, ...prev])
            const skipped = formatted.length - newUniqueRows.length
            if (skipped > 0) {
              addToast(`Extracted ${formatted.length} transactions (${newUniqueRows.length} new added, ${skipped} existing duplicates skipped)!`, 'success')
            } else {
              addToast(`Successfully extracted all ${formatted.length} transactions from ${file.name}!`, 'success')
            }
          } else {
            addToast(`All ${formatted.length} transactions from this statement are already present in your table. No duplicates added.`, 'info')
          }
        } else {
          addToast('Could not find transactions in this document. Try a clearer image or PDF.', 'warning')
        }
      } catch (err) {
        if (err?.message?.includes('MISSING_API_KEY')) {
          setShowApiKeyModal(true)
          addToast('Please enter your Gemini API Key to enable AI statement parsing on this domain.', 'warning')
        } else {
          addToast(err?.message || 'Failed to parse statement. Check API key or format.', 'error')
        }
      } finally {
        setIsProcessing(false)
      }
    }

    reader.readAsDataURL(file)
  }

  const handleContinueExtraction = async () => {
    if (!filePreview) {
      fileInputRef.current?.click()
      return
    }

    setIsProcessing(true)
    try {
      const mimeType = selectedFileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
      const results = await parseStatementWithAi(filePreview, mimeType, selectedFileName, statementData)

      if (Array.isArray(results) && results.length > 0) {
        const timestamp = Date.now()
        const formatted = results.map((item, idx) => ({
          id: `stmt_cont_${timestamp}_${idx}`,
          date: item.date || new Date().toISOString().slice(0, 10),
          description: item.description || 'Unknown Transaction',
          category: item.category || 'General',
          amount: Number(item.amount) || 0,
          type: item.type === 'credit' ? 'credit' : 'debit',
          payment_method: item.payment_method || (selectedFileName.toLowerCase().includes('onecard') ? 'OneCard' : 'Credit Card'),
          source_file: selectedFileName,
        }))

        const existingKeys = new Set(
          statementData.map((r) => `${r.date}_${r.amount}_${(r.description || '').trim().toLowerCase().slice(0, 25)}`)
        )

        const newUniqueRows = formatted.filter(
          (r) => !existingKeys.has(`${r.date}_${r.amount}_${(r.description || '').trim().toLowerCase().slice(0, 25)}`)
        )

        if (newUniqueRows.length > 0) {
          setStatementData((prev) => [...newUniqueRows, ...prev])
          addToast(`Extracted ${newUniqueRows.length} additional transactions!`, 'success')
        } else {
          addToast('No new transactions found in subsequent pages.', 'info')
        }
      }
    } catch (err) {
      if (err?.message?.includes('MISSING_API_KEY')) {
        setShowApiKeyModal(true)
        addToast('Please enter your Gemini API Key to continue AI extraction.', 'warning')
      } else {
        addToast(err?.message || 'Failed to continue extraction.', 'error')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteRow = (id) => {
    setStatementData((prev) => prev.filter((item) => item.id !== id))
    addToast('Transaction removed from statement table', 'info')
  }

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all extracted statement transactions?')) {
      setStatementData([])
      setSelectedFileName('')
      setFilePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      addToast('Statement records cleared', 'info')
    }
  }

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput)
    setAiModel(selectedModel)
    setShowApiKeyModal(false)
    addToast(apiKeyInput ? `AI Key saved for ${selectedModel}!` : 'AI Key removed. Using offline parser.', 'success')
  }

  const handleExportCSV = () => {
    if (statementData.length === 0) {
      addToast('No statement data to export', 'warning')
      return
    }

    const headers = ['Date', 'Description / Narration', 'Category', 'Type', 'Amount (INR)', 'Payment Method / Card', 'Source File']
    const csvRows = [headers.join(',')]

    statementData.forEach((row) => {
      const values = [
        `"${row.date || ''}"`,
        `"${(row.description || '').replace(/"/g, '""')}"`,
        `"${row.category || ''}"`,
        `"${row.type || 'debit'}"`,
        row.amount || 0,
        `"${row.payment_method || ''}"`,
        `"${row.source_file || ''}"`,
      ]
      csvRows.push(values.join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `statement_ai_extracted_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('Statement exported to CSV successfully!', 'success')
  }

  const handleSaveAllToTransactions = async () => {
    if (!user) {
      addToast('Please log in to save transactions to your cloud database.', 'warning')
      return
    }
    if (statementData.length === 0) {
      addToast('No statement transactions to save.', 'info')
      return
    }

    setIsSavingToDb(true)
    try {
      // 1. Fetch user categories & payment methods
      const [catsRes, pmsRes] = await Promise.all([
        supabase.from('categories').select('id, name, type').eq('user_id', user.id),
        supabase.from('payment_methods').select('id, name').eq('user_id', user.id),
      ])

      const categories = catsRes.data || []
      const paymentMethods = pmsRes.data || []

      const getCategoryId = (catName, type) => {
        const match = categories.find(
          (c) => c.name.toLowerCase() === (catName || '').toLowerCase() && c.type === (type === 'credit' ? 'income' : 'expense')
        )
        if (match) return match.id
        const fallback = categories.find((c) => c.type === (type === 'credit' ? 'income' : 'expense'))
        return fallback?.id || null
      }

      const getPaymentMethodId = (methodName) => {
        const match = paymentMethods.find((p) => p.name.toLowerCase().includes((methodName || '').toLowerCase()))
        return match?.id || paymentMethods[0]?.id || null
      }

      const rowsToInsert = statementData.map((row) => ({
        user_id: user.id,
        date: row.date || new Date().toISOString().slice(0, 10),
        amount: Number(row.amount) || 0,
        type: row.type === 'credit' ? 'income' : 'expense',
        note: `${row.description || 'Statement Txn'}${row.source_file ? ` [${row.source_file}]` : ''}`,
        category_id: getCategoryId(row.category, row.type),
        payment_method_id: getPaymentMethodId(row.payment_method),
      }))

      const { error: insertErr } = await supabase.from('transactions').insert(rowsToInsert)
      if (insertErr) throw insertErr

      addToast(`🎉 Successfully saved all ${rowsToInsert.length} transactions to your Main Dashboard & Database!`, 'success')
    } catch (err) {
      addToast(err?.message || 'Failed to save transactions to cloud database.', 'error')
    } finally {
      setIsSavingToDb(false)
    }
  }

  // Filtered list
  const filteredData = statementData.filter((item) => {
    const matchesSearch =
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.payment_method || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' ? true : item.type === typeFilter
    return matchesSearch && matchesType
  })

  // Summary KPIs
  const totalDebits = statementData
    .filter((i) => i.type === 'debit')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  const totalCredits = statementData
    .filter((i) => i.type === 'credit')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  const netBalance = totalCredits - totalDebits

  return (
    <Layout title="Statements & Bill OCR">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                <Sparkles className="h-3.5 w-3.5 text-blue-300" />
                <span>AI Statement Multi-Transaction Extractor</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Bank & Card Statements (OneCard, HDFC, ICICI)
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Upload monthly card statements or bank PDFs & receipts. AI automatically detects dates, merchants, categories, and amounts, organizing them into an interactive standalone table.
              </p>
              {statementData.length > 0 && (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-400/30 mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{statementData.length} records saved & persisted</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-xs font-semibold text-white border border-white/20 transition-all shadow-sm"
              >
                <Key className="h-4 w-4 text-amber-300" />
                <span>{getGeminiApiKey() ? 'API Key Active (Gemini Free)' : 'Set Gemini Free Key'}</span>
              </button>

              {statementData.length > 0 && (
                <>
                  <button
                    onClick={handleSaveAllToTransactions}
                    disabled={isSavingToDb}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md"
                    title="Save all extracted statement transactions into your main Transactions table"
                  >
                    <Database className="h-4 w-4 text-indigo-200" />
                    <span>{isSavingToDb ? 'Saving to DB...' : 'Save to Main Dashboard'}</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            id="statementFileInput"
          />

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isProcessing
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 cursor-not-allowed'
                : 'border-gray-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-slate-800/40'
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <RefreshCw className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Extracting All Statement Transactions (65,536 Token Engine)...
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Reading {selectedFileName || 'document'} across all pages and parsing full transaction dates
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 py-2">
                <div className="p-4 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Drop your Bank or OneCard Statement PDF/Image here, or <span className="text-blue-600 dark:text-blue-400 underline">Browse</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    ⚡ High-Capacity 65K Token OCR • Multi-Month Full Parsing & Smart Duplicate Protection
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedFileName && !isProcessing && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/60 dark:bg-slate-800/60 rounded-2xl border border-blue-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-200">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="font-bold truncate max-w-xs">{selectedFileName}</span>
                <span className="text-gray-400">({selectedFileSize})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleContinueExtraction}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Scan Next Batch / Continue Remaining</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-gray-100 text-gray-700 dark:text-slate-200 text-xs font-semibold border border-gray-200 dark:border-slate-600 transition-colors"
                >
                  Choose Different File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Debited / Spent</span>
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
              {formatCurrency(totalDebits)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Total outflow detected</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Credits / Cashback</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalCredits)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Refunds & statement credits</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Detected Records</span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-gray-900 dark:text-white">
              {statementData.length}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Individual transactions parsed</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Statement Impact</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-xl font-extrabold ${netBalance >= 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
              {formatCurrency(Math.abs(netBalance))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {netBalance >= 0 ? 'Net positive inflow' : 'Net statement payable'}
            </p>
          </div>
        </div>

        {/* Filter and Action Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search merchant, category, card..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-800 p-1">
                {['all', 'debit', 'credit'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      typeFilter === type
                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {statementData.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                  title="Clear all extracted records"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Transactions Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Merchant / Narration</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Card / Method</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileSpreadsheet className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                        <p className="text-sm font-semibold">No transactions extracted yet</p>
                        <p className="text-xs">Upload a statement image or PDF above to view extracted items.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors text-gray-900 dark:text-slate-100"
                    >
                      <td className="py-3.5 px-4 font-mono text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                        {row.description}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 dark:text-slate-400">
                        {row.payment_method}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            row.type === 'credit'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          }`}
                        >
                          {row.type === 'credit' ? '+ Credit' : '- Debit'}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-extrabold whitespace-nowrap font-mono text-sm ${
                          row.type === 'credit'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Key & Model Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-gray-100 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                  <Key className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  AI Model & API Key Configuration
                </h3>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
              Use Google Gemini (Free / Pro) or OpenAI GPT-4o to scan statements and bank receipts.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                  AI Model / Tier
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (100% Free Tier)</option>
                  <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Pro Subscription / 2M Context)</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
                  <option value="gpt-4o">OpenAI GPT-4o (Pro Flagship)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200 block mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  placeholder={selectedModel.startsWith('gpt') ? 'sk-proj-...' : 'AIzaSy...'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={selectedModel.startsWith('gpt') ? 'https://platform.openai.com/api-keys' : 'https://aistudio.google.com/app/apikey'}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                {selectedModel.startsWith('gpt') ? 'Get OpenAI Key →' : 'Get Gemini Key →'}
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="btn-primary text-xs px-4 py-1.5 font-bold"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
