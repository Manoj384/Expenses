import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import AutoPilotDigestModal from '../components/AutoPilotDigestModal'
import AiVoiceChatbotModal from '../components/AiVoiceChatbotModal'
import CreditCardSmartPayerModal from '../components/CreditCardSmartPayerModal'
import AiAnomalySentinelModal from '../components/AiAnomalySentinelModal'
import TelegramWhatsAppBotModal from '../components/TelegramWhatsAppBotModal'
import {
  SunMedium,
  Mic,
  CreditCard,
  ShieldAlert,
  Bot,
  Sparkles,
  Zap,
} from 'lucide-react'

export default function AiCopilotPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'digest'
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
      id: 'digest',
      label: 'Daily Auto-Pilot',
      icon: SunMedium,
      color: 'text-amber-500',
      description: 'Morning automated financial briefing & WhatsApp dispatch',
    },
    {
      id: 'voice',
      label: 'Voice Companion',
      icon: Mic,
      color: 'text-cyan-500',
      description: 'Alexa-style 2-way speech-to-speech voice companion ("Hey Manoj")',
    },
    {
      id: 'cards',
      label: 'Card Float & Rewards',
      icon: CreditCard,
      color: 'text-amber-500',
      description: '50-day interest-free grace period & category reward optimizer',
    },
    {
      id: 'sentinel',
      label: 'Anomaly Sentinel',
      icon: ShieldAlert,
      color: 'text-rose-500',
      description: 'AI accidental double-charge & price-hike detector',
    },
    {
      id: 'bot',
      label: 'Telegram & WA Bot',
      icon: Bot,
      color: 'text-sky-500',
      description: 'Instant chat logging & portfolio queries via Telegram/WhatsApp',
    },
  ]

  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0]

  return (
    <Layout title="AI Financial Copilot & Autonomous Hub">
      <div className="space-y-6">
        {/* Top Header & Tab Selector Bar */}
        <div className="card p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-none shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-500/20 text-blue-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1 border border-blue-400/30">
                  <Sparkles className="h-3 w-3 text-cyan-300" />
                  Autonomous AI Suite
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Live Engine Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">AI Financial Copilot</h2>
              <p className="text-xs text-blue-200/90 mt-0.5">
                {currentTabObj.description}
              </p>
            </div>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
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
          {activeTab === 'digest' && (
            <AutoPilotDigestModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'voice' && (
            <AiVoiceChatbotModal
              isOpen={true}
              isEmbedded={true}
              onClose={() => {}}
              autoStartListening={false}
            />
          )}

          {activeTab === 'cards' && (
            <CreditCardSmartPayerModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'sentinel' && (
            <AiAnomalySentinelModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}

          {activeTab === 'bot' && (
            <TelegramWhatsAppBotModal isOpen={true} isEmbedded={true} onClose={() => {}} />
          )}
        </div>
      </div>
    </Layout>
  )
}
