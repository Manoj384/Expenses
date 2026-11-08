import { useState, useMemo } from 'react'
import Modal from './Modal'
import {
  parseItemizedBillText,
  calculateItemizedFriendSplits,
  generateWhatsAppUpiLink,
} from '../utils/itemizedBillOcr'
import { formatCurrency } from '../utils/formatCurrency'
import {
  Receipt,
  Users,
  Plus,
  Trash2,
  Share2,
  Check,
  Send,
  Sparkles,
  Camera,
  FileText,
} from 'lucide-react'

const SAMPLE_BILL = `Social Cafe & Bar
1x Truffle Fries 350.00
2x Paneer Tikka 640.00
1x Veg Biryani 420.00
3x Fresh Lime Soda 360.00
1x Brownie with Ice Cream 280.00
CGST 2.5% 51.25
SGST 2.5% 51.25
Service Charge 10% 205.00
Total Amount 2357.50`

export default function ItemizedBillSplitterModal({ isOpen = true, onClose = () => {}, isEmbedded = false }) {
  const [billText, setBillText] = useState(SAMPLE_BILL)
  const [friendsList, setFriendsList] = useState(['You', 'Rahul', 'Sneha', 'Vikram'])
  const [newFriendInput, setNewFriendInput] = useState('')
  const [billTitle, setBillTitle] = useState('Dinner at Social')
  const [upiId, setUpiId] = useState('manoj@upi')
  const [activeStep, setActiveStep] = useState(1) // 1: items & friends, 2: split summary

  const parsedBill = useMemo(() => {
    return parseItemizedBillText(billText)
  }, [billText])

  const [assignedMap, setAssignedMap] = useState({})

  // Toggle friend assignment to a specific dish
  const toggleFriendOnItem = (itemId, friend) => {
    setAssignedMap(prev => {
      const current = prev[itemId] || []
      const exists = current.includes(friend)
      const updated = exists ? current.filter(f => f !== friend) : [...current, friend]
      return { ...prev, [itemId]: updated }
    })
  }

  const handleAddFriend = (e) => {
    e.preventDefault()
    const trimmed = newFriendInput.trim()
    if (trimmed && !friendsList.includes(trimmed)) {
      setFriendsList([...friendsList, trimmed])
      setNewFriendInput('')
    }
  }

  const handleRemoveFriend = (friend) => {
    setFriendsList(friendsList.filter(f => f !== friend))
  }

  // Build items with assignment
  const enrichedItems = useMemo(() => {
    return parsedBill.items.map(it => ({
      ...it,
      assignedFriends: assignedMap[it.id] || [],
    }))
  }, [parsedBill.items, assignedMap])

  const splits = useMemo(() => {
    return calculateItemizedFriendSplits({
      items: enrichedItems,
      tax: parsedBill.tax,
      serviceCharge: parsedBill.serviceCharge,
      friends: friendsList,
    })
  }, [enrichedItems, parsedBill.tax, parsedBill.serviceCharge, friendsList])

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isEmbedded={isEmbedded} title="Itemized Bill Splitter & UPI Collector" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full font-bold ${activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600'}`}>
              1. Assign Dishes
            </span>
            <span className="text-gray-400">→</span>
            <span className={`px-2.5 py-1 rounded-full font-bold ${activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600'}`}>
              2. Settle & Collect UPI
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep(activeStep === 1 ? 2 : 1)}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              {activeStep === 1 ? 'Preview Splits →' : '← Back to Dishes'}
            </button>
          </div>
        </div>

        {activeStep === 1 ? (
          <>
            {/* Friends Bar */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  Friends at the Table ({friendsList.length}):
                </span>
                <form onSubmit={handleAddFriend} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Add name..."
                    value={newFriendInput}
                    onChange={(e) => setNewFriendInput(e.target.value)}
                    className="input py-1 px-2 text-xs w-28"
                  />
                  <button type="submit" className="btn-secondary py-1 px-2 text-xs font-bold">
                    <Plus className="h-3 w-3" />
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {friendsList.map(friend => (
                  <span
                    key={friend}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-slate-200 shadow-2xs"
                  >
                    <span>{friend}</span>
                    {friend !== 'You' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(friend)}
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Bill Dishes List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {parsedBill.items.map((item) => {
                const assigned = assignedMap[item.id] || []
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {assigned.length > 0
                          ? `Split ${assigned.length} ways (${formatCurrency(item.price / assigned.length)} each)`
                          : 'Tap friends who shared this dish:'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {friendsList.map(f => {
                        const isSelected = assigned.includes(f)
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => toggleFriendOnItem(item.id, f)}
                            className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 inline mr-1" />}
                            {f}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bill Summary Totals */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
              <div>
                <span className="text-gray-500">Subtotal:</span> <strong className="text-gray-800 dark:text-white">{formatCurrency(parsedBill.subtotal)}</strong>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-gray-500">Tax/GST:</span> <strong className="text-gray-800 dark:text-white">{formatCurrency(parsedBill.tax)}</strong>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-gray-500">Service:</span> <strong className="text-gray-800 dark:text-white">{formatCurrency(parsedBill.serviceCharge)}</strong>
              </div>
              <div className="text-base font-black text-gray-900 dark:text-white">
                Total: {formatCurrency(parsedBill.total)}
              </div>
            </div>
          </>
        ) : (
          /* Step 2: Final Settlement & 1-Click WhatsApp Collection */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs" htmlFor="bill-title-input">Bill Title</label>
                <input
                  id="bill-title-input"
                  type="text"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  className="input py-1 px-2 text-xs"
                />
              </div>
              <div>
                <label className="label text-xs" htmlFor="upi-id-input">Your UPI ID (For Direct Payments)</label>
                <input
                  id="upi-id-input"
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank"
                  className="input py-1 px-2 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              {splits.map(s => {
                const isYou = s.name === 'You'
                const waLink = generateWhatsAppUpiLink({
                  friendName: s.name,
                  amount: s.finalShare,
                  upiId,
                  billTitle,
                })

                return (
                  <div
                    key={s.name}
                    className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{s.name}</span>
                        {isYou && <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">You Paid</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Food: {formatCurrency(s.itemsTotal)} + Tax/Tip: {formatCurrency(s.proportionalTax + s.proportionalService)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(s.finalShare)}
                      </span>

                      {!isYou && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          title="Send pre-filled WhatsApp message with 1-tap UPI payment"
                        >
                          <Send className="h-3 w-3" />
                          <span>Collect via UPI</span>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-4">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
