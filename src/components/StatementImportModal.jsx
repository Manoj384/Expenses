import { useState } from 'react'
import Modal from './Modal'
import { parseBankStatementFile, parseBankSmsText } from '../utils/statementParser'
import { formatCurrency } from '../utils/formatCurrency'
import {
  Upload,
  FileSpreadsheet,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Lock,
  FileText,
  ShieldCheck,
  Copy,
} from 'lucide-react'

const BANK_PASSWORD_PATTERNS = [
  { bank: 'HDFC Bank', rule: 'Customer ID OR 8-digit DOB (DDMMYYYY) + First 4 letters of Name in CAPS', example: '12051996RAHU' },
  { bank: 'ICICI Bank', rule: 'First 4 letters of Name (lowercase) + DOB (DDMM)', example: 'rahu1205' },
  { bank: 'State Bank of India (SBI)', rule: 'Last 5 digits of Mobile No. + DOB (DDMMYY)', example: '98451120596' },
  { bank: 'Axis Bank', rule: 'First 4 letters of Name (UPPERCASE) + Last 4 digits of A/C Number', example: 'RAHU4921' },
  { bank: 'Kotak Mahindra Bank', rule: 'Your 9-digit NetBanking CRN Number', example: '948271039' },
  { bank: 'Bank of Baroda', rule: 'First 4 letters of Name (CAPS) + Last 4 digits of Mobile Number', example: 'RAHU8451' },
]

export default function StatementImportModal({ isOpen, onClose, onImportSuccess, categories = [], paymentMethods = [] }) {
  const [tab, setTab] = useState('excel') // 'excel', 'sms', or 'pdf_pwd'
  const [smsText, setSmsText] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  // Password generator helper state
  const [userName, setUserName] = useState('')
  const [userDob, setUserDob] = useState('')
  const [userMobile, setUserMobile] = useState('')
  const [userAcc, setUserAcc] = useState('')

  if (!isOpen) return null

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const buffer = evt.target?.result
      if (buffer) {
        const txns = await parseBankStatementFile(buffer)
        if (txns.length === 0) {
          setError('Could not detect transactions in this file. If this is a password-protected PDF/Excel, please check the PDF Decrypt tab.')
        } else {
          setParsedRows(txns)
        }
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleSmsParse = () => {
    if (!smsText.trim()) return
    setError('')
    const txns = parseBankSmsText(smsText)
    if (txns.length === 0) {
      setError('Could not parse transactions from the pasted SMS text.')
    } else {
      setParsedRows(txns)
    }
  }

  const handleSaveImport = async () => {
    if (parsedRows.length === 0) return
    setImporting(true)
    setError('')
    try {
      await onImportSuccess(parsedRows)
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to import transactions.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smart Statement & Bank SMS Parser" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => { setTab('excel'); setParsedRows([]) }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              tab === 'excel' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Upload Statement (.xlsx / .csv)
          </button>
          <button
            onClick={() => { setTab('sms'); setParsedRows([]) }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              tab === 'sms' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'
            }`}
          >
            <MessageSquare className="h-4 w-4 text-indigo-600" /> Paste Bank / UPI SMS
          </button>
          <button
            onClick={() => { setTab('pdf_pwd'); setParsedRows([]) }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              tab === 'pdf_pwd' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'
            }`}
          >
            <KeyRound className="h-4 w-4 text-amber-500" /> Bank PDF Passwords
          </button>
        </div>

        {/* Excel Tab */}
        {tab === 'excel' && (
          <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors">
            <Upload className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-800 dark:text-white mb-1">
              Select your Bank or Card Statement (HDFC, SBI, ICICI, OneCard, GPay)
            </p>
            <p className="text-[11px] text-gray-500 mb-3">Supports .xlsx, .xls, and .csv files</p>
            <label className="btn btn-primary text-xs cursor-pointer inline-flex items-center gap-1.5">
              <span>Choose Statement File</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* PDF Password Helper Tab */}
        {tab === 'pdf_pwd' && (
          <div className="space-y-4">
            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Indian Bank PDF Decryption Cheatsheet</p>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  Indian bank statements are password-protected using your KYC details. Use the cheatsheet below to open your monthly PDF statement before exporting to Excel/CSV.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
              {BANK_PASSWORD_PATTERNS.map((p) => (
                <div key={p.bank} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{p.bank}</span>
                    <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      Ex: {p.example}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.rule}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SMS Tab */}
        {tab === 'sms' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Paste your debit/credit SMS messages from HDFC, SBI, PhonePe, GPay, Paytm, etc. (multiple lines supported):
            </p>
            <textarea
              rows={4}
              placeholder={`Example:
Sent Rs. 420.00 to SWIGGY on 25-Sep-26 via UPI
Rs. 1,500.00 debited from HDFC Bank A/c for SHELL PETROL
INR 3,200.00 credited to account towards Salary Bonus`}
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              className="input font-mono text-xs"
            />
            <button
              onClick={handleSmsParse}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" /> Parse Transactions
            </button>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                ✓ Detected {parsedRows.length} Transactions with Auto-Categorization
              </strong>
            </div>

            <div className="max-h-48 overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-xl divide-y divide-gray-100 text-xs">
              {parsedRows.slice(0, 10).map((r, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white block">{r.description}</span>
                    <span className="text-[11px] text-gray-400">{r.date} • Suggested: <strong>{r.suggested_category}</strong></span>
                  </div>
                  <strong className={`font-bold ${r.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                  </strong>
                </div>
              ))}
              {parsedRows.length > 10 && (
                <p className="text-[11px] text-gray-500 text-center py-2">+ {parsedRows.length - 10} more transactions</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="btn btn-secondary text-xs">Cancel</button>
              <button
                onClick={handleSaveImport}
                disabled={importing}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                {importing ? 'Importing...' : `Import All ${parsedRows.length} Transactions`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
