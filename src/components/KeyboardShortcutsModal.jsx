import Modal from './Modal'
import { Command, Keyboard } from 'lucide-react'

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation Shortcuts',
    items: [
      { keys: ['G', 'D'], desc: 'Jump to Dashboard' },
      { keys: ['G', 'T'], desc: 'Jump to Transactions' },
      { keys: ['G', 'M'], desc: 'Jump to Mutual Funds' },
      { keys: ['G', 'S'], desc: 'Jump to Splitwise & Groups' },
      { keys: ['G', 'B'], desc: 'Jump to Bill Reminders' },
      { keys: ['G', 'N'], desc: 'Jump to Net Worth' },
      { keys: ['G', 'R'], desc: 'Jump to Reports & Analytics' },
    ],
  },
  {
    title: 'Action Shortcuts',
    items: [
      { keys: ['Ctrl', 'K'], desc: 'Open Command Palette & Global Search' },
      { keys: ['N'], desc: 'Quick Add Transaction' },
      { keys: ['T'], desc: 'Toggle Dark / Light Theme' },
      { keys: ['?'], desc: 'Open Keyboard Shortcuts Cheatsheet' },
      { keys: ['Esc'], desc: 'Close Active Modal / Dropdown' },
    ],
  },
]

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts Cheatsheet" maxWidth="max-w-lg">
      <div className="space-y-5 text-xs text-gray-700 dark:text-slate-300">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
          <Keyboard className="h-4 w-4 text-blue-600" />
          <span className="text-[11px] font-medium">
            Pro Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-bold">Shift + ?</kbd> anywhere in the app to toggle this cheatsheet!
          </span>
        </div>

        <div className="space-y-4">
          {SHORTCUT_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-[11px]">
                {group.title}
              </h4>
              <div className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl p-2 bg-white dark:bg-slate-900 shadow-xs">
                {group.items.map((item, iIdx) => (
                  <div key={iIdx} className="py-2 px-2 flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-slate-300">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-md font-mono text-[11px] font-bold border border-gray-200 dark:border-slate-700 shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-5">
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
