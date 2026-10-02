import { useState } from 'react'
import Modal from './Modal'
import { parseBankSms } from '../utils/smsParser'
import { formatCurrency } from '../utils/formatCurrency'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  Smartphone,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
} from 'lucide-react'

const SAMPLE_SMS = `Sent Rs.450.00 from HDFC Bank A/C XX4921 to Swiggy on 28-SEP-26 via UPI Ref 6271928371.
INR 1,299.00 debited from ICICI Bank A/C XX1234 on 28-SEP-26. Info: Amazon Pay India.
Dear SBI UPI User, A/C 9876 debited by 320.0 on 28-Sep-26 trf to Blinkit Grocery Ref 491029.
Salary of INR 85,000.00 credited to HDFC Bank A/C XX4921 on 28-SEP-26 by INFOSYS TECH LTD.`

export default function SmsUpiParserModal({ isOpen, onClose, onTransactionsImported }) {
  const { user } = useAuth()
  const [rawText, setRawText] = useState('')
  const [parsedItems, setParsedItems] = useState([])
  const [importing, setImporting] = useState(false)
  const [successCount, setSuccessCount] = useState(null)
  const [error, setError] = useState('')

  const handleParse = () => {
    setError('')
    const results = parseBankSms(rawText)
    if (results.length === 0) {
      setError('No valid bank/UPI SMS formats detected. Try pasting standard debit/credit SMS messages.')
    }
    setParsedItems(results)
  }

  const handleLoadSample = () => {
    setRawText(SAMPLE_SMS)
    const results = parseBankSms(SAMPLE_SMS)
    setParsedItems(results)
  }

  const handleToggleSelect = (id) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item))
  }

  const handleFieldChange = (id, field, value) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleImport = async () => {
    const selected = parsedItems.filter(i => i.selected)
    if (selected.length === 0) return

    setImporting(true)
    setError('')
    try {
      // Fetch or auto-resolve category and payment method IDs
      let categoryMap = {}
      let paymentMethodsList = []
      if (user) {
        const [catsRes, pmsRes] = await Promise.all([
          supabase.from('categories').select('id, name, type').eq('user_id', user.id),
          supabase.from('payment_methods').select('id, name, type').eq('user_id', user.id),
        ])
        if (catsRes.data) {
          catsRes.data.forEach(c => { categoryMap[c.name.toLowerCase()] = c.id })
        }
        paymentMethodsList = pmsRes.data || []
      }

      const rowsToInsert = selected.map(item => {
        const matchedCatId = categoryMap[item.category.toLowerCase()] || null
        let pmId = null
        if (paymentMethodsList.length > 0) {
          const pmName = item.source?.toLowerCase().includes('upi') || item.source?.toLowerCase().includes('pay') ? 'upi' : 'bank'
          const matchedPm = paymentMethodsList.find(p => p.name.toLowerCase().includes(pmName) || p.type.toLowerCase().includes(pmName))
          pmId = matchedPm?.id || paymentMethodsList[0]?.id || null
        }

        return {
          user_id: user?.id,
          amount: parseFloat(item.amount),
          type: item.type,
          category_id: matchedCatId,
          payment_method_id: pmId,
          note: `${item.merchant} (${item.source})`,
          date: item.date,
        }
      })

      if (user) {
        const { error: insErr } = await supabase.from('transactions').insert(rowsToInsert)
        if (insErr) throw insErr
        window.dispatchEvent(new CustomEvent('transaction-updated'))
      }

      setSuccessCount(rowsToInsert.length)
      if (onTransactionsImported) onTransactionsImported()
      setTimeout(() => {
        setSuccessCount(null)
        setParsedItems([])
        setRawText('')
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to import transactions to database.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smart SMS & UPI Transaction Parser" maxWidth="max-w-4xl">
      <div className="space-y-5">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-300">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Instant Bank SMS & UPI Importer</h4>
              <p className="text-xs text-blue-200">
                Paste bank alerts (HDFC, ICICI, SBI, Axis, GPay, PhonePe). AI auto-categorizes merchants!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs bg-white/10 hover:bg-white/20 text-blue-200 font-semibold px-3 py-1.5 rounded-lg border border-white/10 transition-all shrink-0"
          >
            Load Sample SMS
          </button>
        </div>

        {error && <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-lg">{error}</div>}
        {successCount !== null && (
          <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Successfully imported {successCount} transaction{successCount > 1 ? 's' : ''}!
          </div>
        )}

        {/* Input box */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
            Paste Bank SMS Messages (One or multiple)
          </label>
          <textarea
            rows="4"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="e.g. Sent Rs.450.00 from HDFC Bank A/C XX4921 to Swiggy on 28-SEP-26 via UPI..."
            className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>

          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-slate-400">
              Matches debited, credited, INR amounts, and merchant names.
            </span>
            <button
              type="button"
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Parse SMS
            </button>
          </div>
        </div>

        {/* Parsed Preview Table */}
        {parsedItems.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Extracted Transactions ({parsedItems.filter(i => i.selected).length} selected)
              </h5>
              <button
                type="button"
                onClick={() => {
                  const allSelected = parsedItems.every(i => i.selected)
                  setParsedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })))
                }}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                {parsedItems.every(i => i.selected) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="p-2.5 w-8 text-center">✓</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Merchant / Beneficiary</th>
                    <th className="p-2.5">Category Auto-Tag</th>
                    <th className="p-2.5">Source</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedItems.map((item) => (
                    <tr key={item.id} className={item.selected ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 opacity-60'}>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded text-blue-600"
                        />
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">{item.date}</td>
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{item.merchant}</td>
                      <td className="p-2.5">
                        <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">{item.source}</td>
                      <td className={`p-2.5 text-right font-black ${item.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary text-xs px-4 py-2">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || parsedItems.filter(i => i.selected).length === 0}
                className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {importing ? 'Importing...' : `Import ${parsedItems.filter(i => i.selected).length} Transactions`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
