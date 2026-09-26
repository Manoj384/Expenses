import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  LineChart,
  History,
  TrendingUp,
  CreditCard,
  BarChart2,
  Landmark,
  Target,
  Zap,
  Sparkles,
  Download,
  Plus,
  Shield,
  X,
} from 'lucide-react'

const ACTIONS = [
  { id: 'dash', label: 'Go to Dashboard', category: 'Navigation', icon: LayoutDashboard, path: '/' },
  { id: 'mf', label: 'Go to Mutual Funds & Live NAVs', category: 'Navigation', icon: LineChart, path: '/mutual-funds' },
  { id: 'networth', label: 'Go to Consolidated Net Worth', category: 'Navigation', icon: Landmark, path: '/net-worth' },
  { id: 'goals', label: 'Go to Financial Goals Tracker', category: 'Navigation', icon: Target, path: '/goals' },
  { id: 'budgets', label: 'Go to Budget Caps & Alerts', category: 'Navigation', icon: Zap, path: '/budgets' },
  { id: 'past', label: 'Go to Past Expenses (2024–2026)', category: 'Navigation', icon: History, path: '/past-expenses' },
  { id: 'txns', label: 'Go to Transactions', category: 'Navigation', icon: ArrowLeftRight, path: '/transactions' },
  { id: 'sips', label: 'Go to SIP Manager', category: 'Navigation', icon: TrendingUp, path: '/sips' },
  { id: 'debts', label: 'Go to Debts & EMIs', category: 'Navigation', icon: CreditCard, path: '/debts' },
  { id: 'reports', label: 'Go to Reports & Visuals', category: 'Navigation', icon: BarChart2, path: '/reports' },
]

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
      setQuery('')
    }
  }, [isOpen])

  const filtered = ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (action) => {
    setIsOpen(false)
    if (action.path) {
      navigate(action.path)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      handleSelect(filtered[selectedIndex])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, page, or action... (↑ ↓ to navigate, Enter to select)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40 text-xs">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-400">No matching commands or pages found.</div>
          ) : (
            filtered.map((action, idx) => {
              const Icon = action.icon
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={action.id}
                  onClick={() => handleSelect(action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="block text-white">{action.label}</strong>
                      <span className="text-[10px] text-slate-400">{action.category}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Jump →</span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-950/80 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Pro Tip: Press <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-white">Ctrl + K</kbd> anywhere</span>
          <span>⚡ Finance Tracker OS</span>
        </div>
      </div>
    </div>
  )
}
