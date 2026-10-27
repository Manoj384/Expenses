import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'Nothing here yet', description = '', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-xs">
        <Inbox className="h-8 w-8 text-gray-400 dark:text-slate-500" />
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
