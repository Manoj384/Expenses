import { useState, useRef } from 'react'
import Modal from './Modal'
import * as pdfjsLib from 'pdfjs-dist'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import confetti from 'canvas-confetti'
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Building2,
} from 'lucide-react'

// Configure PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export default function BankStatementImportModal({ isOpen, onClose, onTransactionsImported }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [parsing, setParsing] = useState(false)
  const [parsedRows, setParsedRows] = useState([])
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setError(null)
    setParsing(true)
    setParsedRows([])
    setSelectedIndices(new Set())

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let rows = []

      if (ext === 'pdf') {
        rows = await parsePdfStatement(file)
      } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        rows = await parseExcelStatement(file)
      } else {
        throw new Error('Please upload a valid PDF, Excel (.xlsx, .xls) or CSV statement.')
      }

      if (rows.length === 0) {
        throw new Error('No transactions found in this statement. Please check the file format.')
      }

      setParsedRows(rows)
      setSelectedIndices(new Set(rows.map((_, i) => i)))
    } catch (err) {
      setError(err.message || 'Failed to parse bank statement.')
    } finally {
      setParsing(false)
    }
  }

  // Parse PDF Statement
  const parsePdfStatement = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => item.str).join(' ')
      fullText += pageText + '\n'
    }

    return extractTransactionsFromText(fullText)
  }

  // Parse Excel / CSV Statement
  const parseExcelStatement = async (file) => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    const rows = []
    for (const r of json) {
      if (!r || r.length < 3) continue
      const rowStr = r.join(' ')
      const tx = parseTransactionLine(rowStr)
      if (tx) rows.push(tx)
    }

    return rows
  }

  // Extract from raw PDF text using regex pattern matching
  const extractTransactionsFromText = (text) => {
    const lines = text.split(/[\r\n]+/)
    const transactions = []

    for (const line of lines) {
      const tx = parseTransactionLine(line)
      if (tx) transactions.push(tx)
    }

    return transactions
  }

  // Universal Transaction Line Parser for Indian Banks (HDFC, SBI, ICICI, Axis, Kotak)
  const parseTransactionLine = (line) => {
    if (!line || line.length < 10) return null

    // Date regex: DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
    const dateMatch = line.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/)
    if (!dateMatch) return null

    let [_, d, m, y] = dateMatch
    if (y.length === 2) y = '20' + y
    const formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`

    // Find amounts (numbers with decimal points or comma thousands)
    const amounts = line.match(/\b(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2}\b/g)
    if (!amounts || amounts.length === 0) return null

    const numAmounts = amounts.map(a => parseFloat(a.replace(/,/g, ''))).filter(n => n > 0)
    if (numAmounts.length === 0) return null

    // Primary amount is usually first or second float
    const amount = numAmounts[0]

    // Determine type: check for "CR", "Credit", "Salary", "Refund", "Deposit"
    const lower = line.toLowerCase()
    const isIncome = lower.includes('cr') || lower.includes('credit') || lower.includes('salary') || lower.includes('interest paid') || lower.includes('refund')
    const type = isIncome ? 'income' : 'expense'

    // Clean Narration / Description
    let narration = line
      .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, '')
      .replace(/\b(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2}\b/g, '')
      .replace(/\b(dr|cr|upi|imps|neft|pos|inb|transfer)\b/gi, '')
      .replace(/[^a-zA-Z0-9\s/&@.-]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')

    if (!narration || narration.length < 3) narration = 'Bank Transaction'
    narration = narration.slice(0, 40)

    // Category auto-matching
    let category = 'Other'
    if (type === 'income') {
      category = 'Salary'
    } else if (lower.includes('swiggy') || lower.includes('zomato') || lower.includes('restaurant') || lower.includes('food')) {
      category = 'Food & Dining'
    } else if (lower.includes('uber') || lower.includes('ola') || lower.includes('fuel') || lower.includes('petrol')) {
      category = 'Fuel & Transport'
    } else if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('myntra')) {
      category = 'Shopping'
    } else if (lower.includes('electricity') || lower.includes('bescom') || lower.includes('airtel') || lower.includes('jio')) {
      category = 'Utilities'
    } else if (lower.includes('apollo') || lower.includes('pharmacy') || lower.includes('hospital')) {
      category = 'Healthcare'
    }

    return {
      date: formattedDate,
      amount,
      type,
      note: narration,
      category,
    }
  }

  // Toggle selection
  const toggleRow = (index) => {
    const next = new Set(selectedIndices)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelectedIndices(next)
  }

  const toggleAll = () => {
    if (selectedIndices.size === parsedRows.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(parsedRows.map((_, i) => i)))
    }
  }

  // Save selected transactions to Supabase
  const handleImport = async () => {
    if (selectedIndices.size === 0 || !user) return

    try {
      setIsSaving(true)

      const [catsRes, pmsRes] = await Promise.all([
        supabase.from('categories').select('id, name, type').eq('user_id', user.id),
        supabase.from('payment_methods').select('id, name').eq('user_id', user.id),
      ])

      const defaultCat = catsRes.data?.[0]?.id || null
      const defaultPm = (pmsRes.data || []).find(p => p.name.toLowerCase().includes('bank'))?.id || pmsRes.data?.[0]?.id || null

      const transactionsToInsert = Array.from(selectedIndices).map(idx => {
        const row = parsedRows[idx]
        const matchedCat = (catsRes.data || []).find(c => c.name.toLowerCase().includes(row.category.toLowerCase()))?.id || defaultCat

        return {
          user_id: user.id,
          amount: row.amount,
          type: row.type,
          note: `🏦 Bank: ${row.note}`,
          date: row.date,
          category_id: matchedCat,
          payment_method_id: defaultPm,
        }
      })

      const { error: insertErr } = await supabase.from('transactions').insert(transactionsToInsert)
      if (insertErr) throw insertErr

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      } catch {}

      if (onTransactionsImported) onTransactionsImported()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to import transactions')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🏦 Bank Statement Auto-Import (PDF / Excel / CSV)" maxWidth="max-w-4xl">
      <div className="space-y-4 text-xs">
        {/* Dropzone */}
        {parsedRows.length === 0 && !parsing && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-sm">
              <Building2 className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Upload Bank Statement (PDF, Excel, or CSV)
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md">
              Automatically parses and categorizes transactions from SBI, HDFC, ICICI, Axis, Kotak, and other Indian banks.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Select Bank Statement File
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Loading Spinner */}
        {parsing && (
          <div className="p-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <span className="font-bold text-indigo-700 dark:text-indigo-300">
              Parsing {fileName}… extracting all debit/credit rows…
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Parsed Transactions Preview Table */}
        {parsedRows.length > 0 && !parsing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-gray-900 dark:text-white">
                  Found {parsedRows.length} transactions ({selectedIndices.size} selected)
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                {selectedIndices.size === parsedRows.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
              {parsedRows.map((row, idx) => {
                const isSelected = selectedIndices.has(idx)
                return (
                  <div
                    key={idx}
                    onClick={() => toggleRow(idx)}
                    className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-blue-50/40 dark:bg-blue-950/20'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(idx)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                          {row.note}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {row.date} • <span className="text-blue-500">{row.category}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 font-bold">
                      {row.type === 'income' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                          +₹{row.amount.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center">
                          -₹{row.amount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setParsedRows([])
                  setSelectedIndices(new Set())
                }}
                className="btn-secondary text-xs"
              >
                Upload Different File
              </button>

              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isSaving || selectedIndices.size === 0}
                  className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Import {selectedIndices.size} Transactions</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
