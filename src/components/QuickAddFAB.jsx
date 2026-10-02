import { useState, useEffect, useRef } from 'react'
import { Plus, Mic, Sparkles, X, Bot, FileText, Move, GripVertical } from 'lucide-react'
import Modal from './Modal'
import TransactionForm from './TransactionForm'
import AiVoiceChatbotModal from './AiVoiceChatbotModal'

/**
 * Draggable Floating Action Button & Speed Dial
 * Allows user to drag the floating buttons anywhere on the screen (mouse & touch).
 * Position is saved in localStorage so it stays wherever the user moved it.
 */
export default function QuickAddFAB({ onSuccess }) {
  const [openForm, setOpenForm] = useState(false)
  const [openVoice, setOpenVoice] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Floating Position (X, Y in pixels from top-left)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('ft_draggable_fab_pos')
      if (saved) {
        const p = JSON.parse(saved)
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          return {
            x: Math.min(Math.max(16, p.x), typeof window !== 'undefined' ? window.innerWidth - 76 : p.x),
            y: Math.min(Math.max(16, p.y), typeof window !== 'undefined' ? window.innerHeight - 76 : p.y),
          }
        }
      }
    } catch {}
    // Default: bottom right corner
    return {
      x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 84) : 320,
      y: typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 100) : 600,
    }
  })

  // Dragging State Refs
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0 })
  const fabRef = useRef(null)

  // Window resize handler to keep FAB in viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(Math.max(16, prev.x), window.innerWidth - 76),
        y: Math.min(Math.max(16, prev.y), window.innerHeight - 76),
      }))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mouse Drag Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Only left click
    isDraggingRef.current = true
    hasMovedRef.current = false
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    }

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return
      const deltaX = moveEvent.clientX - dragStartRef.current.startX
      const deltaY = moveEvent.clientY - dragStartRef.current.startY

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMovedRef.current = true
      }

      const nextX = Math.min(Math.max(12, dragStartRef.current.initialPosX + deltaX), window.innerWidth - 72)
      const nextY = Math.min(Math.max(12, dragStartRef.current.initialPosY + deltaY), window.innerHeight - 72)

      setPosition({ x: nextX, y: nextY })
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        // Persist position
        setPosition((current) => {
          try {
            localStorage.setItem('ft_draggable_fab_pos', JSON.stringify(current))
          } catch {}
          return current
        })
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Touch Drag Handlers (Mobile / Tablets)
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    if (!touch) return
    isDraggingRef.current = true
    hasMovedRef.current = false
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    }

    const handleTouchMove = (moveEvent) => {
      if (!isDraggingRef.current) return
      const t = moveEvent.touches[0]
      if (!t) return

      const deltaX = t.clientX - dragStartRef.current.startX
      const deltaY = t.clientY - dragStartRef.current.startY

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMovedRef.current = true
      }

      const nextX = Math.min(Math.max(12, dragStartRef.current.initialPosX + deltaX), window.innerWidth - 72)
      const nextY = Math.min(Math.max(12, dragStartRef.current.initialPosY + deltaY), window.innerHeight - 72)

      setPosition({ x: nextX, y: nextY })
    }

    const handleTouchEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setPosition((current) => {
          try {
            localStorage.setItem('ft_draggable_fab_pos', JSON.stringify(current))
          } catch {}
          return current
        })
      }
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
  }

  // Click handler (only triggers if NOT dragging)
  const handleMainButtonClick = () => {
    if (hasMovedRef.current) return
    setIsExpanded((prev) => !prev)
  }

  const handleSuccess = () => {
    setOpenForm(false)
    setOpenVoice(false)
    setIsExpanded(false)
    if (onSuccess) onSuccess()
  }

  // Determine if popup should expand upwards or downwards depending on screen position
  const isNearBottom = position.y > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400)
  const isNearRight = position.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 300)

  return (
    <>
      {/* Draggable Floating Container */}
      <div
        ref={fabRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 45,
          touchAction: 'none',
        }}
        className="select-none flex flex-col items-center"
      >
        {/* Expanded Speed-Dial Action Buttons */}
        {isExpanded && (
          <div
            className={`absolute flex flex-col items-center gap-2.5 transition-all duration-200 ${
              isNearBottom ? 'bottom-16' : 'top-16'
            } ${isNearRight ? 'items-end right-0' : 'items-start left-0'}`}
          >
            {/* Action 1: Voice AI Expense Dictation */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-lg border border-purple-500/30 text-white animate-in fade-in zoom-in-75 duration-150">
              {isNearRight && <span className="text-xs font-semibold whitespace-nowrap text-purple-200">Voice AI</span>}
              <button
                onClick={() => {
                  setOpenVoice(true)
                  setIsExpanded(false)
                }}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 shadow-md shadow-purple-500/30 flex items-center justify-center text-white transition-transform hover:scale-105"
                title="Speak to Log Expense ('Hey Tracker...')"
                aria-label="Voice AI Dictation"
              >
                <Mic className="h-5 w-5" />
              </button>
              {!isNearRight && <span className="text-xs font-semibold whitespace-nowrap text-purple-200">Voice AI</span>}
            </div>

            {/* Action 2: Add Transaction Form */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-lg border border-blue-500/30 text-white animate-in fade-in zoom-in-75 duration-150">
              {isNearRight && <span className="text-xs font-semibold whitespace-nowrap text-blue-200">Add Transaction</span>}
              <button
                onClick={() => {
                  setOpenForm(true)
                  setIsExpanded(false)
                }}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 active:scale-95 shadow-md shadow-blue-500/30 flex items-center justify-center text-white transition-transform hover:scale-105"
                title="Manual Transaction Form"
                aria-label="Manual Transaction Form"
              >
                <Plus className="h-5 w-5" />
              </button>
              {!isNearRight && <span className="text-xs font-semibold whitespace-nowrap text-blue-200">Add Transaction</span>}
            </div>

            {/* Action 3: AI Copilot & Financial Advisor */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-lg border border-amber-500/30 text-white animate-in fade-in zoom-in-75 duration-150">
              {isNearRight && <span className="text-xs font-semibold whitespace-nowrap text-amber-200">AI Copilot</span>}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-ai-chat'))
                  setIsExpanded(false)
                }}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 active:scale-95 shadow-md shadow-amber-500/30 flex items-center justify-center text-white transition-transform hover:scale-105"
                title="Open AI Financial Copilot"
                aria-label="AI Copilot"
              >
                <Sparkles className="h-5 w-5 text-amber-200" />
              </button>
              {!isNearRight && <span className="text-xs font-semibold whitespace-nowrap text-amber-200">AI Copilot</span>}
            </div>

            {/* Action 4: Telegram & WhatsApp Bot */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-lg border border-sky-500/30 text-white animate-in fade-in zoom-in-75 duration-150">
              {isNearRight && <span className="text-xs font-semibold whitespace-nowrap text-sky-200">Telegram Bot</span>}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-bot-modal'))
                  setIsExpanded(false)
                }}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 shadow-md shadow-sky-500/30 flex items-center justify-center text-white transition-transform hover:scale-105"
                title="Open Telegram & WhatsApp Bot"
                aria-label="Telegram Bot"
              >
                <Bot className="h-5 w-5 text-sky-100" />
              </button>
              {!isNearRight && <span className="text-xs font-semibold whitespace-nowrap text-sky-200">Telegram Bot</span>}
            </div>
          </div>
        )}

        {/* Main Movable Draggable Button */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleMainButtonClick}
          className={`relative h-14 w-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl transition-transform duration-150 active:scale-95 border-2 border-white/40 dark:border-slate-700 ${
            isExpanded
              ? 'bg-gradient-to-br from-rose-600 to-red-600 rotate-45 shadow-rose-500/50'
              : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-indigo-500/40 hover:scale-105'
          }`}
          title="Drag to move anywhere • Click to open menu"
          aria-label="Action Button"
        >
          <Plus className="h-7 w-7 text-white transition-transform duration-200" />

          {/* Glowing Pulse when idle */}
          {!isExpanded && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-white"></span>
            </span>
          )}
        </div>
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
