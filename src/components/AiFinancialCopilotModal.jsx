import { useState, useEffect } from 'react'
import Modal from './Modal'
import AutoPilotDigestModal from './AutoPilotDigestModal'
import AiVoiceChatbotModal from './AiVoiceChatbotModal'
import CreditCardSmartPayerModal from './CreditCardSmartPayerModal'
import AiAnomalySentinelModal from './AiAnomalySentinelModal'
import TelegramWhatsAppBotModal from './TelegramWhatsAppBotModal'
import {
  Sparkles,
  SunMedium,
  Mic,
  CreditCard,
  ShieldAlert,
  Bot,
  Zap,
} from 'lucide-react'

export default function AiFinancialCopilotModal({
  isOpen,
  onClose,
  initialTab = 'digest',
  voiceAutoStart = false,
}) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  if (!isOpen) return null

  const tabs = [
    { id: 'digest',   label: 'Daily Auto-Pilot',  icon: SunMedium,   color: 'text-amber-500' },
    { id: 'voice',    label: 'Voice Companion',   icon: Mic,         color: 'text-cyan-500' },
    { id: 'cards',    label: 'Card Float & Perks', icon: CreditCard, color: 'text-amber-500' },
    { id: 'sentinel', label: 'Anomaly Sentinel',  icon: ShieldAlert, color: 'text-rose-500' },
    { id: 'bot',      label: 'Telegram & WA Bot', icon: Bot,         color: 'text-sky-500' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Financial Copilot & Autonomous Hub" maxWidth="max-w-4xl">
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
          {activeTab === 'digest' && (
            <div className="space-y-3">
              <AutoPilotContent onClose={onClose} />
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-3">
              <VoiceAssistantContent
                onClose={onClose}
                autoStartListening={voiceAutoStart}
              />
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="space-y-3">
              <CardOptimizerContent onClose={onClose} />
            </div>
          )}

          {activeTab === 'sentinel' && (
            <div className="space-y-3">
              <AnomalySentinelContent onClose={onClose} />
            </div>
          )}

          {activeTab === 'bot' && (
            <div className="space-y-3">
              <BotSyncContent onClose={onClose} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// -------------------------------------------------------------
// Sub-panels extracted for clean modular embedding without modal-in-modal
// -------------------------------------------------------------

function AutoPilotContent({ onClose }) {
  return (
    <AutoPilotDigestModal isOpen={true} onClose={onClose} isEmbedded={true} />
  )
}

function VoiceAssistantContent({ onClose, autoStartListening }) {
  return (
    <AiVoiceChatbotModal
      isOpen={true}
      onClose={onClose}
      isEmbedded={true}
      autoStartListening={autoStartListening}
    />
  )
}

function CardOptimizerContent({ onClose }) {
  return (
    <CreditCardSmartPayerModal isOpen={true} onClose={onClose} isEmbedded={true} />
  )
}

function AnomalySentinelContent({ onClose }) {
  return (
    <AiAnomalySentinelModal isOpen={true} onClose={onClose} isEmbedded={true} />
  )
}

function BotSyncContent({ onClose }) {
  return (
    <TelegramWhatsAppBotModal isOpen={true} onClose={onClose} isEmbedded={true} />
  )
}
