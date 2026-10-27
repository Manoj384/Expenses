import React, { useState, useMemo } from 'react'
import Modal from './Modal'
import { Printer, Download, Users, FileText, X, ChevronRight, CheckCircle2 } from 'lucide-react'
import { formatSplitwiseCurrency } from '../utils/splitwiseVisuals'

export default function SplitwisePrintableSummaryModal({ isOpen, onClose, group }) {
  const [activeTab, setActiveTab] = useState('matrix') // 'matrix' | 'members'
  const [selectedMemberId, setSelectedMemberId] = useState('all')

  const members = group?.members || []
  const rawExpenses = group?.expenses || []

  // Ensure chronological order (oldest to newest for statement matrix)
  const sortedExpenses = useMemo(() => {
    return [...rawExpenses].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
  }, [rawExpenses])

  // Derive statement month & year from expenses or current date
  const statementPeriod = useMemo(() => {
    if (sortedExpenses.length > 0) {
      const d = new Date(sortedExpenses[0].date || Date.now())
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    }
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }, [sortedExpenses])

  // Helper to compute member's paid amount for an expense
  const getMemberPaidAmount = (exp, memberId) => {
    if (exp.payer_mode === 'multiple' && exp.paid_by) {
      return Number(exp.paid_by[memberId] || 0)
    }
    if (exp.paid_by_id === memberId) {
      return Number(exp.amount || 0)
    }
    return 0
  }

  // Helper to compute member's share for an expense
  const getMemberShareAmount = (exp, memberId) => {
    if (exp.shares && exp.shares[memberId] !== undefined) {
      return Number(exp.shares[memberId] || 0)
    }
    return 0
  }

  // Check if expense is a settlement payment
  const isSettlementExpense = (exp) => {
    return (
      exp.is_settlement === true ||
      exp.id?.startsWith('exp_settle') ||
      exp.title?.startsWith('🤝') ||
      exp.title?.toLowerCase().includes(' paid ')
    )
  }

  // Compute Net Balance per member across all expenses
  const memberBalances = useMemo(() => {
    const balances = {}
    const paidTotals = {}
    const shareTotals = {}

    members.forEach(m => {
      balances[m.id] = 0
      paidTotals[m.id] = 0
      shareTotals[m.id] = 0
    })

    sortedExpenses.forEach(exp => {
      const isSettle = isSettlementExpense(exp)
      members.forEach(m => {
        const paid = getMemberPaidAmount(exp, m.id)
        const share = getMemberShareAmount(exp, m.id)

        paidTotals[m.id] += paid
        shareTotals[m.id] += share

        if (isSettle) {
          // If member is payer of settlement, they credit back their debt (+paid)
          // If member is recipient of settlement, they debit (-share)
          balances[m.id] += (paid - share)
        } else {
          balances[m.id] += (paid - share)
        }
      })
    })

    return { balances, paidTotals, shareTotals }
  }, [members, sortedExpenses])

  // Print handler
  const handlePrint = () => {
    window.print()
  }

  // CSV export handler
  const handleExportCsv = () => {
    let csv = `Group:,"${group.name.replace(/"/g, '""')}"\n`
    csv += `Period:,"${statementPeriod}"\n\n`

    // Matrix Header
    csv += `Date,Description,Cost,${members.map(m => `"${m.name.replace(/"/g, '""')}"`).join(',')}\n`

    // Matrix Rows
    sortedExpenses.forEach(exp => {
      const expDate = new Date(exp.date || Date.now())
      const dateStr = `${expDate.toLocaleString('en-US', { month: 'short' })} ${expDate.getDate()}`
      const costStr = `INR${Number(exp.amount || 0).toFixed(2)}`

      const memberCols = members.map(m => {
        const paid = getMemberPaidAmount(exp, m.id)
        const share = getMemberShareAmount(exp, m.id)
        const net = paid - share
        if (Math.abs(net) < 0.01) return 'INR0.00'
        return net > 0 ? `INR${net.toFixed(2)}` : `-INR${Math.abs(net).toFixed(2)}`
      })

      csv += `"${dateStr}","${exp.title.replace(/"/g, '""')}",${costStr},${memberCols.join(',')}\n`
    })

    // Total row
    const totals = members.map(m => {
      const bal = memberBalances.balances[m.id] || 0
      if (bal > 0.05) return `"gets back INR${bal.toFixed(2)}"`
      if (bal < -0.05) return `"owes INR${Math.abs(bal).toFixed(2)}"`
      return '"settled up"'
    })
    csv += `\n"TOTAL BALANCE",,"",${totals.join(',')}\n`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Summary_${statementPeriod.replace(/ /g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen || !group) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="4xl">
      <div className="space-y-4 print:p-0">
        {/* Printable View Stylesheet */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #splitwise-printable-area, #splitwise-printable-area * {
              visibility: visible;
            }
            #splitwise-printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #fff !important;
              color: #000 !important;
              padding: 16px;
            }
            .no-print {
              display: none !important;
            }
            .page-break-after {
              page-break-after: always;
              break-after: page;
            }
          }
        `}</style>

        {/* Modal Header & Navigation Bar */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{group.icon || '✈️'}</span>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {group.name} — Printable Summary
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {statementPeriod} • {members.length} members • {sortedExpenses.length} expenses recorded
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary text-xs py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 font-bold shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Controls (Matrix vs Individual Member Ledgers) */}
        <div className="no-print flex items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === 'matrix'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📊 Full Group Matrix (Page 1)
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === 'members'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              👤 Individual Member Ledgers (Pages 2+)
            </button>
          </div>

          {activeTab === 'members' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-400">View:</span>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="input-field text-xs py-1 px-2.5 font-bold"
              >
                <option value="all">📑 All Members (Continuous)</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* PRINTABLE AREA (Mirrors c:\Users\ManojShankar\Downloads\Splitwise.pdf) */}
        {/* ============================================================== */}
        <div id="splitwise-printable-area" className="space-y-8 font-sans text-xs text-gray-900 bg-white dark:bg-slate-900 dark:text-gray-100">

          {/* TAB 1: GROUP MATRIX SUMMARY TABLE (Page 1 of Splitwise.pdf) */}
          {(activeTab === 'matrix' || window.matchMedia?.('print').matches) && (
            <div className="space-y-4 print:space-y-3">
              {/* Top Document Header */}
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center text-lg">
                    {group.icon || '✈️'}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {group.name}
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{statementPeriod}</p>
                  </div>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    {/* Header Row: Member Names */}
                    <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                      <th className="p-2.5 font-bold text-gray-600 dark:text-slate-300 min-w-[70px]">Date</th>
                      <th className="p-2.5 font-bold text-gray-600 dark:text-slate-300 min-w-[150px]">Description</th>
                      <th className="p-2.5 font-bold text-gray-600 dark:text-slate-300 text-right min-w-[80px]">Cost</th>
                      {members.map(m => (
                        <th key={m.id} className="p-2.5 font-bold text-gray-700 dark:text-slate-200 text-right min-w-[90px] border-l border-gray-100 dark:border-slate-800">
                          <div className="truncate font-black">{m.name}</div>
                          <div className="text-[9px] font-normal text-gray-400">settled up</div>
                        </th>
                      ))}
                    </tr>

                    {/* Starting balance row */}
                    <tr className="bg-gray-50/50 dark:bg-slate-800/40 border-b border-gray-200 dark:border-slate-700 text-gray-500 italic">
                      <td className="p-2 font-semibold">Start</td>
                      <td className="p-2 font-semibold">Starting balance as of {statementPeriod.split(' ')[0]} 01</td>
                      <td className="p-2 text-right">INR0.00</td>
                      {members.map(m => (
                        <td key={m.id} className="p-2 text-right text-[10px] text-gray-400 border-l border-gray-100 dark:border-slate-800">
                          settled up
                        </td>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {sortedExpenses.map(exp => {
                      const expDate = new Date(exp.date || Date.now())
                      const monthStr = expDate.toLocaleString('en-US', { month: 'short' })
                      const dayStr = expDate.getDate()
                      const amt = Number(exp.amount || 0)

                      return (
                        <tr key={exp.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2 font-medium whitespace-nowrap text-gray-500">
                            {monthStr} {dayStr}
                          </td>
                          <td className="p-2 font-semibold text-gray-900 dark:text-white max-w-[200px] truncate">
                            {exp.title}
                          </td>
                          <td className="p-2 text-right font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                            INR{amt.toFixed(2)}
                          </td>

                          {members.map(m => {
                            const paid = getMemberPaidAmount(exp, m.id)
                            const share = getMemberShareAmount(exp, m.id)
                            const net = paid - share

                            let formatted = 'INR0.00'
                            let colorClass = 'text-gray-400'

                            if (net > 0.009) {
                              formatted = `INR${net.toFixed(2)}`
                              colorClass = 'font-bold text-gray-900 dark:text-white'
                            } else if (net < -0.009) {
                              formatted = `-INR${Math.abs(net).toFixed(2)}`
                              colorClass = 'font-bold text-[#e53935] dark:text-red-400'
                            }

                            return (
                              <td key={m.id} className={`p-2 text-right whitespace-nowrap border-l border-gray-100 dark:border-slate-800 ${colorClass}`}>
                                {formatted}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>

                  {/* Footer: TOTAL BALANCE ROW */}
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-slate-800 border-t-2 border-gray-300 dark:border-slate-600 font-bold">
                      <td colSpan={2} className="p-2.5 text-gray-900 dark:text-white font-extrabold uppercase text-[10px]">
                        TOTAL BALANCE as of {statementPeriod}
                      </td>
                      <td className="p-2.5 text-right font-black text-gray-900 dark:text-white">
                        INR{sortedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0).toFixed(2)}
                      </td>
                      {members.map(m => {
                        const bal = memberBalances.balances[m.id] || 0
                        const isCreditor = bal > 0.05
                        const isDebtor = bal < -0.05

                        return (
                          <td key={m.id} className="p-2 text-right border-l border-gray-200 dark:border-slate-700 whitespace-nowrap">
                            <div className="font-extrabold text-[10px] text-gray-800 dark:text-slate-200 truncate">{m.name}</div>
                            {isCreditor ? (
                              <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                gets back<br />INR{bal.toFixed(2)}
                              </div>
                            ) : isDebtor ? (
                              <div className="text-[10px] font-black text-[#e53935] dark:text-red-400">
                                owes<br />INR{Math.abs(bal).toFixed(2)}
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400">settled up</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: INDIVIDUAL MEMBER LEDGER BREAKDOWNS (Pages 2-8 of Splitwise.pdf) */}
          {(activeTab === 'members' || window.matchMedia?.('print').matches) && (
            <div className="space-y-10">
              {members
                .filter(m => selectedMemberId === 'all' || m.id === selectedMemberId)
                .map((m, idx) => {
                  const memberNet = memberBalances.balances[m.id] || 0
                  const totalPaid = memberBalances.paidTotals[m.id] || 0
                  const totalShare = memberBalances.shareTotals[m.id] || 0

                  return (
                    <div key={m.id} className="space-y-3 page-break-after border-t first:border-t-0 border-gray-200 dark:border-slate-800 pt-6 first:pt-0">
                      {/* Individual Member Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-black text-gray-900 dark:text-white">
                            {m.name}
                          </h2>
                          <p className="text-xs text-gray-500">{statementPeriod}</p>
                        </div>

                        {/* Status Stamp */}
                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            memberNet > 0.05
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : memberNet < -0.05
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {memberNet > 0.05
                              ? `You are owed INR${memberNet.toFixed(2)}`
                              : memberNet < -0.05
                              ? `You owe INR${Math.abs(memberNet).toFixed(2)}`
                              : 'Settled Up'}
                          </span>
                        </div>
                      </div>

                      {/* Member Table */}
                      <div className="overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-lg">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 font-bold text-gray-600 dark:text-slate-300">
                            <tr>
                              <th className="p-2.5 w-16">Date</th>
                              <th className="p-2.5">Description</th>
                              <th className="p-2.5 text-right w-24">Cost</th>
                              <th className="p-2.5 text-right w-24">You paid</th>
                              <th className="p-2.5 text-right w-24">Your share</th>
                              <th className="p-2.5 text-right w-36">Balance</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {sortedExpenses.map(exp => {
                              const expDate = new Date(exp.date || Date.now())
                              const monthStr = expDate.toLocaleString('en-US', { month: 'short' })
                              const dayStr = expDate.getDate()
                              const amt = Number(exp.amount || 0)
                              const paid = getMemberPaidAmount(exp, m.id)
                              const share = getMemberShareAmount(exp, m.id)
                              const isSettle = isSettlementExpense(exp)

                              // Determine balance text & color
                              let balanceText = 'no balance'
                              let balanceColor = 'text-gray-400'

                              if (isSettle) {
                                if (paid > 0) {
                                  balanceText = `you paid INR${paid.toFixed(2)}`
                                  balanceColor = 'text-emerald-600 font-bold'
                                } else if (share > 0) {
                                  balanceText = `you received INR${share.toFixed(2)}`
                                  balanceColor = 'text-[#e53935] font-bold'
                                }
                              } else {
                                if (paid > share) {
                                  balanceText = `you lent INR${(paid - share).toFixed(2)}`
                                  balanceColor = 'text-emerald-600 font-bold'
                                } else if (share > paid) {
                                  balanceText = `you borrowed INR${(share - paid).toFixed(2)}`
                                  balanceColor = 'text-[#e53935] font-bold'
                                }
                              }

                              return (
                                <tr key={exp.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                                  <td className="p-2 font-medium text-gray-500 whitespace-nowrap">
                                    {monthStr} {dayStr}
                                  </td>
                                  <td className="p-2 font-semibold text-gray-900 dark:text-white max-w-[240px] truncate">
                                    {exp.title}
                                  </td>
                                  <td className="p-2 text-right text-gray-600 dark:text-slate-400 whitespace-nowrap">
                                    INR{amt.toFixed(2)}
                                  </td>
                                  <td className="p-2 text-right font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">
                                    INR{paid.toFixed(2)}
                                  </td>
                                  <td className="p-2 text-right font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">
                                    INR{share.toFixed(2)}
                                  </td>
                                  <td className={`p-2 text-right whitespace-nowrap ${balanceColor}`}>
                                    {balanceText}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>

                          {/* Member Ledger Total Row */}
                          <tfoot>
                            <tr className="bg-gray-100 dark:bg-slate-800 border-t-2 border-gray-300 dark:border-slate-600 font-bold">
                              <td colSpan={2} className="p-2.5 text-gray-900 dark:text-white font-extrabold uppercase text-[10px]">
                                Total
                              </td>
                              <td className="p-2.5 text-right font-black text-gray-600 dark:text-slate-400">
                                —
                              </td>
                              <td className="p-2.5 text-right font-black text-gray-900 dark:text-white whitespace-nowrap">
                                INR{totalPaid.toFixed(2)}
                              </td>
                              <td className="p-2.5 text-right font-black text-gray-900 dark:text-white whitespace-nowrap">
                                INR{totalShare.toFixed(2)}
                              </td>
                              <td className="p-2.5 text-right font-black whitespace-nowrap">
                                {memberNet > 0.05 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    you are owed INR{memberNet.toFixed(2)}
                                  </span>
                                ) : memberNet < -0.05 ? (
                                  <span className="text-[#e53935] dark:text-red-400">
                                    you owe INR{Math.abs(memberNet).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">settled up</span>
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
