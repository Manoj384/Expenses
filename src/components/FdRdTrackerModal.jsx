import { useState, useMemo } from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate, today } from '../utils/dateUtils'
import {
  Shield,
  Plus,
  Trash2,
  Pencil,
  Clock,
  Sparkles,
  Building2,
  TrendingUp,
  Percent,
  CheckCircle2,
} from 'lucide-react'

const DEFAULT_FDS = [
  {
    id: 'fd-1',
    bank: 'HDFC Bank Fixed Deposit',
    type: 'FD',
    principal: 100000,
    interest_rate: 7.25,
    tenure_months: 12,
    start_date: '2026-01-15',
    maturity_date: '2027-01-15',
    compounding: 'quarterly',
  },
  {
    id: 'fd-2',
    bank: 'SBI Special Amrit Kalash FD',
    type: 'FD',
    principal: 50000,
    interest_rate: 7.6,
    tenure_months: 13,
    start_date: '2026-03-10',
    maturity_date: '2027-04-10',
    compounding: 'quarterly',
  },
]

export default function FdRdTrackerModal({ isOpen, onClose, onSaveToNetWorth }) {
  const [fds, setFds] = useState(() => {
    try {
      const saved = localStorage.getItem('ft_fd_rd_records')
      return saved ? JSON.parse(saved) : DEFAULT_FDS
    } catch {
      return DEFAULT_FDS
    }
  })

  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({
    bank: '',
    type: 'FD',
    principal: '',
    interest_rate: '7.25',
    tenure_months: '12',
    start_date: today(),
    compounding: 'quarterly',
  })

  const saveFds = (newFds) => {
    setFds(newFds)
    try {
      localStorage.setItem('ft_fd_rd_records', JSON.stringify(newFds))
    } catch {}
  }

  // Maturity calculation
  const fdCalculations = useMemo(() => {
    return fds.map(f => {
      const p = parseFloat(f.principal) || 0
      const r = (parseFloat(f.interest_rate) || 7) / 100
      const t = (parseFloat(f.tenure_months) || 12) / 12
      const n = f.compounding === 'quarterly' ? 4 : 1

      // Compound interest: A = P * (1 + r/n)^(n*t)
      const maturityAmount = Math.round(p * Math.pow(1 + r / n, n * t))
      const interestEarned = maturityAmount - p

      // Days to maturity
      const matDate = new Date(f.maturity_date || new Date().setMonth(new Date().getMonth() + (f.tenure_months || 12)))
      const diffDays = Math.ceil((matDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

      return {
        ...f,
        p,
        maturityAmount,
        interestEarned,
        diffDays,
      }
    })
  }, [fds])

  const totalPrincipal = fdCalculations.reduce((s, f) => s + f.p, 0)
  const totalMaturity = fdCalculations.reduce((s, f) => s + f.maturityAmount, 0)
  const totalInterest = totalMaturity - totalPrincipal

  if (!isOpen) return null

  const handleSaveFd = (e) => {
    e.preventDefault()
    const p = parseFloat(form.principal)
    if (!form.bank.trim() || !p || p <= 0) return

    const months = parseInt(form.tenure_months) || 12
    const start = new Date(form.start_date || today())
    const mat = new Date(start)
    mat.setMonth(mat.getMonth() + months)
    const maturity_date = mat.toISOString().slice(0, 10)

    if (editTarget) {
      const updated = fds.map(f =>
        f.id === editTarget.id
          ? {
              ...f,
              bank: form.bank.trim(),
              type: form.type,
              principal: p,
              interest_rate: parseFloat(form.interest_rate) || 7.25,
              tenure_months: months,
              start_date: form.start_date,
              maturity_date,
              compounding: form.compounding,
            }
          : f
      )
      saveFds(updated)
    } else {
      const newFd = {
        id: `fd_${Date.now()}`,
        bank: form.bank.trim(),
        type: form.type,
        principal: p,
        interest_rate: parseFloat(form.interest_rate) || 7.25,
        tenure_months: months,
        start_date: form.start_date,
        maturity_date,
        compounding: form.compounding,
      }
      saveFds([newFd, ...fds])
    }

    setShowAddModal(false)
    setEditTarget(null)
    setForm({ bank: '', type: 'FD', principal: '', interest_rate: '7.25', tenure_months: '12', start_date: today(), compounding: 'quarterly' })
  }

  const handleDelete = (id) => {
    const updated = fds.filter(f => f.id !== id)
    saveFds(updated)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fixed & Recurring Deposit (FD/RD) Tracker" maxWidth="max-w-3xl">
      <div className="space-y-6 text-xs text-gray-700 dark:text-slate-300">
        {/* Hero Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-teal-500/20 text-teal-300 text-xs px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-teal-400" />
              Guaranteed Fixed Return Assets
            </span>
            <h3 className="text-2xl font-black">{formatCurrency(totalPrincipal)} <span className="text-xs font-normal text-teal-200">Invested in FDs/RDs</span></h3>
            <p className="text-xs text-teal-200">
              Projected Maturity Value: <strong className="text-emerald-300 font-bold">{formatCurrency(totalMaturity)}</strong> (+{formatCurrency(totalInterest)} guaranteed interest)
            </p>
          </div>

          <button
            onClick={() => {
              setEditTarget(null)
              setForm({ bank: '', type: 'FD', principal: '', interest_rate: '7.25', tenure_months: '12', start_date: today(), compounding: 'quarterly' })
              setShowAddModal(true)
            }}
            className="btn-primary bg-teal-600 hover:bg-teal-500 text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Deposit
          </button>
        </div>

        {/* FD List */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white">Active Deposits ({fds.length})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fdCalculations.map(fd => (
              <div
                key={fd.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        {fd.type} • {fd.interest_rate}% p.a.
                      </span>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-1">{fd.bank}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditTarget(fd)
                          setForm({
                            bank: fd.bank,
                            type: fd.type,
                            principal: String(fd.principal),
                            interest_rate: String(fd.interest_rate),
                            tenure_months: String(fd.tenure_months),
                            start_date: fd.start_date,
                            compounding: fd.compounding || 'quarterly',
                          })
                          setShowAddModal(true)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(fd.id)} className="p-1 text-gray-400 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-gray-400">Principal Amount</span>
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(fd.p)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400">Maturity Value</span>
                      <p className="font-bold text-emerald-600">{formatCurrency(fd.maturityAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Matures: {formatDate(fd.maturity_date)}</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${fd.diffDays <= 30 ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>
                    {fd.diffDays > 0 ? `In ${fd.diffDays} days` : 'Matured'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add / Edit Sub-modal */}
        {showAddModal && (
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-xs text-gray-900 dark:text-white">{editTarget ? 'Edit Deposit' : 'Add New FD / RD'}</h4>
            <form onSubmit={handleSaveFd} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Bank & Scheme Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank FD"
                    value={form.bank}
                    onChange={(e) => setForm({ ...form, bank: e.target.value })}
                    className="input-field text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="label">Deposit Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input-field text-xs font-semibold"
                  >
                    <option value="FD">Fixed Deposit (FD)</option>
                    <option value="RD">Recurring Deposit (RD)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label">Principal (₹) *</label>
                  <input
                    type="number"
                    value={form.principal}
                    onChange={(e) => setForm({ ...form, principal: e.target.value })}
                    className="input-field text-xs font-bold"
                    placeholder="100000"
                    required
                  />
                </div>
                <div>
                  <label className="label">Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="0.05"
                    value={form.interest_rate}
                    onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                    className="input-field text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="label">Tenure (Months) *</label>
                  <input
                    type="number"
                    value={form.tenure_months}
                    onChange={(e) => setForm({ ...form, tenure_months: e.target.value })}
                    className="input-field text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">{editTarget ? 'Save' : 'Add Deposit'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-5">Done</button>
        </div>
      </div>
    </Modal>
  )
}
