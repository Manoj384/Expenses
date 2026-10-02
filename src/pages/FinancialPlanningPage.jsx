import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import CashflowForecastModal from '../components/CashflowForecastModal'
import IncomeTaxPlannerModal from '../components/IncomeTaxPlannerModal'
import FireSimulatorModal from '../components/FireSimulatorModal'
import FinancialHealthScoreModal from '../components/FinancialHealthScoreModal'
import SubscriptionLeakModal from '../components/SubscriptionLeakModal'
import CashFlowCalendarModal from '../components/CashFlowCalendarModal'
import SpendingStreakModal from '../components/SpendingStreakModal'
import {
  CalendarDays,
  Calculator,
  Flame,
  Award,
  Skull,
  Calendar,
  Sparkles,
  Zap,
} from 'lucide-react'

export default function FinancialPlanningPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'forecast'
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  const tabs = [
    {
      id: 'forecast',
      label: '90-Day Forecast',
      icon: CalendarDays,
      color: 'text-blue-500',
      description: 'Predictive bank balance and cash flow runway forecasting (30, 60, 90 days)',
    },
    {
      id: 'tax',
      label: 'Tax Regime Planner',
      icon: Calculator,
      color: 'text-emerald-500',
      description: 'FY 2026-27 Old vs New tax regime simulator with 80C, 80D, and HRA optimizations',
    },
    {
      id: 'fire',
      label: 'FIRE Freedom Simulator',
      icon: Flame,
      color: 'text-amber-500',
      description: 'Financial Independence & Early Retirement calculator with Monte Carlo market volatility trials',
    },
    {
      id: 'health',
      label: 'Health & Wealth Score',
      icon: Award,
      color: 'text-emerald-500',
      description: '100-point wealth fitness diagnostic across savings, buffer, debt ratio & SIPs',
    },
    {
      id: 'zombie',
      label: 'Zombie Subscriptions',
      icon: Skull,
      color: 'text-purple-500',
      description: 'Audit unused recurring digital memberships & calculate 10-year opportunity cost',
    },
    {
      id: 'calendar',
      label: 'Cash Flow Calendar',
      icon: Calendar,
      color: 'text-indigo-500',
      description: 'Day-by-day bill reminders, scheduled SIP debits and expense activity calendar',
    },
    {
      id: 'streaks',
      label: 'Habit Streaks',
      icon: Flame,
      color: 'text-orange-500',
      description: 'Daily budget discipline streaks, rank levels, and gamified achievement badges',
    },
  ]

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0]

  return (
    <Layout title="Financial Planning & Toolkit Suite">
      <div className="space-y-6">
        {/* Top Header & Tab Selector Bar */}
        <div className="card p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-none shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-500/20 text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1 border border-emerald-400/30">
                  <Sparkles className="h-3 w-3 text-emerald-300" />
                  Financial Planning Suite
                </span>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  All Simulators Unlocked
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Financial Toolkit & Simulators</h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                {currentTabObj.description}
              </p>
            </div>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 pt-2 border-t border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-[1.02]'
                      : 'bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : tab.color}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content Area rendered directly in the right window */}
        <div className="card p-5 sm:p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
          {activeTab === 'forecast' && (
            <CashflowForecastModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'tax' && (
            <IncomeTaxPlannerModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'fire' && (
            <FireSimulatorModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'health' && (
            <FinancialHealthScoreModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'zombie' && (
            <SubscriptionLeakModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'calendar' && (
            <CashFlowCalendarModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'streaks' && (
            <SpendingStreakModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}
        </div>
      </div>
    </Layout>
  )
}
