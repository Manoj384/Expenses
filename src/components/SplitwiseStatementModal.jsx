import React from 'react'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/dateUtils'
import { Printer, Download, Users, Receipt, CheckCircle2, ArrowRight } from 'lucide-react'

export default function SplitwiseStatementModal({ isOpen, onClose, group, balanceDetails }) {
  if (!group) return null

  const { totalSpend = 0, netBalances = {}, debts = [] } = balanceDetails || {}
  const members = group.members || []
  const expenses = group.expenses || []
  const settlements = group.settlements || []

  // Compute individual paid totals
  const memberPaidTotals = {}
  const memberOwedTotals = {}
  members.forEach(m => {
    memberPaidTotals[m.id] = 0
    memberOwedTotals[m.id] = 0
  })

  expenses.forEach(exp => {
    if (exp.payer_mode === 'multiple' && exp.paid_by && typeof exp.paid_by === 'object') {
      Object.entries(exp.paid_by).forEach(([pId, amt]) => {
        if (memberPaidTotals[pId] !== undefined) memberPaidTotals[pId] += Number(amt) || 0
      })
    } else if (exp.paid_by_id && memberPaidTotals[exp.paid_by_id] !== undefined) {
      memberPaidTotals[exp.paid_by_id] += Number(exp.amount) || 0
    }

    Object.entries(exp.shares || {}).forEach(([mId, share]) => {
      if (memberOwedTotals[mId] !== undefined) memberOwedTotals[mId] += Number(share) || 0
    })
  })

  const handlePrint = () => {
    window.print()
  }

  const handleExportCsv = () => {
    let csv = `Group Name:,"${group.name.replace(/"/g, '""')}"\n`
    csv += `Description:,"${(group.description || '').replace(/"/g, '""')}"\n`
    csv += `Total Spend:,"${totalSpend}"\n`
    csv += `Generated On:,"${new Date().toLocaleString()}"\n\n`

    // Section 1: Member Summary
    csv += `--- MEMBER SUMMARY ---\n`
    csv += `Member,Total Paid,Total Share (Owed),Net Balance,Status\n`
    members.forEach(m => {
      const paid = memberPaidTotals[m.id] || 0
      const share = memberOwedTotals[m.id] || 0
      const net = netBalances[m.id] || 0
      const status = net > 0.5 ? `Gets back ${net}` : net < -0.5 ? `Owes ${Math.abs(net)}` : 'Settled'
      csv += `"${m.name.replace(/"/g, '""')}",${paid},${share},${net},"${status}"\n`
    })
    csv += `\n`

    // Section 2: Itemized Expenses
    csv += `--- ITEMIZED EXPENSES ---\n`
    csv += `Date,Expense Title,Total Amount,Paid By,Split Mode,${members.map(m => `Share: ${m.name}`).join(',')}\n`
    expenses.forEach(exp => {
      let paidByStr = ''
      if (exp.payer_mode === 'multiple' && exp.paid_by) {
        paidByStr = Object.entries(exp.paid_by)
          .map(([pId, amt]) => {
            const payerName = members.find(m => m.id === pId)?.name || pId
            return `${payerName} (₹${amt})`
          })
          .join(' + ')
      } else {
        paidByStr = members.find(m => m.id === exp.paid_by_id)?.name || 'Unknown'
      }

      const sharesArr = members.map(m => exp.shares?.[m.id] || 0)
      csv += `"${exp.date}","${exp.title.replace(/"/g, '""')}",${exp.amount},"${paidByStr}","${exp.split_type || 'equal'}",${sharesArr.join(',')}\n`
    })
    csv += `\n`

    // Section 3: Settlements
    csv += `--- RECORDED SETTLEMENTS ---\n`
    csv += `Date,From,To,Amount\n`
    settlements.forEach(s => {
      const from = members.find(m => m.id === s.from_id)?.name || s.from_id
      const to = members.find(m => m.id === s.to_id)?.name || s.to_id
      csv += `"${s.date || ''}","${from}","${to}",${s.amount}\n`
    })
    csv += `\n`

    // Section 4: Settlement Routes
    csv += `--- OUTSTANDING SETTLEMENT DIRECTIONS ---\n`
    csv += `From (Debtor),To (Creditor),Amount\n`
    debts.forEach(d => {
      csv += `"${d.from.name}","${d.to.name}",${d.amount}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Ledger_Statement.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Statement & Itemized Trip Ledger" size="2xl">
      <div className="space-y-6 text-xs print:p-0">
        {/* Top Header Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              {group.name}
            </h3>
            {group.description && <p className="text-xs text-gray-500">{group.description}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Group Financial KPI summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">Total Group Spend</span>
            <span className="text-xl font-black text-blue-950 dark:text-blue-100">{formatCurrency(totalSpend)}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50">
            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Total Expenses</span>
            <span className="text-xl font-black text-purple-950 dark:text-purple-100">{expenses.length} Records</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Group Members</span>
            <span className="text-xl font-black text-emerald-950 dark:text-emerald-100">{members.length} Members</span>
          </div>
        </div>

        {/* Member Balances Breakdown Table */}
        <div className="space-y-2">
          <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
            1. Member Spend & Net Balance Summary
          </h4>
          <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 font-bold border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="p-2.5">Member</th>
                  <th className="p-2.5 text-right">Total Paid Upfront</th>
                  <th className="p-2.5 text-right">Total Share (Owed)</th>
                  <th className="p-2.5 text-right">Net Balance Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {members.map(m => {
                  const paid = memberPaidTotals[m.id] || 0
                  const share = memberOwedTotals[m.id] || 0
                  const net = netBalances[m.id] || 0
                  const isPositive = net > 0.5
                  const isNegative = net < -0.5

                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 font-bold text-gray-900 dark:text-white">{m.name}</td>
                      <td className="p-2.5 text-right font-semibold text-gray-700 dark:text-slate-300">{formatCurrency(paid)}</td>
                      <td className="p-2.5 text-right text-gray-500">{formatCurrency(share)}</td>
                      <td className="p-2.5 text-right font-bold">
                        <span className={`px-2 py-0.5 rounded-lg text-xs ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : isNegative
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isPositive ? `+${formatCurrency(net)} (Gets back)` : isNegative ? `-${formatCurrency(Math.abs(net))} (Owes)` : 'Settled'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Simplified Settlement Routes */}
        <div className="space-y-2">
          <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
            2. Simplified Dues Settlement Plan
          </h4>
          {debts.length === 0 ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>All members are fully settled! No payments required.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {debts.map((d, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-rose-600 dark:text-rose-400">{d.from.name}</strong>
                    <span className="text-gray-400">pays</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{d.to.name}</strong>
                  </div>
                  <strong className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(d.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Itemized Expense Ledger */}
        <div className="space-y-2">
          <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
            3. Itemized Expense Log ({expenses.length})
          </h4>
          <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-500 font-bold sticky top-0 border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Title</th>
                  <th className="p-2.5">Paid By</th>
                  <th className="p-2.5">Split Strategy</th>
                  <th className="p-2.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {expenses.map(exp => {
                  let payerText = ''
                  if (exp.payer_mode === 'multiple' && exp.paid_by) {
                    payerText = Object.entries(exp.paid_by)
                      .map(([pId, amt]) => {
                        const mName = members.find(m => m.id === pId)?.name || pId
                        return `${mName}: ${formatCurrency(amt)}`
                      })
                      .join(', ')
                  } else {
                    payerText = members.find(m => m.id === exp.paid_by_id)?.name || 'Unknown'
                  }

                  return (
                    <tr key={exp.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 text-gray-500 whitespace-nowrap">{formatDate(exp.date)}</td>
                      <td className="p-2.5 font-bold text-gray-900 dark:text-white">{exp.title}</td>
                      <td className="p-2.5 text-gray-700 dark:text-slate-300">{payerText}</td>
                      <td className="p-2.5 uppercase font-semibold text-[10px] text-blue-600">{exp.split_type || 'equal'}</td>
                      <td className="p-2.5 text-right font-extrabold text-gray-900 dark:text-white">{formatCurrency(exp.amount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">Close</button>
        </div>
      </div>
    </Modal>
  )
}
