import { useState } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { downloadBackupFile } from '../utils/offlineStorage'
import pastExpenses from '../data/past_expenses.json'
import savedGrowwData from '../data/groww_holdings.json'
import defaultSips from '../data/default_sips.json'
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react'

export default function DataBackupModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInputText, setDeleteInputText] = useState('')
  const [purgingData, setPurgingData] = useState(false)

  if (!isOpen) return null

  const handlePurgeAllData = async () => {
    if (deleteInputText.trim().toUpperCase() !== 'DELETE') {
      toastError('Please type DELETE to confirm data erasure.')
      return
    }
    if (!user) {
      toastError('You must be signed in to manage cloud data.')
      return
    }
    setPurgingData(true)
    try {
      await Promise.all([
        supabase.from('transactions').delete().eq('user_id', user.id),
        supabase.from('mutual_funds').delete().eq('user_id', user.id),
        supabase.from('debts').delete().eq('user_id', user.id),
        supabase.from('sips').delete().eq('user_id', user.id),
        supabase.from('goals').delete().eq('user_id', user.id),
        supabase.from('budgets').delete().eq('user_id', user.id),
      ])
      toastSuccess('All personal financial records have been permanently wiped.')
      setShowDeleteConfirm(false)
      setDeleteInputText('')
      onClose()
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      toastError(err?.message || 'Failed to erase records.')
    } finally {
      setPurgingData(false)
    }
  }

  const handleExportAll = async () => {
    setExporting(true)
    try {
      let txns = []
      let mfs = savedGrowwData
      let debts = []
      let sips = defaultSips
      let goals = []
      let budgets = []

      if (user) {
        const [txRes, mfRes, debtRes, sipRes, goalRes, budRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('mutual_funds').select('*').eq('user_id', user.id),
          supabase.from('debts').select('*').eq('user_id', user.id),
          supabase.from('sips').select('*').eq('user_id', user.id),
          supabase.from('goals').select('*').eq('user_id', user.id),
          supabase.from('budgets').select('*').eq('user_id', user.id),
        ])

        if (txRes.data) txns = txRes.data
        if (mfRes.data && mfRes.data.length > 0) mfs = mfRes.data
        if (debtRes.data) debts = debtRes.data
        if (sipRes.data && sipRes.data.length > 0) sips = sipRes.data
        if (goalRes.data) goals = goalRes.data
        if (budRes.data) budgets = budRes.data
      }

      const backupData = {
        version: '1.1',
        exportedAt: new Date().toISOString(),
        user_email: user?.email || 'local_user',
        stats: {
          transactions_count: txns.length,
          past_expenses_count: pastExpenses.length,
          mutual_funds_count: mfs.length,
          sips_count: sips.length,
          debts_count: debts.length,
          goals_count: goals.length,
        },
        data: {
          transactions: txns,
          past_expenses: pastExpenses,
          mutual_funds: mfs,
          sips: sips,
          debts: debts,
          goals: goals,
          budgets: budgets,
        },
      }

      const filename = `FinanceTracker_Backup_${new Date().toISOString().slice(0, 10)}.json`
      downloadBackupFile(backupData, filename)
      toastSuccess(`Full database backup downloaded (${filename})!`)
      onClose()
    } catch {
      toastError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const chunkArray = (arr, size = 50) => {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_BACKUP_SIZE = 15 * 1024 * 1024 // 15MB
    if (file.size <= 0 || file.size > MAX_BACKUP_SIZE) {
      toastError('Backup file must be between 1 byte and 15 MB.')
      return
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      toastError('Please select a valid JSON backup file (.json).')
      return
    }

    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result
        if (!text || typeof text !== 'string') throw new Error('File content is empty.')
        const json = JSON.parse(text)
        if (!json || typeof json !== 'object' || !json.data || typeof json.data !== 'object') {
          throw new Error('Invalid backup file format: missing "data" collection.')
        }

        if (user) {
          const stats = []

          // 1. Restore transactions
          if (Array.isArray(json.data.transactions) && json.data.transactions.length > 0) {
            const txns = json.data.transactions.map(({ created_at, ...t }) => ({
              ...t,
              user_id: user.id,
            }))
            for (const chunk of chunkArray(txns)) {
              const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'id' })
              if (error) console.warn('Transaction batch error:', error)
            }
            stats.push(`${txns.length} transactions`)
          }

          // 2. Restore mutual funds
          if (Array.isArray(json.data.mutual_funds) && json.data.mutual_funds.length > 0) {
            const mfs = json.data.mutual_funds.map(({ created_at, ...m }) => ({
              ...m,
              user_id: user.id,
            }))
            for (const chunk of chunkArray(mfs)) {
              const { error } = await supabase.from('mutual_funds').upsert(chunk, { onConflict: 'id' })
              if (error) console.warn('Mutual fund batch error:', error)
            }
            stats.push(`${mfs.length} funds`)
          }

          // 3. Restore SIPs
          if (Array.isArray(json.data.sips) && json.data.sips.length > 0) {
            const sips = json.data.sips.map(({ created_at, fund_id, ...s }) => ({
              ...s,
              user_id: user.id,
            }))
            for (const chunk of chunkArray(sips)) {
              const { error } = await supabase.from('sips').upsert(chunk, { onConflict: 'id' })
              if (error) console.warn('SIP batch error:', error)
            }
            stats.push(`${sips.length} SIPs`)
          }

          // 4. Restore Debts
          if (Array.isArray(json.data.debts) && json.data.debts.length > 0) {
            const debts = json.data.debts.map(({ created_at, ...d }) => ({
              ...d,
              user_id: user.id,
            }))
            for (const chunk of chunkArray(debts)) {
              const { error } = await supabase.from('debts').upsert(chunk, { onConflict: 'id' })
              if (error) console.warn('Debt batch error:', error)
            }
            stats.push(`${debts.length} debts`)
          }

          // 5. Restore Goals
          if (Array.isArray(json.data.goals) && json.data.goals.length > 0) {
            const goals = json.data.goals.map(({ created_at, notes, description, ...g }) => ({
              ...g,
              user_id: user.id,
            }))
            for (const chunk of chunkArray(goals)) {
              const { error } = await supabase.from('goals').upsert(chunk, { onConflict: 'id' })
              if (error) console.warn('Goal batch error:', error)
            }
            stats.push(`${goals.length} goals`)
          }

          // 6. Restore Budgets
          if (Array.isArray(json.data.budgets) && json.data.budgets.length > 0) {
            const budgets = json.data.budgets.map(({ created_at, ...b }) => ({
              ...b,
              user_id: user.id,
            }))
            for (const chunk of chunkArray(budgets)) {
              const { error } = await supabase.from('budgets').upsert(chunk, { onConflict: 'id' })
              if (error) console.warn('Budget batch error:', error)
            }
            stats.push(`${budgets.length} budgets`)
          }

          const summary = stats.length > 0 ? stats.join(', ') : 'all records'
          toastSuccess(`Successfully restored ${summary}!`)
        } else {
          toastSuccess('Offline backup file validated successfully.')
        }

        onClose()
      } catch (err) {
        toastError(err?.message || 'Failed to parse backup JSON file.')
      } finally {
        setImporting(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Data Backup & Disaster Recovery">
      <div className="space-y-5 text-xs">
        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 flex items-start gap-2.5">
          <Database className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold mb-0.5">100% Data Safety & Portability</strong>
            Download a portable, self-contained JSON file containing your complete financial history, past expenses, Groww mutual funds, SIPs, debts, and goals.
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Download Backup */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 font-bold text-gray-900">
                <Download className="h-4 w-4 text-emerald-600" /> Export Full Backup
              </div>
              <p className="text-gray-500 mb-3">Save a complete snapshot to your computer.</p>
            </div>
            <button
              onClick={handleExportAll}
              disabled={exporting}
              className="btn btn-primary text-xs w-full flex items-center justify-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'Generating...' : 'Download JSON'}
            </button>
          </div>

          {/* Restore Backup */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 font-bold text-gray-900">
                <Upload className="h-4 w-4 text-indigo-600" /> Restore from JSON
              </div>
              <p className="text-gray-500 mb-3">Import a previous backup snapshot.</p>
            </div>
            <label className="btn btn-secondary text-xs w-full flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>{importing ? 'Restoring...' : 'Select Backup File'}</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>

        {/* Data Retention & Privacy (Delete My Data) */}
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/40 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
                <Trash2 className="h-4 w-4" /> Data Retention & Account Data Wipe
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-[11px] mt-1">
                Permanently purge all your transactions, mutual funds, SIPs, debts, goals, and budgets from the cloud.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2.5 py-1 whitespace-nowrap font-bold"
            >
              {showDeleteConfirm ? 'Cancel' : 'Delete All Data'}
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="pt-3 border-t border-rose-200 dark:border-rose-900/60 space-y-2">
              <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                ⚠️ This action is irreversible. Type <span className="font-mono font-black text-rose-900 dark:text-rose-200">DELETE</span> below to confirm permanent wipeout:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deleteInputText}
                  onChange={(e) => setDeleteInputText(e.target.value)}
                  placeholder="Type DELETE"
                  className="input-field text-xs py-1.5 px-3 max-w-xs uppercase font-mono bg-white"
                />
                <button
                  type="button"
                  onClick={handlePurgeAllData}
                  disabled={deleteInputText.trim().toUpperCase() !== 'DELETE' || purgingData}
                  className="btn btn-xs bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 font-bold whitespace-nowrap"
                >
                  {purgingData ? 'Purging...' : 'Confirm Wipeout'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn btn-secondary text-xs">Close</button>
        </div>
      </div>
    </Modal>
  )
}
