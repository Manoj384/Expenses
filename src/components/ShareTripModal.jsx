import { useState } from 'react'
import Modal from './Modal'
import {
  Share2,
  Copy,
  Check,
  Send,
  Lock,
  QrCode,
  Sparkles,
  ExternalLink,
  Target,
} from 'lucide-react'
import { getShareUrl } from '../features/splitwise/api/sharedTripService'

export default function ShareTripModal({ isOpen, onClose, group, onUpdateBudget }) {
  const [copied, setCopied] = useState(false)
  const [tripBudget, setTripBudget] = useState(group?.budget ? String(group.budget) : '')
  const [savingBudget, setSavingBudget] = useState(false)
  const [budgetSaved, setBudgetSaved] = useState(false)

  if (!group) return null

  const shareToken = group.share_token || 'pending'
  const shareUrl = getShareUrl(shareToken)

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {}
  }

  const handleSaveBudget = (e) => {
    e.preventDefault()
    if (onUpdateBudget) {
      setSavingBudget(true)
      onUpdateBudget(parseFloat(tripBudget) || 0)
      setSavingBudget(false)
      setBudgetSaved(true)
      setTimeout(() => setBudgetSaved(false), 2500)
    }
  }

  const whatsappText = encodeURIComponent(
    `Hey guys! Here is our shared trip expenses ledger for ${group.icon || '🏖️'} ${group.name}:\n${shareUrl}\n\nAnyone with this link can view the split balances, add new expenses, and edit receipts!`
  )
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappText}`

  // Simple clean SVG QR Code representation with deep link
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share Trip: ${group.icon || '🏖️'} ${group.name}`} size="md">
      <div className="space-y-4 text-xs">
        {/* Privacy Assurance Banner */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300">
          <Lock className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-0.5">
            <h5 className="font-bold text-[11px] uppercase tracking-wider">Group-Isolated Sharing</h5>
            <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-200">
              Anyone with this link can <strong>only view and edit this specific group ({group.name})</strong>.
              Your other groups, personal bank accounts, salaries, and private expenses remain 100% hidden and protected.
            </p>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-1.5">
          <label className="label">Public Trip Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="input-field text-xs font-mono bg-gray-50 dark:bg-slate-800/80 select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white'
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons: WhatsApp & Test Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>Share via WhatsApp</span>
          </a>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-xl font-bold flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Preview Trip Link</span>
          </a>
        </div>

        {/* Quick QR Code for In-Person Phone Scans */}
        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-white p-1 border border-gray-200 shrink-0">
            <img
              src={qrSvgUrl}
              alt="QR Code"
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
          <div>
            <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-blue-600" />
              <span>Scan to Join on Phone</span>
            </h5>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              Friends can point their mobile camera at this QR code to instantly open the trip ledger without logging in.
            </p>
          </div>
        </div>

        {/* Optional Trip Budget Configuration */}
        <form onSubmit={handleSaveBudget} className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="label flex items-center gap-1.5 mb-0">
              <Target className="h-3.5 w-3.5 text-purple-600" />
              <span>Trip Budget (Optional)</span>
            </label>
            {budgetSaved && <span className="text-[10px] text-emerald-600 font-bold">Saved!</span>}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 50000"
                value={tripBudget}
                onChange={(e) => setTripBudget(e.target.value)}
                className="input-field text-xs pl-7"
              />
            </div>
            <button
              type="submit"
              disabled={savingBudget}
              className="btn-secondary text-xs px-3 font-bold shrink-0"
            >
              {savingBudget ? 'Saving...' : 'Set Budget'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400">
            Everyone in this trip will see a visual progress gauge comparing total group spend against this budget.
          </p>
        </form>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
