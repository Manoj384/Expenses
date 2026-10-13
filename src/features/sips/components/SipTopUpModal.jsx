import Modal from '../../../components/Modal'
import { formatCurrency } from '../../../utils/formatCurrency'
import { Zap, Sparkles } from 'lucide-react'

export default function SipTopUpModal({
  topUpTarget,
  onClose,
  topUpForm,
  setTopUpForm,
  handleSaveTopUp,
  topUpErr,
  topUpSaving,
  standardPaymentMethods,
}) {
  if (!topUpTarget) return null

  const liveNav = parseFloat(
    topUpTarget.mutual_funds?.current_nav || topUpTarget.mutual_funds?.avg_nav || 100
  )

  const estimatedUnits = Number(topUpForm.amount) > 0 && liveNav > 0
    ? (Number(topUpForm.amount) / liveNav).toFixed(3)
    : '0.000'

  return (
    <Modal
      isOpen={!!topUpTarget}
      onClose={onClose}
      title={`One-Time Top-Up — ${topUpTarget?.name || 'Fund'}`}
    >
      <form onSubmit={handleSaveTopUp} className="space-y-4">
        {topUpErr && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {topUpErr}
          </div>
        )}

        {/* Scheme & Live NAV Info Card */}
        <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Fund Scheme</span>
            <p className="font-bold text-gray-900 mt-0.5">{topUpTarget.name}</p>
            <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
              Regular Recurring: {formatCurrency(topUpTarget.amount)}/{topUpTarget.frequency}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Live NAV</span>
            <p className="font-mono font-bold text-emerald-800 text-sm mt-0.5">
              ₹{liveNav.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Top-Up Amount */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            One-Time Top-Up Amount (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              autoFocus
              placeholder="e.g. 5000"
              className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500"
              value={topUpForm.amount}
              onChange={(e) => setTopUpForm((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>
          {Number(topUpForm.amount) > 0 && (
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-700 font-medium px-1">
              <span>Estimated units to credit:</span>
              <span className="font-mono font-bold">+{estimatedUnits} units</span>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
          <select
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500"
            value={topUpForm.payment_method}
            onChange={(e) => setTopUpForm((p) => ({ ...p, payment_method: e.target.value }))}
          >
            {(standardPaymentMethods || []).map((pm) => (
              <option key={pm.id} value={pm.id}>{pm.name}</option>
            ))}
          </select>
        </div>

        {/* Date & Time (Auto-Recorded) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500"
              value={topUpForm.date}
              onChange={(e) => setTopUpForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
              <span>Time</span>
              <span className="text-[10px] text-emerald-600 font-normal">Auto-recorded</span>
            </label>
            <input
              type="time"
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 font-mono"
              value={topUpForm.time}
              onChange={(e) => setTopUpForm((p) => ({ ...p, time: e.target.value }))}
            />
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Reason (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Bonus lump-sum investment, Market dip buy"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500"
            value={topUpForm.notes}
            onChange={(e) => setTopUpForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </div>

        <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-700 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Note:</strong> This one-time top-up will buy units at the live NAV immediately without advancing your regular scheduled due date.
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={topUpSaving}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Zap className="h-4 w-4" />
            {topUpSaving ? 'Processing Top-Up...' : 'Confirm One-Time Top-Up'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
