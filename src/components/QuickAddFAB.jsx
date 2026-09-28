import { useState } from 'react'
import { Plus, Mic, Sparkles } from 'lucide-react'
import Modal from './Modal'
import TransactionForm from './TransactionForm'
import AiVoiceChatbotModal from './AiVoiceChatbotModal'

/**
 * QuickAddFAB — floating action buttons:
 * 1. 🎙️ AI Voice Dictation Button (Left/Top)
 * 2. ➕ Manual Fast Add Button (Main)
 */
export default function QuickAddFAB({ onSuccess }) {
  const [openForm, setOpenForm] = useState(false)
  const [openVoice, setOpenVoice] = useState(false)

  const handleSuccess = () => {
    setOpenForm(false)
    setOpenVoice(false)
    if (onSuccess) onSuccess()
  }

  return (
    <>
      {/* Floating Action Cluster */}
      <div className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 flex flex-col items-center gap-3">
        {/* Voice AI Button */}
        <button
          onClick={() => setOpenVoice(true)}
          className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 shadow-md shadow-purple-500/30 flex items-center justify-center transition-all duration-200 text-white hover:scale-105"
          title="Voice AI Expense Dictation ('Hey Tracker...')"
          aria-label="Voice AI Expense Dictation"
        >
          <Mic className="h-5 w-5" />
        </button>

        {/* Quick Add Form Button */}
        <button
          onClick={() => setOpenForm(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 shadow-lg shadow-blue-500/40 flex items-center justify-center transition-all duration-200 group"
          title="Quick Add Transaction"
          aria-label="Quick Add Transaction"
        >
          <Plus className="h-6 w-6 text-white transition-transform duration-200 group-hover:rotate-90" />
        </button>
      </div>

      {/* Quick Add Modal */}
      <Modal
        isOpen={openForm}
        onClose={() => setOpenForm(false)}
        title="Quick Add Transaction"
        maxWidth="max-w-lg"
      >
        <TransactionForm
          onSuccess={handleSuccess}
          onCancel={() => setOpenForm(false)}
        />
      </Modal>

      {/* AI Voice & Chatbot Modal */}
      <AiVoiceChatbotModal
        isOpen={openVoice}
        onClose={() => setOpenVoice(false)}
        onTransactionCreated={handleSuccess}
      />
    </>
  )
}
