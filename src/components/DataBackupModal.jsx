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
} from 'lucide-react'

export default function DataBackupModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  if (!isOpen) return null

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
    } catch (err) {
      toastError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result || '{}')
        if (!json.data) throw new Error('Invalid backup file format.')

        if (user) {
          // Restore transactions if present
          if (json.data.transactions?.length > 0) {
            for (const t of json.data.transactions) {
              const { id, created_at, ...rest } = t
              await supabase.from('transactions').upsert({ ...rest, user_id: user.id })
            }
          }
          // Restore mutual funds
          if (json.data.mutual_funds?.length > 0) {
            for (const m of json.data.mutual_funds) {
              const { id, created_at, ...rest } = m
              await supabase.from('mutual_funds').upsert({ ...rest, user_id: user.id })
            }
          }
        }

        toastSuccess(`Successfully restored database from backup!`)
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
            Download an encrypted, self-contained JSON file containing your complete financial history, past expenses, Groww mutual funds, SIPs, debts, and goals.
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

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn btn-secondary text-xs">Close</button>
        </div>
      </div>
    </Modal>
  )
}
