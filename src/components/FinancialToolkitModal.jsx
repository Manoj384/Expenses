import { useState, useEffect } from 'react'
import Modal from './Modal'
import CashflowForecastModal from './CashflowForecastModal'
import IncomeTaxPlannerModal from './IncomeTaxPlannerModal'
import FireSimulatorModal from './FireSimulatorModal'
import FinancialHealthScoreModal from './FinancialHealthScoreModal'
import SubscriptionLeakModal from './SubscriptionLeakModal'
import CashFlowCalendarModal from './CashFlowCalendarModal'
import SpendingStreakModal from './SpendingStreakModal'
import {
  CalendarDays,
  Calculator,
  Flame,
  Award,
  Skull,
  Calendar,
  Zap,
} from 'lucide-react'

export default function FinancialToolkitModal({
  isOpen,
  onClose,
  initialTab = 'forecast',
}) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  if (!isOpen) return null

  const tabs = [
    { id: 'forecast', label: '90-Day Forecast',  icon: CalendarDays, color: 'text-blue-500' },
    { id: 'tax',      label: 'Tax Planner',      icon: Calculator,   color: 'text-emerald-500' },
    { id: 'fire',     label: 'FIRE Simulator',   icon: Flame,        color: 'text-amber-500' },
    { id: 'health',   label: 'Health Score',     icon: Award,        color: 'text-emerald-500' },
    { id: 'zombie',   label: 'Zombie Leaks',     icon: Skull,        color: 'text-purple-500' },
    { id: 'calendar', label: 'Cash Calendar',    icon: Calendar,     color: 'text-indigo-500' },
    { id: 'streaks',  label: 'Habit Streaks',    icon: Flame,        color: 'text-orange-500' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Financial Planning & Toolkit Suite" maxWidth="max-w-4xl">
      <div className="space-y-4 -mt-2">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-x-auto no-scrollbar border border-gray-200 dark:border-slate-700">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? tab.color : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="pt-1">
          {activeTab === 'forecast' && (
            <div className="space-y-3">
              <CashflowForecastModal isOpen={true} onClose={onClose} isEmbedded={true} />
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-3">
              <IncomeTaxPlannerModal isOpen={true} onClose={onClose} isEmbedded={true} />
            </div>
          )}

          {activeTab === 'fire' && (
            <div className="space-y-3">
              <FireSimulatorModal isOpen={true} onClose={onClose} isEmbedded={true} />
            </div>
          )}

          {activeTab === 'health' && (
            <div className="space-y-3">
              <FinancialHealthScoreModal isOpen={true} onClose={onClose} isEmbedded={true} />
            </div>
          )}

          {activeTab === 'zombie' && (
            <div className="space-y-3">
              <SubscriptionLeakModal isOpen={true} onClose={onClose} isEmbedded={true} />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-3">
              <CashFlowCalendarModal isOpen={true} onClose={onClose} isEmbedded={true} />
            </div>
          )}

          {activeTab === 'streaks' && (
            <div className="space-y-3">
              <SpendingStreakModal isOpen={true} onClose={onClose} isEmbedded={true} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
